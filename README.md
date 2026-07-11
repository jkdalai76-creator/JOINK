# Joink 🔍

**Website content extraction and research workspace.**

> For researchers, students, marketers, job seekers, and analysts, Joink extracts useful public
> information from websites, organizes it into a structured and traceable format, and lets users
> explore saved results through text or voice.

Every extraction is traceable to its **source URL, page title, section, timestamp, extraction
method, status and confidence indicator**.

---

## Feature highlights

- ✅ End-to-end flow: account → project → URLs → extraction → structured results → save → reopen → ask questions (text/voice) → export
- 🔒 Secure, responsible scraping (SSRF guards, redirect revalidation, robots.txt, rate limits, size/time caps, descriptive user agent)
- 🗂️ Results workspace: Overview / Pages / Headings / Links / Structured data / Chat tabs with search & filters
- 💬 Grounded chatbot: answers only from the selected saved extraction, with **validated clickable citations** — or an honest "not enough information"
- 🎤 Voice questions via the browser Web Speech API (editable transcript, read-aloud, full text fallback; raw audio never stored)
- 📤 JSON & CSV export, always with source URLs and timestamps (CSV is formula-injection safe)
- 💳 Razorpay **Test Mode** billing (Subscriptions, or one-time Orders fallback), server-priced plans, verified signatures, idempotent webhooks, server-side entitlements
- 🧪 64 unit tests + Playwright end-to-end tests
- 🪫 Graceful degradation: the core scraping flow works **without** Supabase, AI, or Razorpay configured
- 📖 Built-in beginner Guide & FAQ at `/guide` — explains web scraping from zero, with a visual step-by-step walkthrough

## Quick start (zero configuration — demo mode)

```bash
npm install
npm run dev
```

Open http://localhost:3000. With no environment variables at all, Joink runs in **demo mode**:

- A banner labels the mode clearly.
- Auth, projects, extractions, chat and billing all work against an **in-memory store** (data
  resets when the server restarts).
- "Try the demo account" on the sign-in page gives one-click access.
- "Load demo project" on the dashboard seeds 3 extracted pages, 1 failed URL and a saved chat
  with citations.
- Billing uses the **explicitly labelled mock mode** (never silently in production; it requires
  `ALLOW_MOCK_BILLING=true` there).
- Chat uses extractive (quoted) answers with citations until you set `AI_API_KEY`.

## Full setup (Supabase + AI + Razorpay Test Mode)

1. **Copy env template:** `cp .env.example .env.local` and fill values as below.
2. **Supabase:** create a project at supabase.com, then run the migration:
   - Paste `supabase/migrations/0001_init.sql` into the SQL editor (or `supabase db push`).
   - Copy the project URL, anon key, and service-role key into `.env.local`.
   - The migration creates all tables, indexes, Row Level Security policies and the atomic
     `increment_usage` function. Users can only read their own data; billing tables are
     writable only by the service role.
3. **AI (optional):** set `AI_API_KEY` (+ `AI_BASE_URL`, `AI_MODEL`) for any OpenAI-compatible
   chat-completions endpoint.
4. **Razorpay Test Mode (optional):**
   - Create a Razorpay account → switch the dashboard to **Test Mode**.
   - Settings → API Keys → generate a key pair → set `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`,
     and `NEXT_PUBLIC_RAZORPAY_KEY_ID` (same key id — the only value exposed to the browser).
   - **Subscriptions (preferred):** create a Plan (₹499/month) in the dashboard and put its id
     in `RAZORPAY_PRO_PLAN_ID`. Without it Joink falls back to a clearly labelled **one-time
     Pro access** purchase via Orders.
   - **Webhook:** dashboard → Webhooks → add `https://<your-domain>/api/webhooks/razorpay`,
     choose the payment/order/subscription events, set a secret, and copy it into
     `RAZORPAY_WEBHOOK_SECRET`. For local development, tunnel with `ngrok http 3000`.
   - Test cards: use Razorpay's published test card numbers (e.g. 4111 1111 1111 1111, any
     future expiry, any CVV).
5. `npm run dev`

## Environment variables

See [.env.example](.env.example) for the complete annotated list. Summary:

| Variable | Scope | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | Supabase auth + RLS-scoped queries |
| `SUPABASE_SERVICE_ROLE_KEY` | **server only** | trusted writes (billing, webhooks, background extraction) |
| `AI_API_KEY`, `AI_BASE_URL`, `AI_MODEL` | server only | grounded chat answers |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | public | Razorpay Checkout key id (only public billing value) |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | **server only** | Razorpay REST API + checkout signature verification |
| `RAZORPAY_WEBHOOK_SECRET` | **server only** | webhook HMAC verification |
| `RAZORPAY_PRO_PLAN_ID` | server only | Razorpay Subscriptions plan for Pro |
| `APP_BASE_URL` | server | absolute URLs |
| `DEMO_SESSION_SECRET` | server only | signs demo-mode session cookies |
| `ALLOW_MOCK_BILLING` | server | opt-in labelled mock billing when Razorpay is absent |
| `SCRAPER_BROWSER_FALLBACK` | server | optional Playwright rendering fallback (off by default) |

## Scripts

```bash
npm run dev        # dev server
npm run build      # production build
npm run start      # serve the production build
npm run typecheck  # tsc --noEmit
npm run test       # Vitest unit tests
npm run test:e2e   # Playwright end-to-end tests (starts its own server on :3100)
npm run check      # typecheck + unit tests + build
```

## Deployment

Any Node 20+ host works (Vercel, Railway, Render, Fly.io, a VM):

1. Set the environment variables above (never commit secrets).
2. `npm run build && npm run start` (or connect the repo to Vercel — zero config needed).
3. Point the Razorpay webhook at `https://<domain>/api/webhooks/razorpay`.
4. Run the Supabase migration once per environment.
5. In production, mock billing stays off unless `ALLOW_MOCK_BILLING=true` is set explicitly, and
   the dev-only plan-reset endpoint is disabled.

## Responsible-scraping policy

Joink extracts **publicly accessible pages only** and is built to be a polite client:

- Descriptive user agent: `JoinkBot/0.1 (+https://joink.app/responsible-scraping; content research tool)`
- Honours `robots.txt` where practical (explicit `Disallow` blocks the URL; unreachable robots
  files fail open politely)
- Per-user rate limits, 12 s request timeout, 5-redirect cap, 2 MiB response cap, 10 URLs/run
- Blocks localhost, loopback, private ranges, link-local, cloud metadata and reserved IPs —
  and re-validates **every redirect hop**
- Never executes scripts from scraped pages; extracted content is stored as plain text
- Treats page content as untrusted data — instructions inside scraped pages are never followed
- **No** CAPTCHA bypass, paywall bypass, login bypass, proxy rotation, or anti-bot evasion

Users are responsible for complying with each site's terms of service and applicable law.

## Known limitations

- Demo mode stores data in process memory: restarts clear it (by design; use Supabase for persistence).
- DNS is resolved before fetching; a hostile DNS server could in theory rebind between check and
  request. Production hardening: pin resolved IPs at the socket layer or use an egress proxy.
- JavaScript-heavy pages may yield thin text (marked "partial" with a clear message). The optional
  Playwright fallback (`SCRAPER_BROWSER_FALLBACK=true`) can render them.
- Retrieval is lexical (keyword scoring). Postgres FTS indexes exist for future upgrades; embeddings
  are out of scope for the MVP.
- Razorpay flows require test keys; the mock mode exercises the same server-side verification path
  but does not talk to Razorpay.
- Voice input depends on browser speech recognition (Chrome/Edge best); a full text fallback always works.
- Team plan is display-only ("Coming soon"). No refunds in-app.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| "Demo mode" banner won't go away | Set both `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`, restart the dev server |
| Sign-up says email confirmation needed | Supabase Auth → disable "Confirm email" for hackathon demos, or check the inbox |
| Extraction fails with "not allowed" | The URL resolves to a private/reserved address or is blocked by robots.txt — expected safety behaviour |
| Pages come back "partial" with thin text | Content is likely rendered client-side; enable `SCRAPER_BROWSER_FALLBACK=true` |
| Chat says AI is not configured | Set `AI_API_KEY`; extractive answers with citations work meanwhile |
| Checkout button says payments not configured | Set Razorpay keys, or `ALLOW_MOCK_BILLING=true` outside production |
| Webhook returns 401 | `RAZORPAY_WEBHOOK_SECRET` must exactly match the secret configured in the Razorpay dashboard |
| Pro didn't activate after checkout | Press "Reconcile with Razorpay" on the Billing page — it re-checks the subscription via the API |
| E2E tests can't find a browser | `npx playwright install chromium`, or point at an existing binary: `PLAYWRIGHT_CHROMIUM_PATH=/path/to/chrome npm run test:e2e` |

## Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md) — modules, data flow, security model
- [TEAM_TASKS.md](TEAM_TASKS.md) — 10-person workstream split with dependencies
- [DEMO_SCRIPT.md](DEMO_SCRIPT.md) — 3–5 minute demo runbook
- [supabase/migrations](supabase/migrations) — schema + RLS
