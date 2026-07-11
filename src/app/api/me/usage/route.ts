import { errors, handle, ok } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { snapshot } from "@/lib/billing/entitlements";
import { getStore } from "@/lib/store";

/** Current plan, usage counters and subscription state for the signed-in user. */
export async function GET() {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) throw errors.unauthorized();
    const store = await getStore();
    const [snap, subscription] = await Promise.all([
      snapshot(store, user.id),
      store.getActiveSubscription(user.id),
    ]);
    return ok({
      plan: {
        code: snap.plan.code,
        name: snap.plan.name,
        amount_minor: snap.plan.amount_minor,
        currency: snap.plan.currency,
        project_limit: snap.plan.project_limit,
        monthly_url_limit: snap.plan.monthly_url_limit,
        monthly_chat_limit: snap.plan.monthly_chat_limit,
        monthly_voice_limit: snap.plan.monthly_voice_limit,
        features: snap.plan.features,
      },
      usage: snap.usage,
      projectCount: snap.projectCount,
      subscription,
    });
  });
}
