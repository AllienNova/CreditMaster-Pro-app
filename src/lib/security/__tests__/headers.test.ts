/**
 * @jest-environment node
 */

import {
  securityHeaders,
  cspHeader,
  devCspHeader,
  getSecurityHeaders,
  corsConfig,
  getCorsHeaders,
} from "../headers";

// ═══════════════════════════════════════════════════════════════════════════════
//  securityHeaders
// ═══════════════════════════════════════════════════════════════════════════════
describe("Security Headers — securityHeaders", () => {
  it("should contain X-Frame-Options set to DENY", () => {
    const header = securityHeaders.find((h) => h.key === "X-Frame-Options");
    expect(header).toBeDefined();
    expect(header?.value).toBe("DENY");
  });

  it("should contain X-Content-Type-Options set to nosniff", () => {
    const header = securityHeaders.find(
      (h) => h.key === "X-Content-Type-Options",
    );
    expect(header).toBeDefined();
    expect(header?.value).toBe("nosniff");
  });

  it("should contain X-XSS-Protection", () => {
    const header = securityHeaders.find((h) => h.key === "X-XSS-Protection");
    expect(header).toBeDefined();
    expect(header?.value).toContain("1");
  });

  it("should contain Referrer-Policy", () => {
    const header = securityHeaders.find((h) => h.key === "Referrer-Policy");
    expect(header).toBeDefined();
    expect(header?.value).toBe("strict-origin-when-cross-origin");
  });

  it("should contain X-DNS-Prefetch-Control", () => {
    const header = securityHeaders.find(
      (h) => h.key === "X-DNS-Prefetch-Control",
    );
    expect(header).toBeDefined();
  });

  it("should contain Permissions-Policy", () => {
    const header = securityHeaders.find((h) => h.key === "Permissions-Policy");
    expect(header).toBeDefined();
    expect(header?.value).toContain("camera=()");
    expect(header?.value).toContain("microphone=()");
  });

  it("should contain Strict-Transport-Security", () => {
    const header = securityHeaders.find(
      (h) => h.key === "Strict-Transport-Security",
    );
    expect(header).toBeDefined();
    expect(header?.value).toContain("max-age=31536000");
    expect(header?.value).toContain("includeSubDomains");
  });

  it("should have 7 security headers", () => {
    expect(securityHeaders).toHaveLength(7);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  CSP headers
// ═══════════════════════════════════════════════════════════════════════════════
describe("Security Headers — CSP", () => {
  it("should have Content-Security-Policy key for production", () => {
    expect(cspHeader.key).toBe("Content-Security-Policy");
  });

  it("should include default-src self in production CSP", () => {
    expect(cspHeader.value).toContain("default-src 'self'");
  });

  it("should include Stripe domains in production CSP", () => {
    expect(cspHeader.value).toContain("js.stripe.com");
    expect(cspHeader.value).toContain("api.stripe.com");
  });

  it("should include Supabase connect-src in production CSP", () => {
    expect(cspHeader.value).toContain("*.supabase.co");
  });

  it("should include frame-ancestors none in production CSP", () => {
    expect(cspHeader.value).toContain("frame-ancestors 'none'");
  });

  it("should include object-src none in production CSP", () => {
    expect(cspHeader.value).toContain("object-src 'none'");
  });

  it("should include upgrade-insecure-requests in production CSP", () => {
    expect(cspHeader.value).toContain("upgrade-insecure-requests");
  });

  it("should have Content-Security-Policy key for dev", () => {
    expect(devCspHeader.key).toBe("Content-Security-Policy");
  });

  it("should be more permissive in dev CSP", () => {
    expect(devCspHeader.value).toContain("ws:");
    expect(devCspHeader.value).toContain("wss:");
  });

  it("should not contain whitespace runs in CSP value", () => {
    // The CSP value is .replace(/\s{2,}/g, " ").trim() so no double spaces
    expect(cspHeader.value).not.toMatch(/\s{2,}/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  getSecurityHeaders
// ═══════════════════════════════════════════════════════════════════════════════
describe("Security Headers — getSecurityHeaders", () => {
  it("should return all headers plus production CSP when not dev", () => {
    const headers = getSecurityHeaders(false);
    expect(headers).toHaveLength(securityHeaders.length + 1);
    const csp = headers.find((h) => h.key === "Content-Security-Policy");
    expect(csp).toBeDefined();
    expect(csp?.value).toContain("frame-ancestors");
  });

  it("should return all headers plus dev CSP when dev", () => {
    const headers = getSecurityHeaders(true);
    expect(headers).toHaveLength(securityHeaders.length + 1);
    const csp = headers.find((h) => h.key === "Content-Security-Policy");
    expect(csp).toBeDefined();
    expect(csp?.value).toContain("ws:");
  });

  it("should default to production CSP when no argument", () => {
    const headers = getSecurityHeaders();
    const csp = headers.find((h) => h.key === "Content-Security-Policy");
    expect(csp?.value).toContain("frame-ancestors");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  corsConfig
// ═══════════════════════════════════════════════════════════════════════════════
describe("Security Headers — corsConfig", () => {
  it("should have allowed origins array", () => {
    expect(Array.isArray(corsConfig.allowedOrigins)).toBe(true);
    expect(corsConfig.allowedOrigins.length).toBeGreaterThan(0);
  });

  it("should include common HTTP methods", () => {
    expect(corsConfig.allowedMethods).toContain("GET");
    expect(corsConfig.allowedMethods).toContain("POST");
    expect(corsConfig.allowedMethods).toContain("PUT");
    expect(corsConfig.allowedMethods).toContain("PATCH");
    expect(corsConfig.allowedMethods).toContain("DELETE");
    expect(corsConfig.allowedMethods).toContain("OPTIONS");
  });

  it("should include Authorization header", () => {
    expect(corsConfig.allowedHeaders).toContain("Authorization");
  });

  it("should include Content-Type header", () => {
    expect(corsConfig.allowedHeaders).toContain("Content-Type");
  });

  it("should include CSRF token header", () => {
    expect(corsConfig.allowedHeaders).toContain("X-CSRF-Token");
  });

  it("should enable credentials", () => {
    expect(corsConfig.credentials).toBe(true);
  });

  it("should set maxAge to 24 hours", () => {
    expect(corsConfig.maxAge).toBe(86400);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  getCorsHeaders
// ═══════════════════════════════════════════════════════════════════════════════
describe("Security Headers — getCorsHeaders", () => {
  it("should return headers for allowed origin", () => {
    const origin = corsConfig.allowedOrigins[0];
    const headers = getCorsHeaders(origin);

    expect(headers["Access-Control-Allow-Origin"]).toBe(origin);
    expect(headers["Access-Control-Allow-Methods"]).toBeDefined();
    expect(headers["Access-Control-Allow-Headers"]).toBeDefined();
    expect(headers["Access-Control-Allow-Credentials"]).toBe("true");
    expect(headers["Access-Control-Max-Age"]).toBe("86400");
  });

  it("should return empty headers for disallowed origin", () => {
    const headers = getCorsHeaders("https://evil.example.com");
    expect(Object.keys(headers)).toHaveLength(0);
  });

  it("should return empty headers for null origin", () => {
    const headers = getCorsHeaders(null);
    expect(Object.keys(headers)).toHaveLength(0);
  });

  it("should list all methods in comma-separated format", () => {
    const origin = corsConfig.allowedOrigins[0];
    const headers = getCorsHeaders(origin);
    const methods = headers["Access-Control-Allow-Methods"];
    expect(methods).toContain("GET");
    expect(methods).toContain("POST");
  });
});
