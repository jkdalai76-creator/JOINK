import { handle, ok } from "@/lib/api";
import { PLAN_CATALOG } from "@/lib/plans";
import { runtimeMode } from "@/lib/env";

/** Public pricing catalog (server-controlled — safe fields only). */
export async function GET() {
  return handle(async () => {
    const plans = Object.values(PLAN_CATALOG).map((p) => ({
      code: p.code,
      name: p.name,
      amount_minor: p.amount_minor,
      currency: p.currency,
      billing_interval: p.billing_interval,
      project_limit: p.project_limit,
      monthly_url_limit: p.monthly_url_limit,
      monthly_chat_limit: p.monthly_chat_limit,
      monthly_voice_limit: p.monthly_voice_limit,
      features: p.features,
      is_active: p.is_active,
    }));
    return ok({ plans, mode: runtimeMode() });
  });
}
