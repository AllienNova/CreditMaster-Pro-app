/**
 * Tests for /api/financial/income
 *
 * Coverage:
 * - GET endpoint (fetch income sources, stats, countdown)
 * - POST endpoint (create income source)
 * - PUT endpoint (update income source)
 * - DELETE endpoint (delete income source)
 * - Supabase server auth (createClient pattern)
 * - Validation: required fields, frequency, amount
 * - Error handling
 */

import { NextRequest } from "next/server";

const mockValidateFromHeaders = jest.fn();
jest.mock("@/lib/supabase/server");
jest.mock("@/lib/financial/income-tracking-service");

jest.mock("@/lib/auth/jwt-validation", () => ({
  jwtValidation: {
    validateFromHeaders: (...args: unknown[]) =>
      mockValidateFromHeaders(...args),
  },
}));
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: jest.fn().mockResolvedValue("premium"),
}));

import { GET, POST, PUT, DELETE } from "../route";
import { createClient } from "@/lib/supabase/server";
import { incomeTrackingService } from "@/lib/financial/income-tracking-service";

const mockUser = {
  id: "user-123",
  email: "test@example.com",
};

const mockSupabase = {
  auth: {
    getUser: jest.fn(),
  },
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

const mockSources = [
  { id: "src-1", name: "Salary", amount: 5000, frequency: "monthly" },
  { id: "src-2", name: "Freelance", amount: 1500, frequency: "biweekly" },
];

const mockStats = { totalMonthly: 6500, sourceCount: 2 };

const mockCountdown = { nextPayday: "2025-01-15", daysUntil: 5 };

describe("GET /api/financial/income", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateFromHeaders.mockResolvedValue({
      valid: true,
      user: { id: "user-123", email: "test@example.com" },
    });
    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });
    (incomeTrackingService.getIncomeSources as jest.Mock).mockResolvedValue(mockSources);
    (incomeTrackingService.getMonthlyIncomeStats as jest.Mock).mockResolvedValue(mockStats);
    (incomeTrackingService.getPaydayCountdown as jest.Mock).mockResolvedValue(mockCountdown);
  });

  it("should return income sources, stats, and countdown", async () => {
    const response = await GET(createMockRequest("http://localhost:3000/api/financial/income"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.sources).toEqual(mockSources);
    expect(data.stats).toEqual(mockStats);
    expect(data.countdown).toEqual(mockCountdown);
    expect(incomeTrackingService.getIncomeSources).toHaveBeenCalledWith("user-123");
    expect(incomeTrackingService.getMonthlyIncomeStats).toHaveBeenCalledWith("user-123");
    expect(incomeTrackingService.getPaydayCountdown).toHaveBeenCalledWith("user-123");
  });

  describe("negative-auth", () => {
    it("should return 401 for unauthenticated request", async () => {
      mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });

      const response = await GET(createMockRequest("http://localhost:3000/api/financial/income"));
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });
  });

  it("should return 500 on service error", async () => {
    (incomeTrackingService.getIncomeSources as jest.Mock).mockRejectedValue(
      new Error("DB error"),
    );

    const response = await GET(createMockRequest("http://localhost:3000/api/financial/income"));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to fetch income sources");
  });
});

describe("POST /api/financial/income", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateFromHeaders.mockResolvedValue({
      valid: true,
      user: { id: "user-123", email: "test@example.com" },
    });
    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });
    (incomeTrackingService.createIncomeSource as jest.Mock).mockResolvedValue({
      id: "src-new",
      name: "Side Gig",
      amount: 2000,
      frequency: "monthly",
    });
  });

  it("should create a new income source", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/income",
      {
        method: "POST",
        body: {
          name: "Side Gig",
          amount: 2000,
          frequency: "monthly",
          nextPayDate: "2025-02-01",
        },
      },
    );
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.source).toBeDefined();
    expect(data.source.name).toBe("Side Gig");
    expect(incomeTrackingService.createIncomeSource).toHaveBeenCalledWith(
      "user-123",
      expect.objectContaining({
        name: "Side Gig",
        amount: 2000,
        frequency: "monthly",
        isAutoDetected: false,
      }),
    );
  });

  it("should return 400 when missing required fields", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/income",
      {
        method: "POST",
        body: { name: "Partial" },
      },
    );
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Missing required fields");
  });

  it("should return 400 for invalid frequency", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/income",
      {
        method: "POST",
        body: {
          name: "Job",
          amount: 3000,
          frequency: "daily",
          nextPayDate: "2025-02-01",
        },
      },
    );
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Invalid frequency");
  });

  it("should return 400 for invalid amount", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/income",
      {
        method: "POST",
        body: {
          name: "Job",
          amount: -100,
          frequency: "monthly",
          nextPayDate: "2025-02-01",
        },
      },
    );
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Amount must be a positive number");
  });

  describe("negative-auth", () => {
    it("should return 401 for unauthenticated request", async () => {
      mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });

      const request = createMockRequest(
        "http://localhost:3000/api/financial/income",
        {
          method: "POST",
          body: {
            name: "Job",
            amount: 3000,
            frequency: "monthly",
            nextPayDate: "2025-02-01",
          },
        },
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });
  });

  it("should return 500 on service error", async () => {
    (incomeTrackingService.createIncomeSource as jest.Mock).mockRejectedValue(
      new Error("Create failed"),
    );

    const request = createMockRequest(
      "http://localhost:3000/api/financial/income",
      {
        method: "POST",
        body: {
          name: "Job",
          amount: 3000,
          frequency: "monthly",
          nextPayDate: "2025-02-01",
        },
      },
    );
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to create income source");
  });
});

describe("PUT /api/financial/income", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateFromHeaders.mockResolvedValue({
      valid: true,
      user: { id: "user-123", email: "test@example.com" },
    });
    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });
    (incomeTrackingService.updateIncomeSource as jest.Mock).mockResolvedValue({
      id: "src-1",
      name: "Updated Salary",
      amount: 5500,
      frequency: "monthly",
    });
  });

  it("should update an income source", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/income",
      {
        method: "PUT",
        body: {
          id: "src-1",
          name: "Updated Salary",
          amount: 5500,
        },
      },
    );
    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.source).toBeDefined();
    expect(incomeTrackingService.updateIncomeSource).toHaveBeenCalledWith(
      "user-123",
      "src-1",
      expect.objectContaining({
        name: "Updated Salary",
        amount: 5500,
      }),
    );
  });

  it("should return 400 when missing id", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/income",
      {
        method: "PUT",
        body: { name: "No ID" },
      },
    );
    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Missing required field: id");
  });

  it("should return 400 for invalid frequency in update", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/income",
      {
        method: "PUT",
        body: { id: "src-1", frequency: "daily" },
      },
    );
    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Invalid frequency");
  });

  it("should return 400 for invalid amount in update", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/income",
      {
        method: "PUT",
        body: { id: "src-1", amount: -50 },
      },
    );
    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Amount must be a positive number");
  });

  describe("negative-auth", () => {
    it("should return 401 for unauthenticated request", async () => {
      mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });

      const request = createMockRequest(
        "http://localhost:3000/api/financial/income",
        {
          method: "PUT",
          body: { id: "src-1", name: "Test" },
        },
      );
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });
  });

  it("should return 500 on service error", async () => {
    (incomeTrackingService.updateIncomeSource as jest.Mock).mockRejectedValue(
      new Error("Update failed"),
    );

    const request = createMockRequest(
      "http://localhost:3000/api/financial/income",
      {
        method: "PUT",
        body: { id: "src-1", name: "Test" },
      },
    );
    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to update income source");
  });
});

describe("DELETE /api/financial/income", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateFromHeaders.mockResolvedValue({
      valid: true,
      user: { id: "user-123", email: "test@example.com" },
    });
    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });
    (incomeTrackingService.deleteIncomeSource as jest.Mock).mockResolvedValue(true);
  });

  it("should delete an income source", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/income?id=src-1",
    );
    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(incomeTrackingService.deleteIncomeSource).toHaveBeenCalledWith(
      "user-123",
      "src-1",
    );
  });

  it("should return 400 when missing id parameter", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/income",
    );
    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Missing required parameter: id");
  });

  describe("negative-auth", () => {
    it("should return 401 for unauthenticated request", async () => {
      mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });

      const request = createMockRequest(
        "http://localhost:3000/api/financial/income?id=src-1",
      );
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });
  });

  it("should return 500 on service error", async () => {
    (incomeTrackingService.deleteIncomeSource as jest.Mock).mockRejectedValue(
      new Error("Delete failed"),
    );

    const request = createMockRequest(
      "http://localhost:3000/api/financial/income?id=src-1",
    );
    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to delete income source");
  });
});
