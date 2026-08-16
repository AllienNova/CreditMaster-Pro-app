import { create } from "zustand";
import {
  supabase,
  signIn,
  signUp,
  signOut,
  getCurrentUser,
} from "../services/supabase";
import type { User } from "../types";

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  onboardingCompleted: boolean;

  // Actions
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, name: string) => Promise<boolean>;
  logout: () => Promise<void>;
  clearError: () => void;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  setUser: (user: User | null) => void;
}

export type { AuthState };

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  error: null,
  onboardingCompleted: false,

  setUser: (user) => set({ user, isAuthenticated: !!user }),

  initialize: async () => {
    set({ isLoading: true });

    try {
      const { user, error } = await getCurrentUser();
      if (error) throw error;

      if (user) {
        // Fetch user profile from database
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        set({
          user: (profile as User) || {
            id: user.id,
            email: user.email || "",
            name: user.user_metadata?.name || "",
            subscription_tier: "free",
            created_at: user.created_at,
            updated_at: user.updated_at || user.created_at,
          },
          isAuthenticated: true,
          isLoading: false,
          // The profile row was already fetched with select("*"), so this
          // column was in hand and simply dropped. Without it the flag reset
          // to false on every cold start, and app/index.tsx sent a signed-in
          // user to the onboarding carousel — whose button goes to LOGIN.
          //
          // A FAILED read is not the same as "has not onboarded". Treating a
          // transport error as false marches an established user back through
          // the four-screen wizard on every network blip; the read is retried
          // on the next launch, so assuming completion is the recoverable
          // wrong answer. A missing ROW (no error, no data) is different and
          // does mean unfinished — register() inserts the row, so its absence
          // is a genuinely unconfigured account.
          onboardingCompleted: profileError
            ? true
            : Boolean((profile as User | null)?.onboarding_completed),
        });
      } else {
        set({ user: null, isAuthenticated: false, isLoading: false });
      }
    } catch (error) {
      // A missing session is the normal logged-out state on app start, not an
      // error to surface — otherwise the login screen shows "Auth session
      // missing!" to a user who simply hasn't signed in yet.
      const isNoSession =
        error instanceof Error &&
        (error.name === "AuthSessionMissingError" ||
          error.message === "Auth session missing!");
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: isNoSession
          ? null
          : error instanceof Error
            ? error.message
            : "Failed to initialize",
      });
    }
  },

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await signIn(email, password);
      if (error) throw error;

      if (data.user) {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", data.user.id)
          .single();

        set({
          user: (profile as User) || {
            id: data.user.id,
            email: data.user.email || "",
            name: data.user.user_metadata?.name || "",
            subscription_tier: "free",
            created_at: data.user.created_at,
            updated_at: data.user.updated_at || data.user.created_at,
          },
          isAuthenticated: true,
          isLoading: false,
          // Same rule as initialize: an unreadable profile must not replay
          // the wizard for someone who already finished it.
          onboardingCompleted: profileError
            ? true
            : Boolean((profile as User | null)?.onboarding_completed),
        });
        return true;
      }
      return false;
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : "Login failed",
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
        await supabase.from("profiles").insert({
          id: data.user.id,
          email,
          name,
          subscription_tier: "free",
        });

        set({
          user: {
            id: data.user.id,
            email,
            name,
            subscription_tier: "free",
            created_at: data.user.created_at,
            updated_at: data.user.created_at,
          },
          isAuthenticated: true,
          isLoading: false,
          // A brand-new account has no profile, no goals and no linked
          // institutions — exactly what the setup wizard collects.
          onboardingCompleted: false,
        });
        return true;
      }
      return false;
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : "Registration failed",
      });
      return false;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    await signOut();
    // onboardingCompleted is per-USER state. Leaving it set carries one
    // account's answer into the next sign-in attempt.
    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      onboardingCompleted: false,
    });
  },

  clearError: () => set({ error: null }),

  updateProfile: async (updates: Partial<User>) => {
    const currentUser = useAuthStore.getState().user;
    if (!currentUser) return;

    try {
      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", currentUser.id);

      if (error) throw error;

      set({
        user: { ...currentUser, ...updates },
      });
    } catch (error) {
      if (__DEV__) console.error("Failed to update profile:", error);
      throw error;
    }
  },

  completeOnboarding: async () => {
    const currentUser = useAuthStore.getState().user;
    if (!currentUser) return;

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ onboarding_completed: true })
        .eq("id", currentUser.id);

      if (error) throw error;

      // Only after the write succeeds. Setting it optimistically would let a
      // failed write leave the app believing onboarding is done, and the
      // wizard is the only thing that ever sets the column.
      set({ onboardingCompleted: true });
    } catch (error) {
      if (__DEV__) console.error("Failed to complete onboarding:", error);
      throw error;
    }
  },
}));
