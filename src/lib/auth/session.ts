/**
 * Session Management Module
 *
 * Provides server-side session utilities for Next.js 15 App Router
 * Compatible with Supabase SSR authentication
 */

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import { resolveRoleFromDb } from "./resolve-role";
import type { Role } from "./roles";

export interface User {
  id: string;
  email: string;
  user_metadata?: Record<string, any>;
}

/**
 * Get the current authenticated user from the session
 *
 * @returns User object if authenticated, null otherwise
 *
 * @example
 * ```typescript
 * const user = await getUser();
 * if (!user) {
 *   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 * }
 * ```
 */
export async function getUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      },
    );

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email!,
      user_metadata: user.user_metadata,
    };
  } catch (_error) {
    // Session error: Error getting user session
    void _error;
    return null;
  }
}

/**
 * Get user ID from session (convenience method)
 *
 * @returns User ID if authenticated, null otherwise
 */
export async function getUserId(): Promise<string | null> {
  const user = await getUser();
  return user?.id || null;
}

/**
 * Check if user is authenticated
 *
 * @returns true if user is authenticated, false otherwise
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await getUser();
  return user !== null;
}

/**
 * Get user role from the database (`profiles.role`).
 *
 * The role is always resolved from the database — never from the JWT claim
 * or `user_metadata` (FND-005).
 *
 * @returns User role if authenticated, null otherwise
 */
export async function getUserRole(): Promise<Role | null> {
  const user = await getUser();
  if (!user) return null;
  return resolveRoleFromDb(user.id);
}

/**
 * Check if user has a specific role
 *
 * @param role - Role to check
 * @returns true if user has the role, false otherwise
 */
export async function hasRole(role: Role): Promise<boolean> {
  const userRole = await getUserRole();
  return userRole === role;
}

/**
 * Get Supabase server client with session cookies
 *
 * @returns Supabase server client
 */
export async function getSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    },
  );
}
