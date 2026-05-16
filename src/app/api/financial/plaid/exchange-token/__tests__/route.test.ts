/**
 * Tests for /api/financial/plaid/exchange-token
 */

import { NextRequest } from "next/server";

jest.mock("@/lib/auth/jwt-validation");
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: jest.fn().mockResolvedValue("premium"),
}));
jest.mock("@/lib/auth/rbac");
jest.mock("@/lib/financial/plaid-service");

import { POST } from "../route";
import { jwtValidation } from "@/lib/auth/jwt-validation";
import { rbac } from "@/lib/auth/rbac";
import { plaidService } from "@/lib/financial/plaid-service";

const mockUser = { id: "user-123", email: "test@example.com", role: "premium" };

function createMockRequest(
  url: string,
  body?: Record<string, unknown>,
) {
  const parsedUrl = new URL(url);
  return {
    url,
    method: "POST",
    headers: new Headers(),
    nextUrl: parsedUrl,
    json: jest.fn().mockResolvedValue(body || {}),
  } as unknown as NextRequest;
}

const mockAccounts = [
  { id: "acc-1", name: "Checking", type: "depository", balance: 5000 },
];

describe("POST /api/financial/plaid/exchange-token", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: true,
      user: mockUser,
    });
    (rbac.hasPermission as jest.Mock).mockReturnValue(true);
    (plaidService.exchangePublicToken as jest.Mock).mockResolvedValue(
      "item-abc123",
    );
    (plaidService.syncAccounts as jest.Mock).mockResolvedValue(mockAccounts);
    (plaidService.syncTransactions as jest.Mock).mockResolvedValue(undefined);
  });

  it("should return 401 for unauthenticated request", async () => {
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: false,
      user: null,
    });
    const request = createMockRequest(
      "http://localhost:3000/api/financial/plaid/exchange-token",
      { publicToken: "public-sandbox-abc123" },
    );
    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it("should return 403 for user without financial:link_accounts permission", async () => {
    (rbac.hasPermission as jest.Mock).mockReturnValue(false);
    const request = createMockRequest(
      "http://localhost:3000/api/financial/plaid/exchange-token",
      { publicToken: "public-sandbox-abc123" },
    );
    const response = await POST(request);
    expect(response.status).toBe(403);
  });

  it("should return 400 when publicToken is missing", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/plaid/exchange-token",
      {},
    );
    const response = await POST(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("Public token is required");
  });

  it("should exchange token and sync accounts successfully", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/plaid/exchange-token",
      { publicToken: "public-sandbox-abc123" },
    );
    const response = await POST(request);
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.itemId).toBe("item-abc123");
    expect(data.data.accounts).toEqual(mockAccounts);
    expect(plaidService.exchangePublicToken).toHaveBeenCalledWith(
      "public-sandbox-abc123",
      "user-123",
    );
    expect(plaidService.syncAccounts).toHaveBeenCalledWith(
      "item-abc123",
      "user-123",
    );
    expect(plaidService.syncTransactions).toHaveBeenCalledWith(
      "item-abc123",
      "user-123",
      30,
    );
  });

  it("should return 500 on service error", async () => {
    (plaidService.exchangePublicToken as jest.Mock).mockRejectedValue(
      new Error("Plaid API error"),
    );
    const request = createMockRequest(
      "http://localhost:3000/api/financial/plaid/exchange-token",
      { publicToken: "public-sandbox-abc123" },
    );
    const response = await POST(request);
    expect(response.status).toBe(500);
  });
});
