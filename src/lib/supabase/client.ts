/**
 * Supabase Client Configuration
 *
 * Centralized Supabase client for both browser and server contexts.
 */

import { createBrowserClient } from "@supabase/ssr";
import {
  createClient as createSupabaseClient,
  SupabaseClient,
} from "@supabase/supabase-js";
// Browser client for client components (used in React components).
// Falls back to placeholder URL/key so next build's SSR prerender phase
// (which runs "use client" components on the server with no env vars) does
// not throw "URL and API key are required". The placeholder client is never
// used for real requests — actual usage happens after hydration in the browser
// where the real env vars are present.
// Intentionally untyped (no <Database> generic) — the Database type only
// covers ~20 tables while the codebase uses 40+, matching the rationale for
// getSupabase() below.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key",
  );
}

// Lazy-initialized singleton for service layer operations.
// Intentionally untyped (no <Database> generic) because the Database type
// only covers ~20 tables while the codebase uses 40+. Services that need
// typed access should use createClient() instead.
//
// `getSupabase()` returns a Proxy, NOT the real client. Dozens of modules do
// `const supabase = getSupabase()` at MODULE SCOPE — if calling getSupabase()
// eagerly built the client, `next build`'s page-data-collection phase (which
// imports every route module with no runtime env) would abort with
// "supabaseUrl is required". The Proxy makes getSupabase() side-effect free;
// the real client is constructed on first property access (request time).
let _supabase: SupabaseClient | null = null;
let _supabaseProxy: SupabaseClient | null = null;

function getRealSupabase(): SupabaseClient {
  if (!_supabase) {
    _supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }
  return _supabase;
}

export function getSupabase(): SupabaseClient {
  if (!_supabaseProxy) {
    _supabaseProxy = new Proxy({} as SupabaseClient, {
      get(_t, prop, recv) {
        const client = getRealSupabase();
        const value = Reflect.get(client, prop, recv);
        return typeof value === "function" ? value.bind(client) : value;
      },
    });
  }
  return _supabaseProxy;
}

// Legacy export removed - use getSupabase() or createClient() instead
// The previous `export const supabase = getSupabase()` caused build failures
// because it executed at module load time before environment variables were available
