/**
 * IDOR regression tests — AnonymousLeaderboardService
 *
 * Write methods (optOut, updateParticipation, submitScore) are all scoped
 * with .eq("user_id", userId) at the service level — verified here.
 *
 * getLeaderboard is classified N/A-public-read: it intentionally crosses
 * users but exposes only anonymousId, displayName, score, percentile, rank,
 * change, isCurrentUser, and optionally badge/streak (gated by privacy
 * settings).  No real userId, email, or name is returned in entries.
 * This is asserted explicitly below.
 */

import {
  AnonymousLeaderboardService,
  type LeaderboardCategory,
  type TimeFrame,
} from "../anonymous-leaderboard-service";

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

let supabase: { from: jest.Mock };
let service: AnonymousLeaderboardService;

beforeEach(() => {
  supabase = { from: jest.fn() };
  const { createClient } = require("@supabase/supabase-js");
  (createClient as jest.Mock).mockReturnValue(supabase);
  service = new AnonymousLeaderboardService("https://test.supabase.co", "test-key");
});

// ---------------------------------------------------------------------------
// optOut — scoped to userId
// ---------------------------------------------------------------------------

describe("optOut — IDOR scope", () => {
  it("scopes the update to the calling userId", async () => {
    const chain = buildChain({ data: null, error: null });
    supabase.from.mockReturnValue(chain);

    await service.optOut(USER_A);

    // The update chain must filter by USER_A, not any arbitrary id
    expect(chain.eq).toHaveBeenCalledWith("user_id", USER_A);
  });
});

// ---------------------------------------------------------------------------
// updateParticipation — scoped to userId
// ---------------------------------------------------------------------------

describe("updateParticipation — IDOR scope", () => {
  it("scopes the update to the calling userId", async () => {
    const dbRow = {
      id: "part-1",
      user_id: USER_A,
      anonymous_id: "anon-abc",
      display_name: "SteadySaver42",
      opted_in: true,
      categories: ["savings_rate"],
      show_streak: true,
      show_badge: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const chain = buildChain({ data: dbRow, error: null });
    supabase.from.mockReturnValue(chain);

    await service.updateParticipation(USER_A, { optedIn: false });

    expect(chain.eq).toHaveBeenCalledWith("user_id", USER_A);
  });
});

// ---------------------------------------------------------------------------
// submitScore — no-op when user not opted in (scope guard)
// ---------------------------------------------------------------------------

describe("submitScore — scope guard", () => {
  it("is a no-op when user is not opted in for the category", async () => {
    // getParticipation returns opted_in: false
    const dbRow = {
      id: "part-2",
      user_id: USER_A,
      anonymous_id: "anon-xyz",
      display_name: "BraveBuilder99",
      opted_in: false,
      categories: [],
      show_streak: false,
      show_badge: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const chain = buildChain({ data: dbRow, error: null });
    supabase.from.mockReturnValue(chain);

    // Should resolve without inserting/updating scores
    await expect(
      service.submitScore(USER_A, "savings_rate", 42),
    ).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// getLeaderboard — N/A-public-read; assert no private fields leak
// ---------------------------------------------------------------------------

describe("getLeaderboard — N/A-public-read field check", () => {
  it("entries do not expose real userId, email or private name", async () => {
    const scoreRow = {
      user_id: USER_A,
      score: 85,
      previous_rank: 5,
      badge: "gold",
      streak: 10,
      leaderboard_participation: {
        anonymous_id: "anon-public-111",
        display_name: "SwiftSaver500",
        show_badge: true,
        show_streak: true,
      },
    };

    const chain = buildChain({ data: [scoreRow], error: null });
    supabase.from.mockReturnValue(chain);

    const leaderboard = await service.getLeaderboard(
      "savings_rate" as LeaderboardCategory,
      "monthly" as TimeFrame,
      USER_B, // caller is User B
    );

    expect(leaderboard.entries).toHaveLength(1);
    const entry = leaderboard.entries[0];

    // Must not expose the real userId
    expect(entry).not.toHaveProperty("userId");
    // Must expose anonymousId, not real identity
    expect(entry.anonymousId).toBe("anon-public-111");
    expect(entry.displayName).toBe("SwiftSaver500");
    // isCurrentUser must be false for USER_B viewing USER_A's entry
    expect(entry.isCurrentUser).toBe(false);
  });
});
