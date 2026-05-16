/**
 * Tests for /api/financial/accounts
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

const mockAccounts = [
  {
    id: "acc-1",
    name: "Checking Account",
    type: "depository",
    subtype: "checking",
    balance: 5000,
    currency: "USD",
  },
  {
    id: "acc-2",
    name: "Savings Account",
    type: "depository",
    subtype: "savings",
    balance: 15000,
    currency: "USD",
  },
];

describe("GET /api/financial/accounts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: true,
      user: mockUser,
    });
    (rbac.hasPermission as jest.Mock).mockReturnValue(true);
    (plaidService.getAccounts as jest.Mock).mockResolvedValue(mockAccounts);
  });

  it("should return 401 for unauthenticated request", async () => {
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: false,
      user: null,
    });
    const request = createMockRequest(
      "http://localhost:3000/api/financial/accounts",
    );
    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it("should return 403 for user without financial:read permission", async () => {
    (rbac.hasPermission as jest.Mock).mockReturnValue(false);
    const request = createMockRequest(
      "http://localhost:3000/api/financial/accounts",
    );
    const response = await GET(request);
    expect(response.status).toBe(403);
  });

  it("should return accounts successfully", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/accounts",
    );
    const response = await GET(request);
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toEqual(mockAccounts);
    expect(plaidService.getAccounts).toHaveBeenCalledWith("user-123");
  });

  it("should return 500 on service error", async () => {
    (plaidService.getAccounts as jest.Mock).mockRejectedValue(
      new Error("Plaid API error"),
    );
    const request = createMockRequest(
      "http://localhost:3000/api/financial/accounts",
    );
    const response = await GET(request);
    expect(response.status).toBe(500);
  });
});
