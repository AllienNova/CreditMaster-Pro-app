/**
 * Invoices screen — real-data wiring (PARITY-P2).
 *
 * The screen used to render a hardcoded INVOICES array (INV-001..007 with
 * fabricated "Pro Plan - December 2024" descriptions) behind a fake setTimeout
 * load. It now fetches the real Stripe-backed billing history from
 * GET /api/payment/billing via subscriptionApi.getInvoices and renders the real
 * invoices (id, date, amount, remapped status) with honest inline
 * loading / error+retry / empty states and pull-to-refresh. When an invoice
 * carries a real PDF link, a "View PDF" action opens it through the
 * scheme-allowlisted opener; invoices without one show no action.
 *
 * These tests prove: fetch-on-mount, the real invoices render while the removed
 * mock (INV-00x, "Pro Plan - December 2024") never shows, each honest state
 * renders, the remapped statuses (paid / pending / failed) display, the PDF
 * action opens only real links through the allowlisted opener, and no card data
 * is fabricated on this screen.
 */

import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react-native";
import type { InvoiceView } from "../../services/api/user";

const mockGetInvoices = jest.fn();
const mockOpenExternalUrl = jest.fn();

// RN's RefreshControl resolves undefined under this jest setup; stub just that
// module so the ScrollView's refreshControl prop renders.
jest.mock(
  "react-native/Libraries/Components/RefreshControl/RefreshControl",
  () => "RefreshControl",
);

jest.mock("../../services/api/user", () => ({
  subscriptionApi: {
    getInvoices: (...args: unknown[]) => mockGetInvoices(...args),
  },
}));

jest.mock("../../utils/openExternalUrl", () => ({
  openExternalUrl: (...args: unknown[]) => mockOpenExternalUrl(...args),
}));

// expo-router is mocked globally in jest.setup.js.

import InvoicesScreen from "../../../app/billing/invoices";

function makeInvoices(): InvoiceView[] {
  return [
    {
      id: "in_paid_1",
      date: "2027-03-15",
      amount: 30.0,
      status: "paid",
      pdfUrl: "https://files.stripe.com/in_paid_1.pdf",
    },
    { id: "in_paid_2", date: "2027-02-15", amount: 10.0, status: "paid" },
    { id: "in_pending_1", date: "2027-01-15", amount: 99.99, status: "pending" },
    { id: "in_failed_1", date: "2026-12-15", amount: 9.99, status: "failed" },
  ];
}

function resolve(data: InvoiceView[] = makeInvoices()) {
  mockGetInvoices.mockResolvedValue({ success: true, data });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Invoices screen", () => {
  it("fetches the billing history from the API on mount", async () => {
    resolve();
    render(<InvoicesScreen />);
    await waitFor(() => expect(mockGetInvoices).toHaveBeenCalledTimes(1));
  });

  it("renders the real invoices and never the removed hardcoded mock", async () => {
    resolve();
    render(<InvoicesScreen />);

    // Real invoice ids, amounts, and dates render.
    expect(await screen.findByText("in_paid_1")).toBeTruthy();
    expect(screen.getByText("in_pending_1")).toBeTruthy();
    expect(screen.getByText("in_failed_1")).toBeTruthy();
    expect(screen.getByText("$99.99")).toBeTruthy();
    expect(screen.getByText("2027-03-15")).toBeTruthy();

    // Real summary: 4 invoices, $40.00 paid (30 + 10).
    expect(screen.getByText("4")).toBeTruthy();
    expect(screen.getByText("$40.00")).toBeTruthy();

    // The removed hardcoded mock invoices / fabricated descriptions must not render.
    expect(screen.queryByText("INV-001")).toBeNull();
    expect(screen.queryByText("Pro Plan - December 2024")).toBeNull();
    expect(screen.queryByText("Basic Plan - July 2024")).toBeNull();

    // No card / payment-method data is fabricated on this screen.
    expect(screen.queryByText(/4242/)).toBeNull();
    expect(screen.queryByText(/••••/)).toBeNull();
  });

  it("renders the remapped paid / pending / failed statuses", async () => {
    resolve();
    render(<InvoicesScreen />);

    await screen.findByText("in_paid_1");
    // Two paid invoices, one pending, one failed.
    expect(screen.getAllByText("paid")).toHaveLength(2);
    expect(screen.getByText("pending")).toBeTruthy();
    expect(screen.getByText("failed")).toBeTruthy();
  });

  it("shows the loading state while the first fetch is in flight", () => {
    mockGetInvoices.mockReturnValue(new Promise<never>(() => undefined));
    render(<InvoicesScreen />);
    expect(screen.getByTestId("billing-invoices-loading")).toBeTruthy();
  });

  it("shows an honest error state with retry when the fetch fails — never the mock", async () => {
    mockGetInvoices.mockResolvedValue({
      success: false,
      error: { code: "NETWORK_ERROR", message: "Network down" },
    });

    render(<InvoicesScreen />);

    expect(await screen.findByTestId("billing-invoices-error")).toBeTruthy();
    expect(screen.getByText("Network down")).toBeTruthy();

    // No fabricated invoices behind the error.
    expect(screen.queryByText("INV-001")).toBeNull();

    fireEvent.press(screen.getByText("Try Again"));
    await waitFor(() => expect(mockGetInvoices).toHaveBeenCalledTimes(2));
  });

  it("falls back to a generic error message when the failure carries no message", async () => {
    mockGetInvoices.mockResolvedValue({ success: false });
    render(<InvoicesScreen />);
    expect(await screen.findByTestId("billing-invoices-error")).toBeTruthy();
    expect(
      screen.getByText("Unable to load your invoices right now."),
    ).toBeTruthy();
  });

  it("empty-states (never a fabricated invoice) when the user has no invoices", async () => {
    resolve([]);
    render(<InvoicesScreen />);
    expect(await screen.findByTestId("billing-invoices-empty")).toBeTruthy();
    expect(screen.getByText("No invoices yet.")).toBeTruthy();
    expect(screen.queryByText("INV-001")).toBeNull();
  });

  it("opens a real PDF link through the allowlisted opener, and shows no action without one", async () => {
    resolve();
    render(<InvoicesScreen />);

    // The paid invoice carries a real PDF link -> a "View PDF" action opens it.
    const pdfAction = await screen.findByTestId("billing-invoice-pdf-in_paid_1");
    fireEvent.press(pdfAction);
    expect(mockOpenExternalUrl).toHaveBeenCalledWith(
      "https://files.stripe.com/in_paid_1.pdf",
    );

    // An invoice without a PDF link shows no action.
    expect(screen.queryByTestId("billing-invoice-pdf-in_pending_1")).toBeNull();
  });

  it("filters the list by status without refetching", async () => {
    resolve();
    render(<InvoicesScreen />);

    await screen.findByText("in_paid_1");
    fireEvent.press(screen.getByText("Failed"));

    expect(screen.getByText("in_failed_1")).toBeTruthy();
    expect(screen.queryByText("in_paid_1")).toBeNull();
    expect(screen.queryByText("in_pending_1")).toBeNull();
    // Filtering is local — no second fetch.
    expect(mockGetInvoices).toHaveBeenCalledTimes(1);
  });

  it("re-fetches on pull-to-refresh", async () => {
    resolve();
    const { UNSAFE_getAllByType } = render(<InvoicesScreen />);
    await screen.findByText("in_paid_1");

    const { ScrollView } = require("react-native");
    const scroll = UNSAFE_getAllByType(ScrollView)[0];
    await act(async () => {
      await scroll.props.refreshControl.props.onRefresh();
    });

    expect(mockGetInvoices).toHaveBeenCalledTimes(2);
  });
});
