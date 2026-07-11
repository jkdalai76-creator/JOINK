# Joink — 3–5 minute demo script

**Setup beforehand:** `npm run dev` (demo mode is fine and fully self-contained), browser at
the landing page, second tab on the Razorpay dashboard (if using Test Mode keys), mic
permission previously granted to avoid a first-time prompt during the show. If rehearsing
again, use "Reset to Free (dev)" on the Billing page.

| ⏱ | Beat | Do | Say |
| --- | --- | --- | --- |
| 0:00 | Problem | Show the landing page | "Researchers copy-paste from the web and instantly lose *where* facts came from. Joink extracts public webpages into structured, traceable research — every fact keeps its source URL, timestamp and confidence." |
| 0:30 | Sign in | "Try the demo account" (or a prepared account) | "Sign-up, sign-in, demo access — all working." |
| 0:45 | Create project | Dashboard → New project → name it "Docs research" | "Projects group my research." |
| 1:00 | Submit URLs | Paste 3 public URLs (e.g. example.com + two blog/docs pages) **plus** one URL like `https://intranet.corp.internal/secret` → Extract content | "Up to ten URLs per run. Watch the per-URL states — queued, processing, completed." |
| 1:30 | Graceful failure | Point at the failed row | "The internal URL was **blocked by our SSRF guards** and marked failed — one bad URL never destroys the successful results. This is our responsible-scraping pipeline: robots.txt, rate limits, size caps, no CAPTCHA or paywall bypass." |
| 1:50 | Explore | Overview → Pages (open main text) → Headings (filter H2) → Links (internal-only filter) → keyword search | "Everything is structured and filterable, and every record shows source, timestamp, method and confidence." |
| 2:20 | Save & reopen | Go to Dashboard → click the run in "Recent extraction runs" | "Results are saved — I can leave and reopen them any time." |
| 2:35 | Text question | Chat tab → ask "What are these pages about?" | "The chatbot answers **only from the saved extraction** and cites the exact pages — if the content doesn't support an answer, it says so instead of hallucinating." Click a citation. |
| 3:00 | Voice question | Press the mic, ask a question, show the editable transcript, send; toggle "Read answers aloud" | "Voice is progressive enhancement — editable transcript, spoken answers, and a full text fallback. No raw audio is ever stored." |
| 3:30 | Export | Export JSON, open it briefly; try CSV (Free plan → clean upgrade prompt) | "Exports always carry source URLs and timestamps. CSV is a Pro feature — enforced on the **server**, not hidden in the UI." |
| 3:50 | Upgrade | Pricing → Upgrade to Pro → complete Razorpay **Test Mode** checkout (test card 4111…) or the labelled mock checkout | "The browser only sends a plan code — prices live on the server. Signatures are verified server-side and webhooks confirm activation idempotently." |
| 4:20 | Pro proof | Billing page: plan, verified payment, usage bars; retry CSV export — it works | "Higher limits are live, payment history shows the Razorpay reference, and cancelling never deletes data." |
| 4:40 | Close | Landing page | "Next up: scheduled monitoring, extraction-run comparison, and team workspaces. Joink — web research you can trust." |

**Fallbacks:** offline? Use "Load demo project" (3 pages + 1 failed URL + a saved cited chat)
instead of live extraction. Voice flaky? Type the question — same grounded path. Razorpay
keys absent? The mock checkout is explicitly labelled and demonstrates the identical
server-side verification flow.
