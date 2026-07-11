import { handle, ok } from "@/lib/api";
import {
  aiConfigured,
  razorpayConfigured,
  razorpaySubscriptionsConfigured,
  supabaseConfigured,
} from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * Diagnostic endpoint — reports which integrations are wired without ever
 * exposing secrets. When Supabase is configured it runs a lightweight query
 * to confirm connectivity AND that the migrations have been applied.
 *
 * GET /api/health
 */
export async function GET() {
  return handle(async () => {
    const supabase = {
      configured: supabaseConfigured(),
      connected: false as boolean,
      migrationsApplied: false as boolean,
      detail: "" as string,
    };

    if (supabase.configured) {
      try {
        const service = createServiceClient();
        // Reading a seeded row from `plans` proves both connectivity and that
        // 0001_init.sql ran (the table exists and is populated).
        const { error, count } = await service
          .from("plans")
          .select("code", { count: "exact", head: true });
        if (error) {
          supabase.connected = true; // we reached Postgres; the query failed
          supabase.detail =
            error.code === "42P01" || /relation .* does not exist/i.test(error.message)
              ? "Connected, but tables are missing — run supabase/setup.sql in the SQL editor."
              : `Connected, but a query failed: ${error.message}`;
        } else {
          supabase.connected = true;
          supabase.migrationsApplied = (count ?? 0) > 0;
          supabase.detail = supabase.migrationsApplied
            ? "Connected and migrations applied."
            : "Connected, but the plans table is empty — re-run supabase/setup.sql.";
        }
      } catch (err) {
        supabase.detail =
          err instanceof Error && /SERVICE_ROLE/.test(err.message)
            ? "SUPABASE_SERVICE_ROLE_KEY is not set (server-side)."
            : "Could not reach Supabase — check NEXT_PUBLIC_SUPABASE_URL and keys.";
      }
    } else {
      supabase.detail =
        "Not configured — running in demo mode (in-memory; data resets on restart).";
    }

    const healthy = supabase.configured ? supabase.migrationsApplied : true;

    return ok({
      status: healthy ? "ok" : "attention",
      mode: supabase.configured ? "supabase" : "demo",
      supabase,
      ai: { configured: aiConfigured() },
      razorpay: {
        configured: razorpayConfigured(),
        subscriptions: razorpaySubscriptionsConfigured(),
      },
      timestamp: new Date().toISOString(),
    });
  });
}
