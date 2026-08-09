/**
 * Credit Repair GoodwillScreen — real-data wiring (PARITY-P2).
 *
 * The screen used to render a hardcoded LETTERS array behind a fake setTimeout
 * load. It now fetches the user's real goodwill letters from
 * creditRepairApi.getGoodwillLetters (GET /api/credit-repair/goodwill) with honest
 * inline loading/error/empty states and pull-to-refresh. These tests prove the
 * real letters render, the former hardcoded creditors/dates never appear, the
 * stats are computed from real data, and each honest state shows.
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
import type { GoodwillLetter } from "../../services/api/creditRepair";

const mockGetGoodwillLetters = jest.fn();

// RN's RefreshControl resolves undefined under this jest setup; stub just that
// module so the ScrollView's refreshControl prop renders.
jest.mock(
  "react-native/Libraries/Components/RefreshControl/RefreshControl",
  () => "RefreshControl",
);

jest.mock("../../services/api/creditRepair", () => ({
  creditRepairApi: {
    getGoodwillLetters: (...args: unknown[]) =>
      mockGetGoodwillLetters(...args),
  },
}));

// expo-router is mocked globally in jest.setup.js.

import GoodwillScreen from "../../../app/credit-repair/goodwill";

function letter(over: Partial<GoodwillLetter> = {}): GoodwillLetter {
  return {
    id: "g1",
    creditor: "Wells Fargo Bank",
    status: "sent",
    createdAt: "2026-01-10T00:00:00.000Z",
    ...over,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Credit Repair GoodwillScreen", () => {
  it("fetches goodwill letters from the API on mount", async () => {
    mockGetGoodwillLetters.mockResolvedValue({
      success: true,
      data: { letters: [] },
    });
    render(<GoodwillScreen />);
    await waitFor(() =>
      expect(mockGetGoodwillLetters).toHaveBeenCalledTimes(1),
    );
  });

  it("renders real letters and computed stats; never the removed mock values", async () => {
    mockGetGoodwillLetters.mockResolvedValue({
      success: true,
      data: {
        letters: [
          letter({ id: "g1", creditor: "Wells Fargo Bank", status: "success" }),
          letter({ id: "g2", creditor: "American Express", status: "sent" }),
          letter({ id: "g3", creditor: "Citibank", status: "sent" }),
          letter({ id: "g4", creditor: "US Bank", status: "responded" }),
          letter({ id: "g5", creditor: "TD Bank", status: "draft" }),
        ],
      },
    });

    render(<GoodwillScreen />);

    // Real letter fields.
    expect(await screen.findByText("Wells Fargo Bank")).toBeTruthy();
    expect(screen.getByText("American Express")).toBeTruthy();
    expect(screen.getByText("Citibank")).toBeTruthy();
    expect(screen.getByText("US Bank")).toBeTruthy();
    expect(screen.getByText("TD Bank")).toBeTruthy();
    // Status badges (each of these statuses appears once -> exercises the color map).
    expect(screen.getByText("success")).toBeTruthy();
    expect(screen.getByText("responded")).toBeTruthy();
    expect(screen.getByText("draft")).toBeTruthy();

    // Computed stats: total 5, successful 1, pending (sent) 2.
    expect(screen.getByText("5")).toBeTruthy();
    expect(screen.getByText("1")).toBeTruthy();
    expect(screen.getByText("2")).toBeTruthy();

    // Former hardcoded LETTERS creditors + dates must never appear.
    expect(screen.queryByText("Chase Bank")).toBeNull();
    expect(screen.queryByText("Capital One")).toBeNull();
    expect(screen.queryByText("Discover")).toBeNull();
    expect(screen.queryByText("Bank of America")).toBeNull();
    expect(screen.queryByText("2024-11-15")).toBeNull();
    expect(screen.queryByText("2024-12-05")).toBeNull();
  });

  it("shows the loading state while the first fetch is in flight", () => {
    mockGetGoodwillLetters.mockReturnValue(
      new Promise<never>(() => undefined),
    );
    render(<GoodwillScreen />);
    expect(
      screen.getByTestId("credit-repair-goodwill-loading"),
    ).toBeTruthy();
  });

  it("shows an honest error state with retry when the fetch fails", async () => {
    mockGetGoodwillLetters.mockResolvedValue({
      success: false,
      error: { code: "NETWORK_ERROR", message: "Network down" },
    });

    render(<GoodwillScreen />);

    expect(
      await screen.findByTestId("credit-repair-goodwill-error"),
    ).toBeTruthy();
    expect(screen.getByText("Network down")).toBeTruthy();

    fireEvent.press(screen.getByText("Try Again"));
    await waitFor(() =>
      expect(mockGetGoodwillLetters).toHaveBeenCalledTimes(2),
    );
  });

  it("shows the inline empty state when there are no letters", async () => {
    mockGetGoodwillLetters.mockResolvedValue({
      success: true,
      data: { letters: [] },
    });
    render(<GoodwillScreen />);
    expect(
      await screen.findByTestId("credit-repair-goodwill-empty"),
    ).toBeTruthy();
    expect(screen.getByText("No goodwill letters yet")).toBeTruthy();
  });

  it("re-fetches on pull-to-refresh", async () => {
    mockGetGoodwillLetters.mockResolvedValue({
      success: true,
      data: { letters: [letter()] },
    });

    const { UNSAFE_getByType } = render(<GoodwillScreen />);
    await screen.findByText("Wells Fargo Bank");

    const scroll = UNSAFE_getByType(ScrollView);
    await act(async () => {
      await scroll.props.refreshControl.props.onRefresh();
    });

    // mount + refresh
    expect(mockGetGoodwillLetters).toHaveBeenCalledTimes(2);
  });
});
