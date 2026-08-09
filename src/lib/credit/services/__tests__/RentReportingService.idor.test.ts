/**
 * IDOR regression tests for RentReportingIntegrationService (TASK-CRD-2)
 *
 * Confirms that updateAccount and getPaymentHistory are scoped to the
 * requesting user. A caller presenting a cross-user resource id with the wrong
 * userId must not read or mutate user A's rent reporting data.
 *
 * Mocking style mirrors the existing RentReportingService.test.ts
 * (jest.mock hoisted at module top; createClient configured per-test via
 * mockCreateClient.mockReturnValue(chain)).
 */

// Mock @supabase/supabase-js before any import
jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(),
  SupabaseClient: class {},
}));

import { createClient } from "@supabase/supabase-js";
import { RentReportingIntegrationService } from "../RentReportingService";

const mockCreateClient = createClient as jest.Mock;

const ACCOUNT_ID = "acc-a-id";
const USER_A = "user-a-id";
const USER_B = "user-b-id";

const _accountRow = {
  id: ACCOUNT_ID,
  user_id: USER_A,
  provider: "boom",
  status: "reporting",
  landlord_name: "Test Landlord",
  landlord_email: null,
  landlord_phone: null,
  property_address: "123 Main St",
  monthly_rent: 1500,
  lease_start_date: "2024-01-01T00:00:00.000Z",
  lease_end_date: null,
  verification_status: "verified",
  verification_method: "bank",
  verified_at: null,
  reporting_start_date: null,
  historical_months_reported: 0,
  total_payments_reported: 12,
  on_time_payments: 12,
  late_payments: 0,
  missed_payments: 0,
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-01T00:00:00.000Z",
};

const _paymentRow = {
  id: "pay-1",
  account_id: ACCOUNT_ID,
  user_id: USER_A,
  amount: 1500,
  due_date: "2024-02-01T00:00:00.000Z",
  paid_date: null,
  status: "on_time",
  reported_to_credit: true,
  reported_date: null,
  bureaus_reported: ["experian"],
  created_at: "2024-02-01T00:00:00.000Z",
};

/**
 * Build a stateful Supabase query chain that enforces user-scoping for the
 * rent reporting service. Separate logic for rent_reporting_accounts vs
 * rent_payments tables.
 */
function makeScopedChain(ownerUserId: string, accountId: string) {
  // Track filters separately per-invocation. Each call to .from() builds a new
  // sub-chain so that the rent_payments query doesn't bleed into the accounts query.
  const makeTableChain = (table: string) => {
    const filters: Record<string, unknown> = {};
    const sub: Record<string, jest.Mock> = {} as Record<string, jest.Mock>;

    sub.eq = jest.fn((col: string, val: unknown) => {
      filters[col] = val;
      return sub;
    });
    sub.select = jest.fn().mockReturnValue(sub);
    sub.update = jest.fn().mockReturnValue(sub);
    sub.insert = jest.fn().mockReturnValue(sub);

    sub.order = jest.fn((_col: string) => {
      if (table === "rent_payments") {
        // getPaymentHistory awaits order() directly
        const owned =
          filters["account_id"] === accountId &&
          filters["user_id"] === ownerUserId;
        return Promise.resolve({
          data: owned ? [_paymentRow] : [],
          error: null,
        });
      }
      // rent_reporting_accounts order() — used by getUserAccounts (not under test here)
      return Promise.resolve({ data: [], error: null });
    });

    sub.single = jest.fn(() => {
      if (table === "rent_reporting_accounts") {
        // updateAccount resolves to a row only when id + user_id both match owner
        const owned =
          filters["id"] === accountId && filters["user_id"] === ownerUserId;
        return Promise.resolve(
          owned
            ? { data: _accountRow, error: null }
            : {
                data: null,
                error: { code: "PGRST116", message: "Not found" },
              },
        );
      }
      return Promise.resolve({
        data: null,
        error: { code: "PGRST116", message: "Not found" },
      });
    });

    return sub;
  };

  return {
    from: jest.fn((table: string) => makeTableChain(table)),
  };
}

describe("idor — RentReportingIntegrationService user-scoping (TASK-CRD-2)", () => {
  let svc: RentReportingIntegrationService;

  beforeEach(() => {
    const client = makeScopedChain(USER_A, ACCOUNT_ID);
    mockCreateClient.mockReturnValue(client);
    svc = new RentReportingIntegrationService("http://localhost", "service-role-key");
  });

  // --------------------------------------------------------------------------
  // updateAccount
  // --------------------------------------------------------------------------

  describe("updateAccount", () => {
    it("idor: user B cannot update user A's account — throws not-found error", async () => {
      await expect(
        svc.updateAccount(ACCOUNT_ID, USER_B, { status: "paused" }),
      ).rejects.toMatchObject({ code: "PGRST116" });
    });

    it("user A can update their own account — resolves with updated record", async () => {
      const result = await svc.updateAccount(ACCOUNT_ID, USER_A, {
        status: "paused",
      });
      expect(result).not.toBeNull();
      expect(result.id).toBe(ACCOUNT_ID);
      expect(result.userId).toBe(USER_A);
    });
  });

  // --------------------------------------------------------------------------
  // getPaymentHistory
  // --------------------------------------------------------------------------

  describe("getPaymentHistory", () => {
    it("idor: user B cannot read user A's payment history — resolves empty array", async () => {
      const result = await svc.getPaymentHistory(ACCOUNT_ID, USER_B);
      expect(result).toEqual([]);
    });

    it("user A can read their own payment history — resolves with payments", async () => {
      const result = await svc.getPaymentHistory(ACCOUNT_ID, USER_A);
      expect(result).toHaveLength(1);
      expect(result[0].accountId).toBe(ACCOUNT_ID);
    });
  });
});
