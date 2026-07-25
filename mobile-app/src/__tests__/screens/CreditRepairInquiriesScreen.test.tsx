/**
 * Credit Repair InquiriesScreen — real-data wiring (PARITY-P2).
 *
 * The screen used to render a hardcoded INQUIRIES array behind a fake setTimeout
 * load, with a "Dispute" button that faked a successful filing. It now fetches
 * the user's real credit inquiries from creditRepairApi.getInquiries
 * (GET /api/credit-repair/inquiries) with honest inline loading/error/empty
 * states and pull-to-refresh. These tests prove the real inquiries render, the
 * bureau is formatted from the lowercase enum, the removable/valid badges follow
 * the derived flag, the stats are computed from real data, the former hardcoded
 * creditors never appear, and each honest state shows.
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
import type { CreditInquiry } from "../../services/api/creditRepair";

const mockGetInquiries = jest.fn();

// RN's RefreshControl resolves undefined under this jest setup; stub just that
// module so the ScrollView's refreshControl prop renders.
jest.mock(
  "react-native/Libraries/Components/RefreshControl/RefreshControl",
  () => "RefreshControl",
);

jest.mock("../../services/api/creditRepair", () => ({
  creditRepairApi: {
    getInquiries: (...args: unknown[]) => mockGetInquiries(...args),
  },
}));

// expo-router is mocked globally in jest.setup.js.

import InquiriesScreen from "../../../app/credit-repair/inquiries";

function inquiry(over: Partial<CreditInquiry> = {}): CreditInquiry {
  return {
    id: "i1",
    creditor: "Synchrony Bank",
    inquiryDate: "2024-11-15T00:00:00.000Z",
    inquiryType: "hard",
    bureau: "experian",
    removable: true,
    ...over,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Credit Repair InquiriesScreen", () => {
  it("fetches inquiries from the API on mount", async () => {
    mockGetInquiries.mockResolvedValue({
      success: true,
      data: { inquiries: [] },
    });
    render(<InquiriesScreen />);
    await waitFor(() => expect(mockGetInquiries).toHaveBeenCalledTimes(1));
  });

  it("renders real inquiries, computed stats, formatted bureau, and removable/valid badges; never the removed mock values", async () => {
    mockGetInquiries.mockResolvedValue({
      success: true,
      data: {
        inquiries: [
          inquiry({
            id: "i1",
            creditor: "Synchrony Bank",
            inquiryType: "hard",
            bureau: "experian",
            removable: true,
          }),
          inquiry({
            id: "i2",
            creditor: "Comenity Bank",
            inquiryType: "hard",
            bureau: "transunion",
            removable: false,
          }),
          inquiry({
            id: "i3",
            creditor: "SoftPull LLC",
            inquiryType: "soft",
            bureau: undefined,
            removable: false,
          }),
        ],
      },
    });

    render(<InquiriesScreen />);

    // Real creditor names.
    expect(await screen.findByText("Synchrony Bank")).toBeTruthy();
    expect(screen.getByText("Comenity Bank")).toBeTruthy();
    expect(screen.getByText("SoftPull LLC")).toBeTruthy();

    // Bureau formatted from the lowercase DB enum; the undefined bureau is omitted.
    expect(screen.getByText("• Experian")).toBeTruthy();
    expect(screen.getByText("• Transunion")).toBeTruthy();
    expect(screen.queryByText("• Equifax")).toBeNull();

    // Computed stats: total 3, removable 1, hard 2.
    expect(screen.getByText("Total Inquiries")).toBeTruthy();
    expect(screen.getByText("Hard")).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy(); // total
    expect(screen.getByText("2")).toBeTruthy(); // hard count

    // Badges follow the derived flag: 1 removable item -> 1 badge + the info
    // label "Removable"; 2 non-removable items -> 2 "Valid" badges.
    expect(screen.getAllByText("Removable")).toHaveLength(2);
    expect(screen.getAllByText("Valid")).toHaveLength(2);

    // Former hardcoded INQUIRIES creditors + dates must never appear.
    expect(screen.queryByText("Chase Bank")).toBeNull();
    expect(screen.queryByText("Capital One")).toBeNull();
    expect(screen.queryByText("Discover")).toBeNull();
    expect(screen.queryByText("American Express")).toBeNull();
    expect(screen.queryByText("Wells Fargo")).toBeNull();
    expect(screen.queryByText("2024-10-20")).toBeNull();
    expect(screen.queryByText("2024-09-05")).toBeNull();
  });

  it("shows the loading state while the first fetch is in flight", () => {
    mockGetInquiries.mockReturnValue(new Promise<never>(() => undefined));
    render(<InquiriesScreen />);
    expect(
      screen.getByTestId("credit-repair-inquiries-loading"),
    ).toBeTruthy();
  });

  it("shows an honest error state with retry when the fetch fails", async () => {
    mockGetInquiries.mockResolvedValue({
      success: false,
      error: { code: "NETWORK_ERROR", message: "Network down" },
    });

    render(<InquiriesScreen />);

    expect(
      await screen.findByTestId("credit-repair-inquiries-error"),
    ).toBeTruthy();
    expect(screen.getByText("Network down")).toBeTruthy();

    fireEvent.press(screen.getByText("Try Again"));
    await waitFor(() => expect(mockGetInquiries).toHaveBeenCalledTimes(2));
  });

  it("shows the inline empty state when there are no inquiries", async () => {
    mockGetInquiries.mockResolvedValue({
      success: true,
      data: { inquiries: [] },
    });
    render(<InquiriesScreen />);
    expect(
      await screen.findByTestId("credit-repair-inquiries-empty"),
    ).toBeTruthy();
    expect(screen.getByText("No inquiries found")).toBeTruthy();
  });

  it("re-fetches on pull-to-refresh", async () => {
    mockGetInquiries.mockResolvedValue({
      success: true,
      data: { inquiries: [inquiry()] },
    });

    const { UNSAFE_getByType } = render(<InquiriesScreen />);
    await screen.findByText("Synchrony Bank");

    const scroll = UNSAFE_getByType(ScrollView);
    await act(async () => {
      await scroll.props.refreshControl.props.onRefresh();
    });

    // mount + refresh
    expect(mockGetInquiries).toHaveBeenCalledTimes(2);
  });
});
