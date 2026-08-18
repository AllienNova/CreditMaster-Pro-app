/**
 * Crypto Portfolio — real-wallet wiring regression coverage.
 *
 * The page had no fetch. It showed every visitor a Coinbase wallet worth
 * $45,230 holding 0.35 BTC, inside an $86,530 portfolio up $15,230 (21.4%)
 * unrealised and $2,180 (2.6%) "today".
 *
 * The feature was built and unreachable: crypto_wallets has existed since
 * migration 20260731000082 and crypto-wallet-service.ts makes 33 database
 * calls against it, but nothing imported the service except a barrel and its
 * own test. GET /api/financial/crypto was added to close that gap.
 *
 * These tests cover the wiring AND the one thing most likely to creep back:
 * a 24-hour change. Nothing in the data has one — not the summary, not a
 * holding — so nothing may display one.
 *
 * ON MOCKING: MSW handler override, not `global.fetch`.
 */

import fs from "fs";
import path from "path";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom";
import { rest } from "msw";

import { server } from "@/__tests__/mocks/server";
import CryptoPortfolioPage from "../page";

const CRYPTO = "http://localhost/api/financial/crypto";

function serve({
  wallets = [
    {
      id: "w-1",
      name: "Ledger",
      type: "cold",
      isConnected: true,
      totalValueUsd: 12_400,
      holdings: [
        {
          id: "h-1",
          symbol: "ETH",
          name: "Ethereum",
          quantity: 4,
          priceUsd: 3_100,
          valueUsd: 12_400,
          costBasis: 10_000,
          unrealizedGainLoss: 2_400,
          unrealizedGainLossPercent: 24,
        },
      ],
    },
  ],
  summary = {
    totalValue: 12_400,
    totalCostBasis: 10_000,
    unrealizedGainLoss: 2_400,
    unrealizedGainLossPercent: 24,
    totalWallets: 1,
    totalAssets: 1,
  },
}: Record<string, unknown> = {}) {
  server.use(
    rest.get(CRYPTO, (_req, res, ctx) =>
      res(ctx.json({ success: true, data: { wallets, summary } })),
    ),
  );
}

afterEach(cleanup);

describe("Crypto — real wallets", () => {
  it("renders the wallets the route returned", async () => {
    serve();

    render(<CryptoPortfolioPage />);

    expect(await screen.findByText("Ledger")).toBeInTheDocument();
    expect(screen.getByText("Cold storage")).toBeInTheDocument();
  });

  it("renders each holding with its own quantity and price", async () => {
    serve();

    render(<CryptoPortfolioPage />);

    expect(await screen.findByText("ETH")).toBeInTheDocument();
    expect(screen.getByText(/4 @ \$3,100/)).toBeInTheDocument();
    // Twice, legitimately: the summary tile and this holding — one wallet, one
    // asset, so the portfolio percentage and the holding's are the same number.
    expect(screen.getAllByText("+24.00%")).toHaveLength(2);
  });

  it("shows the summary figures the service computes", async () => {
    serve();

    render(<CryptoPortfolioPage />);

    // The page's formatter is currency-default, so 12400 renders "$12,400.00".
    expect(await screen.findAllByText("$12,400.00")).not.toHaveLength(0);
    expect(screen.getByText("$10,000.00")).toBeInTheDocument();
    expect(screen.getByText("Cost basis")).toBeInTheDocument();
  });

  it("labels a defi wallet, a type the old union did not have", async () => {
    serve({
      wallets: [
        {
          id: "w-2",
          name: "Aave",
          type: "defi",
          totalValueUsd: 500,
          holdings: [],
        },
      ],
    });

    render(<CryptoPortfolioPage />);

    expect(await screen.findByText("DeFi")).toBeInTheDocument();
  });

  it("flags a wallet that is not connected", async () => {
    serve({
      wallets: [
        {
          id: "w-3",
          name: "Old exchange",
          type: "exchange",
          isConnected: false,
          totalValueUsd: 0,
          holdings: [],
        },
      ],
    });

    render(<CryptoPortfolioPage />);

    expect(await screen.findByText("Not connected")).toBeInTheDocument();
  });
});

describe("Crypto — no 24-hour change anywhere", () => {
  it("shows no daily move, because nothing computes one", async () => {
    serve();

    render(<CryptoPortfolioPage />);
    await screen.findByText("Ledger");

    // CryptoPortfolioSummary has no change24h, and neither does CryptoHolding.
    // Prices are stored with a lastUpdated and no prior price to difference.
    expect(screen.queryByText(/24h/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/today/i)).not.toBeInTheDocument();
    expect(screen.queryByText("$2,180")).not.toBeInTheDocument();
  });
});

describe("Crypto — absences read as absent", () => {
  it("says no wallets are connected rather than showing one", async () => {
    serve({ wallets: [], summary: null });

    render(<CryptoPortfolioPage />);

    expect(await screen.findByText("No wallets connected")).toBeInTheDocument();
    expect(screen.queryByText(/45,230/)).not.toBeInTheDocument();
  });

  it("says a wallet is empty rather than inventing a holding", async () => {
    serve({
      wallets: [
        { id: "w-4", name: "Fresh", type: "hot", totalValueUsd: 0, holdings: [] },
      ],
    });

    render(<CryptoPortfolioPage />);

    expect(
      await screen.findByText(/No holdings recorded in this wallet/i),
    ).toBeInTheDocument();
  });

  it("invents nothing when the route fails", async () => {
    server.use(rest.get(CRYPTO, (_req, res, ctx) => res(ctx.status(500))));

    render(<CryptoPortfolioPage />);

    expect(await screen.findByText(/Crypto is unavailable/i)).toBeInTheDocument();
    for (const value of ["$45,230", "$86,530", "0.35"]) {
      expect(screen.queryByText(value)).not.toBeInTheDocument();
    }
  });

  it("says the service is unreachable when the network drops", async () => {
    server.use(rest.get(CRYPTO, (_req, res) => res.networkError("offline")));

    render(<CryptoPortfolioPage />);

    expect(
      await screen.findByText(/could not reach the crypto service/i),
    ).toBeInTheDocument();
  });
});

describe("Crypto — the constants are gone", () => {
  const raw = fs.readFileSync(
    path.join(process.cwd(), "src/app/financial/crypto/page.tsx"),
    "utf8",
  );
  const source = raw
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

  it.each(["MOCK_WALLETS", "MOCK_SUMMARY"])(
    "no longer declares %s",
    (name) => {
      expect(source).not.toContain(name);
    },
  );

  it("holds none of the invented amounts", () => {
    for (const literal of ["45230", "86530", "71300", "15230", "2180"]) {
      expect(source).not.toContain(literal);
    }
  });

  it("reads the route that exposes the real service", () => {
    expect(source).toContain("/api/financial/crypto");
  });

  it("follows the service's field names rather than the old local ones", () => {
    // totalValueUsd, not totalValue; unrealizedGainLoss, not gainLoss.
    expect(source).toContain("totalValueUsd");
    expect(source).toContain("unrealizedGainLossPercent");
    expect(source).not.toContain("change24h");
  });
});
