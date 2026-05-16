/**
 * CSRF Protection Utility
 *
 * Implements token-based CSRF protection for mutation endpoints
 */

import crypto from "crypto";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "@/lib/security/timing-safe-equal";

const CSRF_COOKIE_NAME = "__csrf_token";
const CSRF_HEADER_NAME = "x-csrf-token";
const CSRF_SECRET =
  process.env.CSRF_SECRET || "default-csrf-secret-change-in-production";
const TOKEN_EXPIRY = 60 * 60 * 1000; // 1 hour

interface CSRFToken {
  token: string;
  expires: number;
}

/**
 * Generate a new CSRF token
 */
export function generateCSRFToken(): string {
  const timestamp = Date.now();
  const randomBytes = crypto.randomBytes(32).toString("hex");
  const data = `${timestamp}:${randomBytes}`;

  const signature = crypto
    .createHmac("sha256", CSRF_SECRET)
    .update(data)
    .digest("hex");

  return Buffer.from(`${data}:${signature}`).toString("base64");
}

/**
 * Verify a CSRF token
 */
export function verifyCSRFToken(token: string): boolean {
  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const [timestamp, randomBytes, signature] = decoded.split(":");

    // Check expiry
    const tokenTime = parseInt(timestamp, 10);
    if (Date.now() - tokenTime > TOKEN_EXPIRY) {
      return false;
    }

    // Verify signature
    const expectedSignature = crypto
      .createHmac("sha256", CSRF_SECRET)
      .update(`${timestamp}:${randomBytes}`)
      .digest("hex");

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature),
    );
  } catch {
    return false;
  }
}

/**
 * Set CSRF token cookie
 */
export async function setCSRFCookie(): Promise<string> {
  const token = generateCSRFToken();
  const cookieStore = await cookies();

  cookieStore.set(CSRF_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: TOKEN_EXPIRY / 1000,
  });

  return token;
}

/**
 * Get CSRF token from cookie
 */
export async function getCSRFToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(CSRF_COOKIE_NAME)?.value || null;
}

/**
 * Validate CSRF token from request
 */
export async function validateCSRFRequest(
  request: NextRequest,
): Promise<boolean> {
  // Skip for safe methods
  const safeMethod = ["GET", "HEAD", "OPTIONS"].includes(request.method);
  if (safeMethod) return true;

  // Get token from header
  const headerToken = request.headers.get(CSRF_HEADER_NAME);
  if (!headerToken) return false;

  // Get token from cookie
  const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;
  if (!cookieToken) return false;

  // Tokens must match and be valid (constant-time to avoid leaking the token)
  if (!timingSafeEqual(headerToken, cookieToken)) return false;

  return verifyCSRFToken(headerToken);
}

/**
 * CSRF middleware for API routes
 */
export async function csrfMiddleware(
  request: NextRequest,
): Promise<NextResponse | null> {
  const isValid = await validateCSRFRequest(request);

  if (!isValid) {
    return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
  }

  return null; // Continue to handler
}

/**
 * API route to get a new CSRF token
 */
export async function getCSRFTokenHandler(): Promise<NextResponse> {
  const token = await setCSRFCookie();

  return NextResponse.json({ csrfToken: token });
}

/**
 * React hook helper - returns token for client-side use
 */
export function createCSRFHeaders(token: string): HeadersInit {
  return {
    [CSRF_HEADER_NAME]: token,
  };
}
