/**
 * Supabase Server Client
 *
 * Server-side Supabase client for API routes and server components.
 * Uses cookies for authentication state management.
 */

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { Database } from "./types";
import { supabaseAdmin } from "./admin";

/**
 * Re-export the service-role admin client from `./admin`.
 * The definition lives in `./admin` (which does not import `next/headers`)
 * so server-only code can keep importing `supabaseAdmin` from here, while
 * modules reachable from a Client Component should import it from `./admin`
 * directly to avoid pulling `next/headers` across the boundary.
 */
export { supabaseAdmin };

/**
 * Create a Supabase client for server-side operations with cookie support
 * This properly handles authentication state from cookies
 */
export async function createClient() {
  // Standalone mode (Fly.io autonomous service) — no cookies available
  if (process.env.STANDALONE_MODE === "true") {
    return supabaseAdmin;
  }

  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.
          }
        },
      },
    },
  );
}

/**
 * Create a Supabase client with service role key
 * Bypasses RLS - use with caution!
 */
export async function createServiceClient() {
  const cookieStore = await cookies();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY environment variable");
  }

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Ignore errors from Server Components
          }
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}
