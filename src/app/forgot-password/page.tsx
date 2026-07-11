"use client";

import Link from "next/link";
import * as React from "react";
import { api } from "@/lib/client";
import { Alert, Button, Input, Label } from "@/components/ui";
import { Logo } from "@/components/app-shell";

export default function ForgotPasswordPage() {
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [sent, setSent] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await api("/api/auth/reset-request", { method: "POST", json: { email } });
    setLoading(false);
    if (!res.success) return setError(res.error.message);
    setSent(true);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" aria-label="Joink home">
            <Logo className="text-xl" />
          </Link>
          <h1 className="mt-4 text-2xl font-bold text-slate-900">Reset your password</h1>
          <p className="mt-1 text-sm text-slate-500">
            Enter your email and we&apos;ll send you a link to set a new password.
          </p>
        </div>

        {sent ? (
          <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <Alert tone="success">
              If an account exists for <strong>{email}</strong>, a reset link is on its way.
              Check your inbox (and spam). Click the link, then choose a new password.
            </Alert>
            <p className="text-xs text-slate-500">
              Didn&apos;t get it within a few minutes? Password emails depend on the site&apos;s
              email setup — see the note on the sign-in page, or contact the site owner.
            </p>
            <Link href="/sign-in">
              <Button variant="outline" className="w-full">Back to sign in</Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            {error && <Alert tone="error">{error}</Alert>}
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
            <Button type="submit" className="w-full" loading={loading}>
              Send reset link
            </Button>
          </form>
        )}

        <p className="mt-4 text-center text-sm text-slate-500">
          Remembered it? <Link className="font-medium text-indigo-600" href="/sign-in">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
