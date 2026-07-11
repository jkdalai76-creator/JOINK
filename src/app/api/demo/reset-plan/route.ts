import { errors, fail, handle, ok } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { supabaseConfigured } from "@/lib/env";
import { MemoryStore } from "@/lib/store/memory";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * Developer-only reset back to the Free plan (used between demo rehearsals).
 * Refused in production builds.
 */
export async function POST() {
  return handle(async () => {
    if (process.env.NODE_ENV === "production" && process.env.ALLOW_PLAN_RESET !== "true") {
      return fail("forbidden", "Plan reset is a development-only tool.", 403);
    }
    const user = await getCurrentUser();
    if (!user) throw errors.unauthorized();
    if (supabaseConfigured()) {
      const service = createServiceClient();
      await service.from("subscriptions").delete().eq("user_id", user.id);
    } else {
      await new MemoryStore().resetUserToFree(user.id);
    }
    return ok({ reset: true, plan: "free" });
  });
}
