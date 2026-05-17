/**
 * IDOR regression tests — FinancialJourneyService
 *
 * The service uses SUPABASE_SERVICE_ROLE_KEY (bypasses RLS). The fixed
 * updateProgress method now requires a userId and verifies journey.userId
 * matches the caller before allowing any modification.
 *
 * Fixed IDOR vulnerability:
 *   - updateProgress(userId, journeyId, waypointId, updates): added userId param
 *     and checks journey.userId === userId before proceeding.
 *
 * These tests assert:
 *   - Cross-user updateProgress throws "Not authorized to update this journey"
 *   - Correct owner can update their own journey
 *   - getUserJourney is scoped to the provided userId
 */

import { FinancialJourneyService } from "../financial-journey-service";

jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(),
}));

// ---------------------------------------------------------------------------
// Minimal chainable Supabase mock
// ---------------------------------------------------------------------------

function buildChain(terminal: Record<string, unknown>) {
  const chain: Record<string, jest.Mock> = {};
  const methods = [
    "eq", "select", "insert", "update", "single", "order", "limit",
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

const USER_A = "user-a-journey-001";
const USER_B = "user-b-journey-002";
const JOURNEY_ID = "journey-xyz";
const WAYPOINT_ID = "waypoint-xyz";

let supabase: ReturnType<typeof createMockSupabase>;
let service: FinancialJourneyService;

const makeJourneyRow = (overrides: Record<string, unknown> = {}) => ({
  id: JOURNEY_ID,
  user_id: USER_A,
  journey_name: "Debt-Free Journey",
  current_phase: "foundation",
  overall_progress: 0,
  total_waypoints: 2,
  completed_waypoints: 0,
  waypoints: [
    {
      id: WAYPOINT_ID,
      order: 0,
      type: "milestone",
      status: "current",
      title: "Starter Emergency Fund",
      description: "Save $1,000",
      icon: "shield",
      phase: "foundation",
      requirements: [{ type: "savings", targetValue: 1000, currentValue: 0, description: "Save $1,000" }],
      xpReward: 500,
      progressPercent: 0,
    },
    {
      id: "waypoint-2",
      order: 1,
      type: "milestone",
      status: "locked",
      title: "Budget Master",
      description: "30-day streak",
      icon: "calculator",
      phase: "foundation",
      requirements: [{ type: "budget_streak", targetValue: 30, currentValue: 0, description: "30-day streak" }],
      xpReward: 300,
      progressPercent: 0,
    },
  ],
  start_date: new Date().toISOString(),
  projected_completion_date: null,
  last_updated: new Date().toISOString(),
  created_at: new Date().toISOString(),
  ...overrides,
});

beforeEach(() => {
  supabase = createMockSupabase();
  const { createClient } = require("@supabase/supabase-js");
  (createClient as jest.Mock).mockReturnValue(supabase);
  service = new FinancialJourneyService("https://test.supabase.co", "test-key");
});

// ---------------------------------------------------------------------------
// getUserJourney — idor
// ---------------------------------------------------------------------------

describe("getUserJourney — IDOR", () => {
  it("returns null when userId has no journey (cross-user access → no row)", async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: null }));

    const result = await service.getUserJourney(USER_B);
    expect(result).toBeNull();

    // Verify the query is scoped to USER_B
    const chain = supabase.from.mock.results[0].value;
    expect(chain.eq).toHaveBeenCalledWith("user_id", USER_B);
  });
});

// ---------------------------------------------------------------------------
// updateProgress — idor (CRITICAL FIX)
// ---------------------------------------------------------------------------

describe("updateProgress — IDOR", () => {
  it("throws when USER_B tries to update USER_A's journey", async () => {
    // getJourneyById returns USER_A's journey (journeyId-only lookup)
    const journeyRow = makeJourneyRow({ user_id: USER_A });
    supabase.from.mockReturnValue(buildChain({ data: journeyRow, error: null }));

    await expect(
      service.updateProgress(USER_B, JOURNEY_ID, WAYPOINT_ID, [
        { type: "savings", currentValue: 500 },
      ]),
    ).rejects.toThrow("Not authorized to update this journey");
  });

  it("allows USER_A to update their own journey", async () => {
    const journeyRow = makeJourneyRow({ user_id: USER_A });
    const updatedRow = makeJourneyRow({ user_id: USER_A, overall_progress: 0 });

    let call = 0;
    supabase.from.mockImplementation(() => {
      call++;
      if (call === 1) return buildChain({ data: journeyRow, error: null }); // getJourneyById
      return buildChain({ data: updatedRow, error: null }); // saveJourney
    });

    const result = await service.updateProgress(USER_A, JOURNEY_ID, WAYPOINT_ID, [
      { type: "savings", currentValue: 500 },
    ]);
    expect(result.userId).toBe(USER_A);
  });

  it("throws when journey is not found", async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: null }));

    await expect(
      service.updateProgress(USER_A, "nonexistent-id", WAYPOINT_ID, []),
    ).rejects.toThrow("Journey not found");
  });

  it("throws when USER_C (a third user) tries to update any journey", async () => {
    const journeyRow = makeJourneyRow({ user_id: USER_A });
    supabase.from.mockReturnValue(buildChain({ data: journeyRow, error: null }));

    await expect(
      service.updateProgress("user-c-journey-003", JOURNEY_ID, WAYPOINT_ID, []),
    ).rejects.toThrow("Not authorized to update this journey");
  });
});

// ---------------------------------------------------------------------------
// getJourneyStats — idor
// ---------------------------------------------------------------------------

describe("getJourneyStats — IDOR", () => {
  it("returns zeroed stats when userId has no journey", async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: null }));

    const stats = await service.getJourneyStats(USER_B);
    expect(stats.waypointsCompleted).toBe(0);
    expect(stats.totalXpEarned).toBe(0);
  });
});
