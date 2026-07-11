import { createHmac, timingSafeEqual } from "node:crypto";

function hmacHex(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

function safeEqualHex(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

/** Razorpay Orders checkout: HMAC-SHA256(`${order_id}|${payment_id}`, key_secret). */
export function verifyOrderCheckoutSignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
  keySecret: string;
}): boolean {
  if (!params.orderId || !params.paymentId || !params.signature || !params.keySecret) return false;
  const expected = hmacHex(`${params.orderId}|${params.paymentId}`, params.keySecret);
  return safeEqualHex(expected, params.signature);
}

/** Razorpay Subscriptions checkout: HMAC-SHA256(`${payment_id}|${subscription_id}`, key_secret). */
export function verifySubscriptionCheckoutSignature(params: {
  paymentId: string;
  subscriptionId: string;
  signature: string;
  keySecret: string;
}): boolean {
  if (!params.paymentId || !params.subscriptionId || !params.signature || !params.keySecret) {
    return false;
  }
  const expected = hmacHex(`${params.paymentId}|${params.subscriptionId}`, params.keySecret);
  return safeEqualHex(expected, params.signature);
}

/** Razorpay webhooks: HMAC-SHA256 of the RAW request body with the webhook secret. */
export function verifyWebhookSignature(params: {
  rawBody: string;
  signature: string;
  webhookSecret: string;
}): boolean {
  if (!params.rawBody || !params.signature || !params.webhookSecret) return false;
  const expected = hmacHex(params.rawBody, params.webhookSecret);
  return safeEqualHex(expected, params.signature);
}
