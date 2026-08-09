/**
 * AdminDisputesScreen — real-data wiring (PARITY).
 *
 * The screen used to render a hardcoded DISPUTES array behind a fake setTimeout
 * load, with invented "pending"/"processing" statuses. It now fetches every
 * platform dispute from the real admin-guarded route (GET /api/admin/disputes)
 * via adminDisputesApi.getDisputes, with honest loading / error / empty states
 * and a status filter built from the real disputes-table status enum. These
 * tests prove the real disputes render, the honest states show, pull-to-refresh
 * refetches, and the former hardcoded DISPUTES values never appear.
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
import type { AdminDispute } from "../../services/api/admin";

const mockGetDisputes = jest.fn();

// RN's RefreshControl resolves undefined under this jest setup; stub just that
// module so the ScrollView's refreshControl prop renders.
jest.mock(
  "react-native/Libraries/Components/RefreshControl/RefreshControl",
  () => "RefreshControl",
);

// Mock the admin api service. The screen imports both ADMIN_DISPUTE_STATUSES (to
// render the filter) and adminDisputesApi (to fetch), so both must be provided.
jest.mock("../../services/api/admin", () => ({
  ADMIN_DISPUTE_STATUSES: [
    "draft",
    "sent",
    "under_review",
    "resolved",
    "rejected",
    "escalated",
  ],
  adminDisputesApi: {
    getDisputes: (...args: unknown[]) => mockGetDisputes(...args),
  },
}));

// expo-router is mocked globally in jest.setup.js.

import AdminDisputesScreen from "../../../app/admin/disputes";

// Distinct real values so they can never be confused with the former DISPUTES mock.
const realDisputes: AdminDispute[] = [
  {
    id: "dsp-real-1",
    user: "real.owner@fynvita.test",
    bureau: "TransUnion",
    status: "under_review",
    type: "collection",
    created: "2026-07-01",
  },
  {
    id: "dsp-real-2",
    user: "second.owner@fynvita.test",
    bureau: "Experian",
    status: "resolved",
    type: "late_payment",
    created: "2026-06-15",
  },
];

beforeEach(() => {
  jest.clearAllMocks();
});

describe("AdminDisputesScreen", () => {
  it("fetches disputes from the API on mount", async () => {
    mockGetDisputes.mockResolvedValue({ success: true, data: realDisputes });
    render(<AdminDisputesScreen />);
    await waitFor(() => expect(mockGetDisputes).toHaveBeenCalledTimes(1));
  });

  it("renders real disputes and the former DISPUTES mock never appears", async () => {
    mockGetDisputes.mockResolvedValue({ success: true, data: realDisputes });

    render(<AdminDisputesScreen />);

    // Real, adapted rows.
    expect(await screen.findByText("real.owner@fynvita.test")).toBeTruthy();
    expect(screen.getByText("second.owner@fynvita.test")).toBeTruthy();
    expect(screen.getByText("dsp-real-1")).toBeTruthy();
    // Real bureaus (unique to the detail rows).
    expect(screen.getByText("TransUnion")).toBeTruthy();
    expect(screen.getByText("Experian")).toBeTruthy();
    // Humanized real statuses render (as stat label, filter chip, and/or badge).
    expect(screen.getAllByText("Under Review").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Resolved").length).toBeGreaterThan(0);
    // Real item types + created date.
    expect(screen.getByText("collection")).toBeTruthy();
    expect(screen.getByText("late_payment")).toBeTruthy();
    expect(screen.getByText("Created: 2026-07-01")).toBeTruthy();

    // Former hardcoded DISPUTES values must never appear.
    expect(screen.queryByText("DSP-001")).toBeNull();
    expect(screen.queryByText("John Doe")).toBeNull();
    expect(screen.queryByText("Sarah Smith")).toBeNull();
    expect(screen.queryByText("Identity Error")).toBeNull();
    expect(screen.queryByText("Duplicate Entry")).toBeNull();
    // The mock's invented statuses are gone.
    expect(screen.queryByText("processing")).toBeNull();
    expect(screen.queryByText("pending")).toBeNull();
  });

  it("shows the loading state while the first fetch is in flight", () => {
    mockGetDisputes.mockReturnValue(new Promise<never>(() => undefined));
    render(<AdminDisputesScreen />);
    expect(screen.getByTestId("admin-disputes-loading")).toBeTruthy();
  });

  it("shows an honest error state with retry when the fetch fails", async () => {
    mockGetDisputes.mockResolvedValue({
      success: false,
      error: { code: "HTTP_403", message: "Forbidden" },
    });

    render(<AdminDisputesScreen />);

    expect(await screen.findByTestId("admin-disputes-error")).toBeTruthy();
    expect(screen.getByText("Forbidden")).toBeTruthy();

    fireEvent.press(screen.getByText("Try Again"));
    await waitFor(() => expect(mockGetDisputes).toHaveBeenCalledTimes(2));
  });

  it("shows an honest empty state when there are no disputes", async () => {
    mockGetDisputes.mockResolvedValue({ success: true, data: [] });

    render(<AdminDisputesScreen />);

    expect(await screen.findByTestId("admin-disputes-empty")).toBeTruthy();
    expect(screen.getByText("No disputes on the platform yet.")).toBeTruthy();
  });

  it("filters the list by a real status without refetching", async () => {
    mockGetDisputes.mockResolvedValue({ success: true, data: realDisputes });

    render(<AdminDisputesScreen />);
    await screen.findByText("real.owner@fynvita.test");

    // "Draft" appears only as a filter chip (neither dispute is a draft), so it
    // is unambiguous to press. Filtering to it hides both rows.
    fireEvent.press(screen.getByText("Draft"));
    await waitFor(() =>
      expect(screen.queryByText("real.owner@fynvita.test")).toBeNull(),
    );
    expect(screen.queryByText("second.owner@fynvita.test")).toBeNull();
    expect(screen.getByText("No disputes match this filter.")).toBeTruthy();
    // Filtering is client-side; no extra fetch.
    expect(mockGetDisputes).toHaveBeenCalledTimes(1);
  });

  it("re-fetches on pull-to-refresh", async () => {
    mockGetDisputes.mockResolvedValue({ success: true, data: realDisputes });

    const { UNSAFE_getAllByType } = render(<AdminDisputesScreen />);
    await screen.findByText("real.owner@fynvita.test");

    // The outer vertical ScrollView (index 0) carries the refreshControl; the
    // inner one is the horizontal filter strip.
    const scroll = UNSAFE_getAllByType(ScrollView)[0];
    await act(async () => {
      await scroll.props.refreshControl.props.onRefresh();
    });

    // mount + refresh
    expect(mockGetDisputes).toHaveBeenCalledTimes(2);
  });
});
