/**
 * budgeting/auto-save — real-data wiring.
 *
 * The screen rendered a MOCK_RULES array: a "Purchase Round-Up" saving $45 a
 * month, a "Paycheck Percentage", a fixed weekly transfer — headlined by a
 * monthly and an annual savings figure, with toggles that flipped local state.
 * It made no request. A user reading it believed money was being set aside
 * automatically. None was.
 *
 * Two things these tests exist to hold:
 *
 *  1. There is no monthly savings figure in the data. savings_rules records
 *     total_saved and transfer_count, both CUMULATIVE. Deriving a monthly
 *     number from a lifetime total and an unknown number of months would be a
 *     guess presented as a projection.
 *  2. A failed toggle must leave the switch alone. The old handler flipped it
 *     unconditionally, so pausing a savings rule always looked like it worked.
 */

import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react-native";
import type { SavingsRule } from "../../services/api/financial";

const mockGetRules = jest.fn();
const mockToggleRule = jest.fn();

jest.mock("../../services/api/financial", () => ({
  savingsRulesApi: {
    getRules: (...args: unknown[]) => mockGetRules(...args),
    toggleRule: (...args: unknown[]) => mockToggleRule(...args),
  },
}));

// expo-router is mocked globally in jest.setup.js.

import AutoSaveScreen from "../../../app/budgeting/auto-save";

function rule(over: Partial<SavingsRule> = {}): SavingsRule {
  return {
    id: "r1",
    name: "Purchase Round-Up",
    type: "round_up",
    frequency: "per_transaction",
    status: "active",
    config: { roundUpTo: 1, roundUpMultiplier: 2 },
    totalSaved: 128.5,
    transferCount: 43,
    createdAt: "2026-05-01T00:00:00.000Z",
    ...over,
  };
}

function ok(rules: SavingsRule[]) {
  return { success: true, data: { rules } };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetRules.mockResolvedValue(ok([rule()]));
  mockToggleRule.mockResolvedValue({ success: true, data: { rule: rule() } });
});

describe("budgeting/auto-save", () => {
  it("fetches on mount instead of rendering a fixture", async () => {
    render(<AutoSaveScreen />);
    await waitFor(() => expect(mockGetRules).toHaveBeenCalledTimes(1));
  });

  it("renders the user's real rule", async () => {
    render(<AutoSaveScreen />);
    expect(await screen.findByText("Purchase Round-Up")).toBeTruthy();
  });

  describe("the summary reports what is stored, not a projection", () => {
    it("shows cumulative total saved and transfer count", async () => {
      mockGetRules.mockResolvedValue(
        ok([
          rule({ id: "a", totalSaved: 100, transferCount: 10 }),
          rule({ id: "b", totalSaved: 50, transferCount: 5 }),
        ]),
      );
      render(<AutoSaveScreen />);

      expect(await screen.findByText("$150.00")).toBeTruthy();
      expect(screen.getByText("15")).toBeTruthy();
      expect(screen.getByText("Total Saved")).toBeTruthy();
      expect(screen.getByText("Transfers")).toBeTruthy();
    });

    it("no longer claims a monthly or annual savings figure", async () => {
      // Neither exists in savings_rules. The old headline asserted both.
      render(<AutoSaveScreen />);
      await waitFor(() => expect(mockGetRules).toHaveBeenCalled());
      expect(screen.queryByText("Monthly Savings")).toBeNull();
      expect(screen.queryByText("Annual Savings")).toBeNull();
    });
  });

  it("describes a rule from its real config, not a description column", async () => {
    // savings_rules has no description. The old fixture carried prose.
    mockGetRules.mockResolvedValue(
      ok([rule({ type: "percentage", config: { percentageOfIncome: 10 } })]),
    );
    render(<AutoSaveScreen />);
    expect(await screen.findByText("10%")).toBeTruthy();
  });

  it("omits a config value the rule does not carry, rather than showing 0", async () => {
    // "0%" would state a setting the rule does not have.
    mockGetRules.mockResolvedValue(
      ok([rule({ type: "percentage", config: {} })]),
    );
    render(<AutoSaveScreen />);
    await waitFor(() => expect(mockGetRules).toHaveBeenCalled());
    expect(screen.queryByText("0%")).toBeNull();
  });

  it("renders a rule type it has not been taught rather than crashing", async () => {
    mockGetRules.mockResolvedValue(
      ok([rule({ type: "goal_based" as SavingsRule["type"] })]),
    );
    render(<AutoSaveScreen />);
    expect(await screen.findByText("Goal")).toBeTruthy();
  });

  describe("toggling a rule", () => {
    it("sends the toggle to the server and re-reads", async () => {
      render(<AutoSaveScreen />);
      await waitFor(() => expect(mockGetRules).toHaveBeenCalledTimes(1));

      fireEvent(screen.UNSAFE_getByType(require("react-native").Switch), "valueChange", false);

      await waitFor(() => expect(mockToggleRule).toHaveBeenCalledWith("r1"));
      await waitFor(() => expect(mockGetRules).toHaveBeenCalledTimes(2));
    });

    it("leaves the rule alone and says so when the request fails", async () => {
      // The old handler flipped local state unconditionally, so pausing a
      // savings rule always looked like it worked.
      mockToggleRule.mockResolvedValue({
        success: false,
        error: { message: "boom" },
      });
      render(<AutoSaveScreen />);
      await waitFor(() => expect(mockGetRules).toHaveBeenCalledTimes(1));

      fireEvent(screen.UNSAFE_getByType(require("react-native").Switch), "valueChange", false);

      expect(await screen.findByText(/It is unchanged/i)).toBeTruthy();
      // No re-read: nothing changed, so there is nothing to re-read.
      expect(mockGetRules).toHaveBeenCalledTimes(1);
    });
  });

  describe("honest states", () => {
    it("shows a loading state before the response lands", () => {
      mockGetRules.mockReturnValue(new Promise(() => {}));
      render(<AutoSaveScreen />);
      expect(screen.getByText(/Loading your auto-save rules/i)).toBeTruthy();
    });

    it("distinguishes a failed load from having no rules, and retries", async () => {
      mockGetRules.mockResolvedValue({
        success: false,
        error: { message: "boom" },
      });
      render(<AutoSaveScreen />);

      expect(
        await screen.findByText(/could not load your auto-save rules/i),
      ).toBeTruthy();
      expect(screen.queryByText(/You have no auto-save rules yet/i)).toBeNull();

      mockGetRules.mockResolvedValue(ok([rule()]));
      fireEvent.press(screen.getByText("Try again"));
      await waitFor(() => expect(mockGetRules).toHaveBeenCalledTimes(2));
    });

    it("explains what a rule is when there are none", async () => {
      mockGetRules.mockResolvedValue(ok([]));
      render(<AutoSaveScreen />);
      expect(
        await screen.findByText(/You have no auto-save rules yet/i),
      ).toBeTruthy();
    });
  });
});
