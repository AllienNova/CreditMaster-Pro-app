/**
 * Tests for POST /api/financial/plaid/hosted-link
 *
 * Validates hosted link generation, authentication, authorization,
 * input validation, and error handling.
 */

import { NextRequest } from "next/server";

const mockResolveRoleFromDb = jest.fn();
jest.mock("@/lib/auth/jwt-validation");
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: (...args: unknown[]) => mockResolveRoleFromDb(...args),
}));
jest.mock("@/lib/auth/rbac");
jest.mock("@/lib/financial/plaid-client");

import { POST } from "../route";
import { jwtValidation } from "@/lib/auth/jwt-validation";
import { rbac } from "@/lib/auth/rbac";
import { getPlaidClient } from "@/lib/financial/plaid-client";

const mockUser = {
  id: "user-123",
  email: "test@example.com",
  role: "premium",
};

const mockAdminUser = {
  id: "admin-456",
  email: "admin@example.com",
  role: "admin",
};

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
    json: jest.fn().mockResolvedValue(body ?? {}),
  } as unknown as NextRequest;
}

const mockLinkTokenCreate = jest.fn();

const mockHostedLinkResponse = {
  data: {
    link_token: "link-sandbox-hosted-abc123",
    expiration: "2026-03-01T12:00:00Z",
    hosted_link_url: "https://hosted.plaid.com/link/session-abc123",
    request_id: "req-123",
  },
};

describe("POST /api/financial/plaid/hosted-link", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (rbac.hasPermission as jest.Mock).mockReturnValue(true);
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: true,
      user: mockUser,
    });
    // Default DB-resolved role: a regular user. Tests needing admin override
    // this explicitly — the inline ownership check trusts ONLY this DB role.
    mockResolveRoleFromDb.mockResolvedValue("premium");
    (rbac.hasPermission as jest.Mock).mockReturnValue(true);
    mockLinkTokenCreate.mockResolvedValue(mockHostedLinkResponse);
    (getPlaidClient as jest.Mock).mockReturnValue({
      linkTokenCreate: mockLinkTokenCreate,
    });
  });

  describe("negative-auth", () => {
    it("should return 401 for unauthenticated request", async () => {
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: false,
        user: null,
      });
      const request = createMockRequest(
        "http://localhost:3000/api/financial/plaid/hosted-link",
        { userId: "user-123" },
      );
      const response = await POST(request);
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 403 for user without financial:link_accounts permission", async () => {
      (rbac.hasPermission as jest.Mock).mockReturnValue(false);
      const request = createMockRequest(
        "http://localhost:3000/api/financial/plaid/hosted-link",
        { userId: "user-123" },
      );
      const response = await POST(request);
      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe("Forbidden");
    });
  });

  it("should return 400 when userId is missing", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/plaid/hosted-link",
      {},
    );
    const response = await POST(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("userId is required");
  });

  it("should return 403 when userId does not match authenticated user", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/plaid/hosted-link",
      { userId: "other-user-456" },
    );
    const response = await POST(request);
    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toContain("does not match");
  });

  it("should allow admin to generate hosted link for another user", async () => {
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: true,
      user: mockAdminUser,
    });
    // The DB confirms this user is genuinely an admin.
    mockResolveRoleFromDb.mockResolvedValue("admin");
    const request = createMockRequest(
      "http://localhost:3000/api/financial/plaid/hosted-link",
      { userId: "user-123" },
    );
    const response = await POST(request);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.hostedLinkUrl).toBe(
      "https://hosted.plaid.com/link/session-abc123",
    );
  });

  it("rejects a forged/stale admin JWT — DB role governs the ownership check (TASK-AUTH-03c CRITICAL)", async () => {
    // The JWT *claims* admin, but the database resolves the user as a plain
    // "user". The inline ownership check must use the DB-resolved role, so a
    // forged or stale admin token cannot link another user's bank account.
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: true,
      user: { id: "attacker-789", email: "attacker@example.com", role: "admin" },
    });
    mockResolveRoleFromDb.mockResolvedValue("user");

    const request = createMockRequest(
      "http://localhost:3000/api/financial/plaid/hosted-link",
      { userId: "victim-123" },
    );
    const response = await POST(request);

    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toContain("does not match");
  });

  it("should generate hosted link URL with default redirect URI", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/plaid/hosted-link",
      { userId: "user-123" },
    );
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.hostedLinkUrl).toBe(
      "https://hosted.plaid.com/link/session-abc123",
    );
    expect(data.data.linkToken).toBe("link-sandbox-hosted-abc123");
    expect(data.data.expiration).toBe("2026-03-01T12:00:00Z");

    // Verify Plaid client was called with hosted_link config
    expect(mockLinkTokenCreate).toHaveBeenCalledTimes(1);
    const callArgs = mockLinkTokenCreate.mock.calls[0][0];
    expect(callArgs.hosted_link).toBeDefined();
    expect(callArgs.hosted_link.completion_redirect_uri).toBe(
      "fynvita://plaid-callback",
    );
    expect(callArgs.hosted_link.is_mobile_app).toBe(true);
    expect(callArgs.hosted_link.url_lifetime_seconds).toBe(3600);
    expect(callArgs.user.client_user_id).toBe("user-123");
  });

  it("should use custom redirectUri when provided", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/plaid/hosted-link",
      {
        userId: "user-123",
        redirectUri: "myapp://custom-callback",
      },
    );
    const response = await POST(request);
    expect(response.status).toBe(200);

    const callArgs = mockLinkTokenCreate.mock.calls[0][0];
    expect(callArgs.hosted_link.completion_redirect_uri).toBe(
      "myapp://custom-callback",
    );
  });

  it("should return 500 when Plaid does not return hosted_link_url", async () => {
    mockLinkTokenCreate.mockResolvedValue({
      data: {
        link_token: "link-sandbox-abc123",
        expiration: "2026-03-01T12:00:00Z",
        hosted_link_url: undefined,
        request_id: "req-123",
      },
    });

    const request = createMockRequest(
      "http://localhost:3000/api/financial/plaid/hosted-link",
      { userId: "user-123" },
    );
    const response = await POST(request);
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toContain("hosted link URL");
  });

  it("should return 500 on Plaid API error", async () => {
    mockLinkTokenCreate.mockRejectedValue(new Error("Plaid API unavailable"));

    const request = createMockRequest(
      "http://localhost:3000/api/financial/plaid/hosted-link",
      { userId: "user-123" },
    );
    const response = await POST(request);
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe("Failed to create hosted link");
  });

  it("should pass correct products and country codes to Plaid", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/plaid/hosted-link",
      { userId: "user-123" },
    );
    await POST(request);

    const callArgs = mockLinkTokenCreate.mock.calls[0][0];
    expect(callArgs.products).toContain("transactions");
    expect(callArgs.products).toContain("auth");
    expect(callArgs.products).toContain("identity");
    expect(callArgs.country_codes).toContain("US");
    expect(callArgs.language).toBe("en");
    expect(callArgs.client_name).toBe("Fynvita");
  });

  it("should include webhook URL in the Plaid request", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/plaid/hosted-link",
      { userId: "user-123" },
    );
    await POST(request);

    const callArgs = mockLinkTokenCreate.mock.calls[0][0];
    expect(callArgs.webhook).toBeDefined();
    expect(callArgs.webhook).toContain("/api/financial/plaid/webhook");
  });

  it("should check RBAC permission for financial:link_accounts", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/plaid/hosted-link",
      { userId: "user-123" },
    );
    await POST(request);

    expect(rbac.hasPermission).toHaveBeenCalledWith(
      expect.objectContaining({ id: expect.any(String) }),
      "financial:link_accounts",
    );
  });

  it("should handle JSON parse errors gracefully", async () => {
    const request = {
      url: "http://localhost:3000/api/financial/plaid/hosted-link",
      method: "POST",
      headers: new Headers(),
      nextUrl: new URL("http://localhost:3000/api/financial/plaid/hosted-link"),
      json: jest.fn().mockRejectedValue(new SyntaxError("Unexpected token")),
    } as unknown as NextRequest;

    const response = await POST(request);
    expect(response.status).toBe(500);
  });
});
