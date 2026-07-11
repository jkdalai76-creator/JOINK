"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { Pencil, Trash2 } from "lucide-react";
import { api } from "@/lib/client";
import type { Project, ScrapeRun } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import {
  Alert, Badge, Button, Card, Dialog, EmptyState, Input, Label, Skeleton, statusTone, Textarea,
} from "@/components/ui";
import { ExtractionForm } from "@/components/extraction-form";

export function ProjectClient({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [project, setProject] = React.useState<Project | null>(null);
  const [runs, setRuns] = React.useState<ScrapeRun[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [editing, setEditing] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");

  const load = React.useCallback(async () => {
    const res = await api<{ project: Project; runs: ScrapeRun[] }>(`/api/projects/${projectId}`);
    setLoading(false);
    if (!res.success) return setError(res.error.message);
    setProject(res.data.project);
    setRuns(res.data.runs);
    setName(res.data.project.name);
    setDescription(res.data.project.description ?? "");
  }, [projectId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await api<{ project: Project }>(`/api/projects/${projectId}`, {
      method: "PATCH",
      json: { name: name.trim(), description: description.trim() || null },
    });
    setSaving(false);
    if (!res.success) return setError(res.error.message);
    setProject(res.data.project);
    setEditing(false);
  }

  async function deleteProject() {
    setSaving(true);
    const res = await api(`/api/projects/${projectId}`, { method: "DELETE" });
    setSaving(false);
    if (!res.success) return setError(res.error.message);
    router.push("/dashboard");
    router.refresh();
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  if (!project) {
    return <Alert tone="error">{error ?? "Project not found."}</Alert>;
  }

  return (
    <div className="space-y-8">
      {error && <Alert tone="error">{error}</Alert>}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{project.name}</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            {project.description || "No description"}
          </p>
          <p className="mt-1 text-xs text-slate-400">Created {formatDate(project.created_at)}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="h-3.5 w-3.5" aria-hidden /> Edit
          </Button>
          <Button variant="danger" size="sm" onClick={() => setConfirmDelete(true)}>
            <Trash2 className="h-3.5 w-3.5" aria-hidden /> Delete
          </Button>
        </div>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Extraction runs</h2>
        {runs.length === 0 ? (
          <EmptyState
            title="No runs in this project yet"
            description="Start an extraction below — results will appear here."
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
                  <tr key={run.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link href={`/runs/${run.id}`} className="font-medium text-indigo-600 hover:underline">
                        {run.id.slice(0, 8)}
                      </Link>
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

      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">New extraction</h2>
        <ExtractionForm project={project} />
      </section>

      <Dialog
        open={editing}
        onClose={() => setEditing(false)}
        title="Edit project"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
            <Button loading={saving} onClick={(e) => saveEdit(e as unknown as React.FormEvent)}>Save</Button>
          </>
        }
      >
        <form onSubmit={saveEdit} className="space-y-3">
          <div>
            <Label htmlFor="edit-name">Name</Label>
            <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} required />
          </div>
          <div>
            <Label htmlFor="edit-desc">Description</Label>
            <Textarea id="edit-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={2000} />
          </div>
        </form>
      </Dialog>

      <Dialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete this project?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>Cancel</Button>
            <Button variant="danger" loading={saving} onClick={deleteProject}>Delete project</Button>
          </>
        }
      >
        This permanently deletes “{project.name}”, its {runs.length} extraction run
        {runs.length === 1 ? "" : "s"} and all saved results. This cannot be undone.
      </Dialog>
    </div>
  );
}
