/**
 * Credit Score Analytics — real-data wiring regression coverage.
 *
 * The page had no fetch. Five `scoreFactors` read as a reading of the caller's
 * own file — "Payment History, impact 35, score 92, On-time payments for 24
 * months"; "Credit Utilization, impact 30, score 68, Using 32% of available
 * credit" — over a hardcoded score history and recommendations keyed to them.
 * This is the SF-16 shape on the web side.
 *
 * Factors now come from `credit_scores.factors` via the scores route, so what
 * renders is what a bureau actually reported, and nothing renders when it
 * reported nothing.
 *
 * ON MOCKING: MSW handler override, not `global.fetch`.
 */

import fs from "fs";
import path from "path";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom";
import { rest } from "msw";

import { server } from "@/__tests__/mocks/server";
import CreditScoreAnalyticsPage from "../page";

const SCORES = "http://localhost/api/credit-monitoring/scores";
const HISTORY = "http://localhost/api/credit-monitoring/history";

function serve({
  scores = {
    experian: {
      score: 706,
      scoreDate: "2026-08-01T00:00:00.000Z",
      factors: [
        {
          factor: "Payment history",
          impact: "positive",
          description: "No missed payments reported.",
        },
        {
          factor: "Recent inquiries",
          impact: "negative",
          description: "Three hard inquiries in the last six months.",
        },
      ],
    },
  },
  history = [
    { score: 690, scoreDate: "2026-02-01T00:00:00.000Z" },
    { score: 706, scoreDate: "2026-08-01T00:00:00.000Z" },
  ],
}: Record<string, unknown> = {}) {
  server.use(
    rest.get(SCORES, (_req, res, ctx) =>
      res(ctx.json({ success: true, data: scores })),
    ),
    rest.get(HISTORY, (_req, res, ctx) =>
      res(ctx.json({ success: true, data: history })),
    ),
  );
}

afterEach(cleanup);

describe("Credit Score Analytics — real score and factors", () => {
  it("shows the bureau score the account has", async () => {
    serve();

    render(<CreditScoreAnalyticsPage />);

    // Twice, legitimately: the bureau tile and the latest row of the history
    // chart. One real reading in two places.
    expect(await screen.findAllByText("706")).toHaveLength(2);
    expect(screen.getByText("Experian")).toBeInTheDocument();
  });

  it("renders the factors the bureau reported", async () => {
    serve();

    render(<CreditScoreAnalyticsPage />);

    expect(await screen.findByText("Payment history")).toBeInTheDocument();
    expect(
      screen.getByText("No missed payments reported."),
    ).toBeInTheDocument();
    expect(screen.getByText("Recent inquiries")).toBeInTheDocument();
  });

  it("labels impact with the enum the data uses, not a percentage", async () => {
    serve();

    render(<CreditScoreAnalyticsPage />);

    expect(await screen.findByText("positive")).toBeInTheDocument();
    expect(screen.getByText("negative")).toBeInTheDocument();
    // The old page rendered impact as a weight ("35") and a per-factor score
    // out of 100. The real ScoreFactor has neither.
    expect(screen.queryByText("35")).not.toBeInTheDocument();
    expect(screen.queryByText("92")).not.toBeInTheDocument();
  });

  it("renders the real score history", async () => {
    serve();

    render(<CreditScoreAnalyticsPage />);

    expect(await screen.findByText("690")).toBeInTheDocument();
  });
});

describe("Credit Score Analytics — absences read as absent", () => {
  it("says the report carried no factors rather than guessing", async () => {
    serve({
      scores: { experian: { score: 706, factors: [] } },
    });

    render(<CreditScoreAnalyticsPage />);

    expect(
      await screen.findByText(/not going to guess what is on your file/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/On-time payments for 24 months/i),
    ).not.toBeInTheDocument();
  });

  it("says no bureau has reported rather than showing a score", async () => {
    serve({ scores: {}, history: [] });

    render(<CreditScoreAnalyticsPage />);

    expect(
      await screen.findByText(/No bureau has reported a score for you yet/i),
    ).toBeInTheDocument();
  });

  it("invents nothing when the scores call fails", async () => {
    server.use(
      rest.get(SCORES, (_req, res, ctx) => res(ctx.status(500))),
    );

    render(<CreditScoreAnalyticsPage />);

    expect(
      await screen.findByText(/Your score is unavailable/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/32% of available credit/i)).not.toBeInTheDocument();
  });

  it("says the service is unreachable when the network drops", async () => {
    server.use(rest.get(SCORES, (_req, res) => res.networkError("offline")));

    render(<CreditScoreAnalyticsPage />);

    expect(
      await screen.findByText(/could not reach the credit score service/i),
    ).toBeInTheDocument();
  });
});

describe("Credit Score Analytics — the constants are gone", () => {
  const raw = fs.readFileSync(
    path.join(process.cwd(), "src/app/analytics/credit-score/page.tsx"),
    "utf8",
  );
  const source = raw
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

  it.each(["scoreFactors", "scoreHistory", "recommendations"])(
    "no longer declares %s",
    (name) => {
      expect(source).not.toContain(name);
    },
  );

  it("holds none of the invented descriptions", () => {
    expect(source).not.toContain("On-time payments for 24 months");
    expect(source).not.toContain("32% of available credit");
  });

  it("does not read /api/credit/factors, which is the SF-16 route", () => {
    // That route has no data access and returns five hardcoded factors telling
    // every caller they have "98% on-time payments". Reading it would swap one
    // fabrication for another while passing the audit.
    expect(source).not.toContain("/api/credit/factors");
    expect(source).toContain("/api/credit-monitoring/scores");
  });
});
