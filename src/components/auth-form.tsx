"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { api } from "@/lib/client";
import { Alert, Button, Input, Label } from "@/components/ui";
import { Logo } from "@/components/app-shell";

export function AuthForm({ mode, demoAvailable }: { mode: "sign-in" | "sign-up"; demoAvailable: boolean }) {
  const router = useRouter();
  const [displayName, setDisplayName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [demoLoading, setDemoLoading] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const path = mode === "sign-up" ? "/api/auth/sign-up" : "/api/auth/sign-in";
    const body = mode === "sign-up" ? { email, password, displayName } : { email, password };
    const res = await api<{ needsEmailConfirmation?: boolean }>(path, { method: "POST", json: body });
    setLoading(false);
    if (!res.success) {
      setError(res.error.message);
      return;
    }
    if (res.data.needsEmailConfirmation) {
      setNotice("Check your inbox to confirm your email, then sign in.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  async function tryDemo() {
    setDemoLoading(true);
    setError(null);
    const res = await api("/api/auth/demo", { method: "POST" });
    setDemoLoading(false);
    if (!res.success) {
      setError(res.error.message);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" aria-label="Joink home">
            <Logo className="text-xl" />
          </Link>
          <h1 className="mt-4 text-2xl font-bold text-slate-900">
            {mode === "sign-up" ? "Create your account" : "Welcome back"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {mode === "sign-up"
              ? "Start extracting structured web research in minutes."
              : "Sign in to your research workspace."}
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          {error && <Alert tone="error">{error}</Alert>}
          {notice && <Alert tone="success">{notice}</Alert>}
          {mode === "sign-up" && (
            <div>
              <Label htmlFor="displayName">Name</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Ada Lovelace"
                autoComplete="name"
                required
              />
            </div>
          )}
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === "sign-up" ? "At least 8 characters" : "Your password"}
              autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
              minLength={mode === "sign-up" ? 8 : undefined}
              required
            />
          </div>
          <Button type="submit" className="w-full" loading={loading}>
            {mode === "sign-up" ? "Create account" : "Sign in"}
          </Button>
          {demoAvailable && (
            <Button type="button" variant="outline" className="w-full" loading={demoLoading} onClick={tryDemo}>
              Try the demo account
            </Button>
          )}
        </form>

        <p className="mt-4 text-center text-sm text-slate-500">
          {mode === "sign-up" ? (
            <>Already have an account? <Link className="font-medium text-indigo-600" href="/sign-in">Sign in</Link></>
          ) : (
            <>New to Joink? <Link className="font-medium text-indigo-600" href="/sign-up">Create an account</Link></>
          )}
        </p>
      </div>
    </div>
  );
}
