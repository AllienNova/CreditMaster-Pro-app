/**
 * @jest-environment node
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// Must use fake timers BEFORE importing the module because auth-middleware.ts
// has a top-level setInterval(cleanupExpiredSessions, 60 * 60 * 1000)
jest.useFakeTimers();

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockVerify = jest.fn();
jest.mock("jsonwebtoken", () => {
  class JsonWebTokenError extends Error {
    name = "JsonWebTokenError";
  }
  class TokenExpiredError extends JsonWebTokenError {
    name = "TokenExpiredError";
  }
  class NotBeforeError extends JsonWebTokenError {
    name = "NotBeforeError";
  }
  return {
    __esModule: true,
    default: {
      verify: (...args: any[]) => mockVerify(...args),
      JsonWebTokenError,
      TokenExpiredError,
      NotBeforeError,
    },
    verify: (...args: any[]) => mockVerify(...args),
    JsonWebTokenError,
    TokenExpiredError,
    NotBeforeError,
  };
});

jest.mock("@/lib/monitoring/logger", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock("@/lib/auth/jwt-validation", () => ({
  validateJWT: jest.fn(),
  extractToken: jest.fn(),
}));

jest.mock("@/lib/auth/api-guard", () => ({
  apiGuard: jest.fn(),
  withApiGuard: jest.fn(),
}));

// ── Import AFTER mocks ──────────────────────────────────────────────────────

import {
  hasPermission,
  requireAuth,
  requireRole,
  requirePermission,
  validateAPIKey,
  createAuthResponse,
  createPermissionDeniedResponse,
  createSession,
  getSession,
  deleteSession,
  cleanupExpiredSessions,
  getUserFromRequest,
} from "../auth-middleware";

// ── Helpers ──────────────────────────────────────────────────────────────────

const ENV_BACKUP = { ...process.env };

function makeRequest(options?: {
  authorization?: string;
  method?: string;
}): Request {
  const headers = new Headers();
  if (options?.authorization) {
    headers.set("Authorization", options.authorization);
  }
  return new Request("http://localhost:3000/api/test", {
    method: options?.method || "GET",
    headers,
  });
}

// ── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  process.env = { ...ENV_BACKUP };
  process.env.JWT_SECRET = "test-jwt-secret";
  process.env.AIML_API_KEY = "test-api-key";
});

afterAll(() => {
  process.env = ENV_BACKUP;
  jest.useRealTimers();
});

// ═══════════════════════════════════════════════════════════════════════════════
//  hasPermission
// ═══════════════════════════════════════════════════════════════════════════════
describe("Auth Middleware – hasPermission", () => {
  it("should return true for user with matching permission", () => {
    const userObj = { role: "admin" } as any;
    expect(hasPermission(userObj, "users", "read")).toBe(true);
  });

  it("should deny wildcard access for a non-canonical role", () => {
    const userObj = { role: "enterprise" } as any;
    expect(hasPermission(userObj, "anything", "read")).toBe(false);
  });

  it("should return true for admin user (wildcard)", () => {
    const userObj = { role: "admin" } as any;
    expect(hasPermission(userObj, "anything", "read")).toBe(true);
  });

  it("should return true for super_admin user (wildcard)", () => {
    const userObj = { role: "super_admin" } as any;
    expect(hasPermission(userObj, "anything", "read")).toBe(true);
    expect(hasPermission(userObj, "anything", "admin")).toBe(true);
  });

  it("should return false for user without matching permission", () => {
    const userObj = { role: "user" } as any;
    expect(hasPermission(userObj, "admin_panel", "read")).toBe(false);
  });

  it("should return false for unknown role", () => {
    const userObj = { role: "unknown" } as any;
    expect(hasPermission(userObj, "users", "read")).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  requireAuth
// ═══════════════════════════════════════════════════════════════════════════════
describe("Auth Middleware – requireAuth", () => {
  it("should return error when no Authorization header", async () => {
    const req = makeRequest();
    const result = await requireAuth(req);
    expect(result.authenticated).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("should return error when Authorization header has no Bearer prefix", async () => {
    const req = makeRequest({ authorization: "Basic token123" });
    const result = await requireAuth(req);
    expect(result.authenticated).toBe(false);
  });

  it("should authenticate with valid JWT", async () => {
    mockVerify.mockReturnValue({
      userId: "user-1",
      email: "test@example.com",
      role: "user",
      sub: "user-1",
    });

    const req = makeRequest({ authorization: "Bearer valid-token" });
    const result = await requireAuth(req);

    expect(result.authenticated).toBe(true);
    expect(result.user).toBeDefined();
    expect(result.user?.email).toBe("test@example.com");
  });

  it("should return error for expired token", async () => {
    const expiredError = new Error("jwt expired");
    expiredError.name = "TokenExpiredError";
    mockVerify.mockImplementation(() => {
      throw expiredError;
    });

    const req = makeRequest({ authorization: "Bearer expired-token" });
    const result = await requireAuth(req);
    expect(result.authenticated).toBe(false);
    expect(result.error).toContain("expired");
  });

  it("should return error for invalid token", async () => {
    const jwtError = new Error("invalid signature");
    jwtError.name = "JsonWebTokenError";
    mockVerify.mockImplementation(() => {
      throw jwtError;
    });

    const req = makeRequest({ authorization: "Bearer bad-token" });
    const result = await requireAuth(req);
    expect(result.authenticated).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  requireRole
// ═══════════════════════════════════════════════════════════════════════════════
describe("Auth Middleware – requireRole", () => {
  it("should succeed when user has required role", async () => {
    mockVerify.mockReturnValue({
      userId: "user-1",
      email: "admin@example.com",
      role: "admin",
      sub: "user-1",
    });

    const req = makeRequest({ authorization: "Bearer admin-token" });
    const result = await requireRole(req, "admin");
    expect(result.authenticated).toBe(true);
  });

  it("should succeed when user has higher role than required", async () => {
    mockVerify.mockReturnValue({
      userId: "user-1",
      email: "admin@example.com",
      role: "admin",
      sub: "user-1",
    });

    const req = makeRequest({ authorization: "Bearer admin-token" });
    const result = await requireRole(req, "user");
    expect(result.authenticated).toBe(true);
  });

  it("should fail when user has lower role than required", async () => {
    mockVerify.mockReturnValue({
      userId: "user-1",
      email: "user@example.com",
      role: "user",
      sub: "user-1",
    });

    const req = makeRequest({ authorization: "Bearer user-token" });
    const result = await requireRole(req, "admin");
    expect(result.authenticated).toBe(false);
  });

  it("should fail when not authenticated", async () => {
    const req = makeRequest();
    const result = await requireRole(req, "user");
    expect(result.authenticated).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  requirePermission
// ═══════════════════════════════════════════════════════════════════════════════
describe("Auth Middleware – requirePermission", () => {
  it("should succeed when user has the required permission", async () => {
    mockVerify.mockReturnValue({
      userId: "user-1",
      email: "admin@example.com",
      role: "admin",
      sub: "user-1",
    });

    const req = makeRequest({ authorization: "Bearer admin-token" });
    const result = await requirePermission(req, "users", "read");
    expect(result.authenticated).toBe(true);
  });

  it("should fail when not authenticated", async () => {
    const req = makeRequest();
    const result = await requirePermission(req, "users", "read");
    expect(result.authenticated).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  validateAPIKey
// ═══════════════════════════════════════════════════════════════════════════════
describe("Auth Middleware – validateAPIKey", () => {
  it("should succeed with correct API key", async () => {
    const result = await validateAPIKey("test-api-key");
    expect(result.authenticated).toBe(true);
  });

  it("should fail with incorrect API key", async () => {
    const result = await validateAPIKey("wrong-key");
    expect(result.authenticated).toBe(false);
  });

  it("should fail with empty API key", async () => {
    const result = await validateAPIKey("");
    expect(result.authenticated).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  createAuthResponse / createPermissionDeniedResponse
// ═══════════════════════════════════════════════════════════════════════════════
describe("Auth Middleware – response helpers", () => {
  it("createAuthResponse should return 401 for unauthenticated result", () => {
    const result = { authenticated: false as const, error: "No token" };
    const response = createAuthResponse(result);
    expect(response.status).toBe(401);
  });

  it("createPermissionDeniedResponse should return 403", () => {
    const response = createPermissionDeniedResponse("Not allowed");
    expect(response.status).toBe(403);
  });

  it("createPermissionDeniedResponse should use default message", () => {
    const response = createPermissionDeniedResponse();
    expect(response.status).toBe(403);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  Session management
// ═══════════════════════════════════════════════════════════════════════════════
describe("Auth Middleware – sessions", () => {
  it("createSession should return a token string", () => {
    const token = createSession("user-1");
    expect(token).toBeDefined();
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(0);
  });

  it("getSession should retrieve a created session", () => {
    const token = createSession("user-1");
    const retrieved = getSession(token);
    expect(retrieved).toBeDefined();
    expect(retrieved?.userId).toBe("user-1");
  });

  it("getSession should return null for unknown token", () => {
    expect(getSession("nonexistent-token")).toBeNull();
  });

  it("deleteSession should remove a session", () => {
    const token = createSession("user-1");
    deleteSession(token);
    expect(getSession(token)).toBeNull();
  });

  it("cleanupExpiredSessions should remove expired sessions", () => {
    const token = createSession("user-1");

    // Advance time past session expiry (default 24h)
    jest.advanceTimersByTime(25 * 60 * 60 * 1000);

    cleanupExpiredSessions();
    expect(getSession(token)).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  getUserFromRequest
// ═══════════════════════════════════════════════════════════════════════════════
describe("Auth Middleware – getUserFromRequest", () => {
  it("should return user from valid token", async () => {
    mockVerify.mockReturnValue({
      userId: "user-1",
      email: "test@example.com",
      role: "user",
      sub: "user-1",
    });

    const req = makeRequest({ authorization: "Bearer valid-token" });
    const user = await getUserFromRequest(req);
    expect(user).toBeDefined();
    expect(user?.email).toBe("test@example.com");
  });

  it("should return null when no auth header", async () => {
    const req = makeRequest();
    const user = await getUserFromRequest(req);
    expect(user).toBeNull();
  });
});
