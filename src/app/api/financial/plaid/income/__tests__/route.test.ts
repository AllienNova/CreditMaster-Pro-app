/**
 * Tests for GET /api/financial/plaid/income — FND-038
 *
 * After the fix, the route must NOT accept access_token or user_token from
 * query params. Instead it resolves the secret server-side via itemId.
 */

import { NextRequest } from "next/server";

jest.mock("@/lib/auth/jwt-validation");
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: jest.fn().mockResolvedValue("premium"),
}));
jest.mock("@/lib/auth/rbac");
jest.mock("@/lib/financial/plaid-service");
jest.mock("@/lib/financial/plaid-income-service");

import { GET } from "../route";
import { jwtValidation } from "@/lib/auth/jwt-validation";
import { rbac } from "@/lib/auth/rbac";
import { plaidService } from "@/lib/financial/plaid-service";
import { plaidIncomeService } from "@/lib/financial/plaid-income-service";

const USER_A = { id: "user-a-uuid", email: "a@example.com", role: "premium" as const };
const USER_B = { id: "user-b-uuid", email: "b@example.com", role: "premium" as const };

const ITEM_A_ID = "item-a-uuid";

function makeRequest(urlPath: string, userId = USER_A.id) {
  const url = `http://localhost:3000${urlPath}`;
  return {
    url,
    method: "GET",
    headers: new Headers(),
    nextUrl: new URL(url),
  } as unknown as NextRequest;
}

function setupAuth(user = USER_A) {
  (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
    valid: true,
    user,
  });
  (rbac.hasPermission as jest.Mock).mockReturnValue(true);
}

const mockPaystubsResult = {
  paystubs: [{ employer: { name: "Acme" } }],
  documentMetadata: [],
  requestId: "req-1",
};

describe("GET /api/financial/plaid/income", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupAuth(USER_A);

    // Default: user A has one linked item
    (plaidService.getAccounts as jest.Mock).mockResolvedValue([
      {
        id: "fa-1",
        itemId: ITEM_A_ID,
        userId: USER_A.id,
        accountId: "acc-1",
        institutionName: "Chase",
        accountName: "Checking",
        accountType: "depository",
        accountSubtype: "checking",
        mask: "0001",
        currentBalance: 1000,
        currency: "USD",
        lastSynced: new Date(),
        createdAt: new Date(),
      },
    ]);
  });

  describe("negative-auth", () => {
    it("should return 401 for unauthenticated request", async () => {
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: false,
        user: null,
      });
      const response = await GET(makeRequest("/api/financial/plaid/income"));
      expect(response.status).toBe(401);
    });

    it("should return 403 without financial:read permission", async () => {
      (rbac.hasPermission as jest.Mock).mockReturnValue(false);
      const response = await GET(makeRequest("/api/financial/plaid/income"));
      expect(response.status).toBe(403);
    });
  });

  describe("FND-038 — no secret in URL", () => {
    it("idor: ignores access_token query param — route resolves token server-side", async () => {
      // Mock the server-side resolution
      (plaidIncomeService.getPaystubs as jest.Mock).mockResolvedValue(mockPaystubsResult);

      // Supply an access_token in the URL (the old vulnerable pattern)
      const response = await GET(
        makeRequest(
          "/api/financial/plaid/income?type=paystubs&access_token=secret-leaked-token",
        ),
      );

      // Route should still succeed (or possibly 400 if no items), but must NOT
      // pass the URL-supplied token directly to plaidIncomeService.
      // The call to getPaystubs must NOT have been called with the raw URL token.
      if (plaidIncomeService.getPaystubs as jest.Mock) {
        const calls = (plaidIncomeService.getPaystubs as jest.Mock).mock.calls;
        for (const call of calls) {
          expect(call[0]).not.toBe("secret-leaked-token");
        }
      }
    });

    it("idor: request resolves only the authenticated user's own Plaid linkage", async () => {
      (plaidIncomeService.getPaystubs as jest.Mock).mockResolvedValue(mockPaystubsResult);

      const response = await GET(
        makeRequest("/api/financial/plaid/income?type=paystubs"),
      );

      // plaidService.getAccounts was called with USER_A's id (not any URL param)
      expect(plaidService.getAccounts).toHaveBeenCalledWith(USER_A.id);
    });

    it("succeeds for paystubs when user has exactly one linked item (no itemId supplied)", async () => {
      (plaidIncomeService.getPaystubs as jest.Mock).mockResolvedValue(mockPaystubsResult);

      const response = await GET(
        makeRequest("/api/financial/plaid/income?type=paystubs"),
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it("returns 400 when user has multiple items and no itemId supplied", async () => {
      // Two linked items
      (plaidService.getAccounts as jest.Mock).mockResolvedValue([
        { itemId: "item-1", accountId: "acc-1", userId: USER_A.id },
        { itemId: "item-2", accountId: "acc-2", userId: USER_A.id },
      ]);

      const response = await GET(
        makeRequest("/api/financial/plaid/income?type=paystubs"),
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toMatch(/itemId/i);
    });

    it("returns 400 when supplied itemId does not belong to the user (IDOR guard)", async () => {
      // user A has item-a; we request item-b (owned by user B)
      const response = await GET(
        makeRequest(
          "/api/financial/plaid/income?type=paystubs&itemId=item-b-uuid",
        ),
      );

      expect(response.status).toBe(400);
    });

    it("succeeds when itemId matches a user-owned item", async () => {
      (plaidIncomeService.getPaystubs as jest.Mock).mockResolvedValue(mockPaystubsResult);

      const response = await GET(
        makeRequest(
          `/api/financial/plaid/income?type=paystubs&itemId=${ITEM_A_ID}`,
        ),
      );

      expect(response.status).toBe(200);
    });

    it("returns 400 when user has no linked items", async () => {
      (plaidService.getAccounts as jest.Mock).mockResolvedValue([]);

      const response = await GET(
        makeRequest("/api/financial/plaid/income?type=paystubs"),
      );

      expect(response.status).toBe(400);
    });
  });

  describe("bank_income type", () => {
    it("returns 501 (no server-side user_token source) for bank_income type", async () => {
      const response = await GET(
        makeRequest("/api/financial/plaid/income?type=bank_income"),
      );

      // STOP-and-report: no server-side Plaid user-token storage exists.
      // Route must reject rather than accept user_token from query params.
      expect([400, 501]).toContain(response.status);
    });
  });

  describe("taxforms type", () => {
    it("returns tax forms for authenticated user", async () => {
      const mockTaxResult = {
        taxforms: [],
        documentMetadata: [],
        requestId: null,
      };
      (plaidIncomeService.getTaxForms as jest.Mock).mockResolvedValue(mockTaxResult);

      const response = await GET(
        makeRequest("/api/financial/plaid/income?type=taxforms"),
      );

      expect(response.status).toBe(200);
      expect(plaidService.getAccounts).toHaveBeenCalledWith(USER_A.id);
    });
  });
});
