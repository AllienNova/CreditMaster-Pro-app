/**
 * Tests for /api/financial/budgets/rollover
 *
 * Coverage:
 * - GET endpoint (rollover summary)
 * - POST endpoint (process rollovers)
 * - PATCH endpoint (adjust rollover amount)
 * - Authentication, Validation, Error handling
 * NOTE: This route uses JWT only (NO RBAC)
 */

import { NextRequest } from "next/server";

jest.mock("@/lib/auth/jwt-validation");
jest.mock("@/lib/financial/budget-service");

import { GET, POST, PATCH } from "../route";
import { jwtValidation } from "@/lib/auth/jwt-validation";
import { budgetService } from "@/lib/financial/budget-service";

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

const mockRolloverSummary = {
  totalRollover: 250.5,
  budgets: [
    { budgetId: "b-1", category: "groceries", rollover: 50.0 },
    { budgetId: "b-2", category: "dining", rollover: 200.5 },
  ],
};

const mockProcessResult = {
  processed: 3,
  totalRollover: 320.75,
};

const mockAdjustedBudget = {
  id: "b-1",
  category: "groceries",
  rolloverAmount: 75.0,
};

describe("GET /api/financial/budgets/rollover", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({ valid: true, user: mockUser });
    (budgetService.getRolloverSummary as jest.Mock).mockResolvedValue(mockRolloverSummary);
  });

  it("should return rollover summary for authenticated user", async () => {
    const req = createMockRequest("http://localhost:3000/api/financial/budgets/rollover");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toEqual(mockRolloverSummary);
    expect(budgetService.getRolloverSummary).toHaveBeenCalledWith("user-123");
  });

  it("should return 401 for unauthenticated request", async () => {
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({ valid: false, user: null });
    const req = createMockRequest("http://localhost:3000/api/financial/budgets/rollover");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 500 on service error", async () => {
    (budgetService.getRolloverSummary as jest.Mock).mockRejectedValue(new Error("DB error"));
    const req = createMockRequest("http://localhost:3000/api/financial/budgets/rollover");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.message).toBe("Failed to fetch rollover summary");
  });
});

describe("POST /api/financial/budgets/rollover", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({ valid: true, user: mockUser });
    (budgetService.processRolloversForUser as jest.Mock).mockResolvedValue(mockProcessResult);
  });

  it("should process rollovers successfully", async () => {
    const req = createMockRequest("http://localhost:3000/api/financial/budgets/rollover", {
      method: "POST",
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.processed).toBe(3);
    expect(data.data.totalRollover).toBe(320.75);
    expect(data.data.message).toContain("Processed 3 budget(s)");
    expect(budgetService.processRolloversForUser).toHaveBeenCalledWith("user-123");
  });

  it("should return appropriate message when no budgets need rollover", async () => {
    (budgetService.processRolloversForUser as jest.Mock).mockResolvedValue({
      processed: 0,
      totalRollover: 0,
    });
    const req = createMockRequest("http://localhost:3000/api/financial/budgets/rollover", {
      method: "POST",
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.message).toBe("No budgets needed rollover processing");
  });

  it("should return 401 for unauthenticated request", async () => {
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({ valid: false, user: null });
    const req = createMockRequest("http://localhost:3000/api/financial/budgets/rollover", {
      method: "POST",
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 500 on service error", async () => {
    (budgetService.processRolloversForUser as jest.Mock).mockRejectedValue(new Error("DB error"));
    const req = createMockRequest("http://localhost:3000/api/financial/budgets/rollover", {
      method: "POST",
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.message).toBe("Failed to process rollovers");
  });
});

describe("PATCH /api/financial/budgets/rollover", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({ valid: true, user: mockUser });
    (budgetService.adjustRolloverAmount as jest.Mock).mockResolvedValue(mockAdjustedBudget);
  });

  it("should adjust rollover amount successfully", async () => {
    const req = createMockRequest("http://localhost:3000/api/financial/budgets/rollover", {
      method: "PATCH",
      body: { budgetId: "b-1", rolloverAmount: 75.0 },
    });
    const res = await PATCH(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toEqual(mockAdjustedBudget);
    expect(budgetService.adjustRolloverAmount).toHaveBeenCalledWith("b-1", "user-123", 75.0);
  });

  it("should return 400 for missing budgetId", async () => {
    const req = createMockRequest("http://localhost:3000/api/financial/budgets/rollover", {
      method: "PATCH",
      body: { rolloverAmount: 75.0 },
    });
    const res = await PATCH(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.message).toBe("budgetId is required");
  });

  it("should return 400 for negative rolloverAmount", async () => {
    const req = createMockRequest("http://localhost:3000/api/financial/budgets/rollover", {
      method: "PATCH",
      body: { budgetId: "b-1", rolloverAmount: -10 },
    });
    const res = await PATCH(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.message).toBe("rolloverAmount must be a non-negative number");
  });

  it("should return 400 for non-number rolloverAmount", async () => {
    const req = createMockRequest("http://localhost:3000/api/financial/budgets/rollover", {
      method: "PATCH",
      body: { budgetId: "b-1", rolloverAmount: "abc" },
    });
    const res = await PATCH(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.message).toBe("rolloverAmount must be a non-negative number");
  });

  it("should return 401 for unauthenticated request", async () => {
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({ valid: false, user: null });
    const req = createMockRequest("http://localhost:3000/api/financial/budgets/rollover", {
      method: "PATCH",
      body: { budgetId: "b-1", rolloverAmount: 75.0 },
    });
    const res = await PATCH(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 500 on service error with error message", async () => {
    (budgetService.adjustRolloverAmount as jest.Mock).mockRejectedValue(new Error("Budget not found"));
    const req = createMockRequest("http://localhost:3000/api/financial/budgets/rollover", {
      method: "PATCH",
      body: { budgetId: "b-1", rolloverAmount: 75.0 },
    });
    const res = await PATCH(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.message).toBe("Budget not found");
  });
});
