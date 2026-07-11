"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Light/dark theme toggle. The chosen theme is stored in localStorage and
 * applied as a `dark` class on <html>; a tiny inline script in the root
 * layout applies it before first paint so there is no flash. With no stored
 * choice, the OS preference wins.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const [dark, setDark] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("joink-theme", next ? "dark" : "light");
    } catch {
      /* private mode: theme just won't persist */
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
      className={cn(
        "rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100",
        className,
      )}
    >
      {/* Render both icons stacked to avoid a hydration flash; CSS decides. */}
      <span className="relative block h-5 w-5">
        <Sun className={cn("absolute inset-0 h-5 w-5 transition-opacity", dark ? "opacity-100" : "opacity-0")} />
        <Moon className={cn("absolute inset-0 h-5 w-5 transition-opacity", dark ? "opacity-0" : "opacity-100")} />
      </span>
    </button>
  );
}
