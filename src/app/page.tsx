import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Download,
  FileSearch,
  Globe,
  MessageSquareQuote,
  Mic,
  PlayCircle,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { PLAN_CATALOG, formatINR } from "@/lib/plans";
import { Logo } from "@/components/app-shell";
import { HeroVisual } from "@/components/hero-visual";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function LandingPage() {
  const user = await getCurrentUser();
  const cta = user ? "/dashboard" : "/sign-up";

  return (
    <div className="bg-emerald-50/60 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {/* ── Header ── */}
      <header className="sticky top-0 z-40 border-b border-emerald-100 bg-white/80 backdrop-blur-xl dark:border-white/5 dark:bg-slate-950/70">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Logo className="text-lg" />
          <nav className="flex items-center gap-1.5" aria-label="Main">
            <ThemeToggle />
            <Link
              href="/guide"
              className="hidden rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 sm:block"
            >
              How it works
            </Link>
            <Link
              href="/pricing"
              className="hidden rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 sm:block"
            >
              Pricing
            </Link>
            {user ? (
              <Link
                href="/dashboard"
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-500"
              >
                Open dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/sign-in"
                  className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900"
                >
                  Sign in
                </Link>
                <Link
                  href="/sign-up"
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-500"
                >
                  Sign up
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="joink-grid-bg relative overflow-hidden">
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[34rem] w-[60rem] -translate-x-1/2 rounded-full bg-emerald-500/15 blur-[120px] dark:bg-indigo-600/20" />
        <div className="pointer-events-none absolute top-20 right-0 h-72 w-72 rounded-full bg-teal-400/10 blur-[100px] dark:bg-fuchsia-600/10" />
        <div className="relative mx-auto max-w-6xl px-4 pt-20 pb-24 text-center sm:pt-28">
          <p className="mx-auto mb-6 inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-100 px-4 py-1.5 text-xs font-medium text-emerald-800">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            Structured, traceable web research — with cited AI answers
          </p>
          <h1 className="mx-auto max-w-4xl text-4xl font-bold tracking-tight text-slate-900 sm:text-6xl">
            Turn any public webpage into{" "}
            <span className="joink-gradient-text">source-linked research</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-600">
            Joink extracts titles, headings, readable text and links from websites, keeps every
            fact traceable to its source, and answers your questions — typed or spoken — with
            real citations.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href={cta}
              className="group inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-7 py-3.5 text-base font-semibold text-white shadow-xl shadow-emerald-500/30 transition hover:bg-emerald-500 hover:shadow-2xl hover:shadow-emerald-500/40"
            >
              Start scraping
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
            </Link>
            <a
              href="/tour.html"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-white px-7 py-3.5 text-base font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-50"
            >
              <PlayCircle className="h-5 w-5 transition-transform group-hover:scale-110" aria-hidden />
              Watch the tour
            </a>
            <Link
              href="/guide"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-7 py-3.5 text-base font-medium text-slate-700 transition hover:bg-slate-100"
            >
              <BookOpen className="h-4 w-4 text-emerald-600" aria-hidden />
              New to this? Read the guide
            </Link>
          </div>

          {/* 3D product visual (always dark — it's the product window) */}
          <div className="mt-20">
            <HeroVisual />
          </div>

          {/* Fact strip (real product facts, no invented numbers) */}
          <div className="mx-auto mt-16 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["10 URLs", "per extraction run"],
              ["Source + time", "on every saved fact"],
              ["Cited answers", "text or voice"],
              ["JSON & CSV", "one-click export"],
            ].map(([big, small]) => (
              <div key={big} className="rounded-xl border border-slate-200 bg-white px-3 py-4 shadow-sm">
                <p className="text-sm font-bold text-slate-900 sm:text-base">{big}</p>
                <p className="mt-0.5 text-[11px] text-slate-500 sm:text-xs">{small}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Three steps ── */}
      <section className="relative border-t border-slate-200 py-24">
        <div className="pointer-events-none absolute top-0 right-0 h-72 w-72 rounded-full bg-teal-500/10 blur-[100px]" />
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-3xl font-bold text-slate-900">
            Three steps to <span className="joink-gradient-text">trustworthy research</span>
          </h2>
          <div className="relative mt-14 grid gap-6 md:grid-cols-3">
            <div className="pointer-events-none absolute top-10 right-[16%] left-[16%] hidden h-px bg-gradient-to-r from-emerald-500/50 via-teal-500/50 to-emerald-500/50 md:block" />
            {[
              {
                step: "01",
                title: "Paste your URLs",
                body: "Create a project and drop in up to 10 public webpage links — one per line. Choose what to capture.",
                tone: "from-emerald-600 to-emerald-500",
              },
              {
                step: "02",
                title: "Joink extracts & structures",
                body: "Each page is fetched safely and organized into metadata, headings, readable text and links — with live per-URL status.",
                tone: "from-emerald-500 to-teal-500",
              },
              {
                step: "03",
                title: "Explore, ask, export",
                body: "Search and filter results, question them by text or voice with citations, and export JSON or CSV.",
                tone: "from-teal-600 to-emerald-500",
              },
            ].map((s) => (
              <div
                key={s.step}
                className="joink-lift relative rounded-2xl border border-slate-200 bg-white p-7 shadow-sm"
              >
                <div
                  className={`mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${s.tone} text-base font-black text-white shadow-lg`}
                >
                  {s.step}
                </div>
                <h3 className="text-lg font-semibold text-slate-900">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="relative border-t border-slate-200 py-24">
        <div className="pointer-events-none absolute bottom-0 left-0 h-72 w-72 rounded-full bg-emerald-500/10 blur-[100px]" />
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-3xl font-bold text-slate-900">
            Built for people who cite their sources
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-slate-600">
            Students, researchers, marketers, job seekers and analysts — anyone who needs web
            information they can defend.
          </p>
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: <Globe className="h-5 w-5" />,
                title: "Structured extraction",
                body: "Page titles, meta descriptions, H1–H3 outlines, readable text and deduplicated absolute links.",
              },
              {
                icon: <FileSearch className="h-5 w-5" />,
                title: "Traceable results",
                body: "Every extraction keeps its source URL, timestamp, method, status and a confidence indicator.",
              },
              {
                icon: <MessageSquareQuote className="h-5 w-5" />,
                title: "Grounded chat",
                body: "Ask questions about saved extractions. Answers cite the exact saved pages — or honestly say when evidence is missing.",
              },
              {
                icon: <Mic className="h-5 w-5" />,
                title: "Voice questions",
                body: "Speak a question, review the transcript, hear the answer read aloud. Full text fallback included.",
              },
              {
                icon: <Download className="h-5 w-5" />,
                title: "JSON & CSV export",
                body: "Take your structured results anywhere — every export includes source URLs and timestamps.",
              },
              {
                icon: <ShieldCheck className="h-5 w-5" />,
                title: "Responsible scraping",
                body: "Rate-limited, robots.txt-aware extraction of public pages only. No CAPTCHA, paywall or login bypass — ever.",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="joink-lift group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="mb-4 inline-flex rounded-xl bg-emerald-100 p-2.5 text-emerald-700">{f.icon}</div>
                <h3 className="font-semibold text-slate-900">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing preview ── */}
      <section className="relative border-t border-slate-200 py-24">
        <div className="mx-auto max-w-6xl px-4 text-center">
          <h2 className="text-3xl font-bold text-slate-900">Simple pricing</h2>
          <p className="mt-3 text-slate-600">Start free. Upgrade when your research grows.</p>
          <div className="mx-auto mt-12 grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {(["free", "pro", "team"] as const).map((code) => {
              const plan = PLAN_CATALOG[code];
              const isPro = code === "pro";
              const isTeam = code === "team";
              return (
                <div
                  key={code}
                  className={`joink-lift relative rounded-2xl border bg-white p-8 text-left shadow-sm ${
                    isPro ? "border-emerald-300 ring-2 ring-emerald-100" : "border-slate-200"
                  }`}
                >
                  {isPro && (
                    <span className="absolute -top-3 left-8 rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-bold text-white shadow-lg">
                      MOST POPULAR
                    </span>
                  )}
                  <h3 className="text-lg font-semibold text-slate-900">{plan.name}</h3>
                  <p className="mt-3 text-4xl font-bold text-slate-900">
                    {plan.amount_minor === 0 ? "₹0" : formatINR(plan.amount_minor)}
                    <span className="text-sm font-normal text-slate-500">/month</span>
                  </p>
                  <ul className="mt-6 space-y-2.5 text-sm text-slate-700">
                    <li>✦ Up to {plan.project_limit} projects</li>
                    <li>✦ {plan.monthly_url_limit} URLs per month</li>
                    <li>✦ {plan.features.csv_export ? "JSON & CSV export" : "JSON export"}</li>
                    <li>✦ Grounded chat & voice questions</li>
                    {isTeam && <li>✦ Shared projects (up to 5 members)</li>}
                  </ul>
                </div>
              );
            })}
          </div>
          <Link
            href="/pricing"
            className="mt-10 inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 transition hover:text-emerald-800"
          >
            See the full comparison <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </section>

      {/* ── Responsible scraping ── */}
      <section className="relative border-t border-slate-200 py-24">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <div className="mx-auto inline-flex rounded-2xl bg-gradient-to-br from-indigo-500/15 to-emerald-500/15 p-4">
            <ShieldCheck className="h-8 w-8 text-emerald-600" aria-hidden />
          </div>
          <h2 className="mt-5 text-2xl font-bold text-slate-900">
            Our responsible-scraping commitment
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-slate-600">
            Joink extracts only publicly accessible pages. It identifies itself with a descriptive
            user agent, honours robots.txt where practical, rate-limits requests, and never
            bypasses CAPTCHAs, paywalls, or logins. Extracted content is treated strictly as data —
            scripts from scraped pages are never executed, and instructions found inside pages are
            never followed. You are responsible for using extracted content in line with each
            site&apos;s terms and applicable law.
          </p>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="relative overflow-hidden border-t border-slate-200 py-20">
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-indigo-600/15 to-transparent" />
        <div className="relative mx-auto max-w-3xl px-4 text-center">
          <h2 className="text-3xl font-bold text-slate-900">
            Stop copy-pasting. Start <span className="joink-gradient-text">citing</span>.
          </h2>
          <Link
            href={cta}
            className="group mt-8 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-8 py-4 text-lg font-semibold text-white shadow-xl shadow-emerald-500/30 transition hover:bg-emerald-500 hover:shadow-2xl hover:shadow-emerald-500/40"
          >
            {user ? "Open your dashboard" : "Create your free account"}
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" aria-hidden />
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-200 py-10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 text-sm text-slate-500">
          <Logo />
          <div className="flex gap-6">
            <a href="/tour.html" target="_blank" rel="noopener noreferrer" className="transition hover:text-slate-700">Product tour</a>
            <Link href="/guide" className="transition hover:text-slate-700">Guide & FAQ</Link>
            <Link href="/pricing" className="transition hover:text-slate-700">Pricing</Link>
            <Link href="/sign-in" className="transition hover:text-slate-700">Sign in</Link>
            <Link href="/sign-up" className="transition hover:text-slate-700">Sign up</Link>
          </div>
          <p>Built for the Joink hackathon.</p>
        </div>
      </footer>
    </div>
  );
}
