/**
 * Tests for /api/financial/monitoring
 */

import { NextRequest } from "next/server";

const mockResolveRoleFromDb = jest.fn();
jest.mock("@/lib/auth/jwt-validation");
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: (...args: unknown[]) => mockResolveRoleFromDb(...args),
}));
jest.mock("@/lib/auth/rbac");
jest.mock("@/lib/api/financial-api-middleware");

import { GET } from "../route";
import { jwtValidation } from "@/lib/auth/jwt-validation";
import { rbac } from "@/lib/auth/rbac";
import {
  getRequestLogs,
  getRequestStats,
} from "@/lib/api/financial-api-middleware";

const mockAdminUser = {
  id: "admin-123",
  email: "admin@example.com",
  role: "admin",
};
const mockRegularUser = {
  id: "user-123",
  email: "test@example.com",
  role: "premium",
};

function createMockRequest(url: string) {
  const parsedUrl = new URL(url);
  return {
    url,
    method: "GET",
    headers: new Headers(),
    nextUrl: parsedUrl,
  } as unknown as NextRequest;
}

const mockLogs = [
  {
    timestamp: "2026-01-15T10:00:00Z",
    endpoint: "/api/financial/dashboard",
    method: "GET",
    status: 200,
    duration: 45,
  },
  {
    timestamp: "2026-01-15T10:01:00Z",
    endpoint: "/api/financial/accounts",
    method: "GET",
    status: 500,
    duration: 120,
  },
];

const mockStats = {
  total: 1000,
  averageDuration: 85.5,
  errorRate: 0.025,
  byEndpoint: { "/api/financial/dashboard": 500 },
  byUser: { "user-123": 200 },
  byStatus: { "200": 950, "500": 25, "401": 25 },
};

describe("GET /api/financial/monitoring", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: true,
      user: mockAdminUser,
    });
    // Route is wrapped in withRole("admin"); the guard resolves the role
    // from the DB via resolveRoleFromDb.
    mockResolveRoleFromDb.mockResolvedValue("admin");
    (getRequestLogs as jest.Mock).mockReturnValue(mockLogs);
    (getRequestStats as jest.Mock).mockReturnValue(mockStats);
  });

  describe("negative-auth", () => {
    it("should return 401 for unauthenticated request", async () => {
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: false,
        user: null,
      });
      const request = createMockRequest(
        "http://localhost:3000/api/financial/monitoring",
      );
      const response = await GET(request);
      expect(response.status).toBe(401);
    });

    it("should return 403 for non-admin user", async () => {
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: true,
        user: mockRegularUser,
      });
      mockResolveRoleFromDb.mockResolvedValue("premium");
      const request = createMockRequest(
        "http://localhost:3000/api/financial/monitoring",
      );
      const response = await GET(request);
      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toContain("Forbidden");
    });
  });

  it("should return monitoring data for admin user", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/monitoring",
    );
    const response = await GET(request);
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.stats.total).toBe(1000);
    expect(data.data.stats.averageDuration).toBe(86);
    expect(data.data.stats.errorRate).toBe(0.03);
    expect(data.data.recentLogs).toEqual(mockLogs);
    expect(getRequestLogs).toHaveBeenCalledWith(100);
  });

  it("should respect limit query parameter", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/monitoring?limit=50",
    );
    await GET(request);
    expect(getRequestLogs).toHaveBeenCalledWith(50);
  });

  it("should return 500 on service error", async () => {
    (getRequestLogs as jest.Mock).mockImplementation(() => {
      throw new Error("Monitoring service down");
    });
    const request = createMockRequest(
      "http://localhost:3000/api/financial/monitoring",
    );
    const response = await GET(request);
    expect(response.status).toBe(500);
  });
});
