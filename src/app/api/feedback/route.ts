import { z } from "zod";
import { fail, handle, ok, parseBody } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { getBackgroundStore } from "@/lib/store";

const schema = z.object({
  message: z.string().trim().min(3, "Tell us a little more.").max(2000),
  email: z.string().trim().email("Enter a valid email.").max(200).optional().or(z.literal("")),
  page: z.string().trim().max(300).optional(),
});

/** Accepts feedback from anyone (signed in or not), rate-limited. */
export async function POST(req: Request) {
  return handle(async () => {
    const body = await parseBody(req, schema);
    const user = await getCurrentUser();
    const limitKey = `feedback:${user?.id ?? "anon"}`;
    if (!rateLimit(limitKey, 5, 60_000)) {
      return fail("rate_limited", "Thanks — you're sending feedback very fast. Give it a minute.", 429);
    }
    const store = getBackgroundStore();
    await store.createFeedback({
      user_id: user?.id ?? null,
      email: body.email || null,
      message: body.message,
      page: body.page ?? null,
    });
    return ok({ received: true }, { status: 201 });
  });
}
