import { supabaseConfigured } from "@/lib/env";
import type { DataStore } from "./types";
import { MemoryStore } from "./memory";
import { SupabaseStore } from "./supabase";
import { createServiceClient, createUserClient } from "@/lib/supabase/server";

/**
 * Returns the data store for the current request. In demo mode (no Supabase
 * env) this is a process-wide in-memory store; otherwise it's backed by
 * Supabase Postgres with RLS.
 */
export async function getStore(): Promise<DataStore> {
  if (!supabaseConfigured()) return new MemoryStore();
  const user = await createUserClient();
  const service = createServiceClient();
  return new SupabaseStore(user, service);
}

/**
 * A store usable from background work (extraction continues after the HTTP
 * response) and webhooks, where no user cookie context exists.
 */
export function getBackgroundStore(): DataStore {
  if (!supabaseConfigured()) return new MemoryStore();
  const service = createServiceClient();
  return new SupabaseStore(service, service);
}

export type { DataStore } from "./types";
