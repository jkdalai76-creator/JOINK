import { errors, handle, ok } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { activatePro } from "@/lib/billing/service";
import { fetchRazorpaySubscription } from "@/lib/billing/razorpay";
import { razorpayConfigured } from "@/lib/env";
import { getPurchasablePlan } from "@/lib/plans";
import { getStore } from "@/lib/store";

/**
 * Reconciles a pending subscription against the Razorpay API — useful when a
 * webhook was delayed or lost. Only ever moves state based on Razorpay's
 * answer, never on client claims.
 */
export async function POST() {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) throw errors.unauthorized();
    const store = await getStore();
    const sub = await store.getActiveSubscription(user.id);
    if (!sub || sub.provider !== "razorpay" || !sub.razorpay_subscription_id) {
      return ok({ reconciled: false, reason: "No pending Razorpay subscription." });
    }
    if (!razorpayConfigured()) {
      return ok({ reconciled: false, reason: "Razorpay is not configured." });
    }
    const remote = await fetchRazorpaySubscription(sub.razorpay_subscription_id);
    if (remote.status === "active") {
      const plan = getPurchasablePlan("pro");
      if (plan) {
        await activatePro(store, user.id, plan, {
          provider: "razorpay",
          razorpaySubscriptionId: remote.id,
          periodStart: remote.current_start ? new Date(remote.current_start * 1000) : null,
          periodEnd: remote.current_end ? new Date(remote.current_end * 1000) : null,
        });
      }
      return ok({ reconciled: true, status: "active" });
    }
    if (["halted", "paused"].includes(remote.status)) {
      await store.upsertSubscription({ ...sub, id: sub.id, status: "past_due" });
    } else if (["cancelled", "completed", "expired"].includes(remote.status)) {
      await store.upsertSubscription({
        ...sub,
        id: sub.id,
        status: remote.status === "cancelled" ? "cancelled" : "expired",
      });
    }
    return ok({ reconciled: true, status: remote.status });
  });
}
