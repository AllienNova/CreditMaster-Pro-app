/**
 * Portfolio Rebalancing — real-portfolio wiring regression coverage.
 *
 * The page had no fetch. It told every visitor they held $27,500 of US Stocks
 * at 55% against a 50% target, and then instructed them: sell US Stocks
 * $2,500, buy International $1,000, buy Bonds $1,500.
 *
 * That is a trade list, not a summary. Someone who trusted it would have placed
 * orders against a portfolio they do not own — the other fabricated screens
 * misinform, this one instructs.
 *
 * It now reads the real portfolio and posts it for analysis. These tests cover
 * the three ways this could quietly go wrong again: showing a model allocation
 * as though it were a position when there are no holdings, presenting trades
 * that were not computed, and assuming a risk tolerance nobody recorded.
 *
 * ON MOCKING: MSW handler override, not `global.fetch`.
 */

import fs from "fs";
import path from "path";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { rest } from "msw";

import { server } from "@/__tests__/mocks/server";
import RebalancePage from "../page";

const PORTFOLIO = "http://localhost/api/investments/portfolio";
const ANALYSIS = "http://localhost/api/investments/allocation-analysis";

function serve({
  portfolio = {
    id: "p-1",
    holdings: [{ symbol: "VTI", shares: 10 }],
    totalValue: 50_000,
  },
  analysis = {
    currentAllocations: [
      {
        assetClass: "us_stocks",
        percentage: 62.5,
        value: 31_250,
        targetPercentage: 50,
        deviation: 12.5,
      },
      {
        assetClass: "bonds",
        percentage: 37.5,
        value: 18_750,
        targetPercentage: 50,
        deviation: -12.5,
      },
    ],
    deviationFromTarget: 12.5,
    needsRebalancing: true,
    rebalancingRecommendations: [
      {
        symbol: "VTI",
        currentValue: 31_250,
        currentPercentage: 62.5,
        targetPercentage: 50,
        action: "sell",
        sharesToTrade: 2,
        valueToTrade: 6_250,
        reason: "Above target weight",
        priority: "high",
      },
      {
        symbol: "BND",
        currentValue: 18_750,
        currentPercentage: 37.5,
        targetPercentage: 50,
        action: "hold",
        sharesToTrade: 0,
        valueToTrade: 0,
        reason: "Within range",
        priority: "low",
      },
    ],
  },
}: Record<string, unknown> = {}) {
  server.use(
    rest.get(PORTFOLIO, (_req, res, ctx) =>
      res(ctx.json({ success: true, data: portfolio })),
    ),
    rest.post(ANALYSIS, (_req, res, ctx) =>
      res(ctx.json({ success: true, data: analysis })),
    ),
  );
}

afterEach(cleanup);

describe("Rebalancing — real allocation", () => {
  it("shows the allocation the analysis returned", async () => {
    serve();

    render(<RebalancePage />);

    expect(await screen.findByText("Us Stocks")).toBeInTheDocument();
    expect(screen.getByText(/62\.5%/)).toBeInTheDocument();
    expect(screen.getByText("$31,250")).toBeInTheDocument();
  });

  it("reports drift from the analysis, not a fixed figure", async () => {
    serve();

    render(<RebalancePage />);

    expect(
      await screen.findByText(/Overall deviation 12\.5%/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/allocation has drifted from the target/i),
    ).toBeInTheDocument();
  });

  it("says the allocation is on target when it is", async () => {
    serve({
      analysis: {
        currentAllocations: [],
        deviationFromTarget: 0.4,
        needsRebalancing: false,
        rebalancingRecommendations: [],
      },
    });

    render(<RebalancePage />);

    expect(
      await screen.findByText(/allocation is close to the target/i),
    ).toBeInTheDocument();
  });
});

describe("Rebalancing — trades", () => {
  it("lists only the trades the analysis produced", async () => {
    serve();

    render(<RebalancePage />);

    expect(await screen.findByText("sell VTI")).toBeInTheDocument();
    expect(screen.getByText("$6,250")).toBeInTheDocument();
    // "hold" is not a trade.
    expect(screen.queryByText(/BND/)).not.toBeInTheDocument();
  });

  it("says nothing to trade rather than inventing one", async () => {
    serve({
      analysis: {
        currentAllocations: [],
        deviationFromTarget: 0.2,
        needsRebalancing: false,
        rebalancingRecommendations: [],
      },
    });

    render(<RebalancePage />);

    expect(await screen.findByText(/Nothing to trade/i)).toBeInTheDocument();
  });

  it("states that Fynvita does not place the trades", async () => {
    serve();

    render(<RebalancePage />);

    expect(
      await screen.findByText(/does not place these for you/i),
    ).toBeInTheDocument();
  });

  it("shows no trades when the analysis call fails", async () => {
    serve();
    server.use(rest.post(ANALYSIS, (_req, res, ctx) => res(ctx.status(500))));

    render(<RebalancePage />);

    expect(
      await screen.findByText(/not going to show you trades we did not compute/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/sell/i)).not.toBeInTheDocument();
  });
});

describe("Rebalancing — risk tolerance is asked, not assumed", () => {
  it("sends the selected risk tolerance to the analysis", async () => {
    serve();
    let sent: Record<string, unknown> | null = null;
    server.use(
      rest.post(ANALYSIS, async (req, res, ctx) => {
        sent = await req.json();
        return res(ctx.json({ success: true, data: { currentAllocations: [], deviationFromTarget: 0, needsRebalancing: false, rebalancingRecommendations: [] } }));
      }),
    );

    render(<RebalancePage />);
    await waitFor(() => expect(sent).not.toBeNull());
    expect(sent!.riskTolerance).toBe("moderate");

    await userEvent.selectOptions(
      screen.getByLabelText("Risk tolerance"),
      "aggressive",
    );

    await waitFor(() => expect(sent!.riskTolerance).toBe("aggressive"));
  });

  it("tells the user the default is a default", async () => {
    serve();

    render(<RebalancePage />);

    expect(
      await screen.findByText(/We have not recorded yours/i),
    ).toBeInTheDocument();
  });
});

describe("Rebalancing — absences read as absent", () => {
  it("shows an empty state rather than a model allocation", async () => {
    serve({ portfolio: { id: "p-1", holdings: [], totalValue: 0 } });

    render(<RebalancePage />);

    expect(
      await screen.findByText(/No holdings to rebalance/i),
    ).toBeInTheDocument();
    // A target model is not a position.
    expect(screen.queryByText(/Suggested trades/i)).not.toBeInTheDocument();
  });

  it("invents nothing when the portfolio call fails", async () => {
    server.use(rest.get(PORTFOLIO, (_req, res, ctx) => res(ctx.status(500))));

    render(<RebalancePage />);

    expect(
      await screen.findByText(/Rebalancing is unavailable/i),
    ).toBeInTheDocument();
    for (const value of ["$27,500", "$2,500", "$1,500"]) {
      expect(screen.queryByText(value)).not.toBeInTheDocument();
    }
  });
});

describe("Rebalancing — the constants are gone", () => {
  const raw = fs.readFileSync(
    path.join(process.cwd(), "src/app/investments/rebalance/page.tsx"),
    "utf8",
  );
  const source = raw
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

  it.each(["MOCK_ALLOCATIONS", "MOCK_TRADES"])(
    "no longer declares %s",
    (name) => {
      expect(source).not.toContain(name);
    },
  );

  it("holds none of the invented amounts", () => {
    for (const literal of ["27500", "2500", "1500", "1000"]) {
      expect(source).not.toContain(literal);
    }
  });

  it("reads the portfolio and posts it for analysis", () => {
    expect(source).toContain("/api/investments/portfolio");
    expect(source).toContain("/api/investments/allocation-analysis");
    expect(source).toContain('method: "POST"');
  });
});
