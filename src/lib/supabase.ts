/**
 * Supabase Client (Legacy)
 *
 * @deprecated Use `getSupabase()` or `createClient()` from '@/lib/supabase/client' instead.
 * This file is maintained for backwards compatibility but will throw errors if env vars are missing.
 *
 * Provides a configured Supabase client for database and authentication operations.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Supabase configuration - NO MORE PLACEHOLDERS
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Validate environment variables at runtime
if (!supabaseUrl || !supabaseAnonKey) {
  const missing = [];
  if (!supabaseUrl) missing.push('NEXT_PUBLIC_SUPABASE_URL');
  if (!supabaseAnonKey) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  // Missing required Supabase environment variables
  // In development, throw to catch early. In production, log but don't crash on import.
  if (process.env.NODE_ENV === 'development') {
    throw new Error(`Missing required Supabase environment variables: ${missing.join(', ')}`);
  }
}

// Lazy initialization to prevent crashes if env vars missing at import time
let _supabase: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (!_supabase) {
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase environment variables are not configured');
    }
    _supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }
  return _supabase;
}

// Export getter for lazy initialization
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return Reflect.get(getSupabaseClient(), prop);
  },
});

export default supabase;

