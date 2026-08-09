/**
 * Credit Repair PaymentsScreen — real-data wiring (PARITY-P2).
 *
 * The screen used to render a hardcoded PAYMENTS array behind a fake setTimeout
 * load, an on-time % computed from that array, and a fabricated calendar hint. It
 * now fetches the user's real recurring bills from billsApi.getBills
 * (GET /api/financial/bills) with honest inline loading/error/empty states and
 * pull-to-refresh. The bills endpoint carries no paid/on-time history, so the
 * on-time % and "late" count were OMITTED, not fabricated. These tests prove the
 * real bills render, the summary is computed from real data, the on-time % is gone,
 * the former hardcoded accounts/calendar text never appear, and each honest state
 * shows.
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
import type { BillItem } from "../../services/api/financial";

const mockGetBills = jest.fn();

// RN's RefreshControl resolves undefined under this jest setup; stub just that
// module so the ScrollView's refreshControl prop renders.
jest.mock(
  "react-native/Libraries/Components/RefreshControl/RefreshControl",
  () => "RefreshControl",
);

jest.mock("../../services/api/financial", () => ({
  billsApi: {
    getBills: (...args: unknown[]) => mockGetBills(...args),
  },
}));

// expo-router is mocked globally in jest.setup.js.

import PaymentsScreen from "../../../app/credit-repair/payments";

function bill(over: Partial<BillItem> = {}): BillItem {
  return {
    id: "b1",
    merchant: "Pacific Gas Electric",
    amount: 120,
    dueDate: "2026-03-20T00:00:00.000Z",
    category: "utilities",
    isAutoPay: true,
    ...over,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Credit Repair PaymentsScreen", () => {
  it("fetches bills from the API on mount", async () => {
    mockGetBills.mockResolvedValue({ success: true, data: { bills: [] } });
    render(<PaymentsScreen />);
    await waitFor(() => expect(mockGetBills).toHaveBeenCalledTimes(1));
  });

  it("renders real bills and a computed summary; never the removed mock values or on-time %", async () => {
    mockGetBills.mockResolvedValue({
      success: true,
      data: {
        bills: [
          bill({
            id: "b1",
            merchant: "Pacific Gas Electric",
            amount: 120,
            category: "utilities",
            isAutoPay: true,
          }),
          bill({
            id: "b2",
            merchant: "State Farm",
            amount: 85,
            category: "insurance",
            isAutoPay: false,
          }),
          bill({
            id: "b3",
            merchant: "Comcast Xfinity",
            amount: 70,
            dueDate: "",
            category: "",
            isAutoPay: true,
          }),
        ],
      },
    });

    render(<PaymentsScreen />);

    // Real merchant names.
    expect(await screen.findByText("Pacific Gas Electric")).toBeTruthy();
    expect(screen.getByText("State Farm")).toBeTruthy();
    expect(screen.getByText("Comcast Xfinity")).toBeTruthy();

    // Real amounts.
    expect(screen.getByText("$120")).toBeTruthy();
    expect(screen.getByText("$85")).toBeTruthy();
    expect(screen.getByText("$70")).toBeTruthy();

    // Computed summary from real bills: 3 bills total, 2 on autopay.
    expect(screen.getByText("Total")).toBeTruthy();
    expect(screen.getByText("On Autopay")).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy();
    expect(screen.getByText("2")).toBeTruthy();

    // Autopay tag renders once per automated bill (b1 + b3).
    expect(screen.getAllByText("Autopay")).toHaveLength(2);

    // The bill with no due date shows an honest placeholder, not a fake date.
    expect(screen.getByText("No due date")).toBeTruthy();

    // On-time % / payment-history metrics were OMITTED (no honest source).
    expect(screen.queryByText("On-Time Rate")).toBeNull();

    // Former screen labels that implied payment history are gone.
    expect(screen.queryByText("Payment History")).toBeNull();
    expect(screen.queryByText("Recent Payments")).toBeNull();

    // Former hardcoded PAYMENTS accounts must never appear.
    expect(screen.queryByText("Chase Credit Card")).toBeNull();
    expect(screen.queryByText("Capital One")).toBeNull();
    expect(screen.queryByText("Discover")).toBeNull();
    expect(screen.queryByText("Bank of America")).toBeNull();
    expect(screen.queryByText("Citi")).toBeNull();
    expect(screen.queryByText("Wells Fargo")).toBeNull();

    // Former fabricated calendar hint must never appear.
    expect(
      screen.queryByText(
        "Next payment due in 3 days: Chase Credit Card - $250",
      ),
    ).toBeNull();
  });

  it("shows the loading state while the first fetch is in flight", () => {
    mockGetBills.mockReturnValue(new Promise<never>(() => undefined));
    render(<PaymentsScreen />);
    expect(screen.getByTestId("credit-repair-payments-loading")).toBeTruthy();
  });

  it("shows an honest error state with retry when the fetch fails", async () => {
    mockGetBills.mockResolvedValue({
      success: false,
      error: { code: "NETWORK_ERROR", message: "Network down" },
    });

    render(<PaymentsScreen />);

    expect(
      await screen.findByTestId("credit-repair-payments-error"),
    ).toBeTruthy();
    expect(screen.getByText("Network down")).toBeTruthy();

    fireEvent.press(screen.getByText("Try Again"));
    await waitFor(() => expect(mockGetBills).toHaveBeenCalledTimes(2));
  });

  it("shows the inline empty state when there are no bills", async () => {
    mockGetBills.mockResolvedValue({ success: true, data: { bills: [] } });
    render(<PaymentsScreen />);
    expect(
      await screen.findByTestId("credit-repair-payments-empty"),
    ).toBeTruthy();
    expect(screen.getByText("No bills yet")).toBeTruthy();
  });

  it("re-fetches on pull-to-refresh", async () => {
    mockGetBills.mockResolvedValue({
      success: true,
      data: { bills: [bill()] },
    });

    const { UNSAFE_getByType } = render(<PaymentsScreen />);
    await screen.findByText("Pacific Gas Electric");

    const scroll = UNSAFE_getByType(ScrollView);
    await act(async () => {
      await scroll.props.refreshControl.props.onRefresh();
    });

    // mount + refresh
    expect(mockGetBills).toHaveBeenCalledTimes(2);
  });
});
