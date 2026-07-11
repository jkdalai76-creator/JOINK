import { handle, ok } from "@/lib/api";
import { clearDemoSession } from "@/lib/auth";
import { supabaseConfigured } from "@/lib/env";
import { createUserClient } from "@/lib/supabase/server";

export async function POST() {
  return handle(async () => {
    if (supabaseConfigured()) {
      const supabase = await createUserClient();
      await supabase.auth.signOut();
    } else {
      await clearDemoSession();
    }
    return ok({ signedOut: true });
  });
}
