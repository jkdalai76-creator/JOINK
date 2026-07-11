import { z } from "zod";
import { errors, handle, ok, parseBody } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { getStore } from "@/lib/store";

const schema = z.object({
  scrapeRunId: z.string().min(1),
  title: z.string().trim().max(200).optional(),
});

export async function POST(req: Request) {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) throw errors.unauthorized();
    const body = await parseBody(req, schema);
    const store = await getStore();
    const run = await store.getRun(user.id, body.scrapeRunId);
    if (!run) throw errors.notFound("Extraction run");
    const conversation = await store.createConversation({
      user_id: user.id,
      project_id: run.project_id,
      scrape_run_id: run.id,
      title: body.title?.trim() || "New conversation",
    });
    return ok({ conversation }, { status: 201 });
  });
}
