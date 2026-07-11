import { getPurchasablePlan, PLAN_CATALOG } from "@/lib/plans";
import type { DataStore } from "@/lib/store/types";
import { activatePro } from "./service";

/**
 * Processes a stored, signature-verified Razorpay webhook event. Events are
 * persisted BEFORE processing and deduplicated by provider event id, so
 * retries and out-of-order delivery are safe. All updates are idempotent.
 *
 * Event names handled (Razorpay docs: webhooks → payments/subscriptions):
 *   payment.captured, payment.failed, order.paid,
 *   subscription.activated, subscription.charged, subscription.halted,
 *   subscription.cancelled, subscription.completed, subscription.paused
 */
export async function processRazorpayEvent(
  store: DataStore,
  eventType: string,
  payload: unknown,
): Promise<"processed" | "skipped"> {
  const body = payload as {
    payload?: {
      payment?: { entity?: RzpPaymentEntity };
      order?: { entity?: RzpOrderEntity };
      subscription?: { entity?: RzpSubscriptionEntity };
    };
  };
  const payment = body.payload?.payment?.entity;
  const order = body.payload?.order?.entity;
  const subscription = body.payload?.subscription?.entity;

  switch (eventType) {
    case "payment.captured":
    case "payment.failed": {
      if (!payment) return "skipped";
      const userId = await resolveUserId(store, payment, subscription);
      if (!userId) return "skipped";
      const captured = eventType === "payment.captured";
      const localOrder = payment.order_id
        ? await store.getPaymentOrderByRazorpayId(payment.order_id)
        : null;
      const localSub = payment.subscription_id
        ? await store.getSubscriptionByRazorpayId(payment.subscription_id)
        : null;
      await store.upsertPaymentByRazorpayId({
        user_id: userId,
        subscription_id: localSub?.id ?? null,
        payment_order_id: localOrder?.id ?? null,
        razorpay_payment_id: payment.id,
        razorpay_order_id: payment.order_id ?? null,
        amount_minor: payment.amount ?? 0,
        currency: payment.currency ?? "INR",
        status: captured ? "captured" : "failed",
        signature_verified: true, // webhook signature was verified upstream
        captured_at: captured ? new Date().toISOString() : null,
        failure_code: captured ? null : (payment.error_code ?? null),
        failure_description: captured ? null : (payment.error_description ?? null),
      });
      return "processed";
    }

    case "order.paid": {
      if (!order) return "skipped";
      const localOrder = await store.getPaymentOrderByRazorpayId(order.id);
      if (!localOrder) return "skipped";
      if (localOrder.status !== "paid") {
        await store.updatePaymentOrder(localOrder.id, { status: "paid" });
        const plan = getPurchasablePlan("pro");
        if (plan && localOrder.plan_id === plan.id) {
          await activatePro(store, localOrder.user_id, plan, { provider: "razorpay" });
        }
      }
      return "processed";
    }

    case "subscription.activated":
    case "subscription.charged": {
      if (!subscription) return "skipped";
      const localSub = await store.getSubscriptionByRazorpayId(subscription.id);
      if (!localSub) return "skipped";
      const plan =
        Object.values(PLAN_CATALOG).find((p) => p.id === localSub.plan_id) ??
        getPurchasablePlan("pro");
      if (plan) {
        await activatePro(store, localSub.user_id, plan, {
          provider: "razorpay",
          razorpaySubscriptionId: subscription.id,
          periodStart: subscription.current_start
            ? new Date(subscription.current_start * 1000)
            : null,
          periodEnd: subscription.current_end
            ? new Date(subscription.current_end * 1000)
            : null,
        });
      }
      return "processed";
    }

    case "subscription.halted":
    case "subscription.paused": {
      if (!subscription) return "skipped";
      const localSub = await store.getSubscriptionByRazorpayId(subscription.id);
      if (!localSub) return "skipped";
      // Payment trouble: warn, keep data, restrict only via plan resolution.
      await store.upsertSubscription({ ...localSub, id: localSub.id, status: "past_due" });
      return "processed";
    }

    case "subscription.cancelled":
    case "subscription.completed": {
      if (!subscription) return "skipped";
      const localSub = await store.getSubscriptionByRazorpayId(subscription.id);
      if (!localSub) return "skipped";
      await store.upsertSubscription({
        ...localSub,
        id: localSub.id,
        status: eventType === "subscription.cancelled" ? "cancelled" : "expired",
      });
      return "processed";
    }

    default:
      return "skipped";
  }
}

interface RzpPaymentEntity {
  id: string;
  order_id?: string | null;
  subscription_id?: string | null;
  amount?: number;
  currency?: string;
  error_code?: string | null;
  error_description?: string | null;
  notes?: Record<string, string>;
}

interface RzpOrderEntity {
  id: string;
  notes?: Record<string, string>;
}

interface RzpSubscriptionEntity {
  id: string;
  status?: string;
  current_start?: number | null;
  current_end?: number | null;
  notes?: Record<string, string>;
}

async function resolveUserId(
  store: DataStore,
  payment: RzpPaymentEntity,
  subscription?: RzpSubscriptionEntity,
): Promise<string | null> {
  if (payment.order_id) {
    const order = await store.getPaymentOrderByRazorpayId(payment.order_id);
    if (order) return order.user_id;
  }
  const subId = payment.subscription_id ?? subscription?.id;
  if (subId) {
    const sub = await store.getSubscriptionByRazorpayId(subId);
    if (sub) return sub.user_id;
  }
  // Fall back to the notes we attach when creating orders/subscriptions.
  const noteUser = payment.notes?.joink_user_id ?? subscription?.notes?.joink_user_id;
  return noteUser ?? null;
}
