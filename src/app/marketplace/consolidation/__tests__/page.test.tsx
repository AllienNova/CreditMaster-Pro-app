/**
 * Debt Consolidation — real-offer wiring regression coverage.
 *
 * The page had no fetch. `mockOptions` invented lender offers naming real
 * institutions with specific terms: "SoFi — personal, $5,000–$100,000, APR
 * 8.99% – 25.81%", "Marcus by Goldman Sachs — 6.99% – 28.99%", each with a star
 * rating nobody assigned.
 *
 * The real route exists and honestly returns nothing: all three affiliate
 * matchers stub their catalogue (`return []`, "In production this would call
 * moneyLionClient.getProductCatalog(...)"), so no product ever reaches them.
 * The mock was papering over a feature that is not connected — task #105.
 *
 * The most important test here is the empty one. Showing "no offers" where a
 * lender card used to sit is the entire point: the disconnection becomes
 * visible instead of hidden.
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
import ConsolidationPage from "../page";

const OFFERS = "http://localhost/api/affiliate/offers";

function loan(over: Record<string, unknown> = {}) {
  return {
    product: {
      productId: "p-1",
      name: "Consolidation Loan",
      partner: "Partner Bank",
      featured: true,
      terms: {
        apr: { min: 7.5, max: 19.9, type: "fixed" },
        loanAmount: { min: 5_000, max: 50_000 },
        term: { min: 2, max: 7, unit: "years" },
      },
    },
    loanType: "personal",
    eligible: true,
    highlights: ["No origination fee"],
    estimatedMonthlyPayment: 412,
    ...over,
  };
}

function serve(loans: unknown[]) {
  server.use(
    rest.get(OFFERS, (_req, res, ctx) =>
      res(ctx.json({ success: true, data: { loans } })),
    ),
  );
}

afterEach(cleanup);

describe("Consolidation — the empty catalogue is visible", () => {
  it("says there are no offers rather than showing a lender", async () => {
    serve([]);

    render(<ConsolidationPage />);

    expect(
      await screen.findByText("No consolidation offers available"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/rather show you nothing than a rate we made up/i),
    ).toBeInTheDocument();
  });

  it("shows none of the invented lenders", async () => {
    serve([]);

    render(<ConsolidationPage />);
    await screen.findByText("No consolidation offers available");

    for (const lender of ["SoFi", "Marcus by Goldman Sachs"]) {
      expect(screen.queryByText(lender)).not.toBeInTheDocument();
    }
    expect(screen.queryByText(/8\.99% - 25\.81%/)).not.toBeInTheDocument();
  });
});

describe("Consolidation — real offers when the catalogue is connected", () => {
  it("renders the product name and partner", async () => {
    serve([loan()]);

    render(<ConsolidationPage />);

    expect(await screen.findByText("Consolidation Loan")).toBeInTheDocument();
    expect(screen.getByText("Partner Bank")).toBeInTheDocument();
  });

  it("formats the APR range from the real terms", async () => {
    serve([loan()]);

    render(<ConsolidationPage />);

    expect(await screen.findByText("7.5% – 19.9% fixed")).toBeInTheDocument();
  });

  it("collapses a single-value APR rather than printing a fake range", async () => {
    serve([
      loan({
        product: {
          ...loan().product,
          terms: { apr: { min: 9, max: 9, type: "variable" } },
        },
      }),
    ]);

    render(<ConsolidationPage />);

    expect(await screen.findByText("9% variable")).toBeInTheDocument();
  });

  it("shows amount, term and estimated payment when present", async () => {
    serve([loan()]);

    render(<ConsolidationPage />);

    expect(await screen.findByText("$5,000 – $50,000")).toBeInTheDocument();
    expect(screen.getByText("2–7 years")).toBeInTheDocument();
    expect(screen.getByText("$412")).toBeInTheDocument();
  });

  it("omits fields the product does not carry", async () => {
    serve([
      loan({
        product: { productId: "p-2", name: "Bare", partner: "X", terms: {} },
        estimatedMonthlyPayment: undefined,
      }),
    ]);

    render(<ConsolidationPage />);

    await screen.findByText("Bare");
    // No blank labels, no NaN, no invented defaults.
    expect(screen.queryByText("APR")).not.toBeInTheDocument();
    expect(screen.queryByText("Est. monthly")).not.toBeInTheDocument();
  });
});

describe("Consolidation — the filter reaches the route", () => {
  it("sends subType when a loan type is chosen", async () => {
    serve([]);
    let lastUrl = "";
    server.use(
      rest.get(OFFERS, (req, res, ctx) => {
        lastUrl = req.url.search;
        return res(ctx.json({ success: true, data: { loans: [] } }));
      }),
    );

    render(<ConsolidationPage />);
    await screen.findByText("No consolidation offers available");

    await userEvent.click(
      screen.getByRole("button", { name: "Debt consolidation" }),
    );

    expect(lastUrl).toContain("category=loan");
    expect(lastUrl).toContain("subType=debt_consolidation");
  });

  it("sends no subType for the all-options filter", async () => {
    let lastUrl = "";
    server.use(
      rest.get(OFFERS, (req, res, ctx) => {
        lastUrl = req.url.search;
        return res(ctx.json({ success: true, data: { loans: [] } }));
      }),
    );

    render(<ConsolidationPage />);
    await screen.findByText("No consolidation offers available");

    expect(lastUrl).toContain("category=loan");
    expect(lastUrl).not.toContain("subType");
  });
});

describe("Consolidation — failure invents nothing", () => {
  it("says options are unavailable when the route fails", async () => {
    server.use(rest.get(OFFERS, (_req, res, ctx) => res(ctx.status(500))));

    render(<ConsolidationPage />);

    expect(
      await screen.findByText(/Consolidation options are unavailable/i),
    ).toBeInTheDocument();
  });

  it("says the service is unreachable when the network drops", async () => {
    server.use(rest.get(OFFERS, (_req, res) => res.networkError("offline")));

    render(<ConsolidationPage />);

    expect(
      await screen.findByText(/could not reach the offers service/i),
    ).toBeInTheDocument();
  });
});

describe("Consolidation — the constants are gone", () => {
  const raw = fs.readFileSync(
    path.join(process.cwd(), "src/app/marketplace/consolidation/page.tsx"),
    "utf8",
  );
  const source = raw
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

  it("declares no mockOptions", () => {
    expect(source).not.toContain("mockOptions");
  });

  it("names no lender and quotes no rate", () => {
    for (const literal of [
      "SoFi",
      "Marcus by Goldman",
      "8.99",
      "25.81",
      "6.99",
      "28.99",
    ]) {
      expect(source).not.toContain(literal);
    }
  });

  it("reads the live affiliate offers route", () => {
    expect(source).toContain("/api/affiliate/offers");
  });
});
