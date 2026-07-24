/**
 * Dashboard Page — real-data wiring regression coverage.
 *
 * The page used to render four hardcoded mock objects (mockVitalityData,
 * mockSpendingData, mockPaydayData, mockSubscriptions) plus hardcoded metric
 * literals (credit 678, disputes 3/7, savings 18%, rules 5). It now fetches
 * real data behind a session guard (Bearer-authenticated) from four endpoints
 * and maps each widget to its real source:
 *   - /api/financial/dashboard             → spending overview + savings rate
 *   - /api/financial/income                → payday countdown
 *   - /api/financial/savings/subscriptions → subscriptions widget
 *   - /api/user/analytics                  → credit score + disputes
 * The hero Vitality widget has no real per-user source (its engine is not wired
 * to live data), so it is honestly empty-stated rather than fabricated.
 *
 * These tests assert real data renders per widget, honest loading/empty/error
 * states show, the former mock values never appear, and the mock arrays are
 * gone from source.
 */

import React from "react";
import fs from "fs";
import path from "path";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom";

const mockPush = jest.fn();
const mockGetSession = jest.fn();
const mockSignOut = jest.fn();

// Return a STABLE router object (Next's real useRouter is memoized). A fresh
// object per render would change the dashboard effect's dependency identity and
// re-run the data load on every render.
jest.mock("next/navigation", () => {
  const router = { push: (...args: unknown[]) => mockPush(...args) };
  return {
    useRouter: () => router,
    usePathname: () => "/dashboard",
  };
});

jest.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
      signOut: (...args: unknown[]) => mockSignOut(...args),
    },
  }),
}));

// The gamification hook fetches /api/gamification/progress on mount; stub it so
// the dashboard's own data fetches are the only ones under test. progress=null
// keeps the (already-real) gamification block unrendered.
jest.mock("@/hooks/useGamification", () => ({
  useGamification: () => ({
    progress: null,
    loading: false,
    error: null,
    triggerEvent: jest.fn(),
    checkIn: jest.fn(),
    refreshProgress: jest.fn(),
  }),
}));

// Scroll/stagger animation wrappers gate children on IntersectionObserver
// (absent in jsdom); render children directly so widget content is queryable.
jest.mock("@/components/ui/animations", () => ({
  FadeIn: ({ children }: { children: React.ReactNode }) => children,
  StaggerList: ({ children }: { children: React.ReactNode }) => children,
  ScrollReveal: ({ children }: { children: React.ReactNode }) => children,
}));

import DashboardPage from "../page";

// Fully reassign global.fetch so the mock bypasses MSW's fetch interceptor
// (same pattern as src/app/budgeting/bills/__tests__/page.test.tsx).
const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

const FAKE_SESSION = {
  access_token: "test-access-token",
  user: {
    id: "user-1",
    email: "user@example.com",
    user_metadata: { full_name: "Test User" },
  },
};

// A real Response (polyfilled in setupTests.ts) satisfies MSW's interceptor,
// which a hand-rolled plain object does not.
function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Route each fetch to a fresh Response by URL (fresh so a re-invoked effect
// never reads an already-consumed body).
function setRoutes(r: {
  dashboard: [unknown, number];
  income: [unknown, number];
  subscriptions: [unknown, number];
  analytics: [unknown, number];
}) {
  mockFetch.mockImplementation(async (input: unknown) => {
    const url =
      typeof input === "string" ? input : (input as { url: string }).url;
    if (url.includes("/api/financial/dashboard"))
      return jsonResponse(r.dashboard[0], r.dashboard[1]);
    if (url.includes("/api/financial/income"))
      return jsonResponse(r.income[0], r.income[1]);
    if (url.includes("/api/financial/savings/subscriptions"))
      return jsonResponse(r.subscriptions[0], r.subscriptions[1]);
    if (url.includes("/api/user/analytics"))
      return jsonResponse(r.analytics[0], r.analytics[1]);
    return jsonResponse({}, 404);
  });
}

// Extract url + Authorization from a recorded call regardless of whether the
// env passed (url, init) or a normalized Request.
function reqInfo(call: unknown[]): { url: string; auth: string | null } {
  const first = call[0];
  if (typeof first === "string") {
    const init = call[1] as { headers?: Record<string, string> } | undefined;
    const headers = init?.headers ?? {};
    return { url: first, auth: headers["Authorization"] ?? null };
  }
  const req = first as {
    url: string;
    headers: { get: (name: string) => string | null };
  };
  return { url: req.url, auth: req.headers.get("Authorization") };
}

const dashboardBody = {
  success: true,
  data: {
    netWorth: 0,
    totalAssets: 0,
    totalLiabilities: 0,
    monthlyIncome: 5000,
    monthlyExpenses: 1420,
    cashFlow: 1600,
    savingsRate: 32,
    accounts: [],
    recentTransactions: [],
    spendingByCategory: [
      {
        category: "Groceries",
        amount: 800,
        percentage: 56,
        transactionCount: 12,
      },
      {
        category: "Transport",
        amount: 620,
        percentage: 44,
        transactionCount: 8,
      },
    ],
    monthlyTrend: [
      { month: "Apr", income: 5000, expenses: 3000, savings: 2000 },
      { month: "May", income: 5000, expenses: 1420, savings: 3580 },
    ],
  },
};

const incomeBody = {
  sources: [],
  stats: {},
  countdown: {
    daysUntilPayday: 4,
    hoursUntilPayday: 96,
    nextPayDate: "2026-08-01T00:00:00.000Z",
    expectedAmount: 2500,
    sourceName: "Acme Payroll",
    sourceId: "src-1",
    percentComplete: 60,
  },
};

function recurringCharge(
  id: string,
  merchantName: string,
  category: string,
  amount: number,
) {
  return {
    id,
    merchantName,
    category,
    amount,
    frequency: "monthly",
    confidence: 90,
    transactionCount: 6,
    firstDetectedAt: "2026-01-01T00:00:00.000Z",
    lastChargeAt: "2026-07-01T00:00:00.000Z",
    variance: 0,
    isSubscription: true,
    cancellable: true,
    transactions: [],
  };
}

const subscriptionsBody = {
  success: true,
  data: {
    subscriptions: [
      recurringCharge("rc1", "Hulu Plus", "streaming", 12.99),
      recurringCharge("rc2", "Adobe CC", "software", 54.99),
    ],
  },
};

const analyticsBody = {
  creditHistory: [
    { date: "Jan", score: 690 },
    { date: "Feb", score: 705 },
  ],
  disputeStats: { total: 5, resolved: 2, pending: 3, successRate: 40 },
  scoreFactors: [],
  recommendations: [],
  timeRange: "6m",
};

function allRealRoutes() {
  setRoutes({
    dashboard: [dashboardBody, 200],
    income: [incomeBody, 200],
    subscriptions: [subscriptionsBody, 200],
    analytics: [analyticsBody, 200],
  });
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

describe("Dashboard Page — real-data wiring", () => {
  it("has no mock data arrays left in source", () => {
    const source = fs.readFileSync(
      path.join(__dirname, "..", "page.tsx"),
      "utf-8",
    );
    expect(source).not.toContain("mockVitalityData");
    expect(source).not.toContain("mockSpendingData");
    expect(source).not.toContain("mockPaydayData");
    expect(source).not.toContain("mockSubscriptions");
  });

  it("shows the loading state before the session resolves", async () => {
    allRealRoutes();
    render(<DashboardPage />);
    expect(
      screen.getByText(/Loading your AI credit dashboard/i),
    ).toBeInTheDocument();
    // Drain the async session + data load so pending work never leaks into a
    // later test.
    await waitFor(() => expect(screen.getByText("705")).toBeInTheDocument());
  });

  it("renders the welcome header and navigation when authenticated", async () => {
    allRealRoutes();
    render(<DashboardPage />);

    await waitFor(() =>
      expect(screen.getByText(/Welcome back/i)).toBeInTheDocument(),
    );
    expect(
      screen.getByText(/financial health dashboard/i),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Dashboard").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Credit Builder").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Marketplace").length).toBeGreaterThan(0);
    // Drain the data load.
    await waitFor(() => expect(screen.getByText("705")).toBeInTheDocument());
  });

  it("fetches all four real endpoints with a Bearer token", async () => {
    allRealRoutes();
    render(<DashboardPage />);

    await waitFor(() =>
      expect(mockFetch.mock.calls.length).toBeGreaterThanOrEqual(4),
    );

    const infos = mockFetch.mock.calls.map(reqInfo);
    const urls = infos.map((i) => i.url);
    expect(urls.some((u) => u.includes("/api/financial/dashboard"))).toBe(true);
    expect(urls.some((u) => u.includes("/api/financial/income"))).toBe(true);
    expect(
      urls.some((u) => u.includes("/api/financial/savings/subscriptions")),
    ).toBe(true);
    expect(urls.some((u) => u.includes("/api/user/analytics"))).toBe(true);

    // Every request carries the session Bearer token.
    for (const info of infos) {
      expect(info.auth).toBe("Bearer test-access-token");
    }

    // Drain the data load.
    await waitFor(() => expect(screen.getByText("705")).toBeInTheDocument());
  });

  it("renders real data per widget (and none of the removed mock values)", async () => {
    allRealRoutes();
    render(<DashboardPage />);

    // The four widgets load from four independent fetches — wait until one
    // signal from each source has rendered before asserting the rest.
    await waitFor(() => {
      expect(screen.getByText("Acme Payroll")).toBeInTheDocument(); // income
      expect(screen.getByText("$1,420")).toBeInTheDocument(); // dashboard
      expect(screen.getByText("2 subscriptions")).toBeInTheDocument(); // subs
      expect(screen.getByText("705")).toBeInTheDocument(); // analytics
    });

    // Payday ← /api/financial/income
    expect(screen.getByText("$2,500")).toBeInTheDocument();

    // Spending ← /api/financial/dashboard (top category renders in the summary
    // row and the legend, hence getAllByText).
    expect(screen.getAllByText("Groceries").length).toBeGreaterThan(0);

    // Savings rate ← /api/financial/dashboard
    expect(screen.getByText("32%")).toBeInTheDocument();

    // Subscriptions ← /api/financial/savings/subscriptions
    expect(screen.getByText("Hulu Plus")).toBeInTheDocument();
    expect(screen.getByText("Adobe CC")).toBeInTheDocument();

    // Credit + disputes ← /api/user/analytics
    expect(screen.getByText("+15 this period")).toBeInTheDocument();
    expect(screen.getByText("2 resolved")).toBeInTheDocument();

    // Vitality is honestly empty-stated (no fabricated score/percentile).
    expect(screen.getByText(/Set up your score/)).toBeInTheDocument();

    // Former mock values must never appear.
    expect(screen.queryByText("$2,847")).not.toBeInTheDocument();
    expect(screen.queryByText("Netflix")).not.toBeInTheDocument();
    expect(screen.queryByText("Spotify")).not.toBeInTheDocument();
    expect(screen.queryByText("Main Job")).not.toBeInTheDocument();
    expect(screen.queryByText("$3,200")).not.toBeInTheDocument();
    expect(screen.queryByText("678")).not.toBeInTheDocument();
    expect(screen.queryByText("18%")).not.toBeInTheDocument();
    expect(screen.queryByText("7 resolved")).not.toBeInTheDocument();
    expect(screen.queryByText("4 subscriptions")).not.toBeInTheDocument();
    expect(screen.queryByText("active rules")).not.toBeInTheDocument();
    expect(screen.queryByText(/better than 72%/)).not.toBeInTheDocument();
  });

  it("renders a negative credit change in red", async () => {
    setRoutes({
      dashboard: [dashboardBody, 200],
      income: [incomeBody, 200],
      subscriptions: [subscriptionsBody, 200],
      analytics: [
        {
          ...analyticsBody,
          creditHistory: [
            { date: "Jan", score: 720 },
            { date: "Feb", score: 700 },
          ],
        },
        200,
      ],
    });

    render(<DashboardPage />);

    await waitFor(() => expect(screen.getByText("700")).toBeInTheDocument());
    expect(screen.getByText("-20 this period")).toBeInTheDocument();
  });

  it("shows honest empty states when every source returns no data", async () => {
    setRoutes({
      dashboard: [
        {
          success: true,
          data: {
            netWorth: 0,
            totalAssets: 0,
            totalLiabilities: 0,
            monthlyIncome: 0,
            monthlyExpenses: 0,
            cashFlow: 0,
            savingsRate: 0,
            accounts: [],
            recentTransactions: [],
            spendingByCategory: [],
            monthlyTrend: [],
          },
        },
        200,
      ],
      income: [{ sources: [], stats: {}, countdown: null }, 200],
      subscriptions: [{ success: true, data: { subscriptions: [] } }, 200],
      analytics: [
        {
          creditHistory: [],
          disputeStats: { total: 0, resolved: 0, pending: 0, successRate: 0 },
          scoreFactors: [],
          recommendations: [],
          timeRange: "6m",
        },
        200,
      ],
    });

    render(<DashboardPage />);

    // Wait for one empty-state signal from each of the four sources.
    await waitFor(() => {
      // Payday with no income sources → the widget's own empty state.
      expect(screen.getByText("Track Your Payday")).toBeInTheDocument(); // income
      // Subscriptions empty → honest message, no fabricated rows.
      expect(
        screen.getByText("No recurring subscriptions detected yet."),
      ).toBeInTheDocument(); // subs
      // Credit with no history → honest "No score yet".
      expect(screen.getByText("No score yet")).toBeInTheDocument(); // analytics
      // Savings rate is a real 0% (dashboard returned zeros).
      expect(screen.getByText("0%")).toBeInTheDocument(); // dashboard
    });

    // Disputes zeroed honestly.
    expect(screen.getByText("0 resolved")).toBeInTheDocument();

    // No mock fallback anywhere.
    expect(screen.queryByText("Netflix")).not.toBeInTheDocument();
    expect(screen.queryByText("Main Job")).not.toBeInTheDocument();
    expect(screen.queryByText("678")).not.toBeInTheDocument();
  });

  it("shows honest per-widget error states when sources fail (no mock fallback)", async () => {
    setRoutes({
      dashboard: [{ error: "boom" }, 500],
      income: [{ error: "boom" }, 500],
      subscriptions: [{ error: "boom" }, 500],
      analytics: [{ error: "boom" }, 500],
    });

    render(<DashboardPage />);

    // All three widget error states resolve from independent fetches — wait for
    // all of them together.
    await waitFor(() => {
      expect(
        screen.getByText(/Couldn't load payday data/i),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Couldn't load spending data/i),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Couldn't load subscriptions/i),
      ).toBeInTheDocument();
    });

    // No fabricated numbers leak through on error.
    expect(screen.queryByText("678")).not.toBeInTheDocument();
    expect(screen.queryByText("18%")).not.toBeInTheDocument();
    expect(screen.queryByText("Netflix")).not.toBeInTheDocument();
  });

  it("redirects to login and skips all fetches when there is no session", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });

    render(<DashboardPage />);

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/auth/login"));
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
