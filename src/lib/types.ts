/** Shared domain types. These mirror the SQL schema in supabase/migrations. */

export type RunStatus =
  | "queued"
  | "running"
  | "completed"
  | "partial"
  | "failed";

export type PageExtractionStatus =
  | "queued"
  | "processing"
  | "completed"
  | "partial"
  | "failed";

export type ExtractionMethod = "http" | "browser" | "demo";

export type Confidence = "high" | "medium" | "low";

export interface ExtractionOptions {
  metadata: boolean;
  headings: boolean;
  mainText: boolean;
  links: boolean;
}

export interface Profile {
  id: string;
  display_name: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScrapeRun {
  id: string;
  project_id: string;
  user_id: string;
  status: RunStatus;
  requested_url_count: number;
  completed_url_count: number;
  failed_url_count: number;
  extraction_options: ExtractionOptions;
  created_at: string;
  completed_at: string | null;
}

export interface ScrapedPage {
  id: string;
  scrape_run_id: string;
  project_id: string;
  user_id: string;
  requested_url: string;
  final_url: string | null;
  page_title: string | null;
  meta_description: string | null;
  main_text: string | null;
  http_status: number | null;
  content_type: string | null;
  extraction_method: ExtractionMethod;
  extraction_status: PageExtractionStatus;
  confidence: Confidence;
  error_message: string | null;
  scraped_at: string | null;
  created_at: string;
}

export interface Heading {
  id: string;
  scraped_page_id: string;
  level: 1 | 2 | 3;
  text: string;
  position_index: number;
  section_hint: string | null;
}

export interface ExtractedLink {
  id: string;
  scraped_page_id: string;
  anchor_text: string;
  url: string;
  is_internal: boolean;
  position_index: number;
}

export type MessageRole = "user" | "assistant" | "system";
export type InputMode = "text" | "voice";

export interface Conversation {
  id: string;
  user_id: string;
  project_id: string;
  scrape_run_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface Citation {
  scraped_page_id: string;
  page_title: string;
  source_url: string;
  excerpt: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  citations: Citation[];
  input_mode: InputMode;
  created_at: string;
}

export type PlanCode = "free" | "pro" | "team";

export interface Plan {
  id: string;
  code: PlanCode;
  name: string;
  amount_minor: number;
  currency: string;
  billing_interval: "month";
  razorpay_plan_id: string | null;
  project_limit: number;
  monthly_url_limit: number;
  monthly_chat_limit: number;
  monthly_voice_limit: number;
  features: { csv_export: boolean; priority: boolean; [k: string]: unknown };
  is_active: boolean;
}

export type SubscriptionStatus =
  | "created"
  | "active"
  | "past_due"
  | "cancelled"
  | "expired";

export interface Subscription {
  id: string;
  user_id: string;
  plan_id: string;
  provider: "razorpay" | "mock";
  razorpay_subscription_id: string | null;
  status: SubscriptionStatus;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
}

export type PaymentOrderStatus = "created" | "paid" | "failed" | "expired";

export interface PaymentOrder {
  id: string;
  user_id: string;
  plan_id: string;
  razorpay_order_id: string | null;
  amount_minor: number;
  currency: string;
  status: PaymentOrderStatus;
  receipt: string;
  created_at: string;
  updated_at: string;
}

export type PaymentStatus = "created" | "authorized" | "captured" | "failed" | "refunded";

export interface Payment {
  id: string;
  user_id: string;
  subscription_id: string | null;
  payment_order_id: string | null;
  razorpay_payment_id: string;
  razorpay_order_id: string | null;
  amount_minor: number;
  currency: string;
  status: PaymentStatus;
  signature_verified: boolean;
  captured_at: string | null;
  failure_code: string | null;
  failure_description: string | null;
  created_at: string;
  updated_at: string;
}

export interface WebhookEvent {
  id: string;
  provider: "razorpay";
  provider_event_id: string;
  event_type: string;
  payload: unknown;
  processing_status: "received" | "processed" | "skipped" | "error";
  received_at: string;
  processed_at: string | null;
  error_message: string | null;
}

export interface UsageCounters {
  id: string;
  user_id: string;
  period_start: string;
  period_end: string;
  projects_created: number;
  urls_processed: number;
  chat_questions: number;
  voice_questions: number;
  updated_at: string;
}

export interface Feedback {
  id: string;
  user_id: string | null;
  email: string | null;
  message: string;
  page: string | null;
  created_at: string;
}

/** A registered passkey (WebAuthn credential) for biometric / device sign-in. */
export interface WebAuthnCredential {
  id: string;
  user_id: string;
  credential_id: string; // base64url
  public_key: string; // base64url of the COSE public key bytes
  counter: number;
  transports: string[] | null;
  device_label: string | null;
  created_at: string;
  last_used_at: string | null;
}

/** Consistent API envelope returned by every server operation. */
export type ApiResult<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };
