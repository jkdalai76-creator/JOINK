import { describe, expect, it } from "vitest";
import { getPlanByCode, getPurchasablePlan, PLAN_CATALOG } from "@/lib/plans";

describe("trusted plan catalog", () => {
  it("looks up the Pro price server-side (₹499 in paise)", () => {
    const pro = getPurchasablePlan("pro");
    expect(pro?.amount_minor).toBe(49900);
    expect(pro?.currency).toBe("INR");
  });

  it("rejects unknown plan codes", () => {
    expect(getPurchasablePlan("enterprise")).toBeNull();
    expect(getPurchasablePlan("")).toBeNull();
    expect(getPurchasablePlan("PRO; DROP TABLE plans")).toBeNull();
    expect(getPlanByCode("nope")).toBeNull();
  });

  it("refuses to sell free and coming-soon plans", () => {
    expect(getPurchasablePlan("free")).toBeNull();
    expect(getPurchasablePlan("team")).toBeNull();
  });

  it("keeps Pro limits above Free limits", () => {
    expect(PLAN_CATALOG.pro.monthly_url_limit).toBeGreaterThan(PLAN_CATALOG.free.monthly_url_limit);
    expect(PLAN_CATALOG.pro.project_limit).toBeGreaterThan(PLAN_CATALOG.free.project_limit);
  });
});
