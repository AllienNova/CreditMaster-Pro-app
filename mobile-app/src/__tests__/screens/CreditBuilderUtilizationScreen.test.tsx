/**
 * Credit Builder UtilizationScreen — real-data wiring (M1-1 / FR-201).
 *
 * The screen used to render a hardcoded MOCK_CARDS array (Chase Freedom, Capital
 * One Quicksilver, Discover It, Citi Double Cash) with a local CreditCard
 * interface. It now fetches the user's real credit cards from
 * creditRepairApi.getCards (GET /api/credit-repair/cards) with honest inline
 * loading/error/empty states and a retry. These tests prove the fetch happens on
 * mount, real cards render with overall utilization computed from them, the four
 * removed mock card names never appear, and each honest state shows.
 */

import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react-native";
import type { CreditCard } from "../../services/api/creditRepair";

const mockGetCards = jest.fn();

jest.mock("../../services/api/creditRepair", () => ({
  creditRepairApi: {
    getCards: (...args: unknown[]) => mockGetCards(...args),
  },
}));

// expo-router is mocked globally in jest.setup.js.

import UtilizationScreen from "../../../app/credit-builder/utilization";

function card(over: Partial<CreditCard> = {}): CreditCard {
  return {
    id: "c1",
    name: "Chase Sapphire",
    balance: 500,
    limit: 5000,
    utilization: 10,
    ...over,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Credit Builder UtilizationScreen", () => {
  it("fetches cards from the API on mount", async () => {
    mockGetCards.mockResolvedValue({ success: true, data: { cards: [] } });
    render(<UtilizationScreen />);
    await waitFor(() => expect(mockGetCards).toHaveBeenCalledTimes(1));
  });

  it("renders real cards with overall utilization computed from them; never the removed mock cards", async () => {
    mockGetCards.mockResolvedValue({
      success: true,
      data: {
        cards: [
          card({ id: "c1", name: "Chase Sapphire", balance: 500, limit: 5000, utilization: 10 }),
          card({ id: "c2", name: "Amex Gold", balance: 2000, limit: 4000, utilization: 50 }),
        ],
      },
    });

    render(<UtilizationScreen />);

    // Real card names.
    expect(await screen.findByText("Chase Sapphire")).toBeTruthy();
    expect(screen.getByText("Amex Gold")).toBeTruthy();

    // Per-card utilization badges pass the DB value straight through.
    expect(screen.getByText("10%")).toBeTruthy();
    expect(screen.getByText("50%")).toBeTruthy();

    // Overall utilization is computed from the real cards:
    // totalBalance 2500 / totalLimit 9000 = 27.7 -> rounds to 28%, label "Good".
    expect(screen.getByText("28%")).toBeTruthy();
    expect(screen.getByText("Good")).toBeTruthy();

    // The four former hardcoded MOCK_CARDS names must never appear.
    expect(screen.queryByText("Chase Freedom")).toBeNull();
    expect(screen.queryByText("Capital One Quicksilver")).toBeNull();
    expect(screen.queryByText("Discover It")).toBeNull();
    expect(screen.queryByText("Citi Double Cash")).toBeNull();
  });

  it("shows the loading state while the first fetch is in flight", () => {
    mockGetCards.mockReturnValue(new Promise<never>(() => undefined));
    render(<UtilizationScreen />);
    expect(screen.getByTestId("utilization-loading")).toBeTruthy();
  });

  it("shows an honest error state with retry when the fetch fails", async () => {
    mockGetCards.mockResolvedValue({
      success: false,
      error: { code: "NETWORK_ERROR", message: "Network down" },
    });

    render(<UtilizationScreen />);

    expect(await screen.findByTestId("utilization-error")).toBeTruthy();
    expect(screen.getByText("Network down")).toBeTruthy();

    fireEvent.press(screen.getByText("Try Again"));
    await waitFor(() => expect(mockGetCards).toHaveBeenCalledTimes(2));
  });

  it("shows the inline empty state when the user has no cards", async () => {
    mockGetCards.mockResolvedValue({ success: true, data: { cards: [] } });
    render(<UtilizationScreen />);
    expect(await screen.findByTestId("utilization-empty")).toBeTruthy();
    expect(screen.getByText("No credit cards yet")).toBeTruthy();
  });
});
