import { createClient } from "@supabase/supabase-js";
import type { FlagKey } from "./types";

const CACHE_TTL_MS = 1_000;
const cache = new Map<string, { value: boolean; at: number }>();
let now: () => number = () => Date.now();

export function __clearFlagCache(): void { cache.clear(); }
export function __setNow(fn: () => number): void { now = fn; }

export async function isFlagEnabled(key: FlagKey): Promise<boolean> {
  const hit = cache.get(key);
  if (hit && now() - hit.at < CACHE_TTL_MS) return hit.value;
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  const { data } = await supabase.from("feature_flags").select("key, enabled").eq("key", key).single();
  const value = data?.enabled ?? false;
  cache.set(key, { value, at: now() });
  return value;
}
