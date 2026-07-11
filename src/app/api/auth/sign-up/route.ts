import { z } from "zod";
import { fail, handle, ok, parseBody } from "@/lib/api";
import { demoSignUp } from "@/lib/auth";
import { supabaseConfigured } from "@/lib/env";
import { createUserClient } from "@/lib/supabase/server";

const schema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  displayName: z.string().trim().min(1, "Enter your name.").max(80),
});

export async function POST(req: Request) {
  return handle(async () => {
    const { email, password, displayName } = await parseBody(req, schema);

    if (supabaseConfigured()) {
      const supabase = await createUserClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: displayName } },
      });
      if (error) return fail("auth_error", error.message, 400);
      return ok({
        user: data.user ? { id: data.user.id, email: data.user.email } : null,
        needsEmailConfirmation: !data.session,
      });
    }

    const { user, error } = await demoSignUp(email, password, displayName);
    if (!user) return fail("auth_error", error ?? "Could not create account.", 400);
    return ok({ user, needsEmailConfirmation: false });
  });
}
