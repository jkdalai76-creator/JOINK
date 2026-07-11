"use client";

import * as React from "react";
import { CheckCircle2, FileText, Globe, Link2, Mic, Quote, XCircle } from "lucide-react";

/**
 * Interactive 3D hero: a stylized Joink workspace rendered in pure JSX/CSS
 * (no images, nothing external) that tilts toward the cursor. Falls back to a
 * gentle static tilt on touch devices and honours prefers-reduced-motion.
 */
export function HeroVisual() {
  const sceneRef = React.useRef<HTMLDivElement>(null);
  const cardRef = React.useRef<HTMLDivElement>(null);

  function onMove(e: React.MouseEvent) {
    const scene = sceneRef.current;
    const card = cardRef.current;
    if (!scene || !card) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const rect = scene.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    card.style.transform = `rotateY(${x * 14}deg) rotateX(${-y * 10 - 4}deg)`;
  }

  function onLeave() {
    const card = cardRef.current;
    if (card) card.style.transform = "";
  }

  return (
    <div
      ref={sceneRef}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className="joink-perspective relative mx-auto w-full max-w-3xl"
      aria-hidden
    >
      {/* Ambient glows */}
      <div className="joink-glow pointer-events-none absolute -top-16 -left-10 h-64 w-64 rounded-full bg-indigo-600/30 blur-3xl" />
      <div className="joink-glow pointer-events-none absolute -right-8 -bottom-10 h-72 w-72 rounded-full bg-fuchsia-600/20 blur-3xl [animation-delay:2s]" />
      <div className="joink-glow pointer-events-none absolute top-1/3 right-1/4 h-40 w-40 rounded-full bg-sky-500/20 blur-3xl [animation-delay:4s]" />

      {/* Main workspace card */}
      <div
        ref={cardRef}
        className="joink-card-3d relative rounded-2xl border border-white/10 bg-slate-900/80 shadow-[0_40px_80px_-24px_rgba(30,27,75,0.8)] backdrop-blur-xl [transform:rotateX(-4deg)]"
      >
        {/* Browser chrome */}
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
          <div className="ml-3 flex flex-1 items-center gap-2 rounded-md bg-white/5 px-3 py-1.5 text-xs text-slate-400">
            <Globe className="h-3 w-3 text-indigo-400" />
            joink.app/runs/9f2c…
          </div>
          <span className="hidden rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-emerald-300 uppercase sm:block">
            3 / 4 extracted
          </span>
        </div>

        <div className="relative grid gap-0 overflow-hidden rounded-b-2xl sm:grid-cols-[1.15fr_1fr]">
          {/* Scanline sweep */}
          <div className="joink-scanline pointer-events-none absolute inset-x-0 top-0 h-1/4 bg-gradient-to-b from-transparent via-indigo-500/10 to-transparent" />

          {/* Left: URL extraction list */}
          <div className="space-y-2.5 border-b border-white/10 p-5 sm:border-r sm:border-b-0">
            <p className="text-[10px] font-semibold tracking-widest text-slate-500 uppercase">
              Extraction run
            </p>
            {[
              { url: "example.com/guides/scraping", ok: true },
              { url: "example.com/blog/research", ok: true },
              { url: "example.com/docs/robots", ok: true },
              { url: "intranet.internal/private", ok: false },
            ].map((row) => (
              <div
                key={row.url}
                className="flex items-center justify-between gap-3 rounded-lg border border-white/5 bg-white/[0.04] px-3 py-2"
              >
                <span className="truncate font-mono text-[11px] text-slate-300">{row.url}</span>
                {row.ok ? (
                  <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-300">
                    <CheckCircle2 className="h-3.5 w-3.5" /> done
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] font-medium text-rose-300">
                    <XCircle className="h-3.5 w-3.5" /> blocked
                  </span>
                )}
              </div>
            ))}
            <div className="flex gap-1.5 pt-1">
              {["Metadata", "Headings", "Text", "Links"].map((chip) => (
                <span
                  key={chip}
                  className="rounded-full border border-indigo-400/20 bg-indigo-500/10 px-2 py-0.5 text-[10px] text-indigo-300"
                >
                  {chip}
                </span>
              ))}
            </div>
          </div>

          {/* Right: structured outline */}
          <div className="space-y-3 p-5">
            <p className="text-[10px] font-semibold tracking-widest text-slate-500 uppercase">
              Structured result
            </p>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs text-slate-200">
                <FileText className="h-3.5 w-3.5 text-indigo-400" />
                <span className="font-semibold">Web Scraping Basics</span>
              </div>
              <div className="ml-5 h-1.5 w-11/12 rounded bg-white/10" />
              <div className="ml-5 h-1.5 w-4/5 rounded bg-white/10" />
              <div className="ml-8 flex items-center gap-1.5">
                <span className="rounded bg-fuchsia-500/20 px-1 py-px text-[9px] font-bold text-fuchsia-300">H2</span>
                <div className="h-1.5 w-2/5 rounded bg-white/15" />
              </div>
              <div className="ml-8 flex items-center gap-1.5">
                <span className="rounded bg-sky-500/20 px-1 py-px text-[9px] font-bold text-sky-300">H3</span>
                <div className="h-1.5 w-1/3 rounded bg-white/15" />
              </div>
              <div className="ml-5 flex items-center gap-2 pt-1 text-[10px] text-slate-400">
                <Link2 className="h-3 w-3 text-indigo-400" /> 38 links · 12 internal · deduplicated
              </div>
            </div>
            <div className="rounded-lg border border-white/10 bg-gradient-to-br from-indigo-500/10 to-fuchsia-500/10 p-3">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-indigo-300">
                <Quote className="h-3 w-3" /> Cited answer
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-300">
                Ethical scrapers respect robots.txt and rate-limit requests…
              </p>
              <p className="mt-1 truncate text-[9px] text-indigo-400/80 underline decoration-dotted">
                source: example.com/guides/scraping · 09:41 IST
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Floating voice chip */}
      <div className="joink-float absolute -top-8 -right-2 hidden items-center gap-2 rounded-xl border border-white/10 bg-slate-900/90 px-3 py-2 shadow-xl backdrop-blur sm:flex">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-500/20">
          <Mic className="h-3.5 w-3.5 text-rose-300" />
        </span>
        <span className="flex h-5 items-end gap-[3px]">
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className="joink-eq-bar w-[3px] rounded-full bg-rose-400/90"
              style={{ height: `${8 + (i % 3) * 5}px`, animationDelay: `${i * 0.12}s` }}
            />
          ))}
        </span>
        <span className="text-[10px] text-slate-300">&ldquo;What changed?&rdquo;</span>
      </div>

      {/* Floating confidence chip */}
      <div className="joink-float-alt absolute -bottom-6 -left-3 hidden rounded-xl border border-white/10 bg-slate-900/90 px-3 py-2 shadow-xl backdrop-blur sm:block">
        <p className="text-[9px] tracking-widest text-slate-500 uppercase">Traceability</p>
        <p className="text-[11px] font-semibold text-emerald-300">
          source ✓ &nbsp; timestamp ✓ &nbsp; confidence: high
        </p>
      </div>
    </div>
  );
}
