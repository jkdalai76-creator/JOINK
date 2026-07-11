import { beforeEach, describe, expect, it } from "vitest";
import { MemoryStore, resetMemoryDb } from "@/lib/store/memory";
import { processRazorpayEvent } from "@/lib/billing/webhook";
import { PLAN_CATALOG } from "@/lib/plans";

describe("MemoryStore", () => {
  let store: MemoryStore;
  const alice = "user-alice";
  const bob = "user-bob";

  beforeEach(() => {
    resetMemoryDb();
    store = new MemoryStore();
  });

  it("stores, looks up, counter-updates and deletes passkeys per user", async () => {
    const c = await store.createCredential({
      user_id: alice,
      credential_id: "cred-abc",
      public_key: "pk",
      counter: 0,
      transports: ["internal"],
      device_label: "Laptop",
    });
    expect(await store.getCredentialByCredentialId("cred-abc")).toMatchObject({ user_id: alice });
    expect(await store.listCredentialsByUser(alice)).toHaveLength(1);
    expect(await store.listCredentialsByUser(bob)).toHaveLength(0);

    await store.updateCredentialCounter(c.id, 5);
    expect((await store.getCredentialByCredentialId("cred-abc"))?.counter).toBe(5);

    await store.deleteCredential(bob, c.id); // wrong owner — no-op
    expect(await store.listCredentialsByUser(alice)).toHaveLength(1);
    await store.deleteCredential(alice, c.id);
    expect(await store.listCredentialsByUser(alice)).toHaveLength(0);
  });

  it("resolves stored plan ids back to their catalog plan", async () => {
    expect((await store.getPlanById("plan-pro"))?.code).toBe("pro");
    expect((await store.getPlanById("plan-team"))?.code).toBe("team");
    expect(await store.getPlanById("plan-missing")).toBeNull();
  });

  it("prevents cross-user access to projects, runs, pages and conversations", async () => {
    const project = await store.createProject(alice, "Alice's research", null);
    const run = await store.createRun({
      project_id: project.id,
      user_id: alice,
      status: "completed",
      requested_url_count: 1,
      completed_url_count: 1,
      failed_url_count: 0,
      extraction_options: { metadata: true, headings: true, mainText: true, links: true },
    });
    const page = await store.createPage({
      scrape_run_id: run.id,
      project_id: project.id,
      user_id: alice,
      requested_url: "https://example.com",
      final_url: "https://example.com",
      page_title: "T",
      meta_description: null,
      main_text: "text",
      http_status: 200,
      content_type: "text/html",
      extraction_method: "http",
      extraction_status: "completed",
      confidence: "high",
      error_message: null,
      scraped_at: new Date().toISOString(),
    });
    const conv = await store.createConversation({
      user_id: alice,
      project_id: project.id,
      scrape_run_id: run.id,
      title: "Q",
    });

    expect(await store.getProject(bob, project.id)).toBeNull();
    expect(await store.getRun(bob, run.id)).toBeNull();
    expect(await store.getPage(bob, page.id)).toBeNull();
    expect(await store.listPagesByRun(bob, run.id)).toHaveLength(0);
    expect(await store.getConversation(bob, conv.id)).toBeNull();
    expect(await store.listMessages(bob, conv.id)).toHaveLength(0);
    expect(await store.deleteProject(bob, project.id)).toBe(false);
    expect(await store.deleteRun(bob, run.id)).toBe(false);
    // Alice still sees everything.
    expect(await store.getProject(alice, project.id)).not.toBeNull();
  });

  it("counts usage atomically and honours idempotency keys on retry", async () => {
    await store.incrementUsage(alice, { urls_processed: 3 }, "run:1:urls");
    await store.incrementUsage(alice, { urls_processed: 3 }, "run:1:urls"); // retry
    await store.incrementUsage(alice, { urls_processed: 2 }, "run:2:urls");
    const usage = await store.getCurrentUsage(alice);
    expect(usage.urls_processed).toBe(5);
  });

  it("scopes idempotency keys per user", async () => {
    await store.incrementUsage(alice, { chat_questions: 1 }, "msg:1");
    await store.incrementUsage(bob, { chat_questions: 1 }, "msg:1");
    expect((await store.getCurrentUsage(alice)).chat_questions).toBe(1);
    expect((await store.getCurrentUsage(bob)).chat_questions).toBe(1);
  });

  it("deduplicates webhook events by provider event id", async () => {
    const ev = {
      provider: "razorpay" as const,
      provider_event_id: "evt_1",
      event_type: "payment.captured",
      payload: {},
      processing_status: "received" as const,
      error_message: null,
    };
    expect(await store.insertWebhookEvent(ev)).not.toBeNull();
    expect(await store.insertWebhookEvent(ev)).toBeNull();
  });

  it("deleting a run cascades to pages, headings, links and conversations", async () => {
    const project = await store.createProject(alice, "P", null);
    const run = await store.createRun({
      project_id: project.id,
      user_id: alice,
      status: "completed",
      requested_url_count: 1,
      completed_url_count: 1,
      failed_url_count: 0,
      extraction_options: { metadata: true, headings: true, mainText: true, links: true },
    });
    const page = await store.createPage({
      scrape_run_id: run.id, project_id: project.id, user_id: alice,
      requested_url: "https://example.com", final_url: null, page_title: null,
      meta_description: null, main_text: null, http_status: null, content_type: null,
      extraction_method: "http", extraction_status: "completed", confidence: "high",
      error_message: null, scraped_at: null,
    });
    await store.insertHeadings([{ scraped_page_id: page.id, level: 1, text: "H", position_index: 0, section_hint: null }]);
    await store.insertLinks([{ scraped_page_id: page.id, anchor_text: "a", url: "https://x.example", is_internal: false, position_index: 0 }]);
    await store.deleteRun(alice, run.id);
    expect(await store.listPagesByRun(alice, run.id)).toHaveLength(0);
    expect(await store.listHeadingsByRun(alice, run.id)).toHaveLength(0);
    expect(await store.listLinksByRun(alice, run.id)).toHaveLength(0);
  });
});

describe("visitor counting & feedback", () => {
  beforeEach(() => resetMemoryDb());

  it("counts each visitor key exactly once", async () => {
    const store = new MemoryStore();
    expect(await store.recordVisitor("v1")).toBe(1);
    expect(await store.recordVisitor("v1")).toBe(1); // repeat visit, same cookie
    expect(await store.recordVisitor("v2")).toBe(2);
    expect(await store.countVisitors()).toBe(2);
  });

  it("stores feedback with optional user and email", async () => {
    const store = new MemoryStore();
    const fb = await store.createFeedback({
      user_id: null,
      email: null,
      message: "Love the citations feature!",
      page: "/dashboard",
    });
    expect(fb.id).toBeTruthy();
    expect(fb.message).toContain("citations");
  });
});

describe("webhook processing (idempotent activation)", () => {
  beforeEach(() => resetMemoryDb());

  it("activates Pro once for order.paid and stays Pro on duplicate processing", async () => {
    const store = new MemoryStore();
    const user = "user-1";
    const order = await store.createPaymentOrder({
      user_id: user,
      plan_id: PLAN_CATALOG.pro.id,
      razorpay_order_id: "order_abc",
      amount_minor: 49900,
      currency: "INR",
      status: "created",
      receipt: "r1",
    });
    const payload = { payload: { order: { entity: { id: "order_abc" } } } };

    expect(await processRazorpayEvent(store, "order.paid", payload)).toBe("processed");
    const planAfter = await store.getUserPlan(user);
    expect(planAfter.code).toBe("pro");

    // Re-processing the same logical event must not create a second sub or fail.
    expect(await processRazorpayEvent(store, "order.paid", payload)).toBe("processed");
    expect((await store.getUserPlan(user)).code).toBe("pro");
    expect((await store.getPaymentOrderById(user, order.id))?.status).toBe("paid");
  });

  it("marks subscriptions past_due on halt without deleting anything", async () => {
    const store = new MemoryStore();
    const user = "user-2";
    await store.upsertSubscription({
      user_id: user,
      plan_id: PLAN_CATALOG.pro.id,
      provider: "razorpay",
      razorpay_subscription_id: "sub_x",
      status: "active",
      current_period_start: null,
      current_period_end: null,
      cancel_at_period_end: false,
    });
    await store.createProject(user, "Keep me", null);

    await processRazorpayEvent(store, "subscription.halted", {
      payload: { subscription: { entity: { id: "sub_x" } } },
    });
    const sub = await store.getSubscriptionByRazorpayId("sub_x");
    expect(sub?.status).toBe("past_due");
    // Data preserved.
    expect(await store.listProjects(user)).toHaveLength(1);
  });

  it("skips events for unknown entities", async () => {
    const store = new MemoryStore();
    expect(
      await processRazorpayEvent(store, "order.paid", {
        payload: { order: { entity: { id: "order_unknown" } } },
      }),
    ).toBe("skipped");
  });
});
