/**
 * @jest-environment node
 *
 * Tests for /api/credit-repair/accounts (FR-203, M2-1)
 *
 * Coverage:
 * - GET endpoint (fetch the authenticated user's real credit tradelines)
 * - Permission gate `credit:read` via the real `withPermission` guard
 *   (only jwt-validation + resolve-role are mocked; rbac runs for real)
 * - Authentication (401 when unauthenticated)
 * - IDOR safety (user id comes from the guard, never from query)
 * - Honest wire mapping: `ageMonths` derived from `openedDate` (null when the
 *   open date is missing — not 0), `paymentStatus` coerced to "" when unknown
 * - Honest empty result (no mock fallback) and honest 503 on data-access error
 */

import { GET } from "../route";
import { NextRequest } from "next/server";
import { jwtValidation } from "@/lib/auth/jwt-validation";
import { db } from "@/lib/credit-repair/db";
import { computeAgeMonths } from "@/lib/credit-repair/db/accounts-db-service";
import { auditLogger } from "@/lib/security/audit-logging";

// Drive the REAL guard: only identity (jwt) and role resolution are mocked.
// `rbac` runs for real so the `credit:read` permission gate is exercised.
jest.mock("@/lib/auth/jwt-validation");
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: jest.fn().mockResolvedValue("user"),
}));
jest.mock("@/lib/credit-repair/db", () => ({
  db: {
    accounts: {
      getAccountsByUser: jest.fn(),
    },
  },
}));
jest.mock("@/lib/security/audit-logging");

function createMockRequest(urlString: string): NextRequest {
  return {
    url: urlString,
    method: "GET",
    headers: new Headers(),
    nextUrl: new URL(urlString),
  } as unknown as NextRequest;
}

const BASE_URL = "http://localhost:3000/api/credit-repair/accounts";

const mockUser = { id: "user-123", email: "test@example.com" };

const datedAccount = {
  id: "acc-1",
  creditorName: "Chase Bank",
  accountType: "credit_card",
  balance: 1234.56,
  creditLimit: 5000,
  paymentStatus: "current",
  openedDate: "2015-03-10",
};

const undatedAccount = {
  id: "acc-2",
  creditorName: "Capital One",
  accountType: "auto_loan",
  balance: null,
  creditLimit: null,
  paymentStatus: null,
  openedDate: null,
};

describe("/api/credit-repair/accounts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (auditLogger.logAIInteraction as jest.Mock).mockResolvedValue(undefined);
    (auditLogger.logSecurityEvent as jest.Mock).mockResolvedValue(undefined);
  });

  it("returns the authenticated user's tradelines with derived age", async () => {
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: true,
      user: mockUser,
    });
    (db.accounts.getAccountsByUser as jest.Mock).mockResolvedValue([
      datedAccount,
      undatedAccount,
    ]);

    const response = await GET(createMockRequest(BASE_URL));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(data.accounts)).toBe(true);
    expect(data.accounts).toHaveLength(2);

    // Dated account: fields mapped, ageMonths derived from openedDate.
    const [first, second] = data.accounts;
    expect(first.id).toBe("acc-1");
    expect(first.creditorName).toBe("Chase Bank");
    expect(first.accountType).toBe("credit_card");
    expect(first.balance).toBe(1234.56);
    expect(first.creditLimit).toBe(5000);
    expect(first.paymentStatus).toBe("current");
    expect(first.openedDate).toBe("2015-03-10");
    expect(typeof first.ageMonths).toBe("number");
    expect(first.ageMonths).toBeGreaterThan(0);
    // Consistent with the pure derivation for the same open date.
    expect(first.ageMonths).toBe(computeAgeMonths("2015-03-10"));

    // Undated account: honest nulls, ageMonths null (not 0), status coerced "".
    expect(second.openedDate).toBeNull();
    expect(second.ageMonths).toBeNull();
    expect(second.paymentStatus).toBe("");
    expect(second.balance).toBeNull();
    expect(second.creditLimit).toBeNull();

    expect(db.accounts.getAccountsByUser).toHaveBeenCalledWith(mockUser.id, {
      limit: 50,
      offset: 0,
    });
    expect(auditLogger.logAIInteraction).toHaveBeenCalled();
  });

  it("returns an honest empty array when the user has no tradelines (no mock fallback)", async () => {
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: true,
      user: mockUser,
    });
    (db.accounts.getAccountsByUser as jest.Mock).mockResolvedValue([]);

    const response = await GET(createMockRequest(BASE_URL));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.accounts).toEqual([]);
  });

  it("returns 401 when the request is not authenticated", async () => {
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: false,
      user: null,
    });

    const response = await GET(createMockRequest(BASE_URL));

    expect(response.status).toBe(401);
    expect(db.accounts.getAccountsByUser).not.toHaveBeenCalled();
  });

  it("is IDOR-safe: ignores a client-supplied userId and scopes to the session user", async () => {
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: true,
      user: mockUser,
    });
    (db.accounts.getAccountsByUser as jest.Mock).mockResolvedValue([]);

    await GET(createMockRequest(`${BASE_URL}?userId=attacker-999`));

    expect(db.accounts.getAccountsByUser).toHaveBeenCalledTimes(1);
    const [scopedUserId] = (db.accounts.getAccountsByUser as jest.Mock).mock
      .calls[0];
    expect(scopedUserId).toBe(mockUser.id);
    expect(scopedUserId).not.toBe("attacker-999");
  });

  it("honors limit and offset query parameters", async () => {
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: true,
      user: mockUser,
    });
    (db.accounts.getAccountsByUser as jest.Mock).mockResolvedValue([]);

    await GET(createMockRequest(`${BASE_URL}?limit=10&offset=20`));

    expect(db.accounts.getAccountsByUser).toHaveBeenCalledWith(mockUser.id, {
      limit: 10,
      offset: 20,
    });
  });

  it("returns an honest 503 (no mock fallback) when the data read fails", async () => {
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: true,
      user: mockUser,
    });
    (db.accounts.getAccountsByUser as jest.Mock).mockRejectedValue(
      new Error("Failed to get accounts: connection reset"),
    );

    const response = await GET(createMockRequest(BASE_URL));
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.error).toBeDefined();
    expect(data.message).toBe("Failed to get credit accounts");
    expect(data.accounts).toBeUndefined();
    expect(auditLogger.logSecurityEvent).toHaveBeenCalled();
  });
});
