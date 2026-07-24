/**
 * Credit Repair DisputesScreen — real store wiring (PARITY-P2).
 *
 * The screen used to render a hardcoded DISPUTES array with a fake setTimeout
 * load. It now reads the user's real disputes from useDisputeStore (fetch on
 * mount, honest inline loading/error/empty states). These tests prove real
 * data renders, the former hardcoded values never appear, and each honest
 * state shows.
 */

import React from "react";
import { ScrollView } from "react-native";
import { render, screen, fireEvent, act } from "@testing-library/react-native";
import type { Dispute } from "../../services/api/types";

const mockFetchDisputes = jest.fn();

interface DisputeStoreState {
  disputes: Dispute[];
  isLoading: boolean;
  error: string | null;
  fetchDisputes: jest.Mock;
}

let mockDisputeState: DisputeStoreState;

// RN's RefreshControl resolves undefined under this jest setup; stub just that
// module so the ScrollView's refreshControl prop renders.
jest.mock(
  "react-native/Libraries/Components/RefreshControl/RefreshControl",
  () => "RefreshControl",
);

jest.mock("../../store/disputeStore", () => ({
  useDisputeStore: () => mockDisputeState,
}));

// expo-router is mocked globally in jest.setup.js.

import DisputesScreen from "../../../app/credit-repair/disputes";

function dispute(over: Partial<Dispute> = {}): Dispute {
  return {
    id: "d1",
    userId: "u1",
    bureau: "experian",
    status: "sent",
    itemType: "Late Payment",
    creditorName: "Capital One",
    disputeReason: "Reported late in error",
    createdAt: "2026-01-10T00:00:00.000Z",
    updatedAt: "2026-01-10T00:00:00.000Z",
    ...over,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockDisputeState = {
    disputes: [],
    isLoading: false,
    error: null,
    fetchDisputes: mockFetchDisputes,
  };
});

describe("Credit Repair DisputesScreen", () => {
  it("fetches disputes from the store on mount", () => {
    render(<DisputesScreen />);
    expect(mockFetchDisputes).toHaveBeenCalled();
  });

  it("renders real disputes and computed stats; never the removed mock values", () => {
    mockDisputeState.disputes = [
      dispute({
        id: "d1",
        itemType: "Collection Account",
        creditorName: "Midland Credit",
        bureau: "equifax",
        status: "under_review",
      }),
      dispute({
        id: "d2",
        itemType: "Hard Inquiry",
        creditorName: "Best Buy",
        bureau: "transunion",
        status: "resolved",
      }),
      dispute({
        id: "d3",
        itemType: "Late Payment",
        creditorName: "Capital One",
        bureau: "experian",
        status: "sent",
      }),
    ];

    render(<DisputesScreen />);

    // Real dispute fields.
    expect(screen.getByText("Collection Account")).toBeTruthy();
    expect(screen.getByText("Hard Inquiry")).toBeTruthy();
    expect(screen.getByText("Midland Credit")).toBeTruthy();
    expect(screen.getByText("Capital One")).toBeTruthy();
    expect(screen.getByText("Equifax")).toBeTruthy(); // bureau title-cased
    expect(screen.getByText("under review")).toBeTruthy(); // status underscore->space

    // Computed stats: total 3, active (under_review + sent) 2, resolved 1.
    expect(screen.getByText("3")).toBeTruthy();
    expect(screen.getByText("2")).toBeTruthy();
    expect(screen.getByText("1")).toBeTruthy();

    // Former hardcoded DISPUTES values must never appear.
    expect(screen.queryByText("Late Payment - Chase")).toBeNull();
    expect(screen.queryByText("Balance Error")).toBeNull();
    expect(screen.queryByText("2024-12-01")).toBeNull();
    expect(screen.queryByText("2024-11-10")).toBeNull();
  });

  it("shows the loading state while fetching with no data yet", () => {
    mockDisputeState.isLoading = true;
    render(<DisputesScreen />);
    expect(screen.getByTestId("credit-repair-disputes-loading")).toBeTruthy();
  });

  it("shows an honest error state with retry when the store errors and has no data", () => {
    mockDisputeState.error = "Network down";
    render(<DisputesScreen />);

    expect(screen.getByTestId("credit-repair-disputes-error")).toBeTruthy();
    expect(screen.getByText("Network down")).toBeTruthy();

    fireEvent.press(screen.getByText("Try Again"));
    // mount + retry
    expect(mockFetchDisputes).toHaveBeenCalledTimes(2);
  });

  it("shows the inline empty state when there are no disputes", () => {
    render(<DisputesScreen />);
    expect(screen.getByTestId("credit-repair-disputes-empty")).toBeTruthy();
    expect(screen.getByText("No disputes yet")).toBeTruthy();
  });

  it("re-fetches on pull-to-refresh", async () => {
    mockDisputeState.disputes = [dispute()];
    const { UNSAFE_getByType } = render(<DisputesScreen />);

    const scroll = UNSAFE_getByType(ScrollView);
    await act(async () => {
      await scroll.props.refreshControl.props.onRefresh();
    });

    // mount + refresh
    expect(mockFetchDisputes).toHaveBeenCalledTimes(2);
  });
});
