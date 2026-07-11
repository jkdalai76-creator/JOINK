import { randomUUID } from "node:crypto";
import type {
  Conversation,
  ExtractedLink,
  Feedback,
  Heading,
  Message,
  Payment,
  PaymentOrder,
  Plan,
  Project,
  ScrapeRun,
  ScrapedPage,
  Subscription,
  UsageCounters,
  WebhookEvent,
} from "@/lib/types";
import { PLAN_CATALOG } from "@/lib/plans";
import type { DataStore, NewHeading, NewLink, NewScrapedPage, UsageDeltas } from "./types";

export interface DemoUser {
  id: string;
  email: string;
  display_name: string;
  password_hash: string; // scrypt hash, format "salt:hex"
  created_at: string;
}

interface MemoryDb {
  users: Map<string, DemoUser>;
  usersByEmail: Map<string, string>;
  projects: Map<string, Project>;
  runs: Map<string, ScrapeRun>;
  pages: Map<string, ScrapedPage>;
  headings: Map<string, Heading>;
  links: Map<string, ExtractedLink>;
  conversations: Map<string, Conversation>;
  messages: Map<string, Message>;
  subscriptions: Map<string, Subscription>;
  paymentOrders: Map<string, PaymentOrder>;
  payments: Map<string, Payment>;
  webhookEvents: Map<string, WebhookEvent>;
  usage: Map<string, UsageCounters>; // key: userId:periodStart
  usageIdempotency: Set<string>;
  visitors: Set<string>;
  feedback: Map<string, Feedback>;
}

function newDb(): MemoryDb {
  return {
    users: new Map(),
    usersByEmail: new Map(),
    projects: new Map(),
    runs: new Map(),
    pages: new Map(),
    headings: new Map(),
    links: new Map(),
    conversations: new Map(),
    messages: new Map(),
    subscriptions: new Map(),
    paymentOrders: new Map(),
    payments: new Map(),
    webhookEvents: new Map(),
    usage: new Map(),
    usageIdempotency: new Set(),
    visitors: new Set(),
    feedback: new Map(),
  };
}

// Survive Next.js dev-server module reloads.
const g = globalThis as unknown as { __joinkMemoryDb?: MemoryDb };
export function memoryDb(): MemoryDb {
  if (!g.__joinkMemoryDb) g.__joinkMemoryDb = newDb();
  return g.__joinkMemoryDb;
}

export function resetMemoryDb(): void {
  g.__joinkMemoryDb = newDb();
}

function now(): string {
  return new Date().toISOString();
}

function currentPeriod(): { start: string; end: string } {
  const d = new Date();
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
  return { start: start.toISOString(), end: end.toISOString() };
}

export class MemoryStore implements DataStore {
  private db = memoryDb();

  // ── projects ──
  async listProjects(userId: string): Promise<Project[]> {
    return [...this.db.projects.values()]
      .filter((p) => p.user_id === userId)
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  }

  async getProject(userId: string, projectId: string): Promise<Project | null> {
    const p = this.db.projects.get(projectId);
    return p && p.user_id === userId ? p : null;
  }

  async createProject(userId: string, name: string, description: string | null): Promise<Project> {
    const project: Project = {
      id: randomUUID(),
      user_id: userId,
      name,
      description,
      created_at: now(),
      updated_at: now(),
    };
    this.db.projects.set(project.id, project);
    return project;
  }

  async updateProject(
    userId: string,
    projectId: string,
    patch: { name?: string; description?: string | null },
  ): Promise<Project | null> {
    const p = await this.getProject(userId, projectId);
    if (!p) return null;
    if (patch.name !== undefined) p.name = patch.name;
    if (patch.description !== undefined) p.description = patch.description;
    p.updated_at = now();
    return p;
  }

  async deleteProject(userId: string, projectId: string): Promise<boolean> {
    const p = await this.getProject(userId, projectId);
    if (!p) return false;
    this.db.projects.delete(projectId);
    // cascade
    for (const run of [...this.db.runs.values()]) {
      if (run.project_id === projectId) await this.deleteRunCascade(run.id);
    }
    for (const [id, c] of this.db.conversations) {
      if (c.project_id === projectId) {
        this.db.conversations.delete(id);
        for (const [mid, m] of this.db.messages) {
          if (m.conversation_id === id) this.db.messages.delete(mid);
        }
      }
    }
    return true;
  }

  async countProjects(userId: string): Promise<number> {
    return (await this.listProjects(userId)).length;
  }

  // ── runs ──
  async createRun(run: Omit<ScrapeRun, "id" | "created_at" | "completed_at">): Promise<ScrapeRun> {
    const full: ScrapeRun = { ...run, id: randomUUID(), created_at: now(), completed_at: null };
    this.db.runs.set(full.id, full);
    return full;
  }

  async getRun(userId: string, runId: string): Promise<ScrapeRun | null> {
    const r = this.db.runs.get(runId);
    return r && r.user_id === userId ? r : null;
  }

  async updateRun(runId: string, patch: Partial<ScrapeRun>): Promise<void> {
    const r = this.db.runs.get(runId);
    if (r) Object.assign(r, patch);
  }

  async listRunsByProject(userId: string, projectId: string): Promise<ScrapeRun[]> {
    return [...this.db.runs.values()]
      .filter((r) => r.user_id === userId && r.project_id === projectId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  async listRecentRuns(userId: string, limit: number): Promise<ScrapeRun[]> {
    return [...this.db.runs.values()]
      .filter((r) => r.user_id === userId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, limit);
  }

  private async deleteRunCascade(runId: string): Promise<void> {
    this.db.runs.delete(runId);
    for (const [pid, page] of this.db.pages) {
      if (page.scrape_run_id === runId) {
        this.db.pages.delete(pid);
        for (const [hid, h] of this.db.headings) {
          if (h.scraped_page_id === pid) this.db.headings.delete(hid);
        }
        for (const [lid, l] of this.db.links) {
          if (l.scraped_page_id === pid) this.db.links.delete(lid);
        }
      }
    }
    for (const [cid, c] of this.db.conversations) {
      if (c.scrape_run_id === runId) {
        this.db.conversations.delete(cid);
        for (const [mid, m] of this.db.messages) {
          if (m.conversation_id === cid) this.db.messages.delete(mid);
        }
      }
    }
  }

  async deleteRun(userId: string, runId: string): Promise<boolean> {
    const r = await this.getRun(userId, runId);
    if (!r) return false;
    await this.deleteRunCascade(runId);
    return true;
  }

  // ── pages / headings / links ──
  async createPage(page: NewScrapedPage): Promise<ScrapedPage> {
    const full: ScrapedPage = { ...page, id: randomUUID(), created_at: now() };
    this.db.pages.set(full.id, full);
    return full;
  }

  async updatePage(pageId: string, patch: Partial<ScrapedPage>): Promise<void> {
    const p = this.db.pages.get(pageId);
    if (p) Object.assign(p, patch);
  }

  async listPagesByRun(userId: string, runId: string): Promise<ScrapedPage[]> {
    return [...this.db.pages.values()]
      .filter((p) => p.scrape_run_id === runId && p.user_id === userId)
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
  }

  async getPage(userId: string, pageId: string): Promise<ScrapedPage | null> {
    const p = this.db.pages.get(pageId);
    return p && p.user_id === userId ? p : null;
  }

  async insertHeadings(headings: NewHeading[]): Promise<void> {
    for (const h of headings) {
      const full: Heading = { ...h, id: randomUUID() };
      this.db.headings.set(full.id, full);
    }
  }

  async insertLinks(links: NewLink[]): Promise<void> {
    for (const l of links) {
      const full: ExtractedLink = { ...l, id: randomUUID() };
      this.db.links.set(full.id, full);
    }
  }

  async listHeadingsByRun(userId: string, runId: string): Promise<Heading[]> {
    const pageIds = new Set((await this.listPagesByRun(userId, runId)).map((p) => p.id));
    return [...this.db.headings.values()]
      .filter((h) => pageIds.has(h.scraped_page_id))
      .sort((a, b) => a.position_index - b.position_index);
  }

  async listLinksByRun(userId: string, runId: string): Promise<ExtractedLink[]> {
    const pageIds = new Set((await this.listPagesByRun(userId, runId)).map((p) => p.id));
    return [...this.db.links.values()]
      .filter((l) => pageIds.has(l.scraped_page_id))
      .sort((a, b) => a.position_index - b.position_index);
  }

  // ── conversations / messages ──
  async createConversation(
    conv: Omit<Conversation, "id" | "created_at" | "updated_at">,
  ): Promise<Conversation> {
    const full: Conversation = { ...conv, id: randomUUID(), created_at: now(), updated_at: now() };
    this.db.conversations.set(full.id, full);
    return full;
  }

  async getConversation(userId: string, conversationId: string): Promise<Conversation | null> {
    const c = this.db.conversations.get(conversationId);
    return c && c.user_id === userId ? c : null;
  }

  async listConversationsByRun(userId: string, runId: string): Promise<Conversation[]> {
    return [...this.db.conversations.values()]
      .filter((c) => c.user_id === userId && c.scrape_run_id === runId)
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  }

  async createMessage(msg: Omit<Message, "id" | "created_at">): Promise<Message> {
    const full: Message = { ...msg, id: randomUUID(), created_at: now() };
    this.db.messages.set(full.id, full);
    const conv = this.db.conversations.get(msg.conversation_id);
    if (conv) conv.updated_at = now();
    return full;
  }

  async listMessages(userId: string, conversationId: string): Promise<Message[]> {
    const conv = await this.getConversation(userId, conversationId);
    if (!conv) return [];
    return [...this.db.messages.values()]
      .filter((m) => m.conversation_id === conversationId)
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
  }

  // ── billing ──
  async getActiveSubscription(userId: string): Promise<Subscription | null> {
    const subs = [...this.db.subscriptions.values()]
      .filter((s) => s.user_id === userId && (s.status === "active" || s.status === "past_due"))
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    return subs[0] ?? null;
  }

  async upsertSubscription(
    sub: Omit<Subscription, "id" | "created_at" | "updated_at"> & { id?: string },
  ): Promise<Subscription> {
    const existing = sub.id
      ? this.db.subscriptions.get(sub.id)
      : sub.razorpay_subscription_id
        ? [...this.db.subscriptions.values()].find(
            (s) => s.razorpay_subscription_id === sub.razorpay_subscription_id,
          )
        : undefined;
    if (existing) {
      Object.assign(existing, sub, { id: existing.id, updated_at: now() });
      return existing;
    }
    const full: Subscription = {
      ...sub,
      id: sub.id ?? randomUUID(),
      created_at: now(),
      updated_at: now(),
    };
    this.db.subscriptions.set(full.id, full);
    return full;
  }

  async getSubscriptionByRazorpayId(razorpaySubscriptionId: string): Promise<Subscription | null> {
    return (
      [...this.db.subscriptions.values()].find(
        (s) => s.razorpay_subscription_id === razorpaySubscriptionId,
      ) ?? null
    );
  }

  async createPaymentOrder(
    order: Omit<PaymentOrder, "id" | "created_at" | "updated_at">,
  ): Promise<PaymentOrder> {
    const full: PaymentOrder = { ...order, id: randomUUID(), created_at: now(), updated_at: now() };
    this.db.paymentOrders.set(full.id, full);
    return full;
  }

  async getPaymentOrderByRazorpayId(razorpayOrderId: string): Promise<PaymentOrder | null> {
    return (
      [...this.db.paymentOrders.values()].find((o) => o.razorpay_order_id === razorpayOrderId) ??
      null
    );
  }

  async getPaymentOrderById(userId: string, orderId: string): Promise<PaymentOrder | null> {
    const o = this.db.paymentOrders.get(orderId);
    return o && o.user_id === userId ? o : null;
  }

  async updatePaymentOrder(orderId: string, patch: Partial<PaymentOrder>): Promise<void> {
    const o = this.db.paymentOrders.get(orderId);
    if (o) Object.assign(o, patch, { updated_at: now() });
  }

  async upsertPaymentByRazorpayId(
    payment: Omit<Payment, "id" | "created_at" | "updated_at">,
  ): Promise<Payment> {
    const existing = [...this.db.payments.values()].find(
      (p) => p.razorpay_payment_id === payment.razorpay_payment_id,
    );
    if (existing) {
      // Never downgrade a captured payment on out-of-order events.
      const incoming = { ...payment };
      if (existing.status === "captured" && incoming.status !== "refunded") {
        incoming.status = existing.status;
        incoming.captured_at = existing.captured_at;
      }
      Object.assign(existing, incoming, { id: existing.id, updated_at: now() });
      return existing;
    }
    const full: Payment = { ...payment, id: randomUUID(), created_at: now(), updated_at: now() };
    this.db.payments.set(full.id, full);
    return full;
  }

  async listPayments(userId: string): Promise<Payment[]> {
    return [...this.db.payments.values()]
      .filter((p) => p.user_id === userId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  // ── webhook events ──
  async getWebhookEvent(providerEventId: string): Promise<WebhookEvent | null> {
    return (
      [...this.db.webhookEvents.values()].find((e) => e.provider_event_id === providerEventId) ??
      null
    );
  }

  async insertWebhookEvent(
    ev: Omit<WebhookEvent, "id" | "received_at" | "processed_at">,
  ): Promise<WebhookEvent | null> {
    if (await this.getWebhookEvent(ev.provider_event_id)) return null;
    const full: WebhookEvent = { ...ev, id: randomUUID(), received_at: now(), processed_at: null };
    this.db.webhookEvents.set(full.id, full);
    return full;
  }

  async markWebhookEvent(
    id: string,
    status: WebhookEvent["processing_status"],
    errorMessage?: string,
  ): Promise<void> {
    const e = this.db.webhookEvents.get(id);
    if (e) {
      e.processing_status = status;
      e.processed_at = now();
      e.error_message = errorMessage ?? null;
    }
  }

  // ── usage ──
  async getCurrentUsage(userId: string): Promise<UsageCounters> {
    const { start, end } = currentPeriod();
    const key = `${userId}:${start}`;
    let u = this.db.usage.get(key);
    if (!u) {
      u = {
        id: randomUUID(),
        user_id: userId,
        period_start: start,
        period_end: end,
        projects_created: 0,
        urls_processed: 0,
        chat_questions: 0,
        voice_questions: 0,
        updated_at: now(),
      };
      this.db.usage.set(key, u);
    }
    return u;
  }

  async incrementUsage(
    userId: string,
    deltas: UsageDeltas,
    idempotencyKey?: string,
  ): Promise<UsageCounters> {
    const u = await this.getCurrentUsage(userId);
    if (idempotencyKey) {
      const idemKey = `${userId}:${idempotencyKey}`;
      if (this.db.usageIdempotency.has(idemKey)) return u;
      this.db.usageIdempotency.add(idemKey);
    }
    u.projects_created += deltas.projects_created ?? 0;
    u.urls_processed += deltas.urls_processed ?? 0;
    u.chat_questions += deltas.chat_questions ?? 0;
    u.voice_questions += deltas.voice_questions ?? 0;
    u.updated_at = now();
    return u;
  }

  // ── plan ──
  async getUserPlan(userId: string): Promise<Plan> {
    const sub = await this.getActiveSubscription(userId);
    if (sub) {
      const plan = Object.values(PLAN_CATALOG).find((p) => p.id === sub.plan_id);
      if (plan) return plan;
    }
    return PLAN_CATALOG.free;
  }

  // ── site stats & feedback ──
  async recordVisitor(visitorKey: string): Promise<number> {
    this.db.visitors.add(visitorKey);
    return this.db.visitors.size;
  }

  async countVisitors(): Promise<number> {
    return this.db.visitors.size;
  }

  async createFeedback(entry: Omit<Feedback, "id" | "created_at">): Promise<Feedback> {
    const full: Feedback = { ...entry, id: randomUUID(), created_at: now() };
    this.db.feedback.set(full.id, full);
    return full;
  }

  // ── demo-mode users (auth lives here only when Supabase is absent) ──
  async createUser(user: Omit<DemoUser, "id" | "created_at">): Promise<DemoUser | null> {
    const emailKey = user.email.toLowerCase();
    if (this.db.usersByEmail.has(emailKey)) return null;
    const full: DemoUser = { ...user, id: randomUUID(), created_at: now() };
    this.db.users.set(full.id, full);
    this.db.usersByEmail.set(emailKey, full.id);
    return full;
  }

  async getUserByEmail(email: string): Promise<DemoUser | null> {
    const id = this.db.usersByEmail.get(email.toLowerCase());
    return id ? (this.db.users.get(id) ?? null) : null;
  }

  async getUserById(id: string): Promise<DemoUser | null> {
    return this.db.users.get(id) ?? null;
  }

  /** Developer-only: drop the user back to the Free plan (demo reset). */
  async resetUserToFree(userId: string): Promise<void> {
    for (const [id, s] of this.db.subscriptions) {
      if (s.user_id === userId) this.db.subscriptions.delete(id);
    }
  }
}
