/**
 * Central runtime configuration detection.
 *
 * Joink is designed to degrade gracefully: the core scraping flow works even
 * when Supabase, AI, or Razorpay are not configured. Each `*Configured` flag
 * below gates one optional integration and the UI surfaces the mode clearly.
 */

export const env = {
  appBaseUrl: process.env.APP_BASE_URL ?? "http://localhost:3000",

  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",

  aiApiKey: process.env.AI_API_KEY ?? "",
  aiBaseUrl: process.env.AI_BASE_URL ?? "https://api.openai.com/v1",
  aiModel: process.env.AI_MODEL ?? "gpt-4o-mini",

  razorpayKeyId: process.env.RAZORPAY_KEY_ID ?? "",
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET ?? "",
  razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET ?? "",
  razorpayProPlanId: process.env.RAZORPAY_PRO_PLAN_ID ?? "",

  demoSessionSecret:
    process.env.DEMO_SESSION_SECRET ?? "joink-dev-only-insecure-secret",
};

/** Supabase auth + Postgres are available. Otherwise: in-memory demo mode. */
export function supabaseConfigured(): boolean {
  return Boolean(env.supabaseUrl && env.supabaseAnonKey);
}

/** An OpenAI-compatible chat endpoint is available for grounded answers. */
export function aiConfigured(): boolean {
  return Boolean(env.aiApiKey);
}

/** Real Razorpay Test/Live mode credentials are present. */
export function razorpayConfigured(): boolean {
  return Boolean(env.razorpayKeyId && env.razorpayKeySecret);
}

/** Razorpay Subscriptions can be used (otherwise one-time Orders fallback). */
export function razorpaySubscriptionsConfigured(): boolean {
  return razorpayConfigured() && Boolean(env.razorpayProPlanId);
}

/**
 * Mock billing is an explicitly labelled stand-in used only when Razorpay is
 * not configured. It must never activate silently in production.
 */
export function mockBillingEnabled(): boolean {
  if (razorpayConfigured()) return false;
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_MOCK_BILLING !== "true") {
    return false;
  }
  return process.env.ALLOW_MOCK_BILLING !== "false";
}

export function browserFallbackEnabled(): boolean {
  return process.env.SCRAPER_BROWSER_FALLBACK === "true";
}

export type RuntimeMode = {
  demoMode: boolean;
  aiConfigured: boolean;
  razorpayConfigured: boolean;
  razorpaySubscriptions: boolean;
  mockBilling: boolean;
};

export function runtimeMode(): RuntimeMode {
  return {
    demoMode: !supabaseConfigured(),
    aiConfigured: aiConfigured(),
    razorpayConfigured: razorpayConfigured(),
    razorpaySubscriptions: razorpaySubscriptionsConfigured(),
    mockBilling: mockBillingEnabled(),
  };
}
