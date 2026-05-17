/**
 * IDOR tests for StudentLoanService
 *
 * Verifies that getStudentLoan / updateStudentLoan / deleteStudentLoan
 * are scoped to the owning user_id and cannot be exploited cross-user.
 *
 * Client construction: student-loan-service uses createClient(anon_key)
 * directly — the client is sessionless, so RLS sees the anonymous role and
 * does NOT protect the queries.  The fix adds explicit .eq("user_id", userId)
 * with userId threaded from the caller.
 *
 * NOTE: jest.config.js sets resetMocks: true, which resets all mock return
 * values before every test.  We therefore rebuild the entire mock client in
 * beforeEach, after importing createClient from the mocked module.
 */

jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(),
}));

import { createClient } from "@supabase/supabase-js";
import { StudentLoanService } from "../student-loan-service";
import type { StudentLoan } from "../../types/student-loan";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const OWNER_ID = "user-owner-123";
const ATTACKER_ID = "user-attacker-456";
const LOAN_ID = "loan-abc-789";

const ownerLoan: StudentLoan = {
  id: LOAN_ID,
  user_id: OWNER_ID,
  servicer: "Great Lakes",
  loanType: "federal",
  balance: 25000,
  interestRate: 5.5,
  status: "current",
  monthlyPayment: 280,
  originationDate: "2020-01-01",
  disbursementAmount: 30000,
};

// ---------------------------------------------------------------------------
// Mock builder — called in beforeEach because resetMocks:true wipes
// return values between tests.
// ---------------------------------------------------------------------------

function buildMockClient() {
  const single = jest.fn();
  const eq = jest.fn();
  const chain = {
    select: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    eq,
    single,
  };
  // .eq() is fluent by default; individual tests override the terminal call.
  eq.mockReturnValue(chain);

  const from = jest.fn().mockReturnValue(chain);
  const mockClient = { from };

  (createClient as jest.Mock).mockReturnValue(mockClient);

  return { chain, from, single, eq };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("StudentLoanService — IDOR", () => {
  let service: StudentLoanService;
  let mocks: ReturnType<typeof buildMockClient>;

  beforeEach(() => {
    // resetMocks:true already cleared all mocks; rebuild the client.
    mocks = buildMockClient();
    service = new StudentLoanService();
  });

  // -------------------------------------------------------------------------
  // getStudentLoan
  // -------------------------------------------------------------------------
  describe("getStudentLoan", () => {
    it("returns the loan when the caller is the owner", async () => {
      mocks.single.mockResolvedValueOnce({ data: ownerLoan, error: null });

      const result = await service.getStudentLoan(LOAN_ID, OWNER_ID);

      // Both id and user_id must have been used as filter columns.
      const eqCalls: [string, string][] = mocks.eq.mock.calls;
      const hasIdFilter = eqCalls.some(([col, val]) => col === "id" && val === LOAN_ID);
      const hasUserFilter = eqCalls.some(
        ([col, val]) => col === "user_id" && val === OWNER_ID,
      );
      expect(hasIdFilter).toBe(true);
      expect(hasUserFilter).toBe(true);
      expect(result?.id).toBe(LOAN_ID);
    });

    it("returns null when a different user requests the same loan ID (cross-user IDOR)", async () => {
      // DB returns no row because user_id filter does not match the owner.
      mocks.single.mockResolvedValueOnce({
        data: null,
        error: { code: "PGRST116", message: "No rows found" },
      });

      const result = await service.getStudentLoan(LOAN_ID, ATTACKER_ID);

      // The query must be scoped to the attacker's user_id, not the owner's.
      const eqCalls: [string, string][] = mocks.eq.mock.calls;
      const hasAttackerFilter = eqCalls.some(
        ([col, val]) => col === "user_id" && val === ATTACKER_ID,
      );
      expect(hasAttackerFilter).toBe(true);
      expect(result).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // updateStudentLoan
  // -------------------------------------------------------------------------
  describe("updateStudentLoan", () => {
    it("applies user_id scope when owner updates their own loan", async () => {
      mocks.single.mockResolvedValueOnce({
        data: { ...ownerLoan, balance: 24000 },
        error: null,
      });

      const result = await service.updateStudentLoan(LOAN_ID, OWNER_ID, {
        balance: 24000,
      });

      const eqCalls: [string, string][] = mocks.eq.mock.calls;
      const hasUserFilter = eqCalls.some(
        ([col, val]) => col === "user_id" && val === OWNER_ID,
      );
      expect(hasUserFilter).toBe(true);
      expect(result.balance).toBe(24000);
    });

    it("throws when attacker tries to update another user's loan (DB returns no rows)", async () => {
      mocks.single.mockResolvedValueOnce({
        data: null,
        error: { code: "PGRST116", message: "No rows found" },
      });

      await expect(
        service.updateStudentLoan(LOAN_ID, ATTACKER_ID, { balance: 0 }),
      ).rejects.toBeDefined();

      const eqCalls: [string, string][] = mocks.eq.mock.calls;
      const hasAttackerFilter = eqCalls.some(
        ([col, val]) => col === "user_id" && val === ATTACKER_ID,
      );
      expect(hasAttackerFilter).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // deleteStudentLoan
  // -------------------------------------------------------------------------
  describe("deleteStudentLoan", () => {
    it("applies user_id scope when owner deletes their own loan", async () => {
      // deleteStudentLoan: from().delete().eq(id).eq(user_id) — the service
      // awaits the whole chain.  The terminal .eq("user_id", ...) must resolve.
      mocks.eq
        .mockReturnValueOnce(mocks.chain) // .eq("id", ...) → chain
        .mockResolvedValueOnce({ error: null }); // .eq("user_id", ...) → resolves

      await service.deleteStudentLoan(LOAN_ID, OWNER_ID);

      const eqCalls: [string, string][] = mocks.eq.mock.calls;
      const hasIdFilter = eqCalls.some(([col, val]) => col === "id" && val === LOAN_ID);
      const hasUserFilter = eqCalls.some(
        ([col, val]) => col === "user_id" && val === OWNER_ID,
      );
      expect(hasIdFilter).toBe(true);
      expect(hasUserFilter).toBe(true);
    });

    it("does not delete another user's loan (cross-user IDOR)", async () => {
      // DB silently affects 0 rows when user_id doesn't match — no error.
      mocks.eq
        .mockReturnValueOnce(mocks.chain)
        .mockResolvedValueOnce({ error: null });

      await expect(
        service.deleteStudentLoan(LOAN_ID, ATTACKER_ID),
      ).resolves.toBeUndefined();

      const eqCalls: [string, string][] = mocks.eq.mock.calls;
      const hasAttackerFilter = eqCalls.some(
        ([col, val]) => col === "user_id" && val === ATTACKER_ID,
      );
      expect(hasAttackerFilter).toBe(true);
    });
  });
});
