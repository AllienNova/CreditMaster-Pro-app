/**
 * Tests for /api/financial/bills/[id]
 *
 * Coverage:
 * - GET endpoint (get bill by ID)
 * - PATCH endpoint (update bill)
 * - DELETE endpoint (delete bill)
 */

import { NextRequest } from "next/server";

jest.mock("@/lib/auth/jwt-validation");
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: jest.fn().mockResolvedValue("user"),
}));
jest.mock("@/lib/auth/rbac");
jest.mock("@/lib/financial/bill-detection-service");

import { GET, PATCH, DELETE } from "../route";
import { jwtValidation } from "@/lib/auth/jwt-validation";
import { rbac } from "@/lib/auth/rbac";
import { billDetectionService } from "@/lib/financial/bill-detection-service";

const mockUser = { id: "user-123", email: "test@example.com", role: "premium" };

const mockBill = {
  id: "bill-1",
  userId: "user-123",
  merchantName: "Netflix",
  category: "subscription",
  amount: 15.99,
  frequency: "monthly",
  nextDueDate: new Date("2026-03-01"),
  isAutoPay: true,
  status: "active",
};

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

const mockParams = { params: Promise.resolve({ id: "bill-1" }) };

// ============================================================================
// GET /api/financial/bills/[id]
// ============================================================================

describe("GET /api/financial/bills/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({ valid: true, user: mockUser });
    (rbac.hasPermission as jest.Mock).mockReturnValue(true);
    (billDetectionService.getBillById as jest.Mock).mockResolvedValue(mockBill);
  });

  it("should return a bill by ID", async () => {
    const req = createMockRequest("http://localhost:3000/api/financial/bills/bill-1");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.bill.id).toBe("bill-1");
    expect(billDetectionService.getBillById).toHaveBeenCalledWith("bill-1", "user-123");
  });

  it("should return 404 when bill not found", async () => {
    (billDetectionService.getBillById as jest.Mock).mockResolvedValue(null);
    const req = createMockRequest("http://localhost:3000/api/financial/bills/bill-999");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe("Bill not found");
  });

  it("should return 401 for unauthenticated request", async () => {
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({ valid: false, user: null });
    const req = createMockRequest("http://localhost:3000/api/financial/bills/bill-1");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 403 for user without permission", async () => {
    (rbac.hasPermission as jest.Mock).mockReturnValue(false);
    const req = createMockRequest("http://localhost:3000/api/financial/bills/bill-1");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toBe("Forbidden");
  });

  it("should return 500 on service error", async () => {
    (billDetectionService.getBillById as jest.Mock).mockRejectedValue(new Error("DB error"));
    const req = createMockRequest("http://localhost:3000/api/financial/bills/bill-1");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe("Failed to fetch bill");
  });
});

// ============================================================================
// PATCH /api/financial/bills/[id]
// ============================================================================

describe("PATCH /api/financial/bills/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({ valid: true, user: mockUser });
    (rbac.hasPermission as jest.Mock).mockReturnValue(true);
    (billDetectionService.updateBill as jest.Mock).mockResolvedValue({ ...mockBill, amount: 19.99 });
  });

  it("should update a bill successfully", async () => {
    const req = createMockRequest("http://localhost:3000/api/financial/bills/bill-1", {
      method: "PATCH",
      body: { amount: "19.99", merchantName: "Netflix Premium" },
    });
    const res = await PATCH(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.bill).toBeDefined();
    expect(billDetectionService.updateBill).toHaveBeenCalledWith(
      "bill-1",
      "user-123",
      expect.objectContaining({ amount: 19.99, merchantName: "Netflix Premium" }),
    );
  });

  it("should return 400 for invalid amount", async () => {
    const req = createMockRequest("http://localhost:3000/api/financial/bills/bill-1", {
      method: "PATCH",
      body: { amount: "abc" },
    });
    const res = await PATCH(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Invalid amount");
  });

  it("should return 400 for negative amount", async () => {
    const req = createMockRequest("http://localhost:3000/api/financial/bills/bill-1", {
      method: "PATCH",
      body: { amount: "-5" },
    });
    const res = await PATCH(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Invalid amount");
  });

  it("should return 400 for invalid due date", async () => {
    const req = createMockRequest("http://localhost:3000/api/financial/bills/bill-1", {
      method: "PATCH",
      body: { nextDueDate: "not-a-date" },
    });
    const res = await PATCH(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Invalid due date");
  });

  it("should return 401 for unauthenticated request", async () => {
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({ valid: false, user: null });
    const req = createMockRequest("http://localhost:3000/api/financial/bills/bill-1", {
      method: "PATCH",
      body: { amount: "10" },
    });
    const res = await PATCH(req);
    expect(res.status).toBe(401);
  });

  it("should return 403 for user without permission", async () => {
    (rbac.hasPermission as jest.Mock).mockReturnValue(false);
    const req = createMockRequest("http://localhost:3000/api/financial/bills/bill-1", {
      method: "PATCH",
      body: { amount: "10" },
    });
    const res = await PATCH(req);
    expect(res.status).toBe(403);
  });

  it("should return 500 on service error", async () => {
    (billDetectionService.updateBill as jest.Mock).mockRejectedValue(new Error("DB error"));
    const req = createMockRequest("http://localhost:3000/api/financial/bills/bill-1", {
      method: "PATCH",
      body: { merchantName: "test" },
    });
    const res = await PATCH(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe("Failed to update bill");
  });
});

// ============================================================================
// DELETE /api/financial/bills/[id]
// ============================================================================

describe("DELETE /api/financial/bills/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({ valid: true, user: mockUser });
    (rbac.hasPermission as jest.Mock).mockReturnValue(true);
    (billDetectionService.deleteBill as jest.Mock).mockResolvedValue(undefined);
  });

  it("should delete a bill successfully", async () => {
    const req = createMockRequest("http://localhost:3000/api/financial/bills/bill-1", { method: "DELETE" });
    const res = await DELETE(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(billDetectionService.deleteBill).toHaveBeenCalledWith("bill-1", "user-123");
  });

  it("should return 401 for unauthenticated request", async () => {
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({ valid: false, user: null });
    const req = createMockRequest("http://localhost:3000/api/financial/bills/bill-1", { method: "DELETE" });
    const res = await DELETE(req);
    expect(res.status).toBe(401);
  });

  it("should return 403 for user without permission", async () => {
    (rbac.hasPermission as jest.Mock).mockReturnValue(false);
    const req = createMockRequest("http://localhost:3000/api/financial/bills/bill-1", { method: "DELETE" });
    const res = await DELETE(req);
    expect(res.status).toBe(403);
  });

  it("should return 500 on service error", async () => {
    (billDetectionService.deleteBill as jest.Mock).mockRejectedValue(new Error("DB error"));
    const req = createMockRequest("http://localhost:3000/api/financial/bills/bill-1", { method: "DELETE" });
    const res = await DELETE(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe("Failed to delete bill");
  });
});

describe("negative-auth – /api/financial/bills/bill-1", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("GET returns 401 when the request is not authenticated (TASK-AUTH-03c)", async () => {
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({ valid: false, user: null });
    const res = await GET(createMockRequest("http://localhost:3000/api/financial/bills/bill-1"));
    expect(res.status).toBe(401);
  });

  it("PATCH returns 401 when the request is not authenticated (TASK-AUTH-03c)", async () => {
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({ valid: false, user: null });
    const res = await PATCH(createMockRequest("http://localhost:3000/api/financial/bills/bill-1", { method: "PATCH" }));
    expect(res.status).toBe(401);
  });

  it("DELETE returns 401 when the request is not authenticated (TASK-AUTH-03c)", async () => {
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({ valid: false, user: null });
    const res = await DELETE(createMockRequest("http://localhost:3000/api/financial/bills/bill-1", { method: "DELETE" }));
    expect(res.status).toBe(401);
  });
});
