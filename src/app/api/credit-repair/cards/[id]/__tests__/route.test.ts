/**
 * Tests for Individual Credit Card API Route
 *
 * Tests:
 * - GET /api/credit-repair/cards/[id]
 * - PUT /api/credit-repair/cards/[id]
 * - DELETE /api/credit-repair/cards/[id]
 */

import { NextRequest } from "next/server";

// Mock dependencies BEFORE importing modules that use them
jest.mock("@/lib/auth/jwt-validation");
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: jest.fn().mockResolvedValue("user"),
}));
jest.mock("@/lib/credit-repair/db", () => ({
  db: {
    creditCards: {
      getCreditCard: jest.fn(),
      updateCreditCard: jest.fn(),
      deleteCreditCard: jest.fn(),
    },
  },
}));
jest.mock("@/lib/security/audit-logging");

// Import after mocks are set up
import { GET, PUT, DELETE } from "../route";
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

describe("/api/credit-repair/cards/[id]", () => {
  const mockUser = {
    id: "user-123",
    email: "test@example.com",
    name: "Test User",
  };
  const mockCard = {
    id: "card-123",
    userId: "user-123",
    cardName: "Chase Sapphire",
    lastFourDigits: "1234",
    creditLimit: 10000,
    currentBalance: 3000,
    utilization: 30,
    statementClosingDay: 15,
    paymentDueDay: 25,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (auditLogger.logAIInteraction as jest.Mock).mockResolvedValue(undefined);
  });

  describe("GET /api/credit-repair/cards/[id]", () => {
    beforeEach(() => {
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: true,
        user: mockUser,
      });
    });

    it("should return credit card by ID", async () => {
      (db.creditCards.getCreditCard as jest.Mock).mockResolvedValue(mockCard);

      const request = createMockRequest(
        "http://localhost:3000/api/credit-repair/cards/card-123",
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe(mockCard.id);
      expect(db.creditCards.getCreditCard).toHaveBeenCalledWith(
        "card-123",
        mockUser.id,
      );
    });

    it("should return 404 if card not found", async () => {
      (db.creditCards.getCreditCard as jest.Mock).mockResolvedValue(null);

      const request = createMockRequest(
        "http://localhost:3000/api/credit-repair/cards/card-123",
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Credit card not found");
    });

    it("should return 401 if not authenticated", async () => {
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: false,
        user: null,
      });

      const request = createMockRequest(
        "http://localhost:3000/api/credit-repair/cards/card-123",
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 500 on database error", async () => {
      (db.creditCards.getCreditCard as jest.Mock).mockRejectedValue(
        new Error("Database error"),
      );

      const request = createMockRequest(
        "http://localhost:3000/api/credit-repair/cards/card-123",
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to get credit card");
    });
  });

  describe("PUT /api/credit-repair/cards/[id]", () => {
    beforeEach(() => {
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: true,
        user: mockUser,
      });
    });

    it("should update credit card successfully with auto-calculated utilization", async () => {
      const updates = {
        currentBalance: 5000,
      };

      const updatedCard = {
        ...mockCard,
        currentBalance: 5000,
        utilization: 50,
      };
      (db.creditCards.updateCreditCard as jest.Mock).mockResolvedValue(
        updatedCard,
      );

      const request = createMockRequest(
        "http://localhost:3000/api/credit-repair/cards/card-123",
        {
          method: "PUT",
          body: updates,
        },
      );
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.currentBalance).toBe(5000);
      expect(data.data.utilization).toBe(50);
    });

    it("should return 400 for invalid credit limit", async () => {
      const invalidUpdates = {
        creditLimit: 0,
      };

      const request = createMockRequest(
        "http://localhost:3000/api/credit-repair/cards/card-123",
        {
          method: "PUT",
          body: invalidUpdates,
        },
      );
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Credit limit must be greater than 0");
    });

    it("should return 400 for negative current balance", async () => {
      const invalidUpdates = {
        currentBalance: -100,
      };

      const request = createMockRequest(
        "http://localhost:3000/api/credit-repair/cards/card-123",
        {
          method: "PUT",
          body: invalidUpdates,
        },
      );
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Current balance cannot be negative");
    });

    it("should return 400 for invalid statement closing day", async () => {
      const invalidUpdates = {
        statementClosingDay: 35,
      };

      const request = createMockRequest(
        "http://localhost:3000/api/credit-repair/cards/card-123",
        {
          method: "PUT",
          body: invalidUpdates,
        },
      );
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Statement closing day must be between 1 and 31");
    });

    it("should return 400 for invalid payment due day", async () => {
      const invalidUpdates = {
        paymentDueDay: 0,
      };

      const request = createMockRequest(
        "http://localhost:3000/api/credit-repair/cards/card-123",
        {
          method: "PUT",
          body: invalidUpdates,
        },
      );
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Payment due day must be between 1 and 31");
    });

    it("should return 401 if not authenticated", async () => {
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: false,
        user: null,
      });

      const updates = { currentBalance: 5000 };

      const request = createMockRequest(
        "http://localhost:3000/api/credit-repair/cards/card-123",
        {
          method: "PUT",
          body: updates,
        },
      );
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 500 on database error", async () => {
      const updates = { currentBalance: 5000 };

      (db.creditCards.updateCreditCard as jest.Mock).mockRejectedValue(
        new Error("Database error"),
      );

      const request = createMockRequest(
        "http://localhost:3000/api/credit-repair/cards/card-123",
        {
          method: "PUT",
          body: updates,
        },
      );
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to update credit card");
    });
  });

  describe("DELETE /api/credit-repair/cards/[id]", () => {
    beforeEach(() => {
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: true,
        user: mockUser,
      });
    });

    it("should delete credit card successfully", async () => {
      (db.creditCards.deleteCreditCard as jest.Mock).mockResolvedValue(true);

      const request = createMockRequest(
        "http://localhost:3000/api/credit-repair/cards/card-123",
        {
          method: "DELETE",
        },
      );
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe("Credit card deleted successfully");
      expect(db.creditCards.deleteCreditCard).toHaveBeenCalledWith(
        "card-123",
        mockUser.id,
      );
    });

    it("should return 404 if card not found", async () => {
      (db.creditCards.deleteCreditCard as jest.Mock).mockResolvedValue(false);

      const request = createMockRequest(
        "http://localhost:3000/api/credit-repair/cards/card-123",
        {
          method: "DELETE",
        },
      );
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Credit card not found");
    });

    it("should return 401 if not authenticated", async () => {
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: false,
        user: null,
      });

      const request = createMockRequest(
        "http://localhost:3000/api/credit-repair/cards/card-123",
        {
          method: "DELETE",
        },
      );
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 500 on database error", async () => {
      (db.creditCards.deleteCreditCard as jest.Mock).mockRejectedValue(
        new Error("Database error"),
      );

      const request = createMockRequest(
        "http://localhost:3000/api/credit-repair/cards/card-123",
        {
          method: "DELETE",
        },
      );
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to delete credit card");
    });
  });
});

describe("negative-auth – /api/credit-repair/cards/[id] (withAuth)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

    it("GET returns 401 when the request is not authenticated (TASK-AUTH-03c)", async () => {
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: false,
        user: null,
      });
      const res = await GET(createMockRequest("http://localhost:3000/api/credit-repair/cards/card-123"));
      expect(res.status).toBe(401);
    });

    it("PUT returns 401 when the request is not authenticated (TASK-AUTH-03c)", async () => {
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: false,
        user: null,
      });
      const res = await PUT(createMockRequest("http://localhost:3000/api/credit-repair/cards/card-123", { method: "PUT" }));
      expect(res.status).toBe(401);
    });

    it("DELETE returns 401 when the request is not authenticated (TASK-AUTH-03c)", async () => {
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: false,
        user: null,
      });
      const res = await DELETE(createMockRequest("http://localhost:3000/api/credit-repair/cards/card-123", { method: "DELETE" }));
      expect(res.status).toBe(401);
    });
});
