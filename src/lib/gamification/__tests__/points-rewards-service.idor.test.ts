/**
 * IDOR regression tests — PointsRewardsService
 *
 * The service uses service-role key (bypasses RLS). Every resource-keyed
 * operation uses explicit .eq("user_id", userId).
 *
 * Key risk: transferPoints(callerId, fromUserId, toUserId, amount)
 *   - callerId MUST equal fromUserId or the call is rejected
 *   - A route passing a body-sourced fromUserId would let attacker drain
 *     another user's points
 *
 * These tests assert:
 *   - Cross-user reads return null / empty
 *   - transferPoints rejects callerId !== fromUserId
 *   - transferPoints succeeds when callerId === fromUserId
 */

import { PointsRewardsService } from "../points-rewards-service";

jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(),
}));

// ---------------------------------------------------------------------------
// Minimal chainable Supabase mock
// ---------------------------------------------------------------------------

function buildChain(terminal: Record<string, unknown>) {
  const chain: Record<string, jest.Mock> = {};
  const methods = [
    "eq", "select", "insert", "update", "upsert", "single",
    "order", "limit", "in", "gte", "lte", "lt", "is",
  ];
  methods.forEach((m) => {
    chain[m] = jest.fn().mockImplementation(() => chain);
  });
  Object.assign(chain, terminal);
  return chain;
}

function createMockSupabase() {
  return { from: jest.fn() };
}

const USER_A = "user-a-points-001";
const USER_B = "user-b-points-002";

let supabase: ReturnType<typeof createMockSupabase>;
let service: PointsRewardsService;

beforeEach(() => {
  supabase = createMockSupabase();
  const { createClient } = require("@supabase/supabase-js");
  (createClient as jest.Mock).mockReturnValue(supabase);
  service = new PointsRewardsService("https://test.supabase.co", "test-key");
});

// ---------------------------------------------------------------------------
// getBalance — idor
// ---------------------------------------------------------------------------

describe("getBalance — IDOR", () => {
  it("returns null when userId matches no row (cross-user access → no data)", async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: null }));

    const result = await service.getBalance(USER_B);
    expect(result).toBeNull();

    const chain = supabase.from.mock.results[0].value;
    expect(chain.eq).toHaveBeenCalledWith("user_id", USER_B);
  });
});

// ---------------------------------------------------------------------------
// getTransactionHistory — idor
// ---------------------------------------------------------------------------

describe("getTransactionHistory — IDOR", () => {
  it("returns empty array when userId has no transactions", async () => {
    supabase.from.mockReturnValue(buildChain({ data: [], error: null }));

    const result = await service.getTransactionHistory(USER_B, 10);
    expect(result).toHaveLength(0);

    const chain = supabase.from.mock.results[0].value;
    expect(chain.eq).toHaveBeenCalledWith("user_id", USER_B);
  });
});

// ---------------------------------------------------------------------------
// transferPoints — caller binding (CRITICAL)
// ---------------------------------------------------------------------------

describe("transferPoints — IDOR caller binding", () => {
  it("rejects transfer when callerId does not equal fromUserId", async () => {
    // Attacker (USER_B) tries to transfer USER_A's points to themselves
    await expect(
      service.transferPoints(USER_B, USER_A, USER_B, 100),
    ).rejects.toThrow("Cannot transfer points on behalf of another user");
  });

  it("rejects transfer when callerId does not equal fromUserId (reversed)", async () => {
    // USER_A tries to transfer from USER_B
    await expect(
      service.transferPoints(USER_A, USER_B, USER_A, 100),
    ).rejects.toThrow("Cannot transfer points on behalf of another user");
  });

  it("allows transfer when callerId equals fromUserId", async () => {
    const fromRow = {
      id: "bal-a",
      user_id: USER_A,
      available_points: 500,
      total_points: 500,
      lifetime_earned: 1000,
      lifetime_spent: 500,
      lifetime_expired: 0,
      current_streak_days: 0,
      longest_streak_days: 0,
      streak_multiplier: 1.0,
      last_activity_date: null,
      tier: "bronze",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const toRow = { ...fromRow, user_id: USER_B, available_points: 100 };
    const updatedFrom = { ...fromRow, available_points: 400 };
    const updatedTo = { ...toRow, available_points: 200 };

    let call = 0;
    supabase.from.mockImplementation(() => {
      call++;
      if (call === 1) return buildChain({ data: fromRow, error: null }); // getBalance(from)
      if (call === 2) return buildChain({ data: toRow, error: null });   // getBalance(to)
      if (call === 3) return buildChain({ data: { id: "txn-1" }, error: null }); // recordTxn out
      if (call === 4) return buildChain({ data: updatedFrom, error: null }); // update from
      if (call === 5) return buildChain({ data: { id: "txn-2" }, error: null }); // recordTxn in
      return buildChain({ data: updatedTo, error: null }); // update to
    });

    // callerId === fromUserId → allowed
    const result = await service.transferPoints(USER_A, USER_A, USER_B, 100);
    expect(result.fromBalance).toBeDefined();
    expect(result.toBalance).toBeDefined();
  });

  it("rejects transfer of zero amount even when caller binding is correct", async () => {
    await expect(
      service.transferPoints(USER_A, USER_A, USER_B, 0),
    ).rejects.toThrow("Transfer amount must be positive");
  });
});

// ---------------------------------------------------------------------------
// redeemPoints — idor (scoped by userId)
// ---------------------------------------------------------------------------

describe("redeemPoints — IDOR", () => {
  it("throws when userId has no balance (cross-user access returns null)", async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: null }));

    await expect(service.redeemPoints(USER_B, "option_code")).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// expirePoints — idor (scoped by userId)
// ---------------------------------------------------------------------------

describe("expirePoints — IDOR", () => {
  it("returns 0 expired points when userId has no balance", async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: null }));

    const expired = await service.expirePoints(USER_B);
    expect(expired).toBe(0);
  });
});
