/**
 * Billing Settings Page — FND-016/FND-017 regression coverage.
 *
 * The page used to render a hardcoded Visa •••• 4242 card, "Premium
 * $79/month", and three fake invoices via local useState. It now fetches
 * real billing data from /api/payment/billing (backed by getBillingData).
 * These tests assert real data renders, empty states render when Stripe has
 * nothing to return, and the literal "4242" never appears — in output or in
 * source.
 */

import fs from "fs";
import path from "path";
import React from "react";
import { render, screen, waitFor, cleanup } from "@testing-library/react";

const mockGetSession = jest.fn();

jest.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { getSession: (...args: unknown[]) => mockGetSession(...args) },
  }),
}));

import BillingSettingsPage from "../page";

// Fully reassign global.fetch (rather than casting the existing one) so the
// mock bypasses MSW's fetch interceptor — see src/app/credit/factors/__tests__/page.test.tsx
// for the same pattern.
const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

const FAKE_SESSION = {
  access_token: "test-access-token",
  user: { id: "user-1" },
};

// MSW's fetch interceptor normalizes whatever global.fetch resolves and
// expects a real Fetch API Response (.clone(), .headers, .text(), .json()) —
// a hand-rolled plain object fails piecemeal against each of those. A real
// Response (polyfilled onto global via node-fetch in setupTests.ts) implements
// all of them natively.
function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  // Reset the fetch mock's IMPLEMENTATION too (clearAllMocks only clears call
  // history) so a prior test's never-resolving fetch does not leak forward.
  mockFetch.mockReset();
  mockGetSession.mockResolvedValue({
    data: { session: FAKE_SESSION },
    error: null,
  });
});

// Unmount each rendered component so an in-flight request from a prior test
// (e.g. the never-resolving fetch in the loading-state test) cannot bleed a
// call into the next test's assertions.
afterEach(() => {
  cleanup();
});

describe("Billing Settings Page", () => {
  it("never contains the literal hardcoded card number 4242 in source", () => {
    const source = fs.readFileSync(path.join(__dirname, "..", "page.tsx"), "utf-8");
    expect(source).not.toContain("4242");
  });

  it("shows a loading state before data resolves", async () => {
    mockFetch.mockReturnValue(new Promise(() => {})); // never resolves in this test
    render(<BillingSettingsPage />);
    expect(
      screen.getByText(/Loading billing information/i),
    ).toBeInTheDocument();

    // Let the effect run through to the network call so nothing is left
    // pending to leak into the next test.
    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
  });

  it("shows a sign-in message and skips the fetch when there is no session", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
    render(<BillingSettingsPage />);

    await waitFor(() => {
      expect(
        screen.getByText(/Sign in to view your billing information/i),
      ).toBeInTheDocument();
    });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("shows an error message when the billing API call fails", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ error: "boom" }, 500));
    render(<BillingSettingsPage />);

    await waitFor(() => {
      expect(
        screen.getByText(/Failed to load billing information/i),
      ).toBeInTheDocument();
    });
  });

  it("renders the real payment method and plan, and never the hardcoded 4242 card", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({
        plans: [{ id: "pro", name: "Pro", price: 99.99, interval: "month" }],
        subscription: {
          planId: "pro",
          status: "active",
          currentPeriodEnd: "2026-08-15T00:00:00.000Z",
          cancelAtPeriodEnd: false,
        },
        paymentMethods: [
          {
            id: "pm_1",
            brand: "mastercard",
            last4: "1881",
            expMonth: 7,
            expYear: 2029,
            isDefault: true,
          },
        ],
        invoices: [
          {
            id: "in_1",
            amount: 49.99,
            status: "paid",
            created: "2026-07-15T00:00:00.000Z",
          },
        ],
      }),
    );

    render(<BillingSettingsPage />);

    await waitFor(() => {
      expect(screen.getByText(/1881/)).toBeInTheDocument();
    });

    expect(screen.getByText("Pro")).toBeInTheDocument();
    expect(screen.getByText(/\$99\.99/)).toBeInTheDocument();
    expect(screen.getByText(/\$49\.99/)).toBeInTheDocument();
    expect(screen.getByText(/Mastercard/i)).toBeInTheDocument();
    expect(screen.queryByText(/4242/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Visa/i)).not.toBeInTheDocument();
  });

  it("renders empty states when there is no payment method and no invoices", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({
        plans: [{ id: "free", name: "Free", price: 0, interval: "month" }],
        subscription: {
          planId: "free",
          status: "active",
          cancelAtPeriodEnd: false,
        },
        paymentMethods: [],
        invoices: [],
      }),
    );

    render(<BillingSettingsPage />);

    await waitFor(() => {
      expect(screen.getByText(/No payment method on file/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/No billing history yet/i)).toBeInTheDocument();
    expect(screen.queryByText(/4242/)).not.toBeInTheDocument();
  });
});
