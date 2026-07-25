/**
 * Financial CashFlowScreen — real-data wiring (PARITY-P2).
 *
 * The screen used to call financialOverviewApi.getCashFlow, which pointed at a
 * non-existent /financial/insights/cashflow route (the real one lives under
 * /financial/spending/cashflow) and declared a shape the endpoint never returns. Every
 * call 404'd and the screen SILENTLY fell back to a hardcoded MOCK_DATA array — real
 * users saw invented income/expense figures. It now fetches the user's real monthly
 * cash flow via getCashFlowAnalysis (adapted from the CashFlowAnalysis payload) with
 * honest inline loading / error+retry / empty states and pull-to-refresh. The hardcoded
 * "Cash Flow Tips" (which asserted the savings rate was healthy regardless of data) were
 * replaced with the route's real recommendations, omitted when the source returns none.
 *
 * These tests prove: fetch-on-mount, a summary + per-month bars computed from real data,
 * real recommendations render (and the tips card is omitted when there are none), and
 * each honest state (loading / error+retry with no fabricated fallback / empty) shows.
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
import type { CashFlowAnalysisData } from "../../services/api/financial";

const mockGetCashFlowAnalysis = jest.fn();

// RN's RefreshControl resolves undefined under this jest setup; stub just that
// module so the ScrollView's refreshControl prop renders.
jest.mock(
  "react-native/Libraries/Components/RefreshControl/RefreshControl",
  () => "RefreshControl",
);

jest.mock("../../services/api/financial", () => ({
  financialOverviewApi: {
    getCashFlowAnalysis: (...args: unknown[]) =>
      mockGetCashFlowAnalysis(...args),
  },
}));

// expo-router is mocked globally in jest.setup.js.

import CashFlowScreen from "../../../app/financial/cash-flow";

// Two months with clean totals: income 12000, expenses 9000, net 3000,
// savings rate 25.0%.
function analysis(over: Partial<CashFlowAnalysisData> = {}): CashFlowAnalysisData {
  return {
    months: [
      { month: "Jan", income: 6000, expenses: 4000 },
      { month: "Feb", income: 6000, expenses: 5000 },
    ],
    recommendations: ["Trim dining out", "Automate savings transfers"],
    ...over,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Financial CashFlowScreen", () => {
  it("fetches cash flow from the API on mount for 6 months", async () => {
    mockGetCashFlowAnalysis.mockResolvedValue({
      success: true,
      data: analysis({ months: [], recommendations: [] }),
    });
    render(<CashFlowScreen />);
    await waitFor(() =>
      expect(mockGetCashFlowAnalysis).toHaveBeenCalledWith(6),
    );
  });

  it("renders a summary and per-month data computed from the real payload, plus real recommendations — never the removed MOCK_DATA", async () => {
    mockGetCashFlowAnalysis.mockResolvedValue({
      success: true,
      data: analysis(),
    });

    render(<CashFlowScreen />);

    // Summary computed from real months: income 12000, expenses 9000, net 3000,
    // savings rate 25.0%.
    expect(await screen.findByText("$12.0K")).toBeTruthy();
    expect(screen.getByText("$9.0K")).toBeTruthy();
    expect(screen.getByText("$3.0K")).toBeTruthy();
    expect(screen.getByText("25.0%")).toBeTruthy();
    expect(screen.getByText("Total Income")).toBeTruthy();
    expect(screen.getByText("Savings Rate")).toBeTruthy();

    // Real recommendations replace the old hardcoded tips.
    expect(screen.getByText("Cash Flow Tips")).toBeTruthy();
    expect(screen.getByText("• Trim dining out")).toBeTruthy();
    expect(screen.getByText("• Automate savings transfers")).toBeTruthy();

    // Switch to the bar view — per-month labels and net values prove the real
    // monthly data flows through (not just the aggregate).
    fireEvent.press(screen.getByTestId("cash-flow-toggle-bar"));
    expect(screen.getByText("Jan")).toBeTruthy();
    expect(screen.getByText("Feb")).toBeTruthy();
    expect(screen.getByText("+$2,000")).toBeTruthy(); // Jan: 6000 - 4000
    expect(screen.getByText("+$1,000")).toBeTruthy(); // Feb: 6000 - 5000

    // The removed MOCK_DATA covered Jul–Dec; none of it should ever render.
    expect(screen.queryByText("Dec")).toBeNull();
    expect(screen.queryByText("$33.4K")).toBeNull(); // mock total income
  });

  it("omits the tips card when the endpoint returns no recommendations", async () => {
    mockGetCashFlowAnalysis.mockResolvedValue({
      success: true,
      data: analysis({ recommendations: [] }),
    });

    render(<CashFlowScreen />);

    // Summary still renders from the real months...
    expect(await screen.findByText("$12.0K")).toBeTruthy();
    // ...but there is no invented tips content.
    expect(screen.queryByText("Cash Flow Tips")).toBeNull();
  });

  it("shows the loading state while the first fetch is in flight", () => {
    mockGetCashFlowAnalysis.mockReturnValue(new Promise<never>(() => undefined));
    render(<CashFlowScreen />);
    expect(screen.getByTestId("financial-cash-flow-loading")).toBeTruthy();
  });

  it("shows an honest error state with retry when the fetch fails — never MOCK_DATA", async () => {
    mockGetCashFlowAnalysis.mockResolvedValue({
      success: false,
      error: { code: "NETWORK_ERROR", message: "Network down" },
    });

    render(<CashFlowScreen />);

    expect(
      await screen.findByTestId("financial-cash-flow-error"),
    ).toBeTruthy();
    expect(screen.getByText("Network down")).toBeTruthy();

    // The old silent fallback would have shown fabricated figures here — it must not.
    expect(screen.queryByText("Total Income")).toBeNull();
    expect(screen.queryByText("$33.4K")).toBeNull();

    fireEvent.press(screen.getByText("Try Again"));
    await waitFor(() =>
      expect(mockGetCashFlowAnalysis).toHaveBeenCalledTimes(2),
    );
  });

  it("shows the inline empty state when there is no cash flow data", async () => {
    mockGetCashFlowAnalysis.mockResolvedValue({
      success: true,
      data: analysis({ months: [], recommendations: [] }),
    });
    render(<CashFlowScreen />);
    expect(
      await screen.findByTestId("financial-cash-flow-empty"),
    ).toBeTruthy();
    expect(screen.getByText("No cash flow yet")).toBeTruthy();
  });

  it("re-fetches on pull-to-refresh", async () => {
    mockGetCashFlowAnalysis.mockResolvedValue({
      success: true,
      data: analysis(),
    });

    const { UNSAFE_getAllByType } = render(<CashFlowScreen />);
    await screen.findByText("$12.0K");

    // The outer ScrollView (first in tree) carries the refreshControl.
    const scroll = UNSAFE_getAllByType(ScrollView)[0];
    await act(async () => {
      await scroll.props.refreshControl.props.onRefresh();
    });

    // mount + refresh
    expect(mockGetCashFlowAnalysis).toHaveBeenCalledTimes(2);
  });
});
