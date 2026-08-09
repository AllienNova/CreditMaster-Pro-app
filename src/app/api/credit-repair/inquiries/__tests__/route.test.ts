/**
 * Tests for /api/credit-repair/inquiries
 *
 * Coverage:
 * - GET endpoint (fetch the authenticated user's real credit inquiries)
 * - Authentication (401 when unauthenticated)
 * - IDOR safety (user id comes from the guard, never from query/body)
 * - Optional type filter (hard | soft) + invalid-type validation
 * - Honest empty result (no mock fallback)
 * - Error handling (500, including audit-log failure path)
 */

import { GET } from "../route";
import { NextRequest } from "next/server";
import { jwtValidation } from "@/lib/auth/jwt-validation";
import { db } from "@/lib/credit-repair/db";
import { auditLogger } from "@/lib/security/audit-logging";

// Mock dependencies
jest.mock("@/lib/auth/jwt-validation");
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: jest.fn().mockResolvedValue("user"),
}));
jest.mock("@/lib/credit-repair/db", () => ({
  db: {
    inquiries: {
      getInquiriesByUser: jest.fn(),
      getInquiryStats: jest.fn(),
    },
  },
}));
jest.mock("@/lib/security/audit-logging");

interface MockRequestOptions {
  method?: string;
  body?: unknown;
}

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

const BASE_URL = "http://localhost:3000/api/credit-repair/inquiries";

describe("/api/credit-repair/inquiries", () => {
  const mockUser = {
    id: "user-123",
    email: "test@example.com",
    name: "Test User",
  };

  const mockInquiry = {
    id: "inq-1",
    userId: "user-123",
    reportId: "rep-1",
    inquiryType: "hard" as const,
    creditorName: "Chase Bank",
    inquiryDate: new Date("2024-11-15"),
    bureau: "experian" as const,
    isDisputed: false,
    createdAt: new Date("2024-11-15"),
  };

  const mockStats = { total: 3, hard: 2, soft: 1, disputed: 0 };

  beforeEach(() => {
    jest.clearAllMocks();
    (auditLogger.logAIInteraction as jest.Mock).mockResolvedValue(undefined);
    (auditLogger.logSecurityEvent as jest.Mock).mockResolvedValue(undefined);
  });

  describe("GET /api/credit-repair/inquiries", () => {
    it("returns the authenticated user's real inquiries with stats", async () => {
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: true,
        user: mockUser,
      });
      (db.inquiries.getInquiriesByUser as jest.Mock).mockResolvedValue([
        mockInquiry,
      ]);
      (db.inquiries.getInquiryStats as jest.Mock).mockResolvedValue(mockStats);

      const response = await GET(createMockRequest(BASE_URL));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data.inquiries)).toBe(true);
      expect(data.data.inquiries[0].creditorName).toBe("Chase Bank");
      expect(data.data.inquiries[0].inquiryType).toBe("hard");
      expect(data.data.inquiries[0].bureau).toBe("experian");
      expect(data.data.inquiries[0].inquiryDate).toBeDefined();
      expect(data.data.stats).toEqual(mockStats);
      expect(data.data.pagination.total).toBe(3);
      expect(db.inquiries.getInquiriesByUser).toHaveBeenCalledWith(
        mockUser.id,
        { type: undefined, limit: 50, offset: 0 },
      );
      expect(auditLogger.logAIInteraction).toHaveBeenCalled();
    });

    it("returns an honest empty array when the user has no inquiries (no mock fallback)", async () => {
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: true,
        user: mockUser,
      });
      (db.inquiries.getInquiriesByUser as jest.Mock).mockResolvedValue([]);
      (db.inquiries.getInquiryStats as jest.Mock).mockResolvedValue({
        total: 0,
        hard: 0,
        soft: 0,
        disputed: 0,
      });

      const response = await GET(createMockRequest(BASE_URL));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.inquiries).toEqual([]);
      expect(data.data.pagination.total).toBe(0);
    });

    it("filters to hard inquiries when ?type=hard and reports the hard total", async () => {
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: true,
        user: mockUser,
      });
      (db.inquiries.getInquiriesByUser as jest.Mock).mockResolvedValue([
        mockInquiry,
      ]);
      (db.inquiries.getInquiryStats as jest.Mock).mockResolvedValue(mockStats);

      const response = await GET(createMockRequest(`${BASE_URL}?type=hard`));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(db.inquiries.getInquiriesByUser).toHaveBeenCalledWith(
        mockUser.id,
        { type: "hard", limit: 50, offset: 0 },
      );
      // pagination.total reflects the hard-only count from stats
      expect(data.data.pagination.total).toBe(mockStats.hard);
    });

    it("reports the soft total when ?type=soft", async () => {
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: true,
        user: mockUser,
      });
      (db.inquiries.getInquiriesByUser as jest.Mock).mockResolvedValue([]);
      (db.inquiries.getInquiryStats as jest.Mock).mockResolvedValue(mockStats);

      const response = await GET(createMockRequest(`${BASE_URL}?type=soft`));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(db.inquiries.getInquiriesByUser).toHaveBeenCalledWith(
        mockUser.id,
        { type: "soft", limit: 50, offset: 0 },
      );
      expect(data.data.pagination.total).toBe(mockStats.soft);
    });

    it("honors limit and offset query parameters", async () => {
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: true,
        user: mockUser,
      });
      (db.inquiries.getInquiriesByUser as jest.Mock).mockResolvedValue([]);
      (db.inquiries.getInquiryStats as jest.Mock).mockResolvedValue(mockStats);

      await GET(createMockRequest(`${BASE_URL}?limit=10&offset=20`));

      expect(db.inquiries.getInquiriesByUser).toHaveBeenCalledWith(
        mockUser.id,
        { type: undefined, limit: 10, offset: 20 },
      );
    });

    it("returns 400 for an invalid inquiry type", async () => {
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: true,
        user: mockUser,
      });

      const response = await GET(
        createMockRequest(`${BASE_URL}?type=medium`),
      );
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid inquiry type");
      expect(db.inquiries.getInquiriesByUser).not.toHaveBeenCalled();
    });

    it("returns 401 when the request is not authenticated", async () => {
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: false,
        user: null,
      });

      const response = await GET(createMockRequest(BASE_URL));
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
      expect(db.inquiries.getInquiriesByUser).not.toHaveBeenCalled();
    });

    it("ignores a userId supplied in the query string (IDOR-safe)", async () => {
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: true,
        user: mockUser,
      });
      (db.inquiries.getInquiriesByUser as jest.Mock).mockResolvedValue([]);
      (db.inquiries.getInquiryStats as jest.Mock).mockResolvedValue(mockStats);

      await GET(
        createMockRequest(`${BASE_URL}?userId=attacker-999`),
      );

      // The authenticated id is used; the attacker-supplied id is never passed through.
      expect(db.inquiries.getInquiriesByUser).toHaveBeenCalledWith(
        mockUser.id,
        expect.anything(),
      );
      expect(db.inquiries.getInquiryStats).toHaveBeenCalledWith(mockUser.id);
      const passedIds = (
        db.inquiries.getInquiriesByUser as jest.Mock
      ).mock.calls.map((c) => c[0]);
      expect(passedIds).not.toContain("attacker-999");
    });

    it("returns 500 and logs a security event on database error", async () => {
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: true,
        user: mockUser,
      });
      (db.inquiries.getInquiriesByUser as jest.Mock).mockRejectedValue(
        new Error("Database error"),
      );

      const response = await GET(createMockRequest(BASE_URL));
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to get credit inquiries");
      expect(auditLogger.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({ type: "api_error", severity: "medium" }),
      );
    });

    it("still returns 500 when audit logging itself fails", async () => {
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: true,
        user: mockUser,
      });
      (db.inquiries.getInquiriesByUser as jest.Mock).mockRejectedValue(
        new Error("Database error"),
      );
      (auditLogger.logSecurityEvent as jest.Mock).mockRejectedValue(
        new Error("audit sink down"),
      );

      const response = await GET(createMockRequest(BASE_URL));
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to get credit inquiries");
    });
  });
});
