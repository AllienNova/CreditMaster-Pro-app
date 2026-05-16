/**
 * Trusted role resolution.
 *
 * `resolveRoleFromDb` is the one trusted source for a user's authorization
 * role: it reads `profiles.role` from the database. JWT role claims and
 * `user_metadata`/`app_metadata` are never trusted — a forged or stale token
 * controls those (FND-005).
 *
 * Uses a module-level Supabase service-role client (constructed once, lazily)
 * and a 15s per-userId cache so an authenticated request does ~1 lookup, not N.
 *
 * Accepted tradeoff: a role demotion takes effect within <=15s (the TTL), not
 * instantly — strictly better than the status quo (JWT claim stale until token
 * expiry, ~1h). Documented in SECURITY.md.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isRole, type Role } from "./roles";

const ROLE_CACHE_TTL_MS = 15_000;
const cache = new Map<string, { role: Role; at: number }>();
let client: SupabaseClient | null = null;
let now: () => number = () => Date.now();

export function __clearRoleCache(): void {
  cache.clear();
}
export function __setNow(fn: () => number): void {
  now = fn;
}

function getClient(): SupabaseClient {
  if (!client) {
    client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!, // service-role: bypasses RLS
    );
  }
  return client;
}

export async function resolveRoleFromDb(userId: string): Promise<Role> {
  const hit = cache.get(userId);
  if (hit && now() - hit.at < ROLE_CACHE_TTL_MS) return hit.role;
  // `error` is intentionally ignored: a missing row or a transient DB error
  // both fall through to the "user" default below. This is deliberately
  // fail-closed — a DB blip demotes a user, never escalates. Do NOT "fix"
  // this into a fail-open path that trusts a non-DB role source.
  const { data } = await getClient()
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();
  const role: Role = isRole(data?.role) ? data!.role : "user";
  cache.set(userId, { role, at: now() });
  return role;
}
