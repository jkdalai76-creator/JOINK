import { z } from "zod";
import { fail, handle, ok, parseBody } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { aiConfigured } from "@/lib/env";
import { rateLimit } from "@/lib/rate-limit";
import { answerSupport } from "@/lib/support/agent";

const schema = z.object({
  question: z.string().trim().min(1, "Ask a question.").max(1000),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(4000),
      }),
    )
    .max(12)
    .optional(),
});

/**
 * Product-support assistant endpoint. Open to signed-in and anonymous
 * visitors (support should work before sign-up), rate-limited per client.
 */
export async function POST(req: Request) {
  return handle(async () => {
    const body = await parseBody(req, schema);
    const user = await getCurrentUser();
    if (!rateLimit(`support:${user?.id ?? "anon"}`, 20, 60_000)) {
      return fail("rate_limited", "You're asking very fast — give it a few seconds.", 429);
    }
    const reply = await answerSupport(body.question, body.history ?? []);
    return ok({ answer: reply.answer, usedAi: reply.usedAi, aiConfigured: aiConfigured() });
  });
}
