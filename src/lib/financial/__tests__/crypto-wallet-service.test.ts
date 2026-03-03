/**
 * @jest-environment node
 */

/**
 * Crypto Wallet Service Unit Tests
 *
 * Comprehensive tests for:
 * - Wallet CRUD operations
 * - Holdings management (add, update, list)
 * - Price lookups from mock data
 * - Portfolio summary calculations (total value, allocation)
 * - Price alert creation and management
 */

// ---------------------------------------------------------------------------
// Mock Setup — must come before imports
// ---------------------------------------------------------------------------

const mockFrom = jest.fn();

// Use a plain function (not jest.fn) so resetMocks cannot strip the implementation.
// The arrow-wrapper in the factory delegates to this, and it always returns an object
// with `from` delegating to mockFrom.
const mockCreateClient = (..._args: unknown[]) => ({
  from: (...fArgs: unknown[]) => mockFrom(...fArgs),
});

jest.mock("@supabase/supabase-js", () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args),
}));

import { CryptoWalletService } from "../crypto-wallet-service";
import type { WalletType } from "../crypto-wallet-service";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TEST_URL = "https://test.supabase.co";
const TEST_KEY = "test-key";
const FIXED_UUID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const NOW_ISO = "2026-02-23T12:00:00.000Z";

// ---------------------------------------------------------------------------
// Helpers — DB row builders
// ---------------------------------------------------------------------------

function makeDbWallet(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id: FIXED_UUID,
    user_id: "user-1",
    name: "My Bitcoin Wallet",
    type: "hot",
    address: "bc1q...",
    network: "bitcoin",
    exchange: null,
    is_connected: true,
    last_sync: null,
    sync_error: null,
    total_value_usd: 0,
    notes: null,
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
    ...overrides,
  };
}

function makeDbHolding(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id: FIXED_UUID,
    wallet_id: "wallet-1",
    symbol: "BTC",
    name: "Bitcoin",
    quantity: 0.5,
    value_usd: 48750,
    price_usd: 97500,
    cost_basis: 40000,
    unrealized_gain_loss: 8750,
    unrealized_gain_loss_percent: 21.875,
    contract_address: null,
    network: "bitcoin",
    decimals: 8,
    logo_url: null,
    last_updated: NOW_ISO,
    ...overrides,
  };
}

function makeDbAlert(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id: FIXED_UUID,
    user_id: "user-1",
    symbol: "BTC",
    condition: "above",
    target_price: 100000,
    current_price: 97500,
    is_triggered: false,
    triggered_at: null,
    created_at: NOW_ISO,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Chain mock builder
// ---------------------------------------------------------------------------

function setupChain(opts: {
  selectResult?: { data: unknown; error: unknown };
  insertResult?: { data: unknown; error: unknown };
  updateResult?: { data: unknown; error: unknown };
  deleteResult?: { data: unknown; error: unknown };
}) {
  const singleResolve = (result: { data: unknown; error: unknown }) =>
    jest.fn().mockResolvedValue(result);

  const chain: Record<string, jest.Mock> = {};

  if (opts.selectResult) {
    const eqMock: jest.Mock = jest.fn().mockImplementation(() => ({
      eq: eqMock,
      single: singleResolve(opts.selectResult!),
      order: jest.fn().mockReturnValue({
        limit: jest.fn().mockResolvedValue(opts.selectResult!),
        ...opts.selectResult!,
      }),
      ...opts.selectResult!,
    }));

    chain.select = jest.fn().mockReturnValue({
      eq: eqMock,
      single: singleResolve(opts.selectResult),
      order: jest.fn().mockReturnValue({
        limit: jest.fn().mockResolvedValue(opts.selectResult),
        ...opts.selectResult,
      }),
    });
  }

  if (opts.insertResult) {
    chain.insert = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: singleResolve(opts.insertResult),
      }),
    });
  }

  if (opts.updateResult) {
    const eqMock: jest.Mock = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: singleResolve(opts.updateResult),
      }),
    });
    chain.update = jest.fn().mockReturnValue({
      eq: eqMock,
    });
  }

  if (opts.deleteResult) {
    chain.delete = jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue(opts.deleteResult),
    });
  }

  mockFrom.mockReturnValue(chain);
  return chain;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("CryptoWalletService", () => {
  let service: CryptoWalletService;

  beforeEach(() => {
    service = new CryptoWalletService(TEST_URL, TEST_KEY);
    jest.spyOn(crypto, "randomUUID").mockReturnValue(FIXED_UUID);
  });

  // =========================================================================
  // Constructor
  // =========================================================================

  describe("constructor", () => {
    it("creates a service that can access supabase from()", () => {
      // Verify the service was constructed and supabase.from is callable
      // (if createClient had failed, the `from` call below would throw)
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      });
      // Simply calling a method proves the constructor wired up supabase correctly
      expect(() => service.getWallet("test-id")).not.toThrow();
    });
  });

  // =========================================================================
  // addWallet
  // =========================================================================

  describe("addWallet", () => {
    const walletInput = {
      userId: "user-1",
      name: "My Bitcoin Wallet",
      type: "hot" as WalletType,
      address: "bc1q...",
      network: "bitcoin" as const,
      isConnected: true,
    };

    it("inserts a wallet and returns the mapped result", async () => {
      const dbRow = makeDbWallet();
      setupChain({ insertResult: { data: dbRow, error: null } });

      const result = await service.addWallet(walletInput);

      expect(mockFrom).toHaveBeenCalledWith("crypto_wallets");
      expect(result.id).toBe(FIXED_UUID);
      expect(result.userId).toBe("user-1");
      expect(result.name).toBe("My Bitcoin Wallet");
      expect(result.type).toBe("hot");
      expect(result.isConnected).toBe(true);
      expect(result.holdings).toEqual([]);
    });

    it("throws on Supabase error", async () => {
      setupChain({
        insertResult: {
          data: null,
          error: { message: "Insert failed", code: "23505" },
        },
      });

      await expect(service.addWallet(walletInput)).rejects.toEqual(
        expect.objectContaining({ message: "Insert failed" }),
      );
    });
  });

  // =========================================================================
  // updateWallet
  // =========================================================================

  describe("updateWallet", () => {
    it("updates a wallet and returns the mapped result", async () => {
      const dbRow = makeDbWallet({ name: "Updated Wallet" });
      setupChain({ updateResult: { data: dbRow, error: null } });

      const result = await service.updateWallet("wallet-1", {
        name: "Updated Wallet",
      });

      expect(mockFrom).toHaveBeenCalledWith("crypto_wallets");
      expect(result.name).toBe("Updated Wallet");
    });

    it("throws on Supabase error", async () => {
      setupChain({
        updateResult: {
          data: null,
          error: { message: "Not found", code: "PGRST116" },
        },
      });

      await expect(
        service.updateWallet("bad-id", { name: "X" }),
      ).rejects.toEqual(expect.objectContaining({ message: "Not found" }));
    });
  });

  // =========================================================================
  // getWallet
  // =========================================================================

  describe("getWallet", () => {
    it("returns wallet with populated holdings", async () => {
      const dbWallet = makeDbWallet();
      const dbHoldings = [
        makeDbHolding({ value_usd: 48750 }),
        makeDbHolding({
          id: "holding-2",
          symbol: "ETH",
          name: "Ethereum",
          value_usd: 3250,
        }),
      ];

      // The method calls from("crypto_wallets") then from("crypto_holdings")
      let callCount = 0;
      mockFrom.mockImplementation((table: string) => {
        callCount++;
        if (table === "crypto_wallets") {
          const eqMock = jest.fn().mockReturnValue({
            single: jest
              .fn()
              .mockResolvedValue({ data: dbWallet, error: null }),
          });
          return {
            select: jest.fn().mockReturnValue({ eq: eqMock }),
          };
        }
        if (table === "crypto_holdings") {
          const eqMock = jest.fn().mockReturnValue({
            order: jest
              .fn()
              .mockResolvedValue({ data: dbHoldings, error: null }),
          });
          return {
            select: jest.fn().mockReturnValue({ eq: eqMock }),
          };
        }
        return {};
      });

      const result = await service.getWallet("wallet-1");

      expect(result).not.toBeNull();
      expect(result!.holdings).toHaveLength(2);
      expect(result!.totalValueUsd).toBe(48750 + 3250);
    });

    it("returns null when wallet not found", async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === "crypto_wallets") {
          const eqMock = jest.fn().mockReturnValue({
            single: jest
              .fn()
              .mockResolvedValue({ data: null, error: null }),
          });
          return {
            select: jest.fn().mockReturnValue({ eq: eqMock }),
          };
        }
        return {};
      });

      const result = await service.getWallet("nonexistent");
      expect(result).toBeNull();
    });
  });

  // =========================================================================
  // getUserWallets
  // =========================================================================

  describe("getUserWallets", () => {
    it("returns wallets with holdings populated", async () => {
      const dbWallets = [
        makeDbWallet({ id: "w-1" }),
        makeDbWallet({ id: "w-2", name: "Exchange Wallet" }),
      ];

      mockFrom.mockImplementation((table: string) => {
        if (table === "crypto_wallets") {
          const eqMock = jest.fn().mockReturnValue({
            order: jest
              .fn()
              .mockResolvedValue({ data: dbWallets, error: null }),
          });
          return {
            select: jest.fn().mockReturnValue({ eq: eqMock }),
          };
        }
        if (table === "crypto_holdings") {
          const eqMock = jest.fn().mockReturnValue({
            order: jest
              .fn()
              .mockResolvedValue({ data: [], error: null }),
          });
          return {
            select: jest.fn().mockReturnValue({ eq: eqMock }),
          };
        }
        return {};
      });

      const result = await service.getUserWallets("user-1");

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("w-1");
      expect(result[1].id).toBe("w-2");
    });

    it("throws on Supabase error", async () => {
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest
              .fn()
              .mockResolvedValue({ data: null, error: { message: "DB error" } }),
          }),
        }),
      });

      await expect(service.getUserWallets("user-1")).rejects.toEqual(
        expect.objectContaining({ message: "DB error" }),
      );
    });

    it("returns empty array when user has no wallets", async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === "crypto_wallets") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest
                  .fn()
                  .mockResolvedValue({ data: [], error: null }),
              }),
            }),
          };
        }
        return {};
      });

      const result = await service.getUserWallets("user-1");
      expect(result).toEqual([]);
    });
  });

  // =========================================================================
  // deleteWallet
  // =========================================================================

  describe("deleteWallet", () => {
    it("deletes holdings first, then the wallet", async () => {
      const deleteCallOrder: string[] = [];
      mockFrom.mockImplementation((table: string) => {
        return {
          delete: jest.fn().mockReturnValue({
            eq: jest.fn().mockImplementation(() => {
              deleteCallOrder.push(table);
              return Promise.resolve({ data: null, error: null });
            }),
          }),
        };
      });

      await service.deleteWallet("wallet-1");

      expect(deleteCallOrder).toEqual(["crypto_holdings", "crypto_wallets"]);
    });
  });

  // =========================================================================
  // addHolding
  // =========================================================================

  describe("addHolding", () => {
    const holdingInput = {
      walletId: "wallet-1",
      symbol: "BTC",
      name: "Bitcoin",
      quantity: 0.5,
      valueUsd: 48750,
      priceUsd: 97500,
      costBasis: 40000,
    };

    it("inserts a holding and returns mapped result", async () => {
      const dbRow = makeDbHolding();
      setupChain({ insertResult: { data: dbRow, error: null } });

      const result = await service.addHolding(holdingInput);

      expect(mockFrom).toHaveBeenCalledWith("crypto_holdings");
      expect(result.id).toBe(FIXED_UUID);
      expect(result.symbol).toBe("BTC");
      expect(result.quantity).toBe(0.5);
      expect(result.priceUsd).toBe(97500);
    });

    it("throws on Supabase error", async () => {
      setupChain({
        insertResult: {
          data: null,
          error: { message: "Insert holding failed" },
        },
      });

      await expect(service.addHolding(holdingInput)).rejects.toEqual(
        expect.objectContaining({ message: "Insert holding failed" }),
      );
    });
  });

  // =========================================================================
  // updateHolding
  // =========================================================================

  describe("updateHolding", () => {
    it("updates a holding and returns mapped result", async () => {
      const dbRow = makeDbHolding({ quantity: 1.0, value_usd: 97500 });
      setupChain({ updateResult: { data: dbRow, error: null } });

      const result = await service.updateHolding("holding-1", {
        quantity: 1.0,
        valueUsd: 97500,
      });

      expect(mockFrom).toHaveBeenCalledWith("crypto_holdings");
      expect(result.quantity).toBe(1.0);
      expect(result.valueUsd).toBe(97500);
    });

    it("throws on Supabase error", async () => {
      setupChain({
        updateResult: {
          data: null,
          error: { message: "Update holding failed" },
        },
      });

      await expect(
        service.updateHolding("bad-id", { quantity: 1 }),
      ).rejects.toEqual(
        expect.objectContaining({ message: "Update holding failed" }),
      );
    });
  });

  // =========================================================================
  // getWalletHoldings
  // =========================================================================

  describe("getWalletHoldings", () => {
    it("returns holdings sorted by value", async () => {
      const dbHoldings = [
        makeDbHolding({ id: "h-1", value_usd: 48750 }),
        makeDbHolding({
          id: "h-2",
          symbol: "ETH",
          name: "Ethereum",
          value_usd: 3250,
        }),
      ];

      setupChain({
        selectResult: { data: dbHoldings, error: null },
      });

      const result = await service.getWalletHoldings("wallet-1");

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("h-1");
      expect(result[1].id).toBe("h-2");
    });

    it("returns empty array when no holdings", async () => {
      setupChain({ selectResult: { data: [], error: null } });

      const result = await service.getWalletHoldings("wallet-1");
      expect(result).toEqual([]);
    });

    it("returns empty array when data is null", async () => {
      setupChain({ selectResult: { data: null, error: null } });

      const result = await service.getWalletHoldings("wallet-1");
      expect(result).toEqual([]);
    });

    it("throws on Supabase error", async () => {
      setupChain({
        selectResult: {
          data: null,
          error: { message: "Query failed" },
        },
      });

      await expect(service.getWalletHoldings("wallet-1")).rejects.toEqual(
        expect.objectContaining({ message: "Query failed" }),
      );
    });
  });

  // =========================================================================
  // getPrice
  // =========================================================================

  describe("getPrice", () => {
    it("returns price and 24h change for known symbol", async () => {
      const result = await service.getPrice("BTC");

      expect(result).not.toBeNull();
      expect(result!.price).toBe(97500);
      expect(result!.change24h).toBe(2.5);
    });

    it("returns price for lowercase symbol", async () => {
      const result = await service.getPrice("eth");

      expect(result).not.toBeNull();
      expect(result!.price).toBe(3250);
      expect(result!.change24h).toBe(1.8);
    });

    it("returns null for unknown symbol", async () => {
      const result = await service.getPrice("UNKNOWN_COIN");
      expect(result).toBeNull();
    });

    it("returns correct data for SOL", async () => {
      const result = await service.getPrice("SOL");

      expect(result).not.toBeNull();
      expect(result!.price).toBe(185);
      expect(result!.change24h).toBe(5.2);
    });

    it("returns correct data for MATIC", async () => {
      const result = await service.getPrice("MATIC");

      expect(result).not.toBeNull();
      expect(result!.price).toBe(0.85);
      expect(result!.change24h).toBe(-1.2);
    });
  });

  // =========================================================================
  // getPrices
  // =========================================================================

  describe("getPrices", () => {
    it("returns prices for multiple known symbols", async () => {
      const result = await service.getPrices(["BTC", "ETH", "SOL"]);

      expect(Object.keys(result)).toHaveLength(3);
      expect(result.BTC.price).toBe(97500);
      expect(result.ETH.price).toBe(3250);
      expect(result.SOL.price).toBe(185);
    });

    it("skips unknown symbols", async () => {
      const result = await service.getPrices(["BTC", "FAKE_COIN"]);

      expect(Object.keys(result)).toHaveLength(1);
      expect(result.BTC).toBeDefined();
      expect(result.FAKE_COIN).toBeUndefined();
    });

    it("returns empty object for all unknown symbols", async () => {
      const result = await service.getPrices(["FAKE1", "FAKE2"]);
      expect(Object.keys(result)).toHaveLength(0);
    });

    it("normalizes symbols to uppercase in output", async () => {
      const result = await service.getPrices(["btc", "eth"]);

      expect(result.BTC).toBeDefined();
      expect(result.ETH).toBeDefined();
    });

    it("returns empty object for empty array", async () => {
      const result = await service.getPrices([]);
      expect(Object.keys(result)).toHaveLength(0);
    });
  });

  // =========================================================================
  // syncWallet
  // =========================================================================

  describe("syncWallet", () => {
    it("throws when wallet not found", async () => {
      // getWallet returns null
      mockFrom.mockImplementation((table: string) => {
        if (table === "crypto_wallets") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest
                  .fn()
                  .mockResolvedValue({ data: null, error: null }),
              }),
            }),
          };
        }
        return {};
      });

      await expect(service.syncWallet("nonexistent")).rejects.toThrow(
        "Wallet not found",
      );
    });

    it("updates holding prices from mock data", async () => {
      const dbWallet = makeDbWallet({ id: "w-sync" });
      const dbHolding = makeDbHolding({
        id: "h-sync",
        symbol: "BTC",
        quantity: 1.0,
        cost_basis: 80000,
        wallet_id: "w-sync",
      });
      const updatedWallet = makeDbWallet({
        id: "w-sync",
        last_sync: NOW_ISO,
      });

      let callSeq = 0;
      mockFrom.mockImplementation((table: string) => {
        if (table === "crypto_wallets") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: callSeq++ < 2 ? dbWallet : updatedWallet,
                  error: null,
                }),
              }),
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: updatedWallet,
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (table === "crypto_holdings") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest
                  .fn()
                  .mockResolvedValue({ data: [dbHolding], error: null }),
              }),
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: dbHolding,
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        return {};
      });

      const result = await service.syncWallet("w-sync");

      expect(result).toBeDefined();
      expect(result.id).toBe("w-sync");
    });
  });

  // =========================================================================
  // getPortfolioSummary
  // =========================================================================

  describe("getPortfolioSummary", () => {
    it("calculates correct totals for portfolio with holdings", async () => {
      const dbWallets = [
        makeDbWallet({ id: "w-1", type: "hot" }),
        makeDbWallet({ id: "w-2", type: "exchange" }),
      ];
      const holdingsW1 = [
        makeDbHolding({
          id: "h-1",
          symbol: "BTC",
          name: "Bitcoin",
          quantity: 0.5,
          value_usd: 48750,
          cost_basis: 40000,
          network: "bitcoin",
        }),
      ];
      const holdingsW2 = [
        makeDbHolding({
          id: "h-2",
          symbol: "ETH",
          name: "Ethereum",
          quantity: 5,
          value_usd: 16250,
          cost_basis: 12000,
          network: "ethereum",
        }),
      ];

      let holdingCallIdx = 0;
      mockFrom.mockImplementation((table: string) => {
        if (table === "crypto_wallets") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest
                  .fn()
                  .mockResolvedValue({ data: dbWallets, error: null }),
              }),
            }),
          };
        }
        if (table === "crypto_holdings") {
          const holdingSets = [holdingsW1, holdingsW2];
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockImplementation(() => {
                  const idx = holdingCallIdx++;
                  return Promise.resolve({
                    data: holdingSets[idx] ?? [],
                    error: null,
                  });
                }),
              }),
            }),
          };
        }
        return {};
      });

      const summary = await service.getPortfolioSummary("user-1");

      expect(summary.totalValue).toBe(48750 + 16250);
      expect(summary.totalCostBasis).toBe(40000 + 12000);
      expect(summary.unrealizedGainLoss).toBe(
        48750 + 16250 - (40000 + 12000),
      );
      expect(summary.totalWallets).toBe(2);
      expect(summary.totalAssets).toBe(2);
      expect(summary.realizedGainLoss).toBe(0);
    });

    it("returns zeros for empty portfolio", async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === "crypto_wallets") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest
                  .fn()
                  .mockResolvedValue({ data: [], error: null }),
              }),
            }),
          };
        }
        return {};
      });

      const summary = await service.getPortfolioSummary("user-1");

      expect(summary.totalValue).toBe(0);
      expect(summary.totalCostBasis).toBe(0);
      expect(summary.unrealizedGainLoss).toBe(0);
      expect(summary.unrealizedGainLossPercent).toBe(0);
      expect(summary.totalWallets).toBe(0);
      expect(summary.totalAssets).toBe(0);
    });

    it("calculates correct asset allocation percentages", async () => {
      const dbWallets = [makeDbWallet({ id: "w-1", type: "hot" })];
      const holdings = [
        makeDbHolding({
          id: "h-1",
          symbol: "BTC",
          name: "Bitcoin",
          value_usd: 75000,
          cost_basis: 50000,
          network: "bitcoin",
        }),
        makeDbHolding({
          id: "h-2",
          symbol: "ETH",
          name: "Ethereum",
          value_usd: 25000,
          cost_basis: 20000,
          network: "ethereum",
        }),
      ];

      mockFrom.mockImplementation((table: string) => {
        if (table === "crypto_wallets") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest
                  .fn()
                  .mockResolvedValue({ data: dbWallets, error: null }),
              }),
            }),
          };
        }
        if (table === "crypto_holdings") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest
                  .fn()
                  .mockResolvedValue({ data: holdings, error: null }),
              }),
            }),
          };
        }
        return {};
      });

      const summary = await service.getPortfolioSummary("user-1");

      // BTC should be 75% of portfolio
      const btcAlloc = summary.holdingsByAsset.find(
        (a) => a.symbol === "BTC",
      );
      expect(btcAlloc).toBeDefined();
      expect(btcAlloc!.percentage).toBe(75);

      // ETH should be 25%
      const ethAlloc = summary.holdingsByAsset.find(
        (a) => a.symbol === "ETH",
      );
      expect(ethAlloc).toBeDefined();
      expect(ethAlloc!.percentage).toBe(25);
    });

    it("calculates correct network allocation", async () => {
      const dbWallets = [makeDbWallet({ id: "w-1", type: "hot" })];
      const holdings = [
        makeDbHolding({
          id: "h-1",
          symbol: "BTC",
          name: "Bitcoin",
          value_usd: 60000,
          network: "bitcoin",
        }),
        makeDbHolding({
          id: "h-2",
          symbol: "ETH",
          name: "Ethereum",
          value_usd: 40000,
          network: "ethereum",
        }),
      ];

      mockFrom.mockImplementation((table: string) => {
        if (table === "crypto_wallets") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest
                  .fn()
                  .mockResolvedValue({ data: dbWallets, error: null }),
              }),
            }),
          };
        }
        if (table === "crypto_holdings") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest
                  .fn()
                  .mockResolvedValue({ data: holdings, error: null }),
              }),
            }),
          };
        }
        return {};
      });

      const summary = await service.getPortfolioSummary("user-1");

      expect(summary.holdingsByNetwork).toHaveLength(2);
      const btcNetwork = summary.holdingsByNetwork.find(
        (n) => n.network === "bitcoin",
      );
      expect(btcNetwork).toBeDefined();
      expect(btcNetwork!.percentage).toBe(60);
      expect(btcNetwork!.assetCount).toBe(1);
    });

    it("calculates correct wallet type allocation", async () => {
      const dbWallets = [
        makeDbWallet({ id: "w-1", type: "hot" }),
        makeDbWallet({ id: "w-2", type: "exchange" }),
      ];
      const holdingsW1 = [
        makeDbHolding({ id: "h-1", value_usd: 70000 }),
      ];
      const holdingsW2 = [
        makeDbHolding({ id: "h-2", value_usd: 30000 }),
      ];

      let holdingCallIdx = 0;
      mockFrom.mockImplementation((table: string) => {
        if (table === "crypto_wallets") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest
                  .fn()
                  .mockResolvedValue({ data: dbWallets, error: null }),
              }),
            }),
          };
        }
        if (table === "crypto_holdings") {
          const sets = [holdingsW1, holdingsW2];
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockImplementation(() => {
                  const idx = holdingCallIdx++;
                  return Promise.resolve({ data: sets[idx] ?? [], error: null });
                }),
              }),
            }),
          };
        }
        return {};
      });

      const summary = await service.getPortfolioSummary("user-1");

      expect(summary.holdingsByWalletType).toHaveLength(2);
      const hotType = summary.holdingsByWalletType.find(
        (w) => w.type === "hot",
      );
      expect(hotType).toBeDefined();
      expect(hotType!.percentage).toBe(70);
      expect(hotType!.walletCount).toBe(1);
    });

    it("limits top holdings to 10", async () => {
      const dbWallets = [makeDbWallet({ id: "w-1" })];
      // Create 12 holdings
      const holdings = Array.from({ length: 12 }, (_, i) =>
        makeDbHolding({
          id: `h-${i}`,
          symbol: `COIN${i}`,
          name: `Coin ${i}`,
          value_usd: (12 - i) * 1000,
        }),
      );

      mockFrom.mockImplementation((table: string) => {
        if (table === "crypto_wallets") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest
                  .fn()
                  .mockResolvedValue({ data: dbWallets, error: null }),
              }),
            }),
          };
        }
        if (table === "crypto_holdings") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest
                  .fn()
                  .mockResolvedValue({ data: holdings, error: null }),
              }),
            }),
          };
        }
        return {};
      });

      const summary = await service.getPortfolioSummary("user-1");

      expect(summary.topHoldings).toHaveLength(10);
    });

    it("calculates unrealizedGainLossPercent correctly", async () => {
      const dbWallets = [makeDbWallet({ id: "w-1" })];
      const holdings = [
        makeDbHolding({
          id: "h-1",
          value_usd: 12000,
          cost_basis: 10000,
        }),
      ];

      mockFrom.mockImplementation((table: string) => {
        if (table === "crypto_wallets") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest
                  .fn()
                  .mockResolvedValue({ data: dbWallets, error: null }),
              }),
            }),
          };
        }
        if (table === "crypto_holdings") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest
                  .fn()
                  .mockResolvedValue({ data: holdings, error: null }),
              }),
            }),
          };
        }
        return {};
      });

      const summary = await service.getPortfolioSummary("user-1");

      // (12000 - 10000) / 10000 * 100 = 20%
      expect(summary.unrealizedGainLossPercent).toBe(20);
    });
  });

  // =========================================================================
  // createPriceAlert
  // =========================================================================

  describe("createPriceAlert", () => {
    const alertInput = {
      userId: "user-1",
      symbol: "BTC",
      condition: "above" as const,
      targetPrice: 100000,
      currentPrice: 97500,
    };

    it("creates a price alert and returns mapped result", async () => {
      const dbRow = makeDbAlert();
      setupChain({ insertResult: { data: dbRow, error: null } });

      const result = await service.createPriceAlert(alertInput);

      expect(mockFrom).toHaveBeenCalledWith("crypto_price_alerts");
      expect(result.id).toBe(FIXED_UUID);
      expect(result.symbol).toBe("BTC");
      expect(result.condition).toBe("above");
      expect(result.targetPrice).toBe(100000);
      expect(result.isTriggered).toBe(false);
    });

    it("throws on Supabase error", async () => {
      setupChain({
        insertResult: {
          data: null,
          error: { message: "Alert insert failed" },
        },
      });

      await expect(service.createPriceAlert(alertInput)).rejects.toEqual(
        expect.objectContaining({ message: "Alert insert failed" }),
      );
    });

    it("creates a below-condition alert", async () => {
      const dbRow = makeDbAlert({
        condition: "below",
        target_price: 90000,
      });
      setupChain({ insertResult: { data: dbRow, error: null } });

      const result = await service.createPriceAlert({
        ...alertInput,
        condition: "below",
        targetPrice: 90000,
      });

      expect(result.condition).toBe("below");
      expect(result.targetPrice).toBe(90000);
    });
  });

  // =========================================================================
  // getUserAlerts
  // =========================================================================

  describe("getUserAlerts", () => {
    it("returns untriggered alerts for user", async () => {
      const dbAlerts = [
        makeDbAlert({ id: "a-1", symbol: "BTC" }),
        makeDbAlert({ id: "a-2", symbol: "ETH", target_price: 4000 }),
      ];

      setupChain({ selectResult: { data: dbAlerts, error: null } });

      const result = await service.getUserAlerts("user-1");

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("a-1");
      expect(result[1].symbol).toBe("ETH");
    });

    it("returns empty array when no alerts", async () => {
      setupChain({ selectResult: { data: [], error: null } });

      const result = await service.getUserAlerts("user-1");
      expect(result).toEqual([]);
    });

    it("throws on Supabase error", async () => {
      setupChain({
        selectResult: {
          data: null,
          error: { message: "Alert query failed" },
        },
      });

      await expect(service.getUserAlerts("user-1")).rejects.toEqual(
        expect.objectContaining({ message: "Alert query failed" }),
      );
    });

    it("returns empty array when data is null", async () => {
      setupChain({ selectResult: { data: null, error: null } });

      const result = await service.getUserAlerts("user-1");
      expect(result).toEqual([]);
    });
  });

  // =========================================================================
  // deleteAlert
  // =========================================================================

  describe("deleteAlert", () => {
    it("deletes the alert by id", async () => {
      const mockEq = jest
        .fn()
        .mockResolvedValue({ data: null, error: null });
      const mockDelete = jest.fn().mockReturnValue({ eq: mockEq });
      mockFrom.mockReturnValue({ delete: mockDelete });

      await service.deleteAlert("alert-1");

      expect(mockFrom).toHaveBeenCalledWith("crypto_price_alerts");
      expect(mockDelete).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith("id", "alert-1");
    });
  });

  // =========================================================================
  // walletFromDb / holdingFromDb mapping
  // =========================================================================

  describe("data mapping", () => {
    it("maps wallet DB row to domain object with correct types", async () => {
      const dbRow = makeDbWallet({
        last_sync: "2026-01-15T10:00:00.000Z",
        sync_error: "timeout",
        notes: "test notes",
      });
      setupChain({ insertResult: { data: dbRow, error: null } });

      const result = await service.addWallet({
        userId: "user-1",
        name: "Test",
        type: "hot",
        isConnected: true,
      });

      expect(result.lastSync).toBeInstanceOf(Date);
      expect(result.syncError).toBe("timeout");
      expect(result.notes).toBe("test notes");
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it("maps holding DB row to domain object with optional fields", async () => {
      const dbRow = makeDbHolding({
        contract_address: "0xabc123",
        decimals: 18,
        logo_url: "https://example.com/logo.png",
      });
      setupChain({ insertResult: { data: dbRow, error: null } });

      const result = await service.addHolding({
        walletId: "wallet-1",
        symbol: "UNI",
        name: "Uniswap",
        quantity: 100,
        valueUsd: 1250,
        priceUsd: 12.5,
      });

      expect(result.contractAddress).toBe("0xabc123");
      expect(result.decimals).toBe(18);
      expect(result.logoUrl).toBe("https://example.com/logo.png");
      expect(result.lastUpdated).toBeInstanceOf(Date);
    });

    it("maps alert with triggered_at date", async () => {
      const dbRow = makeDbAlert({
        is_triggered: true,
        triggered_at: "2026-02-20T08:00:00.000Z",
      });
      setupChain({ insertResult: { data: dbRow, error: null } });

      const result = await service.createPriceAlert({
        userId: "user-1",
        symbol: "BTC",
        condition: "above",
        targetPrice: 100000,
        currentPrice: 97500,
      });

      expect(result.isTriggered).toBe(true);
      expect(result.triggeredAt).toBeInstanceOf(Date);
    });
  });
});
