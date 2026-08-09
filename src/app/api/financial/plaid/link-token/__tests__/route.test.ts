/**
 * Tests for /api/financial/plaid/link-token
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

function createMockRequest(url: string, method = "POST") {
  const parsedUrl = new URL(url);
  return {
    url,
    method,
    headers: new Headers(),
    nextUrl: parsedUrl,
    json: jest.fn().mockResolvedValue({}),
  } as unknown as NextRequest;
}

const mockLinkToken = {
  linkToken: "link-sandbox-abc123",
  expiration: "2026-01-15T11:00:00Z",
};

describe("POST /api/financial/plaid/link-token", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (rbac.hasPermission as jest.Mock).mockReturnValue(true);
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: true,
      user: mockUser,
    });
    (rbac.hasPermission as jest.Mock).mockReturnValue(true);
    (plaidService.createLinkToken as jest.Mock).mockResolvedValue(
      mockLinkToken,
    );
  });

  describe("negative-auth", () => {
    it("should return 401 for unauthenticated request", async () => {
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: false,
        user: null,
      });
      const request = createMockRequest(
        "http://localhost:3000/api/financial/plaid/link-token",
      );
      const response = await POST(request);
      expect(response.status).toBe(401);
    });

    it("should return 403 for user without financial:link_accounts permission", async () => {
      (rbac.hasPermission as jest.Mock).mockReturnValue(false);
      const request = createMockRequest(
        "http://localhost:3000/api/financial/plaid/link-token",
      );
      const response = await POST(request);
      expect(response.status).toBe(403);
    });
  });

  it("should create link token successfully", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/plaid/link-token",
    );
    const response = await POST(request);
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toEqual(mockLinkToken);
    expect(plaidService.createLinkToken).toHaveBeenCalledWith("user-123");
  });

  it("should return 500 on service error", async () => {
    (plaidService.createLinkToken as jest.Mock).mockRejectedValue(
      new Error("Plaid API error"),
    );
    const request = createMockRequest(
      "http://localhost:3000/api/financial/plaid/link-token",
    );
    const response = await POST(request);
    expect(response.status).toBe(500);
  });
});
