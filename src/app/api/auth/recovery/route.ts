import { NextResponse } from "next/server";
import { createUserClient } from "@/lib/supabase/server";

/**
 * Landing point for the Supabase password-recovery email link. Exchanges the
 * one-time code for a session (setting auth cookies here in the route handler),
 * then sends the user to /reset-password to choose a new password.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const origin = url.origin;

  if (!code) {
    return NextResponse.redirect(`${origin}/sign-in?error=recovery_expired`);
  }
  try {
    const supabase = await createUserClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(`${origin}/sign-in?error=recovery_expired`);
    }
  } catch {
    return NextResponse.redirect(`${origin}/sign-in?error=recovery_expired`);
  }
  return NextResponse.redirect(`${origin}/reset-password`);
}
