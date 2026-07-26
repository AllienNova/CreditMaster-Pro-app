/**
 * DEFAB-3 hardening tests for GET /api/marketplace/tradelines/[id].
 * Rate-limit headers on 200, 429 when exhausted, non-GET → 405, no user-scoped field.
 */

import { NextRequest } from "next/server";

jest.mock("@/lib/marketplace", () => ({
  tradelineService: {
    getTradelineById: jest.fn(),
    calculateValueScore: jest.fn().mockReturnValue(2.5),
  },
}));

import { GET, POST, PUT, PATCH, DELETE } from "../route";
import { tradelineService } from "@/lib/marketplace";
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

const TRADELINE = {
  id: "t1",
  providerId: "pr1",
  creditLimit: 15000,
  ageMonths: 36,
  price: 50000,
  estimatedScoreImpact: 40,
};

function req(): NextRequest {
  const url = "http://localhost:3000/api/marketplace/tradelines/t1";
  return {
    url,
    method: "GET",
    headers: new Headers(),
    nextUrl: new URL(url),
  } as unknown as NextRequest;
}

const ctx = { params: Promise.resolve({ id: "t1" }) };

beforeEach(() => jest.clearAllMocks());
afterEach(() => jest.restoreAllMocks());

describe("GET /api/marketplace/tradelines/[id] — public hardening", () => {
  it("stamps rate-limit headers on a 200", async () => {
    jest.spyOn(publicCatalogLimiter, "check").mockResolvedValue(allow);
    (tradelineService.getTradelineById as jest.Mock).mockResolvedValue(TRADELINE);

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
    expect(tradelineService.getTradelineById).not.toHaveBeenCalled();
  });

  it("rejects non-GET methods with 405 + Allow: GET", () => {
    for (const handler of [POST, PUT, PATCH, DELETE]) {
      const res = handler();
      expect(res.status).toBe(405);
      expect(res.headers.get("Allow")).toBe("GET");
    }
  });

  it("returns no user-scoped field in the payload (providerId is allowed)", async () => {
    jest.spyOn(publicCatalogLimiter, "check").mockResolvedValue(allow);
    (tradelineService.getTradelineById as jest.Mock).mockResolvedValue(TRADELINE);

    const body = await (await GET(req(), ctx)).json();
    expect(JSON.stringify(body)).not.toMatch(/user_?id/i);
    expect(JSON.stringify(body)).toContain("providerId");
  });
});
