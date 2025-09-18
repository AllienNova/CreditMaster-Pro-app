import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, signUp, signIn, signOut, getCurrentUser, getCurrentSession } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import type { User as AppUser } from '@/types';

export interface AuthState {
  user: User | null;
  session: Session | null;
  profile: AppUser | null;
  loading: boolean;
  error: string | null;
}

export interface AuthActions {
  signUp: (email: string, password: string, userData?: any) => Promise<{ success: boolean; error?: string }>;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<{ success: boolean; error?: string }>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  updateProfile: (updates: Partial<AppUser>) => Promise<{ success: boolean; error?: string }>;
  refreshSession: () => Promise<void>;
}

export const useAuth = (): AuthState & AuthActions => {
  const {
    user,
    session,
    profile,
    loading,
    error,
    setUser,
    setSession,
    setProfile,
    setLoading,
    setError,
    clearAuth
  } = useAuthStore();

  // Initialize auth state
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        setLoading(true);
        
        // Get current session
        const { session: currentSession, error: sessionError } = await getCurrentSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          setError(sessionError.message);
          return;
        }

        if (currentSession?.user && mounted) {
          setSession(currentSession);
          setUser(currentSession.user);
          
          // Fetch user profile
          await fetchUserProfile(currentSession.user.id);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (mounted) {
          setError(error instanceof Error ? error.message : 'Authentication error');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        console.log('Auth state changed:', event, session?.user?.id);
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (event === 'SIGNED_IN' && session?.user) {
          await fetchUserProfile(session.user.id);
        } else if (event === 'SIGNED_OUT') {
          clearAuth();
        }
        
        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) {
        // If profile doesn't exist, create one
        if (profileError.code === 'PGRST116') {
          const { data: userData } = await getCurrentUser();
          if (userData.user) {
            const newProfile = {
              id: userData.user.id,
              email: userData.user.email!,
              full_name: userData.user.user_metadata?.full_name || '',
              phone: userData.user.user_metadata?.phone || null,
              address: {
                street: '',
                city: '',
                state: '',
                zip_code: '',
                country: 'US'
              },
              subscription_tier: 'basic' as const,
              onboarding_completed: false
            };

            const { data: createdProfile, error: createError } = await supabase
              .from('profiles')
              .insert(newProfile)
              .select()
              .single();

            if (!createError && createdProfile) {
              setProfile(createdProfile);
            }
          }
        } else {
          console.error('Profile fetch error:', profileError);
          setError(profileError.message);
        }
      } else if (profileData) {
        setProfile(profileData);
      }
    } catch (error) {
      console.error('Profile fetch error:', error);
      setError(error instanceof Error ? error.message : 'Profile fetch error');
    }
  };

  const handleSignUp = async (email: string, password: string, userData?: any) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await signUp(email, password, {
        full_name: userData?.fullName || '',
        phone: userData?.phone || ''
      });

      if (error) {
        setError(error.message);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign up failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await signIn(email, password);

      if (error) {
        setError(error.message);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign in failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      setLoading(true);
      setError(null);

      const { error } = await signOut();

      if (error) {
        setError(error.message);
        return { success: false, error: error.message };
      }

      clearAuth();
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign out failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) {
        setError(error.message);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Password reset failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<AppUser>) => {
    try {
      if (!user) {
        return { success: false, error: 'No user logged in' };
      }

      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select()
        .single();

      if (error) {
        setError(error.message);
        return { success: false, error: error.message };
      }

      if (data) {
        setProfile(data);
      }

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Profile update failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const refreshSession = async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error('Session refresh error:', error);
        setError(error.message);
      } else if (data.session) {
        setSession(data.session);
        setUser(data.session.user);
      }
    } catch (error) {
      console.error('Session refresh error:', error);
      setError(error instanceof Error ? error.message : 'Session refresh failed');
    }
  };

  return {
    // State
    user,
    session,
    profile,
    loading,
    error,
    
    // Actions
    signUp: handleSignUp,
    signIn: handleSignIn,
    signOut: handleSignOut,
    resetPassword,
    updateProfile,
    refreshSession
  };
};

// Helper hooks
export const useRequireAuth = () => {
  const { user, loading } = useAuth();
  
  useEffect(() => {
    if (!loading && !user) {
      // Redirect to login or show auth modal
      window.location.href = '/login';
    }
  }, [user, loading]);
  
  return { user, loading };
};

export const useAuthRedirect = () => {
  const { user, loading } = useAuth();
  
  useEffect(() => {
    if (!loading && user) {
      // Redirect authenticated users away from auth pages
      window.location.href = '/dashboard';
    }
  }, [user, loading]);
  
  return { user, loading };
};

