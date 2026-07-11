import { aiConfigured, env } from "@/lib/env";

/**
 * Joink's product-support assistant. Unlike the grounded *research* chat
 * (which answers only from a user's saved extractions), this agent helps
 * people USE Joink: what it does, how features work, pricing, limits,
 * troubleshooting. It answers from a fixed product knowledge base — never
 * from scraped content — and uses the configured LLM when available, with a
 * keyword-matched fallback so support works even with no AI key.
 */

export interface SupportReply {
  answer: string;
  usedAi: boolean;
}

export const SUPPORT_SYSTEM_RULE =
  "You are Joink's friendly in-app support assistant. Joink is a website " +
  "content-extraction and research workspace. Answer questions about how to " +
  "USE Joink using ONLY the provided product facts. Be concise (2-4 sentences), " +
  "warm and practical. If a question is outside Joink's scope or the facts do " +
  "not cover it, say so briefly and point the user to the in-app Guide or the " +
  "feedback button. Never invent features, prices or limits.";

/** Fixed, trustworthy product facts the assistant is allowed to use. */
export const PRODUCT_FACTS = `
WHAT JOINK IS: Joink extracts useful public information from websites (page
title, meta description, H1-H3 headings, main readable text, and links with
anchor text and absolute URLs), organizes it into a structured, traceable
format, and lets users explore saved results by text or voice with citations.

GETTING STARTED: Sign up (or use the demo account in demo mode). From the
dashboard, click "New project", give it a name, paste up to 10 public URLs
(one per line), choose what to extract (metadata, headings, main text, links),
and click "Extract content". Watch per-URL status; results save automatically.

RESULTS WORKSPACE: Tabs are Overview, Pages, Headings, Links, Structured data
and Chat. You can search, filter by page / heading level / internal-external
links, copy content, open the source page, export JSON or CSV, reopen past
runs, and delete a run.

GROUNDED CHAT: In a run's Chat tab you can ask questions answered only from
that saved extraction, with clickable source citations. If the saved content
doesn't support an answer, it says so instead of guessing.

VOICE: Press the microphone to speak a question; it becomes an editable
transcript you confirm before sending, and answers can be read aloud. Full
text fallback always works. Raw audio is never stored.

EXPLORE: The News, Popular and Explore tabs surface trending public stories;
each has an "Extract" button that prefills a new extraction with that URL.

EXPORT: JSON export is on every plan; CSV export is a Pro feature. Both always
include source URLs and timestamps.

PLANS & LIMITS (server-enforced): Free = 3 projects, 5 URLs/month, 10 chat and
5 voice questions/month, JSON export. Pro (₹499/month) = 50 projects, 500
URLs/month, higher chat/voice limits, JSON + CSV export, priority processing.
Team (₹1,499/month) is "coming soon". Upgrade from the Pricing or Billing page;
payments use Razorpay (Test Mode for the hackathon). Downgrades never delete
your data. Cancel anytime from Billing; access lasts to the end of the period.

RESPONSIBLE SCRAPING: Joink extracts public pages only, respects robots.txt,
rate-limits, uses a descriptive user agent, and never bypasses CAPTCHAs,
paywalls or logins. It blocks private/internal addresses. A failed URL never
removes the successful results in the same run.

TROUBLESHOOTING: A URL can fail if it's mistyped, blocked by robots.txt, needs
a login, or is a private/internal address — the other URLs still succeed.
"Partial" pages mean the text was thin (often JavaScript-rendered). If the
Chat tab says AI isn't configured, extraction/search/export still work and
chat returns the most relevant saved excerpts with citations.

THEMING: Toggle light/dark from the header; light mode also has a background
tint picker. Preferences persist.

PRIVACY: Your projects, results and conversations are yours alone, enforced in
the database (row-level security). Give feedback anytime via the Feedback
button; visitor counts are anonymous.
`.trim();

const NAV_HINT =
  "You can find step-by-step help on the Guide page, and send suggestions with the Feedback button.";

/** Lightweight keyword fallback used when no AI key is configured. */
const FALLBACK_RULES: { keywords: string[]; answer: string }[] = [
  {
    keywords: ["start", "begin", "how do i use", "get started", "first", "new project", "create"],
    answer:
      "To start: from your dashboard click “New project”, paste up to 10 public URLs (one per line), pick what to extract, and hit “Extract content”. Your structured results save automatically. " +
      NAV_HINT,
  },
  {
    keywords: ["voice", "microphone", "speak", "talk"],
    answer:
      "Press the microphone in a run's Chat tab, speak your question, then review the editable transcript before sending. Answers can be read aloud, and there's always a full text fallback — raw audio is never stored.",
  },
  {
    keywords: ["export", "csv", "json", "download"],
    answer:
      "JSON export is available on every plan; CSV export is a Pro feature. Both always include source URLs and timestamps. Use the JSON/CSV buttons at the top of a results workspace.",
  },
  {
    keywords: ["price", "pricing", "plan", "cost", "upgrade", "pro", "free", "limit", "razorpay"],
    answer:
      "Free covers 3 projects and 5 URLs/month with JSON export. Pro (₹499/month) raises limits and adds CSV export and priority processing. Upgrade from the Pricing or Billing page — payments run through Razorpay. Downgrades never delete your data.",
  },
  {
    keywords: ["fail", "error", "blocked", "partial", "not working", "robots"],
    answer:
      "A URL can fail if it's mistyped, blocked by robots.txt, needs a login, or is a private address — the other URLs in the run still succeed. “Partial” means the page's text was thin, often because it's rendered with JavaScript.",
  },
  {
    keywords: ["citation", "chat", "question", "grounded", "ask"],
    answer:
      "In a run's Chat tab you can ask questions answered only from that saved extraction, each with clickable source citations. If the content doesn't support an answer, Joink says so rather than guessing.",
  },
  {
    keywords: ["voice agent", "support", "help", "what can", "what is joink", "who are you"],
    answer:
      "I'm Joink's support assistant. Joink turns public webpages into structured, source-linked research you can search, question by text or voice, and export. Ask me how any feature works! " +
      NAV_HINT,
  },
  {
    keywords: ["theme", "dark", "light", "background", "color"],
    answer:
      "Toggle light/dark mode from the header — in light mode you can also pick a background tint. Your choice is remembered across visits.",
  },
  {
    keywords: ["privacy", "data", "secure", "safe", "delete"],
    answer:
      "Your projects, results and conversations are private to your account, enforced at the database level. Downgrading or cancelling never deletes your saved data.",
  },
];

function fallbackAnswer(question: string): string {
  const q = question.toLowerCase();
  let best: { score: number; answer: string } | null = null;
  for (const rule of FALLBACK_RULES) {
    const score = rule.keywords.reduce((n, kw) => (q.includes(kw) ? n + 1 : n), 0);
    if (score > 0 && (!best || score > best.score)) best = { score, answer: rule.answer };
  }
  return (
    best?.answer ??
    "I can help you use Joink — creating projects, extracting URLs, the results workspace, grounded chat, voice questions, export, and plans. " +
      NAV_HINT
  );
}

export async function answerSupport(
  question: string,
  history: { role: "user" | "assistant"; content: string }[] = [],
): Promise<SupportReply> {
  if (!aiConfigured()) {
    return { answer: fallbackAnswer(question), usedAi: false };
  }
  try {
    const res = await fetch(`${env.aiBaseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${env.aiApiKey}` },
      body: JSON.stringify({
        model: env.aiModel,
        temperature: 0.3,
        messages: [
          { role: "system", content: `${SUPPORT_SYSTEM_RULE}\n\nPRODUCT FACTS:\n${PRODUCT_FACTS}` },
          ...history.slice(-6),
          { role: "user", content: question },
        ],
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) throw new Error(`AI endpoint returned HTTP ${res.status}`);
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const content = json.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error("empty reply");
    return { answer: content, usedAi: true };
  } catch (err) {
    console.error("[joink] support AI failed, using fallback:", err);
    return { answer: fallbackAnswer(question), usedAi: false };
  }
}
