import { create } from "zustand";
import {
  supabase,
  signIn,
  signUp,
  signOut,
  getCurrentUser,
} from "../services/supabase";
import type { User } from "../types";
import { userProfileApi } from "../services/api/user";
import type { UserProfile } from "../services/api/types";

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

/**
 * Report a failed profile read instead of swallowing it.
 *
 * The read now goes through GET /api/profile (withAuth, service-role behind
 * the server) rather than querying public.profiles from the client. It had to:
 * the `authenticated` role has no grant on that table, so every direct read
 * returned
 *
 *   {"code":"42501","message":"permission denied for table profiles"}
 *
 * and onboarding state was never actually read. Verified on an iOS simulator —
 * a user whose row said onboarding_completed = false was sent straight to the
 * tabs, because the error branch assumed completion.
 *
 * The branch is still there, for genuinely transient failures, but it is no
 * longer permanently taken.
 */
/**
 * Map the API's UserProfile onto the store's User.
 *
 * The two shapes differ — the API splits the name into firstName/lastName and
 * carries subscriptionTier, the store keeps a single `name` and
 * subscription_tier — so this is a translation, not a cast. Returns null when
 * the read failed, and the caller falls back to what the auth session already
 * knows rather than rendering blanks.
 */
function toStoreUser(
  profile: UserProfile | undefined,
  fallback: Pick<User, "id" | "email" | "name" | "created_at" | "updated_at">,
): User | null {
  if (!profile) return null;
  const name = [profile.firstName, profile.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  return {
    id: profile.id || fallback.id,
    email: profile.email || fallback.email,
    name: name || fallback.name,
    phone: profile.phone,
    avatar_url: profile.avatarUrl,
    subscription_tier:
      (profile.subscriptionTier as User["subscription_tier"]) ?? "free",
    onboarding_completed: profile.onboardingCompleted,
    created_at: profile.createdAt || fallback.created_at,
    updated_at: fallback.updated_at,
  };
}

function reportProfileReadFailure(where: string, error: unknown): void {
  if (!__DEV__) return;
  const code = (error as { code?: string } | null)?.code;
  console.warn(
    `[authStore] ${where}: profiles read failed (${code ?? "unknown"}). ` +
      "Onboarding state is unknown and is being assumed complete.",
  );
}

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
        // Server-side, because the client cannot read public.profiles.
        const res = await userProfileApi.getProfile();
        const profile = toStoreUser(res.data, {
          id: user.id,
          email: user.email || "",
          name: user.user_metadata?.name || "",
          created_at: user.created_at,
          updated_at: user.updated_at || user.created_at,
        });
        const profileError = res.success ? null : (res.error ?? true);

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
          // Read from the server, which is the only place that can read it.
          // The flag used to reset to false on every cold start because it was
          // never hydrated at all, and app/index.tsx then sent a signed-in
          // user to the onboarding carousel — whose button goes to LOGIN.
          //
          // A FAILED read is still not the same as "has not onboarded":
          // treating a transport error as false marches an established user
          // back through the four-screen wizard on every network blip, and the
          // read is retried on the next launch, so assuming completion is the
          // recoverable wrong answer.
          onboardingCompleted: profileError
            ? true
            : Boolean(res.data?.onboardingCompleted),
        });
        if (profileError) reportProfileReadFailure("initialize", profileError);
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
        const res = await userProfileApi.getProfile();
        const profile = toStoreUser(res.data, {
          id: data.user.id,
          email: data.user.email || "",
          name: data.user.user_metadata?.name || "",
          created_at: data.user.created_at,
          updated_at: data.user.updated_at || data.user.created_at,
        });
        const profileError = res.success ? null : (res.error ?? true);

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
            : Boolean(res.data?.onboardingCompleted),
        });
        if (profileError) reportProfileReadFailure("login", profileError);
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
        // No profile insert here. It returned 42501 — the `authenticated`
        // role has no grant on public.profiles — so it never wrote anything,
        // and the row is created server-side on signup regardless (verified:
        // a user created purely through the auth admin API already had one).
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
      // PATCH /api/profile (withAuth). Writing the table from here failed with
      // 42501 and threw away the user's edit in silence.
      const [firstName = "", ...rest] = (updates.name ?? currentUser.name ?? "")
        .split(" ");
      const res = await userProfileApi.updateProfile({
        firstName,
        lastName: rest.join(" "),
        phone: updates.phone,
      });
      if (!res.success) {
        throw new Error(res.error?.message ?? "Failed to update profile");
      }

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
      // POST /api/onboarding/complete (withAuth) -> complete_onboarding(),
      // which moves onboarding_progress and profiles together. Writing the
      // column from here returned 42501, so the wizard could never record that
      // it had run.
      const res = await userProfileApi.completeOnboarding();
      if (!res.success) {
        throw new Error(res.error?.message ?? "Failed to complete onboarding");
      }

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
