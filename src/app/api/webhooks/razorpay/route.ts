import { NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/billing/signatures";
import { processRazorpayEvent } from "@/lib/billing/webhook";
import { env } from "@/lib/env";
import { getBackgroundStore } from "@/lib/store";

/**
 * Razorpay webhook endpoint.
 *  1. Reads the RAW body (signature is computed over exact bytes).
 *  2. Verifies X-Razorpay-Signature (HMAC-SHA256, webhook secret).
 *  3. Stores the event BEFORE processing; duplicates (same event id) are
 *     acknowledged but skipped, so retries can never double-apply.
 *  4. Processes idempotently. No secrets or payloads are logged.
 */
export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";

  if (!env.razorpayWebhookSecret) {
    return NextResponse.json({ error: "webhook_not_configured" }, { status: 503 });
  }
  if (!verifyWebhookSignature({ rawBody, signature, webhookSecret: env.razorpayWebhookSecret })) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  let parsed: { event?: string };
  try {
    parsed = JSON.parse(rawBody) as { event?: string };
  } catch {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }
  const eventType = parsed.event ?? "unknown";
  const eventId = req.headers.get("x-razorpay-event-id") ?? `rzp_${hashFallback(rawBody)}`;

  const store = getBackgroundStore();
  const stored = await store.insertWebhookEvent({
    provider: "razorpay",
    provider_event_id: eventId,
    event_type: eventType,
    payload: parsed,
    processing_status: "received",
    error_message: null,
  });
  if (!stored) {
    // Duplicate delivery — acknowledge without reprocessing.
    return NextResponse.json({ status: "duplicate_ignored" });
  }

  try {
    const outcome = await processRazorpayEvent(store, eventType, parsed);
    await store.markWebhookEvent(stored.id, outcome === "processed" ? "processed" : "skipped");
    return NextResponse.json({ status: outcome });
  } catch (err) {
    console.error(`[joink] webhook ${eventType} processing failed`);
    await store.markWebhookEvent(
      stored.id,
      "error",
      err instanceof Error ? err.message : "unknown error",
    );
    // 500 asks Razorpay to retry; the stored event id keeps it idempotent.
    return NextResponse.json({ error: "processing_failed" }, { status: 500 });
  }
}

function hashFallback(body: string): string {
  // Stable fallback id for gateways that omit the event-id header.
  let hash = 0;
  for (let i = 0; i < body.length; i++) {
    hash = (hash * 31 + body.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36);
}
