/**
 * Billing Overview screen — real-data wiring (PARITY-P2).
 *
 * The screen used to render a hardcoded BILLING_DATA object — an invented
 * "Visa •••• 4242" card, a fixed "2024-12-15" next-billing date, and three static
 * invoices (INV-001..003) — behind a fake setTimeout load. It now fetches the real
 * Stripe-backed billing overview from GET /api/payment/billing via
 * subscriptionApi.getBillingOverview and renders the plan, the user's real default
 * card (or an honest "no payment method" state), and real invoices (or an empty
 * state), with honest inline loading / error+retry states and pull-to-refresh.
 *
 * These tests prove: fetch-on-mount, real payload renders (plan, real card,
 * real invoice) while the removed mock (Visa 4242, INV-00x, 2024-12-15) never
 * shows, each honest state (loading / error+retry with no fabricated fallback /
 * empty invoices / no-card) renders, and a card is never fabricated for a user
 * without one.
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
import type { BillingOverview } from "../../services/api/user";

const mockGetBillingOverview = jest.fn();

// RN's RefreshControl resolves undefined under this jest setup; stub just that
// module so the ScrollView's refreshControl prop renders.
jest.mock(
  "react-native/Libraries/Components/RefreshControl/RefreshControl",
  () => "RefreshControl",
);

jest.mock("../../services/api/user", () => ({
  subscriptionApi: {
    getBillingOverview: (...args: unknown[]) => mockGetBillingOverview(...args),
  },
}));

// expo-router is mocked globally in jest.setup.js.

import BillingScreen from "../../../app/billing/index";

function overview(over: Partial<BillingOverview> = {}): BillingOverview {
  return {
    planName: "Standard",
    price: 29.99,
    interval: "month",
    status: "active",
    nextBilling: "2027-02-15",
    cancelAtPeriodEnd: false,
    paymentMethod: {
      brand: "mastercard",
      last4: "5100",
      expMonth: 8,
      expYear: 2027,
    },
    recentInvoices: [
      { id: "in_1001", date: "2027-01-15", amount: 29.99, status: "paid" },
      { id: "in_1000", date: "2026-12-15", amount: 29.99, status: "paid" },
    ],
    ...over,
  };
}

function resolve(data: BillingOverview = overview()) {
  mockGetBillingOverview.mockResolvedValue({ success: true, data });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Billing Overview screen", () => {
  it("fetches the billing overview from the API on mount", async () => {
    resolve();
    render(<BillingScreen />);
    await waitFor(() =>
      expect(mockGetBillingOverview).toHaveBeenCalledTimes(1),
    );
  });

  it("renders the real plan, payment method, and invoices — never the removed BILLING_DATA mock", async () => {
    resolve();
    render(<BillingScreen />);

    // Real plan + status + next billing.
    expect(await screen.findByText("Standard")).toBeTruthy();
    expect(screen.getByText("Active")).toBeTruthy();
    expect(screen.getByText(/2027-02-15/)).toBeTruthy();

    // Real default card from Stripe (brand title-cased, real last4/expiry).
    expect(screen.getByText(/Mastercard/)).toBeTruthy();
    expect(screen.getByText(/5100/)).toBeTruthy();
    expect(screen.getByText("Expires 08/27")).toBeTruthy();

    // Real invoices.
    expect(screen.getByText("in_1001")).toBeTruthy();
    expect(screen.getByText("in_1000")).toBeTruthy();

    // The removed hardcoded mock (Visa 4242, INV-001..003, 2024-12-15) must not render.
    expect(screen.queryByText(/4242/)).toBeNull();
    expect(screen.queryByText("INV-001")).toBeNull();
    expect(screen.queryByText("INV-002")).toBeNull();
    expect(screen.queryByText("INV-003")).toBeNull();
    expect(screen.queryByText(/2024-12-15/)).toBeNull();
  });

  it("shows the loading state while the first fetch is in flight", () => {
    mockGetBillingOverview.mockReturnValue(new Promise<never>(() => undefined));
    render(<BillingScreen />);
    expect(screen.getByTestId("billing-overview-loading")).toBeTruthy();
  });

  it("shows an honest error state with retry when the fetch fails — never the mock", async () => {
    mockGetBillingOverview.mockResolvedValue({
      success: false,
      error: { code: "NETWORK_ERROR", message: "Network down" },
    });

    render(<BillingScreen />);

    expect(await screen.findByTestId("billing-overview-error")).toBeTruthy();
    expect(screen.getByText("Network down")).toBeTruthy();

    // The old silent behavior would have shown the fabricated card/invoices — it must not.
    expect(screen.queryByText(/4242/)).toBeNull();
    expect(screen.queryByText("INV-001")).toBeNull();

    fireEvent.press(screen.getByText("Try Again"));
    await waitFor(() =>
      expect(mockGetBillingOverview).toHaveBeenCalledTimes(2),
    );
  });

  it("empty-states invoices and payment method for a free user — no fabricated card", async () => {
    resolve(
      overview({
        planName: "Free",
        price: 0,
        nextBilling: null,
        paymentMethod: null,
        recentInvoices: [],
      }),
    );
    render(<BillingScreen />);

    expect(await screen.findByTestId("billing-overview-empty")).toBeTruthy();
    expect(screen.getByTestId("billing-overview-no-payment-method")).toBeTruthy();
    expect(screen.getByText("No payment method on file.")).toBeTruthy();
    expect(screen.getByText("No invoices yet.")).toBeTruthy();

    // Never a fabricated card for a user without one.
    expect(screen.queryByText(/4242/)).toBeNull();
    expect(screen.queryByText(/Mastercard/)).toBeNull();
  });

  it("renders cancel-at-period-end, an off-catalog status, and a non-paid invoice", async () => {
    resolve(
      overview({
        status: "paused",
        cancelAtPeriodEnd: true,
        nextBilling: "2027-03-01",
        recentInvoices: [
          { id: "in_2001", date: "2027-02-15", amount: 29.99, status: "open" },
        ],
      }),
    );
    render(<BillingScreen />);

    // cancelAtPeriodEnd flips the next-billing label to "Access ends".
    expect(await screen.findByText(/Access ends: 2027-03-01/)).toBeTruthy();
    // A status not in the color map still renders (humanized).
    expect(screen.getByText("Paused")).toBeTruthy();
    // A non-paid invoice status renders in the neutral color branch.
    expect(screen.getByText("open")).toBeTruthy();
    expect(screen.getByText("in_2001")).toBeTruthy();
  });

  it("falls back to a generic error message when the failure carries no message", async () => {
    mockGetBillingOverview.mockResolvedValue({ success: false });
    render(<BillingScreen />);
    expect(await screen.findByTestId("billing-overview-error")).toBeTruthy();
    expect(
      screen.getByText("Unable to load billing right now."),
    ).toBeTruthy();
  });

  it("re-fetches on pull-to-refresh", async () => {
    resolve();
    const { UNSAFE_getAllByType } = render(<BillingScreen />);
    await screen.findByText("Standard");

    // The outer ScrollView (first in tree) carries the refreshControl.
    const scroll = UNSAFE_getAllByType(ScrollView)[0];
    await act(async () => {
      await scroll.props.refreshControl.props.onRefresh();
    });

    // mount + refresh
    expect(mockGetBillingOverview).toHaveBeenCalledTimes(2);
  });
});
