/**
 * Financial API Middleware
 *
 * Provides comprehensive middleware for financial API endpoints:
 * - Rate limiting (100 requests/minute per user)
 * - CORS headers for frontend integration
 * - Request/response logging
 * - Performance monitoring
 */

import { NextRequest, NextResponse } from "next/server";
import { jwtValidation } from "@/lib/auth/jwt-validation";

// ============================================================================
// RATE LIMITING
// ============================================================================

interface RateLimitEntry {
  count: number;
  resetAt: number;
  requests: Array<{ timestamp: number; endpoint: string }>;
}

// In-memory store (use Redis in production for distributed systems)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
setInterval(
  () => {
    const now = Date.now();
    for (const [key, entry] of Array.from(rateLimitStore.entries())) {
      if (entry.resetAt < now) {
        rateLimitStore.delete(key);
      }
    }
  },
  5 * 60 * 1000,
);

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export const FINANCIAL_API_RATE_LIMITS: Record<string, RateLimitConfig> = {
  default: { maxRequests: 100, windowMs: 60 * 1000 }, // 100 req/min
  healthScore: { maxRequests: 60, windowMs: 60 * 1000 }, // 60 req/min (expensive calculation)
  insights: { maxRequests: 80, windowMs: 60 * 1000 }, // 80 req/min
  goals: { maxRequests: 100, windowMs: 60 * 1000 }, // 100 req/min
  context: { maxRequests: 120, windowMs: 60 * 1000 }, // 120 req/min (frequently accessed)
};

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfter?: number;
}

/**
 * Check rate limit for a user
 */
export function checkRateLimit(
  userId: string,
  endpoint: string,
  config: RateLimitConfig = FINANCIAL_API_RATE_LIMITS.default,
): RateLimitResult {
  const now = Date.now();
  const key = `financial:${userId}`;
  const entry = rateLimitStore.get(key);

  // First request or expired window
  if (!entry || entry.resetAt < now) {
    const resetAt = now + config.windowMs;
    rateLimitStore.set(key, {
      count: 1,
      resetAt,
      requests: [{ timestamp: now, endpoint }],
    });
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: new Date(resetAt),
    };
  }

  // Check if limit exceeded
  if (entry.count >= config.maxRequests) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(entry.resetAt),
      retryAfter,
    };
  }

  // Increment count
  entry.count++;
  entry.requests.push({ timestamp: now, endpoint });
  rateLimitStore.set(key, entry);

  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetAt: new Date(entry.resetAt),
  };
}

/**
 * Get rate limit config based on endpoint
 */
export function getRateLimitConfig(pathname: string): RateLimitConfig {
  if (pathname.includes("/health-score"))
    return FINANCIAL_API_RATE_LIMITS.healthScore;
  if (pathname.includes("/insights")) return FINANCIAL_API_RATE_LIMITS.insights;
  if (pathname.includes("/goals")) return FINANCIAL_API_RATE_LIMITS.goals;
  if (pathname.includes("/context")) return FINANCIAL_API_RATE_LIMITS.context;
  return FINANCIAL_API_RATE_LIMITS.default;
}

/**
 * Add rate limit headers to response
 */
export function addRateLimitHeaders(
  response: NextResponse,
  result: RateLimitResult,
  config: RateLimitConfig,
): NextResponse {
  response.headers.set("X-RateLimit-Limit", config.maxRequests.toString());
  response.headers.set("X-RateLimit-Remaining", result.remaining.toString());
  response.headers.set("X-RateLimit-Reset", result.resetAt.toISOString());

  if (result.retryAfter) {
    response.headers.set("Retry-After", result.retryAfter.toString());
  }

  return response;
}

// ============================================================================
// CORS CONFIGURATION
// ============================================================================

const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:3001",
  "https://fynvita.com",
  "https://www.fynvita.com",
  "https://app.fynvita.com",
  process.env.NEXT_PUBLIC_APP_URL,
].filter(Boolean) as string[];

const ALLOWED_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"];
const ALLOWED_HEADERS = [
  "Content-Type",
  "Authorization",
  "X-Requested-With",
  "Accept",
  "Origin",
  "X-CSRF-Token",
];

export function addCORSHeaders(
  request: NextRequest,
  response: NextResponse,
): NextResponse {
  const origin = request.headers.get("origin");

  // Check if origin is allowed
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
  } else if (process.env.NODE_ENV === "development") {
    // Allow all origins in development
    response.headers.set("Access-Control-Allow-Origin", origin || "*");
  }

  response.headers.set(
    "Access-Control-Allow-Methods",
    ALLOWED_METHODS.join(", "),
  );
  response.headers.set(
    "Access-Control-Allow-Headers",
    ALLOWED_HEADERS.join(", "),
  );
  response.headers.set("Access-Control-Allow-Credentials", "true");
  response.headers.set("Access-Control-Max-Age", "86400"); // 24 hours

  return response;
}

// ============================================================================
// REQUEST/RESPONSE LOGGING
// ============================================================================

export interface RequestLog {
  timestamp: string;
  method: string;
  endpoint: string;
  userId: string;
  ip: string;
  userAgent: string;
  duration?: number;
  status?: number;
  error?: string;
}

const requestLogs: RequestLog[] = [];
const MAX_LOGS = 1000; // Keep last 1000 requests in memory

/**
 * Log API request
 */
export function logRequest(log: RequestLog): void {
  requestLogs.push(log);

  // Keep only last MAX_LOGS entries
  if (requestLogs.length > MAX_LOGS) {
    requestLogs.shift();
  }
}

/**
 * Get recent request logs (for monitoring/debugging)
 */
export function getRequestLogs(limit: number = 100): RequestLog[] {
  return requestLogs.slice(-limit);
}

/**
 * Get request statistics
 */
export function getRequestStats(): {
  total: number;
  byEndpoint: Record<string, number>;
  byUser: Record<string, number>;
  byStatus: Record<number, number>;
  averageDuration: number;
  errorRate: number;
} {
  const stats = {
    total: requestLogs.length,
    byEndpoint: {} as Record<string, number>,
    byUser: {} as Record<string, number>,
    byStatus: {} as Record<number, number>,
    averageDuration: 0,
    errorRate: 0,
  };

  let totalDuration = 0;
  let durationCount = 0;
  let errorCount = 0;

  for (const log of requestLogs) {
    // Count by endpoint
    stats.byEndpoint[log.endpoint] = (stats.byEndpoint[log.endpoint] || 0) + 1;

    // Count by user
    stats.byUser[log.userId] = (stats.byUser[log.userId] || 0) + 1;

    // Count by status
    if (log.status) {
      stats.byStatus[log.status] = (stats.byStatus[log.status] || 0) + 1;
    }

    // Calculate average duration
    if (log.duration) {
      totalDuration += log.duration;
      durationCount++;
    }

    // Count errors
    if (log.error || (log.status && log.status >= 400)) {
      errorCount++;
    }
  }

  stats.averageDuration = durationCount > 0 ? totalDuration / durationCount : 0;
  stats.errorRate = stats.total > 0 ? (errorCount / stats.total) * 100 : 0;

  return stats;
}

// ============================================================================
// UNIFIED MIDDLEWARE
// ============================================================================

export interface MiddlewareOptions {
  requireAuth?: boolean;
  rateLimit?: boolean;
  cors?: boolean;
  logging?: boolean;
}

/**
 * Unified financial API middleware
 *
 * Usage in API routes:
 * ```typescript
 * export async function GET(request: NextRequest) {
 *   const middlewareResult = await applyFinancialAPIMiddleware(request);
 *   if (middlewareResult.error) return middlewareResult.error;
 *
 *   const { userId } = middlewareResult;
 *   // ... your handler logic
 * }
 * ```
 */
export async function applyFinancialAPIMiddleware(
  request: NextRequest,
  options: MiddlewareOptions = {
    requireAuth: true,
    rateLimit: true,
    cors: true,
    logging: true,
  },
): Promise<{
  userId?: string;
  error?: NextResponse;
  startTime: number;
}> {
  const startTime = Date.now();
  const pathname = request.nextUrl.pathname;
  const method = request.method;

  // Get user info from request
  let userId = "anonymous";

  // Authentication check
  if (options.requireAuth !== false) {
    const validation = await jwtValidation.validateFromHeaders(request);
    if (!validation.valid || !validation.user) {
      const errorResponse = NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
          _meta: { timestamp: new Date().toISOString() },
        },
        { status: 401 },
      );

      if (options.cors !== false) {
        addCORSHeaders(request, errorResponse);
      }

      if (options.logging !== false) {
        logRequest({
          timestamp: new Date().toISOString(),
          method,
          endpoint: pathname,
          userId,
          ip:
            request.headers.get("x-forwarded-for") ||
            request.headers.get("x-real-ip") ||
            "unknown",
          userAgent: request.headers.get("user-agent") || "unknown",
          status: 401,
          error: "Unauthorized",
        });
      }

      return { error: errorResponse, startTime };
    }

    userId = validation.user.id;
  }

  // Rate limiting check
  if (options.rateLimit !== false) {
    const config = getRateLimitConfig(pathname);
    const rateLimitResult = checkRateLimit(userId, pathname, config);

    if (!rateLimitResult.allowed) {
      const errorResponse = NextResponse.json(
        {
          success: false,
          error: "Rate limit exceeded",
          retryAfter: rateLimitResult.retryAfter,
          _meta: { timestamp: new Date().toISOString() },
        },
        { status: 429 },
      );

      addRateLimitHeaders(errorResponse, rateLimitResult, config);

      if (options.cors !== false) {
        addCORSHeaders(request, errorResponse);
      }

      if (options.logging !== false) {
        logRequest({
          timestamp: new Date().toISOString(),
          method,
          endpoint: pathname,
          userId,
          ip:
            request.headers.get("x-forwarded-for") ||
            request.headers.get("x-real-ip") ||
            "unknown",
          userAgent: request.headers.get("user-agent") || "unknown",
          status: 429,
          error: "Rate limit exceeded",
        });
      }

      return { error: errorResponse, startTime };
    }
  }

  // Log successful request start
  if (options.logging !== false) {
    logRequest({
      timestamp: new Date().toISOString(),
      method,
      endpoint: pathname,
      userId,
      ip:
        request.headers.get("x-forwarded-for") ||
        request.headers.get("x-real-ip") ||
        "unknown",
      userAgent: request.headers.get("user-agent") || "unknown",
    });
  }

  return { userId, startTime };
}

/**
 * Finalize response with middleware headers and logging
 */
export function finalizeResponse(
  request: NextRequest,
  response: NextResponse,
  startTime: number,
  userId: string = "anonymous",
  options: MiddlewareOptions = { cors: true, rateLimit: true, logging: true },
): NextResponse {
  const pathname = request.nextUrl.pathname;
  const duration = Date.now() - startTime;

  // Add CORS headers
  if (options.cors !== false) {
    addCORSHeaders(request, response);
  }

  // Add rate limit headers
  if (options.rateLimit !== false) {
    const config = getRateLimitConfig(pathname);
    const rateLimitResult = checkRateLimit(userId, pathname, config);
    addRateLimitHeaders(response, rateLimitResult, config);
  }

  // Log response
  if (options.logging !== false) {
    logRequest({
      timestamp: new Date().toISOString(),
      method: request.method,
      endpoint: pathname,
      userId,
      ip:
        request.headers.get("x-forwarded-for") ||
        request.headers.get("x-real-ip") ||
        "unknown",
      userAgent: request.headers.get("user-agent") || "unknown",
      duration,
      status: response.status,
    });
  }

  // Add performance header
  response.headers.set("X-Response-Time", `${duration}ms`);

  return response;
}
