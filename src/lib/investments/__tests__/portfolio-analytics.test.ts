/**
 * Unit tests for division-by-zero guards in PortfolioAnalytics.calculateRiskMetrics
 *
 * TASK-INV-W7-01 / FND-031 — four ratio fields must be null (not Infinity/NaN)
 * when their denominators are zero.
 */

import { PortfolioAnalytics } from "../portfolio-analytics";
import { marketDataService } from "../market-data-service";
import { portfolioService } from "../portfolio-service";
import { redisCache } from "@/lib/cache/redis-cache-service";

// ── mocks ──────────────────────────────────────────────────────────────────

jest.mock("../market-data-service", () => ({
  marketDataService: {
    getHistory: jest.fn(),
    getQuote: jest.fn(),
    cleanup: jest.fn(),
  },
}));

jest.mock("../portfolio-service", () => ({
  portfolioService: {
    getPortfolio: jest.fn(),
    getHoldings: jest.fn(),
    getPortfolioHoldings: jest.fn(),
  },
}));

jest.mock("@/lib/cache/redis-cache-service", () => ({
  redisCache: {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => ({ data: null, error: null })),
        })),
      })),
    })),
  })),
}));

// ── helpers ────────────────────────────────────────────────────────────────

const PORTFOLIO_ID = "00000000-0000-0000-0000-000000000001";
const BENCHMARK = "SPY";

const mockPortfolio = {
  id: PORTFOLIO_ID,
  userId: "user-1",
  name: "Test",
  totalValue: 10000,
  benchmark: BENCHMARK,
};

const mockHoldings = [
  {
    symbol: "AAPL",
    shares: 10,
    currentValue: 5000,
    currentPrice: 500,
    country: "US",
  },
  {
    symbol: "MSFT",
    shares: 10,
    currentValue: 5000,
    currentPrice: 500,
    country: "US",
  },
];

/**
 * Build a price history where every day's return is exactly `dailyReturn`.
 * When dailyReturn = 0 the price is flat → stdDev = 0 (zero volatility).
 */
function buildFlatHistory(
  days: number,
  startPrice: number,
  dailyReturn: number,
): { data: Array<{ timestamp: Date; close: number }> } {
  const data: Array<{ timestamp: Date; close: number }> = [];
  let price = startPrice;
  for (let i = 0; i < days; i++) {
    data.push({
      timestamp: new Date(Date.now() - (days - i) * 86_400_000),
      close: price,
    });
    price = price * (1 + dailyReturn);
  }
  return { data };
}

/**
 * Build a price history that is strictly monotonically increasing.
 * No down-days → downsideDeviation = 0.
 */
function buildStrictlyUpHistory(
  days: number,
): { data: Array<{ timestamp: Date; close: number }> } {
  return buildFlatHistory(days, 100, 0.001); // +0.1 % every day
}

/**
 * Build a price history with no drawdown: price only goes up, never down.
 * maxDrawdown = 0 → calmarRatio denominator = 0.
 */
function buildNoDrawdownHistory(
  days: number,
): { data: Array<{ timestamp: Date; close: number }> } {
  return buildFlatHistory(days, 100, 0.001);
}

function setupMocks(
  portfolioHistory: { data: Array<{ timestamp: Date; close: number }> },
  benchmarkHistory: { data: Array<{ timestamp: Date; close: number }> },
): void {
  (redisCache.get as jest.Mock).mockResolvedValue(null);
  (redisCache.set as jest.Mock).mockResolvedValue(undefined);
  (portfolioService.getPortfolio as jest.Mock).mockResolvedValue(mockPortfolio);
  (portfolioService.getHoldings as jest.Mock).mockResolvedValue(mockHoldings);
  (marketDataService.getHistory as jest.Mock).mockImplementation(
    (symbol: string) => {
      if (symbol === BENCHMARK) return Promise.resolve(benchmarkHistory);
      return Promise.resolve(portfolioHistory);
    },
  );
}

// ── tests ──────────────────────────────────────────────────────────────────

describe("PortfolioAnalytics.calculateRiskMetrics — division-by-zero guards (TASK-INV-W7-01)", () => {
  const analytics = new PortfolioAnalytics("user-1");

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── 1. sharpeRatio: denominator is annualizedVolatility ──────────────────

  it("sharpeRatio is null (not Infinity/NaN) when annualizedVolatility is 0", async () => {
    // Flat price series → stdDev of returns = 0 → annualizedVolatility = 0
    const flat = buildFlatHistory(60, 100, 0);
    const benchmarkUp = buildStrictlyUpHistory(60);
    setupMocks(flat, benchmarkUp);

    const metrics = await analytics.calculateRiskMetrics(PORTFOLIO_ID, "1M");

    expect(metrics.sharpeRatio).toBeNull();
    expect(metrics.sharpeRatio).not.toBe(Infinity);
    expect(metrics.sharpeRatio).not.toBe(-Infinity);
    // Verify null is honest: not 0 (which would be a plausible but wrong value)
    expect(metrics.sharpeRatio).not.toBe(0);
  });

  // ── 2. sortinoRatio: denominator is downsideDeviation * sqrt(252) ────────

  it("sortinoRatio is null (not Infinity/NaN) when downsideDeviation is 0", async () => {
    // Strictly increasing prices → no down-days → downsideDeviation = 0
    const up = buildStrictlyUpHistory(60);
    const benchmarkUp = buildStrictlyUpHistory(60);
    setupMocks(up, benchmarkUp);

    const metrics = await analytics.calculateRiskMetrics(PORTFOLIO_ID, "1M");

    expect(metrics.sortinoRatio).toBeNull();
    expect(metrics.sortinoRatio).not.toBe(Infinity);
    expect(metrics.sortinoRatio).not.toBe(-Infinity);
    expect(
      metrics.sortinoRatio === null || Number.isFinite(metrics.sortinoRatio),
    ).toBe(true);
  });

  // ── 3. calmarRatio: denominator is Math.abs(maxDrawdown) ────────────────

  it("calmarRatio is null (not Infinity/NaN) when maxDrawdown is 0", async () => {
    // Strictly increasing prices → no drawdown → maxDrawdown = 0
    const up = buildNoDrawdownHistory(60);
    const benchmarkUp = buildStrictlyUpHistory(60);
    setupMocks(up, benchmarkUp);

    const metrics = await analytics.calculateRiskMetrics(PORTFOLIO_ID, "1M");

    expect(metrics.calmarRatio).toBeNull();
    expect(metrics.calmarRatio).not.toBe(Infinity);
    expect(metrics.calmarRatio).not.toBe(-Infinity);
    expect(
      metrics.calmarRatio === null || Number.isFinite(metrics.calmarRatio),
    ).toBe(true);
  });

  // ── 4. informationRatio: denominator is trackingError ───────────────────

  it("informationRatio is null (not Infinity/NaN) when trackingError is 0", async () => {
    // Identical portfolio and benchmark price series → diff returns = 0 → trackingError = 0
    const identical = buildFlatHistory(60, 100, 0.001);
    setupMocks(identical, identical);

    const metrics = await analytics.calculateRiskMetrics(PORTFOLIO_ID, "1M");

    expect(metrics.informationRatio).toBeNull();
    expect(metrics.informationRatio).not.toBe(Infinity);
    expect(metrics.informationRatio).not.toBe(-Infinity);
    expect(
      metrics.informationRatio === null ||
        Number.isFinite(metrics.informationRatio),
    ).toBe(true);
  });

  // ── 5. beta/alpha/rSquared are null when benchmark is flat (benchmarkVariance = 0) ──

  it("beta, alpha, rSquared, and informationRatio are null when benchmark is flat", async () => {
    // Flat benchmark → benchmarkVariance = 0 → beta/alpha/rSquared undefined
    // Portfolio has mixed returns so its own denominators are non-zero
    const mixedPortfolio: Array<{ timestamp: Date; close: number }> = [];
    let price = 100;
    for (let i = 0; i < 60; i++) {
      mixedPortfolio.push({
        timestamp: new Date(Date.now() - (60 - i) * 86_400_000),
        close: price,
      });
      price *= i % 3 === 0 ? 0.99 : 1.005;
    }
    const flatBenchmark = buildFlatHistory(60, 100, 0);

    (redisCache.get as jest.Mock).mockResolvedValue(null);
    (redisCache.set as jest.Mock).mockResolvedValue(undefined);
    (portfolioService.getPortfolio as jest.Mock).mockResolvedValue(mockPortfolio);
    (portfolioService.getHoldings as jest.Mock).mockResolvedValue(mockHoldings);
    (marketDataService.getHistory as jest.Mock).mockImplementation(
      (symbol: string) => {
        if (symbol === BENCHMARK) return Promise.resolve(flatBenchmark);
        return Promise.resolve({ data: mixedPortfolio });
      },
    );

    const metrics = await analytics.calculateRiskMetrics(PORTFOLIO_ID, "1M");

    // Flat benchmark → undefined ratio; never Infinity/NaN
    expect(metrics.beta).toBeNull();
    expect(metrics.alpha).toBeNull();
    expect(metrics.rSquared).toBeNull();
    // informationRatio must also be null because alpha is null
    expect(metrics.informationRatio).toBeNull();
    expect(metrics.beta).not.toBe(Infinity);
    expect(metrics.alpha).not.toBe(Infinity);
  });

  // ── 6. Happy-path: all ratios are explicitly non-null finite numbers ───────

  it("all four ratios are non-null finite numbers when denominators are non-zero", async () => {
    // Mixed up/down returns → non-zero volatility, non-zero downside deviation,
    // non-zero drawdown, and benchmark differs from portfolio → non-zero trackingError
    const days = 60;
    const portfolioData: Array<{ timestamp: Date; close: number }> = [];
    const benchmarkData: Array<{ timestamp: Date; close: number }> = [];

    let pPrice = 100;
    let bPrice = 100;
    for (let i = 0; i < days; i++) {
      const pRet = i % 3 === 0 ? -0.01 : 0.005; // mixed
      const bRet = i % 4 === 0 ? -0.008 : 0.004; // different pattern
      portfolioData.push({
        timestamp: new Date(Date.now() - (days - i) * 86_400_000),
        close: pPrice,
      });
      benchmarkData.push({
        timestamp: new Date(Date.now() - (days - i) * 86_400_000),
        close: bPrice,
      });
      pPrice *= 1 + pRet;
      bPrice *= 1 + bRet;
    }

    (redisCache.get as jest.Mock).mockResolvedValue(null);
    (redisCache.set as jest.Mock).mockResolvedValue(undefined);
    (portfolioService.getPortfolio as jest.Mock).mockResolvedValue(
      mockPortfolio,
    );
    (portfolioService.getHoldings as jest.Mock).mockResolvedValue(mockHoldings);
    (marketDataService.getHistory as jest.Mock).mockImplementation(
      (symbol: string) => {
        if (symbol === BENCHMARK)
          return Promise.resolve({ data: benchmarkData });
        return Promise.resolve({ data: portfolioData });
      },
    );

    const metrics = await analytics.calculateRiskMetrics(PORTFOLIO_ID, "1M");

    // Guards must discriminate: non-zero denominators → explicitly non-null
    expect(metrics.sharpeRatio).not.toBeNull();
    expect(metrics.sortinoRatio).not.toBeNull();
    expect(metrics.calmarRatio).not.toBeNull();
    expect(metrics.informationRatio).not.toBeNull();

    // And the values must be finite (not Infinity/NaN)
    expect(Number.isFinite(metrics.sharpeRatio)).toBe(true);
    expect(Number.isFinite(metrics.sortinoRatio)).toBe(true);
    expect(Number.isFinite(metrics.calmarRatio)).toBe(true);
    expect(Number.isFinite(metrics.informationRatio)).toBe(true);
  });
});
