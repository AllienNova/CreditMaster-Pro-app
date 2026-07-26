/**
 * Unit tests for the public marketplace catalog route guard (DEFAB-3 / ADR-0008).
 *
 * Covers client-IP derivation, the rate-limit outcomes (allowed → header
 * stamping, blocked → 429), and the non-GET 405 guard. The Redis/in-memory
 * `check` boundary is the only thing mocked — the guard logic runs for real.
 */

import { NextRequest } from "next/server";
import {
  clientIpFrom,
  enforcePublicCatalogRateLimit,
  methodNotAllowed,
  publicCatalogLimiter,
} from "../public-route-guard";
import type { RateLimitResult } from "@/lib/security/redis-rate-limiting";

function makeRequest(headers: Record<string, string> = {}): NextRequest {
  return {
    headers: new Headers(headers),
  } as unknown as NextRequest;
}

function allowResult(): RateLimitResult {
  return {
    allowed: true,
    remaining: 59,
    resetAt: new Date(Date.now() + 60_000),
  };
}

function blockResult(): RateLimitResult {
  return {
    allowed: false,
    remaining: 0,
    resetAt: new Date(Date.now() + 60_000),
    retryAfter: 42,
  };
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe("clientIpFrom", () => {
  it("uses the left-most X-Forwarded-For hop", () => {
    const ip = clientIpFrom(
      makeRequest({ "x-forwarded-for": "203.0.113.7, 10.0.0.1, 10.0.0.2" }),
    );
    expect(ip).toBe("203.0.113.7");
  });

  it("falls back to X-Real-IP when no forwarded header is present", () => {
    expect(clientIpFrom(makeRequest({ "x-real-ip": "198.51.100.9" }))).toBe(
      "198.51.100.9",
    );
  });

  it("falls back to a shared bucket when no client header is present", () => {
    expect(clientIpFrom(makeRequest())).toBe("unknown");
  });
});

describe("enforcePublicCatalogRateLimit", () => {
  it("stamps X-RateLimit headers on the success handle when allowed", async () => {
    jest.spyOn(publicCatalogLimiter, "check").mockResolvedValue(allowResult());

    const outcome = await enforcePublicCatalogRateLimit(makeRequest());
    expect(outcome.allowed).toBe(true);
    if (!outcome.allowed) throw new Error("expected allowed");

    const { NextResponse } = await import("next/server");
    const decorated = outcome.withHeaders(NextResponse.json({ ok: true }));
    expect(decorated.headers.get("X-RateLimit-Limit")).toBe("60");
    expect(decorated.headers.get("X-RateLimit-Remaining")).toBe("59");
    expect(decorated.headers.get("X-RateLimit-Reset")).toMatch(/^\d+$/);
  });

  it("keys the limiter by client IP", async () => {
    const spy = jest
      .spyOn(publicCatalogLimiter, "check")
      .mockResolvedValue(allowResult());

    await enforcePublicCatalogRateLimit(
      makeRequest({ "x-forwarded-for": "203.0.113.7" }),
    );
    expect(spy).toHaveBeenCalledWith("203.0.113.7");
  });

  it("returns a ready 429 with Retry-After when over budget", async () => {
    jest.spyOn(publicCatalogLimiter, "check").mockResolvedValue(blockResult());

    const outcome = await enforcePublicCatalogRateLimit(makeRequest());
    expect(outcome.allowed).toBe(false);
    if (outcome.allowed) throw new Error("expected blocked");

    expect(outcome.response.status).toBe(429);
    expect(outcome.response.headers.get("Retry-After")).toBe("42");
    expect(outcome.response.headers.get("X-RateLimit-Limit")).toBe("60");
  });
});

describe("methodNotAllowed", () => {
  it("returns 405 with an Allow: GET header", async () => {
    const res = methodNotAllowed();
    expect(res.status).toBe(405);
    expect(res.headers.get("Allow")).toBe("GET");
    await expect(res.json()).resolves.toMatchObject({
      success: false,
      error: "Method Not Allowed",
    });
  });
});
