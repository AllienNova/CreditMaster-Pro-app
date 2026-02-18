/**
 * Tests for Goodwill Letter API Route
 *
 * Tests:
 * - GET /api/credit-repair/goodwill
 * - POST /api/credit-repair/goodwill
 */

import { NextRequest } from "next/server";

// Mock dependencies BEFORE importing modules that use them
jest.mock("@/lib/auth/jwt-validation");
jest.mock("@/lib/credit-repair/db", () => ({
  db: {
    goodwill: {
      getGoodwillLettersByUser: jest.fn(),
      getGoodwillLetterStats: jest.fn(),
      createGoodwillLetter: jest.fn(),
    },
  },
}));
jest.mock("@/lib/credit-repair", () => ({
  negotiationService: {
    generateGoodwillLetter: jest.fn(),
  },
}));
jest.mock("@/lib/security/audit-logging");

// Import after mocks are set up
import { GET, POST } from "../route";
import { jwtValidation } from "@/lib/auth/jwt-validation";
import { db } from "@/lib/credit-repair/db";
import { negotiationService } from "@/lib/credit-repair";
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

describe("/api/credit-repair/goodwill", () => {
  const mockUser = {
    id: "user-123",
    email: "test@example.com",
    name: "Test User",
  };
  const mockLetter = {
    id: "letter-123",
    userId: "user-123",
    accountId: "account-123",
    creditorName: "Test Bank",
    latePaymentDate: new Date("2024-01-15"),
    reason: "Medical emergency",
    letterContent: "Dear Test Bank...",
    status: "draft",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (auditLogger.logAIInteraction as jest.Mock).mockResolvedValue(undefined);
    (auditLogger.logSecurityEvent as jest.Mock).mockResolvedValue(undefined);
  });

  describe("GET /api/credit-repair/goodwill", () => {
    beforeEach(() => {
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: true,
        user: mockUser,
      });
    });

    it("should return all goodwill letters for user", async () => {
      // Mock database - route expects { letters, total }
      (db.goodwill.getGoodwillLettersByUser as jest.Mock).mockResolvedValue({
        letters: [mockLetter],
        total: 1,
      });
      (db.goodwill.getGoodwillLetterStats as jest.Mock).mockResolvedValue({
        total: 1,
        byStatus: { draft: 1 },
      });

      const request = createMockRequest(
        "http://localhost:3000/api/credit-repair/goodwill",
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.letters).toHaveLength(1);
      expect(data.data.stats).toBeDefined();
      expect(data.data.pagination).toBeDefined();
    });

    it("should filter letters by status", async () => {
      // Mock database - route expects { letters, total }
      (db.goodwill.getGoodwillLettersByUser as jest.Mock).mockResolvedValue({
        letters: [mockLetter],
        total: 1,
      });
      (db.goodwill.getGoodwillLetterStats as jest.Mock).mockResolvedValue({
        total: 1,
        byStatus: { draft: 1 },
      });

      const request = createMockRequest(
        "http://localhost:3000/api/credit-repair/goodwill?status=draft",
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(db.goodwill.getGoodwillLettersByUser).toHaveBeenCalledWith(
        mockUser.id,
        {
          status: "draft",
          limit: 50,
          offset: 0,
        },
      );
    });

    it("should return 401 if not authenticated", async () => {
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: false,
        user: null,
      });

      const request = createMockRequest(
        "http://localhost:3000/api/credit-repair/goodwill",
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 500 on database error", async () => {
      (db.goodwill.getGoodwillLettersByUser as jest.Mock).mockRejectedValue(
        new Error("Database error"),
      );

      const request = createMockRequest(
        "http://localhost:3000/api/credit-repair/goodwill",
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to get goodwill letters");
    });
  });

  describe("POST /api/credit-repair/goodwill", () => {
    beforeEach(() => {
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: true,
        user: mockUser,
      });
    });

    it("should create new goodwill letter with AI-generated content", async () => {
      const validInput = {
        accountId: "account-123",
        creditorName: "Test Bank",
        latePaymentDate: "2024-01-15",
        reason: "Medical emergency",
        generateLetter: true,
      };

      (
        negotiationService.generateGoodwillLetter as jest.Mock
      ).mockResolvedValue({
        letter: "Dear Test Bank...",
      });
      (db.goodwill.createGoodwillLetter as jest.Mock).mockResolvedValue(
        mockLetter,
      );

      const request = createMockRequest(
        "http://localhost:3000/api/credit-repair/goodwill",
        {
          method: "POST",
          body: validInput,
        },
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe(mockLetter.id);
      expect(negotiationService.generateGoodwillLetter).toHaveBeenCalled();
    });

    it("should create goodwill letter without generating content", async () => {
      const validInput = {
        accountId: "account-123",
        creditorName: "Test Bank",
        latePaymentDate: "2024-01-15",
        reason: "Medical emergency",
        generateLetter: false,
        letterContent: "Dear Test Bank, I am writing to request...", // Required when generateLetter is false
      };

      (db.goodwill.createGoodwillLetter as jest.Mock).mockResolvedValue(
        mockLetter,
      );

      const request = createMockRequest(
        "http://localhost:3000/api/credit-repair/goodwill",
        {
          method: "POST",
          body: validInput,
        },
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(negotiationService.generateGoodwillLetter).not.toHaveBeenCalled();
    });

    it("should return 400 for missing required fields", async () => {
      const invalidInput = {
        accountId: "account-123",
        // Missing creditorName, latePaymentDate, reason
      };

      const request = createMockRequest(
        "http://localhost:3000/api/credit-repair/goodwill",
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

    it("should return 401 if not authenticated", async () => {
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: false,
        user: null,
      });

      const validInput = {
        accountId: "account-123",
        creditorName: "Test Bank",
        latePaymentDate: "2024-01-15",
        reason: "Medical emergency",
      };

      const request = createMockRequest(
        "http://localhost:3000/api/credit-repair/goodwill",
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

    it("should return 500 on service error", async () => {
      const validInput = {
        accountId: "account-123",
        creditorName: "Test Bank",
        latePaymentDate: "2024-01-15",
        reason: "Medical emergency",
        generateLetter: true,
      };

      (
        negotiationService.generateGoodwillLetter as jest.Mock
      ).mockRejectedValue(new Error("Service error"));

      const request = createMockRequest(
        "http://localhost:3000/api/credit-repair/goodwill",
        {
          method: "POST",
          body: validInput,
        },
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to create goodwill letter");
    });
  });
});
