/**
 * Public marketplace catalog route hardening — DEFAB-3 / ADR-0008.
 *
 * The marketplace catalog routes are intentionally reachable pre-auth
 * (allowlisted in src/lib/auth/PUBLIC_ROUTES.ts) so prospects can browse before
 * signup. Because those routes carry no session, deny-by-default cannot help
 * them, so two residual risks remain on an open route (ADR-0008): scraping, and
 * an accidental unguarded mutation. This helper addresses both — throttle by
 * client IP, and reject every non-GET method so a future mutation cannot ship
 * silently on a public path.
 */

import { NextRequest, NextResponse } from "next/server";
import { RedisRateLimiter } from "@/lib/security/redis-rate-limiting";
import {
  addRateLimitHeaders,
  createRateLimitedResponse,
} from "./rate-limit-headers";

/** Anti-scraping budget for the open catalog: 60 requests / minute / client. */
const PUBLIC_CATALOG_WINDOW_MS = 60 * 1000;
const PUBLIC_CATALOG_MAX_REQUESTS = 60;

/**
 * Shared limiter for every public catalog route (single bucket, keyed by IP).
 * Exported as a test seam: its `check` is the Redis / in-memory I/O boundary.
 */
export const publicCatalogLimiter = new RedisRateLimiter(
  {
    windowMs: PUBLIC_CATALOG_WINDOW_MS,
    maxRequests: PUBLIC_CATALOG_MAX_REQUESTS,
  },
  "marketplace-public",
);

/**
 * Best-effort client identifier for an unauthenticated request. Uses the
 * left-most `X-Forwarded-For` hop (the origin client behind Vercel), falling
 * back to `X-Real-IP`, then a shared bucket that still throttles aggregate abuse.
 */
export function clientIpFrom(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const firstHop = forwardedFor?.split(",")[0]?.trim();
  if (firstHop) return firstHop;

  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

/** Outcome of a public-catalog rate-limit check. */
export type PublicCatalogRateLimit =
  | { allowed: false; response: NextResponse }
  | { allowed: true; withHeaders: (response: NextResponse) => NextResponse };

/**
 * Throttle a public catalog request by client IP.
 *
 * When over budget, returns a ready-to-send 429. Otherwise returns a handle
 * whose `withHeaders` stamps the standard `X-RateLimit-*` headers onto the
 * eventual success response.
 */
export async function enforcePublicCatalogRateLimit(
  request: NextRequest,
): Promise<PublicCatalogRateLimit> {
  const result = await publicCatalogLimiter.check(clientIpFrom(request));

  if (!result.allowed) {
    return {
      allowed: false,
      response: createRateLimitedResponse(result, PUBLIC_CATALOG_MAX_REQUESTS),
    };
  }

  return {
    allowed: true,
    withHeaders: (response) =>
      addRateLimitHeaders(response, result, PUBLIC_CATALOG_MAX_REQUESTS),
  };
}

/**
 * 405 handler for the non-GET methods of a read-only public catalog route.
 * Wired per-method (`export const POST = methodNotAllowed`) so adding a real
 * mutation forces a visible removal of this guard in review.
 */
export function methodNotAllowed(): NextResponse {
  const response = NextResponse.json(
    { success: false, error: "Method Not Allowed" },
    { status: 405 },
  );
  response.headers.set("Allow", "GET");
  return response;
}
