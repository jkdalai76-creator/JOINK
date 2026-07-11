import { z } from "zod";
import { errors, handle, ok, parseBody } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { getStore } from "@/lib/store";

const updateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(2000).nullable().optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) throw errors.unauthorized();
    const { id } = await params;
    const store = await getStore();
    const project = await store.getProject(user.id, id);
    if (!project) throw errors.notFound("Project");
    const runs = await store.listRunsByProject(user.id, id);
    return ok({ project, runs });
  });
}

export async function PATCH(req: Request, { params }: Params) {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) throw errors.unauthorized();
    const { id } = await params;
    const body = await parseBody(req, updateSchema);
    const store = await getStore();
    const project = await store.updateProject(user.id, id, body);
    if (!project) throw errors.notFound("Project");
    return ok({ project });
  });
}

export async function DELETE(_req: Request, { params }: Params) {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) throw errors.unauthorized();
    const { id } = await params;
    const store = await getStore();
    const deleted = await store.deleteProject(user.id, id);
    if (!deleted) throw errors.notFound("Project");
    return ok({ deleted: true });
  });
}
