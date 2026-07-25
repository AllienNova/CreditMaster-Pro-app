/**
 * Financial DebtScreen — real-data wiring (PARITY).
 *
 * The screen used to render a hardcoded MOCK_DEBTS array, a fabricated STRATEGIES object
 * (invented totalInterest / payoffMonths), a made-up "Save $X in interest" heuristic
 * (extraPayment * 12 * 0.15), and silently fell back to those mocks on any error. It now
 * fetches the user's real debts, summary, and avalanche/snowball comparison via
 * debtApi.getDebtPlan (adapted from GET /api/financial/debt?compare=true) with honest
 * inline loading / error+retry / empty states and pull-to-refresh.
 *
 * These tests prove: fetch-on-mount, a summary + strategy comparison + debt list rendered
 * from the real payload (never the removed mocks or fabricated strategy numbers), the
 * extra-payment selector re-fetching so the numbers stay real, the strategy toggle
 * staying local (no re-fetch), and each honest state (loading / error+retry with no
 * fabricated fallback / empty).
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

import DebtScreen from "../../../app/financial/debt";

// Real payload: $48K across 3 debts, $900/mo minimums, 12.5% avg APR. The comparison
// numbers are deliberately distinct from the removed fabricated STRATEGIES ($4,250 / 36mo
// avalanche, $4,890 / 38mo snowball) so their absence is a meaningful assertion.
function debtPlan(over: Partial<DebtPlanData> = {}): DebtPlanData {
  return {
    overview: {
      totalDebt: 48000,
      totalMinimumPayments: 900,
      averageInterestRate: 12.5,
      highestInterestRate: 24.99,
      debtCount: 3,
      projectedPayoffDate: "2030-06-15T00:00:00.000Z",
    },
    debts: [
      {
        id: "d1",
        name: "Visa Signature",
        type: "credit_card",
        balance: 5000,
        interestRate: 24.99,
        minimumPayment: 150,
      },
      {
        id: "d2",
        name: "Auto Loan",
        type: "auto_loan",
        balance: 15000,
        interestRate: 5.5,
        minimumPayment: 350,
      },
      {
        id: "d3",
        name: "Grad PLUS",
        type: "student_loan",
        balance: 28000,
        interestRate: 6.8,
        minimumPayment: 400,
      },
    ],
    comparison: {
      avalanche: {
        totalInterestPaid: 4231,
        totalMonths: 34,
        interestSaved: 612,
        monthsSaved: 4,
      },
      snowball: {
        totalInterestPaid: 5102,
        totalMonths: 41,
        interestSaved: 288,
        monthsSaved: 2,
      },
      recommendation: "avalanche",
      recommendationReason: "Avalanche saves $871 in interest",
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

describe("Financial DebtScreen", () => {
  it("fetches the debt plan from the API on mount, forwarding the default extra payment", async () => {
    mockGetDebtPlan.mockResolvedValue({ success: true, data: EMPTY_DEBT_PLAN });
    render(<DebtScreen />);
    await waitFor(() => expect(mockGetDebtPlan).toHaveBeenCalledTimes(1));
    expect(mockGetDebtPlan).toHaveBeenCalledWith(200);
  });

  it("renders the summary, real avalanche/snowball comparison, and debt list from the payload — never the removed mocks or fabricated strategies", async () => {
    mockGetDebtPlan.mockResolvedValue({ success: true, data: debtPlan() });

    render(<DebtScreen />);

    // Summary comes from the real overview.
    expect(await screen.findByText("$48,000")).toBeTruthy(); // total debt
    expect(screen.getByText("$900/mo")).toBeTruthy(); // total minimum payments
    expect(screen.getByText("12.5%")).toBeTruthy(); // average APR

    // Strategy cards render the real comparison numbers.
    expect(screen.getByText("$4,231")).toBeTruthy(); // avalanche interest
    expect(screen.getByText("34 mo")).toBeTruthy(); // avalanche months
    expect(screen.getByText("$5,102")).toBeTruthy(); // snowball interest
    expect(screen.getByText("41 mo")).toBeTruthy(); // snowball months

    // The interest-saved line uses the route's real interestSaved for the selected
    // strategy (avalanche), never the removed extraPayment*12*0.15 heuristic.
    expect(screen.getByText("Save $612 in interest")).toBeTruthy();

    // Real debt rows.
    expect(screen.getByText("Visa Signature")).toBeTruthy();
    expect(screen.getByText("Auto Loan")).toBeTruthy();
    expect(screen.getByText("Grad PLUS")).toBeTruthy();
    expect(screen.getByText("$5,000")).toBeTruthy();
    expect(screen.getByText("$15,000")).toBeTruthy();
    expect(screen.getByText("$28,000")).toBeTruthy();

    // The removed MOCK_DEBTS must never render.
    expect(screen.queryByText("Chase Sapphire")).toBeNull();
    expect(screen.queryByText("Capital One")).toBeNull();
    expect(screen.queryByText("Discover")).toBeNull();
    expect(screen.queryByText("Car Loan")).toBeNull();
    expect(screen.queryByText("$4,500")).toBeNull(); // mock Chase balance
    expect(screen.queryByText("$12,500")).toBeNull(); // mock car-loan balance

    // The fabricated STRATEGIES numbers must never render.
    expect(screen.queryByText("$4,250")).toBeNull(); // old avalanche interest
    expect(screen.queryByText("36 mo")).toBeNull(); // old avalanche months
    expect(screen.queryByText("$4,890")).toBeNull(); // old snowball interest
    expect(screen.queryByText("38 mo")).toBeNull(); // old snowball months
  });

  it("shows the loading state while the first fetch is in flight", () => {
    mockGetDebtPlan.mockReturnValue(new Promise<never>(() => undefined));
    render(<DebtScreen />);
    expect(screen.getByTestId("financial-debt-loading")).toBeTruthy();
  });

  it("shows an honest error state with retry when the fetch fails — never the mock fallback", async () => {
    mockGetDebtPlan.mockResolvedValue({
      success: false,
      error: { code: "NETWORK_ERROR", message: "Network down" },
    });

    render(<DebtScreen />);

    expect(await screen.findByTestId("financial-debt-error")).toBeTruthy();
    expect(screen.getByText("Network down")).toBeTruthy();

    // The old silent fallback would have shown fabricated debts/strategies here — it must not.
    expect(screen.queryByText("Chase Sapphire")).toBeNull();
    expect(screen.queryByText("$4,250")).toBeNull();

    fireEvent.press(screen.getByText("Try Again"));
    await waitFor(() => expect(mockGetDebtPlan).toHaveBeenCalledTimes(2));
  });

  it("shows the inline empty state when the user has no debts", async () => {
    mockGetDebtPlan.mockResolvedValue({ success: true, data: EMPTY_DEBT_PLAN });
    render(<DebtScreen />);
    expect(await screen.findByTestId("financial-debt-empty")).toBeTruthy();
    expect(screen.getByText("No debts tracked yet")).toBeTruthy();
  });

  it("re-fetches with the new extra payment when a different amount is selected (numbers stay real)", async () => {
    mockGetDebtPlan.mockResolvedValue({ success: true, data: debtPlan() });

    render(<DebtScreen />);
    await screen.findByText("$48,000");
    expect(mockGetDebtPlan).toHaveBeenCalledWith(200); // mount default

    fireEvent.press(screen.getByTestId("debt-extra-300"));

    await waitFor(() => expect(mockGetDebtPlan).toHaveBeenCalledWith(300));
  });

  it("toggling the strategy re-sorts the payoff order locally without re-fetching", async () => {
    mockGetDebtPlan.mockResolvedValue({ success: true, data: debtPlan() });

    render(<DebtScreen />);
    await screen.findByText("$48,000");
    expect(screen.getByText(/Highest APR First/)).toBeTruthy();

    fireEvent.press(screen.getByTestId("debt-strategy-snowball"));

    // The order header reflects the snowball strategy...
    expect(screen.getByText(/Smallest Balance First/)).toBeTruthy();
    // ...and no extra fetch was triggered (the comparison already carries both strategies).
    expect(mockGetDebtPlan).toHaveBeenCalledTimes(1);
  });

  it("re-fetches on pull-to-refresh", async () => {
    mockGetDebtPlan.mockResolvedValue({ success: true, data: debtPlan() });

    const { UNSAFE_getAllByType } = render(<DebtScreen />);
    await screen.findByText("$48,000");

    const scroll = UNSAFE_getAllByType(ScrollView)[0];
    await act(async () => {
      await scroll.props.refreshControl.props.onRefresh();
    });

    // mount + refresh
    expect(mockGetDebtPlan).toHaveBeenCalledTimes(2);
  });
});
