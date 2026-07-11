import { randomUUID } from "node:crypto";
import { env, mockBillingEnabled, razorpayConfigured } from "@/lib/env";
import { getPlanById, getPurchasablePlan } from "@/lib/plans";
import type { DataStore } from "@/lib/store/types";
import type { Plan, Subscription } from "@/lib/types";
import {
  cancelRazorpaySubscription,
  createRazorpayOrder,
  createRazorpaySubscription,
  fetchRazorpayPayment,
  fetchRazorpaySubscription,
} from "./razorpay";
import {
  verifyOrderCheckoutSignature,
  verifySubscriptionCheckoutSignature,
} from "./signatures";

export type CheckoutMode = "subscription" | "order" | "mock";

export interface CheckoutSession {
  mode: CheckoutMode;
  planCode: string;
  amountMinor: number;
  currency: string;
  razorpayKeyId?: string;
  razorpayOrderId?: string;
  razorpaySubscriptionId?: string;
  mockToken?: string;
}

/**
 * Creates a checkout for the given plan CODE. Prices and Razorpay ids come
 * exclusively from the trusted server-side catalog — never from the browser.
 */
export async function createCheckout(
  store: DataStore,
  userId: string,
  planCode: string,
): Promise<CheckoutSession> {
  const plan = getPurchasablePlan(planCode);
  if (!plan) throw new BillingError("unknown_plan", "That plan cannot be purchased.");

  // Subscription mode is chosen per-plan: whenever THIS plan has a Razorpay
  // plan id, subscribe; otherwise fall back to a one-time order below.
  if (razorpayConfigured() && plan.razorpay_plan_id) {
    const sub = await createRazorpaySubscription({
      planId: plan.razorpay_plan_id,
      notes: { joink_user_id: userId, joink_plan_code: plan.code },
    });
    await store.upsertSubscription({
      user_id: userId,
      plan_id: plan.id,
      provider: "razorpay",
      razorpay_subscription_id: sub.id,
      status: "created",
      current_period_start: null,
      current_period_end: null,
      cancel_at_period_end: false,
    });
    return {
      mode: "subscription",
      planCode: plan.code,
      amountMinor: plan.amount_minor,
      currency: plan.currency,
      razorpayKeyId: env.razorpayKeyId,
      razorpaySubscriptionId: sub.id,
    };
  }

  if (razorpayConfigured()) {
    // One-time Pro access via Razorpay Orders + Standard Checkout.
    const receipt = `joink_${randomUUID().slice(0, 20)}`;
    const order = await createRazorpayOrder({
      amountMinor: plan.amount_minor,
      currency: plan.currency,
      receipt,
      notes: { joink_user_id: userId, joink_plan_code: plan.code },
    });
    await store.createPaymentOrder({
      user_id: userId,
      plan_id: plan.id,
      razorpay_order_id: order.id,
      amount_minor: plan.amount_minor,
      currency: plan.currency,
      status: "created",
      receipt,
    });
    return {
      mode: "order",
      planCode: plan.code,
      amountMinor: plan.amount_minor,
      currency: plan.currency,
      razorpayKeyId: env.razorpayKeyId,
      razorpayOrderId: order.id,
    };
  }

  if (mockBillingEnabled()) {
    // Explicitly labelled mock flow for environments without Razorpay keys.
    const receipt = `mock_${randomUUID()}`;
    const order = await store.createPaymentOrder({
      user_id: userId,
      plan_id: plan.id,
      razorpay_order_id: null,
      amount_minor: plan.amount_minor,
      currency: plan.currency,
      status: "created",
      receipt,
    });
    return {
      mode: "mock",
      planCode: plan.code,
      amountMinor: plan.amount_minor,
      currency: plan.currency,
      mockToken: order.id,
    };
  }

  throw new BillingError(
    "billing_unavailable",
    "Payments are not configured on this deployment.",
    503,
  );
}

export class BillingError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

export interface VerifyCheckoutInput {
  mode: CheckoutMode;
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  razorpaySubscriptionId?: string;
  razorpaySignature?: string;
  mockToken?: string;
}

/**
 * Verifies a checkout result server-side. Signature verification alone never
 * activates Pro for subscriptions — activation is confirmed against the
 * Razorpay API (and reconfirmed by webhooks).
 */
export async function verifyCheckout(
  store: DataStore,
  userId: string,
  input: VerifyCheckoutInput,
): Promise<{ activated: boolean; status: string }> {
  if (input.mode === "mock") {
    if (!mockBillingEnabled()) {
      throw new BillingError("mock_disabled", "Mock billing is not enabled.", 403);
    }
    const order = input.mockToken
      ? await store.getPaymentOrderById(userId, input.mockToken)
      : null;
    if (!order) throw new BillingError("invalid_order", "Unknown mock order.");
    const plan = getPlanById(order.plan_id);
    if (!plan) throw new BillingError("unknown_plan", "Plan unavailable.");
    await store.updatePaymentOrder(order.id, { status: "paid" });
    await store.upsertPaymentByRazorpayId({
      user_id: userId,
      subscription_id: null,
      payment_order_id: order.id,
      razorpay_payment_id: `mockpay_${order.id}`,
      razorpay_order_id: null,
      amount_minor: order.amount_minor,
      currency: order.currency,
      status: "captured",
      signature_verified: true,
      captured_at: new Date().toISOString(),
      failure_code: null,
      failure_description: null,
    });
    await activatePro(store, userId, plan, { provider: "mock" });
    return { activated: true, status: "active" };
  }

  if (input.mode === "subscription") {
    const okSig = verifySubscriptionCheckoutSignature({
      paymentId: input.razorpayPaymentId ?? "",
      subscriptionId: input.razorpaySubscriptionId ?? "",
      signature: input.razorpaySignature ?? "",
      keySecret: env.razorpayKeySecret,
    });
    if (!okSig) throw new BillingError("invalid_signature", "Checkout verification failed.", 403);

    const sub = await store.getSubscriptionByRazorpayId(input.razorpaySubscriptionId!);
    if (!sub || sub.user_id !== userId) {
      throw new BillingError("invalid_subscription", "Subscription not found.", 404);
    }
    const plan = getPlanById(sub.plan_id);
    if (!plan) throw new BillingError("unknown_plan", "Plan unavailable.");
    // Confirm real state with Razorpay before granting anything.
    const remote = await fetchRazorpaySubscription(input.razorpaySubscriptionId!);
    const active = remote.status === "active" || remote.status === "authenticated";
    if (active) {
      await activatePro(store, userId, plan, {
        provider: "razorpay",
        razorpaySubscriptionId: remote.id,
        periodStart: remote.current_start ? new Date(remote.current_start * 1000) : null,
        periodEnd: remote.current_end ? new Date(remote.current_end * 1000) : null,
      });
    }
    if (input.razorpayPaymentId) {
      try {
        const payment = await fetchRazorpayPayment(input.razorpayPaymentId);
        await store.upsertPaymentByRazorpayId({
          user_id: userId,
          subscription_id: sub.id,
          payment_order_id: null,
          razorpay_payment_id: payment.id,
          razorpay_order_id: payment.order_id ?? null,
          amount_minor: payment.amount,
          currency: payment.currency,
          status: payment.status === "captured" ? "captured" : "authorized",
          signature_verified: true,
          captured_at: payment.status === "captured" ? new Date().toISOString() : null,
          failure_code: null,
          failure_description: null,
        });
      } catch {
        // The webhook will record the payment; verification result stands.
      }
    }
    return { activated: active, status: remote.status };
  }

  // Orders flow
  const okSig = verifyOrderCheckoutSignature({
    orderId: input.razorpayOrderId ?? "",
    paymentId: input.razorpayPaymentId ?? "",
    signature: input.razorpaySignature ?? "",
    keySecret: env.razorpayKeySecret,
  });
  if (!okSig) throw new BillingError("invalid_signature", "Checkout verification failed.", 403);

  const order = await store.getPaymentOrderByRazorpayId(input.razorpayOrderId!);
  if (!order || order.user_id !== userId) {
    throw new BillingError("invalid_order", "Order not found.", 404);
  }
  const plan = getPlanById(order.plan_id);
  if (!plan) throw new BillingError("unknown_plan", "Plan unavailable.");
  // Confirm capture with the Razorpay API — the client callback alone is
  // never trusted to grant access.
  const payment = await fetchRazorpayPayment(input.razorpayPaymentId!);
  const captured = payment.status === "captured";
  await store.upsertPaymentByRazorpayId({
    user_id: userId,
    subscription_id: null,
    payment_order_id: order.id,
    razorpay_payment_id: payment.id,
    razorpay_order_id: input.razorpayOrderId ?? null,
    amount_minor: payment.amount,
    currency: payment.currency,
    status: captured ? "captured" : (payment.status as "created" | "authorized" | "failed"),
    signature_verified: true,
    captured_at: captured ? new Date().toISOString() : null,
    failure_code: payment.error_code ?? null,
    failure_description: payment.error_description ?? null,
  });
  if (captured) {
    await store.updatePaymentOrder(order.id, { status: "paid" });
    await activatePro(store, userId, plan, { provider: "razorpay" });
  }
  return { activated: captured, status: payment.status };
}

export async function activatePro(
  store: DataStore,
  userId: string,
  plan: Plan,
  opts: {
    provider: "razorpay" | "mock";
    razorpaySubscriptionId?: string;
    periodStart?: Date | null;
    periodEnd?: Date | null;
  },
): Promise<Subscription> {
  const now = new Date();
  const monthLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  return store.upsertSubscription({
    user_id: userId,
    plan_id: plan.id,
    provider: opts.provider,
    razorpay_subscription_id: opts.razorpaySubscriptionId ?? null,
    status: "active",
    current_period_start: (opts.periodStart ?? now).toISOString(),
    current_period_end: (opts.periodEnd ?? monthLater).toISOString(),
    cancel_at_period_end: false,
  });
}

/** Requests cancellation. Data is preserved; access simply stops renewing. */
export async function requestCancellation(
  store: DataStore,
  userId: string,
): Promise<Subscription | null> {
  const sub = await store.getActiveSubscription(userId);
  if (!sub) return null;
  if (sub.provider === "razorpay" && sub.razorpay_subscription_id && razorpayConfigured()) {
    await cancelRazorpaySubscription(sub.razorpay_subscription_id, true);
  }
  return store.upsertSubscription({
    ...sub,
    id: sub.id,
    cancel_at_period_end: true,
  });
}
