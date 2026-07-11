import { errors, handle, ok } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { loadDemoProject } from "@/lib/demo/seed";
import { getStore } from "@/lib/store";

/** Loads the sample demo project into the signed-in user's workspace. */
export async function POST() {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) throw errors.unauthorized();
    const store = await getStore();
    const result = await loadDemoProject(store, user.id);
    return ok(result, { status: 201 });
  });
}
