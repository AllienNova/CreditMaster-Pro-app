/**
 * Subscription Tracker Page — real-data wiring regression coverage.
 *
 * The page used to render hardcoded MOCK_SUBSCRIPTIONS / MOCK_INSIGHTS /
 * MOCK_DETECTED arrays via local useState. It now fetches the real subscription
 * audit from GET /api/financial/savings/subscriptions
 * (withPermission("financial:read"), Bearer-authenticated) and maps the
 * response to the page's view models:
 *   - data.subscriptions   (RecurringCharge[])          → the main list
 *   - data.recommendations (SubscriptionRecommendation[]) → the "AI Insights" cards
 *   - data.recurringCharges (RecurringCharge[])          → the "Detected" modal
 * These tests assert real data renders, honest empty/error/sign-in states show,
 * the former hardcoded rows never appear, and the MOCK_* arrays are gone.
 */

import fs from "fs";
import path from "path";
import {
  render,
  screen,
  waitFor,
  cleanup,
  fireEvent,
} from "@testing-library/react";
import "@testing-library/jest-dom";

const mockGetSession = jest.fn();

jest.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { getSession: (...args: unknown[]) => mockGetSession(...args) },
  }),
}));

import SubscriptionTrackerPage from "../page";

// Fully reassign global.fetch so the mock bypasses MSW's fetch interceptor
// (same pattern as src/app/budgeting/bills/__tests__/page.test.tsx).
const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

const FAKE_SESSION = {
  access_token: "test-access-token",
  user: { id: "user-1" },
};

const DAY_MS = 24 * 60 * 60 * 1000;

// A real Response (polyfilled in setupTests.ts) satisfies MSW's interceptor,
// which a hand-rolled plain object does not.
function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// API-shaped audit response (dates are ISO strings, as they arrive over JSON).
// Merchant names here are deliberately distinct from the removed MOCK_* rows
// (Netflix / Disney+ / Adobe Creative Cloud / HBO Max / Hulu …) so a passing
// assertion proves real data rendered, not a leftover mock.
function apiResponse() {
  const future = new Date(Date.now() + 20 * DAY_MS).toISOString();
  const past = new Date(Date.now() - 5 * DAY_MS).toISOString();

  const hooli = {
    id: "sub-1",
    merchantName: "Hooli Video",
    category: "entertainment",
    amount: 12.5,
    frequency: "monthly",
    confidence: 94,
    transactionCount: 6,
    firstDetectedAt: past,
    lastChargeAt: past,
    nextExpectedAt: future,
    variance: 0.02,
    isSubscription: true,
    cancellable: true,
    transactions: [],
  };
  // No nextExpectedAt → exercises the `?? lastChargeAt` fallback branch.
  const zenith = {
    id: "sub-2",
    merchantName: "Zenith Cloud",
    category: "software",
    amount: 9.99,
    frequency: "monthly",
    confidence: 88,
    transactionCount: 4,
    firstDetectedAt: past,
    lastChargeAt: past,
    variance: 0.01,
    isSubscription: true,
    cancellable: true,
    transactions: [],
  };
  // isSubscription=false → present in recurringCharges (Detected modal) only,
  // never in the main list, so it cleanly proves the modal maps recurringCharges.
  const insurance = {
    id: "rc-3",
    merchantName: "Globex Insurance",
    category: "insurance",
    amount: 120,
    frequency: "quarterly",
    confidence: 80,
    transactionCount: 3,
    firstDetectedAt: past,
    lastChargeAt: past,
    nextExpectedAt: future,
    variance: 0.03,
    isSubscription: false,
    cancellable: false,
    transactions: [],
  };
  const recommendation = {
    id: "rec-1",
    recurringChargeId: "sub-1",
    merchantName: "Hooli Video",
    monthlyAmount: 12.5,
    annualAmount: 150,
    type: "cancel",
    reason:
      "This subscription appears to be unnecessary and can be cancelled to save money.",
    confidence: 94,
    potentialMonthlySavings: 12.5,
    potentialAnnualSavings: 150,
    importance: "unnecessary",
    aiGenerated: false,
  };

  return {
    success: true,
    data: {
      subscriptions: [hooli, zenith],
      recurringCharges: [hooli, zenith, insurance],
      recommendations: [recommendation],
      summary: {
        totalRecurringCharges: 3,
        totalSubscriptions: 2,
        totalMonthlySubscriptionSpending: 22.49,
        totalAnnualSubscriptionSpending: 269.88,
        potentialMonthlySavings: 12.5,
        potentialAnnualSavings: 150,
        recommendationsCount: 1,
      },
    },
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockFetch.mockReset();
  mockGetSession.mockResolvedValue({
    data: { session: FAKE_SESSION },
    error: null,
  });
});

afterEach(() => {
  cleanup();
});

describe("Subscription Tracker Page — real /api/financial/savings/subscriptions wiring", () => {
  it("has no MOCK_ subscription/insight/detected arrays left in source", () => {
    const source = fs.readFileSync(
      path.join(__dirname, "..", "page.tsx"),
      "utf-8",
    );
    expect(source).not.toContain("MOCK_SUBSCRIPTIONS");
    expect(source).not.toContain("MOCK_INSIGHTS");
    expect(source).not.toContain("MOCK_DETECTED");
  });

  it("fetches the subscriptions endpoint with a Bearer token", async () => {
    mockFetch.mockResolvedValue(jsonResponse(apiResponse()));

    render(<SubscriptionTrackerPage />);

    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
    // The test env's fetch interceptor normalizes fetch(url, init) into a single
    // Request object, so inspect that rather than positional (url, init) args.
    const req = mockFetch.mock.calls[0][0] as {
      url: string;
      headers: { get: (name: string) => string | null };
    };
    expect(req.url).toContain("/api/financial/savings/subscriptions");
    expect(req.headers.get("Authorization")).toBe("Bearer test-access-token");
  });

  it("renders real subscriptions on success (and none of the removed MOCK_SUBSCRIPTIONS rows)", async () => {
    mockFetch.mockResolvedValue(jsonResponse(apiResponse()));

    render(<SubscriptionTrackerPage />);

    // Real merchant names (mapped from data.subscriptions) render in the list.
    await waitFor(() => {
      expect(screen.getAllByText("Hooli Video").length).toBeGreaterThan(0);
    });
    expect(screen.getAllByText("Zenith Cloud").length).toBeGreaterThan(0);

    // The empty state must not show when real subscriptions exist.
    expect(screen.queryByText("No subscriptions detected")).not.toBeInTheDocument();

    // The removed hardcoded mock rows must never appear.
    expect(screen.queryByText("Disney+")).not.toBeInTheDocument();
    expect(screen.queryByText("Gym Membership")).not.toBeInTheDocument();
    expect(screen.queryByText("Adobe Creative Cloud")).not.toBeInTheDocument();
    expect(screen.queryByText("iCloud Storage")).not.toBeInTheDocument();
  });

  it("renders real AI insights from recommendations (not the removed MOCK_INSIGHTS copy)", async () => {
    mockFetch.mockResolvedValue(jsonResponse(apiResponse()));

    render(<SubscriptionTrackerPage />);

    // Insight title is composed from the recommendation action + merchant.
    await waitFor(() => {
      expect(screen.getByText("Cancel Hooli Video")).toBeInTheDocument();
    });
    // Description maps from recommendation.reason.
    expect(screen.getByText(/appears to be unnecessary/i)).toBeInTheDocument();

    // The removed hardcoded insight copy must never appear.
    expect(
      screen.queryByText("Multiple streaming services detected"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Potentially unused subscription/i),
    ).not.toBeInTheDocument();
  });

  it("scan surfaces real detected recurring charges (not the removed MOCK_DETECTED rows)", async () => {
    // The scan triggers a second fetch, so return a fresh Response per call —
    // a single Response body can only be consumed once.
    mockFetch.mockImplementation(async () => jsonResponse(apiResponse()));

    render(<SubscriptionTrackerPage />);

    await waitFor(() => {
      expect(screen.getAllByText("Hooli Video").length).toBeGreaterThan(0);
    });

    fireEvent.click(
      screen.getByRole("button", { name: /detect subscriptions/i }),
    );

    // The modal opens and lists real recurringCharges. Globex Insurance is
    // recurringCharges-only (isSubscription=false), so it proves the modal maps
    // the detection result, not the main subscription list.
    await waitFor(() => {
      expect(screen.getByText("Detected Subscriptions")).toBeInTheDocument();
    });
    expect(screen.getByText("Globex Insurance")).toBeInTheDocument();

    // The removed hardcoded detected rows must never appear.
    expect(screen.queryByText("HBO Max")).not.toBeInTheDocument();
    expect(screen.queryByText("Hulu")).not.toBeInTheDocument();
  });

  it("normalizes each billing frequency to its monthly-equivalent total", async () => {
    const past = new Date(Date.now() - 5 * DAY_MS).toISOString();
    const mk = (id: string, amount: number, frequency: string) => ({
      id,
      merchantName: `Merchant ${id}`,
      category: "other",
      amount,
      frequency,
      confidence: 90,
      transactionCount: 3,
      firstDetectedAt: past,
      lastChargeAt: past,
      nextExpectedAt: past,
      variance: 0.01,
      isSubscription: true,
      cancellable: true,
      transactions: [],
    });
    // weekly ×4.33 (43.30) + biweekly ×2.17 (21.70) + monthly (10) +
    // quarterly ÷3 (10) + annually ÷12 (10) = 95.00/mo.
    const subs = [
      mk("w", 10, "weekly"),
      mk("b", 10, "biweekly"),
      mk("m", 10, "monthly"),
      mk("q", 30, "quarterly"),
      mk("a", 120, "annually"),
    ];
    mockFetch.mockResolvedValue(
      jsonResponse({
        success: true,
        data: {
          subscriptions: subs,
          recurringCharges: subs,
          recommendations: [],
          summary: {},
        },
      }),
    );

    render(<SubscriptionTrackerPage />);

    // Monthly Spend card (and Spending Trend) both render the normalized total.
    await waitFor(() => {
      expect(screen.getAllByText("$95.00").length).toBeGreaterThan(0);
    });
  });

  it("surfaces an error when a re-scan fails after a successful load", async () => {
    mockFetch
      .mockResolvedValueOnce(jsonResponse(apiResponse()))
      .mockRejectedValueOnce(new Error("scan network down"));

    render(<SubscriptionTrackerPage />);
    await waitFor(() => {
      expect(screen.getAllByText("Hooli Video").length).toBeGreaterThan(0);
    });

    fireEvent.click(
      screen.getByRole("button", { name: /detect subscriptions/i }),
    );

    await waitFor(() => {
      expect(
        screen.getByText(/Couldn't load your subscriptions/i),
      ).toBeInTheDocument();
    });
    expect(screen.getByText(/scan network down/i)).toBeInTheDocument();
  });

  it("prompts sign-in when the session is lost before a re-scan", async () => {
    mockGetSession
      .mockResolvedValueOnce({ data: { session: FAKE_SESSION }, error: null })
      .mockResolvedValueOnce({ data: { session: null }, error: null });
    mockFetch.mockResolvedValue(jsonResponse(apiResponse()));

    render(<SubscriptionTrackerPage />);
    await waitFor(() => {
      expect(screen.getAllByText("Hooli Video").length).toBeGreaterThan(0);
    });

    fireEvent.click(
      screen.getByRole("button", { name: /detect subscriptions/i }),
    );

    await waitFor(() => {
      expect(
        screen.getByText(/Sign in to scan for subscriptions/i),
      ).toBeInTheDocument();
    });
  });

  it("renders the empty state (no fabricated rows) when the API returns nothing", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({
        success: true,
        data: {
          subscriptions: [],
          recurringCharges: [],
          recommendations: [],
          summary: {},
        },
      }),
    );

    render(<SubscriptionTrackerPage />);

    await waitFor(() => {
      expect(screen.getByText("No subscriptions detected")).toBeInTheDocument();
    });
    // Honest empty state for the insights sidebar too.
    expect(
      screen.getByText(/No savings opportunities found/i),
    ).toBeInTheDocument();
    // An empty response is not an error.
    expect(
      screen.queryByText(/Couldn't load your subscriptions/i),
    ).not.toBeInTheDocument();
    // No mock fallback.
    expect(screen.queryByText("Netflix")).not.toBeInTheDocument();
    expect(screen.queryByText("Disney+")).not.toBeInTheDocument();
  });

  it("renders an honest error state (no fabricated rows) when the API responds not-ok", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ success: false, error: "boom" }, 500));

    render(<SubscriptionTrackerPage />);

    await waitFor(() => {
      expect(
        screen.getByText(/Couldn't load your subscriptions/i),
      ).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
    // Neither mock rows nor the empty state appear on error.
    expect(screen.queryByText("No subscriptions detected")).not.toBeInTheDocument();
    expect(screen.queryByText("Disney+")).not.toBeInTheDocument();
    expect(screen.queryByText("Adobe Creative Cloud")).not.toBeInTheDocument();
  });

  it("renders the error state when the fetch rejects (network failure)", async () => {
    mockFetch.mockRejectedValue(new Error("network down"));

    render(<SubscriptionTrackerPage />);

    await waitFor(() => {
      expect(
        screen.getByText(/Couldn't load your subscriptions/i),
      ).toBeInTheDocument();
    });
    expect(screen.queryByText("Disney+")).not.toBeInTheDocument();
  });

  it("shows a sign-in message and skips the fetch when there is no session", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });

    render(<SubscriptionTrackerPage />);

    await waitFor(() => {
      expect(
        screen.getByText(/Sign in to view your subscriptions/i),
      ).toBeInTheDocument();
    });
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
