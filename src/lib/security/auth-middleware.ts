/**
 * Session & API-Key Utilities
 *
 * FND-005 remediation: this module used to contain a legacy JWT-role-trusting
 * authorization path (`requireAuth`/`requireRole`/`requirePermission`/
 * `hasPermission`, backed by a local `validateToken` that mapped
 * `role: decoded.role || "user"` straight off the JWT claim). That path had
 * zero live importers — every API route already goes through the guards
 * below — so it has been deleted rather than patched.
 *
 * For API route authentication/authorization, use:
 * - `withAuth` / `withPermission` / `withRole` / `withOptionalAuth` from
 *   '@/lib/auth/api-guard'
 * - JWT validation directly from '@/lib/auth/jwt-validation'
 *
 * Those guards resolve the user's role fresh from the `profiles` table via
 * `resolveRoleFromDb` on every request — the JWT `role` claim and
 * `user_metadata`/`app_metadata` are never trusted.
 *
 * What remains in this file is unrelated to FND-005:
 * - `validateAPIKey` (FND-002) — inbound API-key auth always denies until a
 *   dedicated hashed `api_keys` table exists.
 * - Redis-backed session helpers — session persistence, not a per-request
 *   authorization decision.
 */

import {
  RedisSessionStore,
  type SessionRecord,
} from "@/lib/security/redis-session-store";

/**
 * API Key authentication
 *
 * SECURITY (FND-002 / TASK-AUTH-05): There is currently no legitimate inbound
 * API-key auth. The previous implementation authenticated any caller who
 * presented the value of process.env.AIML_API_KEY — but that key is an
 * OUTBOUND credential for the AI provider, never an inbound auth credential.
 * Inbound API-key auth, when needed, must validate the presented key against a
 * dedicated hashed `api_keys` table — not against any provider key.
 * Until that table exists, this always returns unauthenticated.
 */
export interface ApiKeyValidationResult {
  authenticated: boolean;
  error?: string;
}

export async function validateAPIKey(
  _apiKey: string,
): Promise<ApiKeyValidationResult> {
  return {
    authenticated: false,
    error: "Invalid API key",
  };
}

/**
 * Session management
 *
 * Backed by Redis (FND-007) so sessions survive process restarts and are
 * shared across serverless instances. See `redis-session-store.ts`.
 */
interface Session {
  userId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
  lastActivity: Date;
}

const sessionStore = new RedisSessionStore();

function toSession(record: SessionRecord): Session {
  return {
    userId: record.userId,
    token: record.token,
    expiresAt: new Date(record.expiresAt),
    createdAt: new Date(record.createdAt),
    lastActivity: new Date(record.lastActivity),
  };
}

/**
 * Create session
 */
export async function createSession(
  userId: string,
  expiresIn: number = 24 * 60 * 60 * 1000,
): Promise<string> {
  const token = generateToken();
  const now = Date.now();

  await sessionStore.set(token, {
    userId,
    token,
    expiresAt: now + expiresIn,
    createdAt: now,
    lastActivity: now,
  });

  return token;
}

/**
 * Get session
 */
export async function getSession(token: string): Promise<Session | null> {
  const record = await sessionStore.get(token);
  return record ? toSession(record) : null;
}

/**
 * Delete session
 */
export async function deleteSession(token: string): Promise<void> {
  await sessionStore.delete(token);
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
 *
 * Retained for API compatibility. The Redis-backed store sets a per-key TTL
 * (and the in-memory fallback drops expired records on read), so expired
 * sessions are reclaimed automatically — no periodic sweep is required.
 */
export function cleanupExpiredSessions(): void {
  // No-op: expiry is handled by the session store's per-key TTL.
}
