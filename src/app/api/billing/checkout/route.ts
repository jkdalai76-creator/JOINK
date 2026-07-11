import { z } from "zod";
import { errors, fail, handle, ok, parseBody } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { BillingError, createCheckout } from "@/lib/billing/service";
import { rateLimit } from "@/lib/rate-limit";
import { getStore } from "@/lib/store";

const schema = z.object({
  // The browser sends ONLY the internal plan code. Prices, Razorpay plan ids
  // and amounts are resolved server-side from the trusted catalog.
  planCode: z.string().min(1).max(20),
});

export async function POST(req: Request) {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) throw errors.unauthorized();
    if (!rateLimit(`checkout:${user.id}`, 10, 60_000)) {
      return fail("rate_limited", "Too many checkout attempts. Please wait.", 429);
    }
    const { planCode } = await parseBody(req, schema);
    const store = await getStore();
    try {
      const session = await createCheckout(store, user.id, planCode);
      return ok({ session });
    } catch (err) {
      if (err instanceof BillingError) return fail(err.code, err.message, err.status);
      throw err;
    }
  });
}
