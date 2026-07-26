/**
 * DEFAB-3 hardening tests for GET /api/marketplace/providers/[id].
 * Rate-limit headers on 200, 429 when exhausted, non-GET → 405, no user-scoped
 * field on the base provider payload.
 *
 * The `?includeReviews=true` branch now calls reviewService
 * .getPublicReviewsForProvider, which strips the reviewer's internal userId
 * (P0 info-disclosure fix — the ADR-0008 payload finding). Covered below.
 */

import { NextRequest } from "next/server";

jest.mock("@/lib/marketplace", () => ({
  providerService: { getProviderById: jest.fn() },
  tradelineService: { getTradelinesByProvider: jest.fn() },
  reviewService: { getPublicReviewsForProvider: jest.fn() },
}));

import { GET, POST, PUT, PATCH, DELETE } from "../route";
import { providerService, reviewService } from "@/lib/marketplace";
import { publicCatalogLimiter } from "@/lib/api/public-route-guard";
import type { RateLimitResult } from "@/lib/security/redis-rate-limiting";

const allow: RateLimitResult = {
  allowed: true,
  remaining: 59,
  resetAt: new Date(Date.now() + 60_000),
};
const block: RateLimitResult = {
  allowed: false,
  remaining: 0,
  resetAt: new Date(Date.now() + 60_000),
  retryAfter: 60,
};

const PROVIDER = { id: "pr1", name: "Acme Credit", category: "credit_repair" };

function req(): NextRequest {
  const url = "http://localhost:3000/api/marketplace/providers/pr1";
  return {
    url,
    method: "GET",
    headers: new Headers(),
    nextUrl: new URL(url),
  } as unknown as NextRequest;
}

const ctx = { params: Promise.resolve({ id: "pr1" }) };

beforeEach(() => jest.clearAllMocks());
afterEach(() => jest.restoreAllMocks());

describe("GET /api/marketplace/providers/[id] — public hardening", () => {
  it("stamps rate-limit headers on a 200", async () => {
    jest.spyOn(publicCatalogLimiter, "check").mockResolvedValue(allow);
    (providerService.getProviderById as jest.Mock).mockResolvedValue(PROVIDER);

    const res = await GET(req(), ctx);
    expect(res.status).toBe(200);
    expect(res.headers.get("X-RateLimit-Limit")).toBe("60");
    expect(res.headers.get("X-RateLimit-Remaining")).toBe("59");
  });

  it("returns 429 without hitting the service when exhausted", async () => {
    jest.spyOn(publicCatalogLimiter, "check").mockResolvedValue(block);

    const res = await GET(req(), ctx);
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("60");
    expect(providerService.getProviderById).not.toHaveBeenCalled();
  });

  it("rejects non-GET methods with 405 + Allow: GET", () => {
    for (const handler of [POST, PUT, PATCH, DELETE]) {
      const res = handler();
      expect(res.status).toBe(405);
      expect(res.headers.get("Allow")).toBe("GET");
    }
  });

  it("returns no user-scoped field on the base provider payload", async () => {
    jest.spyOn(publicCatalogLimiter, "check").mockResolvedValue(allow);
    (providerService.getProviderById as jest.Mock).mockResolvedValue(PROVIDER);

    const body = await (await GET(req(), ctx)).json();
    expect(JSON.stringify(body)).not.toMatch(/user_?id/i);
  });

  it("includeReviews=true returns review fields but no reviewer userId", async () => {
    jest.spyOn(publicCatalogLimiter, "check").mockResolvedValue(allow);
    (providerService.getProviderById as jest.Mock).mockResolvedValue(PROVIDER);
    (reviewService.getPublicReviewsForProvider as jest.Mock).mockResolvedValue([
      {
        id: "rv1",
        productId: null,
        providerId: "pr1",
        rating: 5,
        title: "Great",
        content: "Very helpful service",
        verifiedPurchase: true,
        helpfulCount: 3,
        createdAt: new Date("2026-01-01T00:00:00Z"),
      },
    ]);

    const url =
      "http://localhost:3000/api/marketplace/providers/pr1?includeReviews=true";
    const reviewsReq = {
      url,
      method: "GET",
      headers: new Headers(),
      nextUrl: new URL(url),
    } as unknown as NextRequest;

    const res = await GET(reviewsReq, ctx);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(reviewService.getPublicReviewsForProvider).toHaveBeenCalledWith(
      "pr1",
    );
    // Useful public review fields survive the projection.
    expect(body.reviews).toHaveLength(1);
    expect(body.reviews[0].rating).toBe(5);
    expect(body.reviews[0].title).toBe("Great");
    expect(body.reviews[0].content).toBe("Very helpful service");
    // The reviewer's internal identifier must not leak to anonymous callers.
    expect(body.reviews[0]).not.toHaveProperty("userId");
    expect(JSON.stringify(body)).not.toMatch(/user_?id/i);
  });
});
