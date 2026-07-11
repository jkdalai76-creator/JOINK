import { describe, expect, it } from "vitest";
import { getPlanById, getPlanByCode, getPurchasablePlan, PLAN_CATALOG } from "@/lib/plans";

describe("trusted plan catalog", () => {
  it("looks up the Pro price server-side (₹499 in paise)", () => {
    const pro = getPurchasablePlan("pro");
    expect(pro?.amount_minor).toBe(49900);
    expect(pro?.currency).toBe("INR");
  });

  it("looks up the Team price server-side (₹1,499 in paise)", () => {
    const team = getPurchasablePlan("team");
    expect(team?.amount_minor).toBe(149900);
    expect(team?.currency).toBe("INR");
  });

  it("rejects unknown plan codes", () => {
    expect(getPurchasablePlan("enterprise")).toBeNull();
    expect(getPurchasablePlan("")).toBeNull();
    expect(getPurchasablePlan("PRO; DROP TABLE plans")).toBeNull();
    expect(getPlanByCode("nope")).toBeNull();
  });

  it("refuses to sell the free plan", () => {
    expect(getPurchasablePlan("free")).toBeNull();
  });

  it("resolves plans by catalog id for post-payment activation", () => {
    expect(getPlanById("plan-pro")?.code).toBe("pro");
    expect(getPlanById("plan-team")?.code).toBe("team");
    expect(getPlanById("plan-nonexistent")).toBeNull();
  });

  it("keeps Pro limits above Free limits", () => {
    expect(PLAN_CATALOG.pro.monthly_url_limit).toBeGreaterThan(PLAN_CATALOG.free.monthly_url_limit);
    expect(PLAN_CATALOG.pro.project_limit).toBeGreaterThan(PLAN_CATALOG.free.project_limit);
  });
});
