/**
 * Tests for /api/financial/bills/negotiate/[id]
 *
 * Coverage:
 * - GET endpoint (get negotiation by ID)
 * - PATCH endpoint (update negotiation)
 * - POST endpoint (add attempt)
 * - Authentication, Validation, Error handling
 */

import { NextRequest } from "next/server";

jest.mock("@/lib/auth/jwt-validation");
jest.mock("@/lib/financial/bill-negotiation-service");

import { GET, PATCH, POST } from "../route";
import { jwtValidation } from "@/lib/auth/jwt-validation";
import { billNegotiationService } from "@/lib/financial/bill-negotiation-service";

const mockUser = { id: "user-123", email: "test@example.com", role: "premium" };

function createMockRequest(url: string, options?: { method?: string; body?: unknown }) {
  const parsedUrl = new URL(url);
  return {
    url,
    method: options?.method || "GET",
    json: jest.fn().mockResolvedValue(options?.body || {}),
    headers: new Headers(),
    nextUrl: parsedUrl,
  } as unknown as NextRequest;
}

const mockNegotiation = {
  id: "neg-1",
  billId: "bill-1",
  userId: "user-123",
  status: "in_progress",
  attempts: [],
};

const mockParams = { params: Promise.resolve({ id: "neg-1" }) };

// ============================================================================
// GET /api/financial/bills/negotiate/[id]
// ============================================================================

describe("GET /api/financial/bills/negotiate/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({ valid: true, user: mockUser });
    (billNegotiationService.getNegotiation as jest.Mock).mockResolvedValue(mockNegotiation);
  });

  it("should return a negotiation by ID", async () => {
    const req = createMockRequest("http://localhost:3000/api/financial/bills/negotiate/neg-1");
    const res = await GET(req, mockParams);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.negotiation.id).toBe("neg-1");
    expect(billNegotiationService.getNegotiation).toHaveBeenCalledWith("neg-1", "user-123");
  });

  it("should return 404 when negotiation not found", async () => {
    (billNegotiationService.getNegotiation as jest.Mock).mockResolvedValue(null);
    const req = createMockRequest("http://localhost:3000/api/financial/bills/negotiate/neg-999");
    const res = await GET(req, mockParams);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe("Negotiation not found");
  });

  it("should return 401 for unauthenticated request", async () => {
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({ valid: false, user: null });
    const req = createMockRequest("http://localhost:3000/api/financial/bills/negotiate/neg-1");
    const res = await GET(req, mockParams);
    expect(res.status).toBe(401);
  });

  it("should return 500 on service error", async () => {
    (billNegotiationService.getNegotiation as jest.Mock).mockRejectedValue(new Error("DB error"));
    const req = createMockRequest("http://localhost:3000/api/financial/bills/negotiate/neg-1");
    const res = await GET(req, mockParams);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe("Failed to get negotiation");
  });
});

// ============================================================================
// PATCH /api/financial/bills/negotiate/[id]
// ============================================================================

describe("PATCH /api/financial/bills/negotiate/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({ valid: true, user: mockUser });
    (billNegotiationService.updateNegotiation as jest.Mock).mockResolvedValue({
      ...mockNegotiation,
      status: "completed",
    });
  });

  it("should update a negotiation successfully", async () => {
    const req = createMockRequest("http://localhost:3000/api/financial/bills/negotiate/neg-1", {
      method: "PATCH",
      body: { status: "completed", outcome: "success", actualSavings: 30 },
    });
    const res = await PATCH(req, mockParams);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.negotiation).toBeDefined();
    expect(billNegotiationService.updateNegotiation).toHaveBeenCalledWith(
      "neg-1",
      "user-123",
      expect.objectContaining({ status: "completed", outcome: "success", actualSavings: 30 }),
    );
  });

  it("should return 401 for unauthenticated request", async () => {
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({ valid: false, user: null });
    const req = createMockRequest("http://localhost:3000/api/financial/bills/negotiate/neg-1", {
      method: "PATCH",
      body: { status: "completed" },
    });
    const res = await PATCH(req, mockParams);
    expect(res.status).toBe(401);
  });

  it("should return 500 on service error", async () => {
    (billNegotiationService.updateNegotiation as jest.Mock).mockRejectedValue(new Error("DB error"));
    const req = createMockRequest("http://localhost:3000/api/financial/bills/negotiate/neg-1", {
      method: "PATCH",
      body: { status: "completed" },
    });
    const res = await PATCH(req, mockParams);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe("Failed to update negotiation");
  });
});

// ============================================================================
// POST /api/financial/bills/negotiate/[id] (add attempt)
// ============================================================================

describe("POST /api/financial/bills/negotiate/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({ valid: true, user: mockUser });
    (billNegotiationService.addAttempt as jest.Mock).mockResolvedValue({
      ...mockNegotiation,
      attempts: [{ method: "phone", outcome: "success" }],
    });
  });

  it("should add an attempt successfully", async () => {
    const req = createMockRequest("http://localhost:3000/api/financial/bills/negotiate/neg-1", {
      method: "POST",
      body: { method: "phone", outcome: "success", offeredAmount: 69.99 },
    });
    const res = await POST(req, mockParams);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.negotiation).toBeDefined();
    expect(billNegotiationService.addAttempt).toHaveBeenCalledWith(
      "neg-1",
      "user-123",
      expect.objectContaining({ method: "phone", outcome: "success", offeredAmount: 69.99 }),
    );
  });

  it("should return 400 for missing required fields", async () => {
    const req = createMockRequest("http://localhost:3000/api/financial/bills/negotiate/neg-1", {
      method: "POST",
      body: { method: "phone" },
    });
    const res = await POST(req, mockParams);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("Missing required fields");
  });

  it("should return 401 for unauthenticated request", async () => {
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({ valid: false, user: null });
    const req = createMockRequest("http://localhost:3000/api/financial/bills/negotiate/neg-1", {
      method: "POST",
      body: { method: "phone", outcome: "success" },
    });
    const res = await POST(req, mockParams);
    expect(res.status).toBe(401);
  });

  it("should return 500 on service error", async () => {
    (billNegotiationService.addAttempt as jest.Mock).mockRejectedValue(new Error("DB error"));
    const req = createMockRequest("http://localhost:3000/api/financial/bills/negotiate/neg-1", {
      method: "POST",
      body: { method: "phone", outcome: "success" },
    });
    const res = await POST(req, mockParams);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe("Failed to add attempt");
  });
});
