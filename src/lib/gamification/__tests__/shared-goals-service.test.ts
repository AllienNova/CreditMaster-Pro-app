/**
 * SharedGoalsService — happy path + error-surfacing regression tests
 *
 * shared_goals/shared_goal_members/shared_goal_contributions/
 * shared_goal_invitations/shared_goal_updates were phantom tables (queried
 * but never migrated) until this session. These tests cover the happy path
 * against the now-real schema plus the honesty fix: a genuine query failure
 * must throw, not silently present as "not found" / an empty list — the
 * same false-all-clear class of bug fixed elsewhere this session
 * (getAlerts, getMonitoringSettings).
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
const GOAL_ID = "goal-xyz";

let supabase: { from: jest.Mock };
let service: SharedGoalsService;

beforeEach(() => {
  supabase = { from: jest.fn() };
  const { createClient } = require("@supabase/supabase-js");
  (createClient as jest.Mock).mockReturnValue(supabase);
  service = new SharedGoalsService("https://test.supabase.co", "test-key");
});

const GOAL_ROW = {
  id: GOAL_ID,
  name: "Family Emergency Fund",
  description: "Save for emergencies",
  emoji: "",
  target_amount: 10000,
  current_amount: 2500,
  currency: "USD",
  start_date: "2026-01-01T00:00:00.000Z",
  target_date: "2026-12-31T00:00:00.000Z",
  visibility: "members_only",
  status: "active",
  total_contributions: 3,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

describe("SharedGoalsService — happy path", () => {
  it("getGoal returns a mapped goal with its members", async () => {
    let call = 0;
    supabase.from.mockImplementation((table: string) => {
      call++;
      if (table === "shared_goals") {
        return buildChain({ data: GOAL_ROW, error: null });
      }
      // getMembers query
      return buildChain({ data: [], error: null });
    });

    const goal = await service.getGoal(GOAL_ID);

    expect(goal).not.toBeNull();
    expect(goal!.id).toBe(GOAL_ID);
    expect(goal!.targetAmount).toBe(10000);
    expect(goal!.currentAmount).toBe(2500);
    expect(goal!.members).toEqual([]);
    expect(call).toBeGreaterThanOrEqual(1);
  });

  it("getGoal returns null when the goal genuinely does not exist (PGRST116)", async () => {
    supabase.from.mockReturnValue(
      buildChain({ data: null, error: { code: "PGRST116", message: "no rows" } }),
    );

    const goal = await service.getGoal("missing-goal");

    expect(goal).toBeNull();
  });
});

describe("SharedGoalsService — error surfacing (not silent-empty)", () => {
  it("getGoal throws on a real query failure instead of returning null", async () => {
    supabase.from.mockReturnValue(
      buildChain({
        data: null,
        error: { code: "42501", message: "permission denied" },
      }),
    );

    await expect(service.getGoal(GOAL_ID)).rejects.toMatchObject({
      code: "42501",
    });
  });

  it("getMembers throws on a real query failure instead of returning []", async () => {
    supabase.from.mockReturnValue(
      buildChain({
        data: null,
        error: { message: "connection reset" },
      }),
    );

    await expect(service.getMembers(GOAL_ID)).rejects.toMatchObject({
      message: "connection reset",
    });
  });

  it("getUserGoals throws when the membership lookup fails instead of returning []", async () => {
    supabase.from.mockReturnValue(
      buildChain({
        data: null,
        error: { message: "membership query failed" },
      }),
    );

    await expect(service.getUserGoals(USER_A)).rejects.toMatchObject({
      message: "membership query failed",
    });
  });

  it("createGoal throws if the owner-membership insert fails, not just the goal insert", async () => {
    let call = 0;
    supabase.from.mockImplementation(() => {
      call++;
      if (call === 1) {
        // shared_goals insert succeeds
        return buildChain({ data: GOAL_ROW, error: null });
      }
      // shared_goal_members insert fails
      return buildChain({ data: null, error: { message: "member insert failed" } });
    });

    await expect(
      service.createGoal(USER_A, "Alice", { name: "Trip Fund" }),
    ).rejects.toMatchObject({ message: "member insert failed" });
  });
});
