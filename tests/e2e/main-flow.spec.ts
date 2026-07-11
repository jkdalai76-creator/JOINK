import { expect, test, type Page } from "@playwright/test";

/**
 * Main product flow, run entirely in demo mode (in-memory store):
 * sign up → create project → extract a URL → view structured results →
 * results survive reload → reopen from dashboard → export JSON → chat
 * (extractive fallback, since no AI key) → delete run.
 */

async function signUp(page: Page, email: string) {
  await page.goto("/sign-up");
  await page.getByLabel("Name").fill("E2E Tester");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("supersecret123");
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL("**/dashboard");
}

test("landing page renders with CTA and responsible-scraping statement", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("structured");
  await expect(page.getByRole("link", { name: "Start scraping" })).toBeVisible();
  await expect(page.getByText("responsible-scraping commitment")).toBeVisible();
});

test("full main flow with demo project", async ({ page }) => {
  await signUp(page, `main-${Date.now()}@e2e.test`);

  // Empty dashboard onboarding
  await expect(page.getByText("Create your first project")).toBeVisible();

  // Load the demo project (3 good pages + 1 failed URL + saved chat)
  await page.getByRole("button", { name: "Load demo project" }).first().click();
  await page.waitForURL("**/runs/**");

  // Workspace overview: partial status, failed URL visible but not fatal
  await expect(page.getByText("Extraction results")).toBeVisible();
  await expect(page.getByText("3 of 4 pages extracted, 1 failed")).toBeVisible();
  await expect(page.getByText("Web Scraping Basics: A Practical Guide")).toBeVisible();
  await expect(page.getByText('Requests to "intranet.example.internal" are not allowed.')).toBeVisible();

  // Headings tab with level filter
  await page.getByRole("tab", { name: /Headings/ }).click();
  await expect(page.getByText("Scraping ethically")).toBeVisible();
  await page.getByLabel("Filter by heading level").selectOption("1");
  await expect(page.getByText("Scraping ethically")).toBeHidden();
  await expect(page.getByRole("cell", { name: "Web Scraping Basics", exact: true })).toBeVisible();
  await page.getByLabel("Filter by heading level").selectOption("all");

  // Links tab with internal/external filter
  await page.getByRole("tab", { name: /Links/ }).click();
  await expect(page.getByText("MDN: HTML")).toBeVisible();
  await page.getByLabel("Filter internal or external links").selectOption("internal");
  await expect(page.getByText("MDN: HTML")).toBeHidden();

  // Keyword search
  await page.getByLabel("Search extracted content").fill("robots");
  await expect(page.getByText("robots.txt specification")).toBeVisible();
  await page.getByLabel("Search extracted content").fill("");

  // Structured data + JSON export (must include source URLs and timestamps)
  const runUrl = page.url();
  const runId = runUrl.split("/runs/")[1];
  const exportRes = await page.request.get(`/api/runs/${runId}/export?format=json`);
  expect(exportRes.ok()).toBeTruthy();
  const exported = await exportRes.json();
  expect(exported.pages.length).toBe(4);
  expect(exported.pages[0].requested_url).toContain("https://");
  expect(exported.pages[0].scraped_at).toBeTruthy();

  // CSV export is Pro-only on the Free plan → clean 402, not a crash
  const csvRes = await page.request.get(`/api/runs/${runId}/export?format=csv`);
  expect(csvRes.status()).toBe(402);

  // Saved chat with citations is visible; ask a new question (extractive mode)
  await page.getByRole("tab", { name: "Chat" }).click();
  await expect(page.getByText("AI is not configured")).toBeVisible();
  await page.getByLabel("Chat question").fill("What does robots.txt do?");
  await page.getByRole("button", { name: "Send question" }).click();
  await expect(page.getByText("Sources").last()).toBeVisible();
  await expect(page.getByText("robots.txt Reference for Site Owners").last()).toBeVisible();

  // Results survive a reload (persistence within the server process)
  await page.reload();
  await expect(page.getByText("3 of 4 pages extracted, 1 failed")).toBeVisible();

  // Reopen from the dashboard
  await page.goto("/dashboard");
  await expect(page.getByText("Demo: Web scraping research")).toBeVisible();
  await page.getByRole("cell", { name: runId.slice(0, 8) }).click();
  await page.waitForURL(`**/runs/${runId}`);
  await expect(page.getByText("Extraction results")).toBeVisible();

  // Delete the run with confirmation
  await page.getByRole("button", { name: "Delete run" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete run" }).click();
  await page.waitForURL("**/projects/**");
});

test("second consecutive run works (repeatability)", async ({ page }) => {
  await signUp(page, `repeat-${Date.now()}@e2e.test`);
  for (let i = 0; i < 2; i++) {
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "Load demo project" }).first().click();
    await page.waitForURL("**/runs/**");
    await expect(page.getByText("3 of 4 pages extracted, 1 failed")).toBeVisible();
  }
});

test("project CRUD", async ({ page }) => {
  await signUp(page, `crud-${Date.now()}@e2e.test`);
  await page.goto("/projects/new");
  await page.getByLabel("Project name").fill("CRUD project");
  await page.getByLabel("One URL per line (up to 10)").fill("https://example.com");
  // Create the project via the extraction form; extraction may fail without
  // network, which must still leave the project + run visible.
  await page.getByRole("button", { name: "Extract content" }).click();
  await page.waitForURL("**/runs/**", { timeout: 60_000 });

  await expect(page.getByText("CRUD project")).toBeVisible();
  await page.getByRole("link", { name: "CRUD project" }).click();
  await page.waitForURL("**/projects/**");

  // Update
  await page.getByRole("button", { name: "Edit" }).click();
  await page.getByLabel("Name").fill("CRUD project renamed");
  await page.getByRole("dialog").getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("heading", { name: "CRUD project renamed" })).toBeVisible();

  // Delete
  await page.getByRole("button", { name: "Delete" }).first().click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete project" }).click();
  await page.waitForURL("**/dashboard");
  await expect(page.getByText("CRUD project renamed")).toBeHidden();
});

test("users cannot access another user's data", async ({ browser }) => {
  const contextA = await browser.newContext();
  const pageA = await contextA.newPage();
  await signUp(pageA, `owner-${Date.now()}@e2e.test`);
  await pageA.getByRole("button", { name: "Load demo project" }).first().click();
  await pageA.waitForURL("**/runs/**");
  const runId = pageA.url().split("/runs/")[1];

  const contextB = await browser.newContext();
  const pageB = await contextB.newPage();
  await signUp(pageB, `intruder-${Date.now()}@e2e.test`);
  const res = await pageB.request.get(`/api/runs/${runId}`);
  expect(res.status()).toBe(404);
  const exportRes = await pageB.request.get(`/api/runs/${runId}/export?format=json`);
  expect(exportRes.status()).toBe(404);

  await contextA.close();
  await contextB.close();
});
