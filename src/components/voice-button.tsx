"use client";

import * as React from "react";
import { Mic, MicOff, Square } from "lucide-react";
import { cn } from "@/lib/utils";

type VoiceState = "idle" | "listening" | "denied" | "unsupported" | "error";

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionResultEvent) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionResultEvent {
  resultIndex: number;
  results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }>;
}

function getRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/**
 * Microphone button implementing voice input as progressive enhancement.
 * The transcript is placed in the chat input for review — nothing is sent
 * automatically, and raw audio is never stored. Microphone access is only
 * requested after the user clicks.
 */
export function VoiceButton({
  onTranscript,
  disabled,
}: {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}) {
  const [state, setState] = React.useState<VoiceState>("idle");
  const [elapsed, setElapsed] = React.useState(0);
  const recognitionRef = React.useRef<SpeechRecognitionLike | null>(null);
  const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const finalRef = React.useRef("");
  const supported = getRecognitionCtor() !== null;

  const cleanup = React.useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    recognitionRef.current = null;
    setElapsed(0);
  }, []);

  React.useEffect(() => () => {
    recognitionRef.current?.abort();
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  function start() {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      setState("unsupported");
      return;
    }
    const rec = new Ctor();
    rec.lang = "en-IN";
    rec.continuous = true;
    rec.interimResults = true;
    finalRef.current = "";

    rec.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) finalRef.current += result[0].transcript;
        else interim += result[0].transcript;
      }
      onTranscript((finalRef.current + interim).trim());
    };
    rec.onerror = (event) => {
      cleanup();
      setState(event.error === "not-allowed" || event.error === "service-not-allowed" ? "denied" : "error");
    };
    rec.onend = () => {
      cleanup();
      setState((s) => (s === "listening" ? "idle" : s));
    };

    try {
      rec.start(); // browser prompts for mic permission here, on user click
      recognitionRef.current = rec;
      setState("listening");
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    } catch {
      setState("error");
      cleanup();
    }
  }

  function stop() {
    recognitionRef.current?.stop();
    setState("idle");
    cleanup();
  }

  function cancel() {
    recognitionRef.current?.abort();
    finalRef.current = "";
    onTranscript("");
    setState("idle");
    cleanup();
  }

  if (!supported || state === "unsupported") {
    return (
      <span
        className="inline-flex items-center gap-1 text-xs text-slate-400"
        title="Voice input is not supported in this browser — typing works normally."
      >
        <MicOff className="h-4 w-4" aria-hidden />
        <span className="hidden sm:inline">Voice unavailable</span>
      </span>
    );
  }

  if (state === "listening") {
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-1 text-xs font-medium text-red-700">
          <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" aria-hidden />
          Listening {elapsed}s
        </span>
        <button
          type="button"
          onClick={stop}
          className="rounded-lg bg-red-600 p-2 text-white hover:bg-red-700"
          aria-label="Stop listening and keep transcript"
          title="Stop and keep transcript"
        >
          <Square className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={cancel}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
          aria-label="Cancel voice input"
          title="Cancel"
        >
          <MicOff className="h-4 w-4" />
        </button>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2">
      {state === "denied" && (
        <span className="text-xs text-amber-700">Mic access denied — you can still type.</span>
      )}
      {state === "error" && (
        <span className="text-xs text-amber-700">Voice input hiccuped — try again or type.</span>
      )}
      <button
        type="button"
        onClick={start}
        disabled={disabled}
        className={cn(
          "rounded-lg border border-slate-300 p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-50",
        )}
        aria-label="Ask by voice"
        title="Ask by voice — speech becomes an editable transcript"
      >
        <Mic className="h-4 w-4" />
      </button>
    </span>
  );
}

/** Text-to-speech controls for reading an answer aloud. */
export function useSpeech() {
  const [speaking, setSpeaking] = React.useState(false);
  const [muted, setMuted] = React.useState(false);
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;

  const speak = React.useCallback(
    (text: string) => {
      if (!supported || muted) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);
      setSpeaking(true);
      window.speechSynthesis.speak(utterance);
    },
    [supported, muted],
  );

  const stop = React.useCallback(() => {
    if (supported) window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [supported]);

  React.useEffect(() => stop, [stop]);

  return { supported, speaking, muted, setMuted, speak, stop };
}
