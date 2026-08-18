/**
 * Real Estate — real-property wiring regression coverage.
 *
 * The page had no fetch. MOCK_PROPERTIES gave every visitor a portfolio of
 * addresses, purchase prices, current values, mortgages and rent, with a
 * summary above turning it into a net-worth statement.
 *
 * The feature was built and unreachable: real_estate_tracking has existed
 * since migration 20260731000081 and real-estate-tracking-service.ts makes 27
 * database calls against it, but nothing imported the service except a barrel
 * and its own test. GET /api/financial/real-estate was added to close that gap.
 *
 * These tests cover the wiring, the derived equity, and the one thing this
 * page can get quietly wrong: presenting a self-entered value and an appraisal
 * as the same kind of number.
 *
 * ON MOCKING: MSW handler override, not `global.fetch`.
 */

import fs from "fs";
import path from "path";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom";
import { rest } from "msw";

import { server } from "@/__tests__/mocks/server";
import RealEstatePage from "../page";

const REAL_ESTATE = "http://localhost/api/financial/real-estate";

function serve({
  properties = [
    {
      id: "p-1",
      name: "Maple Street",
      type: "rental",
      address: { street: "12 Maple St", city: "Austin", state: "TX" },
      purchasePrice: 300_000,
      currentValue: 420_000,
      valueSource: "appraisal",
      mortgages: [{ id: "m-1", currentBalance: 180_000 }],
    },
  ],
  summary = {
    totalProperties: 1,
    totalValue: 420_000,
    totalEquity: 240_000,
    totalDebt: 180_000,
    netMonthlyCashFlow: 850,
    totalAppreciation: 120_000,
    appreciationPercent: 40,
  },
}: Record<string, unknown> = {}) {
  server.use(
    rest.get(REAL_ESTATE, (_req, res, ctx) =>
      res(ctx.json({ success: true, data: { properties, summary } })),
    ),
  );
}

afterEach(cleanup);

describe("Real Estate — real properties", () => {
  it("renders the properties the route returned", async () => {
    serve();

    render(<RealEstatePage />);

    expect(await screen.findByText("Maple Street")).toBeInTheDocument();
    expect(screen.getByText("Rental")).toBeInTheDocument();
    expect(screen.getByText(/12 Maple St, Austin, TX/)).toBeInTheDocument();
  });

  it("shows the summary the service computed", async () => {
    serve();

    render(<RealEstatePage />);

    // Twice, legitimately: the summary tile and the property's derived equity
    // (420,000 - 180,000). One property, so the two agree.
    expect(await screen.findAllByText("$240,000")).toHaveLength(2);
    expect(screen.getByText("$850")).toBeInTheDocument(); // cash flow
  });

  it("derives per-property equity from value minus mortgage balances", async () => {
    serve({
      properties: [
        {
          id: "p-2",
          name: "Oak Court",
          type: "investment",
          currentValue: 500_000,
          // Deliberately unequal to the resulting equity, so the assertion
          // below cannot pass by matching the wrong figure.
          mortgages: [
            { id: "m-1", currentBalance: 200_000 },
            { id: "m-2", currentBalance: 60_000 },
          ],
        },
      ],
      summary: null,
    });

    render(<RealEstatePage />);

    await screen.findByText("Oak Court");
    expect(screen.getByText("$260,000")).toBeInTheDocument(); // summed balances
    expect(screen.getByText("$240,000")).toBeInTheDocument(); // 500k - 260k
  });

  it("treats a property with no mortgage as fully owned", async () => {
    serve({
      properties: [
        {
          id: "p-3",
          name: "Paid Off",
          type: "primary_residence",
          currentValue: 250_000,
        },
      ],
      summary: null,
    });

    render(<RealEstatePage />);

    await screen.findByText("Paid Off");
    // Equity equals value; mortgage balance is $0, not blank or NaN.
    expect(screen.getAllByText("$250,000").length).toBeGreaterThan(0);
    expect(screen.getByText("$0")).toBeInTheDocument();
  });

  it("labels a type the old four-value union did not have", async () => {
    serve({
      properties: [
        {
          id: "p-4",
          name: "Warehouse",
          type: "multi_family",
          currentValue: 900_000,
        },
      ],
      summary: null,
    });

    render(<RealEstatePage />);

    expect(await screen.findByText("Multi-family")).toBeInTheDocument();
  });
});

describe("Real Estate — where the value came from", () => {
  it("says when a valuation came from an appraisal", async () => {
    serve();

    render(<RealEstatePage />);

    expect(await screen.findByText(/from an appraisal/i)).toBeInTheDocument();
  });

  it("says when the user entered the value themselves", async () => {
    serve({
      properties: [
        {
          id: "p-5",
          name: "Self valued",
          type: "rental",
          currentValue: 100_000,
          valueSource: "manual",
        },
      ],
      summary: null,
    });

    render(<RealEstatePage />);

    // A self-entered value and an appraisal are different claims.
    expect(await screen.findByText(/you entered this value/i)).toBeInTheDocument();
  });
});

describe("Real Estate — absences read as absent", () => {
  it("says no properties rather than showing one", async () => {
    serve({ properties: [], summary: null });

    render(<RealEstatePage />);

    expect(await screen.findByText("No properties added")).toBeInTheDocument();
  });

  it("invents nothing when the route fails", async () => {
    server.use(rest.get(REAL_ESTATE, (_req, res, ctx) => res(ctx.status(500))));

    render(<RealEstatePage />);

    expect(
      await screen.findByText(/Properties are unavailable/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Maple/)).not.toBeInTheDocument();
  });

  it("says the service is unreachable when the network drops", async () => {
    server.use(rest.get(REAL_ESTATE, (_req, res) => res.networkError("offline")));

    render(<RealEstatePage />);

    expect(
      await screen.findByText(/could not reach the property service/i),
    ).toBeInTheDocument();
  });
});

describe("Real Estate — the constants are gone", () => {
  const raw = fs.readFileSync(
    path.join(process.cwd(), "src/app/financial/real-estate/page.tsx"),
    "utf8",
  );
  const source = raw
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

  it("no longer declares MOCK_PROPERTIES", () => {
    expect(source).not.toContain("MOCK_PROPERTIES");
  });

  it("reads the route that exposes the real service", () => {
    expect(source).toContain("/api/financial/real-estate");
  });

  it("follows the service's shape rather than the old local one", () => {
    // Structured address, mortgages array, valueSource provenance.
    expect(source).toContain("mortgages");
    expect(source).toContain("valueSource");
    expect(source).toContain("multi_family");
  });
});
