/**
 * Recommendations — real-engine wiring regression coverage.
 *
 * The page had no fetch and a constant its own comment called "Mock Data",
 * rendered as personal findings: "Reduce your Chase card balance by $500",
 * "We found a late payment on your Experian report". Nobody has a Chase card
 * here and no report was read. "We found" claims an inspection happened, and
 * a reader could file a dispute over an entry nobody located.
 *
 * Behind it, unreachable: GET /api/ai/financial-coach/recommendations ->
 * recommendationEngine -> financialContextEngine, nine reads across budgets,
 * goals, alerts, insights, portfolios, bills and profiles.
 *
 * The assertions that matter: no score-point impact figure survives (the real
 * type carries money, not points), and a filter chip only exists for a type
 * the engine actually returned.
 *
 * ON MOCKING: MSW handler override, not `global.fetch`.
 */

import fs from "fs";
import path from "path";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { rest } from "msw";

import { server } from "@/__tests__/mocks/server";
import RecommendationsPage from "../page";

const RECS = "http://localhost/api/ai/financial-coach/recommendations";

function rec(over: Record<string, unknown> = {}) {
  return {
    id: "r-1",
    type: "debt_payoff",
    priority: "high",
    title: "Clear the highest-rate balance first",
    description: "Your highest-rate balance costs the most to carry.",
    rationale: "Derived from your recorded balances and rates.",
    potentialSavings: 340,
    riskLevel: "low",
    timeframe: "short_term",
    estimatedEffort: "moderate",
    actionSteps: [
      {
        id: "s-1",
        order: 1,
        title: "Review balances",
        description: "Check which carries the highest rate.",
        actionType: "link",
        actionUrl: "/financial",
        isCompleted: false,
      },
    ],
    confidenceScore: 80,
    personalizedFactors: ["your recorded debts"],
    ...over,
  };
}

function serve(recommendations: unknown[] = [rec()]) {
  server.use(
    rest.get(RECS, (_req, res, ctx) => res(ctx.json({ recommendations }))),
  );
}

afterEach(cleanup);

describe("Recommendations — from the real engine", () => {
  it("renders the returned recommendation", async () => {
    serve();

    render(<RecommendationsPage />);

    expect(
      await screen.findByText("Clear the highest-rate balance first"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Your highest-rate balance costs the most to carry."),
    ).toBeInTheDocument();
  });

  it("shows potential savings as money", async () => {
    serve();

    render(<RecommendationsPage />);

    expect(await screen.findByText("$340")).toBeInTheDocument();
    expect(screen.getByText("Could save")).toBeInTheDocument();
  });

  it("labels the type and timeframe readably", async () => {
    serve();

    render(<RecommendationsPage />);

    expect(await screen.findByText("Debt")).toBeInTheDocument();
    expect(screen.getByText("Short term")).toBeInTheDocument();
  });

  it("lists the action steps in order", async () => {
    serve([
      rec({
        actionSteps: [
          {
            id: "s-2",
            order: 2,
            title: "Second step",
            description: "",
            actionType: "manual",
            isCompleted: false,
          },
          {
            id: "s-1",
            order: 1,
            title: "First step",
            description: "",
            actionType: "manual",
            isCompleted: false,
          },
        ],
      }),
    ]);

    render(<RecommendationsPage />);

    const steps = await screen.findAllByRole("listitem");
    expect(steps[0]).toHaveTextContent("First step");
    expect(steps[1]).toHaveTextContent("Second step");
  });

  it("names what the recommendation was based on", async () => {
    serve();

    render(<RecommendationsPage />);

    expect(
      await screen.findByText(/Based on: your recorded debts/),
    ).toBeInTheDocument();
  });

  it("omits a money figure the engine did not provide", async () => {
    serve([rec({ potentialSavings: undefined, potentialReturn: undefined })]);

    render(<RecommendationsPage />);

    await screen.findByText("Clear the highest-rate balance first");
    expect(screen.queryByText("Could save")).not.toBeInTheDocument();
    expect(screen.queryByText("Could return")).not.toBeInTheDocument();
  });
});

describe("Recommendations — the filter reflects what came back", () => {
  it("shows no chips when everything is one type", async () => {
    // Distinct titles: two identical ones make findByText ambiguous, which
    // fails for a reason that has nothing to do with the filter.
    serve([rec(), rec({ id: "r-2", title: "Consolidate the smaller balances" })]);

    render(<RecommendationsPage />);

    await screen.findByText("Clear the highest-rate balance first");
    // A single-type filter is a control that can only ever do nothing.
    expect(screen.queryByRole("button", { name: "All" })).not.toBeInTheDocument();
  });

  it("filters to the chosen type", async () => {
    serve([
      rec(),
      rec({ id: "r-2", type: "savings_strategy", title: "Build a buffer" }),
    ]);

    render(<RecommendationsPage />);

    await screen.findByText("Build a buffer");
    await userEvent.click(screen.getByRole("button", { name: "Savings" }));

    expect(screen.getByText("Build a buffer")).toBeInTheDocument();
    expect(
      screen.queryByText("Clear the highest-rate balance first"),
    ).not.toBeInTheDocument();
  });
});

describe("Recommendations — nothing invented survives", () => {
  it("makes no claim about a card or a report nobody read", async () => {
    serve();

    render(<RecommendationsPage />);
    await screen.findByText("Clear the highest-rate balance first");

    expect(screen.queryByText(/Chase/)).not.toBeInTheDocument();
    expect(screen.queryByText(/We found a late payment/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Experian report/)).not.toBeInTheDocument();
  });

  it("predicts no score-point impact", async () => {
    serve();

    render(<RecommendationsPage />);
    await screen.findByText("Clear the highest-rate balance first");

    // The engine returns money, not points. "+25 points" had no source.
    expect(screen.queryByText(/\d+ points/)).not.toBeInTheDocument();
    expect(screen.queryByText("+25")).not.toBeInTheDocument();
    expect(screen.queryByText("+40")).not.toBeInTheDocument();
  });
});

describe("Recommendations — empty and failed states", () => {
  it("says there are none, and points at what would produce some", async () => {
    serve([]);

    render(<RecommendationsPage />);

    expect(
      await screen.findByText("No recommendations for you right now"),
    ).toBeInTheDocument();
    // Narrower than the topic: the page SUBTITLE also says "worked out from
    // your budgets, goals, bills", so matching that phrase matches twice.
    // Honest copy names the thing it is explaining, so the assertion has to be
    // more specific than the subject.
    expect(
      screen.getByText(/the more of those you have set up/i),
    ).toBeInTheDocument();
  });

  it("says recommendations are unavailable when the route fails", async () => {
    server.use(rest.get(RECS, (_req, res, ctx) => res(ctx.status(500))));

    render(<RecommendationsPage />);

    expect(
      await screen.findByText(/Recommendations are unavailable/i),
    ).toBeInTheDocument();
  });

  it("says the service is unreachable when the network drops", async () => {
    server.use(rest.get(RECS, (_req, res) => res.networkError("offline")));

    render(<RecommendationsPage />);

    expect(
      await screen.findByText(/could not reach the recommendations service/i),
    ).toBeInTheDocument();
  });
});

describe("Recommendations — the constant is gone", () => {
  const raw = fs.readFileSync(
    path.join(process.cwd(), "src/app/recommendations/page.tsx"),
    "utf8",
  );
  const source = raw
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

  it("no longer declares the RECOMMENDATIONS constant", () => {
    expect(source).not.toContain("const RECOMMENDATIONS");
  });

  it("names no institution and quotes no score impact", () => {
    for (const literal of ["Chase", "Experian", "impact:"]) {
      expect(source).not.toContain(literal);
    }
  });

  it("reads the live engine route", () => {
    expect(source).toContain("/api/ai/financial-coach/recommendations");
  });
});
