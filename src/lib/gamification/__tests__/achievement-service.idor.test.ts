/**
 * IDOR regression tests — AchievementService
 *
 * The service uses service-role key (bypasses RLS). All resource-keyed
 * operations use explicit .eq("user_id", userId) as the sole defence.
 *
 * These tests assert that cross-user access is blocked at the DB filter level:
 *   - User B's userId returns no rows for User A's achievements
 *   - Notification reads are scoped to the caller
 */

import { AchievementService } from "../achievement-service";

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
    "order", "limit", "in", "gte", "lte", "neq", "is",
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

const USER_A = "user-a-achievement-001";
const USER_B = "user-b-achievement-002";
const ACHIEVEMENT_ID = "achievement-xyz";

let supabase: ReturnType<typeof createMockSupabase>;
let service: AchievementService;

beforeEach(() => {
  supabase = createMockSupabase();
  const { createClient } = require("@supabase/supabase-js");
  (createClient as jest.Mock).mockReturnValue(supabase);
  service = new AchievementService("https://test.supabase.co", "test-key");
});

// ---------------------------------------------------------------------------
// getUserAchievements — idor
// ---------------------------------------------------------------------------

describe("getUserAchievements — IDOR", () => {
  it("returns empty array when userId has no achievements (cross-user access → empty)", async () => {
    // user_achievements scoped to USER_B → no rows because they belong to USER_A
    let call = 0;
    supabase.from.mockImplementation(() => {
      call++;
      if (call === 1) return buildChain({ data: [], error: null }); // user_achievements for USER_B
      return buildChain({ data: [], error: null }); // achievement_definitions
    });

    const result = await service.getUserAchievements(USER_B);
    expect(result).toHaveLength(0);

    // The first from() call fetches achievement_definitions (public, scoped by is_active).
    // The second from() call fetches user_achievements and MUST be scoped by user_id.
    const chain = supabase.from.mock.results[1].value;
    expect(chain.eq).toHaveBeenCalledWith("user_id", USER_B);
  });
});

// ---------------------------------------------------------------------------
// updateProgress — idor
// ---------------------------------------------------------------------------

describe("updateProgress — IDOR", () => {
  it("scopes the user_achievements lookup to userId (cross-user returns no existing row → inserts for that userId)", async () => {
    const definition = {
      id: ACHIEVEMENT_ID,
      code: "first_budget",
      name: "Budget Starter",
      description: "Create your first budget",
      icon: "clipboard",
      category: "financial",
      tier: "bronze",
      xp_reward: 100,
      badge_id: null,
      conditions: [{ metric: "budgets_created", operator: "gte", targetValue: 1, currentValue: 0, description: "1 budget" }],
      is_active: true,
      sort_order: 1,
      created_at: new Date().toISOString(),
    };

    let call = 0;
    supabase.from.mockImplementation(() => {
      call++;
      if (call === 1) return buildChain({ data: definition, error: null }); // getAchievementById
      if (call === 2) return buildChain({ data: null, error: null }); // user_achievements .eq("user_id", USER_B) → no row
      return buildChain({ data: { id: "ua-new" }, error: null }); // insert
    });

    const result = await service.updateProgress(USER_B, ACHIEVEMENT_ID, 50);
    expect(result.achievementId).toBe(ACHIEVEMENT_ID);

    // Verify the user_achievements lookup was scoped to USER_B
    const uaChain = supabase.from.mock.results[1].value;
    expect(uaChain.eq).toHaveBeenCalledWith("user_id", USER_B);
  });

  it("throws when achievement definition is not found", async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: null }));

    await expect(service.updateProgress(USER_B, "nonexistent-id", 50)).rejects.toThrow(
      "Achievement not found",
    );
  });
});

// ---------------------------------------------------------------------------
// getPendingNotifications — idor
// ---------------------------------------------------------------------------

describe("getPendingNotifications — IDOR", () => {
  it("returns empty array when userId has no pending notifications", async () => {
    supabase.from.mockReturnValue(buildChain({ data: [], error: null }));

    const result = await service.getPendingNotifications(USER_B);
    expect(result).toHaveLength(0);

    const chain = supabase.from.mock.results[0].value;
    expect(chain.eq).toHaveBeenCalledWith("user_id", USER_B);
  });
});

// ---------------------------------------------------------------------------
// awardAchievement — idor (only awards to the provided userId)
// ---------------------------------------------------------------------------

describe("awardAchievement — IDOR", () => {
  it("scopes the award insert to the provided userId, not to USER_A", async () => {
    // achievement_definitions → return a matching definition
    const definition = {
      id: ACHIEVEMENT_ID,
      code: "first_budget",
      name: "Budget Starter",
      description: "Create your first budget",
      category: "budget",
      tier: "bronze",
      xp_reward: 100,
      badge_id: null,
      conditions: [],
      is_active: true,
      created_at: new Date().toISOString(),
    };

    // existing user achievement → not already awarded
    let call = 0;
    supabase.from.mockImplementation(() => {
      call++;
      if (call === 1) return buildChain({ data: definition, error: null }); // getAchievementByCode
      if (call === 2) return buildChain({ data: null, error: null }); // existing user_achievements check → null
      if (call === 3) return buildChain({ data: { id: "ua-1" }, error: null }); // user_achievements insert
      return buildChain({ data: { id: "xp-1" }, error: null }); // xp_transactions insert
    });

    const result = await service.awardAchievement(USER_B, "first_budget");
    expect(result.success).toBe(true);

    // Verify insert carries user_id: USER_B (not USER_A)
    // call 3 → results[2] is the user_achievements insert chain
    const insertChain = supabase.from.mock.results[2].value;
    expect(insertChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: USER_B }),
    );
  });
});
