import { z } from "zod";
import { errors, fail, handle, ok, parseBody } from "@/lib/api";
import { supabaseConfigured } from "@/lib/env";
import { createUserClient } from "@/lib/supabase/server";

const schema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters."),
});

/**
 * Sets a new password for the user in the current (recovery) session — the
 * one established by /api/auth/recovery after the emailed link.
 */
export async function POST(req: Request) {
  return handle(async () => {
    const { password } = await parseBody(req, schema);
    if (!supabaseConfigured()) {
      return fail("demo_mode", "Password reset is not available in demo mode.", 400);
    }
    const supabase = await createUserClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      throw errors.unauthorized();
    }
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return fail("update_failed", error.message, 400);
    return ok({ updated: true });
  });
}
