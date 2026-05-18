/**
 * Supabase Admin Client
 *
 * Service-role Supabase client for server-side operations that bypass RLS.
 * This module deliberately does NOT import `next/headers` — it is safe to
 * pull into any module graph (including one transitively reached by a Client
 * Component) without tripping the App Router server/client boundary.
 *
 * The cookie-based server client lives in `./server` (which does import
 * `next/headers` and must only be reached from server code).
 */

import {
  createClient as createSupabaseClient,
  type SupabaseClient,
} from "@supabase/supabase-js";
import { Database } from "./types";

/**
 * Lazily-constructed service-role client.
 *
 * Construction is deferred to first use: `createClient` throws
 * "supabaseUrl is required" when the env vars are absent, which happens
 * during `next build`'s page-data-collection phase (route modules are
 * imported with no runtime env). A module-scope `createClient` would abort
 * the build. The Proxy below preserves the `supabaseAdmin.from(...)` call
 * shape used by ~125 importers while constructing on first property access.
 */
let cachedClient: SupabaseClient<Database> | null = null;

function getAdminClient(): SupabaseClient<Database> {
  if (!cachedClient) {
    cachedClient = createSupabaseClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );
  }
  return cachedClient;
}

/**
 * Admin client for server-side operations that bypass RLS.
 * Singleton, lazily initialised — does not require cookies.
 */
export const supabaseAdmin = new Proxy({} as SupabaseClient<Database>, {
  get(_target, prop, receiver) {
    const client = getAdminClient();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});

