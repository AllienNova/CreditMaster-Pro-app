/**
 * Credit Builder DebtStrategyScreen — real-data wiring (PARITY).
 *
 * The screen used to render a hardcoded MOCK_DEBTS array (Credit Card 1/2, Personal Loan,
 * Store Card) plus three fabricated constants — avalancheSavings ($1,250), avalancheMonths
 * (22), snowballMonths (24) — and a made-up "Interest Saved: $0" for snowball. It now
 * fetches the user's real debts, summary, and avalanche/snowball comparison via
 * debtApi.getDebtPlan (adapted from GET /api/financial/debt?compare=true), with honest
 * inline loading / error+retry / empty states and pull-to-refresh.
 *
 * These tests prove: fetch-on-mount forwarding the minimum-payment baseline (extraPayment
 * 0), a summary + strategy comparison + debt list rendered from the real payload (never the
 * removed mocks or fabricated constants), the avalanche/snowball toggle staying local and
 * swapping to the OTHER strategy's real numbers without re-fetching, each honest state
 * (loading / error+retry with no fabricated fallback / empty), and pull-to-refresh.
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
import type { DebtPlanData } from "../../services/api/financial";

const mockGetDebtPlan = jest.fn();

// RN's RefreshControl resolves undefined under this jest setup; stub just that module so
// the ScrollView's refreshControl prop renders.
jest.mock(
  "react-native/Libraries/Components/RefreshControl/RefreshControl",
  () => "RefreshControl",
);

jest.mock("../../services/api/financial", () => ({
  debtApi: {
    getDebtPlan: (...args: unknown[]) => mockGetDebtPlan(...args),
  },
}));

// expo-router is mocked globally in jest.setup.js.

import DebtStrategyScreen from "../../../app/credit-builder/debt-strategy";

// Real payload: $41,350 across 3 debts, 13.3% avg APR. The comparison numbers are
// deliberately distinct from the removed fabricated constants (avalanche 22mo / $1,250
// saved, snowball 24mo) so their absence is a meaningful assertion. Names and balances are
// distinct from the removed MOCK_DEBTS (Credit Card 1/2, Personal Loan, Store Card).
function debtPlan(over: Partial<DebtPlanData> = {}): DebtPlanData {
  return {
    overview: {
      totalDebt: 41350,
      totalMinimumPayments: 750,
      averageInterestRate: 13.3,
      highestInterestRate: 27.24,
      debtCount: 3,
      projectedPayoffDate: "2031-02-15T00:00:00.000Z",
    },
    debts: [
      {
        id: "d1",
        name: "Visa Signature",
        type: "credit_card",
        balance: 6200,
        interestRate: 27.24,
        minimumPayment: 180,
      },
      {
        id: "d2",
        name: "RAV4 Auto",
        type: "auto_loan",
        balance: 11750,
        interestRate: 5.9,
        minimumPayment: 310,
      },
      {
        id: "d3",
        name: "Grad PLUS",
        type: "student_loan",
        balance: 23400,
        interestRate: 6.8,
        minimumPayment: 260,
      },
    ],
    comparison: {
      avalanche: {
        totalInterestPaid: 3980,
        totalMonths: 39,
        interestSaved: 740,
        monthsSaved: 5,
      },
      snowball: {
        totalInterestPaid: 4520,
        totalMonths: 44,
        interestSaved: 410,
        monthsSaved: 3,
      },
      recommendation: "avalanche",
      recommendationReason: "Avalanche saves $540 in interest over snowball",
    },
    ...over,
  };
}

const EMPTY_DEBT_PLAN: DebtPlanData = {
  overview: {
    totalDebt: 0,
    totalMinimumPayments: 0,
    averageInterestRate: 0,
    highestInterestRate: 0,
    debtCount: 0,
    projectedPayoffDate: "",
  },
  debts: [],
  comparison: {
    avalanche: {
      totalInterestPaid: 0,
      totalMonths: 0,
      interestSaved: 0,
      monthsSaved: 0,
    },
    snowball: {
      totalInterestPaid: 0,
      totalMonths: 0,
      interestSaved: 0,
      monthsSaved: 0,
    },
    recommendation: "avalanche",
    recommendationReason: "",
  },
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Credit Builder DebtStrategyScreen", () => {
  it("fetches the debt plan on mount, forwarding the minimum-payment baseline (extraPayment 0)", async () => {
    mockGetDebtPlan.mockResolvedValue({ success: true, data: EMPTY_DEBT_PLAN });
    render(<DebtStrategyScreen />);
    await waitFor(() => expect(mockGetDebtPlan).toHaveBeenCalledTimes(1));
    expect(mockGetDebtPlan).toHaveBeenCalledWith(0);
  });

  it("renders the summary, real avalanche comparison, and debt list from the payload — never the removed mocks or fabricated constants", async () => {
    mockGetDebtPlan.mockResolvedValue({ success: true, data: debtPlan() });

    render(<DebtStrategyScreen />);

    // Summary comes from the real overview.
    expect(await screen.findByText("$41,350")).toBeTruthy(); // total debt
    expect(screen.getByText("Avg APR: 13.3%")).toBeTruthy();

    // Explanation card shows the selected strategy's (avalanche) real comparison numbers.
    expect(screen.getByText("39 months")).toBeTruthy(); // avalanche payoff time
    expect(screen.getByText("$740")).toBeTruthy(); // avalanche interest saved

    // Real debt rows (names + balances from the payload, APR from interestRate).
    expect(screen.getByText("Visa Signature")).toBeTruthy();
    expect(screen.getByText("RAV4 Auto")).toBeTruthy();
    expect(screen.getByText("Grad PLUS")).toBeTruthy();
    expect(screen.getByText("$6,200")).toBeTruthy();
    expect(screen.getByText("$11,750")).toBeTruthy();
    expect(screen.getByText("$23,400")).toBeTruthy();
    expect(screen.getByText(/27\.24% APR/)).toBeTruthy();

    // Recommendation uses the route's real recommendationReason.
    expect(
      screen.getByText("Avalanche saves $540 in interest over snowball"),
    ).toBeTruthy();

    // The removed MOCK_DEBTS must never render.
    expect(screen.queryByText("Credit Card 1")).toBeNull();
    expect(screen.queryByText("Credit Card 2")).toBeNull();
    expect(screen.queryByText("Personal Loan")).toBeNull();
    expect(screen.queryByText("Store Card")).toBeNull();

    // The fabricated constants must never render.
    expect(screen.queryByText("22 months")).toBeNull(); // old avalancheMonths
    expect(screen.queryByText("24 months")).toBeNull(); // old snowballMonths
    expect(screen.queryByText("$1,250")).toBeNull(); // old avalancheSavings
  });

  it("toggling to snowball swaps to the other strategy's real numbers without re-fetching", async () => {
    mockGetDebtPlan.mockResolvedValue({ success: true, data: debtPlan() });

    render(<DebtStrategyScreen />);
    await screen.findByText("$41,350");
    expect(screen.getByText("Debt Avalanche")).toBeTruthy();
    expect(screen.getByText("39 months")).toBeTruthy();

    fireEvent.press(screen.getByTestId("credit-builder-strategy-snowball"));

    // The explanation now reflects the snowball strategy's real comparison numbers...
    expect(screen.getByText("Debt Snowball")).toBeTruthy();
    expect(screen.getByText("44 months")).toBeTruthy(); // snowball payoff time
    expect(screen.getByText("$410")).toBeTruthy(); // snowball interest saved

    // Toggling back to avalanche restores its real numbers (bidirectional, still local).
    fireEvent.press(screen.getByTestId("credit-builder-strategy-avalanche"));
    expect(screen.getByText("Debt Avalanche")).toBeTruthy();
    expect(screen.getByText("39 months")).toBeTruthy();
    expect(screen.getByText("$740")).toBeTruthy();

    // No extra fetch was triggered (the comparison already carries both strategies).
    expect(mockGetDebtPlan).toHaveBeenCalledTimes(1);
  });

  it("shows the loading state while the first fetch is in flight", () => {
    mockGetDebtPlan.mockReturnValue(new Promise<never>(() => undefined));
    render(<DebtStrategyScreen />);
    expect(
      screen.getByTestId("credit-builder-debt-strategy-loading"),
    ).toBeTruthy();
  });

  it("shows an honest error state with retry when the fetch fails — never the mock fallback", async () => {
    mockGetDebtPlan.mockResolvedValue({
      success: false,
      error: { code: "NETWORK_ERROR", message: "Network down" },
    });

    render(<DebtStrategyScreen />);

    expect(
      await screen.findByTestId("credit-builder-debt-strategy-error"),
    ).toBeTruthy();
    expect(screen.getByText("Network down")).toBeTruthy();

    // The old silent fallback would have shown fabricated debts/constants here — it must not.
    expect(screen.queryByText("Credit Card 1")).toBeNull();
    expect(screen.queryByText("$1,250")).toBeNull();

    fireEvent.press(screen.getByText("Try Again"));
    await waitFor(() => expect(mockGetDebtPlan).toHaveBeenCalledTimes(2));
  });

  it("shows the inline empty state when the user has no debts", async () => {
    mockGetDebtPlan.mockResolvedValue({ success: true, data: EMPTY_DEBT_PLAN });
    render(<DebtStrategyScreen />);
    expect(
      await screen.findByTestId("credit-builder-debt-strategy-empty"),
    ).toBeTruthy();
    expect(screen.getByText("No debts tracked yet")).toBeTruthy();
  });

  it("re-fetches on pull-to-refresh", async () => {
    mockGetDebtPlan.mockResolvedValue({ success: true, data: debtPlan() });

    const { UNSAFE_getAllByType } = render(<DebtStrategyScreen />);
    await screen.findByText("$41,350");

    const scroll = UNSAFE_getAllByType(ScrollView)[0];
    await act(async () => {
      await scroll.props.refreshControl.props.onRefresh();
    });

    // mount + refresh
    expect(mockGetDebtPlan).toHaveBeenCalledTimes(2);
  });
});
