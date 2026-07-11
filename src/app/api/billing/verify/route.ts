import { z } from "zod";
import { errors, fail, handle, ok, parseBody } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { BillingError, verifyCheckout } from "@/lib/billing/service";
import { getStore } from "@/lib/store";

const schema = z.object({
  mode: z.enum(["subscription", "order", "mock"]),
  razorpayPaymentId: z.string().max(100).optional(),
  razorpayOrderId: z.string().max(100).optional(),
  razorpaySubscriptionId: z.string().max(100).optional(),
  razorpaySignature: z.string().max(200).optional(),
  mockToken: z.string().max(100).optional(),
});

export async function POST(req: Request) {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) throw errors.unauthorized();
    const body = await parseBody(req, schema);
    const store = await getStore();
    try {
      const result = await verifyCheckout(store, user.id, body);
      return ok(result);
    } catch (err) {
      if (err instanceof BillingError) return fail(err.code, err.message, err.status);
      throw err;
    }
  });
}
