/**
 * OWASP Security Scanner Utility
 *
 * Provides static analysis and configuration validation for common
 * OWASP Top 10 categories:
 *
 * - Security headers validation (CSP, HSTS, X-Frame-Options, etc.)
 * - Cookie security audit (httpOnly, secure, sameSite)
 * - Input validation coverage report
 * - CORS configuration audit
 *
 * Designed to be called from CI pipelines or ad-hoc security reviews.
 */

// ── Types ────────────────────────────────────────────────────────────────────

export type ScanSeverity = "pass" | "info" | "warning" | "fail";

export interface ScanFinding {
  /** Unique rule identifier */
  ruleId: string;
  /** Human-readable name of the check */
  name: string;
  /** Severity of the finding */
  severity: ScanSeverity;
  /** Description of the finding */
  description: string;
  /** Remediation advice */
  remediation?: string;
}

export interface HeaderScanResult {
  /** Whether all required headers are present and correct */
  passed: boolean;
  /** Individual header findings */
  findings: ScanFinding[];
  /** Count of passed checks */
  passCount: number;
  /** Count of failed checks */
  failCount: number;
  /** Count of warnings */
  warnCount: number;
}

export interface CookieScanResult {
  passed: boolean;
  findings: ScanFinding[];
  passCount: number;
  failCount: number;
  warnCount: number;
}

export interface CORSScanResult {
  passed: boolean;
  findings: ScanFinding[];
  passCount: number;
  failCount: number;
  warnCount: number;
}

export interface InputValidationCoverageResult {
  passed: boolean;
  findings: ScanFinding[];
  /** Number of routes with input validation */
  coveredRoutes: number;
  /** Number of routes without input validation */
  uncoveredRoutes: number;
  /** Coverage percentage */
  coveragePercentage: number;
}

export interface OWASPScanReport {
  /** Timestamp of the scan */
  scannedAt: Date;
  /** Overall pass/fail */
  passed: boolean;
  /** Summary counts */
  totalFindings: number;
  totalPassed: number;
  totalFailed: number;
  totalWarnings: number;
  /** Section results */
  headers: HeaderScanResult;
  cookies: CookieScanResult;
  cors: CORSScanResult;
  inputValidation: InputValidationCoverageResult;
}

// ── Required Security Headers ────────────────────────────────────────────────

interface RequiredHeader {
  name: string;
  ruleId: string;
  /** If provided, the header value must include this substring */
  expectedValue?: string;
  /** Whether the header is strictly required (fail) or recommended (warning) */
  required: boolean;
  description: string;
  remediation: string;
}

const REQUIRED_HEADERS: RequiredHeader[] = [
  {
    name: "X-Frame-Options",
    ruleId: "HDR-001",
    expectedValue: "DENY",
    required: true,
    description: "Prevents clickjacking by disallowing iframe embedding",
    remediation: 'Set X-Frame-Options to "DENY" or "SAMEORIGIN"',
  },
  {
    name: "X-Content-Type-Options",
    ruleId: "HDR-002",
    expectedValue: "nosniff",
    required: true,
    description: "Prevents MIME type sniffing attacks",
    remediation: 'Set X-Content-Type-Options to "nosniff"',
  },
  {
    name: "Strict-Transport-Security",
    ruleId: "HDR-003",
    expectedValue: "max-age=",
    required: true,
    description: "Enforces HTTPS connections via HSTS",
    remediation:
      "Set Strict-Transport-Security with max-age >= 31536000 and includeSubDomains",
  },
  {
    name: "Content-Security-Policy",
    ruleId: "HDR-004",
    required: true,
    description: "Mitigates XSS and data injection attacks",
    remediation: "Set a Content-Security-Policy header with appropriate directives",
  },
  {
    name: "Referrer-Policy",
    ruleId: "HDR-005",
    required: true,
    description: "Controls how much referrer information is included with requests",
    remediation:
      'Set Referrer-Policy to "strict-origin-when-cross-origin" or stricter',
  },
  {
    name: "Permissions-Policy",
    ruleId: "HDR-006",
    required: false,
    description: "Controls which browser features can be used",
    remediation: "Set Permissions-Policy to restrict unnecessary browser features",
  },
  {
    name: "X-XSS-Protection",
    ruleId: "HDR-007",
    expectedValue: "1",
    required: false,
    description: "Legacy XSS filter (superseded by CSP but still useful for older browsers)",
    remediation: 'Set X-XSS-Protection to "1; mode=block"',
  },
  {
    name: "X-DNS-Prefetch-Control",
    ruleId: "HDR-008",
    required: false,
    description: "Controls DNS prefetching behavior",
    remediation: 'Set X-DNS-Prefetch-Control to "on" or "off" based on your needs',
  },
];

// ── Security Headers Scan ────────────────────────────────────────────────────

/**
 * Validate security headers against OWASP recommendations.
 *
 * @param headers - Map or record of header name -> value
 */
export function scanSecurityHeaders(
  headers: Record<string, string>,
): HeaderScanResult {
  const findings: ScanFinding[] = [];
  let passCount = 0;
  let failCount = 0;
  let warnCount = 0;

  // Normalize header names to lowercase for case-insensitive matching
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    normalized[key.toLowerCase()] = value;
  }

  for (const req of REQUIRED_HEADERS) {
    const headerValue = normalized[req.name.toLowerCase()];

    if (!headerValue) {
      const severity: ScanSeverity = req.required ? "fail" : "warning";
      findings.push({
        ruleId: req.ruleId,
        name: req.name,
        severity,
        description: `Missing header: ${req.name} — ${req.description}`,
        remediation: req.remediation,
      });
      if (req.required) failCount++;
      else warnCount++;
      continue;
    }

    if (req.expectedValue && !headerValue.includes(req.expectedValue)) {
      findings.push({
        ruleId: req.ruleId,
        name: req.name,
        severity: "warning",
        description: `Header ${req.name} present but value "${headerValue}" does not contain expected "${req.expectedValue}"`,
        remediation: req.remediation,
      });
      warnCount++;
      continue;
    }

    findings.push({
      ruleId: req.ruleId,
      name: req.name,
      severity: "pass",
      description: `Header ${req.name} is correctly set`,
    });
    passCount++;
  }

  // Additional CSP-specific checks
  const csp = normalized["content-security-policy"];
  if (csp) {
    if (csp.includes("'unsafe-eval'")) {
      findings.push({
        ruleId: "HDR-CSP-001",
        name: "CSP unsafe-eval",
        severity: "warning",
        description:
          "CSP includes 'unsafe-eval' which allows dynamic code execution — should be removed if possible",
        remediation:
          "Remove 'unsafe-eval' from CSP and refactor code to avoid dynamic evaluation",
      });
      warnCount++;
    }

    if (csp.includes("'unsafe-inline'")) {
      findings.push({
        ruleId: "HDR-CSP-002",
        name: "CSP unsafe-inline",
        severity: "warning",
        description:
          "CSP includes 'unsafe-inline' which weakens XSS protection — use nonces or hashes instead",
        remediation:
          "Replace 'unsafe-inline' with nonce-based or hash-based CSP directives",
      });
      warnCount++;
    }

    if (!csp.includes("frame-ancestors")) {
      findings.push({
        ruleId: "HDR-CSP-003",
        name: "CSP frame-ancestors",
        severity: "info",
        description: "CSP does not include frame-ancestors directive",
        remediation:
          "Add frame-ancestors 'none' or 'self' to CSP for clickjacking protection",
      });
    }
  }

  return {
    passed: failCount === 0,
    findings,
    passCount,
    failCount,
    warnCount,
  };
}

// ── Cookie Security Scan ─────────────────────────────────────────────────────

export interface CookieConfig {
  name: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite: "strict" | "lax" | "none" | null;
  path?: string;
  maxAge?: number;
}

/**
 * Audit cookie configurations for security best practices.
 */
export function scanCookieSecurity(
  cookies: CookieConfig[],
): CookieScanResult {
  const findings: ScanFinding[] = [];
  let passCount = 0;
  let failCount = 0;
  let warnCount = 0;

  for (const cookie of cookies) {
    // Check httpOnly
    if (!cookie.httpOnly) {
      findings.push({
        ruleId: "COOKIE-001",
        name: `Cookie "${cookie.name}" httpOnly`,
        severity: "fail",
        description: `Cookie "${cookie.name}" is missing httpOnly flag — vulnerable to XSS cookie theft`,
        remediation: `Set httpOnly: true for cookie "${cookie.name}"`,
      });
      failCount++;
    } else {
      findings.push({
        ruleId: "COOKIE-001",
        name: `Cookie "${cookie.name}" httpOnly`,
        severity: "pass",
        description: `Cookie "${cookie.name}" has httpOnly set`,
      });
      passCount++;
    }

    // Check secure
    if (!cookie.secure) {
      findings.push({
        ruleId: "COOKIE-002",
        name: `Cookie "${cookie.name}" secure`,
        severity: "fail",
        description: `Cookie "${cookie.name}" is missing secure flag — can be sent over HTTP`,
        remediation: `Set secure: true for cookie "${cookie.name}"`,
      });
      failCount++;
    } else {
      findings.push({
        ruleId: "COOKIE-002",
        name: `Cookie "${cookie.name}" secure`,
        severity: "pass",
        description: `Cookie "${cookie.name}" has secure flag set`,
      });
      passCount++;
    }

    // Check sameSite
    if (!cookie.sameSite || cookie.sameSite === "none") {
      const severity: ScanSeverity =
        cookie.sameSite === "none" ? "warning" : "fail";
      findings.push({
        ruleId: "COOKIE-003",
        name: `Cookie "${cookie.name}" sameSite`,
        severity,
        description: `Cookie "${cookie.name}" sameSite is "${cookie.sameSite ?? "not set"}" — may be vulnerable to CSRF`,
        remediation: `Set sameSite: "strict" or "lax" for cookie "${cookie.name}"`,
      });
      if (severity === "fail") failCount++;
      else warnCount++;
    } else {
      findings.push({
        ruleId: "COOKIE-003",
        name: `Cookie "${cookie.name}" sameSite`,
        severity: "pass",
        description: `Cookie "${cookie.name}" has sameSite="${cookie.sameSite}"`,
      });
      passCount++;
    }

    // Check path restriction
    if (!cookie.path || cookie.path === "/") {
      findings.push({
        ruleId: "COOKIE-004",
        name: `Cookie "${cookie.name}" path`,
        severity: "info",
        description: `Cookie "${cookie.name}" path is "${cookie.path ?? "/"}" — consider restricting to specific paths`,
      });
    }
  }

  return {
    passed: failCount === 0,
    findings,
    passCount,
    failCount,
    warnCount,
  };
}

// ── CORS Configuration Scan ──────────────────────────────────────────────────

export interface CORSConfig {
  allowedOrigins: string[];
  allowedMethods: string[];
  allowedHeaders: string[];
  credentials: boolean;
  maxAge?: number;
}

/**
 * Audit CORS configuration for security issues.
 */
export function scanCORSConfig(config: CORSConfig): CORSScanResult {
  const findings: ScanFinding[] = [];
  let passCount = 0;
  let failCount = 0;
  let warnCount = 0;

  // Check for wildcard origin
  if (config.allowedOrigins.includes("*")) {
    findings.push({
      ruleId: "CORS-001",
      name: "Wildcard origin",
      severity: "fail",
      description:
        "CORS allows all origins (*) — any website can make requests to the API",
      remediation:
        "Restrict allowedOrigins to specific trusted domains",
    });
    failCount++;
  } else if (config.allowedOrigins.length === 0) {
    findings.push({
      ruleId: "CORS-001",
      name: "No origins configured",
      severity: "warning",
      description: "No CORS origins configured — requests may be blocked",
      remediation: "Configure at least one allowed origin",
    });
    warnCount++;
  } else {
    findings.push({
      ruleId: "CORS-001",
      name: "Origins restricted",
      severity: "pass",
      description: `CORS restricted to ${config.allowedOrigins.length} specific origin(s)`,
    });
    passCount++;
  }

  // Check for credentials + wildcard
  if (config.credentials && config.allowedOrigins.includes("*")) {
    findings.push({
      ruleId: "CORS-002",
      name: "Credentials with wildcard",
      severity: "fail",
      description:
        "CORS allows credentials with wildcard origin — browsers will reject this, but it indicates misconfiguration",
      remediation:
        "When credentials are enabled, specify exact origins instead of *",
    });
    failCount++;
  } else if (config.credentials) {
    findings.push({
      ruleId: "CORS-002",
      name: "Credentials with specific origins",
      severity: "pass",
      description: "Credentials enabled with specific origins — properly configured",
    });
    passCount++;
  }

  // Check allowed methods
  const dangerousMethods = config.allowedMethods.filter((m) =>
    ["TRACE", "CONNECT"].includes(m.toUpperCase()),
  );
  if (dangerousMethods.length > 0) {
    findings.push({
      ruleId: "CORS-003",
      name: "Dangerous HTTP methods",
      severity: "fail",
      description: `CORS allows dangerous methods: ${dangerousMethods.join(", ")}`,
      remediation: "Remove TRACE and CONNECT from allowedMethods",
    });
    failCount++;
  } else {
    findings.push({
      ruleId: "CORS-003",
      name: "HTTP methods",
      severity: "pass",
      description: "No dangerous HTTP methods in CORS config",
    });
    passCount++;
  }

  // Check allowed headers for sensitive ones that shouldn't be exposed
  const sensitiveHeaders = config.allowedHeaders.filter((h) =>
    ["cookie", "set-cookie"].includes(h.toLowerCase()),
  );
  if (sensitiveHeaders.length > 0) {
    findings.push({
      ruleId: "CORS-004",
      name: "Sensitive headers exposed",
      severity: "warning",
      description: `CORS allows sensitive headers: ${sensitiveHeaders.join(", ")}`,
      remediation:
        "Remove Cookie and Set-Cookie from CORS allowedHeaders",
    });
    warnCount++;
  } else {
    findings.push({
      ruleId: "CORS-004",
      name: "Headers check",
      severity: "pass",
      description: "No sensitive headers exposed via CORS",
    });
    passCount++;
  }

  // Check max-age
  if (config.maxAge && config.maxAge > 86400) {
    findings.push({
      ruleId: "CORS-005",
      name: "Preflight cache duration",
      severity: "warning",
      description: `CORS preflight cache max-age is ${config.maxAge}s (> 24h) — may delay security updates`,
      remediation: "Set maxAge to 86400 (24 hours) or less",
    });
    warnCount++;
  } else {
    findings.push({
      ruleId: "CORS-005",
      name: "Preflight cache duration",
      severity: "pass",
      description: "CORS preflight cache duration is within recommended range",
    });
    passCount++;
  }

  return {
    passed: failCount === 0,
    findings,
    passCount,
    failCount,
    warnCount,
  };
}

// ── Input Validation Coverage ────────────────────────────────────────────────

export interface RouteValidationStatus {
  path: string;
  method: string;
  hasInputValidation: boolean;
  validationType?: "zod" | "manual" | "custom";
}

/**
 * Report on input validation coverage across routes.
 */
export function scanInputValidationCoverage(
  routes: RouteValidationStatus[],
): InputValidationCoverageResult {
  const findings: ScanFinding[] = [];
  let coveredRoutes = 0;
  let uncoveredRoutes = 0;

  for (const route of routes) {
    if (route.hasInputValidation) {
      coveredRoutes++;
      findings.push({
        ruleId: "INPUT-001",
        name: `${route.path} [${route.method}]`,
        severity: "pass",
        description: `Route has input validation (${route.validationType ?? "unknown"})`,
      });
    } else {
      // Only mutation endpoints (POST, PUT, PATCH, DELETE) are critical
      const isMutation = ["POST", "PUT", "PATCH", "DELETE"].includes(
        route.method.toUpperCase(),
      );
      uncoveredRoutes++;
      findings.push({
        ruleId: "INPUT-002",
        name: `${route.path} [${route.method}]`,
        severity: isMutation ? "fail" : "warning",
        description: "Route is missing input validation",
        remediation: "Add Zod schema validation or manual input validation",
      });
    }
  }

  const total = coveredRoutes + uncoveredRoutes;
  const coveragePercentage =
    total > 0 ? Math.round((coveredRoutes / total) * 100) : 100;

  const failCount = findings.filter((f) => f.severity === "fail").length;

  return {
    passed: failCount === 0,
    findings,
    coveredRoutes,
    uncoveredRoutes,
    coveragePercentage,
  };
}

// ── Full OWASP Scan ──────────────────────────────────────────────────────────

/**
 * Run a full OWASP security scan across all categories.
 *
 * This is the main entry point for CI integration.
 */
export function runOWASPScan(config: {
  headers: Record<string, string>;
  cookies: CookieConfig[];
  cors: CORSConfig;
  routes: RouteValidationStatus[];
}): OWASPScanReport {
  const headers = scanSecurityHeaders(config.headers);
  const cookies = scanCookieSecurity(config.cookies);
  const cors = scanCORSConfig(config.cors);
  const inputValidation = scanInputValidationCoverage(config.routes);

  const totalPassed =
    headers.passCount +
    cookies.passCount +
    cors.passCount +
    inputValidation.coveredRoutes;
  const totalFailed =
    headers.failCount +
    cookies.failCount +
    cors.failCount +
    inputValidation.findings.filter((f) => f.severity === "fail").length;
  const totalWarnings =
    headers.warnCount +
    cookies.warnCount +
    cors.warnCount +
    inputValidation.findings.filter((f) => f.severity === "warning").length;

  return {
    scannedAt: new Date(),
    passed: headers.passed && cookies.passed && cors.passed && inputValidation.passed,
    totalFindings:
      headers.findings.length +
      cookies.findings.length +
      cors.findings.length +
      inputValidation.findings.length,
    totalPassed,
    totalFailed,
    totalWarnings,
    headers,
    cookies,
    cors,
    inputValidation,
  };
}

/** Convenience export for CI scripts */
export const owaspScanner = {
  scanSecurityHeaders,
  scanCookieSecurity,
  scanCORSConfig,
  scanInputValidationCoverage,
  runOWASPScan,
};

export default owaspScanner;
