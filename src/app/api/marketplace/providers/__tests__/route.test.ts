/**
 * DEFAB-3 hardening tests for GET /api/marketplace/providers.
 * Rate-limit headers on 200 (all three success paths), 429 when exhausted,
 * non-GET → 405, no user-scoped field.
 */

import { NextRequest } from "next/server";

jest.mock("@/lib/marketplace", () => ({
  providerService: {
    getProviders: jest.fn(),
    getTopProviders: jest.fn(),
    getProvidersByCategory: jest.fn(),
  },
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

const PROVIDER = { id: "pr1", name: "Acme Credit", rating: 4.6, verified: true };

function req(query = ""): NextRequest {
  const url = `http://localhost:3000/api/marketplace/providers${query}`;
  return {
    url,
    method: "GET",
    headers: new Headers(),
    nextUrl: new URL(url),
  } as unknown as NextRequest;
}

beforeEach(() => jest.clearAllMocks());
afterEach(() => jest.restoreAllMocks());

describe("GET /api/marketplace/providers — public hardening", () => {
  it("stamps rate-limit headers on the filtered path (200)", async () => {
    jest.spyOn(publicCatalogLimiter, "check").mockResolvedValue(allow);
    (providerService.getProviders as jest.Mock).mockResolvedValue([PROVIDER]);

    const res = await GET(req());
    expect(res.status).toBe(200);
    expect(res.headers.get("X-RateLimit-Limit")).toBe("60");
    expect(res.headers.get("X-RateLimit-Remaining")).toBe("59");
  });

  it("stamps rate-limit headers on the top-providers path", async () => {
    jest.spyOn(publicCatalogLimiter, "check").mockResolvedValue(allow);
    (providerService.getTopProviders as jest.Mock).mockResolvedValue([PROVIDER]);

    const res = await GET(req("?top=true"));
    expect(res.status).toBe(200);
    expect(res.headers.get("X-RateLimit-Limit")).toBe("60");
  });

  it("stamps rate-limit headers on the category path", async () => {
    jest.spyOn(publicCatalogLimiter, "check").mockResolvedValue(allow);
    (providerService.getProvidersByCategory as jest.Mock).mockResolvedValue([
      PROVIDER,
    ]);

    const res = await GET(req("?category=credit_repair"));
    expect(res.status).toBe(200);
    expect(res.headers.get("X-RateLimit-Limit")).toBe("60");
  });

  it("returns 429 without hitting the service when exhausted", async () => {
    jest.spyOn(publicCatalogLimiter, "check").mockResolvedValue(block);

    const res = await GET(req());
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("60");
    expect(providerService.getProviders).not.toHaveBeenCalled();
  });

  it("rejects non-GET methods with 405 + Allow: GET", () => {
    for (const handler of [POST, PUT, PATCH, DELETE]) {
      const res = handler();
      expect(res.status).toBe(405);
      expect(res.headers.get("Allow")).toBe("GET");
    }
  });

  it("returns no user-scoped field in the payload", async () => {
    jest.spyOn(publicCatalogLimiter, "check").mockResolvedValue(allow);
    (providerService.getProviders as jest.Mock).mockResolvedValue([PROVIDER]);

    const body = await (await GET(req())).json();
    expect(JSON.stringify(body)).not.toMatch(/user_?id/i);
  });
});
