import { fail, handle, ok } from "@/lib/api";
import { demoUserSignIn } from "@/lib/auth";
import { supabaseConfigured } from "@/lib/env";

/**
 * One-click demo access. Only available in demo mode (no Supabase configured)
 * — with a real database, users create real accounts instead.
 */
export async function POST() {
  return handle(async () => {
    if (supabaseConfigured()) {
      return fail(
        "demo_unavailable",
        "One-click demo sign-in is only available in demo mode. Please create an account.",
        400,
      );
    }
    const user = await demoUserSignIn();
    return ok({ user });
  });
}
