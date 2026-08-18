/**
 * financial/accounts — real-data wiring.
 *
 * Found by sweeping for the balance-sign pattern after fixing
 * financial/overview. This was the THIRD occurrence of the same rule, and the
 * two screens link to each other, so they would have agreed — in the same
 * wrong direction.
 *
 *     const totalAssets = ACCOUNTS.filter((a) => a.balance > 0)...
 *     const totalLiabilities = ACCOUNTS.filter((a) => a.balance < 0)...
 *
 * Plaid reports a credit or loan balance as POSITIVE — the amount owed — so
 * against a real payload every debt lands in the assets column. The fixture
 * hid it by hand-signing its own numbers.
 */

import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react-native";
import type { NetWorthData } from "../../services/api/financial";

const mockGetNetWorth = jest.fn();

jest.mock("../../services/api/financial", () => ({
  financialOverviewApi: {
    getNetWorth: (...a: unknown[]) => mockGetNetWorth(...a),
  },
}));

// expo-router is mocked globally in jest.setup.js.

import AccountsScreen from "../../../app/financial/accounts";

function netWorth(over: Partial<NetWorthData> = {}): NetWorthData {
  return {
    assets: [
      {
        id: "a1",
        name: "Plaid Checking",
        value: 8542.5,
        accountType: "depository",
        subtype: "checking",
      },
      {
        id: "a2",
        name: "Plaid IRA",
        value: 12000,
        accountType: "investment",
        subtype: "ira",
      },
    ],
    liabilities: [
      {
        id: "l1",
        name: "Plaid Credit Card",
        value: 2300,
        accountType: "credit",
        subtype: "credit card",
      },
    ],
    totalAssets: 20542.5,
    totalLiabilities: 2300,
    netWorth: 18242.5,
    ...over,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetNetWorth.mockResolvedValue({ success: true, data: netWorth() });
});

describe("financial/accounts", () => {
  it("fetches on mount instead of rendering a fixture", async () => {
    render(<AccountsScreen />);
    await waitFor(() => expect(mockGetNetWorth).toHaveBeenCalled());
  });

  it("never shows the invented accounts again", async () => {
    render(<AccountsScreen />);
    await waitFor(() => expect(mockGetNetWorth).toHaveBeenCalled());
    expect(screen.queryByText("Primary Checking")).toBeNull();
    expect(screen.queryByText("Chase")).toBeNull();
  });

  it("subtracts a positive credit balance instead of adding it", async () => {
    // 20,542.50 of assets and 2,300 owed on a card whose stored balance is
    // POSITIVE. The old sign rule would have produced 22,842.50.
    render(<AccountsScreen />);
    expect(await screen.findByText(/18,242\.5/)).toBeTruthy();
    expect(screen.queryByText(/22,842\.5/)).toBeNull();
  });

  it("renders a liability as negative even though its value is positive", async () => {
    render(<AccountsScreen />);
    expect(await screen.findByText("-$2,300")).toBeTruthy();
  });

  it("agrees with the overview, because both read the same adapter", async () => {
    // The two screens link to each other. Recomputing in either is how they
    // drift apart.
    render(<AccountsScreen />);
    await waitFor(() => expect(mockGetNetWorth).toHaveBeenCalled());
    expect(mockGetNetWorth).toHaveBeenCalledTimes(1);
  });

  describe("filters", () => {
    it("uses the types NetWorthAccount can hold", async () => {
      // "checking" and "savings" were chips no real account could match:
      // Plaid's type is `depository` and the subtype tells them apart.
      render(<AccountsScreen />);
      await waitFor(() => expect(mockGetNetWorth).toHaveBeenCalled());
      // Chips are title-cased by the screen.
      expect(screen.queryByText("Checking")).toBeNull();
      expect(screen.queryByText("Savings")).toBeNull();
      expect(screen.getByText("Depository")).toBeTruthy();
    });

    it("filters by the real accountType", async () => {
      render(<AccountsScreen />);
      await waitFor(() => expect(mockGetNetWorth).toHaveBeenCalled());

      fireEvent.press(screen.getByText("Credit"));
      await waitFor(() =>
        expect(screen.queryByText("Plaid Checking")).toBeNull(),
      );
      expect(screen.getByText("Plaid Credit Card")).toBeTruthy();
    });

    it("says so when a filter matches nothing", async () => {
      render(<AccountsScreen />);
      await waitFor(() => expect(mockGetNetWorth).toHaveBeenCalled());

      fireEvent.press(screen.getByText("Loan"));
      expect(
        await screen.findByText("No accounts of this type."),
      ).toBeTruthy();
    });
  });

  it("shows no connection-status dot, because the payload has none", async () => {
    // A green "connected" dot is a claim about the bank connection that
    // NetWorthAccount cannot make; that lives on settings/connected-accounts.
    render(<AccountsScreen />);
    await waitFor(() => expect(mockGetNetWorth).toHaveBeenCalled());
    expect(screen.queryByText(/Updated /)).toBeNull();
    expect(screen.queryByText(/Available:/)).toBeNull();
  });

  describe("honest states", () => {
    it("distinguishes a failed read from having no accounts, and retries", async () => {
      mockGetNetWorth.mockResolvedValue({
        success: false,
        error: { message: "boom" },
      });
      render(<AccountsScreen />);

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
      render(<AccountsScreen />);
      expect(await screen.findByText(/No accounts linked yet/i)).toBeTruthy();
    });
  });
});
