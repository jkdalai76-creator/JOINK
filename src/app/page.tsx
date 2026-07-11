import Link from "next/link";
import {
  ArrowRight,
  Download,
  FileSearch,
  Globe,
  MessageSquareQuote,
  Mic,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { PLAN_CATALOG, formatINR } from "@/lib/plans";
import { Logo } from "@/components/app-shell";

export default async function LandingPage() {
  const user = await getCurrentUser();
  const cta = user ? "/dashboard" : "/sign-up";

  return (
    <div className="bg-white text-slate-900">
      <header className="border-b border-slate-100">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Logo className="text-lg" />
          <nav className="flex items-center gap-2" aria-label="Main">
            <Link
              href="/pricing"
              className="hidden rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 sm:block"
            >
              Pricing
            </Link>
            {user ? (
              <Link
                href="/dashboard"
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
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
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                >
                  Sign up
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pt-20 pb-16 text-center">
        <p className="mx-auto mb-4 inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
          <Sparkles className="h-3.5 w-3.5" aria-hidden />
          Structured, traceable web research
        </p>
        <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
          Turn any public webpage into structured, source-linked research
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600">
          Joink extracts titles, headings, readable text and links from websites, keeps every
          result traceable to its source, and lets you question your saved research by text or
          voice — with citations.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href={cta}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-indigo-700"
          >
            Start scraping
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          <Link
            href="/pricing"
            className="rounded-lg border border-slate-300 px-6 py-3 text-base font-medium text-slate-700 hover:bg-slate-50"
          >
            View pricing
          </Link>
        </div>
      </section>

      {/* Three steps */}
      <section className="border-y border-slate-100 bg-slate-50 py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-2xl font-bold">How it works</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              {
                step: "1",
                title: "Paste your URLs",
                body: "Create a project and add up to 10 public webpage URLs per run — one per line.",
              },
              {
                step: "2",
                title: "Extract & organize",
                body: "Joink safely fetches each page and structures its metadata, headings, main text and links, with per-URL status.",
              },
              {
                step: "3",
                title: "Explore & export",
                body: "Search, filter and cite your saved results, ask questions by text or voice, and export JSON or CSV.",
              },
            ].map((s) => (
              <div key={s.step} className="rounded-xl border border-slate-200 bg-white p-6">
                <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">
                  {s.step}
                </div>
                <h3 className="font-semibold">{s.title}</h3>
                <p className="mt-1.5 text-sm text-slate-600">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-center text-2xl font-bold">Built for trustworthy research</h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
              body: "Ask questions about saved extractions. Answers cite the exact saved pages — or say when evidence is missing.",
            },
            {
              icon: <Mic className="h-5 w-5" />,
              title: "Voice questions",
              body: "Speak a question, review the transcript, and hear the answer read aloud. Full text fallback included.",
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
            <div key={f.title} className="rounded-xl border border-slate-200 p-6">
              <div className="mb-3 inline-flex rounded-lg bg-indigo-50 p-2 text-indigo-600">{f.icon}</div>
              <h3 className="font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm text-slate-600">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing preview */}
      <section className="border-t border-slate-100 bg-slate-50 py-16">
        <div className="mx-auto max-w-6xl px-4 text-center">
          <h2 className="text-2xl font-bold">Simple pricing</h2>
          <p className="mt-2 text-slate-600">Start free. Upgrade when your research grows.</p>
          <div className="mx-auto mt-8 grid max-w-3xl gap-6 sm:grid-cols-2">
            {(["free", "pro"] as const).map((code) => {
              const plan = PLAN_CATALOG[code];
              return (
                <div
                  key={code}
                  className={`rounded-xl border bg-white p-6 text-left ${code === "pro" ? "border-indigo-300 ring-2 ring-indigo-100" : "border-slate-200"}`}
                >
                  <h3 className="font-semibold">{plan.name}</h3>
                  <p className="mt-2 text-3xl font-bold">
                    {plan.amount_minor === 0 ? "₹0" : formatINR(plan.amount_minor)}
                    <span className="text-sm font-normal text-slate-500">/month</span>
                  </p>
                  <ul className="mt-4 space-y-1.5 text-sm text-slate-600">
                    <li>Up to {plan.project_limit} projects</li>
                    <li>{plan.monthly_url_limit} URLs per month</li>
                    <li>{plan.features.csv_export ? "JSON & CSV export" : "JSON export"}</li>
                  </ul>
                </div>
              );
            })}
          </div>
          <Link
            href="/pricing"
            className="mt-8 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-700"
          >
            See the full comparison →
          </Link>
        </div>
      </section>

      {/* Responsible scraping */}
      <section className="mx-auto max-w-3xl px-4 py-16 text-center">
        <ShieldCheck className="mx-auto h-8 w-8 text-indigo-600" aria-hidden />
        <h2 className="mt-3 text-xl font-bold">Our responsible-scraping commitment</h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          Joink extracts only publicly accessible pages. It identifies itself with a descriptive
          user agent, honours robots.txt where practical, rate-limits requests, and never bypasses
          CAPTCHAs, paywalls, or logins. Extracted content is treated strictly as data — scripts
          from scraped pages are never executed, and instructions found inside pages are never
          followed. You are responsible for using extracted content in line with each site&apos;s
          terms and applicable law.
        </p>
      </section>

      <footer className="border-t border-slate-100 py-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 text-sm text-slate-500">
          <Logo />
          <div className="flex gap-6">
            <Link href="/pricing" className="hover:text-slate-700">Pricing</Link>
            <Link href="/sign-in" className="hover:text-slate-700">Sign in</Link>
            <Link href="/sign-up" className="hover:text-slate-700">Sign up</Link>
          </div>
          <p>Built for the Joink hackathon.</p>
        </div>
      </footer>
    </div>
  );
}
