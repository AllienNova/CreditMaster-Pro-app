/**
 * JWT Validation Service
 * Handles JWT token validation from request headers with proper signature verification
 */

import jwt from "jsonwebtoken";

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
      // SECURITY FIX: Removed dev-token bypass
      // This was a critical vulnerability allowing unauthenticated access

      // Get JWT secret from environment
      const jwtSecret =
        process.env.JWT_SECRET || process.env.SUPABASE_JWT_SECRET;

      if (!jwtSecret) {
        // JWT error: JWT_SECRET or SUPABASE_JWT_SECRET not configured
        return null;
      }

      // Verify JWT signature and decode payload
      const decoded = jwt.verify(token, jwtSecret) as JWTPayload;

      // Validate required fields
      if (!decoded.userId || !decoded.email) {
        // JWT warning: JWT missing required fields (userId, email)
        return null;
      }

      // Return validated user
      return {
        id: decoded.userId,
        email: decoded.email,
        name: decoded.name,
        role: decoded.role || "user",
      };
    } catch (_error) {
      // JWT error: Token verification failed (invalid, expired, or not yet valid)
      return null;
    }
  },
};

export default jwtValidation;
