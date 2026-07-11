import { z } from "zod";
import { errors, fail, handle, ok, parseBody } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { checkChat, checkVoice, snapshot } from "@/lib/billing/entitlements";
import { answerGrounded } from "@/lib/chat/grounded";
import { aiConfigured } from "@/lib/env";
import { rateLimit } from "@/lib/rate-limit";
import { getStore } from "@/lib/store";
import { truncate } from "@/lib/utils";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) throw errors.unauthorized();
    const { id } = await params;
    const store = await getStore();
    const conversation = await store.getConversation(user.id, id);
    if (!conversation) throw errors.notFound("Conversation");
    const messages = await store.listMessages(user.id, id);
    return ok({ conversation, messages });
  });
}

const askSchema = z.object({
  question: z.string().trim().min(1, "Ask a question.").max(2000),
  inputMode: z.enum(["text", "voice"]).default("text"),
});

/** Sends a question; returns the saved user message and grounded answer. */
export async function POST(req: Request, { params }: Params) {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) throw errors.unauthorized();
    const { id } = await params;
    const body = await parseBody(req, askSchema);

    if (!rateLimit(`chat:${user.id}`, 20, 60_000)) {
      return fail("rate_limited", "Too many questions at once. Please slow down.", 429);
    }

    const store = await getStore();
    const conversation = await store.getConversation(user.id, id);
    if (!conversation) throw errors.notFound("Conversation");

    const snap = await snapshot(store, user.id);
    const decision = body.inputMode === "voice" ? checkVoice(snap) : checkChat(snap);
    if (!decision.allowed) return fail("limit_reached", decision.reason!, 402);

    const pages = (await store.listPagesByRun(user.id, conversation.scrape_run_id)).filter(
      (p) => p.extraction_status === "completed" || p.extraction_status === "partial",
    );

    const userMessage = await store.createMessage({
      conversation_id: conversation.id,
      role: "user",
      content: body.question,
      citations: [],
      input_mode: body.inputMode,
    });

    const grounded = await answerGrounded(pages, body.question);

    const assistantMessage = await store.createMessage({
      conversation_id: conversation.id,
      role: "assistant",
      content: grounded.answer,
      citations: grounded.citations,
      input_mode: "text",
    });

    await store.incrementUsage(
      user.id,
      body.inputMode === "voice" ? { voice_questions: 1 } : { chat_questions: 1 },
      `msg:${userMessage.id}`,
    );

    return ok({
      userMessage,
      assistantMessage,
      insufficient: grounded.insufficient,
      usedAi: grounded.usedAi,
      aiConfigured: aiConfigured(),
      titleSuggestion: truncate(body.question, 60),
    });
  });
}
