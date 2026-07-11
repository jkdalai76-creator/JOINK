"use client";

import * as React from "react";
import { Globe, Sparkles, Wand2 } from "lucide-react";
import { parseVoiceRequest } from "@/lib/voice-parse";
import { Button, Card } from "@/components/ui";
import { VoiceButton } from "@/components/voice-button";

/**
 * Voice agent for the extraction form. The user speaks what they want to
 * research and which website(s); it detects the topic and URLs, shows them for
 * confirmation, and fills the form on approval — nothing is submitted
 * automatically.
 */
export function VoiceFill({
  onFill,
}: {
  onFill: (result: { name: string; urls: string[] }) => void;
}) {
  const [transcript, setTranscript] = React.useState("");
  const parsed = React.useMemo(() => parseVoiceRequest(transcript), [transcript]);

  return (
    <Card className="space-y-3 border-indigo-200 bg-indigo-50/50 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-1.5 font-semibold text-slate-900">
            <Wand2 className="h-4 w-4 text-indigo-600" aria-hidden />
            Fill by voice
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Press the mic and say your topic and website — e.g.{" "}
            <span className="italic">“Research electric cars from example dot com”</span>.
          </p>
        </div>
        <VoiceButton onTranscript={setTranscript} />
      </div>

      {transcript && (
        <div className="space-y-2.5 rounded-lg border border-slate-200 bg-white p-3">
          <p className="text-sm text-slate-700">
            <span className="text-slate-400">Heard:</span> “{transcript}”
          </p>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {parsed.name && (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">
                <Sparkles className="h-3 w-3 text-indigo-500" aria-hidden />
                Topic: <b>{parsed.name}</b>
              </span>
            )}
            {parsed.urls.map((u) => (
              <span
                key={u}
                className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-800"
              >
                <Globe className="h-3 w-3" aria-hidden />
                {u}
              </span>
            ))}
            {parsed.urls.length === 0 && (
              <span className="text-amber-600">
                No website detected — try saying the address, like “example dot com”.
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              disabled={!parsed.name && parsed.urls.length === 0}
              onClick={() => {
                onFill(parsed);
                setTranscript("");
              }}
            >
              Fill the form
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setTranscript("")}>
              Clear
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
