"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { FlaskConical, LogOut, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/client";
import { ThemeToggle } from "@/components/theme-toggle";
import { BackgroundPicker } from "@/components/background-picker";
import type { SessionUser } from "@/lib/auth";
import type { RuntimeMode } from "@/lib/env";

const NAV = [
  { href: "/dashboard", label: "Home" },
  { href: "/explore?feed=news", label: "News" },
  { href: "/explore?feed=popular", label: "Popular" },
  { href: "/explore?feed=explore", label: "Explore" },
  { href: "/projects/new", label: "New project" },
  { href: "/pricing", label: "Pricing" },
  { href: "/billing", label: "Billing" },
  { href: "/guide", label: "Guide" },
];

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-bold tracking-tight", className)}>
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-sm text-white">
        J
      </span>
      Joink
    </span>
  );
}

export function AppShell({
  user,
  mode,
  children,
}: {
  user: SessionUser;
  mode: RuntimeMode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [signingOut, setSigningOut] = React.useState(false);

  function isActive(href: string): boolean {
    const [path, query] = href.split("?");
    if (pathname !== path) return false;
    if (!query) return true;
    const wantFeed = new URLSearchParams(query).get("feed");
    return (searchParams.get("feed") ?? "news") === wantFeed;
  }

  async function signOut() {
    setSigningOut(true);
    await api("/api/auth/sign-out", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {mode.demoMode && (
        <div className="bg-indigo-600 px-4 py-1.5 text-center text-xs font-medium text-white">
          <FlaskConical className="mr-1 inline h-3.5 w-3.5" aria-hidden />
          Demo mode — no database configured. Data lives in memory and resets when the
          server restarts.
        </div>
      )}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="text-slate-900">
              <Logo />
            </Link>
            <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                    isActive(item.href)
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="hidden items-center gap-3 md:flex">
            <BackgroundPicker />
            <ThemeToggle />
            <span className="text-sm text-slate-500">{user.display_name}</span>
            <button
              onClick={signOut}
              disabled={signingOut}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              <LogOut className="h-4 w-4" aria-hidden />
              Sign out
            </button>
          </div>
          <div className="flex items-center gap-1 md:hidden">
          <BackgroundPicker />
          <ThemeToggle />
          <button
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          </div>
        </div>
        {menuOpen && (
          <nav className="border-t border-slate-200 bg-white px-4 py-3 md:hidden" aria-label="Mobile">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className={cn(
                  "block rounded-lg px-3 py-2 text-sm font-medium",
                  isActive(item.href) ? "bg-indigo-50 text-indigo-700" : "text-slate-600",
                )}
              >
                {item.label}
              </Link>
            ))}
            <button
              onClick={signOut}
              className="mt-1 block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-600"
            >
              Sign out ({user.display_name})
            </button>
          </nav>
        )}
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
