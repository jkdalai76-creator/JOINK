"use client";

import Link from "next/link";
import * as React from "react";
import { api } from "@/lib/client";
import type { Payment, Subscription, UsageCounters } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import {
  Alert, Badge, Button, Card, Dialog, EmptyState, Skeleton, statusTone,
} from "@/components/ui";
import { UpgradeButton } from "@/components/upgrade-button";

interface UsagePayload {
  plan: {
    code: string;
    name: string;
    amount_minor: number;
    project_limit: number;
    monthly_url_limit: number;
    monthly_chat_limit: number;
    monthly_voice_limit: number;
    features: { csv_export?: boolean };
  };
  usage: UsageCounters;
  projectCount: number;
  subscription: Subscription | null;
}

export function BillingClient() {
  const [data, setData] = React.useState<UsagePayload | null>(null);
  const [payments, setPayments] = React.useState<Payment[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = React.useState(false);
  const [working, setWorking] = React.useState(false);

  const load = React.useCallback(async () => {
    const [usageRes, paymentsRes] = await Promise.all([
      api<UsagePayload>("/api/me/usage"),
      api<{ payments: Payment[] }>("/api/billing/history"),
    ]);
    if (usageRes.success) setData(usageRes.data);
    else setError(usageRes.error.message);
    if (paymentsRes.success) setPayments(paymentsRes.data.payments);
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function cancel() {
    setWorking(true);
    const res = await api<{ subscription: Subscription }>("/api/billing/cancel", { method: "POST" });
    setWorking(false);
    setConfirmCancel(false);
    if (!res.success) return setError(res.error.message);
    setNotice("Cancellation requested. Your plan stays active until the end of the current period, and your data is untouched.");
    void load();
  }

  async function reconcile() {
    setWorking(true);
    const res = await api<{ reconciled: boolean; status?: string; reason?: string }>(
      "/api/billing/reconcile",
      { method: "POST" },
    );
    setWorking(false);
    if (!res.success) return setError(res.error.message);
    setNotice(
      res.data.reconciled
        ? `Checked with Razorpay — subscription status: ${res.data.status}.`
        : (res.data.reason ?? "Nothing to reconcile."),
    );
    void load();
  }

  async function resetPlan() {
    setWorking(true);
    const res = await api("/api/demo/reset-plan", { method: "POST" });
    setWorking(false);
    if (!res.success) return setError(res.error.message);
    setNotice("Reset to the Free plan (developer tool).");
    void load();
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const sub = data.subscription;
  const isPaid = data.plan.code !== "free";
  const paymentTrouble = sub?.status === "past_due";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Billing</h1>
        <p className="mt-0.5 text-sm text-slate-500">Plan, usage and payment history.</p>
      </div>

      {error && <Alert tone="error">{error}</Alert>}
      {notice && <Alert tone="success">{notice}</Alert>}
      {paymentTrouble && (
        <Alert tone="warn">
          <strong>Payment issue detected.</strong> Your last renewal didn&apos;t complete. Your data
          is safe and nothing has been deleted — please update your payment method with Razorpay,
          then press “Reconcile with Razorpay”.
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Current plan</h2>
            <Badge tone={isPaid ? "indigo" : "neutral"}>{data.plan.name}</Badge>
          </div>
          <dl className="mt-4 space-y-2 text-sm">
            <Row label="Status">
              {sub ? <Badge tone={statusTone(sub.status)}>{sub.status}</Badge> : "Free plan — no subscription"}
            </Row>
            <Row label="Provider">{sub ? (sub.provider === "mock" ? "Mock billing (labelled test)" : "Razorpay") : "—"}</Row>
            <Row label="Billing period">
              {sub?.current_period_start
                ? `${formatDate(sub.current_period_start)} → ${formatDate(sub.current_period_end)}`
                : "—"}
            </Row>
            <Row label={sub?.cancel_at_period_end ? "Access ends" : "Renews"}>
              {sub?.current_period_end ? formatDate(sub.current_period_end) : "—"}
            </Row>
            {sub?.razorpay_subscription_id && (
              <Row label="Razorpay reference">
                <code className="text-xs">{sub.razorpay_subscription_id}</code>
              </Row>
            )}
          </dl>
          <div className="mt-5 flex flex-wrap gap-2">
            {!isPaid && <UpgradeButton planCode="pro" />}
            {isPaid && !sub?.cancel_at_period_end && (
              <Button variant="outline" onClick={() => setConfirmCancel(true)}>
                Cancel subscription
              </Button>
            )}
            {sub?.provider === "razorpay" && (
              <Button variant="ghost" onClick={reconcile} loading={working}>
                Reconcile with Razorpay
              </Button>
            )}
            {process.env.NODE_ENV !== "production" && isPaid && (
              <Button variant="ghost" onClick={resetPlan} loading={working}>
                Reset to Free (dev)
              </Button>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="font-semibold text-slate-900">Usage this period</h2>
          <div className="mt-4 space-y-4">
            <UsageBar label="Projects" used={data.projectCount} limit={data.plan.project_limit} />
            <UsageBar label="URLs extracted" used={data.usage.urls_processed} limit={data.plan.monthly_url_limit} />
            <UsageBar label="Chat questions" used={data.usage.chat_questions} limit={data.plan.monthly_chat_limit} />
            <UsageBar label="Voice questions" used={data.usage.voice_questions} limit={data.plan.monthly_voice_limit} />
          </div>
          <p className="mt-4 text-xs text-slate-400">
            Period {formatDate(data.usage.period_start)} → {formatDate(data.usage.period_end)}. Limits are
            enforced server-side. <Link href="/pricing" className="text-indigo-600">Compare plans →</Link>
          </p>
        </Card>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Payment history</h2>
        {payments === null ? (
          <Skeleton className="h-32" />
        ) : payments.length === 0 ? (
          <EmptyState title="No payments yet" description="Payments appear here after your first upgrade." />
        ) : (
          <Card className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs font-medium text-slate-500 uppercase">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Verified</th>
                  <th className="px-4 py-3">Razorpay reference</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 text-slate-500">{formatDate(payment.created_at)}</td>
                    <td className="px-4 py-3 font-medium">
                      ₹{(payment.amount_minor / 100).toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={statusTone(payment.status)}>{payment.status}</Badge>
                      {payment.failure_description && (
                        <p className="mt-0.5 text-xs text-red-600">{payment.failure_description}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {payment.signature_verified ? (
                        <Badge tone="green">verified</Badge>
                      ) : (
                        <Badge tone="amber">pending</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <code className="text-xs text-slate-500">{payment.razorpay_payment_id}</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </section>

      <Dialog
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        title="Cancel your subscription?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmCancel(false)}>Keep Pro</Button>
            <Button variant="danger" loading={working} onClick={cancel}>Cancel subscription</Button>
          </>
        }
      >
        Pro stays active until the end of the current billing period. Your projects, results and
        conversations are never deleted — you&apos;ll simply return to Free-plan limits afterwards.
      </Dialog>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right text-slate-800">{children}</dd>
    </div>
  );
}

function UsageBar({ label, used, limit }: { label: string; used: number; limit: number }) {
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const tone = pct >= 100 ? "bg-red-500" : pct >= 80 ? "bg-amber-500" : "bg-indigo-500";
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span className="text-slate-600">{label}</span>
        <span className="font-medium text-slate-800">{used} / {limit}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={used} aria-valuemin={0} aria-valuemax={limit} aria-label={label}>
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
