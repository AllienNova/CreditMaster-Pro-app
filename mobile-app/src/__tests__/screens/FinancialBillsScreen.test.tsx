/**
 * Financial BillsScreen — real-data wiring (PARITY-P2).
 *
 * The screen used to consume billsApi.getUpcoming (mis-typed against a payload the
 * route never returns), so it read undefined fields, produced Invalid Dates, and on
 * the resulting error SILENTLY fell back to a hardcoded MOCK_BILLS array — real users
 * saw fabricated bills (Rent, Chase Sapphire, Netflix, ...). It now fetches the user's
 * real recurring bills from billsApi.getBills (GET /api/financial/bills) with honest
 * inline loading / error+retry / empty states and pull-to-refresh. Per-bill status is
 * derived from the real nextDueDate (upcoming / due_soon / overdue); there is no "Paid"
 * status because payment history has no HTTP source.
 *
 * These tests prove: fetch-on-mount, real bills + a computed summary render, the derived
 * statuses show (no fabricated "Paid"), missing merchant/date get honest placeholders,
 * the former MOCK_BILLS content never appears, filtering works, and each honest state
 * (loading / error+retry / empty) shows.
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

import BillsScreen from "../../../app/financial/bills";

function isoInDays(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

function bill(over: Partial<BillItem> = {}): BillItem {
  return {
    id: "b1",
    merchant: "Pacific Gas Electric",
    amount: 120,
    dueDate: isoInDays(2),
    category: "utilities",
    isAutoPay: true,
    ...over,
  };
}

// A representative payload: one bill per derived-status bucket plus one with no
// merchant/category/due date to exercise the honest placeholders.
function fourBills(): BillItem[] {
  return [
    bill({
      id: "b1",
      merchant: "Pacific Gas Electric",
      amount: 120,
      category: "utilities",
      isAutoPay: true,
      dueDate: isoInDays(2), // due_soon (<= 3 days)
    }),
    bill({
      id: "b2",
      merchant: "State Farm",
      amount: 85,
      category: "insurance",
      isAutoPay: false,
      dueDate: isoInDays(30), // upcoming
    }),
    bill({
      id: "b3",
      merchant: "City Water",
      amount: 60,
      category: "utilities",
      isAutoPay: true,
      dueDate: isoInDays(-5), // overdue
    }),
    bill({
      id: "b4",
      merchant: "",
      amount: 40,
      category: "",
      isAutoPay: false,
      dueDate: "", // no due date -> honest placeholders, upcoming
    }),
  ];
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Financial BillsScreen", () => {
  it("fetches bills from the API on mount", async () => {
    mockGetBills.mockResolvedValue({ success: true, data: { bills: [] } });
    render(<BillsScreen />);
    await waitFor(() => expect(mockGetBills).toHaveBeenCalledTimes(1));
  });

  it("renders real bills, a computed summary, and derived statuses — never a fabricated Paid status or the removed MOCK_BILLS", async () => {
    mockGetBills.mockResolvedValue({
      success: true,
      data: { bills: fourBills() },
    });

    render(<BillsScreen />);

    // Real merchant names.
    expect(await screen.findByText("Pacific Gas Electric")).toBeTruthy();
    expect(screen.getByText("State Farm")).toBeTruthy();
    expect(screen.getByText("City Water")).toBeTruthy();

    // Real amounts.
    expect(screen.getByText("$120")).toBeTruthy();
    expect(screen.getByText("$85")).toBeTruthy();
    expect(screen.getByText("$60")).toBeTruthy();

    // Summary computed from real bills: Total Due = 120+85+60+40 = 305,
    // 1 due-soon, 2 on autopay.
    expect(screen.getByText("$305")).toBeTruthy();
    expect(screen.getByText("Total Due")).toBeTruthy();
    expect(screen.getByText("Auto-Pay")).toBeTruthy();
    // Two bills on autopay -> two "Auto" badges.
    expect(screen.getAllByText("Auto")).toHaveLength(2);

    // Derived per-bill statuses render as badges (proving the derivation, not just
    // the filter chips). "Overdue" has no summary label, so chip + b3 badge = 2.
    expect(screen.getAllByText("Due Soon")).toHaveLength(3); // summary + chip + b1 badge
    expect(screen.getAllByText("Overdue")).toHaveLength(2); // chip + b3 badge
    expect(screen.getAllByText("Upcoming")).toHaveLength(4); // section header + chip + b2 + b4 badges

    // The fabricated "Paid" status is gone — payment history has no honest source.
    expect(screen.queryByText("Paid")).toBeNull();

    // Missing merchant/date get honest placeholders, not invented values.
    expect(screen.getByText("Unnamed bill")).toBeTruthy();
    expect(screen.getByText("No due date")).toBeTruthy();

    // Former hardcoded MOCK_BILLS content must never appear.
    expect(screen.queryByText("Rent")).toBeNull();
    expect(screen.queryByText("Chase Sapphire")).toBeNull();
    expect(screen.queryByText("Electric Bill")).toBeNull();
    expect(screen.queryByText("Car Insurance")).toBeNull();
    expect(screen.queryByText("Netflix")).toBeNull();
    expect(screen.queryByText("Gym Membership")).toBeNull();
  });

  it("filters the list by derived status", async () => {
    mockGetBills.mockResolvedValue({
      success: true,
      data: { bills: fourBills() },
    });

    render(<BillsScreen />);
    await screen.findByText("Pacific Gas Electric");

    // Tap the "Overdue" filter chip -> only the overdue bill remains.
    fireEvent.press(screen.getByTestId("bills-filter-overdue"));

    expect(screen.getByText("City Water")).toBeTruthy();
    expect(screen.queryByText("Pacific Gas Electric")).toBeNull();
    expect(screen.queryByText("State Farm")).toBeNull();
    expect(screen.getByText("1 Bills")).toBeTruthy();
  });

  it("shows the loading state while the first fetch is in flight", () => {
    mockGetBills.mockReturnValue(new Promise<never>(() => undefined));
    render(<BillsScreen />);
    expect(screen.getByTestId("financial-bills-loading")).toBeTruthy();
  });

  it("shows an honest error state with retry when the fetch fails — never MOCK_BILLS", async () => {
    mockGetBills.mockResolvedValue({
      success: false,
      error: { code: "NETWORK_ERROR", message: "Network down" },
    });

    render(<BillsScreen />);

    expect(await screen.findByTestId("financial-bills-error")).toBeTruthy();
    expect(screen.getByText("Network down")).toBeTruthy();

    // The old silent fallback would have shown fabricated bills here — it must not.
    expect(screen.queryByText("Rent")).toBeNull();
    expect(screen.queryByText("Chase Sapphire")).toBeNull();

    fireEvent.press(screen.getByText("Try Again"));
    await waitFor(() => expect(mockGetBills).toHaveBeenCalledTimes(2));
  });

  it("shows the inline empty state when there are no bills", async () => {
    mockGetBills.mockResolvedValue({ success: true, data: { bills: [] } });
    render(<BillsScreen />);
    expect(await screen.findByTestId("financial-bills-empty")).toBeTruthy();
    expect(screen.getByText("No bills to show")).toBeTruthy();
  });

  it("re-fetches on pull-to-refresh", async () => {
    mockGetBills.mockResolvedValue({
      success: true,
      data: { bills: [bill()] },
    });

    const { UNSAFE_getAllByType } = render(<BillsScreen />);
    await screen.findByText("Pacific Gas Electric");

    // The outer ScrollView (first in tree) carries the refreshControl.
    const scroll = UNSAFE_getAllByType(ScrollView)[0];
    await act(async () => {
      await scroll.props.refreshControl.props.onRefresh();
    });

    // mount + refresh
    expect(mockGetBills).toHaveBeenCalledTimes(2);
  });
});
