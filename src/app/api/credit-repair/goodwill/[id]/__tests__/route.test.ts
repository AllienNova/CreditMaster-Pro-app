/**
 * Tests for Individual Goodwill Letter API Route
 *
 * Tests:
 * - GET /api/credit-repair/goodwill/[id]
 * - PUT /api/credit-repair/goodwill/[id]
 * - DELETE /api/credit-repair/goodwill/[id]
 */

import { NextRequest } from "next/server";

// Mock dependencies BEFORE importing modules that use them
jest.mock("@/lib/auth/jwt-validation");
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: jest.fn().mockResolvedValue("user"),
}));
jest.mock("@/lib/credit-repair/db", () => ({
  db: {
    goodwill: {
      getGoodwillLetter: jest.fn(),
      updateGoodwillLetter: jest.fn(),
      deleteGoodwillLetter: jest.fn(),
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

describe("/api/credit-repair/goodwill/[id]", () => {
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
  });

  describe("GET /api/credit-repair/goodwill/[id]", () => {
    beforeEach(() => {
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: true,
        user: mockUser,
      });
    });

    it("should return goodwill letter by ID", async () => {
      (db.goodwill.getGoodwillLetter as jest.Mock).mockResolvedValue(
        mockLetter,
      );

      const request = createMockRequest(
        "http://localhost:3000/api/credit-repair/goodwill/letter-123",
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe(mockLetter.id);
      expect(db.goodwill.getGoodwillLetter).toHaveBeenCalledWith(
        "letter-123",
        mockUser.id,
      );
    });

    it("should return 404 if letter not found", async () => {
      (db.goodwill.getGoodwillLetter as jest.Mock).mockResolvedValue(null);

      const request = createMockRequest(
        "http://localhost:3000/api/credit-repair/goodwill/letter-123",
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Goodwill letter not found");
    });

    it("should return 401 if not authenticated", async () => {
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: false,
        user: null,
      });

      const request = createMockRequest(
        "http://localhost:3000/api/credit-repair/goodwill/letter-123",
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });
  });

  describe("PUT /api/credit-repair/goodwill/[id]", () => {
    beforeEach(() => {
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: true,
        user: mockUser,
      });
    });

    it("should update goodwill letter successfully", async () => {
      const updates = {
        status: "sent",
        sentAt: "2024-01-20",
      };

      const updatedLetter = { ...mockLetter, ...updates };
      (db.goodwill.updateGoodwillLetter as jest.Mock).mockResolvedValue(
        updatedLetter,
      );

      const request = createMockRequest(
        "http://localhost:3000/api/credit-repair/goodwill/letter-123",
        {
          method: "PUT",
          body: updates,
        },
      );
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.status).toBe("sent");
    });

    it("should return 400 for invalid status", async () => {
      const invalidUpdates = {
        status: "invalid_status",
      };

      const request = createMockRequest(
        "http://localhost:3000/api/credit-repair/goodwill/letter-123",
        {
          method: "PUT",
          body: invalidUpdates,
        },
      );
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid status");
    });

    it("should return 401 if not authenticated", async () => {
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: false,
        user: null,
      });

      const updates = { status: "sent" };

      const request = createMockRequest(
        "http://localhost:3000/api/credit-repair/goodwill/letter-123",
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
      const updates = { status: "sent" };

      (db.goodwill.updateGoodwillLetter as jest.Mock).mockRejectedValue(
        new Error("Database error"),
      );

      const request = createMockRequest(
        "http://localhost:3000/api/credit-repair/goodwill/letter-123",
        {
          method: "PUT",
          body: updates,
        },
      );
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to update goodwill letter");
    });
  });

  describe("DELETE /api/credit-repair/goodwill/[id]", () => {
    beforeEach(() => {
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: true,
        user: mockUser,
      });
    });

    it("should delete goodwill letter successfully", async () => {
      (db.goodwill.deleteGoodwillLetter as jest.Mock).mockResolvedValue(true);

      const request = createMockRequest(
        "http://localhost:3000/api/credit-repair/goodwill/letter-123",
        {
          method: "DELETE",
        },
      );
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe("Goodwill letter deleted successfully");
      expect(db.goodwill.deleteGoodwillLetter).toHaveBeenCalledWith(
        "letter-123",
        mockUser.id,
      );
    });

    it("should return 404 if letter not found", async () => {
      (db.goodwill.deleteGoodwillLetter as jest.Mock).mockResolvedValue(false);

      const request = createMockRequest(
        "http://localhost:3000/api/credit-repair/goodwill/letter-123",
        {
          method: "DELETE",
        },
      );
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Goodwill letter not found");
    });

    it("should return 401 if not authenticated", async () => {
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: false,
        user: null,
      });

      const request = createMockRequest(
        "http://localhost:3000/api/credit-repair/goodwill/letter-123",
        {
          method: "DELETE",
        },
      );
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });
  });
});

describe("negative-auth – /api/credit-repair/goodwill/[id] (withAuth)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

    it("GET returns 401 when the request is not authenticated (TASK-AUTH-03c)", async () => {
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: false,
        user: null,
      });
      const res = await GET(createMockRequest("http://localhost:3000/api/credit-repair/goodwill/letter-123"));
      expect(res.status).toBe(401);
    });

    it("PUT returns 401 when the request is not authenticated (TASK-AUTH-03c)", async () => {
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: false,
        user: null,
      });
      const res = await PUT(createMockRequest("http://localhost:3000/api/credit-repair/goodwill/letter-123", { method: "PUT" }));
      expect(res.status).toBe(401);
    });

    it("DELETE returns 401 when the request is not authenticated (TASK-AUTH-03c)", async () => {
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: false,
        user: null,
      });
      const res = await DELETE(createMockRequest("http://localhost:3000/api/credit-repair/goodwill/letter-123", { method: "DELETE" }));
      expect(res.status).toBe(401);
    });
});
