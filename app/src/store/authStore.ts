import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, Session } from '@supabase/supabase-js';
import type { User as AppUser } from '@/types';

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: AppUser | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}

interface AuthActions {
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setProfile: (profile: AppUser | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearAuth: () => void;
  clearError: () => void;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      session: null,
      profile: null,
      loading: true,
      error: null,
      isAuthenticated: false,

      // Actions
      setUser: (user) => 
        set((state) => ({ 
          ...state, 
          user, 
          isAuthenticated: !!user 
        })),

      setSession: (session) => 
        set((state) => ({ 
          ...state, 
          session,
          isAuthenticated: !!session?.user
        })),

      setProfile: (profile) => 
        set((state) => ({ 
          ...state, 
          profile 
        })),

      setLoading: (loading) => 
        set((state) => ({ 
          ...state, 
          loading 
        })),

      setError: (error) => 
        set((state) => ({ 
          ...state, 
          error 
        })),

      clearAuth: () => 
        set(() => ({
          user: null,
          session: null,
          profile: null,
          loading: false,
          error: null,
          isAuthenticated: false
        })),

      clearError: () => 
        set((state) => ({ 
          ...state, 
          error: null 
        }))
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        // Only persist non-sensitive data
        profile: state.profile,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
);

// Selectors for better performance
export const useAuthUser = () => useAuthStore((state) => state.user);
export const useAuthSession = () => useAuthStore((state) => state.session);
export const useAuthProfile = () => useAuthStore((state) => state.profile);
export const useAuthLoading = () => useAuthStore((state) => state.loading);
export const useAuthError = () => useAuthStore((state) => state.error);
export const useIsAuthenticated = () => useAuthStore((state) => state.isAuthenticated);

