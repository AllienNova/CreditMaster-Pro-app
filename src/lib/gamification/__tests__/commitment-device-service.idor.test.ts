/**
 * IDOR regression tests — CommitmentDeviceService
 *
 * All methods that act on a specific resource now require a userId.
 * The service uses the service-role key, so RLS is bypassed and
 * explicit .eq("user_id", userId) is the only defence.
 *
 * These tests assert that:
 *   - User B cannot read / cancel / check-in on User A's contract.
 *   - Methods return null / [] or throw rather than serving cross-user data.
 */

import { CommitmentDeviceService } from "../commitment-device-service";

jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(),
}));

// ---------------------------------------------------------------------------
// Minimal chainable Supabase mock
// ---------------------------------------------------------------------------

function buildChain(terminal: Record<string, unknown>) {
  const chain: Record<string, jest.Mock> = {};
  const methods = ["eq", "select", "insert", "update", "single", "order", "limit", "in"];
  methods.forEach((m) => {
    chain[m] = jest.fn().mockImplementation(() => chain);
  });
  // Merge terminal values onto the chain object so awaiting returns them
  Object.assign(chain, terminal);
  return chain;
}

function createMockSupabase() {
  const mock = {
    from: jest.fn(),
  };
  return mock;
}

const USER_A = "user-a-111";
const USER_B = "user-b-222";
const CONTRACT_ID = "contract-xyz";

let supabase: ReturnType<typeof createMockSupabase>;
let service: CommitmentDeviceService;

beforeEach(() => {
  supabase = createMockSupabase();
  const { createClient } = require("@supabase/supabase-js");
  (createClient as jest.Mock).mockReturnValue(supabase);
  service = new CommitmentDeviceService("https://test.supabase.co", "test-key");
});

// ---------------------------------------------------------------------------
// getContract — idor
// ---------------------------------------------------------------------------

describe("getContract — IDOR", () => {
  it("returns null when userId does not match the contract owner", async () => {
    // Simulate DB returning no row (because the .eq("user_id", userId) filter
    // excludes User A's contract when called with User B's id)
    const chain = buildChain({ data: null, error: null });
    supabase.from.mockReturnValue(chain);

    const result = await service.getContract(CONTRACT_ID, USER_B);
    expect(result).toBeNull();
  });

  it("returns contract only when userId matches", async () => {
    const contractRow = {
      id: CONTRACT_ID,
      user_id: USER_A,
      goal_id: "goal-1",
      goal_name: "Save $1000",
      goal_target: 1000,
      goal_unit: "dollars",
      type: "charity_donation",
      status: "active",
      accountability_partner_ids: [],
      is_public: false,
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 86400000).toISOString(),
      check_in_frequency: "weekly",
      current_progress: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // First call: getContract outer query
    // Second call: getCheckIns inner ownership check
    // Third call: getCheckIns actual check-ins query
    let callCount = 0;
    supabase.from.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return buildChain({ data: contractRow, error: null });
      if (callCount === 2) return buildChain({ data: { id: CONTRACT_ID }, error: null });
      return buildChain({ data: [], error: null });
    });

    const result = await service.getContract(CONTRACT_ID, USER_A);
    expect(result).not.toBeNull();
    expect(result!.userId).toBe(USER_A);
  });
});

// ---------------------------------------------------------------------------
// cancelContract — idor
// ---------------------------------------------------------------------------

describe("cancelContract — IDOR", () => {
  it("scopes update to caller's userId (cross-user call is a no-op on the DB)", async () => {
    const chain = buildChain({ data: null, error: null });
    supabase.from.mockReturnValue(chain);

    // Should not throw even when no rows matched (cross-user)
    await expect(service.cancelContract(CONTRACT_ID, USER_B)).resolves.toBeUndefined();

    // Verify .eq("user_id", USER_B) was called — the update chain must carry it
    const updateChain = supabase.from.mock.results[0].value;
    expect(updateChain.eq).toHaveBeenCalledWith("user_id", USER_B);
  });
});

// ---------------------------------------------------------------------------
// getCheckIns — idor
// ---------------------------------------------------------------------------

describe("getCheckIns — IDOR", () => {
  it("returns empty array when the contract does not belong to the caller", async () => {
    // Ownership check returns no data → early return []
    const chain = buildChain({ data: null, error: null });
    supabase.from.mockReturnValue(chain);

    const result = await service.getCheckIns(CONTRACT_ID, USER_B);
    expect(result).toEqual([]);
  });

  it("returns check-ins only when contract ownership is confirmed", async () => {
    const checkInRow = {
      id: "checkin-1",
      contract_id: CONTRACT_ID,
      date: new Date().toISOString(),
      progress: 50,
      verified: true,
      verified_by: "self",
    };

    let callCount = 0;
    supabase.from.mockImplementation(() => {
      callCount++;
      // First call: ownership check returns matching row
      if (callCount === 1) return buildChain({ data: { id: CONTRACT_ID }, error: null });
      // Second call: actual check-ins
      return buildChain({ data: [checkInRow], error: null });
    });

    const result = await service.getCheckIns(CONTRACT_ID, USER_A);
    expect(result).toHaveLength(1);
    expect(result[0].contractId).toBe(CONTRACT_ID);
  });
});

// ---------------------------------------------------------------------------
// recordCheckIn — idor
// ---------------------------------------------------------------------------

describe("recordCheckIn — IDOR", () => {
  it("throws when contract not found for the caller (cross-user)", async () => {
    // getContract returns null for USER_B on USER_A's contract
    supabase.from.mockReturnValue(buildChain({ data: null, error: null }));

    await expect(
      service.recordCheckIn(CONTRACT_ID, USER_B, 50),
    ).rejects.toThrow("Contract not found");
  });
});

// ---------------------------------------------------------------------------
// evaluateContract — idor
// ---------------------------------------------------------------------------

describe("evaluateContract — IDOR", () => {
  it("throws when contract not found for the caller (cross-user)", async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: null }));

    await expect(
      service.evaluateContract(CONTRACT_ID, USER_B),
    ).rejects.toThrow("Contract not found");
  });
});
