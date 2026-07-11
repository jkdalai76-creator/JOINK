import { z } from "zod";
import { fail, handle, ok, parseBody } from "@/lib/api";
import { demoSignIn } from "@/lib/auth";
import { supabaseConfigured } from "@/lib/env";
import { createUserClient } from "@/lib/supabase/server";

const schema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

export async function POST(req: Request) {
  return handle(async () => {
    const { email, password } = await parseBody(req, schema);

    if (supabaseConfigured()) {
      const supabase = await createUserClient();
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return fail("auth_error", "Incorrect email or password.", 401);
      return ok({ user: { id: data.user.id, email: data.user.email } });
    }

    const { user, error } = await demoSignIn(email, password);
    if (!user) return fail("auth_error", error ?? "Sign-in failed.", 401);
    return ok({ user });
  });
}
