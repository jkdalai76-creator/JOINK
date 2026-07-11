import type {
  Conversation,
  ExtractedLink,
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

export interface UsageDeltas {
  projects_created?: number;
  urls_processed?: number;
  chat_questions?: number;
  voice_questions?: number;
}

export interface NewScrapedPage
  extends Omit<ScrapedPage, "id" | "created_at"> {}

export interface NewHeading extends Omit<Heading, "id"> {}
export interface NewLink extends Omit<ExtractedLink, "id"> {}

/**
 * All persistence goes through this interface so the app runs identically on
 * Supabase Postgres (production) and the in-memory demo store (no env needed).
 * Every method that reads or mutates user data takes the acting user's id and
 * must scope to it — the Supabase adapter additionally relies on RLS.
 */
export interface DataStore {
  // ── projects ──
  listProjects(userId: string): Promise<Project[]>;
  getProject(userId: string, projectId: string): Promise<Project | null>;
  createProject(userId: string, name: string, description: string | null): Promise<Project>;
  updateProject(
    userId: string,
    projectId: string,
    patch: { name?: string; description?: string | null },
  ): Promise<Project | null>;
  deleteProject(userId: string, projectId: string): Promise<boolean>;
  countProjects(userId: string): Promise<number>;

  // ── scrape runs ──
  createRun(run: Omit<ScrapeRun, "id" | "created_at" | "completed_at">): Promise<ScrapeRun>;
  getRun(userId: string, runId: string): Promise<ScrapeRun | null>;
  updateRun(runId: string, patch: Partial<ScrapeRun>): Promise<void>;
  listRunsByProject(userId: string, projectId: string): Promise<ScrapeRun[]>;
  listRecentRuns(userId: string, limit: number): Promise<ScrapeRun[]>;
  deleteRun(userId: string, runId: string): Promise<boolean>;

  // ── scraped pages / headings / links ──
  createPage(page: NewScrapedPage): Promise<ScrapedPage>;
  updatePage(pageId: string, patch: Partial<ScrapedPage>): Promise<void>;
  listPagesByRun(userId: string, runId: string): Promise<ScrapedPage[]>;
  getPage(userId: string, pageId: string): Promise<ScrapedPage | null>;
  insertHeadings(headings: NewHeading[]): Promise<void>;
  insertLinks(links: NewLink[]): Promise<void>;
  listHeadingsByRun(userId: string, runId: string): Promise<Heading[]>;
  listLinksByRun(userId: string, runId: string): Promise<ExtractedLink[]>;

  // ── conversations / messages ──
  createConversation(
    conv: Omit<Conversation, "id" | "created_at" | "updated_at">,
  ): Promise<Conversation>;
  getConversation(userId: string, conversationId: string): Promise<Conversation | null>;
  listConversationsByRun(userId: string, runId: string): Promise<Conversation[]>;
  createMessage(msg: Omit<Message, "id" | "created_at">): Promise<Message>;
  listMessages(userId: string, conversationId: string): Promise<Message[]>;

  // ── billing (server-trusted writes only) ──
  getActiveSubscription(userId: string): Promise<Subscription | null>;
  upsertSubscription(
    sub: Omit<Subscription, "id" | "created_at" | "updated_at"> & { id?: string },
  ): Promise<Subscription>;
  getSubscriptionByRazorpayId(razorpaySubscriptionId: string): Promise<Subscription | null>;
  createPaymentOrder(
    order: Omit<PaymentOrder, "id" | "created_at" | "updated_at">,
  ): Promise<PaymentOrder>;
  getPaymentOrderByRazorpayId(razorpayOrderId: string): Promise<PaymentOrder | null>;
  getPaymentOrderById(userId: string, orderId: string): Promise<PaymentOrder | null>;
  updatePaymentOrder(orderId: string, patch: Partial<PaymentOrder>): Promise<void>;
  upsertPaymentByRazorpayId(
    payment: Omit<Payment, "id" | "created_at" | "updated_at">,
  ): Promise<Payment>;
  listPayments(userId: string): Promise<Payment[]>;

  // ── webhook events (idempotency) ──
  getWebhookEvent(providerEventId: string): Promise<WebhookEvent | null>;
  insertWebhookEvent(
    ev: Omit<WebhookEvent, "id" | "received_at" | "processed_at">,
  ): Promise<WebhookEvent | null>; // null when a duplicate already exists
  markWebhookEvent(
    id: string,
    status: WebhookEvent["processing_status"],
    errorMessage?: string,
  ): Promise<void>;

  // ── usage counters ──
  getCurrentUsage(userId: string): Promise<UsageCounters>;
  /**
   * Atomically increments usage counters. When `idempotencyKey` is supplied,
   * a retried call with the same key must not double-count.
   */
  incrementUsage(
    userId: string,
    deltas: UsageDeltas,
    idempotencyKey?: string,
  ): Promise<UsageCounters>;

  // ── plan resolution ──
  getUserPlan(userId: string): Promise<Plan>;
}
