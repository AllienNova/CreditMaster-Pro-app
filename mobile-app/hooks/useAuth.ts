import { useEffect, useState, useCallback } from 'react';
import { router } from 'expo-router';
import { supabase } from '../src/services/supabase';
import { useStore } from '../store/useStore';
import { authAPI } from '../services/api';
import type { Session, AuthChangeEvent } from '@supabase/supabase-js';

export function useAuth() {
  const { user, setUser, logout: storeLogout, hasCompletedOnboarding } = useStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }: { data: { session: Session | null } }) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          firstName: session.user.user_metadata.firstName || '',
          lastName: session.user.user_metadata.lastName || '',
          subscription: 'free',
          createdAt: session.user.created_at,
        });
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          firstName: session.user.user_metadata.firstName || '',
          lastName: session.user.user_metadata.lastName || '',
          subscription: 'free',
          createdAt: session.user.created_at,
        });
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [setUser]);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setError(null);

    const { error: authError } = await authAPI.login(email, password);

    if (authError) {
      setError(authError);
      setLoading(false);
      return { success: false, error: authError };
    }

    setLoading(false);
    
    if (!hasCompletedOnboarding) {
      router.replace('/onboarding');
    } else {
      router.replace('/(tabs)');
    }
    
    return { success: true, error: null };
  }, [hasCompletedOnboarding]);

  const register = useCallback(async (
    email: string,
    password: string,
    firstName: string,
    lastName: string
  ) => {
    setLoading(true);
    setError(null);

    const { error: authError } = await authAPI.register(email, password, {
      firstName,
      lastName,
    });

    if (authError) {
      setError(authError);
      setLoading(false);
      return { success: false, error: authError };
    }

    setLoading(false);
    router.replace('/onboarding');
    return { success: true, error: null };
  }, []);

  const logout = useCallback(async () => {
    setLoading(true);
    await authAPI.logout();
    storeLogout();
    setLoading(false);
    router.replace('/(auth)/login');
  }, [storeLogout]);

  const resetPassword = useCallback(async (email: string) => {
    setLoading(true);
    setError(null);

    const { error: resetError } = await authAPI.resetPassword(email);

    if (resetError) {
      setError(resetError);
      setLoading(false);
      return { success: false, error: resetError };
    }

    setLoading(false);
    return { success: true, error: null };
  }, []);

  return {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    resetPassword,
  };
}

