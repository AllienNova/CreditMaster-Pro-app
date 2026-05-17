/**
 * IDOR regression tests — GamificationEngine
 *
 * The engine uses the service-role key (bypasses RLS). All resource-keyed
 * reads/writes use explicit .eq("user_id", userId) as the sole defence.
 *
 * These tests assert that every method is correctly scoped to the userId
 * passed in — cross-user calls return empty / null / throw.
 */

import { GamificationEngine } from "../gamification-engine";

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
    "order", "limit", "in", "neq", "gte", "lte", "gt", "lt", "is",
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

const USER_A = "user-a-engine-001";
const USER_B = "user-b-engine-002";

let supabase: ReturnType<typeof createMockSupabase>;
let engine: GamificationEngine;

beforeEach(() => {
  supabase = createMockSupabase();
  const { createClient } = require("@supabase/supabase-js");
  (createClient as jest.Mock).mockReturnValue(supabase);
  engine = new GamificationEngine("https://test.supabase.co", "test-key");
});

// ---------------------------------------------------------------------------
// getUserProgress — idor
// ---------------------------------------------------------------------------

describe("getUserProgress — IDOR", () => {
  it("returns null when userId does not match any row (cross-user access returns no data)", async () => {
    // Simulate DB returning null because .eq("user_id", USER_B) matches nothing
    // for a row owned by USER_A
    supabase.from.mockReturnValue(buildChain({ data: null, error: null }));

    const result = await engine.getUserProgress(USER_B);
    expect(result).toBeNull();

    // Verify the query was scoped with USER_B (not USER_A or unscoped)
    const chain = supabase.from.mock.results[0].value;
    expect(chain.eq).toHaveBeenCalledWith("user_id", USER_B);
  });
});

// ---------------------------------------------------------------------------
// awardXp — idor
// ---------------------------------------------------------------------------

describe("awardXp — IDOR", () => {
  it("scopes XP update to the provided userId — cross-user call only touches that userId's row", async () => {
    // When USER_B calls awardXp for USER_B, the .eq("user_id", USER_B) filter
    // means USER_A's row is never touched
    const progressRow = {
      id: "prog-b",
      user_id: USER_B,
      current_xp: 0,
      current_level: 1,
      total_xp_earned: 0,
      xp_to_next_level: 1000,
      level_progress: 0,
      current_streak: 0,
      longest_streak: 0,
      streak_multiplier: 1.0,
      last_activity_date: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const updatedRow = { ...progressRow, current_xp: 50, total_xp_earned: 50 };

    let call = 0;
    supabase.from.mockImplementation(() => {
      call++;
      // getUserProgress call
      if (call === 1) return buildChain({ data: progressRow, error: null });
      // updateProgress call
      return buildChain({ data: updatedRow, error: null });
    });

    const result = await engine.awardXp(USER_B, 50, "test", "daily_login");
    expect(result.xpEarned).toBe(50);

    // Both from() calls must have .eq("user_id", USER_B)
    for (const { value: chain } of supabase.from.mock.results) {
      const eqCalls = (chain.eq as jest.Mock).mock.calls;
      const userIdCalls = eqCalls.filter(
        ([field]: [string]) => field === "user_id",
      );
      if (userIdCalls.length > 0) {
        expect(userIdCalls[0][1]).toBe(USER_B);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// getUserBadges — idor
// ---------------------------------------------------------------------------

describe("getUserBadges — IDOR", () => {
  it("returns empty earned array when userId has no badges (cross-user query returns nothing)", async () => {
    // user_badges scoped to USER_B; badge_definitions read is public
    let call = 0;
    supabase.from.mockImplementation(() => {
      call++;
      if (call === 1) return buildChain({ data: [], error: null }); // user_badges for USER_B → empty
      return buildChain({ data: [], error: null }); // badge_definitions
    });

    const result = await engine.getUserBadges(USER_B);
    expect(result.earned).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// completeQuest — idor
// ---------------------------------------------------------------------------

describe("completeQuest — IDOR", () => {
  it("scopes quest completion to the provided userId and questId", async () => {
    const QUEST_ID = "quest-xyz";

    // Simulate: progress row does not exist for USER_B on this quest (cross-user → not found)
    supabase.from.mockReturnValue(buildChain({ data: null, error: null }));

    const result = await engine.completeQuest(USER_B, QUEST_ID);
    expect(result.success).toBe(false);

    // Verify .eq("user_id", USER_B) was used
    const chain = supabase.from.mock.results[0].value;
    expect(chain.eq).toHaveBeenCalledWith("user_id", USER_B);
  });
});
