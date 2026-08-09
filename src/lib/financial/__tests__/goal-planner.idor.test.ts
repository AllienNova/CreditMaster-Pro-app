/**
 * IDOR regression test — GoalPlanner.simulateGoal
 *
 * simulateGoal reads `financial_goals` through the service-role client, which
 * BYPASSES row level security. Before the fix the lookup filtered on `id`
 * alone, so any authenticated user could POST a goalId belonging to someone
 * else and receive that goal's target amount, current amount, and full
 * projection. Every sibling method on this class (getUserGoals,
 * updateGoalProgress, deleteGoal) already scoped by `user_id`; simulateGoal
 * was the one that did not.
 *
 * The bug was latent rather than exploitable while the service still used the
 * anon-key client: with no JWT `auth.uid()` is NULL, so RLS returned zero rows
 * to everyone and the method threw "Goal not found" for its own owner too.
 * Moving to the service-role client is what would have armed it — hence this
 * test lands with that conversion, not after it.
 */

import { goalPlanner } from "../goal-planner";

jest.mock("@/lib/supabase/service-role", () => ({
  getServiceRoleClient: jest.fn(),
}));

const OWNER = "user-owner-111";
const ATTACKER = "user-attacker-222";
const GOAL_ID = "goal-abc";

/** A goal row belonging to OWNER, as PostgREST would return it. */
const OWNER_GOAL_ROW = {
  id: GOAL_ID,
  user_id: OWNER,
  name: "House deposit",
  goal_type: "savings",
  target_amount: 50000,
  current_amount: 12000,
  target_date: "2027-01-01",
  monthly_contribution: 500,
  status: "on_track",
  priority: 1,
  milestones: [],
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

/**
 * Chainable PostgREST double that records the `.eq()` filters applied, and —
 * critically — only returns the row when the filters actually match it. A mock
 * that returns the row regardless of filters would pass whether or not the fix
 * is present, which is the failure mode this test exists to catch.
 */
function buildClient() {
  const filters: Record<string, unknown> = {};

  const chain: Record<string, unknown> = {
    select: jest.fn(() => chain),
    order: jest.fn(() => chain),
    limit: jest.fn(() => chain),
    eq: jest.fn((col: string, val: unknown) => {
      filters[col] = val;
      return chain;
    }),
    single: jest.fn(async () => {
      const matches =
        filters.id === OWNER_GOAL_ROW.id &&
        (filters.user_id === undefined ||
          filters.user_id === OWNER_GOAL_ROW.user_id);
      return matches
        ? { data: OWNER_GOAL_ROW, error: null }
        : { data: null, error: { message: "No rows found" } };
    }),
  };

  return { client: { from: jest.fn(() => chain) }, filters, chain };
}

describe("GoalPlanner.simulateGoal — IDOR", () => {
  it("scopes the goal lookup by user_id, not by id alone", async () => {
    const { client, filters } = buildClient();
    const { getServiceRoleClient } = require("@/lib/supabase/service-role");
    (getServiceRoleClient as jest.Mock).mockReturnValue(client);

    await goalPlanner.simulateGoal({
      goalId: GOAL_ID,
      userId: OWNER,
      scenarios: [{ monthlyContribution: 600 }],
    });

    expect(client.from).toHaveBeenCalledWith("financial_goals");
    expect(filters.user_id).toBe(OWNER);
  });

  it("refuses to simulate another user's goal", async () => {
    const { client } = buildClient();
    const { getServiceRoleClient } = require("@/lib/supabase/service-role");
    (getServiceRoleClient as jest.Mock).mockReturnValue(client);

    await expect(
      goalPlanner.simulateGoal({
        goalId: GOAL_ID, // belongs to OWNER
        userId: ATTACKER,
        scenarios: [{ monthlyContribution: 600 }],
      }),
    ).rejects.toThrow("Goal not found");
  });

  it("still simulates the caller's own goal", async () => {
    const { client } = buildClient();
    const { getServiceRoleClient } = require("@/lib/supabase/service-role");
    (getServiceRoleClient as jest.Mock).mockReturnValue(client);

    const result = await goalPlanner.simulateGoal({
      goalId: GOAL_ID,
      userId: OWNER,
      scenarios: [{ monthlyContribution: 600 }],
    });

    expect(result.scenarios.length).toBeGreaterThan(0);
  });
});
