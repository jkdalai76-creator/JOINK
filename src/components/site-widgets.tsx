"use client";

import { usePathname } from "next/navigation";
import * as React from "react";
import { MessageSquarePlus, Users, X } from "lucide-react";
import { api } from "@/lib/client";
import { Alert, Button, Input, Label, Textarea } from "@/components/ui";

let visitPosted = false; // once per page load, cookie makes it once per visitor

/**
 * Site-wide floating widgets (bottom-right): the cumulative unique-visitor
 * counter and a feedback button. Mounted from the root layout so they appear
 * on every page. Visitors are counted via an anonymous httpOnly cookie — no
 * personal data is stored.
 */
export function SiteWidgets() {
  const pathname = usePathname();
  const [total, setTotal] = React.useState<number | null>(null);
  const [open, setOpen] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [sent, setSent] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (visitPosted) return;
    visitPosted = true;
    void api<{ total: number }>("/api/stats/visit", { method: "POST" }).then((res) => {
      if (res.success) setTotal(res.data.total);
    });
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSending(true);
    const res = await api("/api/feedback", {
      method: "POST",
      json: { message: message.trim(), email: email.trim(), page: pathname },
    });
    setSending(false);
    if (!res.success) return setError(res.error.message);
    setSent(true);
    setMessage("");
    setEmail("");
  }

  return (
    <div className="fixed right-4 bottom-4 z-50 flex flex-col items-end gap-2 print:hidden">
      {open && (
        <div className="w-80 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Help us improve Joink</h2>
            <button
              onClick={() => {
                setOpen(false);
                setSent(false);
                setError(null);
              }}
              aria-label="Close feedback form"
              className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {sent ? (
            <Alert tone="success">
              Thank you! Your feedback was recorded — it genuinely shapes what we build next.
            </Alert>
          ) : (
            <form onSubmit={submit} className="space-y-3">
              {error && <Alert tone="error">{error}</Alert>}
              <div>
                <Label htmlFor="feedback-message">What could be better?</Label>
                <Textarea
                  id="feedback-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="An idea, a bug, something confusing…"
                  rows={4}
                  maxLength={2000}
                  required
                />
              </div>
              <div>
                <Label htmlFor="feedback-email">Email (optional, for follow-up)</Label>
                <Input
                  id="feedback-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  maxLength={200}
                />
              </div>
              <Button type="submit" size="sm" className="w-full" loading={sending} disabled={message.trim().length < 3}>
                Send feedback
              </Button>
            </form>
          )}
        </div>
      )}

      <div className="flex items-center gap-2">
        {total !== null && total > 0 && (
          <span
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-lg"
            title="Cumulative unique visitors"
          >
            <Users className="h-3.5 w-3.5 text-indigo-500" aria-hidden />
            {total.toLocaleString("en-IN")} visitor{total === 1 ? "" : "s"}
          </span>
        )}
        <button
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="inline-flex items-center gap-1.5 rounded-full bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xl shadow-indigo-500/30 transition hover:bg-indigo-500"
        >
          <MessageSquarePlus className="h-4 w-4" aria-hidden />
          Feedback
        </button>
      </div>
    </div>
  );
}
