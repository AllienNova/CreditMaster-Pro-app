/**
 * insights/alerts — real-data wiring.
 *
 * The screen seeded MOCK_ALERTS into state, and the top entry was a CRITICAL
 * FRAUD ALERT:
 *
 *   "Suspicious Activity Detected — unusual transaction pattern detected on
 *    your credit card ending in 4532", with a Review Activity action.
 *
 * Every user saw it. It named a card fragment they do not have and told them
 * they may have been defrauded. Two more things on the same screen were
 * theatre: onRefresh was `await new Promise(r => setTimeout(r, 1000))` — a
 * spinner over no request — and mark-read mutated local state without ever
 * calling the PATCH, so an alert "read" itself and returned on next load.
 *
 * It was invisible to audit:screen-data because the seed went through
 * `useState<Alert[]>(MOCK_ALERTS)` and the gate's matcher did not allow a
 * generic type argument (SF-21).
 */

import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react-native";

const mockGetAlerts = jest.fn();
const mockAcknowledge = jest.fn();
const mockAcknowledgeAll = jest.fn();
jest.mock("../../services/api/credit", () => ({
  creditMonitoringApi: {
    getAlerts: (...a: unknown[]) => mockGetAlerts(...a),
    acknowledgeAlert: (...a: unknown[]) => mockAcknowledge(...a),
    acknowledgeAllAlerts: (...a: unknown[]) => mockAcknowledgeAll(...a),
  },
}));

const mockGetBudgetSummary = jest.fn();
jest.mock("../../services/api/financial", () => ({
  budgetApi: { getBudgetSummary: (...a: unknown[]) => mockGetBudgetSummary(...a) },
}));

// expo-router is mocked globally in jest.setup.js.

import SmartAlertsScreen from "../../../app/insights/alerts";

function creditAlert(over: Record<string, unknown> = {}) {
  return {
    id: "a1",
    userId: "u1",
    bureau: "experian",
    alertType: "score_change",
    type: "score_change",
    severity: "medium",
    title: "Your Experian score changed",
    description: "Your score moved by 8 points.",
    createdAt: "2026-08-01T00:00:00.000Z",
    acknowledged: false,
    ...over,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetAlerts.mockResolvedValue({
    success: true,
    data: { items: [creditAlert()], total: 1, page: 1, pageSize: 20, hasMore: false },
  });
  mockGetBudgetSummary.mockResolvedValue({
    success: true,
    data: {
      totalBudgeted: 0,
      alerts: [
        { category: "Groceries", severity: "high", message: "You are over budget." },
      ],
    },
  });
});

describe("insights/alerts", () => {
  it("fetches both real sources on mount", async () => {
    render(<SmartAlertsScreen />);
    await waitFor(() => {
      expect(mockGetAlerts).toHaveBeenCalled();
      expect(mockGetBudgetSummary).toHaveBeenCalled();
    });
  });

  it("never shows the invented fraud alert again", async () => {
    render(<SmartAlertsScreen />);
    await waitFor(() => expect(mockGetAlerts).toHaveBeenCalled());
    expect(screen.queryByText("Suspicious Activity Detected")).toBeNull();
    expect(screen.queryByText(/4532/)).toBeNull();
  });

  it("renders alerts from both sources", async () => {
    render(<SmartAlertsScreen />);
    expect(await screen.findByText("Your Experian score changed")).toBeTruthy();
    expect(screen.getByText("Groceries")).toBeTruthy();
  });

  describe("acknowledging", () => {
    it("marks a credit alert read only after the server accepts it", async () => {
      mockAcknowledge.mockResolvedValue({ success: true });
      render(<SmartAlertsScreen />);
      await screen.findByText("Your Experian score changed");

      fireEvent.press(screen.getAllByText("Mark as read")[0]);
      // The id sent is the ROW id, with the screen's namespacing stripped.
      await waitFor(() => expect(mockAcknowledge).toHaveBeenCalledWith("a1"));
    });

    it("leaves the alert pending when the server refuses", async () => {
      // The old handler set state unconditionally, so a failed PATCH looked
      // identical to a successful one until the next load.
      //
      // NO BUDGET ALERTS HERE, deliberately. The first version of this test
      // kept them and asserted "some Mark as read button still exists" — which
      // the budget alert satisfied on its own, so the assertion passed with
      // the guard removed. Mutation testing caught it; one alert on screen
      // makes the assertion mean what it says.
      mockGetBudgetSummary.mockResolvedValue({
        success: true,
        data: { totalBudgeted: 0, alerts: [] },
      });
      mockAcknowledge.mockResolvedValue({
        success: false,
        error: { message: "boom" },
      });
      render(<SmartAlertsScreen />);
      await screen.findByText("Your Experian score changed");
      expect(screen.getAllByText("Mark as read")).toHaveLength(1);

      fireEvent.press(screen.getByText("Mark as read"));
      await waitFor(() => expect(mockAcknowledge).toHaveBeenCalled());
      // Still exactly one: the alert is still pending, because the server
      // never accepted it.
      expect(screen.getAllByText("Mark as read")).toHaveLength(1);
    });

    it("stops offering Mark as read once the server accepts", async () => {
      // The other half of the same claim — without this, "always pending"
      // would also pass.
      mockGetBudgetSummary.mockResolvedValue({
        success: true,
        data: { totalBudgeted: 0, alerts: [] },
      });
      mockAcknowledge.mockResolvedValue({ success: true });
      render(<SmartAlertsScreen />);
      await screen.findByText("Your Experian score changed");

      fireEvent.press(screen.getByText("Mark as read"));
      await waitFor(() =>
        expect(screen.queryByText("Mark as read")).toBeNull(),
      );
    });

    it("does not try to acknowledge a budget alert", async () => {
      // A budget alert is DERIVED from a category being over budget. It has no
      // row and no id, so PATCHing one would be a request against nothing.
      mockGetAlerts.mockResolvedValue({
        success: true,
        data: { items: [], total: 0, page: 1, pageSize: 20, hasMore: false },
      });
      render(<SmartAlertsScreen />);
      await screen.findByText("Groceries");

      const buttons = screen.queryAllByText("Mark as read");
      if (buttons.length) fireEvent.press(buttons[0]);
      await waitFor(() => expect(mockGetBudgetSummary).toHaveBeenCalled());
      expect(mockAcknowledge).not.toHaveBeenCalled();
    });
  });

  describe("honest states", () => {
    it("distinguishes a failed read from having no alerts", async () => {
      // On this screen the difference is whether the user believes nothing is
      // wrong with their credit.
      mockGetAlerts.mockResolvedValue({
        success: false,
        error: { message: "boom" },
      });
      mockGetBudgetSummary.mockResolvedValue({
        success: false,
        error: { message: "boom" },
      });
      render(<SmartAlertsScreen />);
      expect(await screen.findByText(/could not load your alerts/i)).toBeTruthy();
    });

    it("still shows budget alerts when the credit read fails", async () => {
      mockGetAlerts.mockResolvedValue({
        success: false,
        error: { message: "boom" },
      });
      render(<SmartAlertsScreen />);
      expect(await screen.findByText("Groceries")).toBeTruthy();
      expect(screen.queryByText(/could not load your alerts/i)).toBeNull();
    });
  });
});
