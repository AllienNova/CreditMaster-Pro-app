/**
 * @jest-environment node
 */

import {
  scanSecurityHeaders,
  scanCookieSecurity,
  scanCORSConfig,
  scanInputValidationCoverage,
  runOWASPScan,
  owaspScanner,
  type CookieConfig,
  type CORSConfig,
  type RouteValidationStatus,
} from "../owasp-scanner";

// ═══════════════════════════════════════════════════════════════════════════════
//  scanSecurityHeaders
// ═══════════════════════════════════════════════════════════════════════════════
describe("OWASP Scanner — scanSecurityHeaders", () => {
  const completeHeaders: Record<string, string> = {
    "X-Frame-Options": "DENY",
    "X-Content-Type-Options": "nosniff",
    "Strict-Transport-Security":
      "max-age=31536000; includeSubDomains; preload",
    "Content-Security-Policy": "default-src 'self'; frame-ancestors 'none'",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=()",
    "X-XSS-Protection": "1; mode=block",
    "X-DNS-Prefetch-Control": "on",
  };

  it("should pass with all required headers present and correct", () => {
    const result = scanSecurityHeaders(completeHeaders);

    expect(result.passed).toBe(true);
    expect(result.failCount).toBe(0);
  });

  it("should fail when required headers are missing", () => {
    const result = scanSecurityHeaders({});

    expect(result.passed).toBe(false);
    expect(result.failCount).toBeGreaterThan(0);
  });

  it("should count missing optional headers as warnings, not failures", () => {
    // Include only required headers
    const requiredOnly: Record<string, string> = {
      "X-Frame-Options": "DENY",
      "X-Content-Type-Options": "nosniff",
      "Strict-Transport-Security": "max-age=31536000",
      "Content-Security-Policy": "default-src 'self'",
      "Referrer-Policy": "strict-origin-when-cross-origin",
    };

    const result = scanSecurityHeaders(requiredOnly);

    expect(result.passed).toBe(true);
    expect(result.warnCount).toBeGreaterThan(0);
  });

  it("should warn when header value does not match expected", () => {
    const headers = {
      ...completeHeaders,
      "X-Frame-Options": "SAMEORIGIN",
    };

    const result = scanSecurityHeaders(headers);

    const finding = result.findings.find(
      (f) => f.ruleId === "HDR-001" && f.severity === "warning",
    );
    expect(finding).toBeDefined();
  });

  it("should be case-insensitive for header names", () => {
    const headers: Record<string, string> = {
      "x-frame-options": "DENY",
      "x-content-type-options": "nosniff",
      "strict-transport-security": "max-age=31536000",
      "content-security-policy": "default-src 'self'",
      "referrer-policy": "strict-origin-when-cross-origin",
    };

    const result = scanSecurityHeaders(headers);

    expect(result.passed).toBe(true);
  });

  it("should warn about unsafe-inline in CSP", () => {
    const headers = {
      ...completeHeaders,
      "Content-Security-Policy": "default-src 'self'; script-src 'unsafe-inline'",
    };

    const result = scanSecurityHeaders(headers);

    const finding = result.findings.find((f) => f.ruleId === "HDR-CSP-002");
    expect(finding).toBeDefined();
    expect(finding?.severity).toBe("warning");
  });

  it("should warn about unsafe-eval in CSP", () => {
    const headers = {
      ...completeHeaders,
      "Content-Security-Policy": "default-src 'self'; script-src 'unsafe-eval'",
    };

    const result = scanSecurityHeaders(headers);

    const finding = result.findings.find((f) => f.ruleId === "HDR-CSP-001");
    expect(finding).toBeDefined();
    expect(finding?.severity).toBe("warning");
  });

  it("should add info finding when CSP lacks frame-ancestors", () => {
    const headers = {
      ...completeHeaders,
      "Content-Security-Policy": "default-src 'self'",
    };

    const result = scanSecurityHeaders(headers);

    const finding = result.findings.find((f) => f.ruleId === "HDR-CSP-003");
    expect(finding).toBeDefined();
    expect(finding?.severity).toBe("info");
  });

  it("should not add frame-ancestors finding when CSP includes it", () => {
    const headers = {
      ...completeHeaders,
      "Content-Security-Policy":
        "default-src 'self'; frame-ancestors 'none'",
    };

    const result = scanSecurityHeaders(headers);

    const finding = result.findings.find((f) => f.ruleId === "HDR-CSP-003");
    expect(finding).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  scanCookieSecurity
// ═══════════════════════════════════════════════════════════════════════════════
describe("OWASP Scanner — scanCookieSecurity", () => {
  it("should pass for a fully secure cookie", () => {
    const cookies: CookieConfig[] = [
      {
        name: "session",
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        path: "/api",
      },
    ];

    const result = scanCookieSecurity(cookies);

    expect(result.passed).toBe(true);
    expect(result.failCount).toBe(0);
  });

  it("should fail when httpOnly is missing", () => {
    const cookies: CookieConfig[] = [
      {
        name: "session",
        httpOnly: false,
        secure: true,
        sameSite: "strict",
      },
    ];

    const result = scanCookieSecurity(cookies);

    expect(result.passed).toBe(false);
    const finding = result.findings.find(
      (f) => f.ruleId === "COOKIE-001" && f.severity === "fail",
    );
    expect(finding).toBeDefined();
  });

  it("should fail when secure flag is missing", () => {
    const cookies: CookieConfig[] = [
      {
        name: "session",
        httpOnly: true,
        secure: false,
        sameSite: "strict",
      },
    ];

    const result = scanCookieSecurity(cookies);

    expect(result.passed).toBe(false);
    const finding = result.findings.find(
      (f) => f.ruleId === "COOKIE-002" && f.severity === "fail",
    );
    expect(finding).toBeDefined();
  });

  it("should fail when sameSite is null", () => {
    const cookies: CookieConfig[] = [
      {
        name: "session",
        httpOnly: true,
        secure: true,
        sameSite: null,
      },
    ];

    const result = scanCookieSecurity(cookies);

    expect(result.passed).toBe(false);
  });

  it("should warn when sameSite is none", () => {
    const cookies: CookieConfig[] = [
      {
        name: "session",
        httpOnly: true,
        secure: true,
        sameSite: "none",
      },
    ];

    const result = scanCookieSecurity(cookies);

    expect(result.passed).toBe(true); // warning, not fail
    expect(result.warnCount).toBeGreaterThan(0);
  });

  it("should add info finding for root path cookie", () => {
    const cookies: CookieConfig[] = [
      {
        name: "session",
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        path: "/",
      },
    ];

    const result = scanCookieSecurity(cookies);

    const finding = result.findings.find(
      (f) => f.ruleId === "COOKIE-004" && f.severity === "info",
    );
    expect(finding).toBeDefined();
  });

  it("should handle multiple cookies", () => {
    const cookies: CookieConfig[] = [
      {
        name: "session",
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        path: "/api",
      },
      {
        name: "tracking",
        httpOnly: false,
        secure: false,
        sameSite: null,
      },
    ];

    const result = scanCookieSecurity(cookies);

    expect(result.passed).toBe(false);
    expect(result.passCount).toBeGreaterThan(0);
    expect(result.failCount).toBeGreaterThan(0);
  });

  it("should handle empty cookie array", () => {
    const result = scanCookieSecurity([]);

    expect(result.passed).toBe(true);
    expect(result.findings).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  scanCORSConfig
// ═══════════════════════════════════════════════════════════════════════════════
describe("OWASP Scanner — scanCORSConfig", () => {
  it("should pass with properly restricted CORS", () => {
    const config: CORSConfig = {
      allowedOrigins: ["https://example.com"],
      allowedMethods: ["GET", "POST", "PUT"],
      allowedHeaders: ["Content-Type", "Authorization"],
      credentials: true,
    };

    const result = scanCORSConfig(config);

    expect(result.passed).toBe(true);
    expect(result.failCount).toBe(0);
  });

  it("should fail with wildcard origin", () => {
    const config: CORSConfig = {
      allowedOrigins: ["*"],
      allowedMethods: ["GET"],
      allowedHeaders: ["Content-Type"],
      credentials: false,
    };

    const result = scanCORSConfig(config);

    expect(result.passed).toBe(false);
    const finding = result.findings.find((f) => f.ruleId === "CORS-001");
    expect(finding?.severity).toBe("fail");
  });

  it("should fail with credentials + wildcard origin", () => {
    const config: CORSConfig = {
      allowedOrigins: ["*"],
      allowedMethods: ["GET"],
      allowedHeaders: ["Content-Type"],
      credentials: true,
    };

    const result = scanCORSConfig(config);

    const finding = result.findings.find((f) => f.ruleId === "CORS-002");
    expect(finding?.severity).toBe("fail");
  });

  it("should pass credentials with specific origins", () => {
    const config: CORSConfig = {
      allowedOrigins: ["https://example.com"],
      allowedMethods: ["GET"],
      allowedHeaders: ["Content-Type"],
      credentials: true,
    };

    const result = scanCORSConfig(config);

    const finding = result.findings.find((f) => f.ruleId === "CORS-002");
    expect(finding?.severity).toBe("pass");
  });

  it("should fail with dangerous HTTP methods", () => {
    const config: CORSConfig = {
      allowedOrigins: ["https://example.com"],
      allowedMethods: ["GET", "TRACE"],
      allowedHeaders: ["Content-Type"],
      credentials: false,
    };

    const result = scanCORSConfig(config);

    expect(result.passed).toBe(false);
    const finding = result.findings.find((f) => f.ruleId === "CORS-003");
    expect(finding?.severity).toBe("fail");
  });

  it("should warn about sensitive headers", () => {
    const config: CORSConfig = {
      allowedOrigins: ["https://example.com"],
      allowedMethods: ["GET"],
      allowedHeaders: ["Content-Type", "Cookie"],
      credentials: false,
    };

    const result = scanCORSConfig(config);

    const finding = result.findings.find((f) => f.ruleId === "CORS-004");
    expect(finding?.severity).toBe("warning");
  });

  it("should warn about excessive max-age", () => {
    const config: CORSConfig = {
      allowedOrigins: ["https://example.com"],
      allowedMethods: ["GET"],
      allowedHeaders: ["Content-Type"],
      credentials: false,
      maxAge: 172800, // 48 hours
    };

    const result = scanCORSConfig(config);

    const finding = result.findings.find((f) => f.ruleId === "CORS-005");
    expect(finding?.severity).toBe("warning");
  });

  it("should pass with reasonable max-age", () => {
    const config: CORSConfig = {
      allowedOrigins: ["https://example.com"],
      allowedMethods: ["GET"],
      allowedHeaders: ["Content-Type"],
      credentials: false,
      maxAge: 3600, // 1 hour
    };

    const result = scanCORSConfig(config);

    const finding = result.findings.find((f) => f.ruleId === "CORS-005");
    expect(finding?.severity).toBe("pass");
  });

  it("should warn with empty origins", () => {
    const config: CORSConfig = {
      allowedOrigins: [],
      allowedMethods: ["GET"],
      allowedHeaders: ["Content-Type"],
      credentials: false,
    };

    const result = scanCORSConfig(config);

    const finding = result.findings.find((f) => f.ruleId === "CORS-001");
    expect(finding?.severity).toBe("warning");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  scanInputValidationCoverage
// ═══════════════════════════════════════════════════════════════════════════════
describe("OWASP Scanner — scanInputValidationCoverage", () => {
  it("should pass when all routes have validation", () => {
    const routes: RouteValidationStatus[] = [
      { path: "/api/users", method: "POST", hasInputValidation: true, validationType: "zod" },
      { path: "/api/users", method: "GET", hasInputValidation: true, validationType: "manual" },
    ];

    const result = scanInputValidationCoverage(routes);

    expect(result.passed).toBe(true);
    expect(result.coveragePercentage).toBe(100);
    expect(result.coveredRoutes).toBe(2);
    expect(result.uncoveredRoutes).toBe(0);
  });

  it("should fail when mutation route lacks validation", () => {
    const routes: RouteValidationStatus[] = [
      { path: "/api/users", method: "POST", hasInputValidation: false },
    ];

    const result = scanInputValidationCoverage(routes);

    expect(result.passed).toBe(false);
    const finding = result.findings.find((f) => f.severity === "fail");
    expect(finding).toBeDefined();
  });

  it("should warn (not fail) when GET route lacks validation", () => {
    const routes: RouteValidationStatus[] = [
      { path: "/api/users", method: "GET", hasInputValidation: false },
    ];

    const result = scanInputValidationCoverage(routes);

    expect(result.passed).toBe(true); // warnings don't cause failure
    const finding = result.findings.find((f) => f.severity === "warning");
    expect(finding).toBeDefined();
  });

  it("should calculate correct coverage percentage", () => {
    const routes: RouteValidationStatus[] = [
      { path: "/api/a", method: "POST", hasInputValidation: true, validationType: "zod" },
      { path: "/api/b", method: "GET", hasInputValidation: false },
      { path: "/api/c", method: "PUT", hasInputValidation: true, validationType: "manual" },
      { path: "/api/d", method: "DELETE", hasInputValidation: false },
    ];

    const result = scanInputValidationCoverage(routes);

    expect(result.coveredRoutes).toBe(2);
    expect(result.uncoveredRoutes).toBe(2);
    expect(result.coveragePercentage).toBe(50);
  });

  it("should return 100% for empty routes array", () => {
    const result = scanInputValidationCoverage([]);

    expect(result.passed).toBe(true);
    expect(result.coveragePercentage).toBe(100);
  });

  it("should treat PUT, PATCH, DELETE as mutation methods", () => {
    const routes: RouteValidationStatus[] = [
      { path: "/api/a", method: "PUT", hasInputValidation: false },
      { path: "/api/b", method: "PATCH", hasInputValidation: false },
      { path: "/api/c", method: "DELETE", hasInputValidation: false },
    ];

    const result = scanInputValidationCoverage(routes);

    expect(result.passed).toBe(false);
    const failFindings = result.findings.filter((f) => f.severity === "fail");
    expect(failFindings).toHaveLength(3);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  runOWASPScan
// ═══════════════════════════════════════════════════════════════════════════════
describe("OWASP Scanner — runOWASPScan", () => {
  it("should pass with fully secure configuration", () => {
    const report = runOWASPScan({
      headers: {
        "X-Frame-Options": "DENY",
        "X-Content-Type-Options": "nosniff",
        "Strict-Transport-Security": "max-age=31536000",
        "Content-Security-Policy":
          "default-src 'self'; frame-ancestors 'none'",
        "Referrer-Policy": "strict-origin-when-cross-origin",
      },
      cookies: [
        {
          name: "session",
          httpOnly: true,
          secure: true,
          sameSite: "strict",
          path: "/api",
        },
      ],
      cors: {
        allowedOrigins: ["https://example.com"],
        allowedMethods: ["GET", "POST"],
        allowedHeaders: ["Content-Type", "Authorization"],
        credentials: true,
      },
      routes: [
        {
          path: "/api/users",
          method: "POST",
          hasInputValidation: true,
          validationType: "zod",
        },
      ],
    });

    expect(report.passed).toBe(true);
    expect(report.totalFailed).toBe(0);
    expect(report.scannedAt).toBeInstanceOf(Date);
  });

  it("should fail when any section fails", () => {
    const report = runOWASPScan({
      headers: {},
      cookies: [],
      cors: {
        allowedOrigins: ["https://example.com"],
        allowedMethods: ["GET"],
        allowedHeaders: ["Content-Type"],
        credentials: false,
      },
      routes: [],
    });

    expect(report.passed).toBe(false); // headers will fail
    expect(report.totalFailed).toBeGreaterThan(0);
  });

  it("should aggregate findings across all sections", () => {
    const report = runOWASPScan({
      headers: { "X-Frame-Options": "DENY" },
      cookies: [
        {
          name: "test",
          httpOnly: false,
          secure: false,
          sameSite: null,
        },
      ],
      cors: {
        allowedOrigins: ["*"],
        allowedMethods: ["GET", "TRACE"],
        allowedHeaders: ["Content-Type"],
        credentials: true,
      },
      routes: [{ path: "/api/x", method: "POST", hasInputValidation: false }],
    });

    expect(report.totalFindings).toBeGreaterThan(0);
    expect(report.headers.findings.length).toBeGreaterThan(0);
    expect(report.cookies.findings.length).toBeGreaterThan(0);
    expect(report.cors.findings.length).toBeGreaterThan(0);
    expect(report.inputValidation.findings.length).toBeGreaterThan(0);
  });

  it("should calculate correct totals", () => {
    const report = runOWASPScan({
      headers: {
        "X-Frame-Options": "DENY",
        "X-Content-Type-Options": "nosniff",
        "Strict-Transport-Security": "max-age=31536000",
        "Content-Security-Policy": "default-src 'self'; frame-ancestors 'none'",
        "Referrer-Policy": "strict-origin-when-cross-origin",
      },
      cookies: [],
      cors: {
        allowedOrigins: ["https://example.com"],
        allowedMethods: ["GET"],
        allowedHeaders: ["Content-Type"],
        credentials: false,
      },
      routes: [],
    });

    expect(report.totalFindings).toBe(
      report.headers.findings.length +
        report.cookies.findings.length +
        report.cors.findings.length +
        report.inputValidation.findings.length,
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  Singleton export
// ═══════════════════════════════════════════════════════════════════════════════
describe("OWASP Scanner — owaspScanner export", () => {
  it("should expose all public functions", () => {
    expect(owaspScanner.scanSecurityHeaders).toBe(scanSecurityHeaders);
    expect(owaspScanner.scanCookieSecurity).toBe(scanCookieSecurity);
    expect(owaspScanner.scanCORSConfig).toBe(scanCORSConfig);
    expect(owaspScanner.scanInputValidationCoverage).toBe(
      scanInputValidationCoverage,
    );
    expect(owaspScanner.runOWASPScan).toBe(runOWASPScan);
  });
});
