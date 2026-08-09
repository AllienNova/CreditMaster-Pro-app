/**
 * Tests for Quick Wins API Route
 *
 * Tests:
 * - GET /api/credit-repair/quick-wins
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
      getActions: jest.fn(),
      createAction: jest.fn(),
    },
  },
}));
jest.mock("@/lib/credit-repair", () => ({
  creditRepairService: {
    getQuickWins: jest.fn(),
  },
}));
jest.mock("@/lib/security/audit-logging");

// Import after mocks are set up
import { GET } from "../route";
import { jwtValidation } from "@/lib/auth/jwt-validation";
import { db } from "@/lib/credit-repair/db";
import { creditRepairService } from "@/lib/credit-repair";
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

describe("/api/credit-repair/quick-wins", () => {
  const mockUser = {
    id: "user-123",
    email: "test@example.com",
    name: "Test User",
  };
  const mockQuickWins = [
    {
      id: "pay_down_utilization",
      title: "Pay Down Credit Card Balances",
      description: "Reduce credit utilization below 30%",
      impact: 50,
      timeline: "30 days",
      difficulty: "easy",
    },
    {
      id: "dispute_errors",
      title: "Dispute Credit Report Errors",
      description: "Challenge inaccurate items on your credit report",
      impact: 40,
      timeline: "30-45 days",
      difficulty: "medium",
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (auditLogger.logAIInteraction as jest.Mock).mockResolvedValue(undefined);
    (auditLogger.logSecurityEvent as jest.Mock).mockResolvedValue(undefined);
  });

  describe("GET /api/credit-repair/quick-wins", () => {
    beforeEach(() => {
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: true,
        user: mockUser,
      });
    });

    it("should return quick wins and create new actions", async () => {
      // Mock service
      (creditRepairService.getQuickWins as jest.Mock).mockResolvedValue(
        mockQuickWins,
      );

      // Mock database - no existing actions
      (db.creditRepair.getActions as jest.Mock).mockResolvedValue([]);
      (db.creditRepair.createAction as jest.Mock).mockResolvedValue({
        id: "action-123",
      });

      const request = createMockRequest(
        "http://localhost:3000/api/credit-repair/quick-wins",
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(2);
      expect(data.data[0].id).toBe("pay_down_utilization");

      // Should create actions for both quick wins
      expect(db.creditRepair.createAction).toHaveBeenCalledTimes(2);
    });

    it("should not create duplicate actions", async () => {
      // Mock service
      (creditRepairService.getQuickWins as jest.Mock).mockResolvedValue(
        mockQuickWins,
      );

      // Mock database - existing action with same description in actionData
      (db.creditRepair.getActions as jest.Mock).mockResolvedValue([
        {
          id: "action-123",
          actionData: { description: "Reduce credit utilization below 30%" },
          status: "pending",
        },
      ]);
      (db.creditRepair.createAction as jest.Mock).mockResolvedValue({
        id: "action-new",
      });

      const request = createMockRequest(
        "http://localhost:3000/api/credit-repair/quick-wins",
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Should only create action for the second quick win (first already exists)
      expect(db.creditRepair.createAction).toHaveBeenCalledTimes(1);
    });

    it("should return 401 if not authenticated", async () => {
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: false,
        user: null,
      });

      const request = createMockRequest(
        "http://localhost:3000/api/credit-repair/quick-wins",
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 500 on service error", async () => {
      (creditRepairService.getQuickWins as jest.Mock).mockRejectedValue(
        new Error("Service error"),
      );

      const request = createMockRequest(
        "http://localhost:3000/api/credit-repair/quick-wins",
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to get quick wins");
    });

    it("should return 500 on database error", async () => {
      (creditRepairService.getQuickWins as jest.Mock).mockResolvedValue(
        mockQuickWins,
      );
      (db.creditRepair.getActions as jest.Mock).mockRejectedValue(
        new Error("Database error"),
      );

      const request = createMockRequest(
        "http://localhost:3000/api/credit-repair/quick-wins",
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to get quick wins");
    });
  });
});

describe("negative-auth – /api/credit-repair/quick-wins (withAuth)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

    it("GET returns 401 when the request is not authenticated (TASK-AUTH-03c)", async () => {
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: false,
        user: null,
      });
      const res = await GET(createMockRequest("http://localhost:3000/api/credit-repair/quick-wins"));
      expect(res.status).toBe(401);
    });
});
