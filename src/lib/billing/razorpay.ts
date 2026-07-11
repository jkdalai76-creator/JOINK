import { env } from "@/lib/env";

/**
 * Minimal server-side Razorpay REST client (basic auth with key id/secret).
 * Secrets never leave the server; the browser only ever sees the public
 * NEXT_PUBLIC_RAZORPAY_KEY_ID plus ids created here.
 */

const BASE = "https://api.razorpay.com/v1";

class RazorpayApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "RazorpayApiError";
  }
}

async function rzp<T>(path: string, init?: RequestInit): Promise<T> {
  const auth = Buffer.from(`${env.razorpayKeyId}:${env.razorpayKeySecret}`).toString("base64");
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      authorization: `Basic ${auth}`,
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    // Log status only — never response bodies that could contain PII.
    console.error(`[joink] Razorpay API ${path} failed with HTTP ${res.status}`);
    throw new RazorpayApiError(`Razorpay request failed (HTTP ${res.status}).`, res.status);
  }
  return (await res.json()) as T;
}

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
  status: string;
}

export function createRazorpayOrder(params: {
  amountMinor: number;
  currency: string;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<RazorpayOrder> {
  return rzp<RazorpayOrder>("/orders", {
    method: "POST",
    body: JSON.stringify({
      amount: params.amountMinor,
      currency: params.currency,
      receipt: params.receipt,
      notes: params.notes ?? {},
    }),
  });
}

export interface RazorpaySubscription {
  id: string;
  plan_id: string;
  status: string;
  current_start: number | null;
  current_end: number | null;
}

export function createRazorpaySubscription(params: {
  planId: string;
  totalCount?: number;
  notes?: Record<string, string>;
}): Promise<RazorpaySubscription> {
  return rzp<RazorpaySubscription>("/subscriptions", {
    method: "POST",
    body: JSON.stringify({
      plan_id: params.planId,
      total_count: params.totalCount ?? 12,
      customer_notify: 1,
      notes: params.notes ?? {},
    }),
  });
}

export function fetchRazorpaySubscription(id: string): Promise<RazorpaySubscription> {
  return rzp<RazorpaySubscription>(`/subscriptions/${id}`);
}

export function cancelRazorpaySubscription(
  id: string,
  cancelAtCycleEnd: boolean,
): Promise<RazorpaySubscription> {
  return rzp<RazorpaySubscription>(`/subscriptions/${id}/cancel`, {
    method: "POST",
    body: JSON.stringify({ cancel_at_cycle_end: cancelAtCycleEnd ? 1 : 0 }),
  });
}

export interface RazorpayPayment {
  id: string;
  order_id: string | null;
  amount: number;
  currency: string;
  status: string; // created|authorized|captured|refunded|failed
  error_code?: string | null;
  error_description?: string | null;
}

export function fetchRazorpayPayment(id: string): Promise<RazorpayPayment> {
  return rzp<RazorpayPayment>(`/payments/${id}`);
}
