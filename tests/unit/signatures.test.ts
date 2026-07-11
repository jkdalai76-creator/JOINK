import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  verifyOrderCheckoutSignature,
  verifySubscriptionCheckoutSignature,
  verifyWebhookSignature,
} from "@/lib/billing/signatures";

const SECRET = "test_secret_key";
const hmac = (payload: string) => createHmac("sha256", SECRET).update(payload).digest("hex");

describe("verifyOrderCheckoutSignature", () => {
  it("accepts the correct HMAC of order_id|payment_id", () => {
    expect(
      verifyOrderCheckoutSignature({
        orderId: "order_123",
        paymentId: "pay_456",
        signature: hmac("order_123|pay_456"),
        keySecret: SECRET,
      }),
    ).toBe(true);
  });

  it("rejects tampered ids, wrong secrets and missing fields", () => {
    const sig = hmac("order_123|pay_456");
    expect(
      verifyOrderCheckoutSignature({ orderId: "order_999", paymentId: "pay_456", signature: sig, keySecret: SECRET }),
    ).toBe(false);
    expect(
      verifyOrderCheckoutSignature({ orderId: "order_123", paymentId: "pay_456", signature: sig, keySecret: "other" }),
    ).toBe(false);
    expect(
      verifyOrderCheckoutSignature({ orderId: "", paymentId: "", signature: "", keySecret: SECRET }),
    ).toBe(false);
  });
});

describe("verifySubscriptionCheckoutSignature", () => {
  it("accepts the correct HMAC of payment_id|subscription_id", () => {
    expect(
      verifySubscriptionCheckoutSignature({
        paymentId: "pay_1",
        subscriptionId: "sub_2",
        signature: hmac("pay_1|sub_2"),
        keySecret: SECRET,
      }),
    ).toBe(true);
  });

  it("rejects swapped operands", () => {
    expect(
      verifySubscriptionCheckoutSignature({
        paymentId: "pay_1",
        subscriptionId: "sub_2",
        signature: hmac("sub_2|pay_1"),
        keySecret: SECRET,
      }),
    ).toBe(false);
  });
});

describe("verifyWebhookSignature", () => {
  const body = JSON.stringify({ event: "payment.captured", payload: {} });

  it("accepts the correct HMAC of the raw body", () => {
    expect(
      verifyWebhookSignature({ rawBody: body, signature: hmac(body), webhookSecret: SECRET }),
    ).toBe(true);
  });

  it("rejects a modified body or bad signature", () => {
    expect(
      verifyWebhookSignature({ rawBody: body + " ", signature: hmac(body), webhookSecret: SECRET }),
    ).toBe(false);
    expect(
      verifyWebhookSignature({ rawBody: body, signature: "deadbeef", webhookSecret: SECRET }),
    ).toBe(false);
    expect(verifyWebhookSignature({ rawBody: body, signature: hmac(body), webhookSecret: "" })).toBe(false);
  });
});
