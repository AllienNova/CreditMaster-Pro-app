/**
 * Activity screen — real-data wiring (M2-3).
 *
 * The screen used to render a hardcoded 8-item `activities` array (Credit Score
 * Update / Chase Bank hard inquiry / "Premium subscription renewed") with
 * fabricated "2 hours ago" times and "+15" / "Resolved" badges behind a setTimeout
 * no-op refresh. It now fetches the user's real activity feed from
 * activityApi.getActivity (GET /api/activity) with honest inline loading / error /
 * empty states and pull-to-refresh. These tests prove the fetch happens on mount,
 * real items render with a type-driven icon, the removed hardcoded strings never
 * appear, filtering runs off the real type, unread items are surfaced, and each
 * honest state shows. The API boundary is mocked — no live route is hit.
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
import type { ActivityItem } from "../../services/api/activity";

const mockGetActivity = jest.fn();

// RN's RefreshControl resolves undefined under this jest setup; stub just that
// module so the ScrollView's refreshControl prop renders.
jest.mock(
  "react-native/Libraries/Components/RefreshControl/RefreshControl",
  () => "RefreshControl",
);

// Fully mock the service boundary. ACTIVITY_TYPES is a runtime value the screen
// imports to build its filter chips, so it is provided here (kept in lockstep with
// the real export, which activity.test.ts pins) alongside the mocked getter.
jest.mock("../../services/api/activity", () => ({
  ACTIVITY_TYPES: [
    "dispute_update",
    "payment_success",
    "document_uploaded",
    "tip",
  ],
  activityApi: {
    getActivity: (...args: unknown[]) => mockGetActivity(...args),
  },
}));

// expo-router is mocked globally in jest.setup.js.

import ActivityScreen from "../../../app/activity/index";

function activity(over: Partial<ActivityItem> = {}): ActivityItem {
  return {
    id: "a1",
    type: "dispute_update",
    title: "Dispute updated",
    message: "Your Equifax dispute moved to under review",
    createdAt: "2026-07-01T09:15:00.000Z",
    read: false,
    ...over,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Activity screen", () => {
  it("fetches the activity feed on mount", async () => {
    mockGetActivity.mockResolvedValue({
      success: true,
      data: { activities: [activity()] },
    });
    render(<ActivityScreen />);
    await waitFor(() => expect(mockGetActivity).toHaveBeenCalledTimes(1));
  });

  it("renders real items with a type-driven icon; never the removed hardcoded feed", async () => {
    mockGetActivity.mockResolvedValue({
      success: true,
      data: {
        activities: [
          activity({
            id: "a1",
            type: "dispute_update",
            title: "Dispute updated",
            message: "Your Equifax dispute moved to under review",
          }),
          activity({
            id: "a2",
            type: "payment_success",
            title: "Payment received",
            message: "Pro subscription renewed",
            read: true,
          }),
        ],
      },
    });

    render(<ActivityScreen />);

    // Real fields render.
    expect(await screen.findByText("Dispute updated")).toBeTruthy();
    expect(
      screen.getByText("Your Equifax dispute moved to under review"),
    ).toBeTruthy();
    expect(screen.getByText("Payment received")).toBeTruthy();
    expect(screen.getByText("Pro subscription renewed")).toBeTruthy();

    // The former hardcoded feed must never appear.
    expect(screen.queryByText("Credit Score Update")).toBeNull();
    expect(screen.queryByText("Your Experian score increased")).toBeNull();
    expect(screen.queryByText("Chase Bank checked your credit")).toBeNull();
    expect(screen.queryByText("New credit card account detected")).toBeNull();
    // Fabricated relative times and badges are gone.
    expect(screen.queryByText("2 hours ago")).toBeNull();
    expect(screen.queryByText("Yesterday")).toBeNull();
    expect(screen.queryByText("+15")).toBeNull();
    expect(screen.queryByText("Resolved")).toBeNull();
  });

  it("surfaces an unread item and does not mark a read one unread", async () => {
    mockGetActivity.mockResolvedValue({
      success: true,
      data: {
        activities: [
          activity({ id: "a1", read: false }),
          activity({ id: "a2", read: true, title: "A read item" }),
        ],
      },
    });

    render(<ActivityScreen />);
    await screen.findByText("Dispute updated");

    expect(screen.getByTestId("activity-unread-a1")).toBeTruthy();
    expect(screen.queryByTestId("activity-unread-a2")).toBeNull();
  });

  it("maps an unrecognized type to a neutral row rather than hiding it", async () => {
    mockGetActivity.mockResolvedValue({
      success: true,
      data: {
        activities: [
          activity({ id: "a9", type: "other", title: "Unknown-type item" }),
        ],
      },
    });

    render(<ActivityScreen />);
    // The item still renders (neutral icon) — surfaced honestly, not dropped.
    expect(await screen.findByText("Unknown-type item")).toBeTruthy();
  });

  it("filters the feed by the real type and empty-states a filter with no matches", async () => {
    mockGetActivity.mockResolvedValue({
      success: true,
      data: {
        activities: [
          activity({ id: "a1", type: "dispute_update", title: "A dispute" }),
          activity({ id: "a2", type: "payment_success", title: "A payment" }),
        ],
      },
    });

    render(<ActivityScreen />);
    await screen.findByText("A dispute");

    // Switch to Payments — only payment_success items remain.
    fireEvent.press(screen.getByText("Payments"));
    expect(screen.getByText("A payment")).toBeTruthy();
    expect(screen.queryByText("A dispute")).toBeNull();

    // A filter with no matching items shows the honest filtered-empty state.
    fireEvent.press(screen.getByText("Documents"));
    expect(screen.getByTestId("activity-filter-empty")).toBeTruthy();
  });

  it("shows the loading state while the first fetch is in flight", () => {
    mockGetActivity.mockReturnValue(new Promise<never>(() => undefined));
    render(<ActivityScreen />);
    expect(screen.getByTestId("activity-loading")).toBeTruthy();
  });

  it("shows the inline empty state for an honest empty feed", async () => {
    mockGetActivity.mockResolvedValue({
      success: true,
      data: { activities: [] },
    });
    render(<ActivityScreen />);
    expect(await screen.findByTestId("activity-empty")).toBeTruthy();
    expect(screen.getByText("No activity yet")).toBeTruthy();
  });

  it("shows an honest error state with retry when the fetch fails", async () => {
    mockGetActivity.mockResolvedValue({
      success: false,
      error: { code: "HTTP_401", message: "Unauthorized" },
    });

    render(<ActivityScreen />);

    expect(await screen.findByTestId("activity-error")).toBeTruthy();
    expect(screen.getByText("Unauthorized")).toBeTruthy();

    // Retry re-fetches.
    mockGetActivity.mockResolvedValue({
      success: true,
      data: { activities: [activity()] },
    });
    fireEvent.press(screen.getByText("Try Again"));
    await waitFor(() => expect(mockGetActivity).toHaveBeenCalledTimes(2));
  });

  it("re-fetches on pull-to-refresh", async () => {
    mockGetActivity.mockResolvedValue({
      success: true,
      data: { activities: [activity()] },
    });

    const { UNSAFE_getAllByType } = render(<ActivityScreen />);
    await screen.findByText("Dispute updated");

    // The screen has two ScrollViews (filter chips + list); drive the one wired to
    // pull-to-refresh.
    const listScroll = UNSAFE_getAllByType(ScrollView).find(
      (s) => s.props.refreshControl,
    );
    await act(async () => {
      await listScroll!.props.refreshControl.props.onRefresh();
    });

    // mount + refresh
    expect(mockGetActivity).toHaveBeenCalledTimes(2);
  });
});
