import type { SupabaseClient } from "@supabase/supabase-js";
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
import { PLAN_CATALOG } from "@/lib/plans";
import type { DataStore, NewHeading, NewLink, NewScrapedPage, UsageDeltas } from "./types";

/**
 * Supabase-backed store. User-facing reads/writes go through the request's
 * user-scoped client so Row Level Security applies. Billing, webhook and
 * usage writes go through the service-role client (trusted server code only).
 */
export class SupabaseStore implements DataStore {
  constructor(
    private user: SupabaseClient, // RLS-scoped to the signed-in user
    private service: SupabaseClient, // service role, server-only
  ) {}

  private throwOn(error: { message: string } | null): void {
    if (error) throw new Error(`Database error: ${error.message}`);
  }

  // ── projects ──
  async listProjects(userId: string): Promise<Project[]> {
    const { data, error } = await this.user
      .from("projects")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });
    this.throwOn(error);
    return (data ?? []) as Project[];
  }

  async getProject(userId: string, projectId: string): Promise<Project | null> {
    const { data } = await this.user
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .eq("user_id", userId)
      .maybeSingle();
    return (data as Project) ?? null;
  }

  async createProject(userId: string, name: string, description: string | null): Promise<Project> {
    const { data, error } = await this.user
      .from("projects")
      .insert({ user_id: userId, name, description })
      .select()
      .single();
    this.throwOn(error);
    return data as Project;
  }

  async updateProject(
    userId: string,
    projectId: string,
    patch: { name?: string; description?: string | null },
  ): Promise<Project | null> {
    const { data, error } = await this.user
      .from("projects")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", projectId)
      .eq("user_id", userId)
      .select()
      .maybeSingle();
    this.throwOn(error);
    return (data as Project) ?? null;
  }

  async deleteProject(userId: string, projectId: string): Promise<boolean> {
    const { error, count } = await this.user
      .from("projects")
      .delete({ count: "exact" })
      .eq("id", projectId)
      .eq("user_id", userId);
    this.throwOn(error);
    return (count ?? 0) > 0;
  }

  async countProjects(userId: string): Promise<number> {
    const { count, error } = await this.user
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);
    this.throwOn(error);
    return count ?? 0;
  }

  // ── runs ──
  async createRun(run: Omit<ScrapeRun, "id" | "created_at" | "completed_at">): Promise<ScrapeRun> {
    const { data, error } = await this.user.from("scrape_runs").insert(run).select().single();
    this.throwOn(error);
    return data as ScrapeRun;
  }

  async getRun(userId: string, runId: string): Promise<ScrapeRun | null> {
    const { data } = await this.user
      .from("scrape_runs")
      .select("*")
      .eq("id", runId)
      .eq("user_id", userId)
      .maybeSingle();
    return (data as ScrapeRun) ?? null;
  }

  async updateRun(runId: string, patch: Partial<ScrapeRun>): Promise<void> {
    // Service client: run updates happen from background extraction work.
    const { error } = await this.service.from("scrape_runs").update(patch).eq("id", runId);
    this.throwOn(error);
  }

  async listRunsByProject(userId: string, projectId: string): Promise<ScrapeRun[]> {
    const { data, error } = await this.user
      .from("scrape_runs")
      .select("*")
      .eq("user_id", userId)
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    this.throwOn(error);
    return (data ?? []) as ScrapeRun[];
  }

  async listRecentRuns(userId: string, limit: number): Promise<ScrapeRun[]> {
    const { data, error } = await this.user
      .from("scrape_runs")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);
    this.throwOn(error);
    return (data ?? []) as ScrapeRun[];
  }

  async deleteRun(userId: string, runId: string): Promise<boolean> {
    const { error, count } = await this.user
      .from("scrape_runs")
      .delete({ count: "exact" })
      .eq("id", runId)
      .eq("user_id", userId);
    this.throwOn(error);
    return (count ?? 0) > 0;
  }

  // ── pages / headings / links (written by background work → service) ──
  async createPage(page: NewScrapedPage): Promise<ScrapedPage> {
    const { data, error } = await this.service.from("scraped_pages").insert(page).select().single();
    this.throwOn(error);
    return data as ScrapedPage;
  }

  async updatePage(pageId: string, patch: Partial<ScrapedPage>): Promise<void> {
    const { error } = await this.service.from("scraped_pages").update(patch).eq("id", pageId);
    this.throwOn(error);
  }

  async listPagesByRun(userId: string, runId: string): Promise<ScrapedPage[]> {
    const { data, error } = await this.user
      .from("scraped_pages")
      .select("*")
      .eq("scrape_run_id", runId)
      .eq("user_id", userId)
      .order("created_at", { ascending: true });
    this.throwOn(error);
    return (data ?? []) as ScrapedPage[];
  }

  async getPage(userId: string, pageId: string): Promise<ScrapedPage | null> {
    const { data } = await this.user
      .from("scraped_pages")
      .select("*")
      .eq("id", pageId)
      .eq("user_id", userId)
      .maybeSingle();
    return (data as ScrapedPage) ?? null;
  }

  async insertHeadings(headings: NewHeading[]): Promise<void> {
    if (!headings.length) return;
    const { error } = await this.service.from("headings").insert(headings);
    this.throwOn(error);
  }

  async insertLinks(links: NewLink[]): Promise<void> {
    if (!links.length) return;
    const { error } = await this.service.from("extracted_links").insert(links);
    this.throwOn(error);
  }

  async listHeadingsByRun(userId: string, runId: string): Promise<Heading[]> {
    const pages = await this.listPagesByRun(userId, runId);
    if (!pages.length) return [];
    const { data, error } = await this.user
      .from("headings")
      .select("*")
      .in(
        "scraped_page_id",
        pages.map((p) => p.id),
      )
      .order("position_index", { ascending: true });
    this.throwOn(error);
    return (data ?? []) as Heading[];
  }

  async listLinksByRun(userId: string, runId: string): Promise<ExtractedLink[]> {
    const pages = await this.listPagesByRun(userId, runId);
    if (!pages.length) return [];
    const { data, error } = await this.user
      .from("extracted_links")
      .select("*")
      .in(
        "scraped_page_id",
        pages.map((p) => p.id),
      )
      .order("position_index", { ascending: true });
    this.throwOn(error);
    return (data ?? []) as ExtractedLink[];
  }

  // ── conversations / messages ──
  async createConversation(
    conv: Omit<Conversation, "id" | "created_at" | "updated_at">,
  ): Promise<Conversation> {
    const { data, error } = await this.user.from("conversations").insert(conv).select().single();
    this.throwOn(error);
    return data as Conversation;
  }

  async getConversation(userId: string, conversationId: string): Promise<Conversation | null> {
    const { data } = await this.user
      .from("conversations")
      .select("*")
      .eq("id", conversationId)
      .eq("user_id", userId)
      .maybeSingle();
    return (data as Conversation) ?? null;
  }

  async listConversationsByRun(userId: string, runId: string): Promise<Conversation[]> {
    const { data, error } = await this.user
      .from("conversations")
      .select("*")
      .eq("user_id", userId)
      .eq("scrape_run_id", runId)
      .order("updated_at", { ascending: false });
    this.throwOn(error);
    return (data ?? []) as Conversation[];
  }

  async createMessage(msg: Omit<Message, "id" | "created_at">): Promise<Message> {
    const { data, error } = await this.user.from("messages").insert(msg).select().single();
    this.throwOn(error);
    return data as Message;
  }

  async listMessages(userId: string, conversationId: string): Promise<Message[]> {
    const conv = await this.getConversation(userId, conversationId);
    if (!conv) return [];
    const { data, error } = await this.user
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    this.throwOn(error);
    return (data ?? []) as Message[];
  }

  // ── billing (service role; trusted server code only) ──
  private mapPlanRow(row: Record<string, unknown> | null): Plan | null {
    if (!row) return null;
    return row as unknown as Plan;
  }

  async getActiveSubscription(userId: string): Promise<Subscription | null> {
    const { data } = await this.service
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .in("status", ["active", "past_due"])
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return (data as Subscription) ?? null;
  }

  async upsertSubscription(
    sub: Omit<Subscription, "id" | "created_at" | "updated_at"> & { id?: string },
  ): Promise<Subscription> {
    if (sub.razorpay_subscription_id) {
      const existing = await this.getSubscriptionByRazorpayId(sub.razorpay_subscription_id);
      if (existing) {
        const { data, error } = await this.service
          .from("subscriptions")
          .update({ ...sub, id: undefined, updated_at: new Date().toISOString() })
          .eq("id", existing.id)
          .select()
          .single();
        this.throwOn(error);
        return data as Subscription;
      }
    }
    const { data, error } = await this.service.from("subscriptions").insert(sub).select().single();
    this.throwOn(error);
    return data as Subscription;
  }

  async getSubscriptionByRazorpayId(razorpaySubscriptionId: string): Promise<Subscription | null> {
    const { data } = await this.service
      .from("subscriptions")
      .select("*")
      .eq("razorpay_subscription_id", razorpaySubscriptionId)
      .maybeSingle();
    return (data as Subscription) ?? null;
  }

  async createPaymentOrder(
    order: Omit<PaymentOrder, "id" | "created_at" | "updated_at">,
  ): Promise<PaymentOrder> {
    const { data, error } = await this.service
      .from("payment_orders")
      .insert(order)
      .select()
      .single();
    this.throwOn(error);
    return data as PaymentOrder;
  }

  async getPaymentOrderByRazorpayId(razorpayOrderId: string): Promise<PaymentOrder | null> {
    const { data } = await this.service
      .from("payment_orders")
      .select("*")
      .eq("razorpay_order_id", razorpayOrderId)
      .maybeSingle();
    return (data as PaymentOrder) ?? null;
  }

  async getPaymentOrderById(userId: string, orderId: string): Promise<PaymentOrder | null> {
    const { data } = await this.service
      .from("payment_orders")
      .select("*")
      .eq("id", orderId)
      .eq("user_id", userId)
      .maybeSingle();
    return (data as PaymentOrder) ?? null;
  }

  async updatePaymentOrder(orderId: string, patch: Partial<PaymentOrder>): Promise<void> {
    const { error } = await this.service
      .from("payment_orders")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", orderId);
    this.throwOn(error);
  }

  async upsertPaymentByRazorpayId(
    payment: Omit<Payment, "id" | "created_at" | "updated_at">,
  ): Promise<Payment> {
    const { data: existing } = await this.service
      .from("payments")
      .select("*")
      .eq("razorpay_payment_id", payment.razorpay_payment_id)
      .maybeSingle();
    if (existing) {
      const patch = { ...payment } as Partial<Payment>;
      const cur = existing as Payment;
      if (cur.status === "captured" && patch.status !== "refunded") {
        patch.status = cur.status;
        patch.captured_at = cur.captured_at;
      }
      const { data, error } = await this.service
        .from("payments")
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq("id", cur.id)
        .select()
        .single();
      this.throwOn(error);
      return data as Payment;
    }
    const { data, error } = await this.service.from("payments").insert(payment).select().single();
    this.throwOn(error);
    return data as Payment;
  }

  async listPayments(userId: string): Promise<Payment[]> {
    const { data, error } = await this.user
      .from("payments")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    this.throwOn(error);
    return (data ?? []) as Payment[];
  }

  // ── webhook events ──
  async getWebhookEvent(providerEventId: string): Promise<WebhookEvent | null> {
    const { data } = await this.service
      .from("webhook_events")
      .select("*")
      .eq("provider_event_id", providerEventId)
      .maybeSingle();
    return (data as WebhookEvent) ?? null;
  }

  async insertWebhookEvent(
    ev: Omit<WebhookEvent, "id" | "received_at" | "processed_at">,
  ): Promise<WebhookEvent | null> {
    // Unique constraint on (provider, provider_event_id) makes this race-safe.
    const { data, error } = await this.service.from("webhook_events").insert(ev).select().single();
    if (error) {
      if (error.code === "23505") return null; // duplicate event
      this.throwOn(error);
    }
    return data as WebhookEvent;
  }

  async markWebhookEvent(
    id: string,
    status: WebhookEvent["processing_status"],
    errorMessage?: string,
  ): Promise<void> {
    const { error } = await this.service
      .from("webhook_events")
      .update({
        processing_status: status,
        processed_at: new Date().toISOString(),
        error_message: errorMessage ?? null,
      })
      .eq("id", id);
    this.throwOn(error);
  }

  // ── usage (atomic via SQL function) ──
  async getCurrentUsage(userId: string): Promise<UsageCounters> {
    const { data, error } = await this.service.rpc("increment_usage", {
      p_user_id: userId,
      p_projects: 0,
      p_urls: 0,
      p_chat: 0,
      p_voice: 0,
      p_idempotency_key: null,
    });
    this.throwOn(error);
    return data as UsageCounters;
  }

  async incrementUsage(
    userId: string,
    deltas: UsageDeltas,
    idempotencyKey?: string,
  ): Promise<UsageCounters> {
    const { data, error } = await this.service.rpc("increment_usage", {
      p_user_id: userId,
      p_projects: deltas.projects_created ?? 0,
      p_urls: deltas.urls_processed ?? 0,
      p_chat: deltas.chat_questions ?? 0,
      p_voice: deltas.voice_questions ?? 0,
      p_idempotency_key: idempotencyKey ?? null,
    });
    this.throwOn(error);
    return data as UsageCounters;
  }

  // ── plan ──
  async getUserPlan(userId: string): Promise<Plan> {
    const sub = await this.getActiveSubscription(userId);
    if (sub) {
      const { data } = await this.service
        .from("plans")
        .select("*")
        .eq("id", sub.plan_id)
        .maybeSingle();
      const plan = this.mapPlanRow(data);
      if (plan) return plan;
    }
    const { data } = await this.service.from("plans").select("*").eq("code", "free").maybeSingle();
    return this.mapPlanRow(data) ?? PLAN_CATALOG.free;
  }
}
