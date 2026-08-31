/**
 * Dispute Analytics — real-data wiring regression coverage.
 *
 * The page had no fetch. Four arrays told every visitor they had 24 disputes
 * (+8 this month), 12 successful at a 50% success rate, 5 pending averaging 18
 * days, and gave per-type and per-bureau tables down to "Experian 10 disputes,
 * 28 days average".
 *
 * It now reads GET /api/disputes/stats and GET /api/disputes, and DERIVES the
 * breakdowns by grouping the user's own disputes. These tests check the
 * derivation, not just that a fetch happens — in particular that a "verified"
 * outcome is not counted as a success, since that is the judgement most likely
 * to quietly flatter the number.
 *
 * ON MOCKING: MSW handler override, not `global.fetch`.
 */

import fs from "fs";
import path from "path";
import { render, screen, within, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom";
import { rest } from "msw";

import { server } from "@/__tests__/mocks/server";
import DisputeAnalyticsPage from "../page";

const STATS = "http://localhost/api/disputes/stats";
const LIST = "http://localhost/api/disputes";

function dispute(over: Record<string, unknown> = {}) {
  return {
    id: "d-1",
    bureau: "experian",
    itemType: "late_payment",
    itemDescription: "Chase card, 30 days",
    status: "resolved",
    outcome: "removed",
    createdAt: "2026-06-01T00:00:00.000Z",
    resolvedAt: "2026-07-01T00:00:00.000Z",
    ...over,
  };
}

function serve({
  stats = {
    total: 4,
    active: 1,
    resolved: 3,
    successRate: 66.6,
    avgResolutionDays: 27.4,
  },
  items = [dispute()],
}: Record<string, unknown> = {}) {
  server.use(
    rest.get(STATS, (_req, res, ctx) =>
      res(ctx.json({ success: true, data: stats })),
    ),
    rest.get(LIST, (_req, res, ctx) =>
      res(ctx.json({ success: true, data: { items, total: (items as []).length } })),
    ),
  );
}

afterEach(cleanup);

describe("Dispute Analytics — headline figures", () => {
  it("takes the totals from the stats route", async () => {
    serve();

    render(<DisputeAnalyticsPage />);

    expect(await screen.findByText("4")).toBeInTheDocument(); // total
    expect(screen.getByText("3")).toBeInTheDocument(); // resolved
    expect(screen.getByText("67%")).toBeInTheDocument(); // rounded successRate
  });

  it("reports the average resolution time the route gave", async () => {
    serve();

    render(<DisputeAnalyticsPage />);

    expect(
      await screen.findByText(/took 27 days on average/i),
    ).toBeInTheDocument();
  });

  it("omits the average when the route reports none", async () => {
    serve({
      stats: {
        total: 1,
        active: 1,
        resolved: 0,
        successRate: 0,
        avgResolutionDays: 0,
      },
    });

    render(<DisputeAnalyticsPage />);

    // Same race: wait for a node that proves the fetch resolved.
    await screen.findAllByText(/You have not filed any disputes yet/i);
    expect(screen.queryByText(/on average/i)).not.toBeInTheDocument();
  });

  it("shows a dash rather than a number when stats are missing", async () => {
    server.use(
      rest.get(STATS, (_req, res, ctx) => res(ctx.status(500))),
      rest.get(LIST, (_req, res, ctx) =>
        res(ctx.json({ success: true, data: { items: [], total: 0 } })),
      ),
    );

    render(<DisputeAnalyticsPage />);

    expect(await screen.findAllByText("—")).toHaveLength(4);
  });
});

describe("Dispute Analytics — breakdowns derived from real disputes", () => {
  it("groups by bureau and by item type", async () => {
    serve({
      items: [
        dispute({ id: "1", bureau: "experian", itemType: "late_payment" }),
        dispute({ id: "2", bureau: "experian", itemType: "collection" }),
        dispute({ id: "3", bureau: "equifax", itemType: "late_payment" }),
      ],
    });

    render(<DisputeAnalyticsPage />);

    /*
     * Await a node that only exists once the disputes have arrived. The
     * "By bureau" heading renders immediately -- it is not behind the loading
     * gate -- so awaiting THAT resolves at time zero and races the fetch.
     */
    await screen.findByText("Equifax");
    const bureau = screen.getByText("By bureau").closest("div")!;
    expect(within(bureau).getByText("Experian")).toBeInTheDocument();
    expect(within(bureau).getByText("Equifax")).toBeInTheDocument();

    const types = screen.getByText("By item type").closest("div")!;
    expect(within(types).getByText("Late Payment")).toBeInTheDocument();
    expect(within(types).getByText("Collection")).toBeInTheDocument();
  });

  it("does NOT count a verified outcome as a success", async () => {
    // The bureau closed it without changing anything. Counting it would
    // flatter the number, which is exactly what the old constants did.
    serve({
      items: [
        dispute({ id: "1", outcome: "verified", status: "resolved" }),
        dispute({ id: "2", outcome: "removed", status: "resolved" }),
      ],
    });

    render(<DisputeAnalyticsPage />);

    await screen.findByText("Experian");
    const bureau = screen.getByText("By bureau").closest("div")!;
    const row = within(bureau).getByText("Experian").closest("tr")!;
    const cells = within(row).getAllByRole("cell");
    expect(cells[1]).toHaveTextContent("2"); // total
    expect(cells[2]).toHaveTextContent("1"); // successful — not 2
  });

  it("counts sent and under_review as pending", async () => {
    serve({
      items: [
        dispute({ id: "1", status: "sent", outcome: undefined }),
        dispute({ id: "2", status: "under_review", outcome: undefined }),
        dispute({ id: "3", status: "draft", outcome: undefined }),
      ],
    });

    render(<DisputeAnalyticsPage />);

    await screen.findByText("Experian");
    const bureau = screen.getByText("By bureau").closest("div")!;
    const row = within(bureau).getByText("Experian").closest("tr")!;
    const cells = within(row).getAllByRole("cell");
    expect(cells[3]).toHaveTextContent("2"); // a draft is not pending
  });

  it("says there are no disputes rather than drawing a table", async () => {
    serve({ items: [] });

    render(<DisputeAnalyticsPage />);

    expect(
      await screen.findAllByText(/You have not filed any disputes yet/i),
    ).toHaveLength(2);
  });
});

describe("Dispute Analytics — the constants are gone", () => {
  const raw = fs.readFileSync(
    path.join(process.cwd(), "src/app/analytics/disputes/page.tsx"),
    "utf8",
  );
  const source = raw
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

  it.each([
    "disputeStats",
    "disputesByType",
    "disputesByBureau",
    "recentDisputes",
  ])("no longer declares %s", (name) => {
    expect(source).not.toContain(name);
  });

  it("reads the two routes that actually query the database", () => {
    expect(source).toContain("/api/disputes/stats");
    expect(source).toContain("/api/disputes?limit=");
  });

  it("does not read /api/analytics, which serves an all-zeros stub", () => {
    // AnalyticsEngine.getDisputeAnalytics returns hardcoded zeros and
    // analytics-engine.ts performs no query at all — see task #99. Wiring
    // this page to it would present a stub as a measurement.
    expect(source).not.toContain("/api/analytics");
  });
});
