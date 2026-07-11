import { errors, handle, ok } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { getStore } from "@/lib/store";

type Params = { params: Promise<{ id: string }> };

/** Full run detail: status, pages, headings, links — used by the workspace. */
export async function GET(_req: Request, { params }: Params) {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) throw errors.unauthorized();
    const { id } = await params;
    const store = await getStore();
    const run = await store.getRun(user.id, id);
    if (!run) throw errors.notFound("Extraction run");
    const [project, pages, headings, links, conversations] = await Promise.all([
      store.getProject(user.id, run.project_id),
      store.listPagesByRun(user.id, id),
      store.listHeadingsByRun(user.id, id),
      store.listLinksByRun(user.id, id),
      store.listConversationsByRun(user.id, id),
    ]);
    return ok({ run, project, pages, headings, links, conversations });
  });
}

export async function DELETE(_req: Request, { params }: Params) {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) throw errors.unauthorized();
    const { id } = await params;
    const store = await getStore();
    const deleted = await store.deleteRun(user.id, id);
    if (!deleted) throw errors.notFound("Extraction run");
    return ok({ deleted: true });
  });
}
