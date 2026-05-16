/**
 * API Route Authentication Guard
 *
 * Provides a unified authentication wrapper for API routes to ensure
 * consistent auth handling and prevent accidentally shipping unprotected routes.
 *
 * Authorization model (FND-005): the JWT establishes verified identity
 * (`user.id`) only. The role used for EVERY authorization decision is looked
 * up fresh from the `profiles` table via `resolveRoleFromDb` — the JWT `role`
 * claim and `user_metadata`/`app_metadata` are never trusted.
 *
 * Usage:
 * ```typescript
 * import { withAuth, withPermission } from '@/lib/auth/api-guard';
 * import type { AuthedUser } from '@/lib/auth/api-guard';
 *
 * export const GET = withAuth(async (request, user: AuthedUser) => {
 *   // user.role is the DB-resolved role, not the JWT claim
 *   return NextResponse.json({ data: 'protected' });
 * });
 *
 * export const POST = withPermission('financial:write', async (request, user) => {
 *   // user has the required permission
 *   return NextResponse.json({ data: 'premium feature' });
 * });
 * ```
 */

import { NextRequest, NextResponse } from "next/server";
import { type Role, isAtLeast } from "./roles";
import { jwtValidation } from "./jwt-validation";
import { resolveRoleFromDb } from "./resolve-role";
import { rbac } from "./rbac";

/**
 * The user shape handlers receive after the guard runs.
 * `role` is resolved from the database — never from the JWT claim.
 */
export type AuthedUser = {
  id: string;
  email: string;
  role: Role;
};

export type AuthenticatedHandler = (
  request: NextRequest,
  user: AuthedUser,
) => Promise<NextResponse> | NextResponse;

export type RouteHandler = (
  request: NextRequest,
) => Promise<NextResponse> | NextResponse;

const unauthorized = (message?: string): NextResponse =>
  NextResponse.json(
    {
      error: "Unauthorized",
      message: message || "Authentication required",
    },
    {
      status: 401,
      headers: { "WWW-Authenticate": "Bearer" },
    },
  );

const serviceUnavailable = (): NextResponse =>
  NextResponse.json(
    { error: "Authorization service unavailable" },
    { status: 503 },
  );

type AuthedUserResult =
  | { ok: true; user: AuthedUser }
  | { ok: false; response: NextResponse };

/**
 * Resolve the DB-sourced role and build the `AuthedUser`.
 *
 * If `resolveRoleFromDb` throws (e.g. `SUPABASE_SERVICE_ROLE_KEY` unset, or a
 * DB connection failure that surfaces as a thrown error rather than a returned
 * `error`), this returns `{ ok: false }` carrying a 503 `NextResponse`.
 * Fail-closed: a guard that cannot determine the role grants no access — it
 * never falls through to the handler.
 */
async function buildAuthedUser(
  id: string,
  email: string,
): Promise<AuthedUserResult> {
  try {
    const role = await resolveRoleFromDb(id);
    return { ok: true, user: { id, email, role } };
  } catch (error) {
    console.error("[api-guard] role resolution failed", error);
    return { ok: false, response: serviceUnavailable() };
  }
}

/**
 * Wraps an API route handler with JWT authentication.
 * Returns 401 if not authenticated.
 */
export function withAuth(handler: AuthenticatedHandler): RouteHandler {
  return async (request: NextRequest) => {
    const validation = await jwtValidation.validateFromHeaders(request);

    if (!validation.valid || !validation.user?.id) {
      return unauthorized(validation.error);
    }

    const roleResult = await buildAuthedUser(
      validation.user.id,
      validation.user.email,
    );
    if (!roleResult.ok) {
      return roleResult.response;
    }

    return handler(request, roleResult.user);
  };
}

/**
 * Wraps an API route handler with JWT authentication AND permission check.
 * Returns 401 if not authenticated, 403 if missing permission.
 *
 * The permission check uses the DB-resolved role (`authedUser`), never the
 * JWT claim — this ordering is load-bearing for FND-005 on this path.
 */
export function withPermission(
  permission: string,
  handler: AuthenticatedHandler,
): RouteHandler {
  return async (request: NextRequest) => {
    const validation = await jwtValidation.validateFromHeaders(request);

    if (!validation.valid || !validation.user?.id) {
      return unauthorized(validation.error);
    }

    const roleResult = await buildAuthedUser(
      validation.user.id,
      validation.user.email,
    );
    if (!roleResult.ok) {
      return roleResult.response;
    }

    if (!rbac.hasPermission(roleResult.user, permission)) {
      return NextResponse.json(
        {
          error: "Forbidden",
          message: `Missing required permission: ${permission}`,
        },
        { status: 403 },
      );
    }

    return handler(request, roleResult.user);
  };
}

/**
 * Wraps an API route handler with JWT authentication AND role check.
 * Returns 401 if not authenticated, 403 if missing role.
 *
 * The role compared is the DB-resolved role, never the JWT claim.
 */
export function withRole(
  requiredRole: Role,
  handler: AuthenticatedHandler,
): RouteHandler {
  return async (request: NextRequest) => {
    const validation = await jwtValidation.validateFromHeaders(request);

    if (!validation.valid || !validation.user?.id) {
      return unauthorized(validation.error);
    }

    const roleResult = await buildAuthedUser(
      validation.user.id,
      validation.user.email,
    );
    if (!roleResult.ok) {
      return roleResult.response;
    }

    if (!isAtLeast(roleResult.user.role, requiredRole)) {
      return NextResponse.json(
        {
          error: "Forbidden",
          message: `Requires ${requiredRole} role or higher`,
        },
        { status: 403 },
      );
    }

    return handler(request, roleResult.user);
  };
}

/**
 * Optional auth - attaches user if authenticated, but allows anonymous access.
 * Useful for routes that behave differently for logged-in users.
 *
 * When a valid JWT is present the DB-resolved role is attached, so
 * optional-auth routes that branch on role are not claim-trusting.
 */
export function withOptionalAuth(
  handler: (
    request: NextRequest,
    user: AuthedUser | null,
  ) => Promise<NextResponse> | NextResponse,
): RouteHandler {
  return async (request: NextRequest) => {
    const validation = await jwtValidation.validateFromHeaders(request);

    if (!validation.valid || !validation.user?.id) {
      return handler(request, null);
    }

    // A valid JWT is present: resolve the DB role. If that fails, return 503
    // rather than passing `null` — silently degrading an authenticated user
    // to anonymous could mis-branch a role-dependent route.
    const roleResult = await buildAuthedUser(
      validation.user.id,
      validation.user.email,
    );
    if (!roleResult.ok) {
      return roleResult.response;
    }

    return handler(request, roleResult.user);
  };
}
