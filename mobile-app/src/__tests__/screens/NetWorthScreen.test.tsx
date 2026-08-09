/**
 * Financial NetWorthScreen — real-data wiring (PARITY).
 *
 * The screen used to render hardcoded MOCK_ASSETS / MOCK_LIABILITIES / MOCK_HISTORY,
 * classify accounts by balance SIGN (wrong for Plaid — credit/loan balances are
 * positive amounts owed), and silently fall back to those mocks on any error. It now
 * fetches the user's real accounts via financialOverviewApi.getNetWorth (adapted from
 * GET /api/financial/accounts, classified by accountType like the web dashboard) with
 * honest inline loading / error+retry / empty states and pull-to-refresh.
 *
 * These tests prove: fetch-on-mount, a net worth + assets/liabilities computed from the
 * real payload (never the removed mocks), the history chart empty-stated rather than
 * fabricated, and each honest state (loading / error+retry with no fabricated fallback /
 * empty) shows.
 */

import React from "react";
import { ScrollView } from "react-native";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react-native";
import type { NetWorthData } from "../../services/api/financial";

const mockGetNetWorth = jest.fn();

// RN's RefreshControl resolves undefined under this jest setup; stub just that
// module so the ScrollView's refreshControl prop renders.
jest.mock(
  "react-native/Libraries/Components/RefreshControl/RefreshControl",
  () => "RefreshControl",
);

jest.mock("../../services/api/financial", () => ({
  financialOverviewApi: {
    getNetWorth: (...args: unknown[]) => mockGetNetWorth(...args),
  },
}));

// expo-router is mocked globally in jest.setup.js.

import NetWorthScreen from "../../../app/financial/net-worth";

// Assets 50,000 (10k checking + 40k brokerage), liabilities 20,000 (5k credit + 15k
// loan), net worth 30,000. Debts are POSITIVE balances, proving accountType — not sign
// — drives the split.
function netWorth(over: Partial<NetWorthData> = {}): NetWorthData {
  return {
    assets: [
      {
        id: "a1",
        name: "Checking",
        subtype: "checking",
        accountType: "depository",
        value: 10000,
      },
      {
        id: "a2",
        name: "Brokerage",
        subtype: "brokerage",
        accountType: "investment",
        value: 40000,
      },
    ],
    liabilities: [
      {
        id: "l1",
        name: "Credit Card",
        subtype: "credit card",
        accountType: "credit",
        value: 5000,
      },
      {
        id: "l2",
        name: "Auto Loan",
        subtype: "auto",
        accountType: "loan",
        value: 15000,
      },
    ],
    totalAssets: 50000,
    totalLiabilities: 20000,
    netWorth: 30000,
    ...over,
  };
}

const EMPTY_NET_WORTH: NetWorthData = {
  assets: [],
  liabilities: [],
  totalAssets: 0,
  totalLiabilities: 0,
  netWorth: 0,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Financial NetWorthScreen", () => {
  it("fetches net worth from the API on mount", async () => {
    mockGetNetWorth.mockResolvedValue({
      success: true,
      data: EMPTY_NET_WORTH,
    });
    render(<NetWorthScreen />);
    await waitFor(() => expect(mockGetNetWorth).toHaveBeenCalledTimes(1));
  });

  it("renders net worth, assets, and liabilities computed from the real payload — never the removed mocks", async () => {
    mockGetNetWorth.mockResolvedValue({ success: true, data: netWorth() });

    render(<NetWorthScreen />);

    // Net worth summary and the compare row are computed from the real payload.
    // Total assets ($50K) also appears as the active pie's center value, so match all
    // occurrences; total liabilities ($20K) is unique to the compare row.
    expect(await screen.findByText("$30,000")).toBeTruthy();
    expect(screen.getAllByText("$50K").length).toBeGreaterThan(0); // total assets
    expect(screen.getByText("$20K")).toBeTruthy(); // total liabilities

    // Real account rows render with their real balances. Asset names also appear in
    // the active pie's legend, so assert their presence via getAllByText; the dollar
    // amounts are unique to the list rows.
    expect(screen.getAllByText("Checking").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Brokerage").length).toBeGreaterThan(0);
    expect(screen.getByText("$10,000")).toBeTruthy();
    expect(screen.getByText("$40,000")).toBeTruthy();
    expect(screen.getByText("Credit Card")).toBeTruthy();
    expect(screen.getByText("Auto Loan")).toBeTruthy();
    expect(screen.getByText("-$5,000")).toBeTruthy();
    expect(screen.getByText("-$15,000")).toBeTruthy();

    // The removed mock artifacts must never render.
    expect(screen.queryByText("Home Value")).toBeNull();
    expect(screen.queryByText("Retirement (401k)")).toBeNull();
    expect(screen.queryByText("Mortgage")).toBeNull();
    expect(screen.queryByText("Student Loans")).toBeNull();
    expect(screen.queryByText("$350,000")).toBeNull(); // mock home value
  });

  it("empty-states the net-worth history chart rather than fabricating a series", async () => {
    mockGetNetWorth.mockResolvedValue({ success: true, data: netWorth() });

    render(<NetWorthScreen />);

    // The history area is present but explicitly unavailable — no invented trend.
    expect(
      await screen.findByTestId("net-worth-history-unavailable"),
    ).toBeTruthy();
    expect(screen.getByText(/history isn.t available yet/)).toBeTruthy();

    // None of the removed MOCK_HISTORY month labels should render.
    expect(screen.queryByText("Jul")).toBeNull();
    expect(screen.queryByText("Dec")).toBeNull();
  });

  it("shows the loading state while the first fetch is in flight", () => {
    mockGetNetWorth.mockReturnValue(new Promise<never>(() => undefined));
    render(<NetWorthScreen />);
    expect(screen.getByTestId("financial-net-worth-loading")).toBeTruthy();
  });

  it("shows an honest error state with retry when the fetch fails — never the mock fallback", async () => {
    mockGetNetWorth.mockResolvedValue({
      success: false,
      error: { code: "NETWORK_ERROR", message: "Network down" },
    });

    render(<NetWorthScreen />);

    expect(
      await screen.findByTestId("financial-net-worth-error"),
    ).toBeTruthy();
    expect(screen.getByText("Network down")).toBeTruthy();

    // The old silent fallback would have shown fabricated balances here — it must not.
    expect(screen.queryByText("Total Assets")).toBeNull();
    expect(screen.queryByText("Home Value")).toBeNull();
    expect(screen.queryByText("$350,000")).toBeNull();

    fireEvent.press(screen.getByText("Try Again"));
    await waitFor(() => expect(mockGetNetWorth).toHaveBeenCalledTimes(2));
  });

  it("shows the inline empty state when the user has no classified accounts", async () => {
    mockGetNetWorth.mockResolvedValue({
      success: true,
      data: EMPTY_NET_WORTH,
    });
    render(<NetWorthScreen />);
    expect(
      await screen.findByTestId("financial-net-worth-empty"),
    ).toBeTruthy();
    expect(screen.getByText("No accounts yet")).toBeTruthy();
  });

  it("re-fetches on pull-to-refresh", async () => {
    mockGetNetWorth.mockResolvedValue({ success: true, data: netWorth() });

    const { UNSAFE_getAllByType } = render(<NetWorthScreen />);
    await screen.findByText("$30,000");

    // The outer ScrollView (first in tree) carries the refreshControl.
    const scroll = UNSAFE_getAllByType(ScrollView)[0];
    await act(async () => {
      await scroll.props.refreshControl.props.onRefresh();
    });

    // mount + refresh
    expect(mockGetNetWorth).toHaveBeenCalledTimes(2);
  });
});
