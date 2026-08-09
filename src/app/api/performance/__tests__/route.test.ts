/**
 * Negative-auth tests for /api/performance (TASK-AUTH-03f)
 */

import { NextRequest } from "next/server";

const mockValidateFromHeaders = jest.fn();
const mockResolveRoleFromDb = jest.fn();

jest.mock("@/lib/auth/jwt-validation", () => ({
  jwtValidation: {
    validateFromHeaders: (...args: unknown[]) => mockValidateFromHeaders(...args),
  },
}));
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: (...args: unknown[]) => mockResolveRoleFromDb(...args),
}));
jest.mock("@/lib/performance/performance-monitor", () => ({ PerformanceMonitor: { getReport: jest.fn(), getMemoryUsage: jest.fn(), getCPUUsage: jest.fn(), clearMetrics: jest.fn() } }));
jest.mock("@/lib/cache/cache-service", () => ({ cache: { getStats: jest.fn() } }));

import { GET, DELETE } from "../route";

function createMockRequest(method = "GET"): NextRequest {
  const url = "http://localhost:3000/api/performance";
  return {
    url,
    method,
    json: jest.fn().mockResolvedValue({}),
    formData: jest.fn().mockResolvedValue(new Map()),
    headers: new Headers(),
    nextUrl: new URL(url),
    signal: { addEventListener: jest.fn() },
  } as unknown as NextRequest;
}

describe("negative-auth – /api/performance", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateFromHeaders.mockResolvedValue({
      valid: true,
      user: { id: "user-1", email: "user@example.com" },
    });
    mockResolveRoleFromDb.mockResolvedValue("user");
  });

  it("GET returns 401 when not authenticated", async () => {
    mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
    const res = await GET(createMockRequest("GET"));
    expect(res.status).toBe(401);
  });

  it("DELETE returns 401 when not authenticated", async () => {
    mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
    const res = await DELETE(createMockRequest("DELETE"));
    expect(res.status).toBe(401);
  });

  it("GET returns 403 when the role is not admin", async () => {
    mockResolveRoleFromDb.mockResolvedValue("user");
    const res = await GET(createMockRequest("GET"));
    expect(res.status).toBe(403);
  });

  it("DELETE returns 403 when the role is not admin", async () => {
    mockResolveRoleFromDb.mockResolvedValue("user");
    const res = await DELETE(createMockRequest("DELETE"));
    expect(res.status).toBe(403);
  });

});
