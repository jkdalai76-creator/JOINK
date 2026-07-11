import { expect, test, type Page } from "@playwright/test";

/**
 * Monetization flow in demo mode: the explicitly labelled MOCK billing path
 * exercises the same server-side checkout → verify → entitlement pipeline
 * that Razorpay Test Mode uses (only the gateway call is stubbed).
 */

async function signUp(page: Page, email: string) {
  await page.goto("/sign-up");
  await page.getByLabel("Name").fill("Billing Tester");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("supersecret123");
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL("**/dashboard");
}

test("free user upgrades to Pro through mock checkout and gets higher limits", async ({ page }) => {
  await signUp(page, `upgrade-${Date.now()}@e2e.test`);

  // Free plan visible on dashboard with Free limits
  await expect(page.getByText("Current plan")).toBeVisible();
  await expect(page.getByText("/ 5", { exact: false }).first()).toBeVisible();

  // Server rejects unknown plan codes outright
  const bogus = await page.request.post("/api/billing/checkout", {
    data: { planCode: "enterprise" },
  });
  expect(bogus.status()).toBe(400);

  // Pricing page shows the mock-billing badge and plans
  await page.goto("/pricing");
  await expect(page.getByText("Mock billing mode")).toBeVisible();
  await expect(page.getByText("Coming soon").first()).toBeVisible();

  // Upgrade via the labelled mock checkout
  await page.getByRole("button", { name: "Upgrade to Pro" }).click();
  await expect(page.getByRole("dialog", { name: "Mock checkout (no real payment)" })).toBeVisible();
  await page.getByRole("button", { name: /Pay ₹499 \(mock\)/ }).click();
  await expect(page.getByText("You're on Pro now")).toBeVisible();

  // Billing page reflects Pro, verified payment, and higher limits
  await page.goto("/billing");
  await expect(page.getByText("Pro").first()).toBeVisible();
  await expect(page.getByText("verified")).toBeVisible();
  await expect(page.getByText("Mock billing (labelled test)")).toBeVisible();
  await expect(page.getByText("500", { exact: false }).first()).toBeVisible();

  // Server-side entitlement change: CSV export is now allowed
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Load demo project" }).first().click();
  await page.waitForURL("**/runs/**");
  const runId = page.url().split("/runs/")[1];
  const csv = await page.request.get(`/api/runs/${runId}/export?format=csv`);
  expect(csv.ok()).toBeTruthy();
  const body = await csv.text();
  expect(body).toContain("source_url");

  // Cancel keeps data and shows the period-end notice
  await page.goto("/billing");
  await page.getByRole("button", { name: "Cancel subscription" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Cancel subscription" }).click();
  await expect(page.getByText("Cancellation requested")).toBeVisible();
  await page.goto("/dashboard");
  await expect(page.getByText("Demo: Web scraping research")).toBeVisible();
});

test("client callbacks alone cannot grant Pro access", async ({ page }) => {
  await signUp(page, `nofake-${Date.now()}@e2e.test`);

  // Forged verify calls without a matching server-created order must fail…
  const forged = await page.request.post("/api/billing/verify", {
    data: { mode: "mock", mockToken: "11111111-1111-1111-1111-111111111111" },
  });
  expect(forged.ok()).toBeFalsy();

  // …and a forged Razorpay-style verification without signatures fails too.
  const forgedRzp = await page.request.post("/api/billing/verify", {
    data: {
      mode: "order",
      razorpayPaymentId: "pay_fake",
      razorpayOrderId: "order_fake",
      razorpaySignature: "deadbeef",
    },
  });
  expect(forgedRzp.status()).toBeGreaterThanOrEqual(400);

  // Plan unchanged
  const usage = await page.request.get("/api/me/usage");
  const payload = await usage.json();
  expect(payload.data.plan.code).toBe("free");
});
