/**
 * IDOR regression tests — CommunityChallengesService
 *
 * Table-name correctness: service now queries `user_challenge_participation`
 * (matching the migration) instead of the non-existent `challenge_participants`.
 *
 * updateProgress now requires userId and scopes the lookup with
 * .eq("user_id", userId), preventing User B from updating User A's record.
 */

import { CommunityChallengesService } from "../community-challenges-service";

jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(),
}));

function buildChain(terminal: Record<string, unknown>) {
  const chain: Record<string, jest.Mock> = {};
  const methods = ["eq", "select", "insert", "update", "single", "order", "limit", "in", "gt"];
  methods.forEach((m) => {
    chain[m] = jest.fn().mockImplementation(() => chain);
  });
  Object.assign(chain, terminal);
  return chain;
}

const USER_A = "user-a-111";
const USER_B = "user-b-222";
const PARTICIPANT_ID = "part-xyz";

let supabase: { from: jest.Mock };
let service: CommunityChallengesService;

beforeEach(() => {
  supabase = { from: jest.fn() };
  const { createClient } = require("@supabase/supabase-js");
  (createClient as jest.Mock).mockReturnValue(supabase);
  service = new CommunityChallengesService("https://test.supabase.co", "test-key");
});

// ---------------------------------------------------------------------------
// Table name correctness — queries use user_challenge_participation
// ---------------------------------------------------------------------------

describe("table name correctness — user_challenge_participation", () => {
  it("getUserParticipations queries user_challenge_participation", async () => {
    const chain = buildChain({ data: [], error: null });
    supabase.from.mockReturnValue(chain);

    await service.getUserParticipations(USER_A);

    expect(supabase.from).toHaveBeenCalledWith("user_challenge_participation");
  });

  it("getUserActiveChallenges queries user_challenge_participation", async () => {
    const chain = buildChain({ data: [], error: null });
    supabase.from.mockReturnValue(chain);

    await service.getUserActiveChallenges(USER_A);

    expect(supabase.from).toHaveBeenCalledWith("user_challenge_participation");
  });
});

// ---------------------------------------------------------------------------
// updateProgress — IDOR: userId scope guard
// ---------------------------------------------------------------------------

describe("updateProgress — IDOR", () => {
  it("throws when participant row not found for the given userId (cross-user)", async () => {
    // Simulate DB returning null because .eq("user_id", USER_B) excludes USER_A's row
    const chain = buildChain({ data: null, error: null });
    supabase.from.mockReturnValue(chain);

    await expect(
      service.updateProgress(PARTICIPANT_ID, USER_B, 50),
    ).rejects.toThrow("Participant not found");
  });

  it("scopes the lookup to the calling userId", async () => {
    // DB returns null (simulating cross-user)
    const chain = buildChain({ data: null, error: null });
    supabase.from.mockReturnValue(chain);

    try {
      await service.updateProgress(PARTICIPANT_ID, USER_B, 50);
    } catch {
      // Expected to throw — we only care about the .eq() call
    }

    // Verify ownership filter was applied
    expect(chain.eq).toHaveBeenCalledWith("user_id", USER_B);
  });

  it("succeeds when participant belongs to the calling userId", async () => {
    const challengeRow = {
      id: "challenge-1",
      name: "Save $500",
      description: "Save $500 in a month",
      type: "savings",
      status: "active",
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 30 * 86400000).toISOString(),
      goal_type: "fixed",
      goal_value: 500,
      goal_unit: "dollars",
      current_participants: 10,
      is_public: true,
      xp_reward: 750,
      rules: [],
      tips: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const participantRow = {
      id: PARTICIPANT_ID,
      challenge_id: "challenge-1",
      user_id: USER_A,
      status: "active",
      current_progress: 100,
      goal_progress: 20,
      earned_badge: false,
      earned_xp: 0,
      joined_at: new Date().toISOString(),
      last_updated_at: new Date().toISOString(),
      community_challenges: challengeRow,
    };

    const updatedRow = {
      ...participantRow,
      current_progress: 200,
      goal_progress: 40,
    };

    let callCount = 0;
    supabase.from.mockImplementation(() => {
      callCount++;
      // First call: the select/eq/single for participant
      if (callCount === 1) return buildChain({ data: participantRow, error: null });
      // Second call: the update
      return buildChain({ data: updatedRow, error: null });
    });

    const result = await service.updateProgress(PARTICIPANT_ID, USER_A, 200);
    expect(result.userId).toBe(USER_A);
    expect(result.currentProgress).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// getUserParticipations — scoped to userId
// ---------------------------------------------------------------------------

describe("getUserParticipations — userId scope", () => {
  it("filters by the calling userId, not a body-supplied one", async () => {
    const chain = buildChain({ data: [], error: null });
    supabase.from.mockReturnValue(chain);

    await service.getUserParticipations(USER_A);

    expect(chain.eq).toHaveBeenCalledWith("user_id", USER_A);
  });
});
