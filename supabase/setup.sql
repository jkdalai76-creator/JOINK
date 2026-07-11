-- Joink · one-paste Supabase setup (SAFE TO RE-RUN)
-- Paste this ENTIRE file into the Supabase SQL editor and click Run.
-- Every statement is idempotent: running it again creates only what's
-- missing and will NOT error on objects that already exist. So if a previous
-- run half-finished, just run this again to complete the setup.

-- Joink initial schema, Row Level Security and helpers.
-- Apply with: supabase db push   (or paste into the Supabase SQL editor)

-- ─────────────────────────────────────────────────────────────────────
-- profiles (1:1 with auth.users)
-- ─────────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Auto-create a profile whenever a user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────────────────────────────
-- projects
-- ─────────────────────────────────────────────────────────────────────
create table if not exists public.projects (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 120),
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists projects_user_idx on public.projects (user_id, updated_at desc);

-- ─────────────────────────────────────────────────────────────────────
-- scrape_runs
-- ─────────────────────────────────────────────────────────────────────
create table if not exists public.scrape_runs (
  id                  uuid primary key default gen_random_uuid(),
  project_id          uuid not null references public.projects (id) on delete cascade,
  user_id             uuid not null references auth.users (id) on delete cascade,
  status              text not null default 'queued'
                      check (status in ('queued','running','completed','partial','failed')),
  requested_url_count int  not null default 0 check (requested_url_count between 0 and 10),
  completed_url_count int  not null default 0,
  failed_url_count    int  not null default 0,
  extraction_options  jsonb not null default '{"metadata":true,"headings":true,"mainText":true,"links":true}',
  created_at          timestamptz not null default now(),
  completed_at        timestamptz
);
create index if not exists scrape_runs_project_idx on public.scrape_runs (project_id, created_at desc);
create index if not exists scrape_runs_user_idx on public.scrape_runs (user_id, created_at desc);

-- ─────────────────────────────────────────────────────────────────────
-- scraped_pages
-- ─────────────────────────────────────────────────────────────────────
create table if not exists public.scraped_pages (
  id                uuid primary key default gen_random_uuid(),
  scrape_run_id     uuid not null references public.scrape_runs (id) on delete cascade,
  project_id        uuid not null references public.projects (id) on delete cascade,
  user_id           uuid not null references auth.users (id) on delete cascade,
  requested_url     text not null,
  final_url         text,
  page_title        text,
  meta_description  text,
  main_text         text,
  http_status       int,
  content_type      text,
  extraction_method text not null default 'http' check (extraction_method in ('http','browser','demo')),
  extraction_status text not null default 'queued'
                    check (extraction_status in ('queued','processing','completed','partial','failed')),
  confidence        text not null default 'medium' check (confidence in ('high','medium','low')),
  error_message     text,
  scraped_at        timestamptz,
  created_at        timestamptz not null default now()
);
create index if not exists scraped_pages_run_idx on public.scraped_pages (scrape_run_id);
create index if not exists scraped_pages_user_idx on public.scraped_pages (user_id);
-- Full-text search over extracted content for chat retrieval.
create index if not exists scraped_pages_fts_idx on public.scraped_pages
  using gin (to_tsvector('english', coalesce(page_title,'') || ' ' || coalesce(main_text,'')));

-- ─────────────────────────────────────────────────────────────────────
-- headings
-- ─────────────────────────────────────────────────────────────────────
create table if not exists public.headings (
  id              uuid primary key default gen_random_uuid(),
  scraped_page_id uuid not null references public.scraped_pages (id) on delete cascade,
  level           int  not null check (level between 1 and 3),
  text            text not null,
  position_index  int  not null default 0,
  section_hint    text
);
create index if not exists headings_page_idx on public.headings (scraped_page_id, position_index);

-- ─────────────────────────────────────────────────────────────────────
-- extracted_links
-- ─────────────────────────────────────────────────────────────────────
create table if not exists public.extracted_links (
  id              uuid primary key default gen_random_uuid(),
  scraped_page_id uuid not null references public.scraped_pages (id) on delete cascade,
  anchor_text     text not null default '',
  url             text not null,
  is_internal     boolean not null default false,
  position_index  int not null default 0
);
create index if not exists extracted_links_page_idx on public.extracted_links (scraped_page_id, position_index);

-- ─────────────────────────────────────────────────────────────────────
-- conversations + messages
-- ─────────────────────────────────────────────────────────────────────
create table if not exists public.conversations (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  project_id    uuid not null references public.projects (id) on delete cascade,
  scrape_run_id uuid not null references public.scrape_runs (id) on delete cascade,
  title         text not null default 'New conversation',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists conversations_run_idx on public.conversations (scrape_run_id, updated_at desc);

create table if not exists public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  role            text not null check (role in ('user','assistant','system')),
  content         text not null,
  citations       jsonb not null default '[]',
  input_mode      text not null default 'text' check (input_mode in ('text','voice')),
  created_at      timestamptz not null default now()
);
create index if not exists messages_conversation_idx on public.messages (conversation_id, created_at);

-- ─────────────────────────────────────────────────────────────────────
-- plans (server-managed catalog; read-only to users)
-- ─────────────────────────────────────────────────────────────────────
create table if not exists public.plans (
  id                  uuid primary key default gen_random_uuid(),
  code                text not null unique check (code in ('free','pro','team')),
  name                text not null,
  amount_minor        int  not null default 0,
  currency            text not null default 'INR',
  billing_interval    text not null default 'month',
  razorpay_plan_id    text,
  project_limit       int not null,
  monthly_url_limit   int not null,
  monthly_chat_limit  int not null,
  monthly_voice_limit int not null,
  features            jsonb not null default '{}',
  is_active           boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

insert into public.plans
  (code, name, amount_minor, currency, project_limit, monthly_url_limit,
   monthly_chat_limit, monthly_voice_limit, features, is_active)
values
  ('free', 'Free',      0, 'INR',   3,    5,   10,   5, '{"csv_export": false, "priority": false}', true),
  ('pro',  'Pro',   49900, 'INR',  50,  500,  500, 200, '{"csv_export": true,  "priority": true}',  true),
  ('team', 'Team', 149900, 'INR', 200, 2000, 2000, 1000,
   '{"csv_export": true, "priority": true, "shared_projects": true, "members": 5}', false)
on conflict (code) do nothing;

-- ─────────────────────────────────────────────────────────────────────
-- subscriptions / payment_orders / payments / webhook_events
-- ─────────────────────────────────────────────────────────────────────
create table if not exists public.subscriptions (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid not null references auth.users (id) on delete cascade,
  plan_id                  uuid not null references public.plans (id),
  provider                 text not null default 'razorpay' check (provider in ('razorpay','mock')),
  razorpay_subscription_id text unique,
  status                   text not null default 'created'
                           check (status in ('created','active','past_due','cancelled','expired')),
  current_period_start     timestamptz,
  current_period_end       timestamptz,
  cancel_at_period_end     boolean not null default false,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);
create index if not exists subscriptions_user_idx on public.subscriptions (user_id, updated_at desc);

create table if not exists public.payment_orders (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users (id) on delete cascade,
  plan_id           uuid not null references public.plans (id),
  razorpay_order_id text unique,
  amount_minor      int  not null,
  currency          text not null default 'INR',
  status            text not null default 'created'
                    check (status in ('created','paid','failed','expired')),
  receipt           text not null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists payment_orders_user_idx on public.payment_orders (user_id, created_at desc);

create table if not exists public.payments (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users (id) on delete cascade,
  subscription_id     uuid references public.subscriptions (id) on delete set null,
  payment_order_id    uuid references public.payment_orders (id) on delete set null,
  razorpay_payment_id text not null unique,
  razorpay_order_id   text,
  amount_minor        int  not null,
  currency            text not null default 'INR',
  status              text not null default 'created'
                      check (status in ('created','authorized','captured','failed','refunded')),
  signature_verified  boolean not null default false,
  captured_at         timestamptz,
  failure_code        text,
  failure_description text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists payments_user_idx on public.payments (user_id, created_at desc);

create table if not exists public.webhook_events (
  id                uuid primary key default gen_random_uuid(),
  provider          text not null default 'razorpay',
  provider_event_id text not null,
  event_type        text not null,
  payload           jsonb not null,
  processing_status text not null default 'received'
                    check (processing_status in ('received','processed','skipped','error')),
  received_at       timestamptz not null default now(),
  processed_at      timestamptz,
  error_message     text,
  unique (provider, provider_event_id)
);

-- ─────────────────────────────────────────────────────────────────────
-- usage_counters (+ idempotency keys for atomic, retry-safe increments)
-- ─────────────────────────────────────────────────────────────────────
create table if not exists public.usage_counters (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  period_start     timestamptz not null,
  period_end       timestamptz not null,
  projects_created int not null default 0,
  urls_processed   int not null default 0,
  chat_questions   int not null default 0,
  voice_questions  int not null default 0,
  updated_at       timestamptz not null default now(),
  unique (user_id, period_start)
);

create table if not exists public.usage_idempotency_keys (
  user_id    uuid not null references auth.users (id) on delete cascade,
  key        text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, key)
);

-- Atomic usage increment with optional idempotency key. Returns the current
-- period's counters. Retries with the same key never double-count.
create or replace function public.increment_usage(
  p_user_id uuid,
  p_projects int,
  p_urls int,
  p_chat int,
  p_voice int,
  p_idempotency_key text
) returns public.usage_counters
language plpgsql security definer set search_path = public as $$
declare
  v_start timestamptz := date_trunc('month', now());
  v_end   timestamptz := date_trunc('month', now()) + interval '1 month';
  v_row   public.usage_counters;
  v_apply boolean := true;
begin
  if p_idempotency_key is not null then
    begin
      insert into public.usage_idempotency_keys (user_id, key)
      values (p_user_id, p_idempotency_key);
    exception when unique_violation then
      v_apply := false;
    end;
  end if;

  if not v_apply then
    p_projects := 0; p_urls := 0; p_chat := 0; p_voice := 0;
  end if;

  insert into public.usage_counters
    (user_id, period_start, period_end, projects_created, urls_processed,
     chat_questions, voice_questions)
  values (p_user_id, v_start, v_end, p_projects, p_urls, p_chat, p_voice)
  on conflict (user_id, period_start) do update set
    projects_created = usage_counters.projects_created + excluded.projects_created,
    urls_processed   = usage_counters.urls_processed   + excluded.urls_processed,
    chat_questions   = usage_counters.chat_questions   + excluded.chat_questions,
    voice_questions  = usage_counters.voice_questions  + excluded.voice_questions,
    updated_at       = now()
  returning * into v_row;

  return v_row;
end; $$;

revoke all on function public.increment_usage from public, anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- Row Level Security
-- Users may access only their own rows. Billing/plan/webhook tables are
-- writable only by trusted server code (service role bypasses RLS).
-- ─────────────────────────────────────────────────────────────────────
alter table public.profiles          enable row level security;
alter table public.projects          enable row level security;
alter table public.scrape_runs       enable row level security;
alter table public.scraped_pages     enable row level security;
alter table public.headings          enable row level security;
alter table public.extracted_links   enable row level security;
alter table public.conversations     enable row level security;
alter table public.messages          enable row level security;
alter table public.plans             enable row level security;
alter table public.subscriptions     enable row level security;
alter table public.payment_orders    enable row level security;
alter table public.payments          enable row level security;
alter table public.webhook_events    enable row level security;
alter table public.usage_counters    enable row level security;
alter table public.usage_idempotency_keys enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "own projects" on public.projects;
create policy "own projects" on public.projects
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own runs" on public.scrape_runs;
create policy "own runs" on public.scrape_runs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own pages" on public.scraped_pages;
create policy "own pages" on public.scraped_pages
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own headings" on public.headings;
create policy "own headings" on public.headings
  for all using (exists (
    select 1 from public.scraped_pages p
    where p.id = scraped_page_id and p.user_id = auth.uid()))
  with check (exists (
    select 1 from public.scraped_pages p
    where p.id = scraped_page_id and p.user_id = auth.uid()));

drop policy if exists "own links" on public.extracted_links;
create policy "own links" on public.extracted_links
  for all using (exists (
    select 1 from public.scraped_pages p
    where p.id = scraped_page_id and p.user_id = auth.uid()))
  with check (exists (
    select 1 from public.scraped_pages p
    where p.id = scraped_page_id and p.user_id = auth.uid()));

drop policy if exists "own conversations" on public.conversations;
create policy "own conversations" on public.conversations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own messages" on public.messages;
create policy "own messages" on public.messages
  for all using (exists (
    select 1 from public.conversations c
    where c.id = conversation_id and c.user_id = auth.uid()))
  with check (exists (
    select 1 from public.conversations c
    where c.id = conversation_id and c.user_id = auth.uid()));

-- Plans: anyone signed in may read; only the service role writes.
drop policy if exists "plans are readable" on public.plans;
create policy "plans are readable" on public.plans
  for select using (true);

-- Billing tables: users may READ their own rows; all writes come from the
-- service role (no insert/update/delete policies for authenticated users).
drop policy if exists "read own subscriptions" on public.subscriptions;
create policy "read own subscriptions" on public.subscriptions
  for select using (auth.uid() = user_id);
drop policy if exists "read own payment orders" on public.payment_orders;
create policy "read own payment orders" on public.payment_orders
  for select using (auth.uid() = user_id);
drop policy if exists "read own payments" on public.payments;
create policy "read own payments" on public.payments
  for select using (auth.uid() = user_id);
drop policy if exists "read own usage" on public.usage_counters;
create policy "read own usage" on public.usage_counters
  for select using (auth.uid() = user_id);

-- webhook_events and usage_idempotency_keys: service role only (no policies).

-- Cumulative unique-visitor tracking and user feedback.
-- Both tables are written exclusively by trusted server code (service role);
-- no client-facing policies are defined.

create table if not exists public.site_visits (
  visitor_key text primary key,          -- random id from an httpOnly cookie
  first_seen  timestamptz not null default now()
);

create table if not exists public.feedback (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users (id) on delete set null,
  email      text,
  message    text not null check (char_length(message) between 1 and 2000),
  page       text,
  created_at timestamptz not null default now()
);
create index if not exists feedback_created_idx on public.feedback (created_at desc);

alter table public.site_visits enable row level security;
alter table public.feedback    enable row level security;
-- service role only: no policies.

