"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { FolderOpen, Globe2, MessageSquare, Plus, Search, Sparkles } from "lucide-react";
import { api } from "@/lib/client";
import type { Project, ScrapeRun, UsageCounters } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { Alert, Badge, Button, Card, EmptyState, Input, Skeleton, statusTone } from "@/components/ui";

interface UsagePayload {
  plan: {
    code: string;
    name: string;
    project_limit: number;
    monthly_url_limit: number;
    monthly_chat_limit: number;
    monthly_voice_limit: number;
  };
  usage: UsageCounters;
  projectCount: number;
}

export function DashboardClient() {
  const router = useRouter();
  const [projects, setProjects] = React.useState<Project[] | null>(null);
  const [runs, setRuns] = React.useState<ScrapeRun[] | null>(null);
  const [usage, setUsage] = React.useState<UsagePayload | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState("");
  const [loadingDemo, setLoadingDemo] = React.useState(false);

  const load = React.useCallback(async () => {
    const [projectsRes, usageRes, runsRes] = await Promise.all([
      api<{ projects: Project[] }>("/api/projects"),
      api<UsagePayload>("/api/me/usage"),
      api<{ runs: ScrapeRun[] }>("/api/me/recent-runs"),
    ]);
    if (projectsRes.success) setProjects(projectsRes.data.projects);
    else setError(projectsRes.error.message);
    if (usageRes.success) setUsage(usageRes.data);
    if (runsRes.success) setRuns(runsRes.data.runs);
    else setRuns([]);
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function loadDemo() {
    setLoadingDemo(true);
    const res = await api<{ runId: string }>("/api/demo/load", { method: "POST" });
    setLoadingDemo(false);
    if (res.success) router.push(`/runs/${res.data.runId}`);
    else setError(res.error.message);
  }

  const filtered = (projects ?? []).filter(
    (p) =>
      !query ||
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      (p.description ?? "").toLowerCase().includes(query.toLowerCase()),
  );

  const completedPages = usage?.usage.urls_processed ?? 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Your projects, extraction runs and usage at a glance.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadDemo} loading={loadingDemo}>
            <Sparkles className="h-4 w-4" aria-hidden />
            Load demo project
          </Button>
          <Link href="/projects/new">
            <Button>
              <Plus className="h-4 w-4" aria-hidden />
              New project
            </Button>
          </Link>
        </div>
      </div>

      {error && <Alert tone="error">{error}</Alert>}

      {/* Usage cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {usage ? (
          <>
            <StatCard
              icon={<FolderOpen className="h-5 w-5" />}
              label="Projects"
              value={`${usage.projectCount} / ${usage.plan.project_limit}`}
              hint={`${usage.plan.name} plan`}
            />
            <StatCard
              icon={<Globe2 className="h-5 w-5" />}
              label="URLs this month"
              value={`${completedPages} / ${usage.plan.monthly_url_limit}`}
              hint="Resets monthly"
            />
            <StatCard
              icon={<MessageSquare className="h-5 w-5" />}
              label="Chat questions"
              value={`${usage.usage.chat_questions} / ${usage.plan.monthly_chat_limit}`}
              hint={`Voice: ${usage.usage.voice_questions} / ${usage.plan.monthly_voice_limit}`}
            />
            <Card className="flex flex-col justify-between p-5">
              <p className="text-sm font-medium text-slate-500">Current plan</p>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-2xl font-bold text-slate-900">{usage.plan.name}</span>
                {usage.plan.code === "free" && (
                  <Link href="/pricing" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
                    Upgrade →
                  </Link>
                )}
              </div>
            </Card>
          </>
        ) : (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)
        )}
      </div>

      {/* Projects */}
      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Projects</h2>
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-slate-400" aria-hidden />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search projects…"
              className="pl-9"
              aria-label="Search projects"
            />
          </div>
        </div>

        {projects === null ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<FolderOpen className="h-10 w-10" />}
            title={query ? "No matching projects" : "Create your first project"}
            description={
              query
                ? "Try a different search term."
                : "A project groups related extraction runs. Start one, paste a few URLs, and Joink structures the content for you."
            }
            action={
              !query && (
                <div className="flex gap-2">
                  <Link href="/projects/new">
                    <Button>
                      <Plus className="h-4 w-4" aria-hidden /> New project
                    </Button>
                  </Link>
                  <Button variant="outline" onClick={loadDemo} loading={loadingDemo}>
                    Load demo project
                  </Button>
                </div>
              )
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((project) => (
              <Link key={project.id} href={`/projects/${project.id}`}>
                <Card className="h-full p-5 transition-shadow hover:shadow-md">
                  <h3 className="font-semibold text-slate-900">{project.name}</h3>
                  <p className="mt-1 line-clamp-2 min-h-10 text-sm text-slate-500">
                    {project.description || "No description"}
                  </p>
                  <p className="mt-3 text-xs text-slate-400">Updated {formatDate(project.updated_at)}</p>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Recent runs */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Recent extraction runs</h2>
        {runs === null ? (
          <Skeleton className="h-40" />
        ) : runs.length === 0 ? (
          <EmptyState
            title="No extraction runs yet"
            description="Runs appear here after you extract content in a project."
          />
        ) : (
          <Card className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs font-medium text-slate-500 uppercase">
                  <th className="px-4 py-3">Run</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Pages</th>
                  <th className="px-4 py-3">Succeeded / Failed</th>
                  <th className="px-4 py-3">Started</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr
                    key={run.id}
                    className="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50"
                    onClick={() => router.push(`/runs/${run.id}`)}
                  >
                    <td className="px-4 py-3 font-medium text-indigo-600">
                      {run.id.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={statusTone(run.status)}>{run.status}</Badge>
                    </td>
                    <td className="px-4 py-3">{run.requested_url_count}</td>
                    <td className="px-4 py-3">
                      <span className="text-emerald-700">{run.completed_url_count}</span>
                      {" / "}
                      <span className="text-red-600">{run.failed_url_count}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(run.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </section>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 text-slate-500">
        <span className="text-indigo-600">{icon}</span>
        <p className="text-sm font-medium">{label}</p>
      </div>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
      <p className="mt-0.5 text-xs text-slate-400">{hint}</p>
    </Card>
  );
}
