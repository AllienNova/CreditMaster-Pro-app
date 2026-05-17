/**
 * Tests for /api/financial/plaid/investments
 *
 * Covers GET (holdings) and POST (investment transactions) handlers.
 */

import { NextRequest } from "next/server";

jest.mock("@/lib/auth/jwt-validation");
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: jest.fn().mockResolvedValue("premium"),
}));
jest.mock("@/lib/auth/rbac");
jest.mock("@/lib/financial/plaid-investments-service");

import { GET, POST } from "../route";
import { jwtValidation } from "@/lib/auth/jwt-validation";
import { rbac } from "@/lib/auth/rbac";
import { plaidInvestmentsService } from "@/lib/financial/plaid-investments-service";

const mockUser = {
  id: "user-123",
  email: "test@example.com",
  role: "premium",
};

function createMockGetRequest(url: string): NextRequest {
  const parsedUrl = new URL(url);
  return {
    url,
    method: "GET",
    headers: new Headers(),
    nextUrl: parsedUrl,
  } as unknown as NextRequest;
}

function createMockPostRequest(
  url: string,
  body: Record<string, unknown>,
): NextRequest {
  const parsedUrl = new URL(url);
  return {
    url,
    method: "POST",
    headers: new Headers(),
    nextUrl: parsedUrl,
    json: jest.fn().mockResolvedValue(body),
  } as unknown as NextRequest;
}

const mockHoldingsResult = {
  holdings: [
    {
      accountId: "acc-1",
      securityId: "sec-1",
      institutionPrice: 150.25,
      institutionPriceAsOf: "2026-01-15",
      institutionValue: 1502.5,
      costBasis: 1200.0,
      quantity: 10,
      currency: "USD",
      vestedQuantity: 10,
      vestedValue: 1502.5,
    },
  ],
  securities: [
    {
      securityId: "sec-1",
      isin: "US0378331005",
      cusip: "037833100",
      name: "Apple Inc",
      tickerSymbol: "AAPL",
      isCashEquivalent: false,
      type: "equity",
      closePrice: 150.0,
      closePriceAsOf: "2026-01-14",
      currency: "USD",
      sector: "Technology",
      industry: "Consumer Electronics",
    },
  ],
};

const mockTransactionsResult = {
  investmentTransactions: [
    {
      investmentTransactionId: "inv-tx-1",
      accountId: "acc-1",
      securityId: "sec-1",
      date: "2026-01-10",
      name: "Buy AAPL",
      quantity: 5,
      amount: 750.0,
      price: 150.0,
      fees: 4.95,
      type: "buy",
      subtype: "buy",
      currency: "USD",
    },
  ],
  totalInvestmentTransactions: 1,
  securities: [
    {
      securityId: "sec-1",
      isin: "US0378331005",
      cusip: "037833100",
      name: "Apple Inc",
      tickerSymbol: "AAPL",
      isCashEquivalent: false,
      type: "equity",
      closePrice: 150.0,
      closePriceAsOf: "2026-01-14",
      currency: "USD",
      sector: "Technology",
      industry: "Consumer Electronics",
    },
  ],
};

describe("GET /api/financial/plaid/investments", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (rbac.hasPermission as jest.Mock).mockReturnValue(true);
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: true,
      user: mockUser,
    });
    (rbac.hasPermission as jest.Mock).mockReturnValue(true);
    (plaidInvestmentsService.getHoldings as jest.Mock).mockResolvedValue(
      mockHoldingsResult,
    );
  });

  describe("negative-auth", () => {
    it("should return 401 for unauthenticated request", async () => {
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: false,
        user: null,
      });
      const request = createMockGetRequest(
        "http://localhost:3000/api/financial/plaid/investments?access_token=tok-123",
      );
      const response = await GET(request);
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 401 when user is missing from validation", async () => {
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: true,
        user: null,
      });
      const request = createMockGetRequest(
        "http://localhost:3000/api/financial/plaid/investments?access_token=tok-123",
      );
      const response = await GET(request);
      expect(response.status).toBe(401);
    });

    it("should return 403 for user without financial:read permission", async () => {
      (rbac.hasPermission as jest.Mock).mockReturnValue(false);
      const request = createMockGetRequest(
        "http://localhost:3000/api/financial/plaid/investments?access_token=tok-123",
      );
      const response = await GET(request);
      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe("Forbidden");
      expect(rbac.hasPermission).toHaveBeenCalledWith(
        expect.objectContaining({ id: expect.any(String) }),
        "financial:read",
      );
    });
  });

  it("should return 400 when access_token is missing", async () => {
    const request = createMockGetRequest(
      "http://localhost:3000/api/financial/plaid/investments",
    );
    const response = await GET(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("access_token query parameter is required");
  });

  it("should return holdings successfully", async () => {
    const request = createMockGetRequest(
      "http://localhost:3000/api/financial/plaid/investments?access_token=tok-123",
    );
    const response = await GET(request);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toEqual(mockHoldingsResult);
    expect(plaidInvestmentsService.getHoldings).toHaveBeenCalledWith(
      "tok-123",
    );
  });

  it("should pass access_token to service correctly", async () => {
    const request = createMockGetRequest(
      "http://localhost:3000/api/financial/plaid/investments?access_token=access-sandbox-abc123",
    );
    await GET(request);
    expect(plaidInvestmentsService.getHoldings).toHaveBeenCalledWith(
      "access-sandbox-abc123",
    );
  });

  it("should return 500 on service error", async () => {
    (plaidInvestmentsService.getHoldings as jest.Mock).mockRejectedValue(
      new Error("Plaid API error"),
    );
    const request = createMockGetRequest(
      "http://localhost:3000/api/financial/plaid/investments?access_token=tok-123",
    );
    const response = await GET(request);
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe("Failed to fetch investment holdings");
  });

  it("should call jwtValidation.validateFromHeaders with the request", async () => {
    const request = createMockGetRequest(
      "http://localhost:3000/api/financial/plaid/investments?access_token=tok-123",
    );
    await GET(request);
    expect(jwtValidation.validateFromHeaders).toHaveBeenCalledWith(request);
  });
});

describe("POST /api/financial/plaid/investments", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (rbac.hasPermission as jest.Mock).mockReturnValue(true);
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: true,
      user: mockUser,
    });
    (rbac.hasPermission as jest.Mock).mockReturnValue(true);
    (plaidInvestmentsService.getTransactions as jest.Mock).mockResolvedValue(
      mockTransactionsResult,
    );
  });

  describe("negative-auth", () => {
    it("should return 401 for unauthenticated request", async () => {
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: false,
        user: null,
      });
      const request = createMockPostRequest(
        "http://localhost:3000/api/financial/plaid/investments",
        {
          access_token: "tok-123",
          start_date: "2026-01-01",
          end_date: "2026-01-31",
        },
      );
      const response = await POST(request);
      expect(response.status).toBe(401);
    });

    it("should return 403 for user without financial:read permission", async () => {
      (rbac.hasPermission as jest.Mock).mockReturnValue(false);
      const request = createMockPostRequest(
        "http://localhost:3000/api/financial/plaid/investments",
        {
          access_token: "tok-123",
          start_date: "2026-01-01",
          end_date: "2026-01-31",
        },
      );
      const response = await POST(request);
      expect(response.status).toBe(403);
    });
  });

  it("should return 400 when access_token is missing", async () => {
    const request = createMockPostRequest(
      "http://localhost:3000/api/financial/plaid/investments",
      { start_date: "2026-01-01", end_date: "2026-01-31" },
    );
    const response = await POST(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("access_token is required");
  });

  it("should return 400 when start_date is missing", async () => {
    const request = createMockPostRequest(
      "http://localhost:3000/api/financial/plaid/investments",
      { access_token: "tok-123", end_date: "2026-01-31" },
    );
    const response = await POST(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("start_date and end_date are required");
  });

  it("should return 400 when end_date is missing", async () => {
    const request = createMockPostRequest(
      "http://localhost:3000/api/financial/plaid/investments",
      { access_token: "tok-123", start_date: "2026-01-01" },
    );
    const response = await POST(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("start_date and end_date are required");
  });

  it("should return 400 when both dates are missing", async () => {
    const request = createMockPostRequest(
      "http://localhost:3000/api/financial/plaid/investments",
      { access_token: "tok-123" },
    );
    const response = await POST(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("start_date and end_date are required");
  });

  it("should return 400 for invalid start_date format", async () => {
    const request = createMockPostRequest(
      "http://localhost:3000/api/financial/plaid/investments",
      {
        access_token: "tok-123",
        start_date: "01-01-2026",
        end_date: "2026-01-31",
      },
    );
    const response = await POST(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("Dates must be in YYYY-MM-DD format");
  });

  it("should return 400 for invalid end_date format", async () => {
    const request = createMockPostRequest(
      "http://localhost:3000/api/financial/plaid/investments",
      {
        access_token: "tok-123",
        start_date: "2026-01-01",
        end_date: "Jan 31, 2026",
      },
    );
    const response = await POST(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("Dates must be in YYYY-MM-DD format");
  });

  it("should return investment transactions successfully", async () => {
    const request = createMockPostRequest(
      "http://localhost:3000/api/financial/plaid/investments",
      {
        access_token: "tok-123",
        start_date: "2026-01-01",
        end_date: "2026-01-31",
      },
    );
    const response = await POST(request);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toEqual(mockTransactionsResult);
    expect(plaidInvestmentsService.getTransactions).toHaveBeenCalledWith(
      "tok-123",
      "2026-01-01",
      "2026-01-31",
    );
  });

  it("should return 500 on service error", async () => {
    (plaidInvestmentsService.getTransactions as jest.Mock).mockRejectedValue(
      new Error("Plaid API error"),
    );
    const request = createMockPostRequest(
      "http://localhost:3000/api/financial/plaid/investments",
      {
        access_token: "tok-123",
        start_date: "2026-01-01",
        end_date: "2026-01-31",
      },
    );
    const response = await POST(request);
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe("Failed to fetch investment transactions");
  });

  it("should call jwtValidation.validateFromHeaders with the request", async () => {
    const request = createMockPostRequest(
      "http://localhost:3000/api/financial/plaid/investments",
      {
        access_token: "tok-123",
        start_date: "2026-01-01",
        end_date: "2026-01-31",
      },
    );
    await POST(request);
    expect(jwtValidation.validateFromHeaders).toHaveBeenCalledWith(request);
  });
});
