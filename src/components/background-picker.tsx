"use client";

import * as React from "react";
import { Palette } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Light-mode background tint picker. Sets `data-bg` on <html> (persisted in
 * localStorage; applied before first paint by the root-layout init script).
 * Tints only affect light mode, so the control hides itself while dark mode
 * is active.
 */
export const BACKGROUNDS = [
  { id: "default", label: "Classic", swatch: "#f8fafc" },
  { id: "warm", label: "Warm cream", swatch: "#faf6ee" },
  { id: "mint", label: "Mint", swatch: "#eff9f2" },
  { id: "sky", label: "Sky", swatch: "#eef6fc" },
  { id: "lavender", label: "Lavender", swatch: "#f5f2fc" },
  { id: "rose", label: "Rose", swatch: "#fdf2f5" },
] as const;

export function BackgroundPicker({ className }: { className?: string }) {
  const [open, setOpen] = React.useState(false);
  const [active, setActive] = React.useState("default");
  const [darkMode, setDarkMode] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const html = document.documentElement;
    setActive(html.dataset.bg || "default");
    setDarkMode(html.classList.contains("dark"));
    // Follow the theme toggle live so the picker hides in dark mode.
    const observer = new MutationObserver(() =>
      setDarkMode(html.classList.contains("dark")),
    );
    observer.observe(html, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  React.useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function pick(id: string) {
    setActive(id);
    if (id === "default") delete document.documentElement.dataset.bg;
    else document.documentElement.dataset.bg = id;
    try {
      localStorage.setItem("joink-bg", id);
    } catch {
      /* private mode: preference just won't persist */
    }
  }

  if (darkMode) return null;

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Change background color"
        aria-expanded={open}
        title="Change background color"
        className="rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100"
      >
        <Palette className="h-5 w-5" />
      </button>
      {open && (
        <div
          role="menu"
          aria-label="Background colors"
          className="absolute right-0 z-50 mt-2 w-44 rounded-xl border border-slate-200 bg-white p-3 shadow-xl"
        >
          <p className="mb-2 text-xs font-medium text-slate-500">Background tint</p>
          <div className="grid grid-cols-3 gap-2">
            {BACKGROUNDS.map((bg) => (
              <button
                key={bg.id}
                type="button"
                role="menuitemradio"
                aria-checked={active === bg.id}
                title={bg.label}
                onClick={() => pick(bg.id)}
                className={cn(
                  "h-9 rounded-lg border transition",
                  active === bg.id
                    ? "border-indigo-500 ring-2 ring-indigo-200"
                    : "border-slate-200 hover:border-slate-400",
                )}
                style={{ backgroundColor: bg.swatch }}
              >
                <span className="sr-only">{bg.label}</span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-[10px] text-slate-400">Applies in light mode</p>
        </div>
      )}
    </div>
  );
}
