import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { supabaseConfigured } from "@/lib/env";
import { AuthForm } from "@/components/auth-form";

export const metadata = { title: "Sign in" };

export default async function SignInPage() {
  if (await getCurrentUser()) redirect("/dashboard");
  return <AuthForm mode="sign-in" demoAvailable={!supabaseConfigured()} />;
}
