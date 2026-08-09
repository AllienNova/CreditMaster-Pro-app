/**
 * Credit Repair NegotiateScreen — real-data wiring (PARITY-P2).
 *
 * The screen used to render a hardcoded DEBTS array behind a fake setTimeout
 * load. It now fetches the user's real pay-for-delete negotiations from
 * creditRepairApi.getNegotiations (GET /api/credit-repair/negotiate) with honest
 * inline loading/error/empty states and pull-to-refresh. These tests prove the
 * real negotiations render, the former hardcoded creditors/dates never appear,
 * the summary is computed from real data, and each honest state shows.
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
import type { NegotiationDebt } from "../../services/api/creditRepair";

const mockGetNegotiations = jest.fn();

// RN's RefreshControl resolves undefined under this jest setup; stub just that
// module so the ScrollView's refreshControl prop renders.
jest.mock(
  "react-native/Libraries/Components/RefreshControl/RefreshControl",
  () => "RefreshControl",
);

jest.mock("../../services/api/creditRepair", () => ({
  creditRepairApi: {
    getNegotiations: (...args: unknown[]) => mockGetNegotiations(...args),
  },
}));

// expo-router is mocked globally in jest.setup.js.

import NegotiateScreen from "../../../app/credit-repair/negotiate";

function debt(over: Partial<NegotiationDebt> = {}): NegotiationDebt {
  return {
    id: "n1",
    creditor: "Midland Credit",
    balance: 2000,
    originalBalance: 3000,
    status: "active",
    updatedAt: "2026-01-10T00:00:00.000Z",
    ...over,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Credit Repair NegotiateScreen", () => {
  it("fetches negotiations from the API on mount", async () => {
    mockGetNegotiations.mockResolvedValue({
      success: true,
      data: { debts: [] },
    });
    render(<NegotiateScreen />);
    await waitFor(() =>
      expect(mockGetNegotiations).toHaveBeenCalledTimes(1),
    );
  });

  it("renders real negotiations and a computed summary; never the removed mock values", async () => {
    mockGetNegotiations.mockResolvedValue({
      success: true,
      data: {
        debts: [
          debt({
            id: "n1",
            creditor: "Midland Credit",
            balance: 2000,
            originalBalance: 3000,
            status: "active",
          }),
          debt({
            id: "n2",
            creditor: "Portfolio Recovery",
            balance: 800,
            originalBalance: 800,
            status: "negotiating",
          }),
          debt({
            id: "n3",
            creditor: "LVNV Funding",
            balance: 0,
            originalBalance: 4000,
            status: "settled",
          }),
        ],
      },
    });

    render(<NegotiateScreen />);

    // Real creditor names.
    expect(await screen.findByText("Midland Credit")).toBeTruthy();
    expect(screen.getByText("Portfolio Recovery")).toBeTruthy();
    expect(screen.getByText("LVNV Funding")).toBeTruthy();

    // Status badges (each of the three buckets appears once).
    expect(screen.getByText("active")).toBeTruthy();
    expect(screen.getByText("negotiating")).toBeTruthy();
    expect(screen.getByText("settled")).toBeTruthy();

    // Computed summary: total debt 2000 + 800 + 0 = 2,800; total saved
    // (3000-2000) + 0 + (4000-0) = 5,000.
    expect(screen.getByText("$2,800")).toBeTruthy();
    expect(screen.getByText("$5,000")).toBeTruthy();

    // Per-debt balances + strike-through originals where reduced.
    expect(screen.getByText("$2,000")).toBeTruthy();
    expect(screen.getByText("was $3,000")).toBeTruthy();
    expect(screen.getByText("was $4,000")).toBeTruthy();

    // Action button labels reflect status (settled shows none).
    expect(screen.getByText("Start Negotiation")).toBeTruthy();
    expect(screen.getByText("Continue Negotiation")).toBeTruthy();

    // Former hardcoded DEBTS creditors + dates must never appear.
    expect(screen.queryByText("Collection Agency A")).toBeNull();
    expect(screen.queryByText("Medical Collections")).toBeNull();
    expect(screen.queryByText("Credit Card Debt")).toBeNull();
    expect(screen.queryByText("Utility Company")).toBeNull();
    expect(screen.queryByText("Last contact: 2024-12-01")).toBeNull();
    expect(screen.queryByText("Last contact: 2024-11-15")).toBeNull();
  });

  it("shows the loading state while the first fetch is in flight", () => {
    mockGetNegotiations.mockReturnValue(new Promise<never>(() => undefined));
    render(<NegotiateScreen />);
    expect(
      screen.getByTestId("credit-repair-negotiate-loading"),
    ).toBeTruthy();
  });

  it("shows an honest error state with retry when the fetch fails", async () => {
    mockGetNegotiations.mockResolvedValue({
      success: false,
      error: { code: "NETWORK_ERROR", message: "Network down" },
    });

    render(<NegotiateScreen />);

    expect(
      await screen.findByTestId("credit-repair-negotiate-error"),
    ).toBeTruthy();
    expect(screen.getByText("Network down")).toBeTruthy();

    fireEvent.press(screen.getByText("Try Again"));
    await waitFor(() =>
      expect(mockGetNegotiations).toHaveBeenCalledTimes(2),
    );
  });

  it("shows the inline empty state when there are no negotiations", async () => {
    mockGetNegotiations.mockResolvedValue({
      success: true,
      data: { debts: [] },
    });
    render(<NegotiateScreen />);
    expect(
      await screen.findByTestId("credit-repair-negotiate-empty"),
    ).toBeTruthy();
    expect(screen.getByText("No debts in negotiation yet")).toBeTruthy();
  });

  it("re-fetches on pull-to-refresh", async () => {
    mockGetNegotiations.mockResolvedValue({
      success: true,
      data: { debts: [debt()] },
    });

    const { UNSAFE_getByType } = render(<NegotiateScreen />);
    await screen.findByText("Midland Credit");

    const scroll = UNSAFE_getByType(ScrollView);
    await act(async () => {
      await scroll.props.refreshControl.props.onRefresh();
    });

    // mount + refresh
    expect(mockGetNegotiations).toHaveBeenCalledTimes(2);
  });
});
