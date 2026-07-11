import type { Plan, PlanCode } from "@/lib/types";
import { env } from "@/lib/env";

/**
 * Trusted, server-controlled plan catalog. The browser only ever sends a plan
 * CODE; prices, limits and Razorpay plan ids are looked up here (or in the
 * `plans` table when Supabase is configured — the seed matches this catalog).
 * Amounts are stored in paise (the smallest INR unit).
 */
export const PLAN_CATALOG: Record<PlanCode, Plan> = {
  free: {
    id: "plan-free",
    code: "free",
    name: "Free",
    amount_minor: 0,
    currency: "INR",
    billing_interval: "month",
    razorpay_plan_id: null,
    project_limit: 3,
    monthly_url_limit: 5,
    monthly_chat_limit: 10,
    monthly_voice_limit: 5,
    features: { csv_export: false, priority: false },
    is_active: true,
  },
  pro: {
    id: "plan-pro",
    code: "pro",
    name: "Pro",
    amount_minor: 49900, // ₹499.00
    currency: "INR",
    billing_interval: "month",
    razorpay_plan_id: env.razorpayProPlanId || null,
    project_limit: 50,
    monthly_url_limit: 500,
    monthly_chat_limit: 500,
    monthly_voice_limit: 200,
    features: { csv_export: true, priority: true },
    is_active: true,
  },
  team: {
    id: "plan-team",
    code: "team",
    name: "Team",
    amount_minor: 149900, // ₹1,499.00
    currency: "INR",
    billing_interval: "month",
    razorpay_plan_id: null,
    project_limit: 200,
    monthly_url_limit: 2000,
    monthly_chat_limit: 2000,
    monthly_voice_limit: 1000,
    features: { csv_export: true, priority: true, shared_projects: true, members: 5 },
    is_active: false, // "Coming soon" for the hackathon
  },
};

/** Looks up a purchasable plan by code. Unknown/inactive codes are rejected. */
export function getPurchasablePlan(code: string): Plan | null {
  if (code !== "pro") return null; // only Pro is purchasable in the MVP
  const plan = PLAN_CATALOG[code];
  return plan?.is_active ? plan : null;
}

export function getPlanByCode(code: string): Plan | null {
  if (code === "free" || code === "pro" || code === "team") {
    return PLAN_CATALOG[code];
  }
  return null;
}

export function formatINR(amountMinor: number): string {
  return `₹${(amountMinor / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}
