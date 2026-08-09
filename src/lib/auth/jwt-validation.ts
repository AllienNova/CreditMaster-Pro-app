/**
 * JWT Validation Service
 * Handles JWT token validation from request headers with proper signature verification
 */

import jwt from "jsonwebtoken";
import { createRemoteJWKSet, jwtVerify } from "jose";

export interface JWTUser {
  id: string;
  email: string;
  name?: string;
  role?: string;
}

export interface JWTValidationResult {
  valid: boolean;
  user: JWTUser | null;
  error?: string;
}

export interface JWTPayload {
  userId: string;
  email: string;
  name?: string;
  role?: string;
  iat?: number;
  exp?: number;
}

/**
 * What Supabase actually puts in an access token. `sub` is the user id (RFC
 * 7519); there is no `userId` claim, which is why the previous implementation
 * rejected every genuine token.
 */
interface SupabaseJWTPayload {
  sub?: string;
  userId?: string;
  email?: string;
  name?: string;
  role?: string;
  exp?: number;
  iat?: number;
}

/**
 * JWT Validation service
 */
export const jwtValidation = {
  /**
   * Validate JWT token from request headers
   */
  async validateFromHeaders(request: Request): Promise<JWTValidationResult> {
    try {
      const authHeader = request.headers.get("authorization");

      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return {
          valid: false,
          user: null,
          error: "No authorization token provided",
        };
      }

      const token = authHeader.substring(7);

      // In production, this would verify the JWT token signature
      // For now, we decode and validate the token structure
      const user = await this.verifyToken(token);

      if (!user) {
        return {
          valid: false,
          user: null,
          error: "Invalid or expired token",
        };
      }

      return {
        valid: true,
        user,
      };
    } catch (error) {
      return {
        valid: false,
        user: null,
        error: "Token validation failed",
      };
    }
  },

  /**
   * Verify JWT token with signature verification
   * SECURITY: This now properly verifies JWT signatures to prevent token tampering
   */
  async verifyToken(token: string): Promise<JWTUser | null> {
    try {
      // SECURITY: no dev-token bypass. Every token is signature-verified.
      const header = decodeHeader(token);
      if (!header) return null;

      const payload =
        header.alg === "HS256"
          ? verifyHs256(token)
          : await verifyAsymmetric(token);

      if (!payload) return null;

      // Supabase puts the user id in `sub`, per RFC 7519. `userId` is accepted
      // as a fallback only for tokens this app might mint itself.
      const id = payload.sub ?? payload.userId;
      const email = payload.email;

      if (!id || !email) {
        // Missing subject or email — cannot identify the caller.
        return null;
      }

      return {
        id,
        email,
        name: payload.name,
        // NOTE: this role comes from the TOKEN and is advisory only. Every
        // guard in api-guard.ts re-resolves the role from the database before
        // authorizing — that ordering is load-bearing for FND-005 (a user who
        // could set their own role claim must not thereby become admin).
        role: payload.role || "user",
      };
    } catch (_error) {
      // Invalid, expired, wrong key, or unsupported algorithm.
      return null;
    }
  },
};

/** Decode the JOSE header without verifying — needed to pick a strategy. */
function decodeHeader(token: string): { alg?: string; kid?: string } | null {
  const seg = token.split(".")[0];
  if (!seg) return null;
  try {
    return JSON.parse(Buffer.from(seg, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

/**
 * Legacy Supabase projects (and any self-minted token) sign with the shared
 * HS256 secret. Kept so existing deployments keep working.
 */
function verifyHs256(token: string): SupabaseJWTPayload | null {
  const secret = process.env.JWT_SECRET || process.env.SUPABASE_JWT_SECRET;
  if (!secret) return null;
  return jwt.verify(token, secret, {
    algorithms: ["HS256"],
  }) as SupabaseJWTPayload;
}

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

/**
 * Current Supabase projects sign access tokens with ASYMMETRIC keys (ES256 by
 * default) and publish the public keys at
 * `${SUPABASE_URL}/auth/v1/.well-known/jwks.json`.
 *
 * WHY THIS EXISTS. Before this, verifyToken() only handled HS256 with a shared
 * secret, and additionally required a `userId` claim that Supabase has never
 * issued — it uses `sub`. Either alone was fatal: every authenticated request
 * returned 401 against a real Supabase project. It was invisible because the
 * 611-test negative-auth suite only asserts that UNAUTHENTICATED requests are
 * rejected, and no test ever presented a genuine Supabase token. Found by
 * signing in against a local Supabase and calling the API, which failed with
 * "invalid algorithm" on an ES256 token.
 *
 * The key set is fetched lazily and cached by `jose`, which also handles key
 * rotation by refetching on an unknown `kid`.
 */
async function verifyAsymmetric(
  token: string,
): Promise<SupabaseJWTPayload | null> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;

  if (!jwks) {
    jwks = createRemoteJWKSet(
      new URL(`${base.replace(/\/$/, "")}/auth/v1/.well-known/jwks.json`),
    );
  }

  const { payload } = await jwtVerify(token, jwks, {
    // Pin the algorithms rather than accepting whatever the header claims —
    // an unpinned verifier can be talked into "none" or into treating a
    // public key as an HMAC secret.
    algorithms: ["ES256", "RS256"],
  });

  return payload as unknown as SupabaseJWTPayload;
}

export default jwtValidation;
