import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { FlagKey } from "./types";

const CACHE_TTL_MS = 1_000;
const cache = new Map<string, { value: boolean; at: number }>();
let now: () => number = () => Date.now();

let client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error(
      "Feature flags require NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY; one or both are unset.",
    );
  }
  client = createClient(url, serviceRoleKey);
  return client;
}

export function __clearFlagCache(): void { cache.clear(); }
export function __setNow(fn: () => number): void { now = fn; }

export async function isFlagEnabled(key: FlagKey): Promise<boolean> {
  const hit = cache.get(key);
  if (hit && now() - hit.at < CACHE_TTL_MS) return hit.value;
  const { data, error } = await getClient()
    .from("feature_flags")
    .select("enabled")
    .eq("key", key)
    .single();
  if (error && error.code !== "PGRST116") throw error;
  const value = data?.enabled ?? false;
  cache.set(key, { value, at: now() });
  return value;
}
