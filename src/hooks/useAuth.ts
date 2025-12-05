'use client';

/**
 * useAuth Hook
 *
 * Provides authentication state and utilities for client components
 */

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { User, AuthChangeEvent, Session } from '@supabase/supabase-js';

interface SignInCredentials {
  email: string;
  password: string;
}

interface SignUpCredentials {
  email: string;
  password: string;
  name?: string;
}

interface UseAuthReturn {
  user: User | null;
  loading: boolean;
  error: string | null;
  signIn: (credentials: SignInCredentials) => Promise<boolean>;
  signUp: (credentials: SignUpCredentials) => Promise<boolean>;
  signOut: () => Promise<void>;
}

export function useAuth(redirectTo: string = '/login'): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const signIn = useCallback(async (credentials: SignInCredentials): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      const supabase = createClient();
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (signInError) {
        setError(signInError.message);
        return false;
      }

      if (data.user) {
        setUser(data.user);
        router.push('/dashboard');
        return true;
      }

      return false;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
      return false;
    } finally {
      setLoading(false);
    }
  }, [router]);

  const signUp = useCallback(async (credentials: SignUpCredentials): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      const supabase = createClient();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: credentials.email,
        password: credentials.password,
        options: {
          data: {
            name: credentials.name,
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        return false;
      }

      if (data.user) {
        setUser(data.user);
        return true;
      }

      return false;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      const supabase = createClient();
      await supabase.auth.signOut();
      setUser(null);
      router.push('/login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign out failed');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError) {
          setError(authError.message);
          // Don't redirect on initial load - let the component decide
          setLoading(false);
          return;
        }

        if (!user) {
          setLoading(false);
          return;
        }

        setUser(user);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Authentication failed');
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
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return { user, loading, error, signIn, signUp, signOut };
}
