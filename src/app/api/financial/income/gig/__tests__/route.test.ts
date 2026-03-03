/**
 * Tests for /api/financial/income/gig
 *
 * Coverage:
 * - GET endpoint (list gig income with filters)
 * - POST endpoint (add gig income entry)
 * - Supabase server auth (createClient pattern)
 * - Validation: required fields, type, amount
 * - Error handling
 */

import { NextRequest } from "next/server";

jest.mock("@/lib/supabase/server");
jest.mock("@/lib/financial/gig-income-service");

import { GET, POST } from "../route";
import { createClient } from "@/lib/supabase/server";
import { gigIncomeService } from "@/lib/financial/gig-income-service";

const mockUser = {
  id: "user-123",
  email: "test@example.com",
};

const mockSupabase = {
  auth: {
    getUser: jest.fn(),
  },
};

function createMockRequest(
  url: string,
  options?: { method?: string; body?: unknown },
) {
  const parsedUrl = new URL(url);
  return {
    url,
    method: options?.method || "GET",
    json: jest.fn().mockResolvedValue(options?.body || {}),
    headers: new Headers(),
    nextUrl: parsedUrl,
  } as unknown as NextRequest;
}

const mockIncome = [
  {
    id: "gi-1",
    userId: "user-123",
    platformId: "plat-1",
    amount: 150,
    date: "2026-01-15",
    type: "payment",
    description: "Airport ride",
  },
  {
    id: "gi-2",
    userId: "user-123",
    platformId: "plat-1",
    amount: 25,
    date: "2026-01-15",
    type: "tip",
  },
];

describe("GET /api/financial/income/gig", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });
    (gigIncomeService.getIncome as jest.Mock).mockResolvedValue(mockIncome);
  });

  it("should return gig income entries", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/income/gig",
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.income).toEqual(mockIncome);
    expect(gigIncomeService.getIncome).toHaveBeenCalledWith("user-123", {
      platformId: undefined,
      startDate: undefined,
      endDate: undefined,
      type: undefined,
    });
  });

  it("should pass filters to service", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/income/gig?platformId=plat-1&startDate=2026-01-01&endDate=2026-03-31&type=payment",
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(gigIncomeService.getIncome).toHaveBeenCalledWith("user-123", {
      platformId: "plat-1",
      startDate: "2026-01-01",
      endDate: "2026-03-31",
      type: "payment",
    });
  });

  it("should return 400 for invalid type filter", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/income/gig?type=invalid",
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Invalid type");
  });

  it("should return 401 for unauthenticated request", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Not authenticated" },
    });

    const request = createMockRequest(
      "http://localhost:3000/api/financial/income/gig",
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 500 on service error", async () => {
    (gigIncomeService.getIncome as jest.Mock).mockRejectedValue(
      new Error("DB error"),
    );

    const request = createMockRequest(
      "http://localhost:3000/api/financial/income/gig",
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to fetch gig income");
  });
});

describe("POST /api/financial/income/gig", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });
    (gigIncomeService.addIncome as jest.Mock).mockResolvedValue({
      id: "gi-new",
      userId: "user-123",
      platformId: "plat-1",
      amount: 200,
      date: "2026-02-01",
      type: "payment",
      description: "Delivery run",
    });
  });

  it("should create a new gig income entry", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/income/gig",
      {
        method: "POST",
        body: {
          platformId: "plat-1",
          amount: 200,
          date: "2026-02-01",
          type: "payment",
          description: "Delivery run",
        },
      },
    );
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.income).toBeDefined();
    expect(data.income.amount).toBe(200);
    expect(gigIncomeService.addIncome).toHaveBeenCalledWith(
      "user-123",
      expect.objectContaining({
        platformId: "plat-1",
        amount: 200,
        date: "2026-02-01",
        type: "payment",
        description: "Delivery run",
      }),
    );
  });

  it("should return 400 when missing required fields", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/income/gig",
      {
        method: "POST",
        body: { platformId: "plat-1" },
      },
    );
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Missing required fields");
  });

  it("should return 400 for invalid type", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/income/gig",
      {
        method: "POST",
        body: {
          platformId: "plat-1",
          amount: 100,
          date: "2026-02-01",
          type: "salary",
        },
      },
    );
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Invalid type");
  });

  it("should return 400 for non-number amount", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/income/gig",
      {
        method: "POST",
        body: {
          platformId: "plat-1",
          amount: "not-a-number",
          date: "2026-02-01",
          type: "payment",
        },
      },
    );
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Amount must be a number");
  });

  it("should return 400 for non-positive amount on non-refund", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/income/gig",
      {
        method: "POST",
        body: {
          platformId: "plat-1",
          amount: -50,
          date: "2026-02-01",
          type: "payment",
        },
      },
    );
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Amount must be positive");
  });

  it("should allow negative amount for refund type", async () => {
    (gigIncomeService.addIncome as jest.Mock).mockResolvedValue({
      id: "gi-refund",
      userId: "user-123",
      platformId: "plat-1",
      amount: -30,
      date: "2026-02-01",
      type: "refund",
    });

    const request = createMockRequest(
      "http://localhost:3000/api/financial/income/gig",
      {
        method: "POST",
        body: {
          platformId: "plat-1",
          amount: -30,
          date: "2026-02-01",
          type: "refund",
        },
      },
    );
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.income.type).toBe("refund");
  });

  it("should return 401 for unauthenticated request", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Not authenticated" },
    });

    const request = createMockRequest(
      "http://localhost:3000/api/financial/income/gig",
      {
        method: "POST",
        body: {
          platformId: "plat-1",
          amount: 100,
          date: "2026-02-01",
          type: "payment",
        },
      },
    );
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 500 on service error", async () => {
    (gigIncomeService.addIncome as jest.Mock).mockRejectedValue(
      new Error("Insert failed"),
    );

    const request = createMockRequest(
      "http://localhost:3000/api/financial/income/gig",
      {
        method: "POST",
        body: {
          platformId: "plat-1",
          amount: 100,
          date: "2026-02-01",
          type: "payment",
        },
      },
    );
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to add gig income");
  });
});
