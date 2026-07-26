/**
 * DEFAB-3 hardening tests for GET /api/marketplace/providers/[id].
 * Rate-limit headers on 200, 429 when exhausted, non-GET → 405, no user-scoped
 * field on the base provider payload.
 *
 * NOTE: the `?includeReviews=true` branch (reviewService.getReviewsForProvider)
 * currently exposes reviewer user_id — flagged as a DEFAB-3 payload finding
 * (ADR-0008), NOT covered here; fixing it is an owner-gated decision.
 */

import { NextRequest } from "next/server";

jest.mock("@/lib/marketplace", () => ({
  providerService: { getProviderById: jest.fn() },
  tradelineService: { getTradelinesByProvider: jest.fn() },
  reviewService: { getReviewsForProvider: jest.fn() },
}));

import { GET, POST, PUT, PATCH, DELETE } from "../route";
import { providerService } from "@/lib/marketplace";
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
});
