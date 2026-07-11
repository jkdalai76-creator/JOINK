import { z } from "zod";
import { errors, fail, handle, ok, parseBody } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { checkCreateProject, snapshot } from "@/lib/billing/entitlements";
import { getStore } from "@/lib/store";

const createSchema = z.object({
  name: z.string().trim().min(1, "Project name is required.").max(120),
  description: z.string().trim().max(2000).optional().nullable(),
});

export async function GET() {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) throw errors.unauthorized();
    const store = await getStore();
    const projects = await store.listProjects(user.id);
    return ok({ projects });
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) throw errors.unauthorized();
    const body = await parseBody(req, createSchema);
    const store = await getStore();

    const decision = checkCreateProject(await snapshot(store, user.id));
    if (!decision.allowed) return fail("limit_reached", decision.reason!, 402);

    const project = await store.createProject(user.id, body.name, body.description ?? null);
    await store.incrementUsage(user.id, { projects_created: 1 }, `project:${project.id}`);
    return ok({ project }, { status: 201 });
  });
}
