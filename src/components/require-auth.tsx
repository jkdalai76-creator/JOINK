import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { runtimeMode } from "@/lib/env";
import { AppShell } from "./app-shell";

/** Server wrapper for authenticated pages: redirects guests to sign-in. */
export async function RequireAuth({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  return (
    <AppShell user={user} mode={runtimeMode()}>
      {children}
    </AppShell>
  );
}
