# Joink architecture

Next.js 15 (App Router, TypeScript) monolith with a swappable data layer. Everything
security-relevant happens server-side; the browser only ever talks to typed, validated API
routes that return a consistent `{ success, data | error: { code, message } }` envelope.

```
src/
  app/                    # routes (pages + API route handlers)
    api/                  # all server operations (see "API surface")
    dashboard/ projects/ runs/ pricing/ billing/ sign-in/ sign-up/
  components/             # UI (app shell, workspace, chat, voice, billing…)
  lib/
    env.ts                # runtime-mode detection (demo / AI / Razorpay / mock)
    api.ts                # envelope + error handling (no stack traces leak)
    plans.ts              # trusted server-side plan catalog (prices in paise)
    auth.ts               # Supabase auth OR HMAC-signed demo sessions
    store/                # DataStore interface + Memory & Supabase adapters
    scraper/              # url-safety, fetcher, robots, extract, pipeline
    chat/                 # chunking, lexical retrieval, grounded answers
    billing/              # razorpay client, signatures, entitlements, webhook
    export/               # CSV encoding (RFC4180 + formula-injection guard)
    demo/                 # demo project seed
supabase/migrations/      # SQL schema + RLS + increment_usage()
tests/unit/  tests/e2e/   # Vitest + Playwright
```

## The dual data layer

`DataStore` (`src/lib/store/types.ts`) is the single persistence interface. Two adapters:

- **MemoryStore** — process-wide maps; powers zero-config demo mode and the e2e suite.
- **SupabaseStore** — user-scoped client (RLS applies) for user data; service-role client for
  trusted writes only (billing, webhooks, background extraction, usage counters via the
  atomic `increment_usage` SQL function with idempotency keys).

`getStore()` picks the adapter per request based on env; `getBackgroundStore()` provides a
cookie-free store for post-response work (extraction continues via `next/server`'s `after()`)
and webhooks.

## Extraction pipeline (security model)

For each URL: normalize (http/https only, no credentials, fragment stripped) → hostname
blocklist (localhost/.local/.internal/metadata hosts) → DNS resolution with every resolved
address checked against blocked IPv4/IPv6 ranges (loopback, RFC1918, link-local/metadata,
CGNAT, test-nets, multicast, reserved, mapped/NAT64 forms) → robots.txt check → fetch with
`redirect: manual`, 12 s timeout, 2 MiB streamed cap, content-type allowlist — and **every
redirect hop repeats the full safety gate** (5 hops max). Extraction uses cheerio +
Mozilla Readability (jsdom, scripts never execute) and stores plain text only. Headings keep
level/order/section hints; links are absolutized, deduplicated and classified
internal/external. Failures are per-page: one bad URL yields a `partial` run, never data loss.
Per-page status/method/confidence/timestamps make every record traceable. Known limitation:
resolve-then-fetch is subject to a theoretical DNS-rebinding TOCTOU; production hardening
would pin IPs at the socket layer.

## Grounded chat

Saved page text is chunked (~1200 chars, sentence-aware, 150 overlap) with page metadata.
Lexical scoring picks the top chunks; only those are sent to the model with the system rule
that scraped content is untrusted reference material, never instructions. The model must
reply in strict JSON with chunk-id citations; `interpretModelReply` **validates every citation
against the chunks actually supplied** and drops hallucinated ids. Without an AI key the same
retrieval powers extractive quoted answers, so the feature never dead-ends. Conversations and
messages (with citations and input mode text/voice) are persisted.

## Voice

Progressive enhancement over the browser SpeechRecognition/SpeechSynthesis APIs: mic access
requested only on click; listening state with elapsed time, stop/cancel; the transcript lands
in the chat input for editing before submission through the same grounded endpoint; answers
can be read aloud with stop/mute. Unsupported browsers get a clear message and the text path.
Raw audio is never uploaded or stored.

## Billing & entitlements

The browser sends **only a plan code**. `plans.ts` is the trusted catalog (₹ in paise);
`createCheckout` builds a Razorpay Subscription (preferred) or Order (one-time fallback), or a
clearly labelled mock order when Razorpay is absent (refused in production unless explicitly
allowed). Verification is server-side: checkout signatures (HMAC-SHA256) are required, and
activation additionally confirms state with the Razorpay API; webhooks (raw-body HMAC
verification, stored-before-processing, unique event id → duplicates acknowledged and
skipped, out-of-order safe, captured payments never downgraded) re-confirm. Client callbacks
alone can never grant access. `entitlements.ts` is the single server-side gate for project /
URL / chat / voice / CSV limits; usage increments are atomic with idempotency keys. Downgrades
and payment failures never delete data — they only restrict new paid actions.

## API surface

Auth: `POST /api/auth/sign-up | sign-in | sign-out | demo` · Me: `GET /api/me`,
`GET /api/me/usage`, `GET /api/me/recent-runs` · Projects: `GET/POST /api/projects`,
`GET/PATCH/DELETE /api/projects/:id` · Extraction: `POST /api/scrape` (races nothing — creates
run + queued pages, processes in background), `GET/DELETE /api/runs/:id`,
`GET /api/runs/:id/export?format=json|csv` · Chat: `POST /api/conversations`,
`GET/POST /api/conversations/:id/messages` · Billing: `GET /api/plans`,
`POST /api/billing/checkout | verify | cancel | reconcile`, `GET /api/billing/history`,
`POST /api/webhooks/razorpay` · Demo: `POST /api/demo/load`, `POST /api/demo/reset-plan`
(dev-only). All inputs are Zod-validated; all errors are safe messages with stable codes.
