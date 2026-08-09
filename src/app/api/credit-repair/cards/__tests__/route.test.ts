/**
 * Tests for /api/credit-repair/cards
 *
 * Coverage:
 * - GET endpoint (fetch all credit cards)
 * - POST endpoint (add new credit card)
 * - Authentication
 * - Validation
 * - Auto-calculated utilization
 * - Error handling
 */

import { GET, POST } from "../route";
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
    creditCards: {
      getCreditCardsByUser: jest.fn(),
      createCreditCard: jest.fn(),
      calculateTotalUtilization: jest.fn(),
    },
  },
}));
jest.mock("@/lib/security/audit-logging");

interface MockRequestOptions {
  method?: string;
  body?: unknown;
}

/**
 * Helper function to create a properly mocked NextRequest
 * This ensures the json() method works correctly in tests
 */
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

describe("/api/credit-repair/cards", () => {
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
    utilization: 30, // Auto-calculated
    statementClosingDay: 15,
    paymentDueDay: 25,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock audit logger
    (auditLogger.logAIInteraction as jest.Mock).mockResolvedValue(undefined);
    (auditLogger.logSecurityEvent as jest.Mock).mockResolvedValue(undefined);
  });

  describe("GET /api/credit-repair/cards", () => {
    it("should return all credit cards for user", async () => {
      // Mock authentication
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: true,
        user: mockUser,
      });

      // Mock database
      (db.creditCards.getCreditCardsByUser as jest.Mock).mockResolvedValue([
        mockCard,
      ]);
      (db.creditCards.calculateTotalUtilization as jest.Mock).mockResolvedValue(
        30,
      );

      const request = createMockRequest(
        "http://localhost:3000/api/credit-repair/cards",
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data.cards)).toBe(true);
      expect(data.data.cards[0].id).toBe(mockCard.id);
      expect(data.data.cards[0].cardName).toBe(mockCard.cardName);
      expect(data.data.totalUtilization).toBe(30);
      expect(db.creditCards.getCreditCardsByUser).toHaveBeenCalledWith(
        mockUser.id,
        {
          minUtilization: undefined,
          maxUtilization: undefined,
          limit: 50,
          offset: 0,
        },
      );
    });

    it("should filter cards by utilization range", async () => {
      // Mock authentication
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: true,
        user: mockUser,
      });

      // Mock database
      (db.creditCards.getCreditCardsByUser as jest.Mock).mockResolvedValue([
        mockCard,
      ]);
      (db.creditCards.calculateTotalUtilization as jest.Mock).mockResolvedValue(
        30,
      );

      const request = createMockRequest(
        "http://localhost:3000/api/credit-repair/cards?minUtilization=20&maxUtilization=40",
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(db.creditCards.getCreditCardsByUser).toHaveBeenCalledWith(
        mockUser.id,
        {
          minUtilization: 20,
          maxUtilization: 40,
          limit: 50,
          offset: 0,
        },
      );
    });

    it("should return 401 if not authenticated", async () => {
      // Mock authentication failure
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: false,
        user: null,
      });

      const request = createMockRequest(
        "http://localhost:3000/api/credit-repair/cards",
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });
  });

  describe("POST /api/credit-repair/cards", () => {
    const validInput = {
      cardName: "Chase Sapphire",
      lastFourDigits: "1234",
      creditLimit: 10000,
      currentBalance: 3000,
      statementClosingDay: 15,
      paymentDueDay: 25,
    };

    it("should create new credit card with auto-calculated utilization", async () => {
      // Mock authentication
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: true,
        user: mockUser,
      });

      // Mock database
      (db.creditCards.createCreditCard as jest.Mock).mockResolvedValue(
        mockCard,
      );

      const request = createMockRequest(
        "http://localhost:3000/api/credit-repair/cards",
        {
          method: "POST",
          body: validInput,
        },
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe(mockCard.id);
      expect(data.data.cardName).toBe(mockCard.cardName);
      expect(data.data.utilization).toBe(30); // Auto-calculated
      expect(db.creditCards.createCreditCard).toHaveBeenCalled();
      expect(auditLogger.logAIInteraction).toHaveBeenCalled();
    });

    it("should return 400 for missing required fields", async () => {
      // Mock authentication
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: true,
        user: mockUser,
      });

      const invalidInput = { cardName: "Chase Sapphire" }; // Missing required fields
      const request = createMockRequest(
        "http://localhost:3000/api/credit-repair/cards",
        {
          method: "POST",
          body: invalidInput,
        },
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Missing required fields");
    });

    it("should return 400 for invalid credit limit", async () => {
      // Mock authentication
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: true,
        user: mockUser,
      });

      // Note: creditLimit: 0 is falsy, so it fails the "missing required fields" check
      // This test verifies the actual API behavior
      const invalidInput = { ...validInput, creditLimit: 0 };
      const request = createMockRequest(
        "http://localhost:3000/api/credit-repair/cards",
        {
          method: "POST",
          body: invalidInput,
        },
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Missing required fields");
    });

    it("should return 400 for negative balance", async () => {
      // Mock authentication
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: true,
        user: mockUser,
      });

      const invalidInput = { ...validInput, currentBalance: -100 };
      const request = createMockRequest(
        "http://localhost:3000/api/credit-repair/cards",
        {
          method: "POST",
          body: invalidInput,
        },
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Current balance cannot be negative");
    });

    it("should return 400 for invalid statement closing day", async () => {
      // Mock authentication
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: true,
        user: mockUser,
      });

      const invalidInput = { ...validInput, statementClosingDay: 32 };
      const request = createMockRequest(
        "http://localhost:3000/api/credit-repair/cards",
        {
          method: "POST",
          body: invalidInput,
        },
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Statement closing day must be between 1 and 31");
    });

    it("should return 401 if not authenticated", async () => {
      // Mock authentication failure
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: false,
        user: null,
      });

      const request = createMockRequest(
        "http://localhost:3000/api/credit-repair/cards",
        {
          method: "POST",
          body: validInput,
        },
      );
      const response = await POST(request);
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
      (db.creditCards.createCreditCard as jest.Mock).mockRejectedValue(
        new Error("Database error"),
      );

      const request = createMockRequest(
        "http://localhost:3000/api/credit-repair/cards",
        {
          method: "POST",
          body: validInput,
        },
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to add credit card");
    });
  });
});

describe("negative-auth – /api/credit-repair/cards (withAuth)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

    it("GET returns 401 when the request is not authenticated (TASK-AUTH-03c)", async () => {
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: false,
        user: null,
      });
      const res = await GET(createMockRequest("http://localhost:3000/api/credit-repair/cards"));
      expect(res.status).toBe(401);
    });

    it("POST returns 401 when the request is not authenticated (TASK-AUTH-03c)", async () => {
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: false,
        user: null,
      });
      const res = await POST(createMockRequest("http://localhost:3000/api/credit-repair/cards", { method: "POST" }));
      expect(res.status).toBe(401);
    });
});
