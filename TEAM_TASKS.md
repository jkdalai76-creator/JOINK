# Team task split (10 people, 3 days)

The codebase is deliberately modular so workstreams touch disjoint directories. **One
integration owner** (Role 1) reviews and merges everything; keep commits small and working —
merge to `main` at least twice a day.

| # | Role | Owns | Key files |
| --- | --- | --- | --- |
| 1 | **Product owner & integration lead** | Scope calls, PR reviews, merge order, keeping `npm run check` green, release | whole repo |
| 2 | **Landing page & design system** | Landing page, UI kit, spacing/typography/badges/skeletons, accessibility pass | `src/app/page.tsx`, `src/components/ui.tsx`, `src/app/globals.css` |
| 3 | **Auth & dashboard** | Sign-up/in/out, demo access, app shell, dashboard cards/tables/empty states | `src/lib/auth.ts`, `src/app/api/auth/*`, `src/components/app-shell.tsx`, `dashboard-client.tsx` |
| 4 | **Project CRUD & results workspace** | Project pages, extraction form, tabs/filters/search/copy/export UI, delete dialogs | `src/components/{extraction-form,project-client,run-workspace}.tsx`, `src/app/projects/*`, `src/app/runs/*` |
| 5 | **Secure scraping service** | URL safety, fetcher, robots, extraction quality, pipeline states, rate limiting | `src/lib/scraper/*`, `src/app/api/scrape/*`, `src/app/api/runs/*` |
| 6 | **Database & RLS** | Schema, migrations, RLS policies, `increment_usage`, Supabase adapter parity with MemoryStore | `supabase/migrations/*`, `src/lib/store/*` |
| 7 | **Chat & retrieval** | Chunking, retrieval, grounded prompt, citation validation, conversations API, chat panel | `src/lib/chat/*`, `src/app/api/conversations/*`, `src/components/chat-panel.tsx` |
| 8 | **Voice interaction** | Speech-to-text states (listening/denied/unsupported/cancelled), transcript editing, TTS controls | `src/components/voice-button.tsx` (+ chat panel wiring) |
| 9 | **Razorpay billing & entitlements** | Plan catalog, checkout/verify/webhook/reconcile, entitlement service, pricing & billing pages | `src/lib/billing/*`, `src/lib/plans.ts`, `src/app/api/billing/*`, `src/app/api/webhooks/*`, `pricing-client.tsx`, `billing-client.tsx`, `upgrade-button.tsx` |
| 10 | **Testing, docs, demo & presentation** | Unit + e2e suites, README/ARCHITECTURE/DEMO_SCRIPT accuracy, demo seed data, rehearsals, slides | `tests/*`, `*.md`, `src/lib/demo/*` |

## Dependency graph

```
(6) Database & store interface ──► (3) Auth ──► (4) Workspace UI ──► (10) E2E
        │                                   ▲
        ├──► (5) Scraper pipeline ──────────┤
        ├──► (7) Chat  ◄── (5) saved pages  │
        │        ▲                          │
        │        └── (8) Voice (UI-only; only needs 7's chat input)
        └──► (9) Billing & entitlements (gates 4/5/7 via server checks)
(2) Design system feeds every UI stream but blocks no one (ship primitives first).
```

Practical order: Day 1 — 6, 3, 5, 2 in parallel (store interface freezes by noon). Day 2 —
4, 7, 9 on top; 8 starts once chat input exists. Day 3 — 10 hardens tests/docs, everyone
fixes, integration lead cuts the demo build and runs `DEMO_SCRIPT.md` twice.

## Working agreements

- The `DataStore` interface and the API envelope are contracts — changing them needs the
  integration lead's sign-off.
- Every server operation validates input with Zod and enforces limits via
  `src/lib/billing/entitlements.ts` — never in the client.
- No secrets in client components; only `NEXT_PUBLIC_*` values may reach the browser.
- A PR isn't done until `npm run check` passes locally.
