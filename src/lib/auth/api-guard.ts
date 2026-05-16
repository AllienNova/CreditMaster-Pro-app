/**
 * API Route Authentication Guard
 *
 * Provides a unified authentication wrapper for API routes to ensure
 * consistent auth handling and prevent accidentally shipping unprotected routes.
 *
 * Usage:
 * ```typescript
 * import { withAuth, withPermission } from '@/lib/auth/api-guard';
 *
 * export const GET = withAuth(async (request, user) => {
 *   // user is guaranteed to be authenticated
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
import { type Role, isAtLeast, isRole } from "./roles";
import { jwtValidation, JWTUser } from "./jwt-validation";
import { rbac } from "./rbac";

export type AuthenticatedHandler = (
  request: NextRequest,
  user: JWTUser,
) => Promise<NextResponse> | NextResponse;

export type RouteHandler = (
  request: NextRequest,
) => Promise<NextResponse> | NextResponse;

/**
 * Wraps an API route handler with JWT authentication.
 * Returns 401 if not authenticated.
 */
export function withAuth(handler: AuthenticatedHandler): RouteHandler {
  return async (request: NextRequest) => {
    const validation = await jwtValidation.validateFromHeaders(request);

    if (!validation.valid || !validation.user) {
      return NextResponse.json(
        {
          error: "Unauthorized",
          message: validation.error || "Authentication required",
        },
        {
          status: 401,
          headers: { "WWW-Authenticate": "Bearer" },
        },
      );
    }

    return handler(request, validation.user);
  };
}

/**
 * Wraps an API route handler with JWT authentication AND permission check.
 * Returns 401 if not authenticated, 403 if missing permission.
 */
export function withPermission(
  permission: string,
  handler: AuthenticatedHandler,
): RouteHandler {
  return async (request: NextRequest) => {
    const validation = await jwtValidation.validateFromHeaders(request);

    if (!validation.valid || !validation.user) {
      return NextResponse.json(
        {
          error: "Unauthorized",
          message: validation.error || "Authentication required",
        },
        {
          status: 401,
          headers: { "WWW-Authenticate": "Bearer" },
        },
      );
    }

    if (!rbac.hasPermission(validation.user, permission)) {
      return NextResponse.json(
        {
          error: "Forbidden",
          message: `Missing required permission: ${permission}`,
        },
        { status: 403 },
      );
    }

    return handler(request, validation.user);
  };
}

/**
 * Wraps an API route handler with JWT authentication AND role check.
 * Returns 401 if not authenticated, 403 if missing role.
 */
export function withRole(
  requiredRole: Role,
  handler: AuthenticatedHandler,
): RouteHandler {
  return async (request: NextRequest) => {
    const validation = await jwtValidation.validateFromHeaders(request);

    if (!validation.valid || !validation.user) {
      return NextResponse.json(
        {
          error: "Unauthorized",
          message: validation.error || "Authentication required",
        },
        {
          status: 401,
          headers: { "WWW-Authenticate": "Bearer" },
        },
      );
    }

    const userRole: Role = isRole(validation.user.role)
      ? validation.user.role
      : "user";

    if (!isAtLeast(userRole, requiredRole)) {
      return NextResponse.json(
        {
          error: "Forbidden",
          message: `Requires ${requiredRole} role or higher`,
        },
        { status: 403 },
      );
    }

    return handler(request, validation.user);
  };
}

/**
 * Optional auth - attaches user if authenticated, but allows anonymous access.
 * Useful for routes that behave differently for logged-in users.
 */
export function withOptionalAuth(
  handler: (
    request: NextRequest,
    user: JWTUser | null,
  ) => Promise<NextResponse> | NextResponse,
): RouteHandler {
  return async (request: NextRequest) => {
    const validation = await jwtValidation.validateFromHeaders(request);
    return handler(request, validation.valid ? validation.user : null);
  };
}
