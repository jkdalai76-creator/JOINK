"use client";

import * as React from "react";
import { ExternalLink, Send, Volume2, VolumeX } from "lucide-react";
import { api } from "@/lib/client";
import type { Citation, Conversation, Message } from "@/lib/types";
import { Alert, Button, Spinner, Textarea } from "@/components/ui";
import { VoiceButton, useSpeech } from "@/components/voice-button";

export function ChatPanel({
  runId,
  initialConversations,
  aiConfigured,
}: {
  runId: string;
  initialConversations: Conversation[];
  aiConfigured: boolean;
}) {
  const [conversation, setConversation] = React.useState<Conversation | null>(
    initialConversations[0] ?? null,
  );
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [loadingHistory, setLoadingHistory] = React.useState(Boolean(initialConversations[0]));
  const [input, setInput] = React.useState("");
  const [inputMode, setInputMode] = React.useState<"text" | "voice">("text");
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [readAloud, setReadAloud] = React.useState(false);
  const speech = useSpeech();
  const bottomRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!conversation) return;
    let cancelled = false;
    (async () => {
      const res = await api<{ messages: Message[] }>(`/api/conversations/${conversation.id}/messages`);
      if (!cancelled) {
        setLoadingHistory(false);
        if (res.success) setMessages(res.data.messages);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation?.id]);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, sending]);

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    const question = input.trim();
    if (!question || sending) return;
    setError(null);
    setSending(true);

    let conv = conversation;
    if (!conv) {
      const created = await api<{ conversation: Conversation }>("/api/conversations", {
        method: "POST",
        json: { scrapeRunId: runId, title: question.slice(0, 60) },
      });
      if (!created.success) {
        setSending(false);
        return setError(created.error.message);
      }
      conv = created.data.conversation;
      setConversation(conv);
      setLoadingHistory(false);
    }

    const res = await api<{ userMessage: Message; assistantMessage: Message }>(
      `/api/conversations/${conv.id}/messages`,
      { method: "POST", json: { question, inputMode } },
    );
    setSending(false);
    setInputMode("text");
    if (!res.success) return setError(res.error.message);
    setInput("");
    setMessages((prev) => [...prev, res.data.userMessage, res.data.assistantMessage]);
    if (readAloud) speech.speak(res.data.assistantMessage.content);
  }

  return (
    <div className="flex h-[36rem] flex-col rounded-xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Ask about this extraction</h3>
          <p className="text-xs text-slate-500">
            Answers use only the saved content of this run and cite their sources.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={readAloud}
              onChange={(e) => setReadAloud(e.target.checked)}
              className="h-3.5 w-3.5 accent-indigo-600"
              disabled={!speech.supported}
            />
            Read answers aloud
          </label>
          {speech.speaking && (
            <Button variant="outline" size="sm" onClick={speech.stop}>
              <VolumeX className="h-3.5 w-3.5" aria-hidden /> Stop speaking
            </Button>
          )}
        </div>
      </div>

      {!aiConfigured && (
        <Alert tone="info" className="m-3">
          <strong>AI is not configured</strong> — set <code>AI_API_KEY</code> to enable model
          answers. Until then, questions return the most relevant saved excerpts with citations,
          and everything else (scraping, saving, search, export) works normally.
        </Alert>
      )}

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4" aria-live="polite">
        {loadingHistory ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : messages.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-500">
            <p className="font-medium text-slate-700">No questions yet</p>
            <p className="mt-1">
              Try “What are the main topics across these pages?” — type it or press the mic.
            </p>
          </div>
        ) : (
          messages.map((message) => <MessageBubble key={message.id} message={message} />)
        )}
        {sending && (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Spinner className="h-4 w-4" /> Thinking…
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {error && <Alert tone="error" className="mx-3 mb-2">{error}</Alert>}

      <form onSubmit={send} className="border-t border-slate-200 p-3">
        <div className="flex items-end gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            placeholder={
              inputMode === "voice"
                ? "Edit your transcript, then press send…"
                : "Ask a question about the saved pages…"
            }
            rows={2}
            className="flex-1 resize-none"
            aria-label="Chat question"
          />
          <div className="flex items-center gap-1.5 pb-1">
            <VoiceButton
              disabled={sending}
              onTranscript={(text) => {
                setInput(text);
                setInputMode("voice");
              }}
            />
            <Button type="submit" size="sm" loading={sending} disabled={!input.trim()} aria-label="Send question">
              <Send className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        </div>
        {inputMode === "voice" && input && (
          <p className="mt-1.5 text-xs text-indigo-600">
            Voice transcript ready — review or edit it, then send.
          </p>
        )}
      </form>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <div className={isUser ? "flex justify-end" : "flex justify-start"}>
      <div
        className={
          isUser
            ? "max-w-[85%] rounded-2xl rounded-br-sm bg-indigo-600 px-4 py-2.5 text-sm text-white"
            : "max-w-[85%] rounded-2xl rounded-bl-sm bg-slate-100 px-4 py-2.5 text-sm text-slate-800"
        }
      >
        {isUser && message.input_mode === "voice" && (
          <span className="mb-1 flex items-center gap-1 text-xs text-indigo-200">
            <Volume2 className="h-3 w-3" aria-hidden /> asked by voice
          </span>
        )}
        <p className="whitespace-pre-wrap">{message.content}</p>
        {!isUser && message.citations.length > 0 && (
          <div className="mt-3 space-y-1.5 border-t border-slate-200 pt-2">
            <p className="text-xs font-semibold text-slate-500 uppercase">Sources</p>
            {message.citations.map((citation: Citation, i) => (
              <a
                key={`${citation.scraped_page_id}-${i}`}
                href={citation.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-lg border border-slate-200 bg-white p-2 text-xs hover:border-indigo-300"
              >
                <span className="flex items-center gap-1 font-medium text-indigo-700">
                  <ExternalLink className="h-3 w-3 shrink-0" aria-hidden />
                  {citation.page_title}
                </span>
                <span className="mt-0.5 line-clamp-2 block text-slate-500">“{citation.excerpt}”</span>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
