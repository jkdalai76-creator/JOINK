import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { runtimeMode } from "@/lib/env";
import { AppShell } from "@/components/app-shell";
import { PricingClient } from "@/components/pricing-client";
import { Logo } from "@/components/app-shell";

export const metadata = { title: "Pricing" };

export default async function PricingPage() {
  const user = await getCurrentUser();
  const mode = runtimeMode();

  const content = <PricingClient signedIn={Boolean(user)} />;

  if (user) {
    return (
      <AppShell user={user} mode={mode}>
        {content}
      </AppShell>
    );
  }
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link href="/"><Logo /></Link>
          <nav className="flex gap-2">
            <Link href="/sign-in" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900">Sign in</Link>
            <Link href="/sign-up" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">Sign up</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-10">{content}</main>
    </div>
  );
}
