/**
 * Edge-safe feature-flag reader.
 *
 * `src/lib/flags/index.ts` reads flags through `@supabase/supabase-js`, which
 * is not safe to bundle into the Next.js Edge runtime (it pulls in Node-only
 * dependencies). The AUTH-04 middleware kill-switch needs to read exactly one
 * flag — `auth.deny_by_default` — from inside the Edge middleware, so this
 * module reads it via `fetch` against the Supabase PostgREST endpoint instead.
 *
 * `fetch` is Edge-safe. The `feature_flags` table is service-role-only
 * (see migration 20260516000000_feature_flags.sql), so the service-role key is
 * sent as the `apikey`/`Authorization` header — server-only env, never exposed
 * to the client because middleware runs server-side.
 *
 * Fail-safe semantics: if the env is missing or the request fails, this returns
 * `false` (flag OFF) — i.e. enforcement does not engage. AUTH-04 ships dark, so
 * a flag-read failure must never block legitimate traffic before the staging
 * soak; it degrades to the pre-AUTH-04 behaviour.
 */

import type { FlagKey } from "./types";

const CACHE_TTL_MS = 1_000;
const cache = new Map<FlagKey, { value: boolean; at: number }>();

/**
 * Reads a single feature flag via the Edge-safe PostgREST `fetch` path.
 *
 * Returns `false` on any missing-env or network/HTTP failure (fail-safe OFF).
 */
export async function isFlagEnabledEdge(key: FlagKey): Promise<boolean> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return false;

  try {
    const endpoint = `${url}/rest/v1/feature_flags?key=eq.${encodeURIComponent(
      key,
    )}&select=enabled`;
    const res = await fetch(endpoint, {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });
    if (!res.ok) return false;

    const rows = (await res.json()) as unknown;
    const value =
      Array.isArray(rows) &&
      rows.length > 0 &&
      typeof (rows[0] as { enabled?: unknown }).enabled === "boolean"
        ? ((rows[0] as { enabled: boolean }).enabled)
        : false;

    cache.set(key, { value, at: Date.now() });
    return value;
  } catch {
    return false;
  }
}

/** Test-only: clears the in-process flag cache. */
export function __clearEdgeFlagCache(): void {
  cache.clear();
}
