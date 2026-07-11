"use client";

import Link from "next/link";
import * as React from "react";
import { Check, Minus } from "lucide-react";
import { api } from "@/lib/client";
import { Alert, Badge, Button, Card, Skeleton } from "@/components/ui";
import { UpgradeButton } from "@/components/upgrade-button";
import type { RuntimeMode } from "@/lib/env";

interface PlanRow {
  code: string;
  name: string;
  amount_minor: number;
  currency: string;
  project_limit: number;
  monthly_url_limit: number;
  monthly_chat_limit: number;
  monthly_voice_limit: number;
  features: { csv_export?: boolean; priority?: boolean };
  is_active: boolean;
}

const FAQS = [
  {
    q: "Is this real money during the hackathon?",
    a: "No. Razorpay runs in Test Mode — checkout uses Razorpay's test cards and no real charges occur. If Razorpay isn't configured at all, a clearly labelled mock billing mode stands in.",
  },
  {
    q: "What happens if I downgrade or my payment fails?",
    a: "Your projects and saved results are never deleted. You simply can't start new paid actions beyond the Free limits until access is restored, and we show a clear warning on the billing page.",
  },
  {
    q: "How do I cancel?",
    a: "One click on the Billing page. Your plan stays active until the end of the paid period, and cancellation doesn't remove any data.",
  },
  {
    q: "Do you offer refunds?",
    a: "The hackathon build doesn't process refunds in-app. For a real deployment, refunds would be handled through Razorpay per our published policy — contact support with your payment reference.",
  },
];

export function PricingClient({ signedIn }: { signedIn: boolean }) {
  const [plans, setPlans] = React.useState<PlanRow[] | null>(null);
  const [mode, setMode] = React.useState<RuntimeMode | null>(null);
  const [currentPlan, setCurrentPlan] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    const res = await api<{ plans: PlanRow[]; mode: RuntimeMode }>("/api/plans");
    if (!res.success) return setError(res.error.message);
    setPlans(res.data.plans);
    setMode(res.data.mode);
    if (signedIn) {
      const usage = await api<{ plan: { code: string } }>("/api/me/usage");
      if (usage.success) setCurrentPlan(usage.data.plan.code);
    }
  }, [signedIn]);

  React.useEffect(() => {
    void load();
  }, [load]);

  if (error) return <Alert tone="error">{error}</Alert>;
  if (!plans) {
    return (
      <div className="grid gap-6 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-96" />)}
      </div>
    );
  }

  const testMode = mode && (!mode.razorpayConfigured || process.env.NODE_ENV !== "production");

  return (
    <div className="space-y-12">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-slate-900">Pricing</h1>
        <p className="mt-2 text-slate-600">Server-enforced limits, honest badges, no surprises.</p>
        {testMode && (
          <div className="mt-3 flex justify-center gap-2">
            {mode?.razorpayConfigured ? (
              <Badge tone="amber">Razorpay Test Mode — no real charges</Badge>
            ) : mode?.mockBilling ? (
              <Badge tone="amber">Mock billing mode — Razorpay not configured, no real charges</Badge>
            ) : (
              <Badge tone="neutral">Payments not configured on this deployment</Badge>
            )}
          </div>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {plans.map((plan) => {
          const isCurrent = currentPlan === plan.code;
          const isPro = plan.code === "pro";
          const comingSoon = plan.code === "team" && !plan.is_active;
          return (
            <Card
              key={plan.code}
              className={`relative flex flex-col p-6 ${isPro ? "border-indigo-300 ring-2 ring-indigo-100" : ""}`}
            >
              {isPro && (
                <Badge tone="indigo" className="absolute -top-2.5 left-6">Most popular</Badge>
              )}
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">{plan.name}</h2>
                {isCurrent && <Badge tone="green">Current plan</Badge>}
                {comingSoon && <Badge tone="neutral">Coming soon</Badge>}
              </div>
              <p className="mt-3 text-3xl font-bold text-slate-900">
                ₹{(plan.amount_minor / 100).toLocaleString("en-IN")}
                <span className="text-sm font-normal text-slate-500">/month</span>
              </p>
              <ul className="mt-5 flex-1 space-y-2.5 text-sm">
                <Feature ok>{plan.project_limit} projects</Feature>
                <Feature ok>{plan.monthly_url_limit} URL extractions / month</Feature>
                <Feature ok>{plan.monthly_chat_limit} chat questions / month</Feature>
                <Feature ok>{plan.monthly_voice_limit} voice questions / month</Feature>
                <Feature ok>JSON export</Feature>
                <Feature ok={Boolean(plan.features.csv_export)}>CSV export</Feature>
                <Feature ok={Boolean(plan.features.priority)}>Priority processing</Feature>
                {plan.code === "team" && <Feature ok>Shared projects (up to 5 members)</Feature>}
              </ul>
              <div className="mt-6">
                {comingSoon ? (
                  <Button variant="secondary" className="w-full" disabled>
                    Coming soon
                  </Button>
                ) : plan.code === "free" ? (
                  isCurrent ? (
                    <Button variant="secondary" className="w-full" disabled>
                      You&apos;re on Free
                    </Button>
                  ) : (
                    <Link href={signedIn ? "/dashboard" : "/sign-up"}>
                      <Button variant="outline" className="w-full">
                        {signedIn ? "Included" : "Start free"}
                      </Button>
                    </Link>
                  )
                ) : isCurrent ? (
                  <Button variant="secondary" className="w-full" disabled>
                    You&apos;re on Pro
                  </Button>
                ) : signedIn ? (
                  <UpgradeButton planCode="pro" onUpgraded={() => setCurrentPlan("pro")} />
                ) : (
                  <Link href="/sign-up">
                    <Button className="w-full">Sign up to upgrade</Button>
                  </Link>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <section className="mx-auto max-w-2xl">
        <h2 className="text-center text-xl font-bold text-slate-900">Frequently asked questions</h2>
        <div className="mt-6 space-y-3">
          {FAQS.map((faq) => (
            <details key={faq.q} className="rounded-lg border border-slate-200 bg-white p-4">
              <summary className="cursor-pointer text-sm font-medium text-slate-800">{faq.q}</summary>
              <p className="mt-2 text-sm text-slate-600">{faq.a}</p>
            </details>
          ))}
        </div>
        <p className="mt-6 text-center text-xs text-slate-400">
          Cancel anytime from the Billing page — access continues to the end of the paid period and
          your data is never deleted on downgrade.
        </p>
      </section>
    </div>
  );
}

function Feature({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li className={`flex items-start gap-2 ${ok ? "text-slate-700" : "text-slate-400"}`}>
      {ok ? (
        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" aria-hidden />
      ) : (
        <Minus className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      )}
      {children}
    </li>
  );
}
