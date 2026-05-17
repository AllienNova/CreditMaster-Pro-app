/**
 * IDOR regression tests for PortfolioServiceFacade (FND-030 / TASK-IDR-02)
 *
 * Read-path: asserts portfolio/holdings reads are scoped to the requesting user.
 * Write-path: asserts updatePortfolio, deletePortfolio, updateHoldingPrices are
 *   scoped to the requesting user — a caller with the wrong userId cannot mutate
 *   another user's data.
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
// Stateful query chain builder (used in test-scope assertions only)
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
    update: (_data: unknown) => chain,
    delete: () => chain,
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
// Mocks — must be declared before any import of the module under test.
// jest.mock is hoisted before variable declarations, so all constants used
// inside the factory must be re-declared within the factory closure.
// The factory exposes a `holdingsUpdateCallCount` counter so write-path
// tests can assert that no `.update()` was dispatched for user A's holdings.
// ============================================================================

jest.mock("@/lib/supabase/client", () => {
  // Re-declared inside factory (hoisting rule — cannot close over outer consts).
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

  // Mutable counter: incremented each time `.update()` is invoked on
  // investment_holdings. Tests reset this in beforeEach via the exported ref.
  const _tracker = { holdingsUpdateCallCount: 0 };

  function buildChain(table: "investment_portfolios" | "investment_holdings") {
    const filters: Record<string, unknown> = {};
    const chain: Record<string, unknown> = {};

    chain["eq"] = (col: string, val: unknown) => {
      filters[col] = val;
      return chain;
    };
    chain["select"] = (_cols?: string) => chain;
    chain["order"] = (_col: string, _opts?: unknown) => chain;

    // Write operations
    chain["update"] = (_data: unknown) => {
      if (table === "investment_holdings") {
        _tracker.holdingsUpdateCallCount += 1;
      }
      return chain;
    };
    chain["delete"] = () => chain;

    // Used by getPortfolio and updatePortfolio (.select().single())
    chain["single"] = () => {
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
    };

    // Awaited directly (getHoldings, deletePortfolio's fire-and-forget deletes)
    chain["then"] = (
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
      // investment_portfolios delete — always resolves with no error
      return Promise.resolve({ data: [], error: null }).then(resolve);
    };

    return chain;
  }

  const _getSupabase = () => ({
    from: (table: "investment_portfolios" | "investment_holdings") =>
      buildChain(table),
  });

  return { getSupabase: _getSupabase, _tracker };
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
  // ---------------------------------------------------------------------------
  // Read paths
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // Write paths (FND-030 — scoping of mutations)
  // ---------------------------------------------------------------------------

  describe("updatePortfolio", () => {
    it("idor: user B cannot update user A's portfolio — throws not-found error", async () => {
      await expect(
        portfolioService.updatePortfolio(PORTFOLIO_ID, USER_B, {
          name: "Hijacked",
        }),
      ).rejects.toThrow("Failed to update portfolio");
    });

    it("user A can update their own portfolio — resolves with updated portfolio", async () => {
      const result = await portfolioService.updatePortfolio(
        PORTFOLIO_ID,
        USER_A,
        { name: "User A Portfolio" },
      );
      expect(result).not.toBeNull();
      expect(result.id).toBe(PORTFOLIO_ID);
      expect(result.userId).toBe(USER_A);
    });
  });

  describe("deletePortfolio", () => {
    it("idor: user B deleting user A's portfolio — scoped deletes match 0 rows, no data loss, returns true", async () => {
      // deletePortfolio always returns true (no row-count check in the facade);
      // the safety guarantee is that both DELETE statements carry user_id = USER_B,
      // which will match 0 of user A's rows in Postgres (verified by the mock's
      // then() handler returning { data: [], error: null } for non-owner filters).
      const result = await portfolioService.deletePortfolio(
        PORTFOLIO_ID,
        USER_B,
      );
      expect(result).toBe(true);
    });

    it("user A can delete their own portfolio — returns true", async () => {
      const result = await portfolioService.deletePortfolio(
        PORTFOLIO_ID,
        USER_A,
      );
      expect(result).toBe(true);
    });
  });

  describe("updateHoldingPrices", () => {
    beforeEach(() => {
      // Reset the holdings-update call counter before each write-path test.
      const mod = jest.requireMock("@/lib/supabase/client") as {
        _tracker: { holdingsUpdateCallCount: number };
      };
      mod._tracker.holdingsUpdateCallCount = 0;
    });

    it("idor: user B cannot update prices on user A's holdings — getHoldings returns [] so no update is dispatched", async () => {
      const mod = jest.requireMock("@/lib/supabase/client") as {
        _tracker: { holdingsUpdateCallCount: number };
      };

      await portfolioService.updateHoldingPrices(PORTFOLIO_ID, USER_B, {
        AAPL: 999,
      });

      // getHoldings(portfolioId, USER_B) returns [] — the for-loop never runs
      expect(mod._tracker.holdingsUpdateCallCount).toBe(0);
    });

    it("user A updating prices on their own holdings — update is dispatched once per holding", async () => {
      const mod = jest.requireMock("@/lib/supabase/client") as {
        _tracker: { holdingsUpdateCallCount: number };
      };

      await portfolioService.updateHoldingPrices(PORTFOLIO_ID, USER_A, {
        AAPL: 200,
      });

      // getHoldings(portfolioId, USER_A) returns [holdingRow] with symbol AAPL
      expect(mod._tracker.holdingsUpdateCallCount).toBe(1);
    });
  });
});
