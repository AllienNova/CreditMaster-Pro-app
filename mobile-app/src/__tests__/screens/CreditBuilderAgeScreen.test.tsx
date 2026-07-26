/**
 * Credit Builder AgeScreen — real-data wiring (M2-1).
 *
 * The screen used to render a hardcoded MOCK_ACCOUNTS array (Chase Freedom,
 * Capital One, Discover It, Auto Loan, Student Loan, Old Card) with a local
 * Account interface and fabricated ages. It now fetches the user's real credit
 * accounts from creditRepairApi.getAccounts (GET /api/credit-repair/accounts) with
 * honest inline loading / error / empty states and a retry. These tests prove the
 * fetch happens on mount, real accounts render with average age computed only over
 * accounts whose age is KNOWN, an account with an unknown age renders "Age unknown"
 * (never coerced to 0y and never dragged into the average), the removed mock names
 * never appear, and each honest state shows. The API boundary is mocked — no live
 * route is hit.
 */

import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react-native";
import type { CreditAccount } from "../../services/api/creditRepair";

const mockGetAccounts = jest.fn();

jest.mock("../../services/api/creditRepair", () => ({
  creditRepairApi: {
    getAccounts: (...args: unknown[]) => mockGetAccounts(...args),
  },
}));

// expo-router is mocked globally in jest.setup.js.

import AgeScreen from "../../../app/credit-builder/age";

function account(over: Partial<CreditAccount> = {}): CreditAccount {
  return {
    id: "a1",
    name: "Bank of America",
    type: "Credit Card",
    balance: 1200,
    creditLimit: 5000,
    status: "current",
    openDate: "2016-03-15",
    ageMonths: 118,
    ageYears: 9,
    ...over,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Credit Builder AgeScreen", () => {
  it("fetches accounts from the API on mount", async () => {
    mockGetAccounts.mockResolvedValue({
      success: true,
      data: { accounts: [] },
    });
    render(<AgeScreen />);
    await waitFor(() => expect(mockGetAccounts).toHaveBeenCalledTimes(1));
  });

  it("renders real accounts with average age computed from them; never the removed mock accounts", async () => {
    mockGetAccounts.mockResolvedValue({
      success: true,
      data: {
        accounts: [
          account({ id: "a1", name: "Bank of America", ageMonths: 118, ageYears: 9 }),
          account({ id: "a2", name: "Wells Fargo", ageMonths: 78, ageYears: 6 }),
        ],
      },
    });

    render(<AgeScreen />);

    // Real creditor names.
    expect(await screen.findByText("Bank of America")).toBeTruthy();
    expect(screen.getByText("Wells Fargo")).toBeTruthy();

    // Per-account ages: 118 -> 9y 10m, 78 -> 6y 6m.
    expect(screen.getByText("9y 10m")).toBeTruthy();
    expect(screen.getByText("6y 6m")).toBeTruthy();

    // Average age is computed from the real accounts: (118 + 78) / 2 = 98 -> 8y 2m.
    expect(screen.getByText("8y 2m")).toBeTruthy();

    // The six former hardcoded MOCK_ACCOUNTS names must never appear.
    expect(screen.queryByText("Chase Freedom")).toBeNull();
    expect(screen.queryByText("Capital One")).toBeNull();
    expect(screen.queryByText("Discover It")).toBeNull();
    expect(screen.queryByText("Auto Loan")).toBeNull();
    expect(screen.queryByText("Student Loan")).toBeNull();
    expect(screen.queryByText("Old Card")).toBeNull();
  });

  it("renders an unknown age honestly — never 0y and never counted in the average", async () => {
    mockGetAccounts.mockResolvedValue({
      success: true,
      data: {
        accounts: [
          account({ id: "a1", name: "Known Bank", ageMonths: 60, ageYears: 5 }),
          account({
            id: "a2",
            name: "Unknown Bank",
            ageMonths: null,
            ageYears: null,
            openDate: null,
          }),
        ],
      },
    });

    render(<AgeScreen />);

    expect(await screen.findByText("Unknown Bank")).toBeTruthy();
    // The unknown-age account shows an honest label, not a fabricated age.
    expect(screen.getByText("Age unknown")).toBeTruthy();
    // A null age is NEVER coerced to 0y 0m.
    expect(screen.queryByText("0y 0m")).toBeNull();
    // The unknown age is excluded from the average — the average is over the one
    // known account (60 -> 5y 0m), NOT (60 + 0) / 2 = 30 -> 2y 6m.
    expect(screen.queryByText("2y 6m")).toBeNull();
  });

  it("shows the loading state while the first fetch is in flight", () => {
    mockGetAccounts.mockReturnValue(new Promise<never>(() => undefined));
    render(<AgeScreen />);
    expect(screen.getByTestId("age-loading")).toBeTruthy();
  });

  it("shows an honest error state with retry when the fetch fails", async () => {
    mockGetAccounts.mockResolvedValue({
      success: false,
      error: { code: "NETWORK_ERROR", message: "Network down" },
    });

    render(<AgeScreen />);

    expect(await screen.findByTestId("age-error")).toBeTruthy();
    expect(screen.getByText("Network down")).toBeTruthy();

    // Retry re-fetches.
    mockGetAccounts.mockResolvedValue({
      success: true,
      data: { accounts: [account()] },
    });
    fireEvent.press(screen.getByText("Try Again"));
    await waitFor(() => expect(mockGetAccounts).toHaveBeenCalledTimes(2));
  });

  it("shows the inline empty state when the user has no accounts", async () => {
    mockGetAccounts.mockResolvedValue({
      success: true,
      data: { accounts: [] },
    });
    render(<AgeScreen />);
    expect(await screen.findByTestId("age-empty")).toBeTruthy();
    expect(screen.getByText("No accounts yet")).toBeTruthy();
  });
});
