/**
 * financial/overview — real-data wiring.
 *
 * The screen showed an ACCOUNTS fixture (Primary Checking $4,250 at Chase, a
 * High-Yield Savings) and a BUDGET_STATUS object ($2,450 of $4,000 spent,
 * Shopping over budget at 450/400). No request. BUDGET_STATUS is a constant
 * OBJECT, so audit:screen-data could not see it until the detector was
 * extended in the previous commit.
 *
 * THE ARITHMETIC WAS ALSO WRONG, and that is the part worth pinning. Net
 * worth split accounts by balance SIGN:
 *
 *     const assets = ACCOUNTS.filter((a) => a.balance > 0)...
 *
 * Plaid does not sign balances that way. A credit card or loan carries a
 * POSITIVE balance meaning the amount OWED. Under the old rule every debt
 * counted as an asset, and net worth was overstated by the whole of it — the
 * fixture hid it by hand-signing its own numbers, which no real payload does.
 */

import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react-native";
import type { NetWorthData } from "../../services/api/financial";
import type { Budget } from "../../services/api/types";

const mockGetNetWorth = jest.fn();
const mockGetBudgets = jest.fn();

jest.mock("../../services/api/financial", () => ({
  financialOverviewApi: {
    getNetWorth: (...a: unknown[]) => mockGetNetWorth(...a),
  },
  budgetApi: { getAll: (...a: unknown[]) => mockGetBudgets(...a) },
}));

// expo-router is mocked globally in jest.setup.js.

import FinancialOverviewScreen from "../../../app/financial/overview";

/**
 * A checking account and a credit card. The card's `value` is POSITIVE —
 * exactly how Plaid reports an amount owed — which is what broke the old
 * sign-based rule.
 */
function netWorth(over: Partial<NetWorthData> = {}): NetWorthData {
  return {
    assets: [
      {
        id: "a1",
        name: "Plaid Checking",
        value: 4250,
        accountType: "depository",
        subtype: "checking",
      },
    ],
    liabilities: [
      {
        id: "l1",
        name: "Plaid Credit Card",
        value: 1500,
        accountType: "credit",
        subtype: "credit card",
      },
    ],
    totalAssets: 4250,
    totalLiabilities: 1500,
    netWorth: 2750,
    ...over,
  };
}

function budget(over: Partial<Budget> = {}): Budget {
  return {
    id: "b1",
    userId: "u1",
    category: "Groceries",
    limit: 800,
    spent: 620,
    remaining: 180,
    period: "monthly",
    ...over,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetNetWorth.mockResolvedValue({ success: true, data: netWorth() });
  mockGetBudgets.mockResolvedValue({
    success: true,
    data: { budgets: [budget()] },
  });
});

describe("financial/overview", () => {
  it("fetches both sources on mount instead of rendering fixtures", async () => {
    render(<FinancialOverviewScreen />);
    await waitFor(() => {
      expect(mockGetNetWorth).toHaveBeenCalled();
      expect(mockGetBudgets).toHaveBeenCalled();
    });
  });

  it("never shows the invented accounts or budget again", async () => {
    render(<FinancialOverviewScreen />);
    await waitFor(() => expect(mockGetNetWorth).toHaveBeenCalled());
    expect(screen.queryByText("Primary Checking")).toBeNull();
    expect(screen.queryByText("High-Yield Savings")).toBeNull();
    expect(screen.queryByText("Food & Dining")).toBeNull();
  });

  describe("net worth", () => {
    it("subtracts a positive credit balance instead of adding it", async () => {
      // 4250 assets, 1500 owed on a card whose stored balance is POSITIVE.
      // The old sign rule would have made this 5750.
      render(<FinancialOverviewScreen />);
      expect(await screen.findByText("$2,750.00")).toBeTruthy();
      expect(screen.queryByText("$5,750.00")).toBeNull();
    });

    it("renders a liability as negative even though its value is positive", async () => {
      render(<FinancialOverviewScreen />);
      expect(await screen.findByText("-$1,500.00")).toBeTruthy();
    });

    it("renders the real account names", async () => {
      render(<FinancialOverviewScreen />);
      expect(await screen.findByText("Plaid Checking")).toBeTruthy();
      expect(screen.getByText("Plaid Credit Card")).toBeTruthy();
    });

    it("shows no institution or freshness stamp, because neither is in the payload", async () => {
      // The fixture claimed "Chase • 2 min ago". NetWorthAccount carries
      // neither, and a sync time nobody measured is what makes invented data
      // convincing.
      render(<FinancialOverviewScreen />);
      await waitFor(() => expect(mockGetNetWorth).toHaveBeenCalled());
      expect(screen.queryByText(/2 min ago/)).toBeNull();
      expect(screen.queryByText(/Chase/)).toBeNull();
    });
  });

  describe("budgets", () => {
    it("sums the real budgets", async () => {
      mockGetBudgets.mockResolvedValue({
        success: true,
        data: {
          budgets: [
            budget({ id: "a", spent: 620, limit: 800 }),
            budget({ id: "b", category: "Transport", spent: 100, limit: 200 }),
          ],
        },
      });
      render(<FinancialOverviewScreen />);
      expect(await screen.findByText("72% used")).toBeTruthy();
    });

    it("shows no percentage when nothing is budgeted", async () => {
      // spent / 0 is Infinity. The fixture's denominator was always 4000, so
      // this was unreachable.
      mockGetBudgets.mockResolvedValue({
        success: true,
        data: { budgets: [] },
      });
      render(<FinancialOverviewScreen />);
      await waitFor(() => expect(mockGetBudgets).toHaveBeenCalled());
      expect(screen.queryByText(/% used/)).toBeNull();
      expect(screen.getByText("No budgets set yet.")).toBeTruthy();
    });

    it("leaves the budget card empty rather than blanking the accounts", async () => {
      // Secondary source: its failure must not take the primary one down.
      mockGetBudgets.mockResolvedValue({
        success: false,
        error: { message: "boom" },
      });
      render(<FinancialOverviewScreen />);
      expect(await screen.findByText("Plaid Checking")).toBeTruthy();
      expect(screen.getByText("No budgets set yet.")).toBeTruthy();
    });
  });

  describe("honest states", () => {
    it("distinguishes a failed read from having no accounts, and retries", async () => {
      // A net worth of $0 and "we could not read your accounts" are opposite
      // statements about someone's finances.
      mockGetNetWorth.mockResolvedValue({
        success: false,
        error: { message: "boom" },
      });
      render(<FinancialOverviewScreen />);

      expect(
        await screen.findByText(/could not load your accounts/i),
      ).toBeTruthy();
      expect(screen.queryByText(/No accounts linked yet/i)).toBeNull();

      mockGetNetWorth.mockResolvedValue({ success: true, data: netWorth() });
      fireEvent.press(screen.getByText("Try again"));
      await waitFor(() => expect(mockGetNetWorth).toHaveBeenCalledTimes(2));
    });

    it("says so when nothing is linked", async () => {
      mockGetNetWorth.mockResolvedValue({
        success: true,
        data: netWorth({
          assets: [],
          liabilities: [],
          totalAssets: 0,
          totalLiabilities: 0,
          netWorth: 0,
        }),
      });
      render(<FinancialOverviewScreen />);
      expect(await screen.findByText(/No accounts linked yet/i)).toBeTruthy();
    });
  });
});
