import { create } from 'zustand';
import { supabase, signIn, signUp, signOut, getCurrentUser } from '../services/supabase';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  
  // Actions
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, name: string) => Promise<boolean>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  error: null,

  initialize: async () => {
    set({ isLoading: true });
    try {
      const { user, error } = await getCurrentUser();
      if (error) throw error;
      
      if (user) {
        // Fetch user profile from database
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        set({
          user: profile as User || {
            id: user.id,
            email: user.email || '',
            name: user.user_metadata?.name || '',
            subscription_tier: 'free',
            created_at: user.created_at,
            updated_at: user.updated_at || user.created_at,
          },
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        set({ user: null, isAuthenticated: false, isLoading: false });
      }
    } catch (error) {
      set({ 
        user: null, 
        isAuthenticated: false, 
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to initialize',
      });
    }
  },

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await signIn(email, password);
      if (error) throw error;
      
      if (data.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        set({
          user: profile as User || {
            id: data.user.id,
            email: data.user.email || '',
            name: data.user.user_metadata?.name || '',
            subscription_tier: 'free',
            created_at: data.user.created_at,
            updated_at: data.user.updated_at || data.user.created_at,
          },
          isAuthenticated: true,
          isLoading: false,
        });
        return true;
      }
      return false;
    } catch (error) {
      set({ 
        isLoading: false,
        error: error instanceof Error ? error.message : 'Login failed',
      });
      return false;
    }
  },

  register: async (email: string, password: string, name: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await signUp(email, password, name);
      if (error) throw error;
      
      if (data.user) {
        // Create profile in database
        await supabase.from('profiles').insert({
          id: data.user.id,
          email,
          name,
          subscription_tier: 'free',
        });

        set({
          user: {
            id: data.user.id,
            email,
            name,
            subscription_tier: 'free',
            created_at: data.user.created_at,
            updated_at: data.user.created_at,
          },
          isAuthenticated: true,
          isLoading: false,
        });
        return true;
      }
      return false;
    } catch (error) {
      set({ 
        isLoading: false,
        error: error instanceof Error ? error.message : 'Registration failed',
      });
      return false;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    await signOut();
    set({ user: null, isAuthenticated: false, isLoading: false });
  },

  clearError: () => set({ error: null }),
}));

