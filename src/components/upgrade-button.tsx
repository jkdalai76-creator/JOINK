"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { api } from "@/lib/client";
import { Alert, Button, Dialog } from "@/components/ui";
import type { CheckoutMode } from "@/lib/billing/service";

interface CheckoutSession {
  mode: CheckoutMode;
  planCode: string;
  amountMinor: number;
  currency: string;
  razorpayKeyId?: string;
  razorpayOrderId?: string;
  razorpaySubscriptionId?: string;
  mockToken?: string;
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open(): void };
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

/**
 * Server-priced upgrade flow. The browser sends only the plan code; amounts
 * and Razorpay ids come back from the server. Access is granted only after
 * server-side verification (signature + Razorpay API/webhook confirmation).
 */
export function UpgradeButton({
  planCode,
  label = "Upgrade to Pro",
  onUpgraded,
}: {
  planCode: string;
  label?: string;
  onUpgraded?: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [mockSession, setMockSession] = React.useState<CheckoutSession | null>(null);
  const [done, setDone] = React.useState(false);

  function finish() {
    setDone(true);
    onUpgraded?.();
    router.refresh();
  }

  async function verify(json: Record<string, unknown>) {
    const res = await api<{ activated: boolean; status: string }>("/api/billing/verify", {
      method: "POST",
      json,
    });
    if (!res.success) return setError(res.error.message);
    if (res.data.activated) finish();
    else
      setError(
        `Payment is ${res.data.status}. If you completed checkout, it will activate as soon as Razorpay confirms it — use "Reconcile" on the Billing page to re-check.`,
      );
  }

  async function start() {
    setError(null);
    setBusy(true);
    const res = await api<{ session: CheckoutSession }>("/api/billing/checkout", {
      method: "POST",
      json: { planCode },
    });
    setBusy(false);
    if (!res.success) return setError(res.error.message);
    const session = res.data.session;

    if (session.mode === "mock") {
      setMockSession(session);
      return;
    }

    const ok = await loadRazorpayScript();
    if (!ok || !window.Razorpay) {
      return setError("Could not load Razorpay Checkout. Check your network and try again.");
    }
    const options: Record<string, unknown> = {
      key: session.razorpayKeyId,
      name: "Joink",
      description:
        session.mode === "subscription" ? "Joink Pro — monthly subscription" : "Joink Pro — one-time access",
      theme: { color: "#4f46e5" },
      handler: (response: {
        razorpay_payment_id: string;
        razorpay_order_id?: string;
        razorpay_subscription_id?: string;
        razorpay_signature: string;
      }) => {
        void verify({
          mode: session.mode,
          razorpayPaymentId: response.razorpay_payment_id,
          razorpayOrderId: response.razorpay_order_id,
          razorpaySubscriptionId: response.razorpay_subscription_id ?? session.razorpaySubscriptionId,
          razorpaySignature: response.razorpay_signature,
        });
      },
    };
    if (session.mode === "subscription") options.subscription_id = session.razorpaySubscriptionId;
    else options.order_id = session.razorpayOrderId;
    new window.Razorpay(options).open();
  }

  async function confirmMock() {
    if (!mockSession) return;
    setBusy(true);
    await verify({ mode: "mock", mockToken: mockSession.mockToken });
    setBusy(false);
    setMockSession(null);
  }

  if (done) {
    return <Alert tone="success">You&apos;re on Pro now — enjoy the higher limits! 🎉</Alert>;
  }

  return (
    <div className="space-y-2">
      <Button onClick={start} loading={busy} className="w-full">
        {label}
      </Button>
      {error && <Alert tone="error">{error}</Alert>}

      <Dialog
        open={mockSession !== null}
        onClose={() => setMockSession(null)}
        title="Mock checkout (no real payment)"
        footer={
          <>
            <Button variant="ghost" onClick={() => setMockSession(null)}>Cancel</Button>
            <Button loading={busy} onClick={confirmMock}>
              Pay ₹{((mockSession?.amountMinor ?? 0) / 100).toFixed(0)} (mock)
            </Button>
          </>
        }
      >
        <p>
          Razorpay keys are not configured on this deployment, so Joink is using its clearly
          labelled <strong>mock billing mode</strong>. Confirming simulates a successful payment
          and activates Pro through the same server-side verification path. No money moves.
        </p>
      </Dialog>
    </div>
  );
}
