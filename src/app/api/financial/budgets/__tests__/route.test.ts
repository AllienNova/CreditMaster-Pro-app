/**
 * Tests for /api/financial/budgets
 *
 * Coverage:
 * - GET endpoint (list budgets)
 * - POST endpoint (create budget)
 * - Authentication
 * - Authorization (premium feature)
 * - Validation
 * - Error handling
 */

import { NextRequest } from "next/server";

// Mock dependencies BEFORE importing modules that use them
jest.mock("@/lib/auth/jwt-validation");
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: jest.fn().mockResolvedValue("premium"),
}));
jest.mock("@/lib/financial/budget-service");
jest.mock("@/lib/auth/rbac");

// Import after mocks are set up
import { GET, POST } from "../route";
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

describe("GET /api/financial/budgets", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return budgets for authenticated user", async () => {
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: true,
      user: mockUser,
    });
    (rbac.hasPermission as jest.Mock).mockReturnValue(true);
    (budgetService.getBudgetsByUser as jest.Mock).mockResolvedValue([
      mockBudget,
    ]);

    const request = createMockRequest(
      "http://localhost:3000/api/financial/budgets",
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(1);
    expect(data.count).toBe(1);
    expect(budgetService.getBudgetsByUser).toHaveBeenCalledWith("user-123", {
      activeOnly: false,
      category: undefined,
    });
  });

  it("should filter by activeOnly query parameter", async () => {
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: true,
      user: mockUser,
    });
    (rbac.hasPermission as jest.Mock).mockReturnValue(true);
    (budgetService.getBudgetsByUser as jest.Mock).mockResolvedValue([]);

    const request = createMockRequest(
      "http://localhost:3000/api/financial/budgets?activeOnly=true",
    );
    const response = await GET(request);

    expect(budgetService.getBudgetsByUser).toHaveBeenCalledWith("user-123", {
      activeOnly: true,
      category: undefined,
    });
  });

  it("should filter by category query parameter", async () => {
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: true,
      user: mockUser,
    });
    (rbac.hasPermission as jest.Mock).mockReturnValue(true);
    (budgetService.getBudgetsByUser as jest.Mock).mockResolvedValue([]);

    const request = createMockRequest(
      "http://localhost:3000/api/financial/budgets?category=groceries",
    );
    const response = await GET(request);

    expect(budgetService.getBudgetsByUser).toHaveBeenCalledWith("user-123", {
      activeOnly: false,
      category: "groceries",
    });
  });

  it("should return 401 for unauthenticated request", async () => {
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: false,
      user: null,
    });

    const request = createMockRequest(
      "http://localhost:3000/api/financial/budgets",
    );
    const response = await GET(request);
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
      "http://localhost:3000/api/financial/budgets",
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain("Forbidden");
  });

  it("should handle service errors", async () => {
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: true,
      user: mockUser,
    });
    (rbac.hasPermission as jest.Mock).mockReturnValue(true);
    (budgetService.getBudgetsByUser as jest.Mock).mockRejectedValue(
      new Error("Database error"),
    );

    const request = createMockRequest(
      "http://localhost:3000/api/financial/budgets",
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to fetch budgets");
    expect(data.message).toBe("Database error");
  });
});

describe("POST /api/financial/budgets", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should create budget successfully", async () => {
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: true,
      user: mockUser,
    });
    (rbac.hasPermission as jest.Mock).mockReturnValue(true);
    (budgetService.createBudget as jest.Mock).mockResolvedValue(mockBudget);

    const validInput = {
      name: "Groceries Budget",
      category: "groceries",
      budgetedAmount: 500,
      period: "monthly",
      rolloverEnabled: false,
      alertThreshold: 80,
    };

    const request = createMockRequest(
      "http://localhost:3000/api/financial/budgets",
      {
        method: "POST",
        body: validInput,
      },
    );
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.data.id).toBe(mockBudget.id);
    expect(data.message).toBe("Budget created successfully");
    expect(budgetService.createBudget).toHaveBeenCalledWith({
      userId: "user-123",
      ...validInput,
    });
  });

  it("should return 400 for missing required fields", async () => {
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: true,
      user: mockUser,
    });
    (rbac.hasPermission as jest.Mock).mockReturnValue(true);

    const invalidInput = {
      name: "Test Budget",
      // Missing category, budgetedAmount, period
    };

    const request = createMockRequest(
      "http://localhost:3000/api/financial/budgets",
      {
        method: "POST",
        body: invalidInput,
      },
    );
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Missing required fields");
    expect(data.required).toEqual([
      "name",
      "category",
      "budgetedAmount",
      "period",
    ]);
  });

  it("should return 400 for invalid category", async () => {
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: true,
      user: mockUser,
    });
    (rbac.hasPermission as jest.Mock).mockReturnValue(true);

    const invalidInput = {
      name: "Test Budget",
      category: "invalid_category",
      budgetedAmount: 500,
      period: "monthly",
    };

    const request = createMockRequest(
      "http://localhost:3000/api/financial/budgets",
      {
        method: "POST",
        body: invalidInput,
      },
    );
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid category");
    expect(data.validCategories).toBeDefined();
  });

  it("should return 400 for invalid period", async () => {
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: true,
      user: mockUser,
    });
    (rbac.hasPermission as jest.Mock).mockReturnValue(true);

    const invalidInput = {
      name: "Test Budget",
      category: "groceries",
      budgetedAmount: 500,
      period: "invalid_period",
    };

    const request = createMockRequest(
      "http://localhost:3000/api/financial/budgets",
      {
        method: "POST",
        body: invalidInput,
      },
    );
    const response = await POST(request);
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

    const invalidInput = {
      name: "Test Budget",
      category: "groceries",
      budgetedAmount: -100,
      period: "monthly",
    };

    const request = createMockRequest(
      "http://localhost:3000/api/financial/budgets",
      {
        method: "POST",
        body: invalidInput,
      },
    );
    const response = await POST(request);
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

    const invalidInput = {
      name: "Test Budget",
      category: "groceries",
      budgetedAmount: 500,
      period: "monthly",
      alertThreshold: 150,
    };

    const request = createMockRequest(
      "http://localhost:3000/api/financial/budgets",
      {
        method: "POST",
        body: invalidInput,
      },
    );
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Alert threshold must be between 0 and 100");
  });

  it("should return 401 for unauthenticated request", async () => {
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: false,
      user: null,
    });

    const request = createMockRequest(
      "http://localhost:3000/api/financial/budgets",
      {
        method: "POST",
        body: {},
      },
    );
    const response = await POST(request);
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
      "http://localhost:3000/api/financial/budgets",
      {
        method: "POST",
        body: {},
      },
    );
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain("Forbidden");
  });

  it("should handle service errors", async () => {
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: true,
      user: mockUser,
    });
    (rbac.hasPermission as jest.Mock).mockReturnValue(true);
    (budgetService.createBudget as jest.Mock).mockRejectedValue(
      new Error("Database error"),
    );

    const validInput = {
      name: "Test Budget",
      category: "groceries",
      budgetedAmount: 500,
      period: "monthly",
    };

    const request = createMockRequest(
      "http://localhost:3000/api/financial/budgets",
      {
        method: "POST",
        body: validInput,
      },
    );
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to create budget");
    expect(data.message).toBe("Database error");
  });
});
