/**
 * IDOR regression tests for PortfolioServiceFacade (FND-030 / TASK-IDR-02)
 *
 * Asserts that portfolio reads are scoped to the requesting user.
 * A user who does NOT own a portfolio must receive null / [] rather than
 * another user's data.
 *
 * Mocking style mirrors src/app/api/investments/holdings/[id]/__tests__/route.test.ts.
 */

const PORTFOLIO_ID = "portfolio-A";
const USER_A = "user-a-id";
const USER_B = "user-b-id";

const portfolioRow = {
  id: PORTFOLIO_ID,
  user_id: USER_A,
  name: "User A Portfolio",
  total_value: 10000,
  description: null,
  created_at: "2026-01-01T00:00:00.000Z",
  last_updated_at: "2026-01-01T00:00:00.000Z",
};

const holdingRow = {
  id: "holding-1",
  portfolio_id: PORTFOLIO_ID,
  user_id: USER_A,
  symbol: "AAPL",
  quantity: 10,
  average_cost: 150,
  current_price: 180,
  current_value: 1800,
  sector: null,
  asset_type: null,
  country: null,
  created_at: "2026-01-01T00:00:00.000Z",
};

// ============================================================================
// Stateful query chain builder
// Records eq() calls; matches against DB fixtures at resolve time.
// ============================================================================

function makeChain(table: "investment_portfolios" | "investment_holdings") {
  const filters: Record<string, unknown> = {};
  const chain = {
    select: (_cols?: string) => chain,
    eq: (col: string, val: unknown) => {
      filters[col] = val;
      return chain;
    },
    order: (_col: string, _opts?: unknown) => chain,
    // Used by getPortfolio (expects a single row or PGRST116)
    single: () => {
      if (table === "investment_portfolios") {
        const owned =
          filters["id"] === PORTFOLIO_ID && filters["user_id"] === USER_A;
        return Promise.resolve(
          owned
            ? { data: portfolioRow, error: null }
            : { data: null, error: { code: "PGRST116", message: "Not found" } },
        );
      }
      return Promise.resolve({
        data: null,
        error: { code: "PGRST116", message: "Not found" },
      });
    },
    // Used by getHoldings (array result awaited directly)
    then: (
      resolve: (v: { data: unknown[]; error: null }) => unknown,
      reject?: (e: unknown) => unknown,
    ) => {
      void reject;
      if (table === "investment_holdings") {
        const owned =
          filters["portfolio_id"] === PORTFOLIO_ID &&
          filters["user_id"] === USER_A;
        return Promise.resolve({
          data: owned ? [holdingRow] : [],
          error: null,
        }).then(resolve);
      }
      return Promise.resolve({ data: [], error: null }).then(resolve);
    },
  };
  return chain;
}

// ============================================================================
// Mocks — must be called before any import of the module under test.
// The factory function cannot reference variables defined in test scope
// (jest.mock is hoisted before variable declarations). We build the mock
// object inline; individual tests control behaviour via the chain builder.
// ============================================================================

jest.mock("@/lib/supabase/client", () => {
  // These constants are re-declared here so the factory closure has them.
  const _PORTFOLIO_ID = "portfolio-A";
  const _USER_A = "user-a-id";
  const _portfolioRow = {
    id: _PORTFOLIO_ID,
    user_id: _USER_A,
    name: "User A Portfolio",
    total_value: 10000,
    description: null,
    created_at: "2026-01-01T00:00:00.000Z",
    last_updated_at: "2026-01-01T00:00:00.000Z",
  };
  const _holdingRow = {
    id: "holding-1",
    portfolio_id: _PORTFOLIO_ID,
    user_id: _USER_A,
    symbol: "AAPL",
    quantity: 10,
    average_cost: 150,
    current_price: 180,
    current_value: 1800,
    sector: null,
    asset_type: null,
    country: null,
    created_at: "2026-01-01T00:00:00.000Z",
  };

  function buildChain(table: "investment_portfolios" | "investment_holdings") {
    const filters: Record<string, unknown> = {};
    const chain = {
      select: (_cols?: string) => chain,
      eq: (col: string, val: unknown) => {
        filters[col] = val;
        return chain;
      },
      order: (_col: string, _opts?: unknown) => chain,
      single: () => {
        if (table === "investment_portfolios") {
          const owned =
            filters["id"] === _PORTFOLIO_ID && filters["user_id"] === _USER_A;
          return Promise.resolve(
            owned
              ? { data: _portfolioRow, error: null }
              : {
                  data: null,
                  error: { code: "PGRST116", message: "Not found" },
                },
          );
        }
        return Promise.resolve({
          data: null,
          error: { code: "PGRST116", message: "Not found" },
        });
      },
      then: (
        resolve: (v: { data: unknown[]; error: null }) => unknown,
        reject?: (e: unknown) => unknown,
      ) => {
        void reject;
        if (table === "investment_holdings") {
          const owned =
            filters["portfolio_id"] === _PORTFOLIO_ID &&
            filters["user_id"] === _USER_A;
          return Promise.resolve({
            data: owned ? [_holdingRow] : [],
            error: null,
          }).then(resolve);
        }
        return Promise.resolve({ data: [], error: null }).then(resolve);
      },
    };
    return chain;
  }

  return {
    getSupabase: () => ({
      from: (table: "investment_portfolios" | "investment_holdings") =>
        buildChain(table),
    }),
  };
});

jest.mock("@/lib/investments/services/PortfolioService", () => ({
  PortfolioService: jest.fn().mockImplementation(() => ({
    getPortfolios: jest.fn().mockResolvedValue([]),
    createPortfolio: jest.fn(),
  })),
}));

// ============================================================================
// Import under test (after mocks)
// ============================================================================

import { portfolioService } from "@/lib/investments/portfolio-service";

// ============================================================================
// Tests
// ============================================================================

describe("idor — PortfolioServiceFacade user-scoping (FND-030)", () => {
  describe("getPortfolio", () => {
    it("idor: user B cannot read user A's portfolio — resolves null", async () => {
      const result = await portfolioService.getPortfolio(PORTFOLIO_ID, USER_B);
      expect(result).toBeNull();
    });

    it("user A can read their own portfolio", async () => {
      const result = await portfolioService.getPortfolio(PORTFOLIO_ID, USER_A);
      expect(result).not.toBeNull();
      expect(result?.id).toBe(PORTFOLIO_ID);
      expect(result?.userId).toBe(USER_A);
    });
  });

  describe("getHoldings", () => {
    it("idor: user B cannot read user A's holdings — resolves empty array", async () => {
      const result = await portfolioService.getHoldings(PORTFOLIO_ID, USER_B);
      expect(result).toEqual([]);
    });

    it("user A can read their own holdings", async () => {
      const result = await portfolioService.getHoldings(PORTFOLIO_ID, USER_A);
      expect(result).toHaveLength(1);
      expect(result[0].symbol).toBe("AAPL");
    });
  });

  describe("getPortfolioHoldings", () => {
    it("idor: user B cannot read user A's holdings via alias — resolves empty array", async () => {
      const result = await portfolioService.getPortfolioHoldings(
        PORTFOLIO_ID,
        USER_B,
      );
      expect(result).toEqual([]);
    });
  });
});
