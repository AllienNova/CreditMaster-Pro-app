/**
 * Auto-Save Rules Page — real-data wiring regression coverage.
 *
 * The page used to render hardcoded MOCK_RULES / MOCK_SUMMARY arrays
 * (Round-Up Savings, Paycheck Split, Weekly Transfer, Monthly Surplus Sweep,
 * a $5,097.32 all-time total, "+12% vs last month") via local useState. It now
 * fetches real data from GET /api/financial/savings?type=all (withAuth,
 * Bearer-authenticated) and maps `data.rules` + `data.summary` to the page's
 * view models. These tests assert real rules + summary render, descriptions are
 * derived from the real rule config, honest empty/error/sign-in states show,
 * the former MOCK_* rows never appear, and the mock arrays are gone from source.
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

import AutoSavePage from "../page";

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

// API-shaped savings rules (dates are ISO strings, as they arrive over JSON).
function apiRules() {
  const lastMonth = new Date(Date.now() - 30 * DAY_MS).toISOString();
  return [
    {
      id: "rule-1",
      userId: "user-1",
      name: "Emergency Round-Up",
      type: "round_up",
      frequency: "per_transaction",
      status: "active",
      config: { roundUpTo: 1, roundUpMultiplier: 2 },
      totalSaved: 320.5,
      transferCount: 88,
      lastTriggeredAt: lastMonth,
      createdAt: lastMonth,
      updatedAt: lastMonth,
    },
    {
      id: "rule-2",
      userId: "user-1",
      name: "Vacation Fund Boost",
      type: "fixed",
      frequency: "monthly",
      status: "paused",
      config: { fixedAmount: 100 },
      totalSaved: 600,
      transferCount: 6,
      // no lastTriggeredAt → exercises the optional-date path (never triggered).
      createdAt: lastMonth,
      updatedAt: lastMonth,
    },
  ];
}

function apiSummary() {
  return {
    totalSaved: 920.5,
    totalSavedThisMonth: 150.25,
    totalSavedThisYear: 920.5,
    savingsRate: 0,
    activeRules: 1,
    activeGoals: 0,
    goalsOnTrack: 0,
    goalsAtRisk: 0,
    projectedMonthlySavings: 175,
    roundUpSavings: 320.5,
    autoSaveSavings: 600,
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

describe("Auto-Save Rules Page — real /api/financial/savings wiring", () => {
  it("has no MOCK_RULES / MOCK_SUMMARY array left in source", () => {
    const source = fs.readFileSync(
      path.join(__dirname, "..", "page.tsx"),
      "utf-8",
    );
    expect(source).not.toContain("MOCK_RULES");
    expect(source).not.toContain("MOCK_SUMMARY");
  });

  it("fetches the savings endpoint (type=all) with a Bearer token", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({ success: true, data: { rules: apiRules(), summary: apiSummary() } }),
    );

    render(<AutoSavePage />);

    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
    // The test env's fetch interceptor normalizes fetch(url, init) into a single
    // Request object, so inspect that rather than positional (url, init) args.
    const req = mockFetch.mock.calls[0][0] as {
      url: string;
      headers: { get: (name: string) => string | null };
    };
    expect(req.url).toContain("/api/financial/savings?type=all");
    expect(req.headers.get("Authorization")).toBe("Bearer test-access-token");
  });

  it("renders real rules + summary (and none of the removed MOCK_* rows)", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({ success: true, data: { rules: apiRules(), summary: apiSummary() } }),
    );

    render(<AutoSavePage />);

    // Real rule names render.
    await waitFor(() => {
      expect(screen.getByText("Emergency Round-Up")).toBeInTheDocument();
    });
    expect(screen.getByText("Vacation Fund Boost")).toBeInTheDocument();

    // Descriptions are derived from the real rule config, not hardcoded.
    expect(
      screen.getByText(/Round up to the nearest \$1 \(2× multiplier\)/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Transfer \$100\.00 monthly/)).toBeInTheDocument();

    // The paused rule shows its real status.
    expect(screen.getByText("Paused")).toBeInTheDocument();

    // Real summary aggregates render (all-time total, active/total, projected,
    // this-month), sourced from the server summary + real rule count.
    expect(screen.getByText("$920.50")).toBeInTheDocument(); // totalSaved (all time)
    expect(screen.getByText("1/2")).toBeInTheDocument(); // activeRules / totalRules
    expect(screen.getByText("$175.00")).toBeInTheDocument(); // projectedMonthlySavings
    expect(screen.getByText("$150.25")).toBeInTheDocument(); // totalSavedThisMonth

    // The empty state must not show when real rules exist.
    expect(screen.queryByText("No auto-save rules yet")).not.toBeInTheDocument();

    // The removed hardcoded mock rows / stats must never appear.
    expect(screen.queryByText("Weekly Transfer")).not.toBeInTheDocument();
    expect(screen.queryByText("Monthly Surplus Sweep")).not.toBeInTheDocument();
    expect(screen.queryByText("$5,097.32")).not.toBeInTheDocument();
    expect(screen.queryByText(/\+12% vs last month/)).not.toBeInTheDocument();
  });

  it("derives an honest description for every rule type from real config", async () => {
    const now = new Date().toISOString();
    const base = {
      userId: "user-1",
      status: "active",
      frequency: "monthly",
      totalSaved: 0,
      transferCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    const rules = [
      { ...base, id: "r-ru", name: "RU Full", type: "round_up", config: { roundUpTo: 5, roundUpMultiplier: 1 } },
      { ...base, id: "r-ru2", name: "RU Bare", type: "round_up", config: {} },
      { ...base, id: "r-pi", name: "Pct Income", type: "percentage", config: { percentageOfIncome: 10 } },
      { ...base, id: "r-pt", name: "Pct Txn", type: "percentage", config: { percentageOfTransaction: 5 } },
      { ...base, id: "r-pb", name: "Pct Bare", type: "percentage", config: {} },
      { ...base, id: "r-fx", name: "Fixed Bare", type: "fixed", config: {} },
      { ...base, id: "r-su", name: "Surplus Full", type: "surplus", config: { surplusPercentage: 50, surplusThreshold: 1000 } },
      { ...base, id: "r-sb", name: "Surplus Bare", type: "surplus", config: {} },
      { ...base, id: "r-gb", name: "Goal Full", type: "goal_based", config: { targetAmount: 5000 } },
      { ...base, id: "r-gz", name: "Goal Bare", type: "goal_based", config: {} },
      // Unexpected type → defensive fallback (icon/color/description defaults).
      { ...base, id: "r-x", name: "Unknown Type", type: "mystery", config: {} },
    ];

    mockFetch.mockResolvedValue(
      jsonResponse({ success: true, data: { rules, summary: apiSummary() } }),
    );

    render(<AutoSavePage />);

    await waitFor(() => {
      expect(screen.getByText("Round up to the nearest $5")).toBeInTheDocument();
    });
    expect(
      screen.getByText("Round up purchases and save the difference"),
    ).toBeInTheDocument();
    expect(screen.getByText("Save 10% of income")).toBeInTheDocument();
    expect(
      screen.getByText("Save 5% of every transaction"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Save a percentage automatically"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Transfer a fixed amount on a schedule"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Sweep 50% of your balance over \$1,000\.00/),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Sweep surplus balance into savings"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Contribute toward your \$5,000\.00 goal/),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Contribute toward a savings goal"),
    ).toBeInTheDocument();
    expect(screen.getByText("Automated savings rule")).toBeInTheDocument();
  });

  it("optimistically flips a rule's status when its pause button is clicked", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({ success: true, data: { rules: apiRules(), summary: apiSummary() } }),
    );

    render(<AutoSavePage />);

    // rule-1 is active → its control reads "Pause rule"; rule-2 is already paused.
    await waitFor(() => {
      expect(screen.getByTitle("Pause rule")).toBeInTheDocument();
    });
    expect(screen.getAllByText("Paused")).toHaveLength(1);

    fireEvent.click(screen.getByTitle("Pause rule"));

    // Both rules now read "Paused"; both controls become "Resume rule".
    await waitFor(() => {
      expect(screen.getAllByText("Paused")).toHaveLength(2);
    });
    expect(screen.getAllByTitle("Resume rule")).toHaveLength(2);
    expect(screen.queryByTitle("Pause rule")).not.toBeInTheDocument();
  });

  it("computes the summary from the rules when the API omits it", async () => {
    // No `summary` key → the page falls back to values derived from the rules.
    mockFetch.mockResolvedValue(
      jsonResponse({ success: true, data: { rules: apiRules() } }),
    );

    render(<AutoSavePage />);

    await waitFor(() => {
      expect(screen.getByText("Emergency Round-Up")).toBeInTheDocument();
    });
    // activeRules (1 active of 2) / totalRules (2), from the real rule list.
    expect(screen.getByText("1/2")).toBeInTheDocument();
    // totalSavedAllTime = sum of rule.totalSaved (320.50 + 600.00).
    expect(screen.getByText("$920.50")).toBeInTheDocument();
    // Not an error or empty state.
    expect(
      screen.queryByText(/Couldn't load your auto-save rules/i),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("No auto-save rules yet")).not.toBeInTheDocument();
  });

  it("renders the empty state (no fabricated rows) when the API returns no rules", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({
        success: true,
        data: {
          rules: [],
          summary: { ...apiSummary(), totalSaved: 0, activeRules: 0, totalSavedThisMonth: 0, projectedMonthlySavings: 0 },
        },
      }),
    );

    render(<AutoSavePage />);

    await waitFor(() => {
      expect(screen.getByText("No auto-save rules yet")).toBeInTheDocument();
    });
    // An empty response is not an error.
    expect(
      screen.queryByText(/Couldn't load your auto-save rules/i),
    ).not.toBeInTheDocument();
    // No mock fallback.
    expect(screen.queryByText("Weekly Transfer")).not.toBeInTheDocument();
    expect(screen.queryByText("Monthly Surplus Sweep")).not.toBeInTheDocument();
  });

  it("renders an honest error state (no fabricated rows) when the API responds not-ok", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ error: "boom" }, 500));

    render(<AutoSavePage />);

    await waitFor(() => {
      expect(
        screen.getByText(/Couldn't load your auto-save rules/i),
      ).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
    // Neither mock rows nor the empty state appear on error.
    expect(screen.queryByText("No auto-save rules yet")).not.toBeInTheDocument();
    expect(screen.queryByText("Weekly Transfer")).not.toBeInTheDocument();
    expect(screen.queryByText("Monthly Surplus Sweep")).not.toBeInTheDocument();
  });

  it("renders the error state when the fetch rejects (network failure)", async () => {
    mockFetch.mockRejectedValue(new Error("network down"));

    render(<AutoSavePage />);

    await waitFor(() => {
      expect(
        screen.getByText(/Couldn't load your auto-save rules/i),
      ).toBeInTheDocument();
    });
    expect(screen.queryByText("Weekly Transfer")).not.toBeInTheDocument();
  });

  it("shows a sign-in message and skips the fetch when there is no session", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });

    render(<AutoSavePage />);

    await waitFor(() => {
      expect(
        screen.getByText(/Sign in to view your auto-save rules/i),
      ).toBeInTheDocument();
    });
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
