/**
 * Credit Report Detail screen — real-data wiring (M1-2 / FR-202).
 *
 * The screen used to render a hardcoded `report` object (bureau "experian",
 * score 720, fabricated Chase Freedom / Bank of America / Capital One accounts, a
 * Medical Collections negative item, Auto Dealer inquiries) with a setTimeout
 * no-op refresh. It now reads the report id from the route and fetches the user's
 * real report from creditRepairApi.getReport (GET /api/credit-repair/reports/[id])
 * with honest inline loading / error / empty states and a retry. These tests prove
 * the fetch happens on mount with the route id, the real header fields render, the
 * removed hardcoded values never appear, every structured section empty-states
 * (the report POST does not yet populate them), and each honest state shows.
 */

import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react-native";
import type { CreditReportDetail } from "../../services/api/creditRepair";

const mockGetReport = jest.fn();

jest.mock("../../services/api/creditRepair", () => ({
  creditRepairApi: {
    getReport: (...args: unknown[]) => mockGetReport(...args),
  },
}));

// This screen reads `id` from the route, so override the global expo-router mock
// (jest.setup.js returns empty params) with a concrete id plus the router methods
// the screen calls.
jest.mock("expo-router", () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(() => true),
  },
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(() => true),
  }),
  useLocalSearchParams: () => ({ id: "report-123" }),
}));

import ReportDetailScreen from "../../../app/reports/[id]";

function reportDetail(over: Partial<CreditReportDetail> = {}): CreditReportDetail {
  return {
    id: "report-123",
    bureau: "equifax",
    score: 688,
    reportDate: "2026-02-10T00:00:00.000Z",
    accountsCount: 0,
    negativeItemsCount: 0,
    inquiriesCount: 0,
    publicRecordsCount: 0,
    ...over,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Credit Report Detail screen", () => {
  it("fetches the report on mount using the route id", async () => {
    mockGetReport.mockResolvedValue({
      success: true,
      data: { report: reportDetail() },
    });
    render(<ReportDetailScreen />);
    await waitFor(() =>
      expect(mockGetReport).toHaveBeenCalledWith("report-123"),
    );
  });

  it("renders the real bureau, score and report date; never the removed hardcoded report", async () => {
    mockGetReport.mockResolvedValue({
      success: true,
      data: {
        report: reportDetail({
          bureau: "equifax",
          score: 688,
          reportDate: "2026-02-10T00:00:00.000Z",
        }),
      },
    });

    render(<ReportDetailScreen />);

    // Real header fields.
    expect(await screen.findByText("Equifax")).toBeTruthy();
    expect(screen.getByText("688")).toBeTruthy();
    expect(screen.getByText(/Report Date: 2026-02-10/)).toBeTruthy();
    // The ISO time component is stripped, not rendered raw.
    expect(screen.queryByText(/T00:00:00/)).toBeNull();

    // The former hardcoded report values must never appear.
    expect(screen.queryByText("720")).toBeNull(); // old mock score
    expect(screen.queryByText("Chase Freedom")).toBeNull();
    expect(screen.queryByText("Bank of America")).toBeNull();
    expect(screen.queryByText("Capital One")).toBeNull();
    expect(screen.queryByText("Medical Collections")).toBeNull();
    expect(screen.queryByText("Auto Dealer")).toBeNull();
  });

  it("empty-states every structured section instead of fabricating rows", async () => {
    mockGetReport.mockResolvedValue({
      success: true,
      data: { report: reportDetail() },
    });

    render(<ReportDetailScreen />);

    expect(await screen.findByTestId("report-accounts-empty")).toBeTruthy();
    expect(screen.getByTestId("report-negative-empty")).toBeTruthy();
    expect(screen.getByTestId("report-inquiries-empty")).toBeTruthy();
    expect(screen.getByTestId("report-public-records-empty")).toBeTruthy();

    expect(screen.getByText("No accounts reported.")).toBeTruthy();
    expect(screen.getByText("No negative items reported.")).toBeTruthy();
    expect(screen.getByText("No inquiries reported.")).toBeTruthy();
    expect(screen.getByText("No public records reported.")).toBeTruthy();
  });

  it("shows the loading state while the first fetch is in flight", () => {
    mockGetReport.mockReturnValue(new Promise<never>(() => undefined));
    render(<ReportDetailScreen />);
    expect(screen.getByTestId("report-loading")).toBeTruthy();
  });

  it("shows the empty state when the request succeeds with no report", async () => {
    mockGetReport.mockResolvedValue({
      success: true,
      data: { report: null },
    });
    render(<ReportDetailScreen />);
    expect(await screen.findByTestId("report-empty")).toBeTruthy();
  });

  it("shows an honest error state with retry when the fetch fails", async () => {
    mockGetReport.mockResolvedValue({
      success: false,
      error: { code: "HTTP_404", message: "Credit report not found" },
    });

    render(<ReportDetailScreen />);

    expect(await screen.findByTestId("report-error")).toBeTruthy();
    expect(screen.getByText("Credit report not found")).toBeTruthy();

    // Retry re-fetches.
    mockGetReport.mockResolvedValue({
      success: true,
      data: { report: reportDetail() },
    });
    fireEvent.press(screen.getByText("Try Again"));
    await waitFor(() => expect(mockGetReport).toHaveBeenCalledTimes(2));
  });
});
