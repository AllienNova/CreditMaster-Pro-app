/**
 * @jest-environment node
 *
 * Tests for /api/credit-repair/disputable-items (FR-204, M2-2)
 *
 * Coverage:
 * - GET endpoint: union of NEGATIVE `credit_accounts` tradelines +
 *   UNDISPUTED `credit_inquiries` rows, mapped to the wire contract
 * - Permission gate `credit:read` via the REAL `withPermission` guard
 *   (only jwt-validation + resolve-role are mocked; rbac runs for real)
 * - Negative-status classification: derogatory statuses (late_30, charge_off,
 *   charged_off, collection, delinquent, derogatory) are INCLUDED; good-standing
 *   (current, closed, paid) and unknown (null) are EXCLUDED
 * - Disputed inquiries are excluded; undisputed inquiries are included
 * - Authentication (401 when unauthenticated) — handler never runs
 * - IDOR safety (user id comes from the guard, never from query)
 * - Honest empty result (no mock fallback) and honest 503 on a data-access error
 */

import { GET } from "../route";
import { NextRequest } from "next/server";
import { jwtValidation } from "@/lib/auth/jwt-validation";
import { db } from "@/lib/credit-repair/db";
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
    inquiries: {
      getInquiriesByUser: jest.fn(),
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

const BASE_URL = "http://localhost:3000/api/credit-repair/disputable-items";

const mockUser = { id: "user-123", email: "test@example.com" };

// A tradeline in good standing — NOT disputable, must be excluded.
const currentAccount = {
  id: "acc-current",
  creditorName: "Chase Bank",
  accountType: "credit_card",
  balance: 500,
  creditLimit: 5000,
  paymentStatus: "current",
  openedDate: "2015-03-10",
};

// A closed account — treated as good-standing here (no derogatory token), excluded.
const closedAccount = {
  id: "acc-closed",
  creditorName: "Old Store Card",
  accountType: "revolving",
  balance: 0,
  creditLimit: 1000,
  paymentStatus: "closed",
  openedDate: "2010-01-01",
};

// An account with an unknown status — never assumed disputable, excluded.
const unknownStatusAccount = {
  id: "acc-unknown",
  creditorName: "Mystery Lender",
  accountType: "installment",
  balance: 250,
  creditLimit: null,
  paymentStatus: null,
  openedDate: null,
};

// Negative tradelines across both `PaymentStatus` spellings — all disputable.
const negativeAccounts = [
  {
    id: "acc-late30",
    creditorName: "Capital One",
    accountType: "credit_card",
    balance: 1200.55,
    creditLimit: 3000,
    paymentStatus: "late_30",
    openedDate: "2018-06-01",
  },
  {
    id: "acc-chargeoff",
    creditorName: "MegaBank",
    accountType: "personal_loan",
    balance: 8000,
    creditLimit: null,
    paymentStatus: "charge_off",
    openedDate: "2019-02-11",
  },
  {
    id: "acc-charged-off-legacy",
    creditorName: "LegacyCorp",
    accountType: "installment",
    balance: 430,
    creditLimit: null,
    paymentStatus: "charged_off",
    openedDate: "2017-09-09",
  },
  {
    id: "acc-collection",
    creditorName: "Collections R Us",
    accountType: "other",
    balance: 95.25,
    creditLimit: null,
    paymentStatus: "collection",
    openedDate: "2020-12-01",
  },
  {
    id: "acc-delinquent",
    creditorName: "Regional Credit Union",
    accountType: "auto_loan",
    balance: 15000,
    creditLimit: null,
    paymentStatus: "Delinquent", // mixed-case: matched case-insensitively
    openedDate: "2016-04-04",
  },
  {
    id: "acc-derogatory",
    creditorName: "Derog Financial",
    accountType: "other",
    balance: null, // honest null balance survives the mapping
    creditLimit: null,
    paymentStatus: "derogatory",
    openedDate: null,
  },
];

const undisputedInquiry = {
  id: "inq-1",
  userId: mockUser.id,
  reportId: "rep-1",
  inquiryType: "hard" as const,
  creditorName: "Auto Financing Inc",
  inquiryDate: new Date("2024-01-15"),
  isDisputed: false,
  createdAt: new Date("2024-01-16"),
};

const disputedInquiry = {
  id: "inq-2",
  userId: mockUser.id,
  reportId: "rep-1",
  inquiryType: "soft" as const,
  creditorName: "Already Disputed Bank",
  inquiryDate: new Date("2024-02-20"),
  isDisputed: true, // already disputed → excluded
  createdAt: new Date("2024-02-21"),
};

function authenticate(): void {
  (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
    valid: true,
    user: mockUser,
  });
}

describe("/api/credit-repair/disputable-items", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (auditLogger.logAIInteraction as jest.Mock).mockResolvedValue(undefined);
    (auditLogger.logSecurityEvent as jest.Mock).mockResolvedValue(undefined);
  });

  it("unions negative tradelines with undisputed inquiries and maps the contract", async () => {
    authenticate();
    (db.accounts.getAccountsByUser as jest.Mock).mockResolvedValue([
      currentAccount,
      closedAccount,
      unknownStatusAccount,
      ...negativeAccounts,
    ]);
    (db.inquiries.getInquiriesByUser as jest.Mock).mockResolvedValue([
      undisputedInquiry,
      disputedInquiry,
    ]);

    const response = await GET(createMockRequest(BASE_URL));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(data.items)).toBe(true);

    // 6 negative accounts + 1 undisputed inquiry = 7. The 3 good-standing/
    // unknown accounts and the 1 disputed inquiry are excluded.
    expect(data.items).toHaveLength(7);

    const ids = data.items.map((i: { id: string }) => i.id);
    // Good-standing / unknown accounts excluded.
    expect(ids).not.toContain("acc-current");
    expect(ids).not.toContain("acc-closed");
    expect(ids).not.toContain("acc-unknown");
    // Disputed inquiry excluded.
    expect(ids).not.toContain("inq-2");
    // All negative accounts + undisputed inquiry present.
    expect(ids).toEqual(
      expect.arrayContaining([
        "acc-late30",
        "acc-chargeoff",
        "acc-charged-off-legacy",
        "acc-collection",
        "acc-delinquent",
        "acc-derogatory",
        "inq-1",
      ]),
    );

    // Account item mapping: accountName=creditorName, status=payment_status,
    // balance passes through (including honest null), type="account".
    const late30 = data.items.find(
      (i: { id: string }) => i.id === "acc-late30",
    );
    expect(late30).toEqual({
      id: "acc-late30",
      accountName: "Capital One",
      status: "late_30",
      balance: 1200.55,
      type: "account",
    });
    const derog = data.items.find(
      (i: { id: string }) => i.id === "acc-derogatory",
    );
    expect(derog.balance).toBeNull(); // honest null, never fabricated
    expect(derog.type).toBe("account");

    // Inquiry item mapping: accountName=creditorName, status=inquiry_type,
    // balance=null, type="inquiry".
    const inquiryItem = data.items.find(
      (i: { id: string }) => i.id === "inq-1",
    );
    expect(inquiryItem).toEqual({
      id: "inq-1",
      accountName: "Auto Financing Inc",
      status: "hard",
      balance: null,
      type: "inquiry",
    });

    // Both reads are scoped to the session user.
    expect(db.accounts.getAccountsByUser).toHaveBeenCalledWith(mockUser.id);
    expect(db.inquiries.getInquiriesByUser).toHaveBeenCalledWith(mockUser.id);
    expect(auditLogger.logAIInteraction).toHaveBeenCalled();
  });

  it("returns an honest empty array when nothing is disputable (no mock fallback)", async () => {
    authenticate();
    // Accounts exist but all good-standing; inquiries exist but all disputed.
    (db.accounts.getAccountsByUser as jest.Mock).mockResolvedValue([
      currentAccount,
      closedAccount,
      unknownStatusAccount,
    ]);
    (db.inquiries.getInquiriesByUser as jest.Mock).mockResolvedValue([
      disputedInquiry,
    ]);

    const response = await GET(createMockRequest(BASE_URL));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.items).toEqual([]);
  });

  it("returns an honest empty array when the user has no credit data at all", async () => {
    authenticate();
    (db.accounts.getAccountsByUser as jest.Mock).mockResolvedValue([]);
    (db.inquiries.getInquiriesByUser as jest.Mock).mockResolvedValue([]);

    const response = await GET(createMockRequest(BASE_URL));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.items).toEqual([]);
  });

  it("returns 401 when the request is not authenticated (handler never runs)", async () => {
    (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
      valid: false,
      user: null,
    });

    const response = await GET(createMockRequest(BASE_URL));

    expect(response.status).toBe(401);
    expect(db.accounts.getAccountsByUser).not.toHaveBeenCalled();
    expect(db.inquiries.getInquiriesByUser).not.toHaveBeenCalled();
  });

  it("is IDOR-safe: ignores a client-supplied userId and scopes to the session user", async () => {
    authenticate();
    (db.accounts.getAccountsByUser as jest.Mock).mockResolvedValue([]);
    (db.inquiries.getInquiriesByUser as jest.Mock).mockResolvedValue([]);

    await GET(createMockRequest(`${BASE_URL}?userId=attacker-999`));

    expect(db.accounts.getAccountsByUser).toHaveBeenCalledTimes(1);
    expect(db.inquiries.getInquiriesByUser).toHaveBeenCalledTimes(1);
    const [scopedAccountsUserId] = (db.accounts.getAccountsByUser as jest.Mock)
      .mock.calls[0];
    const [scopedInquiriesUserId] = (
      db.inquiries.getInquiriesByUser as jest.Mock
    ).mock.calls[0];
    expect(scopedAccountsUserId).toBe(mockUser.id);
    expect(scopedInquiriesUserId).toBe(mockUser.id);
    expect(scopedAccountsUserId).not.toBe("attacker-999");
  });

  it("returns an honest 503 (no mock fallback) when a data read fails", async () => {
    authenticate();
    (db.accounts.getAccountsByUser as jest.Mock).mockRejectedValue(
      new Error("Failed to get accounts: connection reset"),
    );
    (db.inquiries.getInquiriesByUser as jest.Mock).mockResolvedValue([]);

    const response = await GET(createMockRequest(BASE_URL));
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.error).toBeDefined();
    expect(data.message).toBe("Failed to get disputable items");
    expect(data.items).toBeUndefined();
    expect(auditLogger.logSecurityEvent).toHaveBeenCalled();
  });

  it("still returns 503 when the error-path audit log also fails", async () => {
    authenticate();
    (db.inquiries.getInquiriesByUser as jest.Mock).mockRejectedValue(
      new Error("Failed to get inquiries: timeout"),
    );
    (db.accounts.getAccountsByUser as jest.Mock).mockResolvedValue([]);
    (auditLogger.logSecurityEvent as jest.Mock).mockRejectedValue(
      new Error("audit sink down"),
    );

    const response = await GET(createMockRequest(BASE_URL));
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.message).toBe("Failed to get disputable items");
  });
});
