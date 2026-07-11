import { z } from "zod";
import { fail, handle, ok, parseBody } from "@/lib/api";
import { demoSignUp } from "@/lib/auth";
import { env, supabaseConfigured } from "@/lib/env";
import { createServiceClient, createUserClient } from "@/lib/supabase/server";

const schema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  displayName: z.string().trim().min(1, "Enter your name.").max(80),
});

export async function POST(req: Request) {
  return handle(async () => {
    const { email, password, displayName } = await parseBody(req, schema);

    if (supabaseConfigured()) {
      // Preferred path: create the account already email-confirmed via the
      // service role, then sign in. This makes sign-up work with zero email
      // dependency — it never triggers Supabase's confirmation email (so it
      // can't hit "email rate limit exceeded") and doesn't require the
      // "Confirm email" project setting to be turned off. Real confirmation
      // emails can still be used later by configuring SMTP + re-enabling it.
      if (env.supabaseServiceRoleKey) {
        try {
          const admin = createServiceClient();
          const { data: created, error: createErr } = await admin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { display_name: displayName },
          });
          if (createErr) {
            const exists =
              createErr.status === 422 ||
              /already|registered|exists/i.test(createErr.message ?? "");
            return fail(
              "auth_error",
              exists
                ? "An account with this email already exists — please sign in (or use “Forgot password?”)."
                : createErr.message,
              400,
            );
          }
          // Establish a browser session so the user lands straight in the app.
          const supabase = await createUserClient();
          await supabase.auth.signInWithPassword({ email, password });
          return ok({
            user: { id: created.user?.id ?? null, email },
            needsEmailConfirmation: false,
          });
        } catch (err) {
          console.error("[joink] admin createUser failed; falling back to signUp:", err);
          // fall through to the standard sign-up below
        }
      }

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
