/**
 * Tests for Individual Credit Report API Route
 *
 * Tests:
 * - GET /api/credit-repair/reports/[id]
 * - DELETE /api/credit-repair/reports/[id]
 */

import { NextRequest } from "next/server";

// Mock dependencies BEFORE importing modules that use them
jest.mock("@/lib/auth/jwt-validation");
jest.mock("@/lib/credit-repair/db", () => ({
  db: {
    creditReports: {
      getCreditReport: jest.fn(),
      deleteCreditReport: jest.fn(),
    },
  },
}));
jest.mock("@/lib/security/audit-logging");

// Import after mocks are set up
import { GET, DELETE } from "../route";
import { jwtValidation } from "@/lib/auth/jwt-validation";
import { db } from "@/lib/credit-repair/db";
import { auditLogger } from "@/lib/security/audit-logging";

interface MockRequestOptions {
  method?: string;
  body?: unknown;
}

// Helper function to create mock NextRequest
function createMockRequest(urlString: string, options?: MockRequestOptions) {
  const parsedUrl = new URL(urlString);
  const request = {
    url: urlString,
    method: options?.method || "GET",
    json: jest.fn().mockResolvedValue(options?.body || {}),
    headers: new Headers(),
    nextUrl: parsedUrl,
  } as unknown as NextRequest;
  return request;
}

describe("/api/credit-repair/reports/[id]", () => {
  const mockUser = {
    id: "user-123",
    email: "test@example.com",
    name: "Test User",
  };
  const mockReport = {
    id: "report-123",
    userId: "user-123",
    bureau: "experian",
    reportDate: new Date("2024-01-15"),
    score: 720,
    reportData: { accounts: [] },
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const mockParams = { params: Promise.resolve({ id: "report-123" }) };

  beforeEach(() => {
    jest.clearAllMocks();
    (auditLogger.logAIInteraction as jest.Mock).mockResolvedValue(undefined);
  });

  describe("GET /api/credit-repair/reports/[id]", () => {
    beforeEach(() => {
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: true,
        user: mockUser,
      });
    });

    it("should return credit report by ID", async () => {
      (db.creditReports.getCreditReport as jest.Mock).mockResolvedValue(
        mockReport,
      );

      const request = createMockRequest(
        "http://localhost:3000/api/credit-repair/reports/report-123",
      );
      const response = await GET(request, mockParams);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe(mockReport.id);
      expect(db.creditReports.getCreditReport).toHaveBeenCalledWith(
        "report-123",
        mockUser.id,
      );
    });

    it("should return 404 if report not found", async () => {
      (db.creditReports.getCreditReport as jest.Mock).mockResolvedValue(null);

      const request = createMockRequest(
        "http://localhost:3000/api/credit-repair/reports/report-123",
      );
      const response = await GET(request, mockParams);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Credit report not found");
    });

    it("should return 401 if not authenticated", async () => {
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: false,
        user: null,
      });

      const request = createMockRequest(
        "http://localhost:3000/api/credit-repair/reports/report-123",
      );
      const response = await GET(request, mockParams);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 500 on database error", async () => {
      (db.creditReports.getCreditReport as jest.Mock).mockRejectedValue(
        new Error("Database error"),
      );

      const request = createMockRequest(
        "http://localhost:3000/api/credit-repair/reports/report-123",
      );
      const response = await GET(request, mockParams);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to get credit report");
    });
  });

  describe("DELETE /api/credit-repair/reports/[id]", () => {
    beforeEach(() => {
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: true,
        user: mockUser,
      });
    });

    it("should delete credit report successfully", async () => {
      (db.creditReports.deleteCreditReport as jest.Mock).mockResolvedValue(
        true,
      );

      const request = createMockRequest(
        "http://localhost:3000/api/credit-repair/reports/report-123",
        {
          method: "DELETE",
        },
      );
      const response = await DELETE(request, mockParams);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe("Credit report deleted successfully");
      expect(db.creditReports.deleteCreditReport).toHaveBeenCalledWith(
        "report-123",
        mockUser.id,
      );
    });

    it("should return 404 if report not found", async () => {
      (db.creditReports.deleteCreditReport as jest.Mock).mockResolvedValue(
        false,
      );

      const request = createMockRequest(
        "http://localhost:3000/api/credit-repair/reports/report-123",
        {
          method: "DELETE",
        },
      );
      const response = await DELETE(request, mockParams);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Credit report not found");
    });

    it("should return 401 if not authenticated", async () => {
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: false,
        user: null,
      });

      const request = createMockRequest(
        "http://localhost:3000/api/credit-repair/reports/report-123",
        {
          method: "DELETE",
        },
      );
      const response = await DELETE(request, mockParams);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 500 on database error", async () => {
      (db.creditReports.deleteCreditReport as jest.Mock).mockRejectedValue(
        new Error("Database error"),
      );

      const request = createMockRequest(
        "http://localhost:3000/api/credit-repair/reports/report-123",
        {
          method: "DELETE",
        },
      );
      const response = await DELETE(request, mockParams);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to delete credit report");
    });
  });
});
