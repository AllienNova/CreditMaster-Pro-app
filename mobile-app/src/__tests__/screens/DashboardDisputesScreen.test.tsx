/**
 * Dashboard DisputesScreen — real store wiring (PARITY).
 *
 * The /dashboard/disputes screen used to render a hardcoded MOCK_DISPUTES
 * array behind a fake setTimeout load. It now reads the user's real disputes
 * from useDisputeStore (fetch on mount, honest inline loading / error / empty
 * states). These tests prove real data renders, the former mock values never
 * appear, each honest state shows, filtering works, and pull-to-refresh
 * re-fetches.
 */

import React from "react";
import { ScrollView } from "react-native";
import {
  render,
  screen,
  fireEvent,
  act,
} from "@testing-library/react-native";
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

import DisputesScreen from "../../../app/dashboard/disputes";

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

describe("Dashboard DisputesScreen", () => {
  it("fetches disputes from the store on mount", () => {
    render(<DisputesScreen />);
    expect(mockFetchDisputes).toHaveBeenCalled();
  });

  it("renders real dispute fields and never the removed MOCK_DISPUTES values", () => {
    mockDisputeState.disputes = [
      dispute({
        id: "d1",
        itemType: "Collection Account",
        creditorName: "Midland Credit Management",
        bureau: "equifax",
        status: "under_review",
      }),
      dispute({
        id: "d2",
        itemType: "Hard Inquiry",
        creditorName: "Best Buy / Citibank",
        bureau: "transunion",
        status: "resolved",
        outcome: "removed",
      }),
      // A rejected and a draft dispute exercise the remaining status
      // color/icon branches.
      dispute({
        id: "d3",
        itemType: "Balance Report",
        creditorName: "Discover",
        bureau: "experian",
        status: "rejected",
      }),
      dispute({
        id: "d4",
        itemType: "New Account",
        creditorName: "Chase",
        bureau: "experian",
        status: "draft",
      }),
    ];

    render(<DisputesScreen />);

    // Real dispute fields from the store.
    expect(screen.getByText("Collection Account")).toBeTruthy();
    expect(screen.getByText("Hard Inquiry")).toBeTruthy();
    expect(screen.getByText("Midland Credit Management")).toBeTruthy();
    expect(screen.getByText("Best Buy / Citibank")).toBeTruthy();
    expect(screen.getByText("Balance Report")).toBeTruthy();
    expect(screen.getByText("New Account")).toBeTruthy();
    // creditorName carries the description (mapWebDispute maps web
    // itemDescription -> creditorName), so it renders in the description slot.
    expect(screen.getByText("Equifax")).toBeTruthy(); // bureau title-cased badge
    expect(screen.getByText("removed")).toBeTruthy(); // real outcome badge

    // Former hardcoded MOCK_DISPUTES values must never appear.
    expect(
      screen.queryByText("Capital One late payment March 2023"),
    ).toBeNull();
    expect(screen.queryByText("Medical collection ABC Collections")).toBeNull();
    expect(
      screen.queryByText("Unauthorized hard inquiry XYZ Lender"),
    ).toBeNull();
    expect(screen.queryByText("Incorrect balance on Chase card")).toBeNull();
    expect(screen.queryByText("Balance Error")).toBeNull();
  });

  it("shows the inline loading state while fetching with no data yet", () => {
    mockDisputeState.isLoading = true;
    render(<DisputesScreen />);
    expect(screen.getByTestId("dashboard-disputes-loading")).toBeTruthy();
  });

  it("shows an honest error state with retry when the store errors and has no data", () => {
    mockDisputeState.error = "Network down";
    render(<DisputesScreen />);

    expect(screen.getByTestId("dashboard-disputes-error")).toBeTruthy();
    expect(screen.getByText("Network down")).toBeTruthy();

    fireEvent.press(screen.getByText("Try Again"));
    // mount + retry
    expect(mockFetchDisputes).toHaveBeenCalledTimes(2);
  });

  it("shows the inline empty state when there are no disputes", () => {
    render(<DisputesScreen />);
    expect(screen.getByTestId("dashboard-disputes-empty")).toBeTruthy();
    expect(screen.getByText("No disputes found")).toBeTruthy();
  });

  it("filters the list by status when a filter pill is pressed", () => {
    mockDisputeState.disputes = [
      dispute({ id: "d1", itemType: "Hard Inquiry", status: "sent" }),
      dispute({ id: "d2", itemType: "Old Collection", status: "resolved" }),
    ];

    render(<DisputesScreen />);

    // Both visible under the default "all" filter.
    expect(screen.getByText("Hard Inquiry")).toBeTruthy();
    expect(screen.getByText("Old Collection")).toBeTruthy();

    // Press the "resolved" filter pill. Pills render before the cards, so the
    // first match is the pill label (the second would be a status badge).
    fireEvent.press(screen.getAllByText("resolved")[0]);

    // Only the resolved dispute remains.
    expect(screen.getByText("Old Collection")).toBeTruthy();
    expect(screen.queryByText("Hard Inquiry")).toBeNull();
  });

  it("re-fetches on pull-to-refresh", async () => {
    mockDisputeState.disputes = [dispute()];
    const { UNSAFE_getAllByType } = render(<DisputesScreen />);

    // The outer vertical ScrollView (index 0) carries the refreshControl.
    const scroll = UNSAFE_getAllByType(ScrollView)[0];
    await act(async () => {
      await scroll.props.refreshControl.props.onRefresh();
    });

    // mount + refresh
    expect(mockFetchDisputes).toHaveBeenCalledTimes(2);
  });
});
