/**
 * Authentication Service
 *
 * Provides complete authentication functionality including:
 * - User registration
 * - User login
 * - Password reset
 * - Session management
 * - Token validation
 */

import { createClient } from "@/lib/supabase/client";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { logger } from "@/lib/monitoring/logger";

/**
 * Browser client, NOT the anon-keyed getSupabase() singleton this used to hold.
 *
 * getSupabase() builds a raw createClient(url, ANON_KEY), which stores its
 * session in localStorage. The app signs in through useAuth -> createClient()
 * -> @supabase/ssr's createBrowserClient, which stores its session in COOKIES.
 * Two different stores: the raw client never saw the session the app actually
 * established, so auth.uid() was NULL here and every RLS policy of the form
 * (auth.uid() = user_id) matched nothing — zero rows, no error.
 *
 * These modules are called at runtime from "use client" components, so they
 * must NOT use the service role (that key is server-only). createBrowserClient
 * returns a cached singleton in the browser (@supabase/ssr 0.7.0,
 * createBrowserClient.js:8-14,46), so this is the same client useAuth holds,
 * and RLS correctly enforces ownership under the user's own identity.
 */
const supabase = createClient();
import {
  validateSignUpData,
  validateSignInData,
  validateResetEmail,
  sanitizeInput,
} from "./validation";

export interface User {
  id: string;
  email: string;
  name: string;
  role: "user" | "premium" | "admin" | "super_admin";
  subscriptionId?: string;
  subscriptionStatus?: "active" | "canceled" | "past_due" | "trialing";
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  error?: string;
  token?: string;
}

export interface SignUpData {
  email: string;
  password: string;
  name: string;
}

export interface SignInData {
  email: string;
  password: string;
}

export interface ResetPasswordData {
  email: string;
}

export interface UpdatePasswordData {
  token: string;
  newPassword: string;
}

class AuthService {
  /**
   * Register a new user
   */
  async signUp(data: SignUpData): Promise<AuthResponse> {
    try {
      // Validate input data
      const validation = validateSignUpData({
        name: data.name,
        email: data.email,
        password: data.password,
      });

      if (!validation.valid) {
        return {
          success: false,
          error: validation.error,
        };
      }

      // Sanitize inputs
      const sanitizedName = sanitizeInput(data.name);
      const sanitizedEmail = sanitizeInput(data.email).toLowerCase();

      // Create user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: sanitizedEmail,
        password: data.password,
        options: {
          data: {
            name: sanitizedName,
          },
        },
      });

      if (authError) {
        return {
          success: false,
          error: authError.message,
        };
      }

      if (!authData.user) {
        return {
          success: false,
          error: "Failed to create user",
        };
      }

      // Create user profile in database (using canonical 'profiles' table)
      const { error: profileError } = await supabase.from("profiles").insert({
        id: authData.user.id,
        full_name: sanitizedName,
        subscription_tier: "free",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (profileError) {
        // FND-009: signup must be atomic. A failed profile insert previously
        // left an orphaned auth user (an account with no profile row). Roll
        // back by deleting the just-created auth user and fail the signup so
        // the caller can retry cleanly.
        const { error: deleteError } =
          await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        if (deleteError) {
          // Cleanup itself failed — the orphan persists. Surface it loudly
          // so it can be reconciled rather than silently lost.
          logger.error(
            "Failed to roll back orphaned auth user after profile insert failure",
            deleteError,
            { userId: authData.user.id },
          );
        }
        return {
          success: false,
          error: "Failed to create user profile. Please try again.",
        };
      }

      const user: User = {
        id: authData.user.id,
        email: sanitizedEmail,
        name: sanitizedName,
        role: "user",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      return {
        success: true,
        user,
        token: authData.session?.access_token,
      };
    } catch (error) {
      // Sign up error - returning error response
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to sign up",
      };
    }
  }

  /**
   * Sign in an existing user
   */
  async signIn(data: SignInData): Promise<AuthResponse> {
    try {
      // Validate input data
      const validation = validateSignInData({
        email: data.email,
        password: data.password,
      });

      if (!validation.valid) {
        return {
          success: false,
          error: validation.error,
        };
      }

      // Sanitize email
      const sanitizedEmail = sanitizeInput(data.email).toLowerCase();

      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email: sanitizedEmail,
          password: data.password,
        });

      if (authError) {
        return {
          success: false,
          error: authError.message,
        };
      }

      if (!authData.user) {
        return {
          success: false,
          error: "Invalid credentials",
        };
      }

      // Get user profile from database (using canonical 'profiles' table)
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authData.user.id)
        .single();

      if (profileError) {
        // Profile fetch failed - using fallback data
      }

      const user: User = {
        id: authData.user.id,
        email: authData.user.email || sanitizedEmail,
        name:
          profileData?.full_name || authData.user.user_metadata?.name || "User",
        role:
          profileData?.subscription_tier === "premium" ||
          profileData?.subscription_tier === "enterprise"
            ? "premium"
            : "user",
        subscriptionId: profileData?.stripe_customer_id,
        subscriptionStatus:
          profileData?.subscription_status as User["subscriptionStatus"],
        createdAt: new Date(authData.user.created_at),
        updatedAt: new Date(
          profileData?.updated_at || authData.user.updated_at,
        ),
      };

      return {
        success: true,
        user,
        token: authData.session?.access_token,
      };
    } catch (error) {
      // Sign in error - returning error response
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to sign in",
      };
    }
  }

  /**
   * Sign out the current user
   */
  async signOut(): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      return { success: true };
    } catch (error) {
      // Sign out error - returning error response
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to sign out",
      };
    }
  }

  /**
   * Get the current authenticated user
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !authUser) {
        return null;
      }

      // Get user profile from database (using canonical 'profiles' table)
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authUser.id)
        .single();

      if (profileError) {
        // Profile fetch failed - using fallback data
      }

      const user: User = {
        id: authUser.id,
        email: authUser.email || "",
        name: profileData?.full_name || authUser.user_metadata?.name || "User",
        role:
          profileData?.subscription_tier === "premium" ||
          profileData?.subscription_tier === "enterprise"
            ? "premium"
            : "user",
        subscriptionId: profileData?.stripe_customer_id,
        subscriptionStatus:
          profileData?.subscription_status as User["subscriptionStatus"],
        createdAt: new Date(authUser.created_at),
        updatedAt: new Date(profileData?.updated_at || authUser.updated_at),
      };

      return user;
    } catch (error) {
      // Get current user error - returning null
      return null;
    }
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(
    data: ResetPasswordData,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Validate email
      const validation = validateResetEmail(data.email);

      if (!validation.valid) {
        return {
          success: false,
          error: validation.error,
        };
      }

      // Sanitize email
      const sanitizedEmail = sanitizeInput(data.email).toLowerCase();

      // Get the app URL from environment variable or use default for development
      const appUrl =
        process.env.NEXT_PUBLIC_APP_URL ||
        (typeof globalThis.window !== "undefined"
          ? globalThis.window.location.origin
          : "http://localhost:3000");

      const { error } = await supabase.auth.resetPasswordForEmail(
        sanitizedEmail,
        {
          redirectTo: `${appUrl}/auth/reset-password`,
        },
      );

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      return { success: true };
    } catch (error) {
      // Password reset request error - returning error response
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to request password reset",
      };
    }
  }

  /**
   * Update password with reset token
   */
  async updatePassword(
    data: UpdatePasswordData,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.auth.updateUser({
        password: data.newPassword,
      });

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      return { success: true };
    } catch (error) {
      // Update password error - returning error response
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to update password",
      };
    }
  }

  /**
   * Get the current session
   */
  async getSession() {
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        // Get session error - returning null
        return null;
      }

      return session;
    } catch (error) {
      // Get session error - returning null
      return null;
    }
  }

  /**
   * Refresh the current session
   */
  async refreshSession() {
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.refreshSession();

      if (error) {
        // Refresh session error - returning null
        return null;
      }

      return session;
    } catch (error) {
      // Refresh session error - returning null
      return null;
    }
  }

  /**
   * Sign in with OAuth provider (Google, GitHub, Microsoft, Apple, LinkedIn)
   */
  async signInWithOAuth(
    provider: "google" | "github" | "azure" | "apple" | "linkedin_oidc",
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const appUrl =
        process.env.NEXT_PUBLIC_APP_URL ||
        (typeof globalThis.window !== "undefined"
          ? globalThis.window.location.origin
          : "http://localhost:3000");

      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${appUrl}/auth/callback`,
        },
      });

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      return { success: true };
    } catch (error) {
      // OAuth sign in error - returning error response
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to sign in with OAuth",
      };
    }
  }

  /**
   * Resend email verification
   */
  async resendVerificationEmail(
    email: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const sanitizedEmail = sanitizeInput(email).toLowerCase();

      const { error } = await supabase.auth.resend({
        type: "signup",
        email: sanitizedEmail,
      });

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      return { success: true };
    } catch (error) {
      // Resend verification email error - returning error response
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to resend verification email",
      };
    }
  }

  /**
   * Enable Two-Factor Authentication (2FA)
   */
  async enableTwoFactor(): Promise<{
    success: boolean;
    qrCode?: string;
    secret?: string;
    error?: string;
  }> {
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
      });

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
        qrCode: data.totp.qr_code,
        secret: data.totp.secret,
      };
    } catch (error) {
      // Enable 2FA error - returning error response
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to enable 2FA",
      };
    }
  }

  /**
   * Verify Two-Factor Authentication code
   */
  async verifyTwoFactor(
    factorId: string,
    code: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.auth.mfa.challengeAndVerify({
        factorId,
        code,
      });

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      return { success: true };
    } catch (error) {
      // Verify 2FA error - returning error response
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to verify 2FA code",
      };
    }
  }

  /**
   * Disable Two-Factor Authentication
   */
  async disableTwoFactor(
    factorId: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.auth.mfa.unenroll({
        factorId,
      });

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      return { success: true };
    } catch (error) {
      // Disable 2FA error - returning error response
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to disable 2FA",
      };
    }
  }

  /**
   * Get MFA factors for current user
   */
  async getMFAFactors() {
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();

      if (error) {
        // Get MFA factors error - returning null
        return null;
      }

      return data;
    } catch (error) {
      // Get MFA factors error - returning null
      return null;
    }
  }
}

// Export singleton instance
export const authService = new AuthService();
export default authService;
