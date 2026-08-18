/**
 * Insights — real-engine wiring regression coverage.
 *
 * The page had no fetch. Its constant, labelled "Mock Data" in the file,
 * rendered as measurements of the reader: utilization "increased from 22% to
 * 31% over the last 60 days" at 94% confidence, dining spend "increased 45%",
 * an emergency fund covering "1.8 months", a score "improved 35 points". Each
 * a number nobody computed, about accounts nobody read, carrying a made-up
 * certainty about itself.
 *
 * GET /api/financial/insights?stored=true was there all along, backed by
 * SmartInsightsEngine (six table reads, no Math.random) whose FinancialInsight
 * carries a real `confidence` and a `dataSource` naming its inputs.
 *
 * The dismiss test matters most of the interactive ones: the card may only
 * disappear after the server confirms, or the reader is shown a dismissal that
 * did not happen.
 *
 * ON MOCKING: MSW handler override, not `global.fetch`.
 */

import fs from "fs";
import path from "path";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { rest } from "msw";

import { server } from "@/__tests__/mocks/server";
import InsightsPage from "../page";

const INSIGHTS = "http://localhost/api/financial/insights";

function insight(over: Record<string, unknown> = {}) {
  return {
    id: "i-1",
    type: "spending_anomaly",
    category: "spending",
    priority: "high",
    title: "Groceries rose against your own average",
    description: "Grocery spend is above your recorded three-month average.",
    details: "Computed from your categorised transactions.",
    amount: 210,
    percentage: 18,
    trend: "up",
    actions: [
      { id: "a-1", label: "See spending", type: "link", href: "/financial" },
    ],
    dismissed: false,
    confidence: 72,
    dataSource: ["transactions", "budgets"],
    ...over,
  };
}

function serve(data: unknown[] = [insight()]) {
  server.use(
    rest.get(INSIGHTS, (_req, res, ctx) => res(ctx.json({ success: true, data }))),
  );
}

afterEach(cleanup);

describe("Insights — from the real engine", () => {
  it("renders the returned insight", async () => {
    serve();

    render(<InsightsPage />);

    expect(
      await screen.findByText("Groceries rose against your own average"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Grocery spend is above your recorded three-month average."),
    ).toBeInTheDocument();
  });

  it("shows the engine's own confidence", async () => {
    serve();

    render(<InsightsPage />);

    expect(await screen.findByText("72% confidence")).toBeInTheDocument();
  });

  it("names what the insight was computed from", async () => {
    serve();

    render(<InsightsPage />);

    expect(
      await screen.findByText(/Worked out from: transactions, budgets/),
    ).toBeInTheDocument();
  });

  it("shows amount, percentage and trend when present", async () => {
    serve();

    render(<InsightsPage />);

    expect(await screen.findByText("$210")).toBeInTheDocument();
    expect(screen.getByText(/18% trending up/)).toBeInTheDocument();
  });

  it("requests stored insights, not a fresh model run", async () => {
    let search = "";
    server.use(
      rest.get(INSIGHTS, (req, res, ctx) => {
        search = req.url.search;
        return res(ctx.json({ success: true, data: [insight()] }));
      }),
    );

    render(<InsightsPage />);
    await screen.findByText("Groceries rose against your own average");

    expect(search).toContain("stored=true");
  });

  it("renders a link action the insight carries", async () => {
    serve();

    render(<InsightsPage />);

    expect(
      await screen.findByRole("link", { name: "See spending" }),
    ).toHaveAttribute("href", "/financial");
  });
});

describe("Insights — dismiss only after the server agrees", () => {
  it("removes the card when the dismissal succeeds", async () => {
    serve();
    let body: Record<string, unknown> = {};
    server.use(
      rest.post(INSIGHTS, async (req, res, ctx) => {
        body = (await req.json()) as Record<string, unknown>;
        return res(ctx.json({ success: true }));
      }),
    );

    render(<InsightsPage />);
    await userEvent.click(
      await screen.findByRole("button", { name: "Dismiss" }),
    );

    await waitFor(() =>
      expect(
        screen.queryByText("Groceries rose against your own average"),
      ).not.toBeInTheDocument(),
    );
    expect(body).toEqual({ insightId: "i-1", action: "dismiss" });
  });

  it("keeps the card when the dismissal fails", async () => {
    serve();
    server.use(rest.post(INSIGHTS, (_req, res, ctx) => res(ctx.status(500))));

    render(<InsightsPage />);
    await userEvent.click(
      await screen.findByRole("button", { name: "Dismiss" }),
    );

    // A dismissal that did not happen must not look like one that did.
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Dismiss" }),
      ).toBeInTheDocument(),
    );
    expect(
      screen.getByText("Groceries rose against your own average"),
    ).toBeInTheDocument();
  });
});

describe("Insights — nothing invented survives", () => {
  it("makes none of the old measurements", async () => {
    serve();

    render(<InsightsPage />);
    await screen.findByText("Groceries rose against your own average");

    for (const claim of [
      /22% to 31%/,
      /increased 45%/,
      /1\.8 months/,
      /35 points/,
      /4\.2 years/,
    ]) {
      expect(screen.queryByText(claim)).not.toBeInTheDocument();
    }
  });

  it("carries none of the invented confidence figures", async () => {
    serve();

    render(<InsightsPage />);
    await screen.findByText("Groceries rose against your own average");

    for (const figure of ["94% confidence", "88% confidence", "96% confidence"]) {
      expect(screen.queryByText(figure)).not.toBeInTheDocument();
    }
  });
});

describe("Insights — empty and failed states", () => {
  it("says there is nothing to report rather than inventing one", async () => {
    serve([]);

    render(<InsightsPage />);

    expect(await screen.findByText("Nothing to report yet")).toBeInTheDocument();
    expect(screen.queryByText(/Credit Utilization/)).not.toBeInTheDocument();
  });

  it("says insights are unavailable when the route fails", async () => {
    server.use(rest.get(INSIGHTS, (_req, res, ctx) => res(ctx.status(500))));

    render(<InsightsPage />);

    expect(
      await screen.findByText(/Insights are unavailable/i),
    ).toBeInTheDocument();
  });

  it("says the service is unreachable when the network drops", async () => {
    server.use(rest.get(INSIGHTS, (_req, res) => res.networkError("offline")));

    render(<InsightsPage />);

    expect(
      await screen.findByText(/could not reach the insights service/i),
    ).toBeInTheDocument();
  });
});

describe("Insights — the constant is gone", () => {
  const raw = fs.readFileSync(
    path.join(process.cwd(), "src/app/recommendations/insights/page.tsx"),
    "utf8",
  );
  const source = raw
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

  it("no longer declares the INSIGHTS constant", () => {
    expect(source).not.toContain("const INSIGHTS");
  });

  it("quotes none of the invented measurements", () => {
    for (const literal of ["22%", "31%", "1.8 months", "4.2 years", "35 points"]) {
      expect(source).not.toContain(literal);
    }
  });

  it("reads the live insights route", () => {
    expect(source).toContain("/api/financial/insights");
  });
});
