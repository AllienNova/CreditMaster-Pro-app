/**
 * dispute/strategies — no silent fallback, and an honest label on the number.
 *
 * The screen seeded LOCAL_STRATEGIES: five tactics, each carrying a success
 * rate (72, 58, 62, 48, 55). It DID fetch, but the catch read
 * `// Use local strategies` and a missing payload fell through the same way —
 * so a failed read was indistinguishable from a successful one, and the user
 * chose a dispute tactic from a list the server never sent.
 *
 * SEPARATE FINDING, deliberately not "fixed" by wiring: the real route serves
 * the SAME hardcoded rates from src/lib/disputes/advanced-strategies.ts
 * (successRate: 72, 58, 62, 52, 48). Pointing the screen at the server would
 * have relocated the fabrication, not removed it. `disputes.outcome` exists
 * and could measure this once there are resolved disputes to count; until
 * then the number is editorial guidance and is now labelled as such.
 */

import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react-native";

const mockGetStrategies = jest.fn();
/**
 * The MAIN client now (SF-22 migration). This screen used to import
 * mobile-app/services/api.ts, a parallel client that does not unwrap the
 * { success, data } envelope — so `data.strategies` was always undefined and
 * the screen never once rendered a server strategy.
 */
jest.mock("../../services/api/disputes", () => ({
  disputeResourcesApi: {
    getStrategies: (...a: unknown[]) => mockGetStrategies(...a),
  },
}));

// expo-router is mocked globally in jest.setup.js.

import DisputeStrategiesScreen from "../../../app/dispute/strategies";

const SERVER_STRATEGY = {
  id: "escalation_tactics",
  name: "Multi-Level Escalation",
  description: "Progressive escalation through regulatory channels",
  successRate: 72,
  difficulty: "advanced",
  riskLevel: "medium",
  timeline: "60-90 days",
  steps: [],
  requirements: [],
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGetStrategies.mockResolvedValue({
    success: true,
    data: { strategies: [SERVER_STRATEGY] },
  });
});

describe("dispute/strategies", () => {
  it("renders what the server sent", async () => {
    render(<DisputeStrategiesScreen />);
    expect(await screen.findByText("Multi-Level Escalation")).toBeTruthy();
  });

  describe("no silent fallback", () => {
    it("says so when the read fails, instead of showing built-in tactics", async () => {
      mockGetStrategies.mockResolvedValue({
        success: false,
        error: { message: "boom" },
      });
      render(<DisputeStrategiesScreen />);

      expect(
        await screen.findByText(/could not load dispute strategies/i),
      ).toBeTruthy();
      // The old fallback's headline entry must not appear.
      expect(screen.queryByText("Multi-Level Escalation")).toBeNull();
    });

    it("says so when the call throws", async () => {
      // The catch used to be `// Use local strategies` and nothing else.
      mockGetStrategies.mockRejectedValue(new Error("network"));
      render(<DisputeStrategiesScreen />);

      expect(
        await screen.findByText(/could not load dispute strategies/i),
      ).toBeTruthy();
    });

    it("says so when the payload has no strategies", async () => {
      // A 200 with a missing list fell through the same path as an error and
      // left the hardcoded five on screen.
      mockGetStrategies.mockResolvedValue({ success: true, data: {} });
      render(<DisputeStrategiesScreen />);

      expect(
        await screen.findByText(/could not load dispute strategies/i),
      ).toBeTruthy();
    });

    it("retries on demand", async () => {
      mockGetStrategies.mockResolvedValueOnce({
        success: false,
        error: { message: "boom" },
      });
      render(<DisputeStrategiesScreen />);
      await screen.findByText(/could not load dispute strategies/i);

      fireEvent.press(screen.getByText("Try again"));
      await waitFor(() => expect(mockGetStrategies).toHaveBeenCalledTimes(2));
      expect(await screen.findByText("Multi-Level Escalation")).toBeTruthy();
    });
  });

  it("labels the rate rather than presenting a bare percentage", async () => {
    // A colour-coded "72%" beside a strategy name reads as this user's
    // measured outcome. Nothing measures it.
    render(<DisputeStrategiesScreen />);
    expect(await screen.findByText("72%")).toBeTruthy();
    expect(screen.getByText("typical")).toBeTruthy();
  });
});
