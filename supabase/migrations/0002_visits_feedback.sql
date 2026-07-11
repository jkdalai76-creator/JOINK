-- Cumulative unique-visitor tracking and user feedback.
-- Both tables are written exclusively by trusted server code (service role);
-- no client-facing policies are defined.

create table public.site_visits (
  visitor_key text primary key,          -- random id from an httpOnly cookie
  first_seen  timestamptz not null default now()
);

create table public.feedback (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users (id) on delete set null,
  email      text,
  message    text not null check (char_length(message) between 1 and 2000),
  page       text,
  created_at timestamptz not null default now()
);
create index feedback_created_idx on public.feedback (created_at desc);

alter table public.site_visits enable row level security;
alter table public.feedback    enable row level security;
-- service role only: no policies.
