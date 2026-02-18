/**
 * Supabase Client Configuration
 *
 * Centralized Supabase client for both browser and server contexts.
 */

import { createBrowserClient } from '@supabase/ssr';
import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from './types';

// Browser client for client components (used in React components)
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Lazy-initialized singleton for service layer operations.
// Intentionally untyped (no <Database> generic) because the Database type
// only covers ~20 tables while the codebase uses 40+. Services that need
// typed access should use createClient() instead.
let _supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    _supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return _supabase;
}

// Legacy export removed - use getSupabase() or createClient() instead
// The previous `export const supabase = getSupabase()` caused build failures
// because it executed at module load time before environment variables were available
