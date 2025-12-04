/**
 * Database Connection Pool Configuration
 * 
 * Configures Supabase connection pooling for optimal performance.
 * Uses Supabase's built-in connection pooler (Supavisor) for production.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Connection pool configuration
interface PoolConfig {
  maxConnections: number;
  idleTimeout: number;
  connectionTimeout: number;
  usePooler: boolean;
}

const DEFAULT_CONFIG: PoolConfig = {
  maxConnections: 20,
  idleTimeout: 30000, // 30 seconds
  connectionTimeout: 10000, // 10 seconds
  usePooler: process.env.NODE_ENV === 'production'
};

/**
 * Get the appropriate Supabase URL based on environment
 * Uses pooler URL in production for better connection management
 */
function getSupabaseUrl(): string {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  
  // In production, use the pooler URL if available
  if (DEFAULT_CONFIG.usePooler && process.env.SUPABASE_POOLER_URL) {
    return process.env.SUPABASE_POOLER_URL;
  }
  
  // For Supabase, the pooler URL follows a pattern
  // Replace db.xxx.supabase.co with pooler.xxx.supabase.co
  if (DEFAULT_CONFIG.usePooler && baseUrl.includes('.supabase.co')) {
    return baseUrl.replace('db.', 'pooler.');
  }
  
  return baseUrl;
}

// Singleton client instances
let publicClient: SupabaseClient | null = null;
let serviceClient: SupabaseClient | null = null;

/**
 * Get a pooled Supabase client for public access
 * Uses anon key with RLS policies
 */
export function getPooledClient(): SupabaseClient {
  if (!publicClient) {
    publicClient = createClient(
      getSupabaseUrl(),
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        },
        db: {
          schema: 'public'
        },
        global: {
          headers: {
            'x-connection-pool': 'true'
          }
        }
      }
    );
  }
  return publicClient;
}

/**
 * Get a pooled Supabase client for service operations
 * Uses service role key, bypasses RLS
 */
export function getServiceClient(): SupabaseClient {
  if (!serviceClient) {
    serviceClient = createClient(
      getSupabaseUrl(),
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        },
        db: {
          schema: 'public'
        },
        global: {
          headers: {
            'x-connection-pool': 'true'
          }
        }
      }
    );
  }
  return serviceClient;
}

/**
 * Execute a query with automatic retry on connection errors
 */
export async function executeWithRetry<T>(
  queryFn: (client: SupabaseClient) => Promise<T>,
  options?: { maxRetries?: number; useService?: boolean }
): Promise<T> {
  const maxRetries = options?.maxRetries || 3;
  const client = options?.useService ? getServiceClient() : getPooledClient();
  
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await queryFn(client);
    } catch (error: any) {
      lastError = error;
      
      // Only retry on connection errors
      const isConnectionError = 
        error.code === 'ECONNRESET' ||
        error.code === 'ETIMEDOUT' ||
        error.message?.includes('connection') ||
        error.message?.includes('timeout');
      
      if (!isConnectionError || attempt === maxRetries) {
        throw error;
      }
      
      // Exponential backoff
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

/**
 * Health check for database connection
 */
export async function checkDatabaseHealth(): Promise<{
  healthy: boolean;
  latency: number;
  poolerEnabled: boolean;
}> {
  const start = Date.now();
  
  try {
    const client = getPooledClient();
    await client.from('profiles').select('id').limit(1);
    
    return {
      healthy: true,
      latency: Date.now() - start,
      poolerEnabled: DEFAULT_CONFIG.usePooler
    };
  } catch {
    return {
      healthy: false,
      latency: Date.now() - start,
      poolerEnabled: DEFAULT_CONFIG.usePooler
    };
  }
}

