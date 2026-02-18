/**
 * Tests for /api/financial/budgets/[id]
 *
 * Coverage:
 * - GET endpoint (get single budget)
 * - PATCH endpoint (update budget)
 * - DELETE endpoint (delete budget)
 * - Authentication
 * - Authorization
 * - Validation
 * - Error handling
 */

import { NextRequest } from "next/server";

// Mock dependencies BEFORE importing modules that use them
jest.mock("@/lib/auth/jwt-validation");
jest.mock("@/lib/financial/budget-service");
jest.mock("@/lib/auth/rbac");

// Import after mocks are set up
import { GET, PATCH, DELETE } from "../route";
import { jwtValidation } from "@/lib/auth/jwt-validation";
import { budgetService } from "@/lib/financial/budget-service";
import { rbac } from "@/lib/auth/rbac";

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

const mockUser = {
  id: "user-123",
  email: "test@example.com",
  role: "premium",
};

const mockBudget = {
  id: "budget-123",
  userId: "user-123",
  name: "Groceries Budget",
  category: "groceries",
  budgetedAmount: 500,
  spentAmount: 350,
  period: "monthly",
  startDate: new Date("2024-01-01"),
  endDate: new Date("2024-01-31"),
  rolloverEnabled: false,
  alertThreshold: 80,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockParams = Promise.resolve({ id: "budget-123" });

describe("GET /api/financial/budgets/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return budget by ID", async () => {
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: true,
      user: mockUser,
    });
    (rbac.hasPermission as jest.Mock).mockReturnValue(true);
    (budgetService.getBudgetById as jest.Mock).mockResolvedValue(mockBudget);

    const request = createMockRequest(
      "http://localhost:3000/api/financial/budgets/budget-123",
    );
    const response = await GET(request, { params: mockParams });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.id).toBe("budget-123");
    expect(budgetService.getBudgetById).toHaveBeenCalledWith(
      "budget-123",
      "user-123",
    );
  });

  it("should return 404 for non-existent budget", async () => {
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: true,
      user: mockUser,
    });
    (rbac.hasPermission as jest.Mock).mockReturnValue(true);
    (budgetService.getBudgetById as jest.Mock).mockResolvedValue(null);

    const request = createMockRequest(
      "http://localhost:3000/api/financial/budgets/non-existent",
    );
    const response = await GET(request, {
      params: Promise.resolve({ id: "non-existent" }),
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Budget not found");
  });

  it("should return 401 for unauthenticated request", async () => {
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: false,
      user: null,
    });

    const request = createMockRequest(
      "http://localhost:3000/api/financial/budgets/budget-123",
    );
    const response = await GET(request, { params: mockParams });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 403 for user without permission", async () => {
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: true,
      user: mockUser,
    });
    (rbac.hasPermission as jest.Mock).mockReturnValue(false);

    const request = createMockRequest(
      "http://localhost:3000/api/financial/budgets/budget-123",
    );
    const response = await GET(request, { params: mockParams });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain("Forbidden");
  });
});

describe("PATCH /api/financial/budgets/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should update budget successfully", async () => {
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: true,
      user: mockUser,
    });
    (rbac.hasPermission as jest.Mock).mockReturnValue(true);
    (budgetService.updateBudget as jest.Mock).mockResolvedValue({
      ...mockBudget,
      name: "Updated Budget",
      budgetedAmount: 600,
    });

    const updates = {
      name: "Updated Budget",
      budgetedAmount: 600,
    };

    const request = createMockRequest(
      "http://localhost:3000/api/financial/budgets/budget-123",
      {
        method: "PATCH",
        body: updates,
      },
    );
    const response = await PATCH(request, { params: mockParams });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.name).toBe("Updated Budget");
    expect(data.message).toBe("Budget updated successfully");
    expect(budgetService.updateBudget).toHaveBeenCalledWith(
      "budget-123",
      "user-123",
      updates,
    );
  });

  it("should return 404 for non-existent budget", async () => {
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: true,
      user: mockUser,
    });
    (rbac.hasPermission as jest.Mock).mockReturnValue(true);
    (budgetService.updateBudget as jest.Mock).mockResolvedValue(null);

    const request = createMockRequest(
      "http://localhost:3000/api/financial/budgets/non-existent",
      {
        method: "PATCH",
        body: { name: "Updated" },
      },
    );
    const response = await PATCH(request, {
      params: Promise.resolve({ id: "non-existent" }),
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Budget not found");
  });

  it("should return 400 for invalid period", async () => {
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: true,
      user: mockUser,
    });
    (rbac.hasPermission as jest.Mock).mockReturnValue(true);

    const request = createMockRequest(
      "http://localhost:3000/api/financial/budgets/budget-123",
      {
        method: "PATCH",
        body: { period: "invalid_period" },
      },
    );
    const response = await PATCH(request, { params: mockParams });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid period");
  });

  it("should return 400 for invalid budgetedAmount", async () => {
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: true,
      user: mockUser,
    });
    (rbac.hasPermission as jest.Mock).mockReturnValue(true);

    const request = createMockRequest(
      "http://localhost:3000/api/financial/budgets/budget-123",
      {
        method: "PATCH",
        body: { budgetedAmount: -100 },
      },
    );
    const response = await PATCH(request, { params: mockParams });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Budget amount must be a positive number");
  });

  it("should return 400 for invalid alertThreshold", async () => {
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: true,
      user: mockUser,
    });
    (rbac.hasPermission as jest.Mock).mockReturnValue(true);

    const request = createMockRequest(
      "http://localhost:3000/api/financial/budgets/budget-123",
      {
        method: "PATCH",
        body: { alertThreshold: 150 },
      },
    );
    const response = await PATCH(request, { params: mockParams });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Alert threshold must be between 0 and 100");
  });
});

describe("DELETE /api/financial/budgets/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should delete budget successfully", async () => {
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: true,
      user: mockUser,
    });
    (rbac.hasPermission as jest.Mock).mockReturnValue(true);
    (budgetService.deleteBudget as jest.Mock).mockResolvedValue(true);

    const request = createMockRequest(
      "http://localhost:3000/api/financial/budgets/budget-123",
      {
        method: "DELETE",
      },
    );
    const response = await DELETE(request, { params: mockParams });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe("Budget deleted successfully");
    expect(budgetService.deleteBudget).toHaveBeenCalledWith(
      "budget-123",
      "user-123",
    );
  });

  it("should return 404 for non-existent budget", async () => {
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: true,
      user: mockUser,
    });
    (rbac.hasPermission as jest.Mock).mockReturnValue(true);
    (budgetService.deleteBudget as jest.Mock).mockResolvedValue(false);

    const request = createMockRequest(
      "http://localhost:3000/api/financial/budgets/non-existent",
      {
        method: "DELETE",
      },
    );
    const response = await DELETE(request, {
      params: Promise.resolve({ id: "non-existent" }),
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Budget not found");
  });

  it("should return 401 for unauthenticated request", async () => {
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: false,
      user: null,
    });

    const request = createMockRequest(
      "http://localhost:3000/api/financial/budgets/budget-123",
      {
        method: "DELETE",
      },
    );
    const response = await DELETE(request, { params: mockParams });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 403 for user without permission", async () => {
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: true,
      user: mockUser,
    });
    (rbac.hasPermission as jest.Mock).mockReturnValue(false);

    const request = createMockRequest(
      "http://localhost:3000/api/financial/budgets/budget-123",
      {
        method: "DELETE",
      },
    );
    const response = await DELETE(request, { params: mockParams });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain("Forbidden");
  });
});
