"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import {
  Check, Copy, Download, ExternalLink, FileJson, Search, Trash2,
} from "lucide-react";
import { api } from "@/lib/client";
import type {
  Conversation, ExtractedLink, Heading, Project, ScrapeRun, ScrapedPage,
} from "@/lib/types";
import { formatDate, truncate } from "@/lib/utils";
import {
  Alert, Badge, Button, Card, Dialog, EmptyState, Input, Skeleton, Spinner, Tabs, statusTone,
} from "@/components/ui";
import { ChatPanel } from "@/components/chat-panel";

interface RunPayload {
  run: ScrapeRun;
  project: Project | null;
  pages: ScrapedPage[];
  headings: Heading[];
  links: ExtractedLink[];
  conversations: Conversation[];
}

const ACTIVE_STATUSES = new Set(["queued", "running"]);

export function RunWorkspace({ runId }: { runId: string }) {
  const router = useRouter();
  const [data, setData] = React.useState<RunPayload | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [tab, setTab] = React.useState("overview");
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [aiConfigured, setAiConfigured] = React.useState(true);

  // filters
  const [pageFilter, setPageFilter] = React.useState<string>("all");
  const [levelFilter, setLevelFilter] = React.useState<string>("all");
  const [linkFilter, setLinkFilter] = React.useState<string>("all");
  const [query, setQuery] = React.useState("");

  const load = React.useCallback(async () => {
    const res = await api<RunPayload>(`/api/runs/${runId}`);
    if (!res.success) return setError(res.error.message);
    setData(res.data);
  }, [runId]);

  React.useEffect(() => {
    void load();
    void api<{ mode: { aiConfigured: boolean } }>("/api/me").then((res) => {
      if (res.success) setAiConfigured(res.data.mode.aiConfigured);
    });
  }, [load]);

  const isActive = data ? ACTIVE_STATUSES.has(data.run.status) : false;
  React.useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(load, 1500);
    return () => clearInterval(interval);
  }, [isActive, load]);

  async function deleteRun() {
    setDeleting(true);
    const res = await api(`/api/runs/${runId}`, { method: "DELETE" });
    setDeleting(false);
    if (!res.success) return setError(res.error.message);
    router.push(data?.project ? `/projects/${data.project.id}` : "/dashboard");
  }

  async function exportRun(format: "json" | "csv") {
    // Use a plain navigation so the browser downloads the file; errors are
    // surfaced by probing first.
    const probe = await fetch(`/api/runs/${runId}/export?format=${format}`);
    if (!probe.ok) {
      const body = (await probe.json().catch(() => null)) as
        | { error?: { message?: string } }
        | null;
      setError(body?.error?.message ?? `Export failed (HTTP ${probe.status}).`);
      return;
    }
    const blob = await probe.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `joink-run-${runId.slice(0, 8)}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (error && !data) return <Alert tone="error">{error}</Alert>;
  if (!data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const { run, project, pages, headings, links, conversations } = data;
  const okPages = pages.filter((p) => p.extraction_status === "completed" || p.extraction_status === "partial");

  const q = query.trim().toLowerCase();
  const matchesQuery = (...fields: (string | null | undefined)[]) =>
    !q || fields.some((f) => f?.toLowerCase().includes(q));

  const visiblePages = pages.filter(
    (p) =>
      (pageFilter === "all" || p.id === pageFilter) &&
      matchesQuery(p.page_title, p.requested_url, p.meta_description, p.main_text),
  );
  const visibleHeadings = headings.filter(
    (h) =>
      (pageFilter === "all" || h.scraped_page_id === pageFilter) &&
      (levelFilter === "all" || String(h.level) === levelFilter) &&
      matchesQuery(h.text, h.section_hint),
  );
  const visibleLinks = links.filter(
    (l) =>
      (pageFilter === "all" || l.scraped_page_id === pageFilter) &&
      (linkFilter === "all" || (linkFilter === "internal") === l.is_internal) &&
      matchesQuery(l.anchor_text, l.url),
  );
  const pageById = new Map(pages.map((p) => [p.id, p]));

  return (
    <div className="space-y-6">
      {error && <Alert tone="error">{error}</Alert>}

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">
            {project ? (
              <Link href={`/projects/${project.id}`} className="text-indigo-600 hover:underline">
                {project.name}
              </Link>
            ) : (
              "Project"
            )}
            {" · "}started {formatDate(run.created_at)}
          </p>
          <div className="mt-1 flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">Extraction results</h1>
            <Badge tone={statusTone(run.status)}>{run.status}</Badge>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {run.completed_url_count} of {run.requested_url_count} pages extracted
            {run.failed_url_count > 0 && `, ${run.failed_url_count} failed`}
            {run.completed_at && ` · finished ${formatDate(run.completed_at)}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => exportRun("json")}>
            <FileJson className="h-4 w-4" aria-hidden /> JSON
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportRun("csv")}>
            <Download className="h-4 w-4" aria-hidden /> CSV
          </Button>
          <Button variant="danger" size="sm" onClick={() => setConfirmDelete(true)}>
            <Trash2 className="h-4 w-4" aria-hidden /> Delete run
          </Button>
        </div>
      </div>

      {/* Live progress while extracting */}
      {isActive && (
        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <Spinner className="h-4 w-4" />
            <h2 className="text-sm font-semibold text-slate-900">Extracting…</h2>
          </div>
          <ul className="space-y-2">
            {pages.map((page) => (
              <li key={page.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate text-slate-600">{page.requested_url}</span>
                <Badge tone={statusTone(page.extraction_status)}>{page.extraction_status}</Badge>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-slate-400" aria-hidden />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search extracted content…"
            className="pl-9"
            aria-label="Search extracted content"
          />
        </div>
        <select
          value={pageFilter}
          onChange={(e) => setPageFilter(e.target.value)}
          className="h-10 rounded-lg border border-slate-300 bg-white px-2 text-sm"
          aria-label="Filter by page"
        >
          <option value="all">All pages</option>
          {pages.map((p) => (
            <option key={p.id} value={p.id}>
              {truncate(p.page_title ?? p.requested_url, 50)}
            </option>
          ))}
        </select>
        {tab === "headings" && (
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="h-10 rounded-lg border border-slate-300 bg-white px-2 text-sm"
            aria-label="Filter by heading level"
          >
            <option value="all">H1–H3</option>
            <option value="1">H1 only</option>
            <option value="2">H2 only</option>
            <option value="3">H3 only</option>
          </select>
        )}
        {tab === "links" && (
          <select
            value={linkFilter}
            onChange={(e) => setLinkFilter(e.target.value)}
            className="h-10 rounded-lg border border-slate-300 bg-white px-2 text-sm"
            aria-label="Filter internal or external links"
          >
            <option value="all">Internal + external</option>
            <option value="internal">Internal only</option>
            <option value="external">External only</option>
          </select>
        )}
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "overview", label: "Overview" },
          { id: "pages", label: "Pages", count: pages.length },
          { id: "headings", label: "Headings", count: headings.length },
          { id: "links", label: "Links", count: links.length },
          { id: "structured", label: "Structured data" },
          { id: "chat", label: "Chat" },
        ]}
      />

      {tab === "overview" && <OverviewTab run={run} pages={pages} headings={headings} links={links} />}
      {tab === "pages" && <PagesTab pages={visiblePages} />}
      {tab === "headings" && <HeadingsTab headings={visibleHeadings} pageById={pageById} />}
      {tab === "links" && <LinksTab links={visibleLinks} pageById={pageById} />}
      {tab === "structured" && <StructuredTab runId={runId} pages={visiblePages} onExport={exportRun} />}
      {tab === "chat" &&
        (okPages.length === 0 ? (
          <EmptyState
            title="Nothing to chat about yet"
            description="Chat becomes available once at least one page has been extracted successfully."
          />
        ) : (
          <ChatPanel runId={runId} initialConversations={conversations} aiConfigured={aiConfigured} />
        ))}

      <Dialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete this extraction run?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>Cancel</Button>
            <Button variant="danger" loading={deleting} onClick={deleteRun}>Delete run</Button>
          </>
        }
      >
        This permanently deletes the run, its {pages.length} extracted page
        {pages.length === 1 ? "" : "s"}, and any conversations about it. Exports you downloaded
        are unaffected.
      </Dialog>
    </div>
  );
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"
      aria-label={label}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function SourceLink({ url }: { url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline"
    >
      <ExternalLink className="h-3 w-3" aria-hidden />
      Open source
    </a>
  );
}

function OverviewTab({
  run, pages, headings, links,
}: { run: ScrapeRun; pages: ScrapedPage[]; headings: Heading[]; links: ExtractedLink[] }) {
  const succeeded = pages.filter((p) => p.extraction_status === "completed").length;
  const partial = pages.filter((p) => p.extraction_status === "partial").length;
  const failed = pages.filter((p) => p.extraction_status === "failed").length;
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Pages extracted", `${succeeded + partial} / ${run.requested_url_count}`],
          ["Failed pages", String(failed)],
          ["Headings captured", String(headings.length)],
          ["Links captured", String(links.length)],
        ].map(([label, value]) => (
          <Card key={label} className="p-5">
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
          </Card>
        ))}
      </div>
      <Card className="divide-y divide-slate-100">
        {pages.map((page) => (
          <div key={page.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-800">
                {page.page_title ?? page.requested_url}
              </p>
              <p className="truncate text-xs text-slate-400">{page.final_url ?? page.requested_url}</p>
              {page.error_message && (
                <p className="mt-0.5 text-xs text-red-600">{page.error_message}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge tone={statusTone(page.extraction_status)}>{page.extraction_status}</Badge>
              <Badge tone={page.confidence === "high" ? "green" : page.confidence === "medium" ? "amber" : "neutral"}>
                {page.confidence} confidence
              </Badge>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}

function PagesTab({ pages }: { pages: ScrapedPage[] }) {
  if (!pages.length) {
    return <EmptyState title="No pages match" description="Adjust the search or page filter." />;
  }
  return (
    <div className="space-y-4">
      {pages.map((page) => (
        <Card key={page.id} className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-semibold text-slate-900">
                {page.page_title ?? "(no title extracted)"}
              </h3>
              <p className="mt-0.5 truncate text-xs text-slate-400">
                {page.final_url ?? page.requested_url}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone={statusTone(page.extraction_status)}>{page.extraction_status}</Badge>
              <SourceLink url={page.final_url ?? page.requested_url} />
            </div>
          </div>
          {page.meta_description && (
            <p className="mt-2 text-sm text-slate-600 italic">{page.meta_description}</p>
          )}
          {page.error_message && <Alert tone={page.extraction_status === "failed" ? "error" : "warn"} className="mt-3">{page.error_message}</Alert>}
          {page.main_text && (
            <details className="mt-3">
              <summary className="cursor-pointer text-sm font-medium text-indigo-600">
                Main text ({page.main_text.length.toLocaleString()} characters)
              </summary>
              <div className="mt-2 max-h-80 overflow-y-auto rounded-lg bg-slate-50 p-4 text-sm whitespace-pre-wrap text-slate-700">
                {page.main_text}
              </div>
              <CopyButton text={page.main_text} label="Copy main text" />
            </details>
          )}
          <p className="mt-3 text-xs text-slate-400">
            HTTP {page.http_status ?? "—"} · {page.content_type ?? "—"} · method {page.extraction_method} ·
            scraped {formatDate(page.scraped_at)}
          </p>
        </Card>
      ))}
    </div>
  );
}

function HeadingsTab({ headings, pageById }: { headings: Heading[]; pageById: Map<string, ScrapedPage> }) {
  if (!headings.length) {
    return <EmptyState title="No headings match" description="Adjust the filters or search." />;
  }
  return (
    <Card className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs font-medium text-slate-500 uppercase">
            <th className="px-4 py-3">Level</th>
            <th className="px-4 py-3">Heading</th>
            <th className="px-4 py-3">Section</th>
            <th className="px-4 py-3">Page</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {headings.map((h) => {
            const page = pageById.get(h.scraped_page_id);
            return (
              <tr key={h.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-2.5"><Badge tone="indigo">H{h.level}</Badge></td>
                <td className="px-4 py-2.5 font-medium text-slate-800">{h.text}</td>
                <td className="px-4 py-2.5 text-slate-500">{h.section_hint ?? "—"}</td>
                <td className="max-w-48 truncate px-4 py-2.5 text-slate-500">
                  {page?.page_title ?? page?.requested_url ?? "—"}
                </td>
                <td className="px-4 py-2.5"><CopyButton text={h.text} label={`Copy heading ${h.text}`} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}

function LinksTab({ links, pageById }: { links: ExtractedLink[]; pageById: Map<string, ScrapedPage> }) {
  if (!links.length) {
    return <EmptyState title="No links match" description="Adjust the filters or search." />;
  }
  return (
    <Card className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs font-medium text-slate-500 uppercase">
            <th className="px-4 py-3">Anchor text</th>
            <th className="px-4 py-3">URL</th>
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3">Found on</th>
          </tr>
        </thead>
        <tbody>
          {links.map((link) => {
            const page = pageById.get(link.scraped_page_id);
            return (
              <tr key={link.id} className="border-b border-slate-100 last:border-0">
                <td className="max-w-56 truncate px-4 py-2.5 font-medium text-slate-800">
                  {link.anchor_text || "(no text)"}
                </td>
                <td className="max-w-72 truncate px-4 py-2.5">
                  <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
                    {link.url}
                  </a>
                </td>
                <td className="px-4 py-2.5">
                  <Badge tone={link.is_internal ? "blue" : "neutral"}>
                    {link.is_internal ? "internal" : "external"}
                  </Badge>
                </td>
                <td className="max-w-48 truncate px-4 py-2.5 text-slate-500">
                  {page?.page_title ?? page?.requested_url ?? "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}

function StructuredTab({
  runId, pages, onExport,
}: { runId: string; pages: ScrapedPage[]; onExport: (f: "json" | "csv") => void }) {
  const preview = {
    run_id: runId,
    pages: pages.slice(0, 3).map((p) => ({
      requested_url: p.requested_url,
      final_url: p.final_url,
      page_title: p.page_title,
      extraction_status: p.extraction_status,
      confidence: p.confidence,
      scraped_at: p.scraped_at,
    })),
    note: pages.length > 3 ? `…and ${pages.length - 3} more pages in the full export` : undefined,
  };
  const text = JSON.stringify(preview, null, 2);
  return (
    <Card className="p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold text-slate-900">Structured data preview</h3>
          <p className="text-sm text-slate-500">
            Every record keeps its source URL, timestamps, extraction method, status and confidence.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => onExport("json")}>
            <FileJson className="h-4 w-4" aria-hidden /> Export JSON
          </Button>
          <Button variant="outline" size="sm" onClick={() => onExport("csv")}>
            <Download className="h-4 w-4" aria-hidden /> Export CSV
          </Button>
          <CopyButton text={text} label="Copy JSON preview" />
        </div>
      </div>
      <pre className="max-h-96 overflow-auto rounded-lg bg-slate-900 p-4 text-xs leading-relaxed text-slate-100">
        {text}
      </pre>
    </Card>
  );
}
