/**
 * Tests for /api/financial/income/detect
 *
 * Coverage:
 * - POST endpoint (detect income from provided transactions)
 * - GET endpoint (detect income from stored transactions)
 * - Supabase server auth (createClient pattern)
 * - Transaction array validation
 * - Supabase query chain for GET
 * - camelCase/snake_case field mapping
 * - Empty transactions handling
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

import { POST, GET } from "../route";
import { createClient } from "@/lib/supabase/server";
import { incomeTrackingService } from "@/lib/financial/income-tracking-service";

const mockUser = {
  id: "user-123",
  email: "test@example.com",
};

// Build chainable query mock for GET endpoint
function createChainableQuery(data: unknown[] | null, error: unknown = null) {
  const chain = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue({ data, error }),
  };
  return chain;
}

const mockSupabase = {
  auth: {
    getUser: jest.fn(),
  },
  from: jest.fn(),
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

const mockPatterns = [
  { source: "Employer Inc", amount: 3500, frequency: "biweekly", confidence: 0.95 },
  { source: "Freelance", amount: 1200, frequency: "monthly", confidence: 0.8 },
];

describe("POST /api/financial/income/detect", () => {
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
    (incomeTrackingService.detectIncomeFromTransactions as jest.Mock).mockResolvedValue(
      mockPatterns,
    );
  });

  it("should detect income patterns from provided transactions", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/income/detect",
      {
        method: "POST",
        body: {
          transactions: [
            { id: "tx1", date: "2025-01-15", amount: 3500, merchantName: "Employer Inc" },
            { id: "tx2", date: "2025-01-01", amount: 1200, merchant_name: "Freelance" },
          ],
        },
      },
    );
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.patterns).toEqual(mockPatterns);
    expect(data.count).toBe(2);
    expect(incomeTrackingService.detectIncomeFromTransactions).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id: "tx1", amount: 3500, merchantName: "Employer Inc" }),
        expect.objectContaining({ id: "tx2", amount: 1200, merchantName: "Freelance" }),
      ]),
    );
  });

  it("should handle snake_case field names in transactions", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/income/detect",
      {
        method: "POST",
        body: {
          transactions: [
            { id: "tx1", date: "2025-01-15", amount: 3000, merchant_name: "Company", account_id: "acc-1" },
          ],
        },
      },
    );
    await POST(request);

    expect(incomeTrackingService.detectIncomeFromTransactions).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ merchantName: "Company", accountId: "acc-1" }),
      ]),
    );
  });

  it("should return 400 when transactions array is missing", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/income/detect",
      {
        method: "POST",
        body: {},
      },
    );
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Missing or invalid transactions array");
  });

  it("should return 400 when transactions is not an array", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/income/detect",
      {
        method: "POST",
        body: { transactions: "not-an-array" },
      },
    );
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Missing or invalid transactions array");
  });

  describe("negative-auth", () => {
    it("should return 401 for unauthenticated request", async () => {
      mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });

      const request = createMockRequest(
        "http://localhost:3000/api/financial/income/detect",
        {
          method: "POST",
          body: { transactions: [] },
        },
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });
  });

  it("should return 500 on service error", async () => {
    (incomeTrackingService.detectIncomeFromTransactions as jest.Mock).mockRejectedValue(
      new Error("Detection failed"),
    );

    const request = createMockRequest(
      "http://localhost:3000/api/financial/income/detect",
      {
        method: "POST",
        body: {
          transactions: [
            { id: "tx1", date: "2025-01-15", amount: 3500, merchantName: "Test" },
          ],
        },
      },
    );
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to detect income patterns");
  });
});

describe("GET /api/financial/income/detect", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateFromHeaders.mockResolvedValue({
      valid: true,
      user: { id: "user-123", email: "test@example.com" },
    });

    const queryChain = createChainableQuery([
      { id: "tx1", date: "2025-01-15", amount: 3500, merchant_name: "Employer", category: "income", account_id: "acc-1" },
      { id: "tx2", date: "2025-01-01", amount: 1200, merchant_name: "Freelance", category: null, account_id: null },
    ]);

    const supabaseWithChain = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
      },
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gt: jest.fn().mockReturnValue({
              gte: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  limit: queryChain.limit,
                }),
              }),
            }),
          }),
        }),
      }),
    };

    (createClient as jest.Mock).mockResolvedValue(supabaseWithChain);
    (incomeTrackingService.detectIncomeFromTransactions as jest.Mock).mockResolvedValue(
      mockPatterns,
    );
  });

  it("should detect income from stored transactions", async () => {
    const response = await GET(createMockRequest("http://localhost:3000/api/financial/income/detect"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.patterns).toEqual(mockPatterns);
    expect(data.count).toBe(2);
    expect(data.transactionsAnalyzed).toBe(2);
    expect(incomeTrackingService.detectIncomeFromTransactions).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id: "tx1", merchantName: "Employer" }),
        expect.objectContaining({ id: "tx2", merchantName: "Freelance" }),
      ]),
    );
  });

  it("should return empty patterns when no transactions found", async () => {
    const supabaseEmpty = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
      },
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gt: jest.fn().mockReturnValue({
              gte: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue({ data: [], error: null }),
                }),
              }),
            }),
          }),
        }),
      }),
    };
    (createClient as jest.Mock).mockResolvedValue(supabaseEmpty);

    const response = await GET(createMockRequest("http://localhost:3000/api/financial/income/detect"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.patterns).toEqual([]);
    expect(data.count).toBe(0);
    expect(data.message).toContain("No transactions found");
  });

  describe("negative-auth", () => {
    it("should return 401 for unauthenticated request", async () => {
      mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });

      const response = await GET(
        createMockRequest("http://localhost:3000/api/financial/income/detect"),
      );
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });
  });

  it("should return 500 when transaction query fails", async () => {
    const supabaseError = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
      },
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gt: jest.fn().mockReturnValue({
              gte: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue({
                    data: null,
                    error: { message: "Query failed" },
                  }),
                }),
              }),
            }),
          }),
        }),
      }),
    };
    (createClient as jest.Mock).mockResolvedValue(supabaseError);

    const response = await GET(createMockRequest("http://localhost:3000/api/financial/income/detect"));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to fetch transactions");
  });
});
