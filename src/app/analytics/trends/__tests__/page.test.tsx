/**
 * Trends — real-data wiring regression coverage.
 *
 * The page had no fetch. It told every visitor their score velocity was "+7.5
 * pts/month", showed six months of score, dispute and utilization figures,
 * projected 745 in three months at "confidence: High" and 770 in six, and
 * asserted "Your dispute success rate is 13% above average".
 *
 * The velocity and the series are real now, derived from
 * /api/credit-monitoring/history and /api/disputes. The projections and the
 * insights are gone: no model forecasts a credit score here, and no cohort data
 * exists to be 13% above.
 *
 * These tests cover the derivation — especially the two cases where a naive
 * implementation would quietly assert something: a single reading (no slope)
 * and a flat series (a real zero, not an absent one).
 *
 * ON MOCKING: MSW handler override, not `global.fetch`.
 */

import fs from "fs";
import path from "path";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom";
import { rest } from "msw";

import { server } from "@/__tests__/mocks/server";
import TrendsPage from "../page";

const SCORES = "http://localhost/api/credit-monitoring/scores";
const HISTORY = "http://localhost/api/credit-monitoring/history";
const DISPUTES = "http://localhost/api/disputes";

function serve({
  scores = { experian: { score: 700 } },
  history = [
    { score: 640, scoreDate: "2025-08-18T00:00:00.000Z" },
    { score: 700, scoreDate: "2026-08-18T00:00:00.000Z" },
  ],
  items = [{ id: "d-1", createdAt: "2026-07-04T00:00:00.000Z" }],
}: Record<string, unknown> = {}) {
  server.use(
    rest.get(SCORES, (_req, res, ctx) =>
      res(ctx.json({ success: true, data: scores })),
    ),
    rest.get(HISTORY, (_req, res, ctx) =>
      res(ctx.json({ success: true, data: history })),
    ),
    rest.get(DISPUTES, (_req, res, ctx) =>
      res(ctx.json({ success: true, data: { items, total: (items as []).length } })),
    ),
  );
}

afterEach(cleanup);

describe("Trends — velocity is derived", () => {
  it("computes points per month from the real readings", async () => {
    // 640 -> 700 over 365 days = +60 in ~12 months = +5.0/month.
    serve();

    render(<TrendsPage />);

    expect(await screen.findByText(/\+5\.0/)).toBeInTheDocument();
    expect(screen.getByText(/pts\/month/)).toBeInTheDocument();
  });

  it("states the window the rate was measured over", async () => {
    serve();

    render(<TrendsPage />);

    // A rate without a window is not something anyone can check.
    expect(
      await screen.findByText(/Measured across 12\.0 months of Experian/i),
    ).toBeInTheDocument();
  });

  it("refuses to state a rate from a single reading", async () => {
    serve({ history: [{ score: 700, scoreDate: "2026-08-18T00:00:00.000Z" }] });

    render(<TrendsPage />);

    expect(
      await screen.findByText(/at least two recorded scores/i),
    ).toBeInTheDocument();
    // "0 pts/month" would be a claim that the score is flat.
    expect(screen.queryByText(/pts\/month/)).not.toBeInTheDocument();
  });

  it("reports a genuinely flat series as zero", async () => {
    serve({
      history: [
        { score: 700, scoreDate: "2025-08-18T00:00:00.000Z" },
        { score: 700, scoreDate: "2026-08-18T00:00:00.000Z" },
      ],
    });

    render(<TrendsPage />);

    // Distinct from the single-reading case: this zero was measured.
    expect(await screen.findByText(/\+0\.0/)).toBeInTheDocument();
  });

  it("shows a negative rate when the score fell", async () => {
    serve({
      history: [
        { score: 700, scoreDate: "2025-08-18T00:00:00.000Z" },
        { score: 640, scoreDate: "2026-08-18T00:00:00.000Z" },
      ],
    });

    render(<TrendsPage />);

    expect(await screen.findByText(/-5\.0/)).toBeInTheDocument();
  });
});

describe("Trends — series come from real rows", () => {
  it("counts disputes by the month they were filed", async () => {
    serve({
      items: [
        { id: "1", createdAt: "2026-07-04T00:00:00.000Z" },
        { id: "2", createdAt: "2026-07-20T00:00:00.000Z" },
        { id: "3", createdAt: "2026-06-01T00:00:00.000Z" },
      ],
    });

    render(<TrendsPage />);

    expect(await screen.findByText("Jul 2026")).toBeInTheDocument();
    expect(screen.getByText("Jun 2026")).toBeInTheDocument();
  });

  it("buckets by UTC, so midnight on the 1st stays in its own month", async () => {
    /*
     * REGRESSION. This started as a wrong expectation in the test and turned
     * out to be a real defect: `toLocaleDateString` without a timeZone formats
     * in the viewer's local zone, so 2026-06-01T00:00:00Z rendered as "May
     * 2026" on any machine west of UTC. Identical data would have shown
     * different months to different users, and the same user's chart would
     * change by travelling.
     */
    serve({ items: [{ id: "1", createdAt: "2026-06-01T00:00:00.000Z" }] });

    render(<TrendsPage />);

    expect(await screen.findByText("Jun 2026")).toBeInTheDocument();
    expect(screen.queryByText("May 2026")).not.toBeInTheDocument();
  });

  it("says there is no score rather than drawing a chart", async () => {
    serve({ scores: {}, history: [] });

    render(<TrendsPage />);

    expect(
      await screen.findByText(/No score has been recorded for you yet/i),
    ).toBeInTheDocument();
  });

  it("says there are no disputes rather than inventing months", async () => {
    serve({ items: [] });

    render(<TrendsPage />);

    expect(
      await screen.findByText(/You have not filed any disputes yet/i),
    ).toBeInTheDocument();
  });
});

describe("Trends — projections and insights are gone", () => {
  const raw = fs.readFileSync(
    path.join(process.cwd(), "src/app/analytics/trends/page.tsx"),
    "utf8",
  );
  const source = raw
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

  it("renders no forecast", async () => {
    serve();

    render(<TrendsPage />);
    await screen.findByText(/pts\/month/);

    expect(screen.queryByText(/745/)).not.toBeInTheDocument();
    expect(screen.queryByText(/770/)).not.toBeInTheDocument();
    expect(screen.queryByText(/confidence/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/project/i)).not.toBeInTheDocument();
  });

  it("makes no comparison to an average that does not exist", async () => {
    serve();

    render(<TrendsPage />);
    await screen.findByText(/pts\/month/);

    expect(screen.queryByText(/above average/i)).not.toBeInTheDocument();
  });

  it.each(["trendMetrics", "monthlyTrends", "projections", "insights"])(
    "no longer declares %s",
    (name) => {
      expect(source).not.toContain(name);
    },
  );

  it("shows no utilization, which has no source anywhere", () => {
    // No utilization route exists and credit-monitoring-service.ts has no
    // such field. The old column was three invented percentages.
    expect(source).not.toContain("utilization");
  });

  it("reads the routes that do query the database", () => {
    expect(source).toContain("/api/credit-monitoring/history");
    expect(source).toContain("/api/disputes?limit=");
    expect(source).not.toContain("/api/analytics");
  });
});
