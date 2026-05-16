/**
 * Tests for /api/financial/transactions
 */

import { NextRequest } from "next/server";

jest.mock("@/lib/auth/jwt-validation");
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: jest.fn().mockResolvedValue("premium"),
}));
jest.mock("@/lib/auth/rbac");
jest.mock("@/lib/financial/plaid-service");

import { GET } from "../route";
import { jwtValidation } from "@/lib/auth/jwt-validation";
import { rbac } from "@/lib/auth/rbac";
import { plaidService } from "@/lib/financial/plaid-service";

const mockUser = { id: "user-123", email: "test@example.com", role: "premium" };

function createMockRequest(url: string) {
  const parsedUrl = new URL(url);
  return {
    url,
    method: "GET",
    headers: new Headers(),
    nextUrl: parsedUrl,
  } as unknown as NextRequest;
}

const mockTransactions = [
  {
    id: "txn-1",
    amount: 42.5,
    merchant: "Grocery Store",
    date: "2026-01-15",
    category: "Food",
  },
  {
    id: "txn-2",
    amount: 120.0,
    merchant: "Gas Station",
    date: "2026-01-14",
    category: "Transportation",
  },
];

describe("GET /api/financial/transactions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: true,
      user: mockUser,
    });
    (rbac.hasPermission as jest.Mock).mockReturnValue(true);
    (plaidService.getTransactions as jest.Mock).mockResolvedValue(
      mockTransactions,
    );
  });

  it("should return 401 for unauthenticated request", async () => {
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: false,
      user: null,
    });
    const request = createMockRequest(
      "http://localhost:3000/api/financial/transactions?accountId=acc-1&startDate=2026-01-01&endDate=2026-01-31",
    );
    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it("should return 403 for user without financial:read permission", async () => {
    (rbac.hasPermission as jest.Mock).mockReturnValue(false);
    const request = createMockRequest(
      "http://localhost:3000/api/financial/transactions?accountId=acc-1&startDate=2026-01-01&endDate=2026-01-31",
    );
    const response = await GET(request);
    expect(response.status).toBe(403);
  });

  it("should return 400 when required params are missing", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/transactions",
    );
    const response = await GET(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("required");
  });

  it("should return 400 when accountId is missing", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/transactions?startDate=2026-01-01&endDate=2026-01-31",
    );
    const response = await GET(request);
    expect(response.status).toBe(400);
  });

  it("should return transactions successfully", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/transactions?accountId=acc-1&startDate=2026-01-01&endDate=2026-01-31",
    );
    const response = await GET(request);
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toEqual(mockTransactions);
    expect(plaidService.getTransactions).toHaveBeenCalledWith(
      "acc-1",
      expect.any(Date),
      expect.any(Date),
    );
  });

  it("should return 500 on service error", async () => {
    (plaidService.getTransactions as jest.Mock).mockRejectedValue(
      new Error("Plaid API error"),
    );
    const request = createMockRequest(
      "http://localhost:3000/api/financial/transactions?accountId=acc-1&startDate=2026-01-01&endDate=2026-01-31",
    );
    const response = await GET(request);
    expect(response.status).toBe(500);
  });
});
