/**
 * Tests for /api/credit-repair/score
 *
 * Coverage:
 * - GET endpoint (fetch score from DB or calculate)
 * - POST endpoint (calculate and save new score)
 * - Authentication
 * - Error handling
 */

import { NextRequest } from "next/server";

// Mock dependencies BEFORE importing modules that use them
jest.mock("@/lib/auth/jwt-validation");
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: jest.fn().mockResolvedValue("user"),
}));
jest.mock("@/lib/credit-repair/db", () => ({
  db: {
    creditRepair: {
      getCreditRepairScore: jest.fn(),
      saveCreditRepairScore: jest.fn(),
    },
  },
}));
jest.mock("@/lib/credit-repair", () => ({
  creditRepairService: {
    getCreditRepairScore: jest.fn(),
  },
}));
jest.mock("@/lib/security/audit-logging");

// Import after mocks are set up
import { GET, POST } from "../route";
import { jwtValidation } from "@/lib/auth/jwt-validation";
import { db } from "@/lib/credit-repair/db";
import { creditRepairService } from "@/lib/credit-repair";
import { auditLogger } from "@/lib/security/audit-logging";

describe("/api/credit-repair/score", () => {
  const mockUser = {
    id: "user-123",
    email: "test@example.com",
    name: "Test User",
  };

  const mockScore = {
    id: "score-123",
    userId: "user-123",
    score: 75,
    factors: { utilization: 30, payment_history: 90 },
    opportunities: [{ type: "pay_down_utilization", impact: 20 }],
    estimatedImpact: 50,
    timeline: "30-60 days",
    createdAt: new Date().toISOString(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock audit logger
    (auditLogger.logAIInteraction as jest.Mock).mockResolvedValue(undefined);
    (auditLogger.logSecurityEvent as jest.Mock).mockResolvedValue(undefined);
  });

  describe("GET /api/credit-repair/score", () => {
    it("should return existing score from database", async () => {
      // Mock authentication
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: true,
        user: mockUser,
      });

      // Mock database returning existing score
      (db.creditRepair.getCreditRepairScore as jest.Mock).mockResolvedValue(
        mockScore,
      );

      const request = new NextRequest(
        "http://localhost:3000/api/credit-repair/score",
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe(mockScore.id);
      expect(data.data.score).toBe(mockScore.score);
      expect(data.data.factors).toEqual(mockScore.factors);
      expect(db.creditRepair.getCreditRepairScore).toHaveBeenCalledWith(
        mockUser.id,
      );
      expect(auditLogger.logAIInteraction).toHaveBeenCalled();
    });

    it("should calculate and save new score if not in database", async () => {
      // Mock authentication
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: true,
        user: mockUser,
      });

      // Mock database returning null (no existing score)
      (db.creditRepair.getCreditRepairScore as jest.Mock).mockResolvedValue(
        null,
      );

      // Mock service calculating new score - factors must be array with { category, currentScore }
      (creditRepairService.getCreditRepairScore as jest.Mock).mockResolvedValue(
        {
          score: 75,
          factors: [
            { category: "utilization", currentScore: 30 },
            { category: "payment_history", currentScore: 90 },
          ],
          opportunities: [{ type: "pay_down_utilization", impact: 20 }],
          estimatedImpact: 50,
          timeline: "30-60 days",
        },
      );

      // Mock database saving new score
      (db.creditRepair.saveCreditRepairScore as jest.Mock).mockResolvedValue(
        mockScore,
      );

      const request = new NextRequest(
        "http://localhost:3000/api/credit-repair/score",
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe(mockScore.id);
      expect(data.data.score).toBe(mockScore.score);
      expect(data.data.factors).toEqual(mockScore.factors);
      expect(creditRepairService.getCreditRepairScore).toHaveBeenCalledWith(
        mockUser.id,
      );
      expect(db.creditRepair.saveCreditRepairScore).toHaveBeenCalled();
    });

    it("should return 401 if not authenticated", async () => {
      // Mock authentication failure
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: false,
        user: null,
      });

      const request = new NextRequest(
        "http://localhost:3000/api/credit-repair/score",
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 500 on database error", async () => {
      // Mock authentication
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: true,
        user: mockUser,
      });

      // Mock database error
      (db.creditRepair.getCreditRepairScore as jest.Mock).mockRejectedValue(
        new Error("Database error"),
      );

      const request = new NextRequest(
        "http://localhost:3000/api/credit-repair/score",
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to get credit repair score");
    });
  });

  describe("POST /api/credit-repair/score", () => {
    it("should calculate and save new score", async () => {
      // Mock authentication
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: true,
        user: mockUser,
      });

      // Mock service calculating new score - factors must be array with { category, currentScore }
      (creditRepairService.getCreditRepairScore as jest.Mock).mockResolvedValue(
        {
          score: 75,
          factors: [
            { category: "utilization", currentScore: 30 },
            { category: "payment_history", currentScore: 90 },
          ],
          opportunities: [{ type: "pay_down_utilization", impact: 20 }],
          estimatedImpact: 50,
          timeline: "30-60 days",
        },
      );

      // Mock database saving new score
      (db.creditRepair.saveCreditRepairScore as jest.Mock).mockResolvedValue(
        mockScore,
      );

      const request = new NextRequest(
        "http://localhost:3000/api/credit-repair/score",
        {
          method: "POST",
        },
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe(mockScore.id);
      expect(data.data.score).toBe(mockScore.score);
      expect(data.data.factors).toEqual(mockScore.factors);
      expect(creditRepairService.getCreditRepairScore).toHaveBeenCalledWith(
        mockUser.id,
      );
      expect(db.creditRepair.saveCreditRepairScore).toHaveBeenCalled();
      expect(auditLogger.logAIInteraction).toHaveBeenCalled();
    });

    it("should return 401 if not authenticated", async () => {
      // Mock authentication failure
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: false,
        user: null,
      });

      const request = new NextRequest(
        "http://localhost:3000/api/credit-repair/score",
        {
          method: "POST",
        },
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 500 on service error", async () => {
      // Mock authentication
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: true,
        user: mockUser,
      });

      // Mock service error
      (creditRepairService.getCreditRepairScore as jest.Mock).mockRejectedValue(
        new Error("Service error"),
      );

      const request = new NextRequest(
        "http://localhost:3000/api/credit-repair/score",
        {
          method: "POST",
        },
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to calculate credit repair score");
    });
  });
});

describe("negative-auth – /api/credit-repair/score (withAuth)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

    it("GET returns 401 when the request is not authenticated (TASK-AUTH-03c)", async () => {
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: false,
        user: null,
      });
      const res = await GET(
        new NextRequest("http://localhost:3000/api/credit-repair/score"),
      );
      expect(res.status).toBe(401);
    });

    it("POST returns 401 when the request is not authenticated (TASK-AUTH-03c)", async () => {
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: false,
        user: null,
      });
      const res = await POST(
        new NextRequest("http://localhost:3000/api/credit-repair/score", {
          method: "POST",
        }),
      );
      expect(res.status).toBe(401);
    });
});
