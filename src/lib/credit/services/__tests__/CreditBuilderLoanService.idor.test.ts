/**
 * IDOR regression tests for CreditBuilderLoanService (TASK-CRD-2)
 *
 * Confirms that updateApplication is scoped to the requesting user.
 * A caller presenting a cross-user applicationId with the wrong userId
 * must not mutate user A's loan application row.
 *
 * Mocking style mirrors the existing CreditBuilderLoanService.test.ts
 * (jest.mock hoisted at module top; createClient configured per-test via
 * mockCreateClient.mockReturnValue(chain)).
 */

// Mock @supabase/supabase-js before any import
jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(),
  SupabaseClient: class {},
}));

import { createClient } from "@supabase/supabase-js";
import { CreditBuilderLoanService } from "../CreditBuilderLoanService";

const mockCreateClient = createClient as jest.Mock;

const APP_ID = "app-a-id";
const USER_A = "user-a-id";
const USER_B = "user-b-id";

const _appRow = {
  id: APP_ID,
  user_id: USER_A,
  loan_id: "self-credit-builder",
  provider: "self",
  status: "started",
  applied_date: "2026-01-01T00:00:00.000Z",
  payments_made: 0,
  payments_remaining: 12,
  on_time_payments: 0,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

/**
 * Build a stateful Supabase query chain that enforces user-scoping.
 * The chain records which .eq() filters have been applied and resolves
 * .single() based on whether both "id" and "user_id" match user A.
 */
function makeScopedChain(ownerUserId: string, resourceId: string) {
  const filters: Record<string, unknown> = {};
  const chain: Record<string, jest.Mock> = {} as Record<string, jest.Mock>;

  chain.eq = jest.fn((col: string, val: unknown) => {
    filters[col] = val;
    return chain;
  });
  chain.select = jest.fn().mockReturnValue(chain);
  chain.update = jest.fn().mockReturnValue(chain);
  chain.insert = jest.fn().mockReturnValue(chain);
  chain.order = jest.fn().mockReturnValue(chain);
  chain.from = jest.fn().mockReturnValue(chain);

  chain.single = jest.fn(() => {
    const owned =
      filters["id"] === resourceId && filters["user_id"] === ownerUserId;
    return Promise.resolve(
      owned
        ? { data: _appRow, error: null }
        : {
            data: null,
            error: { code: "PGRST116", message: "Not found" },
          },
    );
  });

  return chain;
}

describe("idor — CreditBuilderLoanService user-scoping (TASK-CRD-2)", () => {
  let svc: CreditBuilderLoanService;

  beforeEach(() => {
    // The scoped chain enforces: only USER_A + APP_ID resolves successfully.
    const chain = makeScopedChain(USER_A, APP_ID);
    mockCreateClient.mockReturnValue(chain);
    svc = new CreditBuilderLoanService("http://localhost", "service-role-key");
  });

  describe("updateApplication", () => {
    it("idor: user B cannot update user A's application — throws not-found error", async () => {
      await expect(
        svc.updateApplication(APP_ID, USER_B, { status: "approved" }),
      ).rejects.toMatchObject({ code: "PGRST116" });
    });

    it("user A can update their own application — resolves with updated record", async () => {
      const result = await svc.updateApplication(APP_ID, USER_A, {
        status: "approved",
      });
      expect(result).not.toBeNull();
      expect(result.id).toBe(APP_ID);
      expect(result.userId).toBe(USER_A);
    });
  });
});
