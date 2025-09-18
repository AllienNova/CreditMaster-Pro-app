import { create } from 'zustand';
import { User, Session } from '@supabase/supabase-js';
import { supabase, authHelpers } from '../services/supabase';
import * as LocalAuthentication from 'expo-local-authentication';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  biometricEnabled: boolean;
  
  // Actions
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  enableBiometric: () => Promise<boolean>;
  authenticateWithBiometric: () => Promise<boolean>;
  checkBiometricSupport: () => Promise<boolean>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  loading: true,
  biometricEnabled: false,

  signIn: async (email: string, password: string) => {
    set({ loading: true });
    
    try {
      const { data, error } = await authHelpers.signIn(email, password);
      
      if (error) {
        set({ loading: false });
        return { success: false, error: error.message };
      }

      if (data.user && data.session) {
        set({ 
          user: data.user, 
          session: data.session, 
          loading: false 
        });
        return { success: true };
      }

      set({ loading: false });
      return { success: false, error: 'Authentication failed' };
    } catch (error) {
      set({ loading: false });
      return { success: false, error: 'Network error' };
    }
  },

  signUp: async (email: string, password: string) => {
    set({ loading: true });
    
    try {
      const { data, error } = await authHelpers.signUp(email, password);
      
      if (error) {
        set({ loading: false });
        return { success: false, error: error.message };
      }

      set({ loading: false });
      return { success: true };
    } catch (error) {
      set({ loading: false });
      return { success: false, error: 'Network error' };
    }
  },

  signOut: async () => {
    set({ loading: true });
    
    try {
      await authHelpers.signOut();
      set({ 
        user: null, 
        session: null, 
        loading: false,
        biometricEnabled: false 
      });
    } catch (error) {
      set({ loading: false });
    }
  },

  resetPassword: async (email: string) => {
    try {
      const { error } = await authHelpers.resetPassword(email);
      
      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  },

  checkBiometricSupport: async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      return hasHardware && isEnrolled;
    } catch (error) {
      return false;
    }
  },

  enableBiometric: async () => {
    try {
      const isSupported = await get().checkBiometricSupport();
      if (!isSupported) return false;

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Enable biometric authentication for CreditMaster Pro',
        fallbackLabel: 'Use passcode',
      });

      if (result.success) {
        set({ biometricEnabled: true });
        return true;
      }

      return false;
    } catch (error) {
      return false;
    }
  },

  authenticateWithBiometric: async () => {
    try {
      const { biometricEnabled } = get();
      if (!biometricEnabled) return false;

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to access CreditMaster Pro',
        fallbackLabel: 'Use passcode',
      });

      return result.success;
    } catch (error) {
      return false;
    }
  },

  initialize: async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        set({ loading: false });
        return;
      }

      if (session) {
        const { user, error: userError } = await authHelpers.getCurrentUser();
        
        if (!userError && user) {
          set({ 
            user, 
            session, 
            loading: false 
          });
        } else {
          set({ loading: false });
        }
      } else {
        set({ loading: false });
      }

      // Check if biometric was previously enabled
      const biometricSupported = await get().checkBiometricSupport();
      if (biometricSupported) {
        // You could check AsyncStorage for previous biometric preference
        // For now, we'll leave it disabled by default
      }
    } catch (error) {
      set({ loading: false });
    }
  },
}));

// Listen to auth changes
supabase.auth.onAuthStateChange((event, session) => {
  const { user } = useAuthStore.getState();
  
  if (event === 'SIGNED_IN' && session) {
    useAuthStore.setState({ 
      user: session.user, 
      session, 
      loading: false 
    });
  } else if (event === 'SIGNED_OUT') {
    useAuthStore.setState({ 
      user: null, 
      session: null, 
      loading: false,
      biometricEnabled: false 
    });
  }
});

