/**
 * IDOR regression tests — SharedGoalsService
 *
 * recordContribution, postUpdate, getUpdates, inviteMember, sendNudge all
 * require the caller's userId and call assertMember() which verifies the
 * caller is an active member of the goal before proceeding.
 *
 * Cross-user calls (User B acting on User A's goal) must throw.
 */

import { SharedGoalsService } from "../shared-goals-service";

jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(),
}));

function buildChain(terminal: Record<string, unknown>) {
  const chain: Record<string, jest.Mock> = {};
  const methods = ["eq", "select", "insert", "update", "single", "order", "limit", "in"];
  methods.forEach((m) => {
    chain[m] = jest.fn().mockImplementation(() => chain);
  });
  Object.assign(chain, terminal);
  return chain;
}

const USER_A = "user-a-111";
const USER_B = "user-b-222";
const GOAL_ID = "goal-xyz";

let supabase: { from: jest.Mock };
let service: SharedGoalsService;

beforeEach(() => {
  supabase = { from: jest.fn() };
  const { createClient } = require("@supabase/supabase-js");
  (createClient as jest.Mock).mockReturnValue(supabase);
  service = new SharedGoalsService("https://test.supabase.co", "test-key");
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Simulate assertMember returning "not a member" for the given userId */
function mockNotMember() {
  supabase.from.mockReturnValue(buildChain({ data: null, error: null }));
}

/** Simulate assertMember passing for USER_A then further DB calls returning empty */
function mockMemberThenEmpty() {
  let callCount = 0;
  supabase.from.mockImplementation(() => {
    callCount++;
    // First call is always assertMember (shared_goal_members)
    if (callCount === 1) return buildChain({ data: { id: "member-row" }, error: null });
    return buildChain({ data: null, error: null });
  });
}

// ---------------------------------------------------------------------------
// recordContribution — IDOR
// ---------------------------------------------------------------------------

describe("recordContribution — IDOR", () => {
  it("throws when caller is not a member (cross-user)", async () => {
    mockNotMember();

    await expect(
      service.recordContribution(GOAL_ID, USER_B, "member-b", "Bob", 100),
    ).rejects.toThrow("Not a member of this goal");
  });

  it("calls assertMember with goalId and userId", async () => {
    mockNotMember();

    try {
      await service.recordContribution(GOAL_ID, USER_B, "member-b", "Bob", 100);
    } catch {
      // expected
    }

    // The first .from() call must be shared_goal_members
    expect(supabase.from).toHaveBeenCalledWith("shared_goal_members");
    const memberChain = supabase.from.mock.results[0].value;
    expect(memberChain.eq).toHaveBeenCalledWith("user_id", USER_B);
  });
});

// ---------------------------------------------------------------------------
// postUpdate — IDOR
// ---------------------------------------------------------------------------

describe("postUpdate — IDOR", () => {
  it("throws when caller is not a member (cross-user)", async () => {
    mockNotMember();

    await expect(
      service.postUpdate(GOAL_ID, USER_B, "Bob", "message", "Hello!"),
    ).rejects.toThrow("Not a member of this goal");
  });
});

// ---------------------------------------------------------------------------
// getUpdates — IDOR
// ---------------------------------------------------------------------------

describe("getUpdates — IDOR", () => {
  it("throws when caller is not a member (cross-user)", async () => {
    mockNotMember();

    await expect(service.getUpdates(GOAL_ID, USER_B)).rejects.toThrow(
      "Not a member of this goal",
    );
  });

  it("returns updates when caller is a member", async () => {
    const updateRow = {
      id: "update-1",
      goal_id: GOAL_ID,
      author_name: "Alice",
      type: "message",
      content: "Great progress!",
      created_at: new Date().toISOString(),
    };

    let callCount = 0;
    supabase.from.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return buildChain({ data: { id: "member-row" }, error: null });
      return buildChain({ data: [updateRow], error: null });
    });

    const result = await service.getUpdates(GOAL_ID, USER_A);
    expect(result).toHaveLength(1);
    expect(result[0].goalId).toBe(GOAL_ID);
  });
});

// ---------------------------------------------------------------------------
// inviteMember — IDOR
// ---------------------------------------------------------------------------

describe("inviteMember — IDOR", () => {
  it("throws when caller is not a member (cross-user)", async () => {
    mockNotMember();

    await expect(
      service.inviteMember(GOAL_ID, USER_B, "Bob", "alice@example.com"),
    ).rejects.toThrow("Not a member of this goal");
  });
});

// ---------------------------------------------------------------------------
// sendNudge — IDOR (delegates to postUpdate)
// ---------------------------------------------------------------------------

describe("sendNudge — IDOR", () => {
  it("throws when caller is not a member (cross-user)", async () => {
    mockNotMember();

    await expect(
      service.sendNudge(GOAL_ID, USER_B, "Bob"),
    ).rejects.toThrow("Not a member of this goal");
  });
});
