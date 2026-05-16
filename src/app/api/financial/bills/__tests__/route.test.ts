/**
 * Tests for /api/financial/bills
 *
 * Coverage:
 * - GET endpoint (list bills)
 * - POST endpoint (create bill)
 * - Authentication, Authorization, Validation, Error handling
 */

import { NextRequest } from "next/server";

jest.mock("@/lib/auth/jwt-validation");
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: jest.fn().mockResolvedValue("user"),
}));
jest.mock("@/lib/auth/rbac");
jest.mock("@/lib/financial/bill-detection-service");

import { GET, POST } from "../route";
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

describe("GET /api/financial/bills", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({ valid: true, user: mockUser });
    (rbac.hasPermission as jest.Mock).mockReturnValue(true);
    (billDetectionService.getBillsByUser as jest.Mock).mockResolvedValue([mockBill]);
  });

  it("should return bills for authenticated user", async () => {
    const req = createMockRequest("http://localhost:3000/api/financial/bills");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.bills).toHaveLength(1);
    expect(data.bills[0].id).toBe("bill-1");
    expect(billDetectionService.getBillsByUser).toHaveBeenCalledWith("user-123", {
      activeOnly: false,
      category: undefined,
    });
  });

  it("should filter by activeOnly query parameter", async () => {
    (billDetectionService.getBillsByUser as jest.Mock).mockResolvedValue([]);
    const req = createMockRequest("http://localhost:3000/api/financial/bills?activeOnly=true");
    await GET(req);

    expect(billDetectionService.getBillsByUser).toHaveBeenCalledWith("user-123", {
      activeOnly: true,
      category: undefined,
    });
  });

  it("should filter by category query parameter", async () => {
    (billDetectionService.getBillsByUser as jest.Mock).mockResolvedValue([]);
    const req = createMockRequest("http://localhost:3000/api/financial/bills?category=utilities");
    await GET(req);

    expect(billDetectionService.getBillsByUser).toHaveBeenCalledWith("user-123", {
      activeOnly: false,
      category: "utilities",
    });
  });

  it("should return 401 for unauthenticated request", async () => {
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({ valid: false, user: null });
    const req = createMockRequest("http://localhost:3000/api/financial/bills");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 403 for user without permission", async () => {
    (rbac.hasPermission as jest.Mock).mockReturnValue(false);
    const req = createMockRequest("http://localhost:3000/api/financial/bills");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toBe("Forbidden");
  });

  it("should return 500 on service error", async () => {
    (billDetectionService.getBillsByUser as jest.Mock).mockRejectedValue(new Error("DB error"));
    const req = createMockRequest("http://localhost:3000/api/financial/bills");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe("Failed to fetch bills");
  });
});

describe("POST /api/financial/bills", () => {
  const validBody = {
    merchantName: "Netflix",
    category: "subscription",
    amount: "15.99",
    frequency: "monthly",
    nextDueDate: "2026-03-01",
    isAutoPay: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({ valid: true, user: mockUser });
    (rbac.hasPermission as jest.Mock).mockReturnValue(true);
    (billDetectionService.createBill as jest.Mock).mockResolvedValue(mockBill);
  });

  it("should create a bill successfully", async () => {
    const req = createMockRequest("http://localhost:3000/api/financial/bills", {
      method: "POST",
      body: validBody,
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.bill).toBeDefined();
    expect(billDetectionService.createBill).toHaveBeenCalledWith(
      "user-123",
      expect.objectContaining({
        merchantName: "Netflix",
        category: "subscription",
        amount: 15.99,
        frequency: "monthly",
        isAutoPay: true,
      }),
    );
  });

  it("should return 400 for missing required fields", async () => {
    const req = createMockRequest("http://localhost:3000/api/financial/bills", {
      method: "POST",
      body: { merchantName: "Netflix" },
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Missing required fields");
  });

  it("should return 400 for invalid amount", async () => {
    const req = createMockRequest("http://localhost:3000/api/financial/bills", {
      method: "POST",
      body: { ...validBody, amount: "abc" },
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Invalid amount");
  });

  it("should return 400 for negative amount", async () => {
    const req = createMockRequest("http://localhost:3000/api/financial/bills", {
      method: "POST",
      body: { ...validBody, amount: "-10" },
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Invalid amount");
  });

  it("should return 400 for invalid due date", async () => {
    const req = createMockRequest("http://localhost:3000/api/financial/bills", {
      method: "POST",
      body: { ...validBody, nextDueDate: "not-a-date" },
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Invalid due date");
  });

  it("should return 401 for unauthenticated request", async () => {
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({ valid: false, user: null });
    const req = createMockRequest("http://localhost:3000/api/financial/bills", {
      method: "POST",
      body: validBody,
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 403 for user without permission", async () => {
    (rbac.hasPermission as jest.Mock).mockReturnValue(false);
    const req = createMockRequest("http://localhost:3000/api/financial/bills", {
      method: "POST",
      body: validBody,
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toBe("Forbidden");
  });

  it("should return 500 on service error", async () => {
    (billDetectionService.createBill as jest.Mock).mockRejectedValue(new Error("DB error"));
    const req = createMockRequest("http://localhost:3000/api/financial/bills", {
      method: "POST",
      body: validBody,
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe("Failed to create bill");
  });
});

describe("negative-auth – /api/financial/bills", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("GET returns 401 when the request is not authenticated (TASK-AUTH-03c)", async () => {
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({ valid: false, user: null });
    const res = await GET(createMockRequest("http://localhost:3000/api/financial/bills"));
    expect(res.status).toBe(401);
  });

  it("POST returns 401 when the request is not authenticated (TASK-AUTH-03c)", async () => {
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({ valid: false, user: null });
    const res = await POST(createMockRequest("http://localhost:3000/api/financial/bills", { method: "POST" }));
    expect(res.status).toBe(401);
  });
});
