/**
 * Authentication & Authorization Middleware
 *
 * Provides:
 * - JWT token validation with signature verification
 * - Session management
 * - Role-based access control (RBAC)
 * - API key authentication
 *
 * SECURITY: All tokens are now properly verified with cryptographic signatures
 *
 * @deprecated For API route authentication, prefer using the guards from '@/lib/auth/api-guard':
 * - `withAuth` - Requires authentication
 * - `withPermission` - Requires authentication + specific permission
 * - `withRole` - Requires authentication + minimum role level
 * - `withOptionalAuth` - Optional authentication
 *
 * For JWT validation, use '@/lib/auth/jwt-validation' directly.
 */

import jwt from "jsonwebtoken";
import { logger } from "@/lib/monitoring/logger";

// Re-export preferred utilities for migration path
export {
  jwtValidation,
  type JWTUser,
  type JWTValidationResult,
} from "@/lib/auth/jwt-validation";
export {
  withAuth,
  withPermission,
  withRole,
  withOptionalAuth,
} from "@/lib/auth/api-guard";

export interface JWTPayload {
  userId: string;
  email: string;
  name?: string;
  role?: "user" | "admin" | "premium" | "enterprise";
  iat?: number;
  exp?: number;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  role: "user" | "admin" | "premium" | "enterprise";
  permissions: string[];
  createdAt: Date;
  lastLogin?: Date;
}

export interface AuthResult {
  authenticated: boolean;
  user?: User;
  error?: string;
}

export interface Permission {
  resource: string;
  action: "read" | "write" | "delete" | "admin";
}

/**
 * Role-based permissions
 */
const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  user: [
    { resource: "disputes", action: "read" },
    { resource: "disputes", action: "write" },
    { resource: "analysis", action: "read" },
    { resource: "loans", action: "read" },
    { resource: "chat", action: "read" },
    { resource: "chat", action: "write" },
  ],
  premium: [
    { resource: "disputes", action: "read" },
    { resource: "disputes", action: "write" },
    { resource: "analysis", action: "read" },
    { resource: "analysis", action: "write" },
    { resource: "loans", action: "read" },
    { resource: "loans", action: "write" },
    { resource: "chat", action: "read" },
    { resource: "chat", action: "write" },
    { resource: "voice", action: "read" },
    { resource: "voice", action: "write" },
    { resource: "images", action: "read" },
    { resource: "images", action: "write" },
  ],
  enterprise: [
    { resource: "*", action: "read" },
    { resource: "*", action: "write" },
  ],
  admin: [
    { resource: "*", action: "read" },
    { resource: "*", action: "write" },
    { resource: "*", action: "delete" },
    { resource: "*", action: "admin" },
  ],
};

/**
 * Check if user has permission
 */
export function hasPermission(
  user: User,
  resource: string,
  action: "read" | "write" | "delete" | "admin",
): boolean {
  const permissions = ROLE_PERMISSIONS[user.role] || [];

  return permissions.some(
    (p) =>
      (p.resource === resource || p.resource === "*") &&
      (p.action === action || p.action === "admin"),
  );
}

/**
 * Require authentication middleware
 */
export async function requireAuth(request: Request): Promise<AuthResult> {
  try {
    // Try to get token from Authorization header
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return {
        authenticated: false,
        error: "No authorization token provided",
      };
    }

    const token = authHeader.substring(7);

    // Validate token (this would use JWT verification in production)
    const user = await validateToken(token);

    if (!user) {
      return {
        authenticated: false,
        error: "Invalid or expired token",
      };
    }

    return {
      authenticated: true,
      user,
    };
  } catch (error) {
    return {
      authenticated: false,
      error: "Authentication failed",
    };
  }
}

/**
 * Require specific role middleware
 */
export async function requireRole(
  request: Request,
  requiredRole: "user" | "premium" | "enterprise" | "admin",
): Promise<AuthResult> {
  const authResult = await requireAuth(request);

  if (!authResult.authenticated || !authResult.user) {
    return authResult;
  }

  const roleHierarchy = ["user", "premium", "enterprise", "admin"];
  const userRoleLevel = roleHierarchy.indexOf(authResult.user.role);
  const requiredRoleLevel = roleHierarchy.indexOf(requiredRole);

  if (userRoleLevel < requiredRoleLevel) {
    return {
      authenticated: false,
      error: `Requires ${requiredRole} role or higher`,
    };
  }

  return authResult;
}

/**
 * Require permission middleware
 */
export async function requirePermission(
  request: Request,
  resource: string,
  action: "read" | "write" | "delete" | "admin",
): Promise<AuthResult> {
  const authResult = await requireAuth(request);

  if (!authResult.authenticated || !authResult.user) {
    return authResult;
  }

  if (!hasPermission(authResult.user, resource, action)) {
    return {
      authenticated: false,
      error: `Permission denied: ${action} ${resource}`,
    };
  }

  return authResult;
}

/**
 * Validate JWT token with proper signature verification
 * SECURITY: This function now uses cryptographic verification to prevent token tampering
 */
async function validateToken(token: string): Promise<User | null> {
  try {
    // SECURITY FIX: Removed dev-token bypass
    // This was a CRITICAL vulnerability allowing anyone with 'dev-token' to access the system

    // Get JWT secret from environment
    const jwtSecret = process.env.JWT_SECRET || process.env.SUPABASE_JWT_SECRET;

    if (!jwtSecret) {
      logger.error(
        "SECURITY ERROR: JWT_SECRET or SUPABASE_JWT_SECRET not configured",
      );
      return null;
    }

    // Verify JWT signature and decode payload
    // This throws if the signature is invalid, token is expired, or malformed
    const decoded = jwt.verify(token, jwtSecret) as JWTPayload;

    // Validate required fields
    if (!decoded.userId || !decoded.email) {
      logger.warn("JWT missing required fields (userId, email)");
      return null;
    }

    // Production enhancement: For added security, fetch user from database to verify:
    // - User still exists and is active
    // - User is not banned/suspended
    // - Role hasn't changed since token was issued
    // Trade-off: Adds database lookup per request but provides stronger security.
    // Enable via: const dbUser = await supabase.from('users').select('*').eq('id', decoded.userId).single();

    // Map JWT payload to User object
    const user: User = {
      id: decoded.userId,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role || "user",
      permissions:
        ROLE_PERMISSIONS[decoded.role || "user"]?.map(
          (p) => `${p.action}:${p.resource}`,
        ) || [],
      createdAt: new Date(decoded.iat ? decoded.iat * 1000 : Date.now()),
      lastLogin: new Date(),
    };

    return user;
  } catch (error) {
    // Log specific JWT errors for security monitoring
    if (error instanceof jwt.JsonWebTokenError) {
      logger.warn("Invalid JWT token", { reason: error.message });
    } else if (error instanceof jwt.TokenExpiredError) {
      logger.warn("JWT token expired", { reason: error.message });
    } else if (error instanceof jwt.NotBeforeError) {
      logger.warn("JWT not yet valid", { reason: error.message });
    } else {
      logger.error(
        "Token validation error",
        error instanceof Error ? error : new Error(String(error)),
      );
    }
    return null;
  }
}

/**
 * API Key authentication
 */
export async function validateAPIKey(apiKey: string): Promise<AuthResult> {
  try {
    // In production, validate against database
    // For now, check against environment variable
    const validKey = process.env.AIML_API_KEY;

    if (apiKey === validKey) {
      return {
        authenticated: true,
        user: {
          id: "api-user",
          email: "api@system",
          role: "enterprise",
          permissions: [],
          createdAt: new Date(),
        },
      };
    }

    return {
      authenticated: false,
      error: "Invalid API key",
    };
  } catch (error) {
    return {
      authenticated: false,
      error: "API key validation failed",
    };
  }
}

/**
 * Create authentication response
 */
export function createAuthResponse(authResult: AuthResult): Response {
  if (!authResult.authenticated) {
    return new Response(
      JSON.stringify({
        error: authResult.error || "Authentication required",
      }),
      {
        status: 401,
        headers: {
          "Content-Type": "application/json",
          "WWW-Authenticate": "Bearer",
        },
      },
    );
  }

  // Should not reach here
  return new Response("OK", { status: 200 });
}

/**
 * Create permission denied response
 */
export function createPermissionDeniedResponse(message?: string): Response {
  return new Response(
    JSON.stringify({
      error: message || "Permission denied",
    }),
    {
      status: 403,
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
}

/**
 * Extract user from request
 * Helper function to get authenticated user in route handlers
 */
export async function getUserFromRequest(
  request: Request,
): Promise<User | null> {
  const authResult = await requireAuth(request);
  return authResult.user || null;
}

/**
 * Session management
 */
interface Session {
  userId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
  lastActivity: Date;
}

const sessions: Map<string, Session> = new Map();

/**
 * Create session
 */
export function createSession(
  userId: string,
  expiresIn: number = 24 * 60 * 60 * 1000,
): string {
  const token = generateToken();
  const now = new Date();

  const session: Session = {
    userId,
    token,
    expiresAt: new Date(now.getTime() + expiresIn),
    createdAt: now,
    lastActivity: now,
  };

  sessions.set(token, session);
  return token;
}

/**
 * Get session
 */
export function getSession(token: string): Session | null {
  const session = sessions.get(token);

  if (!session) {
    return null;
  }

  // Check if expired
  if (session.expiresAt < new Date()) {
    sessions.delete(token);
    return null;
  }

  // Update last activity
  session.lastActivity = new Date();

  return session;
}

/**
 * Delete session
 */
export function deleteSession(token: string): void {
  sessions.delete(token);
}

/**
 * Generate cryptographically secure random token
 * Uses crypto.getRandomValues for secure token generation
 */
function generateToken(): string {
  // Generate 32 bytes of cryptographically secure random data
  const buffer = new Uint8Array(32);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(buffer);
  } else {
    // Fallback for Node.js environment
    const nodeCrypto = require("crypto");
    const randomBytes = nodeCrypto.randomBytes(32);
    for (let i = 0; i < 32; i++) {
      buffer[i] = randomBytes[i];
    }
  }

  // Convert to hex string
  return Array.from(buffer)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Cleanup expired sessions
 */
export function cleanupExpiredSessions(): void {
  const now = new Date();
  const tokensToDelete: string[] = [];

  sessions.forEach((session, token) => {
    if (session.expiresAt < now) {
      tokensToDelete.push(token);
    }
  });

  tokensToDelete.forEach((token) => sessions.delete(token));
}

// Run cleanup every hour
setInterval(cleanupExpiredSessions, 60 * 60 * 1000);
