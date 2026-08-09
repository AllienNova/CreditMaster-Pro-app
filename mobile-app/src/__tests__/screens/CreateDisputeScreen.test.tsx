/**
 * New Dispute Screen — real disputable-items wiring (M2-2).
 *
 * The wizard's step 3 ("Select Items to Dispute") used to render a hardcoded
 * MOCK_CREDIT_ITEMS array (Capital One Platinum, ABC Collections, Chase Freedom,
 * Discover It, Bank of America). It now fetches the user's real disputable items
 * from creditRepairApi.getDisputableItems (GET /api/credit-repair/disputable-items)
 * on mount, with honest inline loading / error / empty states. These tests prove
 * the fetch happens on mount, real items render and are selectable, a null balance
 * renders "—" (never a fabricated $0), the removed mock strings never appear, each
 * honest state shows, and a selected real item flows through to the review step
 * that feeds the submit payload. The API boundary and the dispute store are mocked
 * — no live route is hit, and the submit-via-disputeStore path is left untouched.
 */

import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react-native";
import type { DisputableItem } from "../../services/api/creditRepair";

const mockGetDisputableItems = jest.fn();
const mockCreateDispute = jest.fn();
const mockGenerateAILetter = jest.fn();

jest.mock("../../services/api/creditRepair", () => ({
  creditRepairApi: {
    getDisputableItems: (...args: unknown[]) => mockGetDisputableItems(...args),
  },
}));

jest.mock("../../store/disputeStore", () => ({
  useDisputeStore: () => ({
    generateAILetter: mockGenerateAILetter,
    isGeneratingLetter: false,
    createDispute: mockCreateDispute,
    isCreating: false,
  }),
}));

// expo-router is mocked globally in jest.setup.js.

import CreateDisputeScreen from "../../../app/dispute/create";

function item(over: Partial<DisputableItem> = {}): DisputableItem {
  return {
    id: "i1",
    accountName: "Chase Sapphire",
    status: "Late 30 days",
    balance: 890,
    type: "account",
    ...over,
  };
}

// Drive the wizard from step 1 to step 3 (the items list): pick a bureau, then a
// dispute type, pressing "Next" between each. Navigation does not depend on the
// items fetch, so this works whether the fetch is pending, resolved, or failed.
function goToItemsStep() {
  fireEvent.press(screen.getByText("Experian"));
  fireEvent.press(screen.getByText("Next"));
  fireEvent.press(screen.getByText("Late Payment"));
  fireEvent.press(screen.getByText("Next"));
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("New Dispute Screen — item list wiring", () => {
  it("fetches disputable items from the API on mount", async () => {
    mockGetDisputableItems.mockResolvedValue({
      success: true,
      data: { items: [] },
    });
    render(<CreateDisputeScreen />);
    await waitFor(() =>
      expect(mockGetDisputableItems).toHaveBeenCalledTimes(1),
    );
  });

  it("renders real items on step 3, keeps a null balance honest, and never the removed mock items", async () => {
    mockGetDisputableItems.mockResolvedValue({
      success: true,
      data: {
        items: [
          item({ id: "i1", accountName: "Chase Sapphire", status: "Late 30 days", balance: 890, type: "account" }),
          item({ id: "i2", accountName: "XYZ Lender", status: "Unauthorized inquiry", balance: null, type: "inquiry" }),
        ],
      },
    });

    render(<CreateDisputeScreen />);
    goToItemsStep();

    // Real item names from the API.
    expect(await screen.findByText("Chase Sapphire")).toBeTruthy();
    expect(screen.getByText("XYZ Lender")).toBeTruthy();

    // A real balance renders; a null balance (the inquiry) renders "—", never $0.
    expect(screen.getByText("$890")).toBeTruthy();
    expect(screen.getByText("—")).toBeTruthy();
    expect(screen.queryByText("$0")).toBeNull();

    // The five former hardcoded MOCK_CREDIT_ITEMS names must never appear.
    expect(screen.queryByText("Capital One Platinum")).toBeNull();
    expect(screen.queryByText("ABC Collections")).toBeNull();
    expect(screen.queryByText("Chase Freedom")).toBeNull();
    expect(screen.queryByText("Discover It")).toBeNull();
    expect(screen.queryByText("Bank of America")).toBeNull();
  });

  it("lets the user select a fetched item", async () => {
    mockGetDisputableItems.mockResolvedValue({
      success: true,
      data: {
        items: [
          item({ id: "i1", accountName: "Chase Sapphire" }),
          item({ id: "i2", accountName: "XYZ Lender", balance: null, type: "inquiry" }),
        ],
      },
    });

    render(<CreateDisputeScreen />);
    goToItemsStep();

    // Nothing selected initially.
    expect(await screen.findByText("0 of 2 selected")).toBeTruthy();

    // Selecting a real item updates the count — proving the fetched list is
    // interactive, not static.
    fireEvent.press(screen.getByText("Chase Sapphire"));
    expect(screen.getByText("1 of 2 selected")).toBeTruthy();
  });

  it("shows the loading state on step 3 while the first fetch is in flight", () => {
    mockGetDisputableItems.mockReturnValue(new Promise<never>(() => undefined));
    render(<CreateDisputeScreen />);
    goToItemsStep();
    expect(screen.getByTestId("dispute-items-loading")).toBeTruthy();
  });

  it("shows an honest error state with retry when the fetch fails", async () => {
    mockGetDisputableItems.mockResolvedValue({
      success: false,
      error: { code: "NETWORK_ERROR", message: "Network down" },
    });

    render(<CreateDisputeScreen />);
    goToItemsStep();

    expect(await screen.findByTestId("dispute-items-error")).toBeTruthy();
    expect(screen.getByText("Network down")).toBeTruthy();

    // Retry re-fetches.
    mockGetDisputableItems.mockResolvedValue({
      success: true,
      data: { items: [] },
    });
    fireEvent.press(screen.getByText("Try Again"));
    await waitFor(() =>
      expect(mockGetDisputableItems).toHaveBeenCalledTimes(2),
    );
  });

  it("shows the inline empty state when the user has nothing to dispute", async () => {
    mockGetDisputableItems.mockResolvedValue({
      success: true,
      data: { items: [] },
    });

    render(<CreateDisputeScreen />);
    goToItemsStep();

    expect(await screen.findByTestId("dispute-items-empty")).toBeTruthy();
    expect(screen.getByText("Nothing to dispute right now")).toBeTruthy();
  });

  it("carries a selected real item into the review step that feeds the submit payload", async () => {
    mockGetDisputableItems.mockResolvedValue({
      success: true,
      data: {
        items: [
          item({ id: "i1", accountName: "Chase Sapphire", status: "Late 30 days" }),
        ],
      },
    });

    render(<CreateDisputeScreen />);
    goToItemsStep();

    // Select the real item on step 3, then advance through the message step to
    // the review step. The review renders each selected item as
    // "{accountName} - {status}" — the exact data handleSubmit sends to the
    // dispute store — so a real item here proves the selection -> submit path
    // carries real data, not the removed mock.
    fireEvent.press(await screen.findByText("Chase Sapphire"));
    fireEvent.press(screen.getByText("Next")); // step 3 -> 4 (message)
    fireEvent.press(screen.getByText("Next")); // step 4 -> 5 (review)

    expect(
      await screen.findByText("Chase Sapphire - Late 30 days"),
    ).toBeTruthy();
    // The review never surfaces a removed mock item.
    expect(screen.queryByText("Capital One Platinum - Late 30 days")).toBeNull();
  });
});
