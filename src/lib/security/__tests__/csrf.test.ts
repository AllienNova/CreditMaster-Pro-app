/**
 * @jest-environment node
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// Mock next/headers before importing
const mockCookieSet = jest.fn();
const mockCookieGet = jest.fn();

jest.mock("next/headers", () => ({
  cookies: jest.fn().mockResolvedValue({
    set: mockCookieSet,
    get: mockCookieGet,
  }),
}));

import {
  generateCSRFToken,
  verifyCSRFToken,
  setCSRFCookie,
  getCSRFToken,
  validateCSRFRequest,
  csrfMiddleware,
  getCSRFTokenHandler,
  createCSRFHeaders,
} from "../csrf";
import { cookies } from "next/headers";

// ── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockCookieSet.mockReset();
  mockCookieGet.mockReset();
  // Re-establish cookies() mock (resetMocks: true clears implementations between tests)
  (cookies as jest.Mock).mockResolvedValue({
    set: mockCookieSet,
    get: mockCookieGet,
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  generateCSRFToken
// ═══════════════════════════════════════════════════════════════════════════════
describe("CSRF — generateCSRFToken", () => {
  it("should generate a base64-encoded token", () => {
    const token = generateCSRFToken();
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(0);

    // Should be valid base64
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    expect(decoded).toContain(":");
  });

  it("should generate unique tokens on each call", () => {
    const t1 = generateCSRFToken();
    const t2 = generateCSRFToken();
    expect(t1).not.toBe(t2);
  });

  it("should contain timestamp and signature", () => {
    const token = generateCSRFToken();
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const parts = decoded.split(":");
    expect(parts.length).toBe(3); // timestamp:randomBytes:signature

    // First part should be a valid timestamp
    const timestamp = parseInt(parts[0], 10);
    expect(timestamp).toBeGreaterThan(0);
    expect(timestamp).toBeLessThanOrEqual(Date.now());
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  verifyCSRFToken
// ═══════════════════════════════════════════════════════════════════════════════
describe("CSRF — verifyCSRFToken", () => {
  it("should verify a valid token", () => {
    const token = generateCSRFToken();
    expect(verifyCSRFToken(token)).toBe(true);
  });

  it("should reject a tampered token", () => {
    const token = generateCSRFToken();
    // Tamper with the last character
    const tampered = token.slice(0, -1) + (token.endsWith("A") ? "B" : "A");
    expect(verifyCSRFToken(tampered)).toBe(false);
  });

  it("should reject an empty string", () => {
    expect(verifyCSRFToken("")).toBe(false);
  });

  it("should reject a completely invalid token", () => {
    expect(verifyCSRFToken("not-a-valid-token")).toBe(false);
  });

  it("should reject an expired token", () => {
    // Create a token with a timestamp in the past (> 1 hour ago)
    const crypto = require("crypto");
    const oldTimestamp = Date.now() - 2 * 60 * 60 * 1000; // 2 hours ago
    const randomBytes = crypto.randomBytes(32).toString("hex");
    const data = `${oldTimestamp}:${randomBytes}`;
    const secret =
      process.env.CSRF_SECRET || "default-csrf-secret-change-in-production";
    const signature = crypto
      .createHmac("sha256", secret)
      .update(data)
      .digest("hex");
    const expiredToken = Buffer.from(`${data}:${signature}`).toString("base64");

    expect(verifyCSRFToken(expiredToken)).toBe(false);
  });

  it("should accept a token that is not yet expired", () => {
    // Token generated just now should be valid
    const token = generateCSRFToken();
    expect(verifyCSRFToken(token)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  setCSRFCookie
// ═══════════════════════════════════════════════════════════════════════════════
describe("CSRF — setCSRFCookie", () => {
  it("should set a cookie and return the token", async () => {
    const token = await setCSRFCookie();

    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(0);
    expect(mockCookieSet).toHaveBeenCalledTimes(1);
    expect(mockCookieSet).toHaveBeenCalledWith(
      "__csrf_token",
      token,
      expect.objectContaining({
        httpOnly: true,
        sameSite: "strict",
        path: "/",
      }),
    );
  });

  it("should set secure flag based on NODE_ENV", async () => {
    await setCSRFCookie();

    const cookieOptions = mockCookieSet.mock.calls[0][2];
    // In test env, NODE_ENV is "test", so secure should be false
    expect(cookieOptions.secure).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  getCSRFToken
// ═══════════════════════════════════════════════════════════════════════════════
describe("CSRF — getCSRFToken", () => {
  it("should return the token from cookie", async () => {
    mockCookieGet.mockReturnValue({ value: "test-token-value" });

    const token = await getCSRFToken();
    expect(token).toBe("test-token-value");
    expect(mockCookieGet).toHaveBeenCalledWith("__csrf_token");
  });

  it("should return null when no cookie exists", async () => {
    mockCookieGet.mockReturnValue(undefined);

    const token = await getCSRFToken();
    expect(token).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  validateCSRFRequest
// ═══════════════════════════════════════════════════════════════════════════════
describe("CSRF — validateCSRFRequest", () => {
  it("should skip validation for GET requests", async () => {
    const request = new Request("http://localhost/api/test", {
      method: "GET",
    });

    const result = await validateCSRFRequest(request as any);
    expect(result).toBe(true);
  });

  it("should skip validation for HEAD requests", async () => {
    const request = new Request("http://localhost/api/test", {
      method: "HEAD",
    });

    const result = await validateCSRFRequest(request as any);
    expect(result).toBe(true);
  });

  it("should skip validation for OPTIONS requests", async () => {
    const request = new Request("http://localhost/api/test", {
      method: "OPTIONS",
    });

    const result = await validateCSRFRequest(request as any);
    expect(result).toBe(true);
  });

  it("should reject POST without CSRF header", async () => {
    const token = generateCSRFToken();
    const request = {
      method: "POST",
      headers: new Headers({}),
      cookies: { get: jest.fn().mockReturnValue({ value: token }) },
    } as any;

    const result = await validateCSRFRequest(request);
    expect(result).toBe(false);
  });

  it("should reject POST without CSRF cookie", async () => {
    const token = generateCSRFToken();
    const request = {
      method: "POST",
      headers: new Headers({ "x-csrf-token": token }),
      cookies: { get: jest.fn().mockReturnValue(undefined) },
    } as any;

    const result = await validateCSRFRequest(request);
    expect(result).toBe(false);
  });

  it("should reject POST when header and cookie tokens do not match", async () => {
    const token1 = generateCSRFToken();
    const token2 = generateCSRFToken();
    const request = {
      method: "POST",
      headers: new Headers({ "x-csrf-token": token1 }),
      cookies: { get: jest.fn().mockReturnValue({ value: token2 }) },
    } as any;

    const result = await validateCSRFRequest(request);
    expect(result).toBe(false);
  });

  it("should accept POST when header and cookie tokens match and are valid", async () => {
    const token = generateCSRFToken();
    const request = {
      method: "POST",
      headers: new Headers({ "x-csrf-token": token }),
      cookies: { get: jest.fn().mockReturnValue({ value: token }) },
    } as any;

    const result = await validateCSRFRequest(request);
    expect(result).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  csrfMiddleware
// ═══════════════════════════════════════════════════════════════════════════════
describe("CSRF — csrfMiddleware", () => {
  it("should return null for valid requests (allow)", async () => {
    const token = generateCSRFToken();
    const request = {
      method: "POST",
      headers: new Headers({ "x-csrf-token": token }),
      cookies: { get: jest.fn().mockReturnValue({ value: token }) },
    } as any;

    const result = await csrfMiddleware(request);
    expect(result).toBeNull();
  });

  it("should return 403 response for invalid CSRF", async () => {
    const request = {
      method: "POST",
      headers: new Headers({}),
      cookies: { get: jest.fn().mockReturnValue(undefined) },
    } as any;

    const result = await csrfMiddleware(request);
    expect(result).not.toBeNull();
    expect(result?.status).toBe(403);

    const body = await result?.json();
    expect(body.error).toContain("CSRF");
  });

  it("should allow GET requests through", async () => {
    const request = {
      method: "GET",
      headers: new Headers({}),
      cookies: { get: jest.fn() },
    } as any;

    const result = await csrfMiddleware(request);
    expect(result).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  getCSRFTokenHandler
// ═══════════════════════════════════════════════════════════════════════════════
describe("CSRF — getCSRFTokenHandler", () => {
  it("should return a JSON response with csrfToken", async () => {
    const response = await getCSRFTokenHandler();
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.csrfToken).toBeDefined();
    expect(typeof body.csrfToken).toBe("string");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  createCSRFHeaders
// ═══════════════════════════════════════════════════════════════════════════════
describe("CSRF — createCSRFHeaders", () => {
  it("should return headers with CSRF token", () => {
    const headers = createCSRFHeaders("test-token");
    expect(headers).toEqual({
      "x-csrf-token": "test-token",
    });
  });

  it("should use the exact token provided", () => {
    const token = generateCSRFToken();
    const headers = createCSRFHeaders(token);
    expect((headers as Record<string, string>)["x-csrf-token"]).toBe(token);
  });
});
