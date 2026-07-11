# Production launch runbook

Everything needed to take Joink from "deployed" to "production-ready", plus how
to operate it after launch. Written for a non-technical owner — every step is a
click in a dashboard, not code. Pair this with `DEPLOY.md` (the first go-live).

Secrets live **only** in Vercel's Environment Variables — never in the repo,
emails, chats, or screenshots.

---

## 1. Environment variables (source of truth)

Set these in **Vercel → Project → Settings → Environment Variables** (Production).
Any change requires a **Redeploy** to take effect.

| Variable | Secret? | Purpose |
|---|---|---|
| `SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_URL` | no | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or `..._ANON_KEY`) | no | Browser Supabase auth |
| `SUPABASE_SECRET_KEY` (or `SUPABASE_SERVICE_ROLE_KEY`) | **yes** | Trusted server writes |
| `RAZORPAY_KEY_ID` | no | Razorpay key id |
| `RAZORPAY_KEY_SECRET` | **yes** | Razorpay secret |
| `RAZORPAY_WEBHOOK_SECRET` | **yes** | Verifies Razorpay webhooks |
| `RAZORPAY_PRO_PLAN_ID` | no | `plan_…` — enables Pro **subscription** |
| `RAZORPAY_TEAM_PLAN_ID` | no | `plan_…` — enables Team **subscription** |
| `NEXT_PUBLIC_SITE_URL` | no | Primary domain, e.g. `https://jkarsu.com` (used by sitemap/robots) |
| `RAZORPAY_SETUP_TOKEN` | **yes** | ONLY while bootstrapping plans; delete after |
| `ALLOW_MOCK_BILLING` | no | Leave unset in production (keeps mock billing off) |

Verify anytime at **`/api/health`** — you want:
`supabase.connected: true`, `razorpay.configured: true`, `razorpay.subscriptions: true`.

---

## 2. Custom domain (jkarsu.com)

1. **Vercel → Settings → Domains → Add** → `jkarsu.com` (accept the `www` variant too).
2. At your **domain registrar**, add the DNS records Vercel shows — typically:
   - `A` record, host `@` → `76.76.21.21`
   - `CNAME`, host `www` → `cname.vercel-dns.com`
   Adding records (not removing) means **no downtime**; SSL is auto-provisioned.
3. Set `NEXT_PUBLIC_SITE_URL=https://jkarsu.com` in Vercel → **Redeploy**.
4. **Supabase → Authentication → URL Configuration** (required, or auth breaks):
   - **Site URL** → `https://jkarsu.com`
   - **Redirect URLs** → add `https://jkarsu.com/**` (keep the `*.vercel.app` one).
5. (Optional) Add a second Razorpay webhook: `https://jkarsu.com/api/webhooks/razorpay`.

---

## 3. Security (Vercel Pro)

Already in code: CSP + HSTS + X-Frame-Options + X-Content-Type-Options +
Referrer-Policy + Permissions-Policy (see `next.config.ts`), SSRF-protected
scraping, server-priced/ signature-verified billing.

Turn on in the dashboard:
- **Firewall → Managed Ruleset**: enable (OWASP-style protection).
- **Firewall → Bot filter**: enable to block unwanted bots.
- **Firewall → Custom Rule (rate limit)**: e.g. path `/api/*` → 100 requests/min
  per IP → action *Challenge* or *Deny*. This is the real rate limiter (the
  in-app one is per-instance and best-effort).
- **Deployment Protection**: enable for **Preview only** — NOT Production
  (Production is a public app; protecting it would wall out real users).

---

## 4. Performance & cost

- **Speed Insights** tab → **Enable** (code already ships `@vercel/speed-insights`).
- **Web Analytics** tab → **Enable** (code already ships `@vercel/analytics`).
- **Settings → Functions → Fluid Compute** → enable (fewer cold starts).
- **Settings → Billing → Spend Management** → set a monthly cap + email alerts.
- Scrape function `maxDuration` is set to 60s in code; raise if you extract many
  slow sites.

---

## 5. Rollback & incident runbook (operational excellence)

**Every deployment is retained and instantly reversible.**

- **Rollback (fastest fix):** Vercel → **Deployments** → pick the last known-good
  one → **⋯ → Promote to Production**. Live in seconds. Do this first, diagnose
  second.
- **Promote / stage:** every push builds a Preview URL; test it, then Promote to
  Production when happy.
- **Config broke it?** If a bad env-var change is the cause, fix the variable and
  Redeploy — or roll back to the previous deployment (it keeps its old config).

**Incident checklist (solo-founder version):**
1. Is the site down or just slow? Check `/api/health` and the Vercel **Deployments**
   status.
2. If a recent deploy caused it → **roll back** (above).
3. If a dependency is down: Supabase status (auth/db), Razorpay status (payments).
   `/api/health` shows which of the three is unhealthy.
4. Communicate: note the issue + ETA wherever your users reach you.
5. After recovery, write 3 lines: what broke, how you fixed it, how to prevent it.

---

## 6. Post-deploy smoke test (run after each production change)

- [ ] `/api/health` → supabase connected, razorpay configured + subscriptions true
- [ ] Sign up a new account → lands on dashboard
- [ ] Password reset email → link opens the reset form
- [ ] Create a project + extract a couple of URLs → results appear
- [ ] Ask a chat question → answer with citations
- [ ] Upgrade to Pro → Razorpay opens → test card `4111 1111 1111 1111` → activated
- [ ] Billing page shows the active plan + Cancel
- [ ] `/robots.txt` and `/sitemap.xml` load
- [ ] Landing page loads with no console CSP errors
