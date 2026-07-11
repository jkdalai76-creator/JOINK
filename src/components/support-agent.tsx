"use client";

import * as React from "react";
import { Bot, Send, Sparkles, Volume2, VolumeX, X } from "lucide-react";
import { api } from "@/lib/client";
import { Alert, Button, Spinner, Textarea } from "@/components/ui";
import { VoiceButton, useSpeech } from "@/components/voice-button";

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
  mode?: "text" | "voice";
}

const GREETING: ChatMsg = {
  role: "assistant",
  content:
    "Hi! I'm Joink's assistant. Ask me anything about using Joink — creating projects, extracting URLs, grounded chat, voice, export or plans. You can type or press the mic to talk.",
};

const SUGGESTIONS = [
  "How do I extract a website?",
  "What's the difference between Free and Pro?",
  "How does voice work?",
  "Why did one of my URLs fail?",
];

/**
 * Floating AI voice-agent support chatbot, available on every page. Answers
 * from Joink's product knowledge base (never from scraped content). Supports
 * typed and spoken questions and can read answers aloud. Works without an AI
 * key via a keyword fallback.
 */
export function SupportAgent() {
  const [open, setOpen] = React.useState(false);
  const [messages, setMessages] = React.useState<ChatMsg[]>([GREETING]);
  const [input, setInput] = React.useState("");
  const [inputMode, setInputMode] = React.useState<"text" | "voice">("text");
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [readAloud, setReadAloud] = React.useState(false);
  const speech = useSpeech();
  const bottomRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, sending, open]);

  async function ask(question: string, mode: "text" | "voice") {
    const q = question.trim();
    if (!q || sending) return;
    setError(null);
    setInput("");
    setInputMode("text");
    const history = messages
      .filter((m) => m !== GREETING)
      .map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, { role: "user", content: q, mode }]);
    setSending(true);
    const res = await api<{ answer: string }>("/api/support", {
      method: "POST",
      json: { question: q, history },
    });
    setSending(false);
    if (!res.success) {
      setError(res.error.message);
      return;
    }
    setMessages((prev) => [...prev, { role: "assistant", content: res.data.answer }]);
    if (readAloud) speech.speak(res.data.answer);
  }

  return (
    <div className="fixed right-4 bottom-20 z-50 flex flex-col items-end gap-2 print:hidden sm:bottom-4 sm:right-40">
      {open && (
        <div className="flex h-[30rem] w-[22rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between bg-indigo-600 px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                <Bot className="h-4 w-4" aria-hidden />
              </span>
              <div>
                <p className="text-sm font-semibold leading-tight">Joink Assistant</p>
                <p className="text-[11px] text-indigo-100">Voice & text support</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setReadAloud((v) => !v)}
                disabled={!speech.supported}
                aria-pressed={readAloud}
                title={readAloud ? "Reading answers aloud" : "Read answers aloud"}
                className="rounded-md p-1.5 hover:bg-white/15 disabled:opacity-40"
              >
                {readAloud ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </button>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close assistant"
                className="rounded-md p-1.5 hover:bg-white/15"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 px-3 py-3" aria-live="polite">
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={
                    m.role === "user"
                      ? "max-w-[85%] rounded-2xl rounded-br-sm bg-indigo-600 px-3 py-2 text-sm text-white"
                      : "max-w-[90%] rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                  }
                >
                  {m.role === "user" && m.mode === "voice" && (
                    <span className="mb-0.5 block text-[10px] text-indigo-100">🎤 asked by voice</span>
                  )}
                  {m.content}
                </div>
              </div>
            ))}
            {messages.length === 1 && (
              <div className="space-y-1.5 pt-1">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => ask(s, "text")}
                    className="flex w-full items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-left text-xs text-slate-600 hover:border-indigo-300 hover:text-indigo-700"
                  >
                    <Sparkles className="h-3 w-3 text-indigo-500" aria-hidden />
                    {s}
                  </button>
                ))}
              </div>
            )}
            {sending && (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Spinner className="h-3.5 w-3.5" /> Thinking…
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {error && <Alert tone="error" className="mx-3 mb-1 text-xs">{error}</Alert>}

          {/* Composer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void ask(input, inputMode);
            }}
            className="border-t border-slate-200 p-2"
          >
            <div className="flex items-end gap-1.5">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void ask(input, inputMode);
                  }
                }}
                placeholder={inputMode === "voice" ? "Review your transcript…" : "Ask about using Joink…"}
                rows={1}
                className="max-h-24 flex-1 resize-none text-sm"
                aria-label="Ask the Joink assistant"
              />
              <VoiceButton
                disabled={sending}
                onTranscript={(t) => {
                  setInput(t);
                  setInputMode("voice");
                }}
              />
              <Button type="submit" size="sm" loading={sending} disabled={!input.trim()} aria-label="Send">
                <Send className="h-4 w-4" aria-hidden />
              </Button>
            </div>
            {inputMode === "voice" && input && (
              <p className="mt-1 px-1 text-[10px] text-indigo-600">Voice transcript ready — edit or send.</p>
            )}
          </form>
        </div>
      )}

      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-full bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xl shadow-indigo-500/30 transition hover:bg-indigo-500"
          aria-label="Open Joink support assistant"
        >
          <Bot className="h-4 w-4" aria-hidden />
          Ask Joink
        </button>
      )}
    </div>
  );
}
