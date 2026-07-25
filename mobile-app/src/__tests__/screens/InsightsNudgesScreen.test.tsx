/**
 * InsightsNudgesScreen — honest real/empty/error wiring (Wave 7 parity).
 *
 * The screen's active feed is real: it renders whatever `useNudges` returns from
 * GET /api/ai/nudges. It used to also render a fabricated "Your Nudge Impact"
 * stats card (MOCK_STATS) and a fabricated History tab (MOCK_HISTORY) — neither
 * has a real endpoint (only GET/POST /api/ai/nudges exist). Those were removed:
 * the stats card is gone and the History tab is an honest empty state. On a hook
 * error the feed shows an honest error + retry, never the old MOCK_NUDGES.
 *
 * These tests prove: real nudges render; loading/error+retry/empty inline states
 * work; the History tab is empty-stated; and the former mock content is absent.
 */

import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react-native";

// RN's RefreshControl resolves undefined under this jest setup; stub just that
// module so the ScrollView's refreshControl prop renders (mirrors InsightsScreen).
jest.mock(
  "react-native/Libraries/Components/RefreshControl/RefreshControl",
  () => "RefreshControl",
);

// Drive the screen entirely through a controllable useNudges mock.
const mockUseNudges = jest.fn();
jest.mock("../../hooks/useNudges", () => ({
  useNudges: () => mockUseNudges(),
}));

// expo-router is mocked globally in jest.setup.js.

import NudgesScreen from "../../../app/insights/nudges";

type Nudge = {
  id: string;
  nudgeType: string;
  title: string;
  message: string;
  actionLabel?: string;
  actionRoute?: string;
  createdAt: string;
  priority: number;
};

function hookState(over: Record<string, unknown> = {}) {
  return {
    nudges: [] as Nudge[],
    activeNudge: null,
    isLoading: false,
    error: null as string | null,
    respondToNudge: jest.fn(),
    fetchNudges: jest.fn(),
    dismissAll: jest.fn(),
    ...over,
  };
}

function nudge(over: Partial<Nudge> = {}): Nudge {
  return {
    id: "n-0",
    nudgeType: "insight",
    title: "Dining up 35%",
    message: "Your dining spend rose this month.",
    createdAt: new Date().toISOString(),
    priority: 1,
    ...over,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("InsightsNudgesScreen", () => {
  it("renders the real active nudges returned by the hook", async () => {
    mockUseNudges.mockReturnValue(
      hookState({
        nudges: [
          nudge({ id: "n-0", title: "Dining up 35%" }),
          nudge({
            id: "n-1",
            nudgeType: "celebration",
            title: "Savings on track",
            message: "You hit your target.",
            priority: 2,
          }),
        ],
      }),
    );

    render(<NudgesScreen />);

    expect(await screen.findByText("Dining up 35%")).toBeTruthy();
    expect(screen.getByText("Savings on track")).toBeTruthy();
    expect(screen.getByText("Your dining spend rose this month.")).toBeTruthy();

    // Former fabricated MOCK_STATS card must be gone.
    expect(screen.queryByText("Your Nudge Impact")).toBeNull();
    expect(screen.queryByText("8.2/10")).toBeNull();
    expect(screen.queryByText("Saved/mo")).toBeNull();
  });

  it("shows the loading state while the first fetch is in flight", () => {
    mockUseNudges.mockReturnValue(hookState({ isLoading: true }));
    render(<NudgesScreen />);
    expect(screen.getByTestId("insights-nudges-loading")).toBeTruthy();
  });

  it("shows an honest error state with retry — never mock nudges — on failure", async () => {
    const state = hookState({
      error: "Unable to load recommendations. Please try again.",
      nudges: [],
    });
    mockUseNudges.mockReturnValue(state);

    render(<NudgesScreen />);

    expect(await screen.findByTestId("insights-nudges-error")).toBeTruthy();
    expect(
      screen.getByText("Unable to load recommendations. Please try again."),
    ).toBeTruthy();

    // The former MOCK_NUDGES fallback content must never appear on error.
    expect(screen.queryByText("🎉 Goal Achieved!")).toBeNull();
    expect(screen.queryByText("Bill Due Soon")).toBeNull();

    fireEvent.press(screen.getByText("Try Again"));
    await waitFor(() => expect(state.fetchNudges).toHaveBeenCalledTimes(1));
  });

  it("shows the inline empty state when there are no active nudges", () => {
    mockUseNudges.mockReturnValue(hookState({ nudges: [], error: null }));
    render(<NudgesScreen />);
    expect(screen.getByTestId("insights-nudges-empty")).toBeTruthy();
    expect(screen.getByText("All Caught Up!")).toBeTruthy();
  });

  it("empty-states the History tab (no fabricated MOCK_HISTORY)", () => {
    mockUseNudges.mockReturnValue(hookState({ nudges: [nudge()] }));
    render(<NudgesScreen />);

    fireEvent.press(screen.getByText("History"));

    expect(screen.getByTestId("insights-nudges-history-empty")).toBeTruthy();
    expect(screen.getByText("No nudge history yet")).toBeTruthy();

    // Former fabricated MOCK_HISTORY entries must never appear.
    expect(screen.queryByText("Subscription review completed")).toBeNull();
    expect(screen.queryByText("Savings goal reached!")).toBeNull();
    expect(screen.queryByText("Budget alert acknowledged")).toBeNull();
  });
});
