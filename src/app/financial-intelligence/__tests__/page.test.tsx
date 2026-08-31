/**
 * Financial Intelligence Hub — real-data wiring regression coverage.
 *
 * WHAT THESE TESTS LOCK.
 *
 * The page fetched three real routes and, on any failure or missing field,
 * silently substituted MOCK_SNAPSHOT — a $124,350 net worth, $28,400 of debt,
 * an $8,500 monthly income and a "B+" health grade — with nothing marking a
 * single digit as invented.
 *
 * The fallback was not the rare path; it was the ONLY path. /api/financial/
 * context answers `{ success, data: context }` and the old code read
 * `data.netWorth` off the TOP level of that envelope, where it is always
 * undefined. Every `??` fell through on every request, so every user who ever
 * opened this screen saw the same invented $124,350.
 *
 * So these assert three things a passing type-check cannot:
 *   1. Figures render from the route's ACTUAL envelope (json.data.snapshot) —
 *      these would have failed against the old top-level read.
 *   2. A failed or empty snapshot call produces an explicit unavailable state
 *      and NO figures — not a plausible-looking substitute.
 *   3. The old mock values are gone from source and never reach the screen.
 *
 * ON MOCKING. Requests are stubbed by overriding MSW handlers, not by
 * reassigning `global.fetch`. `server.listen()` runs in a beforeAll that fires
 * AFTER this module is evaluated, so a module-level `global.fetch = jest.fn()`
 * is overwritten and answers nothing — the trap already documented in
 * `src/app/credit/factors/__tests__/page.test.tsx:121`.
 */

import fs from "fs";
import path from "path";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { rest } from "msw";

import { server } from "@/__tests__/mocks/server";
import FinancialIntelligencePage from "../page";

const AGGREGATED = "http://localhost/api/financial/aggregated";
const BUDGETS = "http://localhost/api/financial/budgets/analyze";
const AI_INSIGHTS = "http://localhost/api/financial/ai-insights";

/** A real FinancialSnapshot as /api/financial/aggregated?snapshot=true returns it. */
function apiSnapshot() {
  return {
    date: "2026-08-18",
    netWorth: 41_275,
    totalAssets: 58_000,
    totalLiabilities: 16_725,
    totalDebt: 16_725,
    totalSavings: 9_000,
    totalInvestments: 12_000,
    monthlyIncome: 6_240,
    monthlyExpenses: 4_010,
    monthlyCashFlow: 2_230,
    debtToIncomeRatio: 0.22,
    savingsRate: 35.7,
    healthScore: 83,
    budgetUtilization: 0.61,
    budgetsOnTrack: 3,
    budgetsOverBudget: 1,
    goalsProgress: 0.4,
    activeGoalsCount: 2,
    investmentReturn: 0.07,
    portfolioValue: 12_000,
  };
}

const AI_BODY = {
  success: true,
  data: {
    insights: [
      {
        id: "i-1",
        type: "recommendation",
        title: "Move idle cash to savings",
        description: "Your checking balance has exceeded one month of expenses.",
        confidence: 0.81,
        actionable: true,
      },
    ],
    predictions: [],
    healthScore: 83,
    healthTrend: "up",
    topRecommendation: "Move idle cash to savings",
  },
};

const NO_BUDGET_BODY = {
  success: true,
  hasBudget: false,
  data: null,
  message: "No active budget yet. Create one to see analysis.",
};

type Responder = Parameters<typeof rest.get>[1];

const ok =
  (body: unknown): Responder =>
  (_req, res, ctx) =>
    res(ctx.json(body as Record<string, unknown>));

/**
 * Installs a handler per route. Each defaults to the healthy answer, so a test
 * overrides only the one whose behaviour it is about.
 */
function serveRoutes(
  overrides: {
    aggregated?: Responder;
    budgets?: Responder;
    insights?: Responder;
  } = {},
) {
  server.use(
    rest.get(
      AGGREGATED,
      overrides.aggregated ??
        ok({ success: true, data: { snapshot: apiSnapshot() } }),
    ),
    rest.get(BUDGETS, overrides.budgets ?? ok(NO_BUDGET_BODY)),
    rest.get(AI_INSIGHTS, overrides.insights ?? ok(AI_BODY)),
  );
}

/** Every figure the removed MOCK_SNAPSHOT used to display. */
const MOCK_VALUES = ["$124.4K", "$124,350", "$28,400", "$8,500", "38.8%", "B+"];

afterEach(cleanup);

describe("Financial Intelligence — real data", () => {
  it("renders figures read from the aggregated route's data.snapshot envelope", async () => {
    serveRoutes();

    render(<FinancialIntelligencePage />);

    // Compact notation: 41_275 -> $41.3K. Its exact value rides in `title`.
    expect(await screen.findByText("$41.3K")).toBeInTheDocument();
    expect(screen.getByText("$16.7K")).toBeInTheDocument();
    expect(screen.getByText("35.7%")).toBeInTheDocument();
  });

  it("grades 83 as B, using the calculator's bands and no '+' grades", async () => {
    serveRoutes();

    render(<FinancialIntelligencePage />);

    expect(await screen.findByText("B")).toBeInTheDocument();
    expect(screen.queryByText("B+")).not.toBeInTheDocument();
  });

  it("renders insights returned by the ai-insights route", async () => {
    serveRoutes();

    render(<FinancialIntelligencePage />);

    expect(
      await screen.findByText("Move idle cash to savings"),
    ).toBeInTheDocument();
  });

  it("shows the budget route's own words when the user has no budget", async () => {
    serveRoutes();

    render(<FinancialIntelligencePage />);

    expect(await screen.findByText(/No active budget yet/i)).toBeInTheDocument();
  });

  it("renders a real budget from the BudgetAnalysis envelope", async () => {
    // THIS IS THE TEST THAT WAS MISSING. The route returns a BudgetAnalysis —
    // totals under `summary`, rows under `categoryAnalysis` — and the page
    // assigned it straight into its flatter BudgetSummary state. `json()` is
    // `any`, so nothing failed to compile; instead every user who ACTUALLY had
    // a budget hit `budget.topCategories.map` on undefined and crashed. Users
    // with no budget were the ones spared, because they got MOCK_BUDGET.
    serveRoutes({
      budgets: ok({
        success: true,
        data: {
          userId: "user-1",
          period: "monthly",
          periodStart: new Date(Date.now() - 20 * 86_400_000).toISOString(),
          periodEnd: new Date(Date.now() + 9 * 86_400_000).toISOString(),
          summary: {
            totalBudgeted: 4_500,
            totalSpent: 3_150,
            totalRemaining: 1_350,
            percentUsed: 70,
            variance: 1_350,
            variancePercent: 30,
          },
          categoryAnalysis: [
            {
              category: "groceries",
              budgeted: 800,
              spent: 610,
              remaining: 190,
              percentUsed: 76.25,
              variance: 190,
              variancePercent: 23.75,
              status: "on_track",
              transactionCount: 22,
              averageTransactionAmount: 27.7,
            },
          ],
          trends: {
            spendingTrend: "stable",
            topOverspentCategories: [],
            topUnderspentCategories: [],
            anomalies: [],
          },
          recommendations: [],
        },
      }),
    });

    render(<FinancialIntelligencePage />);

    expect(await screen.findByText("$4,500")).toBeInTheDocument();
    expect(screen.getByText("$3,150")).toBeInTheDocument();
    expect(screen.getByText("groceries")).toBeInTheDocument();
    // periodEnd is 9 days out, so the countdown must be derived, not invented.
    expect(screen.getByText(/9 days/i)).toBeInTheDocument();
  });

  it("says insights are degraded rather than hiding it", async () => {
    serveRoutes({
      insights: ok({
        degraded: true,
        success: true,
        data: {
          insights: [],
          predictions: [],
          healthScore: 0,
          healthTrend: "stable",
        },
      }),
    });

    render(<FinancialIntelligencePage />);

    expect(await screen.findByText(/reduced mode/i)).toBeInTheDocument();
  });
});

describe("Financial Intelligence — grade bands", () => {
  // The bands mirror HealthScoreCalculatorV2.getGrade. Boundary values are the
  // point: 80 is a B and 79 is a C, and an off-by-one here silently misgrades
  // every user in the band.
  it.each([
    [95, "A"],
    [80, "B"],
    [79, "C"],
    [60, "D"],
    [41, "F"],
  ])("grades a score of %i as %s", async (score, grade) => {
    serveRoutes({
      insights: ok({
        success: true,
        data: { ...AI_BODY.data, healthScore: score },
      }),
    });

    render(<FinancialIntelligencePage />);

    expect(await screen.findByText(grade as string)).toBeInTheDocument();
  });
});

describe("Financial Intelligence — failure states invent nothing", () => {
  it("shows an unavailable message and no figures when the snapshot call fails", async () => {
    serveRoutes({
      aggregated: (_req, res, ctx) =>
        res(ctx.status(500), ctx.json({ error: "boom" })),
    });

    render(<FinancialIntelligencePage />);

    expect(
      await screen.findByText(/Your financial snapshot is unavailable/i),
    ).toBeInTheDocument();

    for (const value of MOCK_VALUES) {
      expect(screen.queryByText(value)).not.toBeInTheDocument();
    }
  });

  it("invents nothing when the snapshot is missing from an otherwise-OK body", async () => {
    // The exact shape the old code mishandled: a 200 whose payload simply does
    // not carry the fields the page wants. That used to be answered with
    // MOCK_SNAPSHOT; it must now be answered with the unavailable state.
    serveRoutes({ aggregated: ok({ success: true, data: { context: {} } }) });

    render(<FinancialIntelligencePage />);

    expect(
      await screen.findByText(/Your financial snapshot is unavailable/i),
    ).toBeInTheDocument();
    expect(screen.queryByText("$124.4K")).not.toBeInTheDocument();
  });

  it("invents nothing when the network drops", async () => {
    serveRoutes({
      aggregated: (_req, res) => res.networkError("offline"),
      budgets: (_req, res) => res.networkError("offline"),
      insights: (_req, res) => res.networkError("offline"),
    });

    render(<FinancialIntelligencePage />);

    await waitFor(() =>
      expect(
        screen.getByText(/Your financial snapshot is unavailable/i),
      ).toBeInTheDocument(),
    );

    for (const value of MOCK_VALUES) {
      expect(screen.queryByText(value)).not.toBeInTheDocument();
    }
  });

  it("treats an unparseable body as no data, not as zero", async () => {
    serveRoutes({
      aggregated: (_req, res, ctx) =>
        res(
          ctx.status(200),
          ctx.set("Content-Type", "application/json"),
          ctx.body("<html>gateway</html>"),
        ),
    });

    render(<FinancialIntelligencePage />);

    expect(
      await screen.findByText(/Your financial snapshot is unavailable/i),
    ).toBeInTheDocument();
  });
});

describe("Financial Intelligence — refresh", () => {
  it("re-reads the routes and picks up changed figures", async () => {
    serveRoutes();
    render(<FinancialIntelligencePage />);
    expect(await screen.findByText("$41.3K")).toBeInTheDocument();

    serveRoutes({
      aggregated: ok({
        success: true,
        data: { snapshot: { ...apiSnapshot(), netWorth: 52_800 } },
      }),
    });
    await userEvent.click(screen.getByRole("button", { name: /refresh/i }));

    expect(await screen.findByText("$52.8K")).toBeInTheDocument();
  });
});

describe("Financial Intelligence — source no longer holds the mocks", () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "src/app/financial-intelligence/page.tsx"),
    "utf8",
  );

  it("declares no MOCK_ constants", () => {
    // Matches a declaration only, so the comment recording what was removed
    // does not resurrect the failure.
    expect(source).not.toMatch(/const\s+MOCK_[A-Z_]+\s*[:=]/);
  });

  it("no longer contains the invented figures", () => {
    for (const literal of ["124_350", "28_400", "8_500", "38.8"]) {
      expect(source).not.toContain(literal);
    }
  });

  it("reads the aggregated and ai-insights routes", () => {
    expect(source).toContain("/api/financial/aggregated?snapshot=true");
    expect(source).toContain("/api/financial/ai-insights");
  });
});
