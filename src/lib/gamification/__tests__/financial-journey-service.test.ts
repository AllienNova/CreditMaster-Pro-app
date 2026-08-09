/**
 * FinancialJourneyService — error-surfacing regression tests
 *
 * financial_journeys was a phantom table (queried but never migrated) until
 * this session. getUserJourney/getJourneyById discarded {error} entirely,
 * so a genuine query failure was indistinguishable from "no journey yet" --
 * the same false-all-clear class of bug fixed elsewhere this session
 * (getAlerts, getMonitoringSettings, SharedGoalsService.getGoal).
 */

import { FinancialJourneyService } from "../financial-journey-service";

jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(),
}));

function buildChain(terminal: Record<string, unknown>) {
  const chain: Record<string, jest.Mock> = {};
  const methods = ["eq", "select", "insert", "update", "single", "order", "limit"];
  methods.forEach((m) => {
    chain[m] = jest.fn().mockImplementation(() => chain);
  });
  Object.assign(chain, terminal);
  return chain;
}

const USER_A = "user-a-journey-001";

let supabase: { from: jest.Mock };
let service: FinancialJourneyService;

beforeEach(() => {
  supabase = { from: jest.fn() };
  const { createClient } = require("@supabase/supabase-js");
  (createClient as jest.Mock).mockReturnValue(supabase);
  service = new FinancialJourneyService("https://test.supabase.co", "test-key");
});

describe("FinancialJourneyService — getUserJourney", () => {
  it("returns null when the user genuinely has no journey yet (PGRST116)", async () => {
    supabase.from.mockReturnValue(
      buildChain({ data: null, error: { code: "PGRST116", message: "no rows" } }),
    );

    const result = await service.getUserJourney(USER_A);

    expect(result).toBeNull();
  });

  it("throws on a real query failure instead of silently returning null", async () => {
    supabase.from.mockReturnValue(
      buildChain({
        data: null,
        error: { code: "42501", message: "permission denied" },
      }),
    );

    await expect(service.getUserJourney(USER_A)).rejects.toMatchObject({
      code: "42501",
    });
  });
});

describe("FinancialJourneyService — updateProgress (getJourneyById honesty)", () => {
  it("throws the real error instead of the misleading 'Journey not found' when the lookup itself fails", async () => {
    supabase.from.mockReturnValue(
      buildChain({
        data: null,
        error: { message: "connection reset" },
      }),
    );

    await expect(
      service.updateProgress(USER_A, "journey-xyz", "waypoint-xyz", []),
    ).rejects.toMatchObject({ message: "connection reset" });
  });

  it("still throws 'Journey not found' when the journey genuinely does not exist (PGRST116)", async () => {
    supabase.from.mockReturnValue(
      buildChain({ data: null, error: { code: "PGRST116", message: "no rows" } }),
    );

    await expect(
      service.updateProgress(USER_A, "missing-journey", "waypoint-xyz", []),
    ).rejects.toThrow("Journey not found");
  });
});
