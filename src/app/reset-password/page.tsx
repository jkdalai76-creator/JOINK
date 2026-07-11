"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { api } from "@/lib/client";
import { Alert, Button, Input, Label } from "@/components/ui";
import { Logo } from "@/components/app-shell";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) return setError("The two passwords don't match.");
    setLoading(true);
    const res = await api("/api/auth/update-password", { method: "POST", json: { password } });
    setLoading(false);
    if (!res.success) {
      setError(
        res.error.code === "unauthorized"
          ? "This reset link has expired or was already used. Request a new one."
          : res.error.message,
      );
      return;
    }
    setDone(true);
    setTimeout(() => {
      router.push("/dashboard");
      router.refresh();
    }, 1500);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" aria-label="Joink home">
            <Logo className="text-xl" />
          </Link>
          <h1 className="mt-4 text-2xl font-bold text-slate-900">Choose a new password</h1>
          <p className="mt-1 text-sm text-slate-500">Enter a new password for your account.</p>
        </div>

        {done ? (
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <Alert tone="success">Password updated! Taking you to your dashboard…</Alert>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            {error && (
              <Alert tone="error">
                {error}
                {error.includes("expired") && (
                  <>
                    {" "}
                    <Link className="font-medium underline" href="/forgot-password">Request a new link</Link>.
                  </>
                )}
              </Alert>
            )}
            <div>
              <Label htmlFor="password">New password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>
            <div>
              <Label htmlFor="confirm">Confirm new password</Label>
              <Input
                id="confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Re-enter your new password"
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>
            <Button type="submit" className="w-full" loading={loading}>
              Update password
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
