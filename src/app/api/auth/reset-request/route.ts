import { z } from "zod";
import { fail, handle, ok, parseBody } from "@/lib/api";
import { supabaseConfigured } from "@/lib/env";
import { createUserClient } from "@/lib/supabase/server";

const schema = z.object({ email: z.string().email("Enter a valid email address.") });

/**
 * Starts a password reset. Sends the Supabase recovery email pointing back at
 * /api/auth/recovery on this same deployment. Always reports success so the
 * endpoint can't be used to discover which emails have accounts.
 */
export async function POST(req: Request) {
  return handle(async () => {
    const { email } = await parseBody(req, schema);
    if (!supabaseConfigured()) {
      return fail(
        "demo_mode",
        "Password reset needs a database. In demo mode accounts are temporary, so there's nothing to reset.",
        400,
      );
    }
    const origin = new URL(req.url).origin;
    const supabase = await createUserClient();
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/api/auth/recovery`,
    });
    return ok({ sent: true });
  });
}
