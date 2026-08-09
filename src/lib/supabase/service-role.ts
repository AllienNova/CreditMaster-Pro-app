/**
 * Server-side Supabase client that runs with the service role.
 *
 * WHY THIS EXISTS. Server-side services were reading through the module-level
 * anon-key singleton in `./client`. That client carries no user JWT, so
 * `auth.uid()` is NULL, and every table these services touch has RLS policies of
 * the form `(auth.uid() = user_id)`. PostgREST therefore returned ZERO ROWS WITH
 * NO ERROR — no exception to catch, no `{ error }` to check. A user with data
 * and a user with none were indistinguishable, which is how "net worth is $0"
 * and a dozen similar symptoms happened. See docs/qa/anon-client-architecture.md.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  READ THIS BEFORE USING IT
 *
 *  This client BYPASSES ROW LEVEL SECURITY. On every table these services
 *  touch, RLS was the ONLY thing scoping a read to the current user. Once you
 *  query through here, that protection is gone and the `.eq("user_id", userId)`
 *  filter is LOAD-BEARING, not defensive.
 *
 *  Every query MUST filter by the caller's user id. Omitting it does not
 *  produce an error — it produces every user's rows. FND-030 was exactly this:
 *  portfolio-service dropped the `user_id` filter and any authenticated user
 *  could read another user's holdings.
 *
 *  scripts/audit-service-role-idor.js checks this mechanically. Run it after
 *  touching any file that imports this module.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Untyped on purpose: the checked-in `Database` type is a stale subset that
 * omits most tables, so a typed client rejects them at compile time. Narrowing
 * that is its own slice; using `any` here would spread the problem instead.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;
let proxy: SupabaseClient | null = null;

function getRealClient(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    // Fail loudly and specifically. A missing service-role key previously
    // surfaced as an empty result set several call-frames away.
    throw new Error(
      "getServiceRoleClient: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set",
    );
  }

  cached = createClient(url, key);
  return cached;
}

/**
 * The service-role client.
 *
 * Returns a Proxy, NOT the real client — the real one is constructed on first
 * property access. This mirrors `getSupabase()` in ./client and exists for the
 * same reason: dozens of modules do `const supabase = getServiceRoleClient()`
 * at MODULE SCOPE, and `next build`'s page-data-collection phase imports every
 * route module with no runtime env. Constructing eagerly would abort the build
 * with "supabaseUrl is required".
 *
 * It also keeps the anon->service-role migration a two-line import swap per
 * file rather than a rewrite of every call site, which is where that migration
 * previously went wrong.
 */
export function getServiceRoleClient(): SupabaseClient {
  if (!proxy) {
    proxy = new Proxy({} as SupabaseClient, {
      get(_target, prop, receiver) {
        const client = getRealClient();
        const value = Reflect.get(client, prop, receiver);
        return typeof value === "function" ? value.bind(client) : value;
      },
    });
  }
  return proxy;
}

/** Test-only: drop the cached client so env changes take effect. */
export function resetServiceRoleClientForTests(): void {
  cached = null;
  proxy = null;
}
