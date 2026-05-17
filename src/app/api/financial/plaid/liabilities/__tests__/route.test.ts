/**
 * Tests for /api/financial/plaid/liabilities
 *
 * Covers GET handler with server-side token resolution and optional type filtering.
 *
 * FND-038b: access_token must not be accepted as a query param. The route resolves
 * the Plaid access token server-side via plaidService.getAccessTokenForUser,
 * scoped to the authenticated user.
 */

import { NextRequest } from "next/server";

jest.mock("@/lib/auth/jwt-validation");
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: jest.fn().mockResolvedValue("premium"),
}));
jest.mock("@/lib/auth/rbac");
jest.mock("@/lib/financial/plaid-liabilities-service");
jest.mock("@/lib/financial/plaid-service");

import { GET } from "../route";
import { jwtValidation } from "@/lib/auth/jwt-validation";
import { rbac } from "@/lib/auth/rbac";
import { plaidLiabilitiesService } from "@/lib/financial/plaid-liabilities-service";
import { plaidService } from "@/lib/financial/plaid-service";

const mockUser = {
  id: "user-123",
  email: "test@example.com",
  role: "premium",
};

const OTHER_USER_ITEM_ID = "item-other-user";

const mockAccounts = [
  { accountId: "acc-1", itemId: "item-abc", userId: "user-123" },
];

const RESOLVED_TOKEN = "access-sandbox-resolved";

function createMockRequest(url: string): NextRequest {
  const parsedUrl = new URL(url);
  return {
    url,
    method: "GET",
    headers: new Headers(),
    nextUrl: parsedUrl,
  } as unknown as NextRequest;
}

const mockCreditLiabilities = [
  {
    accountId: "acc-1",
    isOverdue: false,
    lastPaymentAmount: 250.0,
    lastPaymentDate: "2026-01-10",
    lastStatementIssueDate: "2026-01-01",
    lastStatementBalance: 1500.0,
    minimumPaymentAmount: 35.0,
    nextPaymentDueDate: "2026-02-01",
    aprs: [
      {
        aprPercentage: 18.99,
        aprType: "purchase_apr",
        balanceSubjectToApr: 1500.0,
        interestChargeAmount: 23.74,
      },
    ],
  },
];

const mockStudentLoans = [
  {
    accountId: "acc-2",
    accountNumber: "1234567890",
    disbursementDates: ["2020-08-15"],
    expectedPayoffDate: "2030-08-15",
    guarantor: "DEPT OF ED",
    interestRatePercentage: 4.5,
    isOverdue: false,
    lastPaymentAmount: 350.0,
    lastPaymentDate: "2026-01-15",
    lastStatementBalance: 25000.0,
    lastStatementIssueDate: "2026-01-01",
    loanName: "Federal Direct Unsubsidized",
    minimumPaymentAmount: 350.0,
    nextPaymentDueDate: "2026-02-15",
    originationDate: "2020-08-15",
    originationPrincipalAmount: 30000.0,
    outstandingInterestAmount: 150.0,
    paymentReferenceNumber: "REF-12345",
  },
];

const mockMortgages = [
  {
    accountId: "acc-3",
    accountNumber: "9876543210",
    currentLateFee: null,
    escrowBalance: 5000.0,
    hasPmi: false,
    hasPrepaymentPenalty: false,
    lastPaymentAmount: 2200.0,
    lastPaymentDate: "2026-01-01",
    loanTypeDescription: "Conventional",
    loanTerm: "30 year",
    maturityDate: "2055-01-01",
    nextMonthlyPayment: 2200.0,
    nextPaymentDueDate: "2026-02-01",
    originationDate: "2025-01-01",
    originationPrincipalAmount: 400000.0,
    pastDueAmount: null,
    ytdInterestPaid: 1200.0,
    ytdPrincipalPaid: 800.0,
  },
];

const mockAllLiabilities = {
  credit: mockCreditLiabilities,
  student: mockStudentLoans,
  mortgage: mockMortgages,
};

describe("GET /api/financial/plaid/liabilities", () => {
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
    (plaidLiabilitiesService.getLiabilities as jest.Mock).mockResolvedValue(
      mockAllLiabilities,
    );
    (
      plaidLiabilitiesService.getCreditCardLiabilities as jest.Mock
    ).mockResolvedValue(mockCreditLiabilities);
    (
      plaidLiabilitiesService.getStudentLoanLiabilities as jest.Mock
    ).mockResolvedValue(mockStudentLoans);
    (
      plaidLiabilitiesService.getMortgageLiabilities as jest.Mock
    ).mockResolvedValue(mockMortgages);
  });

  // --- Authentication & Authorization ---

  describe("negative-auth", () => {
    it("should return 401 for unauthenticated request", async () => {
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: false,
        user: null,
      });
      const request = createMockRequest(
        "http://localhost:3000/api/financial/plaid/liabilities",
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
      const request = createMockRequest(
        "http://localhost:3000/api/financial/plaid/liabilities",
      );
      const response = await GET(request);
      expect(response.status).toBe(401);
    });

    it("should return 403 for user without financial:read permission", async () => {
      (rbac.hasPermission as jest.Mock).mockReturnValue(false);
      const request = createMockRequest(
        "http://localhost:3000/api/financial/plaid/liabilities",
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

  it("should call jwtValidation.validateFromHeaders with the request", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/plaid/liabilities",
    );
    await GET(request);
    expect(jwtValidation.validateFromHeaders).toHaveBeenCalledWith(request);
  });

  // --- FND-038b: token never accepted from URL ---

  it("idor: does not use access_token query param — resolves token server-side", async () => {
    // Even if a caller tries to supply access_token in the URL, the route ignores it
    // and resolves the token via plaidService.getAccessTokenForUser
    const request = createMockRequest(
      "http://localhost:3000/api/financial/plaid/liabilities?access_token=tok-attacker",
    );
    await GET(request);
    // Service must have been called with the server-resolved token, not "tok-attacker"
    expect(plaidLiabilitiesService.getLiabilities).toHaveBeenCalledWith(
      RESOLVED_TOKEN,
    );
    expect(plaidLiabilitiesService.getLiabilities).not.toHaveBeenCalledWith(
      "tok-attacker",
    );
  });

  it("idor: resolves token via plaidService.getAccessTokenForUser scoped to user.id", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/plaid/liabilities",
    );
    await GET(request);
    expect(plaidService.getAccessTokenForUser).toHaveBeenCalledWith(
      mockAccounts[0].itemId,
      mockUser.id,
    );
  });

  it("idor: returns 400 when supplied itemId belongs to another user", async () => {
    // The user's accounts only contain "item-abc"; "item-other-user" is foreign
    const request = createMockRequest(
      `http://localhost:3000/api/financial/plaid/liabilities?itemId=${OTHER_USER_ITEM_ID}`,
    );
    const response = await GET(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("does not belong to the authenticated user");
    // Must not have fetched a token for the foreign item
    expect(plaidService.getAccessTokenForUser).not.toHaveBeenCalled();
  });

  it("idor: calls getAccounts with user.id — not a caller-supplied userId", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/plaid/liabilities",
    );
    await GET(request);
    expect(plaidService.getAccounts).toHaveBeenCalledWith(mockUser.id);
  });

  // --- No linked accounts ---

  it("should return 400 when user has no linked accounts", async () => {
    (plaidService.getAccounts as jest.Mock).mockResolvedValue([]);
    const request = createMockRequest(
      "http://localhost:3000/api/financial/plaid/liabilities",
    );
    const response = await GET(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("No linked Plaid accounts");
  });

  // --- Multiple items without itemId ---

  it("should return 400 when user has multiple items and no itemId is supplied", async () => {
    (plaidService.getAccounts as jest.Mock).mockResolvedValue([
      { accountId: "acc-1", itemId: "item-1", userId: "user-123" },
      { accountId: "acc-2", itemId: "item-2", userId: "user-123" },
    ]);
    const request = createMockRequest(
      "http://localhost:3000/api/financial/plaid/liabilities",
    );
    const response = await GET(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("itemId");
  });

  // --- Input Validation: type param ---

  it("should return 400 for invalid type parameter", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/plaid/liabilities?type=auto",
    );
    const response = await GET(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("Invalid type parameter");
    expect(data.error).toContain("credit");
    expect(data.error).toContain("student");
    expect(data.error).toContain("mortgage");
  });

  it("should return 400 for another invalid type parameter", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/plaid/liabilities?type=personal",
    );
    const response = await GET(request);
    expect(response.status).toBe(400);
  });

  // --- No Type Filter (All Liabilities) ---

  it("should return all liabilities when no type filter is provided", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/plaid/liabilities",
    );
    const response = await GET(request);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toEqual(mockAllLiabilities);
    expect(plaidLiabilitiesService.getLiabilities).toHaveBeenCalledWith(
      RESOLVED_TOKEN,
    );
  });

  it("should not call type-specific methods when no type filter", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/plaid/liabilities",
    );
    await GET(request);
    expect(
      plaidLiabilitiesService.getCreditCardLiabilities,
    ).not.toHaveBeenCalled();
    expect(
      plaidLiabilitiesService.getStudentLoanLiabilities,
    ).not.toHaveBeenCalled();
    expect(
      plaidLiabilitiesService.getMortgageLiabilities,
    ).not.toHaveBeenCalled();
  });

  // --- itemId selection ---

  it("should use the supplied itemId when it belongs to the user", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/plaid/liabilities?itemId=item-abc",
    );
    await GET(request);
    expect(plaidService.getAccessTokenForUser).toHaveBeenCalledWith(
      "item-abc",
      mockUser.id,
    );
    expect(plaidLiabilitiesService.getLiabilities).toHaveBeenCalledWith(
      RESOLVED_TOKEN,
    );
  });

  // --- Credit Type Filter ---

  it("should return only credit liabilities when type=credit", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/plaid/liabilities?type=credit",
    );
    const response = await GET(request);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toEqual({ credit: mockCreditLiabilities });
    expect(
      plaidLiabilitiesService.getCreditCardLiabilities,
    ).toHaveBeenCalledWith(RESOLVED_TOKEN);
  });

  it("should not call getLiabilities when type=credit", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/plaid/liabilities?type=credit",
    );
    await GET(request);
    expect(plaidLiabilitiesService.getLiabilities).not.toHaveBeenCalled();
  });

  // --- Student Type Filter ---

  it("should return only student liabilities when type=student", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/plaid/liabilities?type=student",
    );
    const response = await GET(request);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toEqual({ student: mockStudentLoans });
    expect(
      plaidLiabilitiesService.getStudentLoanLiabilities,
    ).toHaveBeenCalledWith(RESOLVED_TOKEN);
  });

  it("should not call getLiabilities when type=student", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/plaid/liabilities?type=student",
    );
    await GET(request);
    expect(plaidLiabilitiesService.getLiabilities).not.toHaveBeenCalled();
  });

  // --- Mortgage Type Filter ---

  it("should return only mortgage liabilities when type=mortgage", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/plaid/liabilities?type=mortgage",
    );
    const response = await GET(request);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toEqual({ mortgage: mockMortgages });
    expect(
      plaidLiabilitiesService.getMortgageLiabilities,
    ).toHaveBeenCalledWith(RESOLVED_TOKEN);
  });

  it("should not call getLiabilities when type=mortgage", async () => {
    const request = createMockRequest(
      "http://localhost:3000/api/financial/plaid/liabilities?type=mortgage",
    );
    await GET(request);
    expect(plaidLiabilitiesService.getLiabilities).not.toHaveBeenCalled();
  });

  // --- Error Handling ---

  it("should return 500 when getLiabilities service throws", async () => {
    (plaidLiabilitiesService.getLiabilities as jest.Mock).mockRejectedValue(
      new Error("Plaid API error"),
    );
    const request = createMockRequest(
      "http://localhost:3000/api/financial/plaid/liabilities",
    );
    const response = await GET(request);
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe("Failed to fetch liabilities");
  });

  it("should return 500 when getCreditCardLiabilities throws", async () => {
    (
      plaidLiabilitiesService.getCreditCardLiabilities as jest.Mock
    ).mockRejectedValue(new Error("Plaid API error"));
    const request = createMockRequest(
      "http://localhost:3000/api/financial/plaid/liabilities?type=credit",
    );
    const response = await GET(request);
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe("Failed to fetch liabilities");
  });

  it("should return 500 when getStudentLoanLiabilities throws", async () => {
    (
      plaidLiabilitiesService.getStudentLoanLiabilities as jest.Mock
    ).mockRejectedValue(new Error("Plaid API error"));
    const request = createMockRequest(
      "http://localhost:3000/api/financial/plaid/liabilities?type=student",
    );
    const response = await GET(request);
    expect(response.status).toBe(500);
  });

  it("should return 500 when getMortgageLiabilities throws", async () => {
    (
      plaidLiabilitiesService.getMortgageLiabilities as jest.Mock
    ).mockRejectedValue(new Error("Plaid API error"));
    const request = createMockRequest(
      "http://localhost:3000/api/financial/plaid/liabilities?type=mortgage",
    );
    const response = await GET(request);
    expect(response.status).toBe(500);
  });

  it("should return 500 when getAccessTokenForUser throws", async () => {
    (plaidService.getAccessTokenForUser as jest.Mock).mockRejectedValue(
      new Error("token lookup failed"),
    );
    const request = createMockRequest(
      "http://localhost:3000/api/financial/plaid/liabilities",
    );
    const response = await GET(request);
    expect(response.status).toBe(500);
  });
});
