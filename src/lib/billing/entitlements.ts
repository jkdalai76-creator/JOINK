import type { DataStore } from "@/lib/store/types";
import type { Plan, UsageCounters } from "@/lib/types";

/**
 * Centralized, server-side entitlement checks. Every limit in the product is
 * enforced here (and only here) so client code can never grant itself access.
 */

export interface EntitlementDecision {
  allowed: boolean;
  reason?: string;
  limit?: number;
  used?: number;
}

export interface EntitlementSnapshot {
  plan: Plan;
  usage: UsageCounters;
  projectCount: number;
}

export async function snapshot(store: DataStore, userId: string): Promise<EntitlementSnapshot> {
  const [plan, usage, projectCount] = await Promise.all([
    store.getUserPlan(userId),
    store.getCurrentUsage(userId),
    store.countProjects(userId),
  ]);
  return { plan, usage, projectCount };
}

export function checkCreateProject(s: EntitlementSnapshot): EntitlementDecision {
  if (s.projectCount >= s.plan.project_limit) {
    return {
      allowed: false,
      reason: `Your ${s.plan.name} plan allows up to ${s.plan.project_limit} projects. Upgrade to create more.`,
      limit: s.plan.project_limit,
      used: s.projectCount,
    };
  }
  return { allowed: true, limit: s.plan.project_limit, used: s.projectCount };
}

export function checkProcessUrls(s: EntitlementSnapshot, urlCount: number): EntitlementDecision {
  const remaining = s.plan.monthly_url_limit - s.usage.urls_processed;
  if (urlCount > remaining) {
    return {
      allowed: false,
      reason:
        remaining <= 0
          ? `You've used all ${s.plan.monthly_url_limit} URL extractions in your ${s.plan.name} plan this month. Upgrade for more.`
          : `Only ${remaining} URL extraction${remaining === 1 ? "" : "s"} left this month on your ${s.plan.name} plan (you submitted ${urlCount}).`,
      limit: s.plan.monthly_url_limit,
      used: s.usage.urls_processed,
    };
  }
  return { allowed: true, limit: s.plan.monthly_url_limit, used: s.usage.urls_processed };
}

export function checkChat(s: EntitlementSnapshot): EntitlementDecision {
  if (s.usage.chat_questions >= s.plan.monthly_chat_limit) {
    return {
      allowed: false,
      reason: `You've reached the ${s.plan.monthly_chat_limit} chat questions included in your ${s.plan.name} plan this month.`,
      limit: s.plan.monthly_chat_limit,
      used: s.usage.chat_questions,
    };
  }
  return { allowed: true, limit: s.plan.monthly_chat_limit, used: s.usage.chat_questions };
}

export function checkVoice(s: EntitlementSnapshot): EntitlementDecision {
  if (s.usage.voice_questions >= s.plan.monthly_voice_limit) {
    return {
      allowed: false,
      reason: `You've reached the ${s.plan.monthly_voice_limit} voice questions included in your ${s.plan.name} plan this month.`,
      limit: s.plan.monthly_voice_limit,
      used: s.usage.voice_questions,
    };
  }
  return { allowed: true, limit: s.plan.monthly_voice_limit, used: s.usage.voice_questions };
}

export function checkCsvExport(s: EntitlementSnapshot): EntitlementDecision {
  if (!s.plan.features.csv_export) {
    return {
      allowed: false,
      reason: "CSV export is a Pro feature. JSON export is available on every plan.",
    };
  }
  return { allowed: true };
}
