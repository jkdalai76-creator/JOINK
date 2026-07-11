import { describe, expect, it } from "vitest";
import {
  checkChat,
  checkCreateProject,
  checkCsvExport,
  checkProcessUrls,
  checkVoice,
  type EntitlementSnapshot,
} from "@/lib/billing/entitlements";
import { PLAN_CATALOG } from "@/lib/plans";
import type { UsageCounters } from "@/lib/types";

function usage(partial: Partial<UsageCounters> = {}): UsageCounters {
  return {
    id: "u1",
    user_id: "user1",
    period_start: new Date().toISOString(),
    period_end: new Date().toISOString(),
    projects_created: 0,
    urls_processed: 0,
    chat_questions: 0,
    voice_questions: 0,
    updated_at: new Date().toISOString(),
    ...partial,
  };
}

const freeSnap = (over: Partial<EntitlementSnapshot> = {}): EntitlementSnapshot => ({
  plan: PLAN_CATALOG.free,
  usage: usage(),
  projectCount: 0,
  ...over,
});

describe("entitlement checks (server-side)", () => {
  it("allows project creation under the limit and blocks at the limit", () => {
    expect(checkCreateProject(freeSnap({ projectCount: 2 })).allowed).toBe(true);
    const blocked = checkCreateProject(freeSnap({ projectCount: 3 }));
    expect(blocked.allowed).toBe(false);
    expect(blocked.reason).toMatch(/upgrade/i);
  });

  it("enforces the monthly URL budget including batch size", () => {
    expect(checkProcessUrls(freeSnap(), 5).allowed).toBe(true);
    expect(checkProcessUrls(freeSnap(), 6).allowed).toBe(false);
    expect(checkProcessUrls(freeSnap({ usage: usage({ urls_processed: 4 }) }), 2).allowed).toBe(false);
    expect(checkProcessUrls(freeSnap({ usage: usage({ urls_processed: 4 }) }), 1).allowed).toBe(true);
  });

  it("enforces chat and voice limits separately", () => {
    expect(checkChat(freeSnap({ usage: usage({ chat_questions: 10 }) })).allowed).toBe(false);
    expect(checkVoice(freeSnap({ usage: usage({ voice_questions: 5 }) })).allowed).toBe(false);
    expect(checkChat(freeSnap({ usage: usage({ chat_questions: 9 }) })).allowed).toBe(true);
  });

  it("gates CSV export by plan feature", () => {
    expect(checkCsvExport(freeSnap()).allowed).toBe(false);
    expect(checkCsvExport(freeSnap({ plan: PLAN_CATALOG.pro })).allowed).toBe(true);
  });

  it("Pro raises the URL budget", () => {
    expect(checkProcessUrls(freeSnap({ plan: PLAN_CATALOG.pro }), 10).allowed).toBe(true);
  });
});
