/**
 * Spending Dashboard Page — real-data wiring regression coverage.
 *
 * The page used to render five hardcoded mock arrays (MOCK_SPENDING_DATA,
 * MOCK_MONTHLY_TREND, MOCK_TOP_MERCHANTS, MOCK_BUDGET_COMPARISON,
 * MOCK_INSIGHTS). It now fetches real, per-user data behind a session guard
 * (Bearer-authenticated) from two endpoints and maps each section to its real
 * source:
 *   - /api/financial/dashboard  → category breakdown + monthly trend + totals
 *   - /api/financial/spending   → top merchants + insights + MoM change
 * Budget-vs-actual has no honest per-user source wired yet, so it is honestly
 * empty-stated rather than fabricated.
 *
 * These tests assert real data renders per section, honest loading / empty /
 * error / partial-failure states show, the former mock values never appear, and
 * the mock arrays are gone from source.
 */

import fs from "fs";
import path from "path";
import { render, screen, waitFor, cleanup, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";

const mockPush = jest.fn();
const mockGetSession = jest.fn();

// Stable router object (Next's real useRouter is memoized).
jest.mock("next/navigation", () => {
  const router = { push: (...args: unknown[]) => mockPush(...args) };
  return { useRouter: () => router };
});

jest.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { getSession: (...args: unknown[]) => mockGetSession(...args) },
  }),
}));

// Chart components are presentational; stub them so the test is deterministic
// and free of recharts/jsdom sizing concerns. The stubs echo the data they
// receive so the donutData / trendData derivations stay covered. formatCurrency
// is reproduced exactly (USD, 0 fraction digits) so currency assertions match.
jest.mock("@/components/charts/DonutChart", () => ({
  __esModule: true,
  default: ({
    data,
    centerValue,
  }: {
    data: Array<{ name: string; value: number }>;
    centerValue: string;
  }) => (
    <div data-testid="donut-chart">
      <span>{`center:${centerValue}`}</span>
      {data.map((d) => (
        <span key={d.name}>{`slice:${d.name}:${d.value}`}</span>
      ))}
    </div>
  ),
}));

jest.mock("@/components/charts", () => ({
  __esModule: true,
  formatCurrency: (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value),
  LineChartComponent: ({
    data,
  }: {
    data: Array<{ label: string; spending: number }>;
  }) => (
    <div data-testid="line-chart">
      {data.map((d) => (
        <span key={d.label}>{`trend:${d.label}:${d.spending}`}</span>
      ))}
    </div>
  ),
}));

import SpendingDashboardPage from "../page";

// Fully reassign global.fetch so the mock bypasses MSW's fetch interceptor
// (same pattern as src/app/dashboard/__tests__/page.test.tsx).
const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

const FAKE_SESSION = {
  access_token: "test-access-token",
  user: { id: "user-1", email: "user@example.com" },
};

// A real Response (polyfilled in setupTests.ts) satisfies MSW's interceptor,
// which a hand-rolled plain object does not.
function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Route each fetch to a FRESH Response by URL (fresh so a re-invoked effect
// never reads an already-consumed body).
function setRoutes(r: {
  dashboard: [unknown, number];
  spending: [unknown, number];
}) {
  mockFetch.mockImplementation(async (input: unknown) => {
    const url =
      typeof input === "string" ? input : (input as { url: string }).url;
    if (url.includes("/api/financial/dashboard"))
      return jsonResponse(r.dashboard[0], r.dashboard[1]);
    if (url.includes("/api/financial/spending"))
      return jsonResponse(r.spending[0], r.spending[1]);
    return jsonResponse({}, 404);
  });
}

// Extract url + Authorization from a recorded call regardless of arg shape.
function reqInfo(call: unknown[]): { url: string; auth: string | null } {
  const first = call[0];
  const init = call[1] as { headers?: Record<string, string> } | undefined;
  if (typeof first === "string") {
    return { url: first, auth: init?.headers?.["Authorization"] ?? null };
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
    monthlyExpenses: 1420,
    spendingByCategory: [
      { category: "Groceries", amount: 800, percentage: 56, transactionCount: 12 },
      { category: "Transport", amount: 620, percentage: 44, transactionCount: 8 },
    ],
    monthlyTrend: [
      { month: "Apr", income: 5000, expenses: 3000, savings: 2000 },
      { month: "May", income: 5000, expenses: 1420, savings: 3580 },
    ],
  },
};

const spendingBody = {
  success: true,
  data: {
    totalSpending: 1420,
    averageDaily: 47.33,
    topMerchants: [
      { merchant: "Trader Joes", amount: 342, transactionCount: 8 },
      { merchant: "Uber", amount: 118, transactionCount: 6 },
    ],
    comparisonToPreviousMonth: -12.5,
    insights: [
      "Your top spending category is Groceries at $800.00",
      "Great job! Your spending decreased by 12.5% compared to last month",
    ],
  },
};

function allRealRoutes() {
  setRoutes({ dashboard: [dashboardBody, 200], spending: [spendingBody, 200] });
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

describe("Spending Dashboard — real-data wiring", () => {
  it("has no mock data arrays left in source", () => {
    const source = fs.readFileSync(
      path.join(__dirname, "..", "page.tsx"),
      "utf-8",
    );
    expect(source).not.toContain("MOCK_SPENDING_DATA");
    expect(source).not.toContain("MOCK_MONTHLY_TREND");
    expect(source).not.toContain("MOCK_TOP_MERCHANTS");
    expect(source).not.toContain("MOCK_BUDGET_COMPARISON");
    expect(source).not.toContain("MOCK_INSIGHTS");
  });

  it("shows the loading skeleton before data resolves, then content", async () => {
    allRealRoutes();
    render(<SpendingDashboardPage />);

    // Loading skeleton: real section content not yet present.
    expect(
      screen.queryByText("Total Spent This Month"),
    ).not.toBeInTheDocument();

    await waitFor(() =>
      expect(screen.getByText("Total Spent This Month")).toBeInTheDocument(),
    );
  });

  it("redirects to login and skips all fetches when there is no session", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });

    render(<SpendingDashboardPage />);

    await waitFor(() =>
      expect(mockPush).toHaveBeenCalledWith("/auth/login"),
    );
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("fetches both real endpoints with a Bearer token", async () => {
    allRealRoutes();
    render(<SpendingDashboardPage />);

    await waitFor(() =>
      expect(mockFetch.mock.calls.length).toBeGreaterThanOrEqual(2),
    );

    const infos = mockFetch.mock.calls.map(reqInfo);
    const urls = infos.map((i) => i.url);
    expect(urls.some((u) => u.includes("/api/financial/dashboard"))).toBe(true);
    expect(urls.some((u) => u.includes("/api/financial/spending"))).toBe(true);

    for (const info of infos) {
      expect(info.auth).toBe("Bearer test-access-token");
    }
  });

  it("renders real data per section (and none of the removed mock values)", async () => {
    allRealRoutes();
    render(<SpendingDashboardPage />);

    await waitFor(() =>
      expect(screen.getByText("$1,420")).toBeInTheDocument(),
    );

    // Summary cards ← /api/financial/dashboard
    expect(screen.getByText("$1,420")).toBeInTheDocument(); // total (monthlyExpenses)
    expect(screen.getByText("$47")).toBeInTheDocument(); // daily average 1420/30
    expect(screen.getByText("20")).toBeInTheDocument(); // 12 + 8 transactions
    expect(screen.getByText("Across 2 categories")).toBeInTheDocument();

    // Month-over-month change ← /api/financial/spending (comparisonToPreviousMonth)
    expect(screen.getByText(/12\.5% from last month/)).toBeInTheDocument();

    // Donut chart received the real category slices + total center.
    expect(screen.getByText("center:$1,420")).toBeInTheDocument();
    expect(screen.getByText("slice:Groceries:800")).toBeInTheDocument();
    expect(screen.getByText("slice:Transport:620")).toBeInTheDocument();

    // Line chart received the real monthly expense trend.
    expect(screen.getByText("trend:Apr:3000")).toBeInTheDocument();
    expect(screen.getByText("trend:May:1420")).toBeInTheDocument();

    // Category table ← /api/financial/dashboard
    expect(screen.getAllByText("Groceries").length).toBeGreaterThan(0);
    expect(screen.getByText("$800")).toBeInTheDocument();
    expect(screen.getByText("$620")).toBeInTheDocument();
    expect(screen.getByText("56.3%")).toBeInTheDocument(); // 800/1420
    expect(screen.getByText("43.7%")).toBeInTheDocument(); // 620/1420

    // Top merchants ← /api/financial/spending
    expect(screen.getByText("Trader Joes")).toBeInTheDocument();
    expect(screen.getByText("Uber")).toBeInTheDocument();
    expect(screen.getByText("$342")).toBeInTheDocument();
    expect(screen.getByText("8 transactions")).toBeInTheDocument();

    // Insights ← /api/financial/spending (plain strings, no fabricated savings)
    expect(
      screen.getByText(/Your top spending category is Groceries/),
    ).toBeInTheDocument();

    // Budget-vs-actual is honestly empty-stated (no fabricated comparison).
    expect(screen.getByText(/Set up category budgets/)).toBeInTheDocument();

    // Former mock values must never appear.
    expect(screen.queryByText("Housing")).not.toBeInTheDocument();
    expect(screen.queryByText("Whole Foods")).not.toBeInTheDocument();
    expect(screen.queryByText("Netflix")).not.toBeInTheDocument();
    expect(screen.queryByText("$1,850")).not.toBeInTheDocument();
    expect(screen.queryByText("Food spending up 12%")).not.toBeInTheDocument();
    expect(screen.queryByText("Potential savings: $80/month")).not.toBeInTheDocument();
  });

  it("renders a positive month-over-month change (spending increased)", async () => {
    setRoutes({
      dashboard: [dashboardBody, 200],
      spending: [
        { ...spendingBody, data: { ...spendingBody.data, comparisonToPreviousMonth: 8.4 } },
        200,
      ],
    });

    render(<SpendingDashboardPage />);

    await waitFor(() =>
      expect(screen.getByText(/8\.4% from last month/)).toBeInTheDocument(),
    );
  });

  it("shows honest empty states when there is no spending data", async () => {
    setRoutes({
      dashboard: [
        {
          success: true,
          data: {
            monthlyExpenses: 0,
            spendingByCategory: [],
            monthlyTrend: [],
          },
        },
        200,
      ],
      spending: [
        {
          success: true,
          data: {
            totalSpending: 0,
            averageDaily: 0,
            topMerchants: [],
            comparisonToPreviousMonth: 0,
            insights: [],
          },
        },
        200,
      ],
    });

    render(<SpendingDashboardPage />);

    await waitFor(() =>
      expect(screen.getByText("Across 0 categories")).toBeInTheDocument(),
    );

    expect(
      screen.getByText(/Connect an account to see your category breakdown/),
    ).toBeInTheDocument();
    expect(screen.getByText("No trend data yet.")).toBeInTheDocument();
    expect(screen.getByText("No merchant activity yet.")).toBeInTheDocument();
    expect(
      screen.getByText(/Insights appear as we analyze your spending/),
    ).toBeInTheDocument();
    expect(screen.getByText("No spending data yet.")).toBeInTheDocument(); // table row

    // No mock fallback leaked through.
    expect(screen.queryByText("Netflix")).not.toBeInTheDocument();
    expect(screen.queryByText("Housing")).not.toBeInTheDocument();
  });

  it("renders category data but empty merchants/insights when the spending API fails (no mock fallback)", async () => {
    setRoutes({
      dashboard: [dashboardBody, 200],
      spending: [{ error: "boom" }, 500],
    });

    render(<SpendingDashboardPage />);

    // Primary (dashboard) data still renders.
    await waitFor(() =>
      expect(screen.getByText("slice:Groceries:800")).toBeInTheDocument(),
    );
    expect(screen.getByText("$1,420")).toBeInTheDocument();

    // Secondary (spending) sections fall back to honest empty states, not mocks.
    expect(screen.getByText("No merchant activity yet.")).toBeInTheDocument();
    expect(
      screen.getByText(/Insights appear as we analyze your spending/),
    ).toBeInTheDocument();
    // MoM change defaults to 0.0% (no fabricated delta).
    expect(screen.getByText(/0\.0% from last month/)).toBeInTheDocument();

    expect(screen.queryByText("Trader Joes")).not.toBeInTheDocument();
  });

  it("shows an honest error state when the dashboard API fails, and recovers on retry", async () => {
    setRoutes({
      dashboard: [{ error: "boom" }, 500],
      spending: [spendingBody, 200],
    });

    render(<SpendingDashboardPage />);

    await waitFor(() =>
      expect(screen.getByText("Unable to load spending")).toBeInTheDocument(),
    );
    expect(screen.getByText("Try Again")).toBeInTheDocument();
    // No fabricated numbers on error.
    expect(screen.queryByText("$1,850")).not.toBeInTheDocument();

    // Retry with healthy responses recovers to real data.
    allRealRoutes();
    fireEvent.click(screen.getByText("Try Again"));

    await waitFor(() =>
      expect(screen.getByText("$1,420")).toBeInTheDocument(),
    );
  });

  it("redirects to login if the session is gone at retry time", async () => {
    setRoutes({
      dashboard: [{ error: "boom" }, 500],
      spending: [spendingBody, 200],
    });

    render(<SpendingDashboardPage />);

    await waitFor(() =>
      expect(screen.getByText("Try Again")).toBeInTheDocument(),
    );

    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
    fireEvent.click(screen.getByText("Try Again"));

    await waitFor(() =>
      expect(mockPush).toHaveBeenCalledWith("/auth/login"),
    );
  });
});
