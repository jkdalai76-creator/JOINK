"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { Globe, X } from "lucide-react";
import { api } from "@/lib/client";
import type { ExtractionOptions, Project, ScrapeRun } from "@/lib/types";
import { Alert, Button, Card, Input, Label, Textarea } from "@/components/ui";

const MAX_URLS = 10;

function parseUrls(raw: string): string[] {
  return [...new Set(raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean))];
}

function looksLikeUrl(value: string): boolean {
  try {
    const candidate = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value) ? value : `https://${value}`;
    const url = new URL(candidate);
    return (url.protocol === "http:" || url.protocol === "https:") && url.hostname.includes(".");
  } catch {
    return false;
  }
}

/**
 * Create-project + extraction form. When `project` is given, the project step
 * is skipped and the run starts inside it.
 */
export function ExtractionForm({ project }: { project?: Project }) {
  const router = useRouter();
  const [name, setName] = React.useState(project?.name ?? "");
  const [description, setDescription] = React.useState(project?.description ?? "");
  const [rawUrls, setRawUrls] = React.useState("");
  const [options, setOptions] = React.useState<ExtractionOptions>({
    metadata: true,
    headings: true,
    mainText: true,
    links: true,
  });
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const urls = parseUrls(rawUrls);
  const invalidUrls = urls.filter((u) => !looksLikeUrl(u));
  const tooMany = urls.length > MAX_URLS;
  const noOption = !options.metadata && !options.headings && !options.mainText && !options.links;

  function removeUrl(url: string) {
    setRawUrls(parseUrls(rawUrls).filter((u) => u !== url).join("\n"));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!urls.length) return setError("Add at least one URL (one per line).");
    if (invalidUrls.length) return setError(`These don't look like valid URLs: ${invalidUrls.join(", ")}`);
    if (tooMany) return setError(`A run can include at most ${MAX_URLS} URLs — remove ${urls.length - MAX_URLS}.`);
    if (noOption) return setError("Choose at least one thing to extract.");

    setSubmitting(true);
    let projectId = project?.id;
    if (!projectId) {
      const createRes = await api<{ project: Project }>("/api/projects", {
        method: "POST",
        json: { name: name.trim(), description: description.trim() || null },
      });
      if (!createRes.success) {
        setSubmitting(false);
        return setError(createRes.error.message);
      }
      projectId = createRes.data.project.id;
    }

    const scrapeRes = await api<{ run: ScrapeRun }>("/api/scrape", {
      method: "POST",
      json: { projectId, urls, options },
    });
    setSubmitting(false);
    if (!scrapeRes.success) return setError(scrapeRes.error.message);
    router.push(`/runs/${scrapeRes.data.run.id}`);
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      {error && <Alert tone="error">{error}</Alert>}

      {!project && (
        <Card className="space-y-4 p-6">
          <h2 className="font-semibold text-slate-900">Project</h2>
          <div>
            <Label htmlFor="name">Project name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Competitor research"
              maxLength={120}
              required
            />
          </div>
          <div>
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={description ?? ""}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What are you researching?"
              rows={2}
              maxLength={2000}
            />
          </div>
        </Card>
      )}

      <Card className="space-y-4 p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Website URLs</h2>
          <span className={`text-sm ${tooMany ? "font-medium text-red-600" : "text-slate-500"}`}>
            {urls.length} / {MAX_URLS}
          </span>
        </div>
        <div>
          <Label htmlFor="urls">One URL per line (up to {MAX_URLS})</Label>
          <Textarea
            id="urls"
            value={rawUrls}
            onChange={(e) => setRawUrls(e.target.value)}
            placeholder={"https://example.com/article\nhttps://docs.example.com/guide"}
            rows={5}
            spellCheck={false}
          />
        </div>
        {urls.length > 0 && (
          <ul className="flex flex-wrap gap-2" aria-label="URLs to extract">
            {urls.map((url) => {
              const valid = looksLikeUrl(url);
              return (
                <li
                  key={url}
                  className={`inline-flex max-w-full items-center gap-1.5 rounded-full border px-3 py-1 text-xs ${
                    valid
                      ? "border-slate-200 bg-slate-50 text-slate-700"
                      : "border-red-200 bg-red-50 text-red-700"
                  }`}
                >
                  <Globe className="h-3 w-3 shrink-0" aria-hidden />
                  <span className="truncate">{url}</span>
                  {!valid && <span className="font-medium">(invalid)</span>}
                  <button
                    type="button"
                    onClick={() => removeUrl(url)}
                    aria-label={`Remove ${url}`}
                    className="rounded-full p-0.5 hover:bg-slate-200"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card className="space-y-3 p-6">
        <h2 className="font-semibold text-slate-900">Extraction options</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {(
            [
              ["metadata", "Metadata", "Page title and meta description"],
              ["headings", "Headings", "H1, H2 and H3 outline"],
              ["mainText", "Main text", "Readable article/body text"],
              ["links", "Links", "Anchor text and absolute URLs"],
            ] as const
          ).map(([key, label, hint]) => (
            <label
              key={key}
              className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3 hover:bg-slate-50"
            >
              <input
                type="checkbox"
                checked={options[key]}
                onChange={(e) => setOptions({ ...options, [key]: e.target.checked })}
                className="mt-0.5 h-4 w-4 accent-indigo-600"
              />
              <span>
                <span className="block text-sm font-medium text-slate-800">{label}</span>
                <span className="block text-xs text-slate-500">{hint}</span>
              </span>
            </label>
          ))}
        </div>
        {noOption && <p className="text-sm text-red-600">Choose at least one option.</p>}
      </Card>

      <div className="flex justify-end">
        <Button type="submit" size="lg" loading={submitting}>
          Extract content
        </Button>
      </div>
    </form>
  );
}
