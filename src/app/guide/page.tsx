import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  BookOpen,
  Download,
  FileText,
  FolderPlus,
  Globe,
  Heading1,
  Link2,
  MessageSquareQuote,
  Mic,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { runtimeMode } from "@/lib/env";
import { AppShell, Logo } from "@/components/app-shell";
import { ThemeToggle } from "@/components/theme-toggle";

export const metadata = {
  title: "Guide — how Joink works",
  description:
    "A beginner-friendly guide to Joink: what web scraping is, who it helps, and how to use every feature — no technical background needed.",
};

export default async function GuidePage() {
  const user = await getCurrentUser();
  const content = <GuideContent signedIn={Boolean(user)} />;

  if (user) {
    return (
      <AppShell user={user} mode={runtimeMode()}>
        {content}
      </AppShell>
    );
  }
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link href="/"><Logo /></Link>
          <nav className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/sign-in" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900">Sign in</Link>
            <Link href="/sign-up" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">Sign up</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-10">{content}</main>
    </div>
  );
}

function GuideContent({ signedIn }: { signedIn: boolean }) {
  return (
    <div className="space-y-16">
      {/* Intro */}
      <section className="mx-auto max-w-3xl text-center">
        <p className="mx-auto mb-4 inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
          <BookOpen className="h-3.5 w-3.5" aria-hidden />
          Knowledge base · no technical background needed
        </p>
        <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">
          New here? This guide explains everything.
        </h1>
        <p className="mt-4 text-lg text-slate-600">
          Never heard of “web scraping”? No problem. In five minutes you&apos;ll know what Joink
          does, why it&apos;s useful, and exactly how to use every feature.
        </p>
      </section>

      {/* What is web scraping, in plain words */}
      <section className="mx-auto max-w-3xl">
        <h2 className="text-2xl font-bold text-slate-900">What is “web scraping”, in plain words?</h2>
        <div className="mt-4 space-y-4 text-slate-600">
          <p>
            Imagine you&apos;re researching a topic. You open ten websites, read each one, and
            copy the useful bits into a document. It&apos;s slow, and a week later you can&apos;t
            remember <em>which site</em> a fact came from.
          </p>
          <p>
            <strong className="text-slate-800">Web scraping is simply asking a computer to do that reading and
            copying for you.</strong> You give Joink the addresses (URLs) of public webpages. Joink
            visits each page the same way your browser does, and neatly files away what it finds:
          </p>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {[
            { icon: <FileText className="h-4 w-4" />, title: "The page's title & summary", body: "What the page calls itself and how it describes itself." },
            { icon: <Heading1 className="h-4 w-4" />, title: "The headings", body: "The page's outline — like a table of contents." },
            { icon: <BookOpen className="h-4 w-4" />, title: "The readable text", body: "The actual article content, without menus and ads." },
            { icon: <Link2 className="h-4 w-4" />, title: "The links", body: "Every place the page points to, with its link text." },
          ].map((item) => (
            <div key={item.title} className="flex gap-3 rounded-xl border border-slate-200 bg-white p-4">
              <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                {item.icon}
              </span>
              <span>
                <span className="block text-sm font-semibold text-slate-800">{item.title}</span>
                <span className="block text-sm text-slate-500">{item.body}</span>
              </span>
            </div>
          ))}
        </div>
        <p className="mt-4 text-slate-600">
          And crucially, every saved fact remembers <strong className="text-slate-800">where it came from and
          when</strong> — the source link and timestamp travel with it forever. That&apos;s what makes
          Joink research you can actually trust and cite.
        </p>
      </section>

      {/* Who is it for */}
      <section>
        <h2 className="text-center text-2xl font-bold text-slate-900">Who is Joink for?</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["🎓 Students", "Collect sources for essays and projects with citations built in — no more \"where did I read that?\""],
            ["🔬 Researchers", "Capture fast-changing web information in a structured, auditable format."],
            ["📣 Marketers", "Track competitor pages, headlines and messaging across many sites at once."],
            ["💼 Job seekers", "Save job postings and company pages before they change or disappear."],
            ["📊 Analysts", "Turn scattered webpages into JSON/CSV you can drop into a spreadsheet or notebook."],
            ["✍️ Writers & journalists", "Keep quotable, source-linked notes from every page you research."],
          ].map(([title, body]) => (
            <div key={title} className="rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="font-semibold text-slate-800">{title}</h3>
              <p className="mt-1.5 text-sm text-slate-500">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Visual walkthrough */}
      <section className="mx-auto max-w-3xl">
        <h2 className="text-center text-2xl font-bold text-slate-900">
          How to use Joink, step by step
        </h2>
        <p className="mt-2 text-center text-slate-600">
          The whole journey — from a link to answered questions — looks like this:
        </p>
        <ol className="mt-8 space-y-0">
          {[
            {
              icon: <FolderPlus className="h-5 w-5" />,
              title: "Create a project",
              body: "A project is just a folder for one piece of research — \"Essay sources\", \"Competitor watch\", anything. Click “New project” on your dashboard and give it a name.",
            },
            {
              icon: <Globe className="h-5 w-5" />,
              title: "Paste the web addresses",
              body: "Copy the URL from your browser's address bar for each page you care about, and paste them in — one per line, up to 10 per run. Tick what you want captured (metadata, headings, text, links) and press “Extract content”.",
            },
            {
              icon: <Sparkles className="h-5 w-5" />,
              title: "Watch the extraction happen",
              body: "Each address shows its own live status: queued → processing → completed. If one page fails (it happens — some sites block robots, some addresses are wrong), the others are still saved. Nothing is lost.",
            },
            {
              icon: <Search className="h-5 w-5" />,
              title: "Explore your structured results",
              body: "The results workspace has tabs: Overview (the big picture), Pages (full text), Headings (each page's outline), Links (everything the pages point to). Search by keyword, filter by page or heading level, copy anything, and open the original source in one click.",
            },
            {
              icon: <MessageSquareQuote className="h-5 w-5" />,
              title: "Ask questions in the Chat tab",
              body: "Type a question like “What are these pages about?”. The answer comes only from your saved pages, with clickable citations showing exactly which page said it. If your pages don't contain the answer, Joink says so honestly instead of making something up.",
            },
            {
              icon: <Mic className="h-5 w-5" />,
              title: "Or just speak your question",
              body: "Press the microphone, talk, and your words appear as editable text. Check the transcript, press send, and optionally have the answer read aloud. If your browser doesn't support voice, typing always works.",
            },
            {
              icon: <Download className="h-5 w-5" />,
              title: "Export and come back anytime",
              body: "Everything is saved automatically — close the tab and reopen it from your dashboard whenever. Need it elsewhere? Export to JSON or CSV (spreadsheet-ready); every row includes the source URL and timestamp.",
            },
          ].map((step, index, all) => (
            <li key={step.title} className="relative flex gap-4">
              <div className="flex flex-col items-center">
                <span className="z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white">
                  {step.icon}
                </span>
                {index < all.length - 1 && <span className="w-px flex-1 bg-indigo-200" aria-hidden />}
              </div>
              <div className="pb-8">
                <h3 className="pt-2 font-semibold text-slate-900">
                  {index + 1}. {step.title}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-5 text-center">
          <p className="text-sm font-medium text-indigo-900">
            Want to see it filled in before adding your own links? Press{" "}
            <strong>“Load demo project”</strong> on the dashboard — it creates a ready-made example
            with three extracted pages, one failed address, and a sample cited conversation.
          </p>
        </div>
      </section>

      {/* Flow diagram */}
      <section className="mx-auto max-w-3xl">
        <h2 className="text-center text-2xl font-bold text-slate-900">The whole idea, in one picture</h2>
        <div className="mt-6 flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
          {[
            ["🔗", "Web addresses", "the pages you found"],
            ["🤖", "Joink extracts", "politely & safely"],
            ["🗂️", "Structured results", "titles, text, links + sources"],
            ["💬", "Answers & exports", "cited chat, JSON, CSV"],
          ].map(([emoji, title, sub], i, all) => (
            <div key={title} className="flex flex-1 flex-col items-center gap-2 sm:flex-row">
              <div className="w-full rounded-xl border border-slate-200 bg-white p-4 text-center">
                <div className="text-2xl" aria-hidden>{emoji}</div>
                <div className="mt-1 text-sm font-semibold text-slate-800">{title}</div>
                <div className="text-xs text-slate-500">{sub}</div>
              </div>
              {i < all.length - 1 && (
                <>
                  <ArrowRight className="hidden h-5 w-5 shrink-0 text-indigo-400 sm:block" aria-hidden />
                  <ArrowDown className="h-5 w-5 shrink-0 text-indigo-400 sm:hidden" aria-hidden />
                </>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl">
        <h2 className="text-center text-2xl font-bold text-slate-900">Frequently asked questions</h2>
        <div className="mt-6 space-y-3">
          {FAQ_ITEMS.map((item) => (
            <details key={item.q} className="group rounded-xl border border-slate-200 bg-white p-5">
              <summary className="cursor-pointer text-sm font-semibold text-slate-800 group-open:text-indigo-700">
                {item.q}
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Responsible note + CTA */}
      <section className="mx-auto max-w-2xl text-center">
        <ShieldCheck className="mx-auto h-8 w-8 text-indigo-600" aria-hidden />
        <p className="mt-3 text-sm text-slate-600">
          Joink only reads <strong className="text-slate-800">public</strong> pages, identifies itself honestly,
          respects sites&apos; robots rules, and never breaks through logins, paywalls or CAPTCHAs.
          Good research starts with good manners.
        </p>
        <Link
          href={signedIn ? "/dashboard" : "/sign-up"}
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-indigo-700"
        >
          {signedIn ? "Go to your dashboard" : "Try it yourself — it's free"}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </section>
    </div>
  );
}

const FAQ_ITEMS = [
  {
    q: "I've never used a tool like this. Is it complicated?",
    a: "No. If you can copy a link from your browser and paste it into a box, you can use Joink. The dashboard walks you through it, and the “Load demo project” button shows you a finished example before you start.",
  },
  {
    q: "What exactly is a URL?",
    a: "It's just a web address — the text in the bar at the top of your browser, like https://en.wikipedia.org/wiki/Chai. Copy it from any page you want Joink to read.",
  },
  {
    q: "Is web scraping legal? Am I doing something shady?",
    a: "Reading public webpages is what your browser does every day — Joink just organizes what's already publicly visible. It refuses private/internal addresses, honours sites' robots.txt wishes, never bypasses logins or paywalls, and rate-limits itself. You should still use the extracted content in line with each site's terms and your local laws, just as with manual copying.",
  },
  {
    q: "What does “traceable” mean and why should I care?",
    a: "Every fact Joink saves carries its source link, the exact time it was captured, and a confidence indicator. When someone asks “says who?”, you can answer with a click. Copy-pasting by hand loses all of that.",
  },
  {
    q: "What can I do with the results?",
    a: "Read and search them in the workspace, ask questions in plain language (typed or spoken) and get cited answers, copy anything to your clipboard, or export everything as JSON or CSV to open in Excel, Google Sheets, or your own tools.",
  },
  {
    q: "What's the Chat tab? Is it like ChatGPT?",
    a: "Similar to talk to, but with one big difference: it answers only from the pages you saved, and shows citations for every claim. If your saved pages don't contain the answer, it tells you that instead of guessing.",
  },
  {
    q: "Why did one of my pages fail?",
    a: "Common reasons: the address was mistyped, the site blocks automated readers (robots.txt), the page needs a login, or it's not a public webpage. A failed page never affects the others in the run — their results are still saved.",
  },
  {
    q: "Why is some text marked “partial” or low confidence?",
    a: "Some modern sites build their text with JavaScript after the page loads, so a simple read catches only part of it. Joink saves what it can, marks it honestly, and explains why — no silent gaps.",
  },
  {
    q: "Do I have to pay?",
    a: "No — the Free plan includes 3 projects and 5 page extractions a month, plus chat and voice questions. Pro (₹499/month) raises the limits and unlocks CSV export. Prices are set on the server and payments run through Razorpay.",
  },
  {
    q: "Is my research private?",
    a: "Yes. Your projects, results and conversations belong to your account only — enforced in the database itself (row-level security), not just in the interface. Voice questions are transcribed in your browser; raw audio is never uploaded or stored.",
  },
] as const;
