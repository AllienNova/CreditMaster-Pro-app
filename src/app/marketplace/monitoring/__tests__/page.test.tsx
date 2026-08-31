/**
 * Credit Monitoring Hub — real-data wiring regression coverage.
 *
 * `mockScores` gave every visitor the same three readings — Experian 720
 * (+15), Equifax 715 (+8), TransUnion 718 (+12) — and `mockAlerts` told them
 * "New Hard Inquiry: Capital One Bank checked your credit". A hard inquiry is
 * something a person acts on: they ring the bank, or they file a dispute.
 *
 * The service comparison was a different shape: a real fetch with a MOCK
 * FALLBACK, swapping in a price table (Fynvita at $29.99 against competitors)
 * whenever the catalogue came back empty. The most important test in this file
 * is the one asserting that fallback is gone — a pricing comparison is either
 * the real catalogue or it is nothing.
 *
 * ON MOCKING: MSW handler override, not `global.fetch`.
 */

import fs from "fs";
import path from "path";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom";
import { rest } from "msw";

import { server } from "@/__tests__/mocks/server";
import CreditMonitoringPage from "../page";

const SCORES = "http://localhost/api/credit-monitoring/scores";
const ALERTS = "http://localhost/api/credit-monitoring/alerts";
const PRODUCTS = "http://localhost/api/marketplace/products";

function serve({
  scores = {
    experian: { score: 694, scoreDate: "2026-08-01T00:00:00.000Z" },
    equifax: { score: 688 },
  },
  alerts = [
    {
      id: "a-1",
      type: "new_inquiry",
      bureau: "experian",
      title: "New inquiry recorded",
      message: "A lender checked your report.",
      severity: "medium",
      read: false,
      createdAt: "2026-08-10T00:00:00.000Z",
    },
  ],
  products = [
    {
      id: "prod-1",
      name: "Fynvita Monitoring",
      description: "Daily bureau monitoring",
      price: 9.99,
      priceType: "monthly",
      rating: 4.6,
      reviewCount: 128,
      // The REAL shape: jsonb, per-product keys, `bureaus` an array of names.
      // Seeded rows look like this (migration 20251218000000:366).
      features: {
        bureaus: ["Experian", "Equifax"],
        disputes_per_month: 5,
        specialist: true,
        ai_letters: false,
      },
    },
  ],
}: Record<string, unknown> = {}) {
  server.use(
    rest.get(SCORES, (_req, res, ctx) =>
      res(ctx.json({ success: true, data: scores })),
    ),
    rest.get(ALERTS, (_req, res, ctx) =>
      res(ctx.json({ success: true, data: alerts })),
    ),
    rest.get(PRODUCTS, (_req, res, ctx) =>
      res(ctx.json({ success: true, data: products })),
    ),
  );
}

afterEach(cleanup);

describe("Monitoring — real scores", () => {
  it("shows only the bureaus that reported", async () => {
    serve();

    render(<CreditMonitoringPage />);

    expect(await screen.findByText("694")).toBeInTheDocument();
    expect(screen.getByText("688")).toBeInTheDocument();
    expect(screen.queryByText("TransUnion")).not.toBeInTheDocument();
  });

  it("shows no change figure, because a score carries no delta", async () => {
    serve();

    render(<CreditMonitoringPage />);
    await screen.findByText("694");

    // A CreditScore has a score and a date. "+15" beside it was invented.
    expect(screen.queryByText(/\+15/)).not.toBeInTheDocument();
    expect(screen.queryByText(/\+8/)).not.toBeInTheDocument();
  });

  it("says no bureau has reported rather than showing a score", async () => {
    serve({ scores: {} });

    render(<CreditMonitoringPage />);

    expect(
      await screen.findByText(/No bureau has reported a score for you yet/i),
    ).toBeInTheDocument();
    expect(screen.queryByText("720")).not.toBeInTheDocument();
  });
});

describe("Monitoring — real alerts", () => {
  it("renders the alerts the route returned", async () => {
    serve();

    render(<CreditMonitoringPage />);

    expect(await screen.findByText("New inquiry recorded")).toBeInTheDocument();
    expect(screen.getByText("A lender checked your report.")).toBeInTheDocument();
    expect(screen.getByText("medium")).toBeInTheDocument();
  });

  it("says there are none rather than inventing an inquiry", async () => {
    serve({ alerts: [] });

    render(<CreditMonitoringPage />);

    expect(
      await screen.findByText(/No alerts on your account/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Capital One/)).not.toBeInTheDocument();
  });
});

describe("Monitoring — the price comparison has no mock fallback", () => {
  it("renders the real catalogue when there is one", async () => {
    serve();

    render(<CreditMonitoringPage />);

    expect(await screen.findByText("Fynvita Monitoring")).toBeInTheDocument();
    expect(screen.getByText("$9.99")).toBeInTheDocument();
  });

  it("shows NO price table when the catalogue is empty", async () => {
    serve({ products: [] });

    render(<CreditMonitoringPage />);

    // This is the regression that matters: the page used to swap in a
    // comparison putting Fynvita at $29.99 against competitors.
    expect(
      await screen.findByText(/no monitoring products to compare/i),
    ).toBeInTheDocument();
    expect(screen.queryByText("$29.99")).not.toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("shows no price table when the products route fails either", async () => {
    serve();
    server.use(rest.get(PRODUCTS, (_req, res, ctx) => res(ctx.status(500))));

    render(<CreditMonitoringPage />);

    expect(
      await screen.findByText(/no monitoring products to compare/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Showing sample data/i)).not.toBeInTheDocument();
  });
});

describe("Monitoring — the product table reads the real jsonb shape", () => {
  /**
   * These exist because the first version of this page shipped a mapper built
   * on an assumption: `features?.includes("alerts")` and `product.bureauCount`.
   * `features` is a jsonb OBJECT (marketplace-service.ts:23) whose column
   * default is `'{}'`, so `.includes` is not a function and a real row threw.
   * The old fixture was an array, so the suite went green over a crash.
   */
  it("renders a product whose features object is empty, rather than throwing", async () => {
    serve({
      products: [
        {
          id: "p-empty",
          name: "Bare Product",
          price: 5,
          priceType: "monthly",
          rating: 0,
          reviewCount: 0,
          features: {}, // the column default
        },
      ],
    });

    render(<CreditMonitoringPage />);

    expect(await screen.findByText("Bare Product")).toBeInTheDocument();
    expect(screen.getAllByText("Not stated").length).toBeGreaterThanOrEqual(2);
  });

  it("survives a product with no features key at all", async () => {
    serve({
      products: [{ id: "p-none", name: "No Features Key", price: 1 }],
    });

    render(<CreditMonitoringPage />);

    expect(await screen.findByText("No Features Key")).toBeInTheDocument();
  });

  it("lists the bureaus by name, because that is what the row stores", async () => {
    serve();

    render(<CreditMonitoringPage />);

    // Seeded rows hold `"bureaus": ["Experian", ...]` — names, not a count.
    expect(await screen.findByText("Experian, Equifax")).toBeInTheDocument();
    expect(screen.queryByText("1")).not.toBeInTheDocument();
  });

  it("lists a declared feature and omits one the product declined", async () => {
    serve();

    render(<CreditMonitoringPage />);

    expect(await screen.findByText("Disputes per month: 5")).toBeInTheDocument();
    expect(screen.getByText("Specialist")).toBeInTheDocument();
    // `ai_letters: false` means the product does NOT include it.
    expect(screen.queryByText("Ai letters")).not.toBeInTheDocument();
  });

  it("says what the price cadence is, so the comparison means something", async () => {
    serve();

    render(<CreditMonitoringPage />);

    expect(await screen.findByText("$9.99")).toBeInTheDocument();
    expect(screen.getByText("/ month")).toBeInTheDocument();
  });

  it("says there are no ratings rather than printing 0.0", async () => {
    serve({
      products: [
        {
          id: "p-new",
          name: "Unrated",
          price: 3,
          rating: 0,
          reviewCount: 0,
          features: {},
        },
      ],
    });

    render(<CreditMonitoringPage />);

    expect(await screen.findByText("No ratings yet")).toBeInTheDocument();
    expect(screen.queryByText("0.0")).not.toBeInTheDocument();
  });
});

describe("Monitoring — total failure invents nothing", () => {
  it("says data is unavailable when every call fails", async () => {
    server.use(
      rest.get(SCORES, (_req, res, ctx) => res(ctx.status(500))),
      rest.get(ALERTS, (_req, res, ctx) => res(ctx.status(500))),
      rest.get(PRODUCTS, (_req, res, ctx) => res(ctx.status(500))),
    );

    render(<CreditMonitoringPage />);

    expect(
      await screen.findByText(/Monitoring data is unavailable/i),
    ).toBeInTheDocument();
    for (const value of ["720", "715", "718", "$29.99"]) {
      expect(screen.queryByText(value)).not.toBeInTheDocument();
    }
  });
});

describe("Monitoring — the constants are gone", () => {
  const raw = fs.readFileSync(
    path.join(process.cwd(), "src/app/marketplace/monitoring/page.tsx"),
    "utf8",
  );
  const source = raw
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

  it.each(["mockScores", "mockAlerts", "mockMonitoringServices"])(
    "no longer declares %s",
    (name) => {
      expect(source).not.toContain(name);
    },
  );

  it("holds none of the invented figures", () => {
    for (const literal of ["720", "715", "718", "29.99", "Capital One"]) {
      expect(source).not.toContain(literal);
    }
  });

  it("reads all three real routes", () => {
    expect(source).toContain("/api/credit-monitoring/scores");
    expect(source).toContain("/api/credit-monitoring/alerts");
    expect(source).toContain("/api/marketplace/products");
  });
});
