/**
 * Rate Limit Headers Utility
 *
 * Adds standard rate limit headers to API responses for client awareness
 */

import { NextResponse } from "next/server";
import { RateLimitResult } from "../security/rate-limiting";

/**
 * Standard rate limit header names
 */
export const RATE_LIMIT_HEADERS = {
  LIMIT: "X-RateLimit-Limit",
  REMAINING: "X-RateLimit-Remaining",
  RESET: "X-RateLimit-Reset",
  RETRY_AFTER: "Retry-After",
} as const;

/**
 * Add rate limit headers to a NextResponse
 */
export function addRateLimitHeaders(
  response: NextResponse,
  result: RateLimitResult,
  limit: number,
): NextResponse {
  response.headers.set(RATE_LIMIT_HEADERS.LIMIT, String(limit));
  response.headers.set(RATE_LIMIT_HEADERS.REMAINING, String(result.remaining));
  response.headers.set(
    RATE_LIMIT_HEADERS.RESET,
    String(Math.floor(result.resetAt.getTime() / 1000)),
  );

  if (result.retryAfter) {
    response.headers.set(
      RATE_LIMIT_HEADERS.RETRY_AFTER,
      String(result.retryAfter),
    );
  }

  return response;
}

/**
 * Create a rate-limited response (429 Too Many Requests)
 */
export function createRateLimitedResponse(
  result: RateLimitResult,
  limit: number,
  message?: string,
): NextResponse {
  const response = NextResponse.json(
    {
      error: "Too Many Requests",
      message: message || "Rate limit exceeded. Please try again later.",
      retryAfter: result.retryAfter,
    },
    { status: 429 },
  );

  return addRateLimitHeaders(response, result, limit);
}

/**
 * Create a successful response with rate limit headers
 */
export function createResponseWithRateLimit<T>(
  data: T,
  result: RateLimitResult,
  limit: number,
  status: number = 200,
): NextResponse {
  const response = NextResponse.json(data, { status });
  return addRateLimitHeaders(response, result, limit);
}

/**
 * Rate limit configuration for different API endpoints
 */
export const API_RATE_LIMITS = {
  // General API endpoints
  default: { windowMs: 60 * 1000, maxRequests: 60 },

  // Authentication endpoints (stricter)
  auth: { windowMs: 15 * 60 * 1000, maxRequests: 5 },

  // AI/ML endpoints (expensive operations)
  ai: { windowMs: 60 * 1000, maxRequests: 10 },

  // Credit bureau endpoints (external API limits)
  bureau: { windowMs: 60 * 60 * 1000, maxRequests: 10 },

  // Payment endpoints
  payment: { windowMs: 60 * 1000, maxRequests: 20 },

  // Admin endpoints
  admin: { windowMs: 60 * 1000, maxRequests: 100 },

  // File upload endpoints
  upload: { windowMs: 60 * 1000, maxRequests: 10 },
} as const;

/**
 * Get rate limit config for an endpoint
 */
export function getRateLimitConfig(endpoint: string): {
  windowMs: number;
  maxRequests: number;
} {
  if (endpoint.includes("/auth")) return API_RATE_LIMITS.auth;
  if (endpoint.includes("/ai") || endpoint.includes("/credit-repair"))
    return API_RATE_LIMITS.ai;
  if (endpoint.includes("/bureau") || endpoint.includes("/experian"))
    return API_RATE_LIMITS.bureau;
  if (endpoint.includes("/payment") || endpoint.includes("/stripe"))
    return API_RATE_LIMITS.payment;
  if (endpoint.includes("/admin")) return API_RATE_LIMITS.admin;
  if (endpoint.includes("/upload")) return API_RATE_LIMITS.upload;
  return API_RATE_LIMITS.default;
}

/**
 * Middleware helper to check rate limit and add headers
 */
export async function withRateLimit(
  identifier: string,
  endpoint: string,
  checkFn: (
    id: string,
    config: { windowMs: number; maxRequests: number },
  ) => Promise<RateLimitResult>,
): Promise<{
  allowed: boolean;
  response?: NextResponse;
  result: RateLimitResult;
}> {
  const config = getRateLimitConfig(endpoint);
  const result = await checkFn(identifier, config);

  if (!result.allowed) {
    return {
      allowed: false,
      response: createRateLimitedResponse(result, config.maxRequests),
      result,
    };
  }

  return { allowed: true, result };
}
