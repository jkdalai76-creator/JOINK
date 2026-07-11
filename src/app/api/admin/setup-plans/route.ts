import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createRazorpayPlan } from "@/lib/billing/razorpay";
import { env, razorpayConfigured } from "@/lib/env";
import { PLAN_CATALOG } from "@/lib/plans";

/**
 * One-time bootstrap: creates the monthly Razorpay subscription Plans for the
 * purchasable tiers (Pro, Team) using the keys already configured server-side,
 * so the owner never has to build them by hand in the dashboard and the secret
 * never leaves the server.
 *
 * Security:
 *  - Disabled unless RAZORPAY_SETUP_TOKEN is set (returns 404 otherwise).
 *  - Requires ?token= to match that secret (constant-time compare).
 *  - After copying the returned plan ids into RAZORPAY_PRO_PLAN_ID /
 *    RAZORPAY_TEAM_PLAN_ID, REMOVE the token env var to switch this off again.
 *
 * Note: each call creates NEW plans in Razorpay — run it once.
 */
const ENV_VAR: Record<string, string> = {
  pro: "RAZORPAY_PRO_PLAN_ID",
  team: "RAZORPAY_TEAM_PLAN_ID",
};

function tokenMatches(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function GET(req: Request) {
  const expected = env.razorpaySetupToken;
  // Feature is entirely invisible unless a setup token is configured.
  if (!expected) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const provided = new URL(req.url).searchParams.get("token") ?? "";
  if (!tokenMatches(provided, expected)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (!razorpayConfigured()) {
    return NextResponse.json(
      {
        error: "razorpay_keys_missing",
        detail: "Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in Vercel first, then retry.",
      },
      { status: 400 },
    );
  }

  const plans: Record<string, unknown> = {};
  for (const code of ["pro", "team"] as const) {
    const p = PLAN_CATALOG[code];
    try {
      const created = await createRazorpayPlan({
        name: `Joink ${p.name}`,
        amountMinor: p.amount_minor,
        currency: p.currency,
        description: `Joink ${p.name} — monthly subscription`,
        notes: { joink_plan_code: code },
      });
      plans[code] = {
        plan_id: created.id,
        set_env_var: ENV_VAR[code],
        amount: `₹${(p.amount_minor / 100).toLocaleString("en-IN")}/month`,
      };
    } catch (err) {
      plans[code] = { error: err instanceof Error ? err.message : "creation failed" };
    }
  }

  return NextResponse.json({
    status: "done",
    next_steps: [
      "Copy each plan_id below into the matching env var in Vercel (Settings → Environment Variables).",
      "REMOVE RAZORPAY_SETUP_TOKEN so this endpoint turns off again.",
      "Redeploy. /api/health should then show razorpay.subscriptions: true.",
    ],
    plans,
  });
}
