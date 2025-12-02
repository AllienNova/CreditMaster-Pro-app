'use client';

/**
 * useAuth Hook
 *
 * Provides authentication state and utilities for client components
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { User, AuthChangeEvent, Session } from '@supabase/supabase-js';

interface UseAuthReturn {
  user: User | null;
  loading: boolean;
  error: string | null;
}

export function useAuth(redirectTo: string = '/login'): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError) {
          setError(authError.message);
          router.push(redirectTo);
          return;
        }

        if (!user) {
          router.push(redirectTo);
          return;
        }

        setUser(user);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Authentication failed');
        router.push(redirectTo);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // Subscribe to auth changes
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      if (session?.user) {
        setUser(session.user);
      } else {
        setUser(null);
        router.push(redirectTo);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router, redirectTo]);

  return { user, loading, error };
}
