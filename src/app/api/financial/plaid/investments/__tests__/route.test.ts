/**
 * Tests for /api/financial/plaid/investments
 *
 * Covers GET (holdings) and POST (investment transactions) handlers.
 *
 * FND-038b: GET handler must resolve access_token server-side — never from URL params.
 */

import { NextRequest } from "next/server";

jest.mock("@/lib/auth/jwt-validation");
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: jest.fn().mockResolvedValue("premium"),
}));
jest.mock("@/lib/auth/rbac");
jest.mock("@/lib/financial/plaid-investments-service");
jest.mock("@/lib/financial/plaid-service");

import { GET, POST } from "../route";
import { jwtValidation } from "@/lib/auth/jwt-validation";
import { rbac } from "@/lib/auth/rbac";
import { plaidInvestmentsService } from "@/lib/financial/plaid-investments-service";
import { plaidService } from "@/lib/financial/plaid-service";

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

// FND-038b: server-resolved token constant — never a URL param
const RESOLVED_TOKEN = "access-sandbox-resolved";
const OTHER_USER_ITEM_ID = "item-other-user";

const mockAccounts = [
  { accountId: "acc-1", itemId: "item-abc", userId: mockUser.id },
];

describe("GET /api/financial/plaid/investments", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (rbac.hasPermission as jest.Mock).mockReturnValue(true);
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: true,
      user: mockUser,
    });
    (plaidService.getAccounts as jest.Mock).mockResolvedValue(mockAccounts);
    (plaidService.getAccessTokenForUser as jest.Mock).mockResolvedValue(
      RESOLVED_TOKEN,
    );
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
        "http://localhost:3000/api/financial/plaid/investments",
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
        "http://localhost:3000/api/financial/plaid/investments",
      );
      const response = await GET(request);
      expect(response.status).toBe(401);
    });

    it("should return 403 for user without financial:read permission", async () => {
      (rbac.hasPermission as jest.Mock).mockReturnValue(false);
      const request = createMockGetRequest(
        "http://localhost:3000/api/financial/plaid/investments",
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

  describe("idor", () => {
    it("idor: does not use access_token query param — resolves token server-side", async () => {
      // Attacker supplies their own token as a URL param — must be ignored
      const request = createMockGetRequest(
        "http://localhost:3000/api/financial/plaid/investments?access_token=tok-attacker",
      );
      const response = await GET(request);
      expect(response.status).toBe(200);
      // Service must be called with the server-resolved token, not the URL param
      expect(plaidInvestmentsService.getHoldings).toHaveBeenCalledWith(
        RESOLVED_TOKEN,
      );
      expect(plaidInvestmentsService.getHoldings).not.toHaveBeenCalledWith(
        "tok-attacker",
      );
    });

    it("idor: resolves token via plaidService.getAccessTokenForUser scoped to user.id", async () => {
      const request = createMockGetRequest(
        "http://localhost:3000/api/financial/plaid/investments",
      );
      await GET(request);
      expect(plaidService.getAccessTokenForUser).toHaveBeenCalledWith(
        mockAccounts[0].itemId,
        mockUser.id,
      );
    });

    it("idor: returns 400 when supplied itemId belongs to another user", async () => {
      const request = createMockGetRequest(
        `http://localhost:3000/api/financial/plaid/investments?itemId=${OTHER_USER_ITEM_ID}`,
      );
      const response = await GET(request);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe(
        "itemId does not belong to the authenticated user",
      );
      expect(plaidService.getAccessTokenForUser).not.toHaveBeenCalled();
    });

    it("idor: calls getAccounts with user.id — not a caller-supplied userId", async () => {
      const request = createMockGetRequest(
        "http://localhost:3000/api/financial/plaid/investments",
      );
      await GET(request);
      expect(plaidService.getAccounts).toHaveBeenCalledWith(mockUser.id);
      expect(plaidService.getAccounts).toHaveBeenCalledTimes(1);
    });
  });

  it("should return 400 when no linked accounts found", async () => {
    (plaidService.getAccounts as jest.Mock).mockResolvedValue([]);
    const request = createMockGetRequest(
      "http://localhost:3000/api/financial/plaid/investments",
    );
    const response = await GET(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("No linked Plaid accounts found for this user");
  });

  it("should return 400 when multiple items found and no itemId provided", async () => {
    (plaidService.getAccounts as jest.Mock).mockResolvedValue([
      { accountId: "acc-1", itemId: "item-abc", userId: mockUser.id },
      { accountId: "acc-2", itemId: "item-xyz", userId: mockUser.id },
    ]);
    const request = createMockGetRequest(
      "http://localhost:3000/api/financial/plaid/investments",
    );
    const response = await GET(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("Multiple linked items found");
  });

  it("should return holdings successfully using server-resolved token", async () => {
    const request = createMockGetRequest(
      "http://localhost:3000/api/financial/plaid/investments",
    );
    const response = await GET(request);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toEqual(mockHoldingsResult);
    expect(plaidInvestmentsService.getHoldings).toHaveBeenCalledWith(
      RESOLVED_TOKEN,
    );
  });

  it("should accept optional itemId param and use the specified item", async () => {
    const request = createMockGetRequest(
      `http://localhost:3000/api/financial/plaid/investments?itemId=${mockAccounts[0].itemId}`,
    );
    const response = await GET(request);
    expect(response.status).toBe(200);
    expect(plaidService.getAccessTokenForUser).toHaveBeenCalledWith(
      mockAccounts[0].itemId,
      mockUser.id,
    );
  });

  it("should return 500 on service error", async () => {
    (plaidInvestmentsService.getHoldings as jest.Mock).mockRejectedValue(
      new Error("Plaid API error"),
    );
    const request = createMockGetRequest(
      "http://localhost:3000/api/financial/plaid/investments",
    );
    const response = await GET(request);
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe("Failed to fetch investment holdings");
  });

  it("should return 500 when getAccessTokenForUser throws", async () => {
    (plaidService.getAccessTokenForUser as jest.Mock).mockRejectedValue(
      new Error("token lookup failed"),
    );
    const request = createMockGetRequest(
      "http://localhost:3000/api/financial/plaid/investments",
    );
    const response = await GET(request);
    expect(response.status).toBe(500);
  });

  it("should call jwtValidation.validateFromHeaders with the request", async () => {
    const request = createMockGetRequest(
      "http://localhost:3000/api/financial/plaid/investments",
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
