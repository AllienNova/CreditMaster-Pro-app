/**
 * Tests for Individual Negotiation API Route
 *
 * Tests:
 * - GET /api/credit-repair/negotiate/[id]
 * - PUT /api/credit-repair/negotiate/[id]
 * - DELETE /api/credit-repair/negotiate/[id]
 */

import { NextRequest } from "next/server";

// Mock dependencies BEFORE importing modules that use them
jest.mock("@/lib/auth/jwt-validation");
jest.mock("@/lib/credit-repair/db", () => ({
  db: {
    negotiations: {
      getNegotiation: jest.fn(),
      updateNegotiation: jest.fn(),
      deleteNegotiation: jest.fn(),
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

describe("/api/credit-repair/negotiate/[id]", () => {
  const mockUser = {
    id: "user-123",
    email: "test@example.com",
    name: "Test User",
  };
  const mockNegotiation = {
    id: "negotiation-123",
    userId: "user-123",
    collectionId: "collection-123",
    collectionAgency: "Test Collections",
    currentBalance: 5000,
    targetSettlement: 40,
    status: "draft",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const mockParams = { params: Promise.resolve({ id: "negotiation-123" }) };

  beforeEach(() => {
    jest.clearAllMocks();
    (auditLogger.logAIInteraction as jest.Mock).mockResolvedValue(undefined);
  });

  describe("GET /api/credit-repair/negotiate/[id]", () => {
    beforeEach(() => {
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: true,
        user: mockUser,
      });
    });

    it("should return negotiation by ID", async () => {
      (db.negotiations.getNegotiation as jest.Mock).mockResolvedValue(
        mockNegotiation,
      );

      const request = createMockRequest(
        "http://localhost:3000/api/credit-repair/negotiate/negotiation-123",
      );
      const response = await GET(request, mockParams);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe(mockNegotiation.id);
      expect(db.negotiations.getNegotiation).toHaveBeenCalledWith(
        "negotiation-123",
        mockUser.id,
      );
    });

    it("should return 404 if negotiation not found", async () => {
      (db.negotiations.getNegotiation as jest.Mock).mockResolvedValue(null);

      const request = createMockRequest(
        "http://localhost:3000/api/credit-repair/negotiate/negotiation-123",
      );
      const response = await GET(request, mockParams);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Negotiation not found");
    });

    it("should return 401 if not authenticated", async () => {
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: false,
        user: null,
      });

      const request = createMockRequest(
        "http://localhost:3000/api/credit-repair/negotiate/negotiation-123",
      );
      const response = await GET(request, mockParams);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });
  });

  describe("PUT /api/credit-repair/negotiate/[id]", () => {
    beforeEach(() => {
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: true,
        user: mockUser,
      });
    });

    it("should update negotiation successfully", async () => {
      const updates = {
        status: "sent",
        sentAt: "2024-01-20",
      };

      const updatedNegotiation = { ...mockNegotiation, ...updates };
      (db.negotiations.updateNegotiation as jest.Mock).mockResolvedValue(
        updatedNegotiation,
      );

      const request = createMockRequest(
        "http://localhost:3000/api/credit-repair/negotiate/negotiation-123",
        {
          method: "PUT",
          body: updates,
        },
      );
      const response = await PUT(request, mockParams);
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
        "http://localhost:3000/api/credit-repair/negotiate/negotiation-123",
        {
          method: "PUT",
          body: invalidUpdates,
        },
      );
      const response = await PUT(request, mockParams);
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
        "http://localhost:3000/api/credit-repair/negotiate/negotiation-123",
        {
          method: "PUT",
          body: updates,
        },
      );
      const response = await PUT(request, mockParams);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 500 on database error", async () => {
      const updates = { status: "sent" };

      (db.negotiations.updateNegotiation as jest.Mock).mockRejectedValue(
        new Error("Database error"),
      );

      const request = createMockRequest(
        "http://localhost:3000/api/credit-repair/negotiate/negotiation-123",
        {
          method: "PUT",
          body: updates,
        },
      );
      const response = await PUT(request, mockParams);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to update negotiation");
    });
  });

  describe("DELETE /api/credit-repair/negotiate/[id]", () => {
    beforeEach(() => {
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: true,
        user: mockUser,
      });
    });

    it("should delete negotiation successfully", async () => {
      (db.negotiations.deleteNegotiation as jest.Mock).mockResolvedValue(true);

      const request = createMockRequest(
        "http://localhost:3000/api/credit-repair/negotiate/negotiation-123",
        {
          method: "DELETE",
        },
      );
      const response = await DELETE(request, mockParams);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe("Negotiation deleted successfully");
      expect(db.negotiations.deleteNegotiation).toHaveBeenCalledWith(
        "negotiation-123",
        mockUser.id,
      );
    });

    it("should return 404 if negotiation not found", async () => {
      (db.negotiations.deleteNegotiation as jest.Mock).mockResolvedValue(false);

      const request = createMockRequest(
        "http://localhost:3000/api/credit-repair/negotiate/negotiation-123",
        {
          method: "DELETE",
        },
      );
      const response = await DELETE(request, mockParams);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Negotiation not found");
    });

    it("should return 401 if not authenticated", async () => {
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: false,
        user: null,
      });

      const request = createMockRequest(
        "http://localhost:3000/api/credit-repair/negotiate/negotiation-123",
        {
          method: "DELETE",
        },
      );
      const response = await DELETE(request, mockParams);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });
  });
});
