/**
 * Analytics Overview — real-data wiring regression coverage.
 *
 * The page contained no fetch. Four module-level arrays told every visitor
 * their score was 720 (up 45 from 675), that they had 5 active disputes and 12
 * items removed at a 78% success rate, that Experian had them at 725 (+12), and
 * that their score had climbed from 620 to 720 over six months. A feed reported
 * "Credit score increased by 15 points — 2 hours ago".
 *
 * Every one of those had a real route already sitting there unused.
 *
 * These tests assert the numbers come from those routes, that an absent value
 * renders as absent rather than as a plausible figure, and that the old
 * constants cannot come back.
 *
 * ON MOCKING: MSW handler override, not `global.fetch` — server.listen() runs
 * in a beforeAll that fires after this module is evaluated.
 */

import fs from "fs";
import path from "path";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom";
import { rest } from "msw";

import { server } from "@/__tests__/mocks/server";
import AnalyticsOverviewPage from "../page";

const SCORES = "http://localhost/api/credit-monitoring/scores";
const STATS = "http://localhost/api/disputes/stats";
const ACTIVITY = "http://localhost/api/activity";
const HISTORY = "http://localhost/api/credit-monitoring/history";

function serve({
  scores = { experian: { score: 702, scoreDate: "2026-08-01T00:00:00.000Z" } },
  stats = { total: 9, active: 2, resolved: 6, successRate: 66.7 },
  activities = [
    {
      id: "a-1",
      type: "dispute_update",
      title: "Experian responded",
      message: "Dispute #4410 was updated.",
      createdAt: new Date(Date.now() - 3600_000).toISOString(),
    },
  ],
  history = [
    { score: 702, scoreDate: "2026-08-01T00:00:00.000Z" },
    { score: 664, scoreDate: "2025-09-01T00:00:00.000Z" },
  ],
}: Record<string, unknown> = {}) {
  server.use(
    rest.get(SCORES, (_req, res, ctx) =>
      res(ctx.json({ success: true, data: scores })),
    ),
    rest.get(STATS, (_req, res, ctx) =>
      res(ctx.json({ success: true, data: stats })),
    ),
    rest.get(ACTIVITY, (_req, res, ctx) => res(ctx.json({ activities }))),
    rest.get(HISTORY, (_req, res, ctx) =>
      res(ctx.json({ success: true, data: history })),
    ),
  );
}

afterEach(cleanup);

describe("Analytics Overview — real numbers", () => {
  it("shows the score from the scores route", async () => {
    serve();

    render(<AnalyticsOverviewPage />);

    /*
     * Three times, legitimately: the headline "Current Credit Score", the most
     * recent row of the history chart, and the per-bureau list. One real
     * reading in three places — asserting the count keeps that visible rather
     * than hiding it behind a getAllBy[0].
     */
    expect(await screen.findAllByText("702")).toHaveLength(3);
  });

  it("shows dispute counts and success rate from the stats route", async () => {
    serve();

    render(<AnalyticsOverviewPage />);

    expect(await screen.findByText("2")).toBeInTheDocument(); // active
    expect(screen.getByText("6")).toBeInTheDocument(); // resolved
    expect(screen.getByText("67%")).toBeInTheDocument(); // successRate rounded
  });

  it("labels resolved disputes as resolved, not as items removed", async () => {
    serve();

    render(<AnalyticsOverviewPage />);

    expect(await screen.findByText("Disputes Resolved")).toBeInTheDocument();
    // A resolved dispute is not an item removed from a report.
    expect(screen.queryByText(/Items Removed/i)).not.toBeInTheDocument();
  });

  it("derives the score change from history rather than asserting one", async () => {
    serve();

    render(<AnalyticsOverviewPage />);

    // 702 now vs 664 a year ago.
    expect(await screen.findByText(/\+38 over the last year/)).toBeInTheDocument();
  });

  it("shows no change at all when there is no earlier reading", async () => {
    serve({ history: [{ score: 702, scoreDate: "2026-08-01T00:00:00.000Z" }] });

    render(<AnalyticsOverviewPage />);

    await screen.findAllByText("702");
    // An unknown change is not a change of zero.
    expect(screen.queryByText(/over the last year/)).not.toBeInTheDocument();
  });

  it("renders the activity feed from the activity route", async () => {
    serve();

    render(<AnalyticsOverviewPage />);

    expect(await screen.findByText("Experian responded")).toBeInTheDocument();
    expect(screen.getByText("Dispute #4410 was updated.")).toBeInTheDocument();
  });
});

describe("Analytics Overview — absences read as absent", () => {
  it("shows a dash, not a number, when there are no stats", async () => {
    serve({ scores: {}, stats: null, activities: [], history: [] });

    render(<AnalyticsOverviewPage />);

    expect(await screen.findAllByText("—")).toHaveLength(4);
  });

  it("says no bureau has reported rather than showing a score", async () => {
    serve({ scores: {}, history: [] });

    render(<AnalyticsOverviewPage />);

    expect(
      await screen.findByText(/No bureau has reported a score for you yet/i),
    ).toBeInTheDocument();
    expect(screen.queryByText("720")).not.toBeInTheDocument();
    expect(screen.queryByText("725")).not.toBeInTheDocument();
  });

  it("says the feed is empty rather than inventing activity", async () => {
    serve({ activities: [] });

    render(<AnalyticsOverviewPage />);

    expect(
      await screen.findByText(/Nothing has happened on your account yet/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/Credit score increased by 15 points/i),
    ).not.toBeInTheDocument();
  });

  it("says there is no history rather than drawing a climb", async () => {
    serve({ history: [] });

    render(<AnalyticsOverviewPage />);

    expect(
      await screen.findByText(/no score history for you yet/i),
    ).toBeInTheDocument();
  });

  it("invents nothing when every call fails", async () => {
    server.use(
      rest.get(SCORES, (_req, res, ctx) => res(ctx.status(500))),
      rest.get(STATS, (_req, res, ctx) => res(ctx.status(500))),
      rest.get(ACTIVITY, (_req, res, ctx) => res(ctx.status(503))),
    );

    render(<AnalyticsOverviewPage />);

    expect(
      await screen.findByText(/Analytics are unavailable/i),
    ).toBeInTheDocument();
    for (const value of ["720", "725", "718", "78%", "12"]) {
      expect(screen.queryByText(value)).not.toBeInTheDocument();
    }
  });
});

describe("Analytics Overview — the constants are gone", () => {
  const raw = fs.readFileSync(
    path.join(process.cwd(), "src/app/analytics/page.tsx"),
    "utf8",
  );
  // Comments stripped: the header quotes what it removed, on purpose.
  const source = raw
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

  it.each([
    "overviewStats",
    "recentActivity",
    "bureauScores",
    "monthlyProgress",
  ])("no longer declares %s", (name) => {
    expect(source).not.toContain(name);
  });

  it("holds none of the invented figures", () => {
    for (const literal of ["720", "725", "718", "715", "675", "620"]) {
      expect(source).not.toContain(literal);
    }
  });

  it("reads all four routes", () => {
    expect(source).toContain("/api/credit-monitoring/scores");
    expect(source).toContain("/api/disputes/stats");
    expect(source).toContain("/api/activity");
    expect(source).toContain("/api/credit-monitoring/history");
  });
});
