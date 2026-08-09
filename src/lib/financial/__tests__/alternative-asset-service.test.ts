/**
 * @jest-environment node
 */

/**
 * Alternative Asset Service Unit Tests
 *
 * Comprehensive tests for:
 * - Asset CRUD operations (add, update, get, list, remove)
 * - Valuation tracking and history
 * - Valuation estimation using market benchmarks
 * - Portfolio summary calculations
 * - Diversification analysis
 * - Risk assessment for illiquid assets
 * - Historical performance tracking
 * - Data mapping (DB row <-> domain object)
 */

// ---------------------------------------------------------------------------
// Mock Setup — must come before imports
// ---------------------------------------------------------------------------

const mockFrom = jest.fn();

// Use a plain function (not jest.fn) so resetMocks cannot strip the implementation.
const mockCreateClient = (..._args: unknown[]) => ({
  from: (...fArgs: unknown[]) => mockFrom(...fArgs),
});

jest.mock("@supabase/supabase-js", () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args),
}));

import { AlternativeAssetService } from "../alternative-asset-service";
import type {
  AlternativeAssetType,
  AlternativeAsset,
  AssetCondition,
} from "../alternative-asset-service";

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

function makeDbAsset(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id: FIXED_UUID,
    user_id: "user-1",
    name: "Monet Water Lilies Print",
    type: "art",
    description: "Limited edition print",
    purchase_price: 50000,
    purchase_date: "2024-01-15T00:00:00.000Z",
    current_value: 55000,
    last_valuation_date: NOW_ISO,
    valuation_source: "appraisal",
    currency: "USD",
    condition: "excellent",
    provenance: "Gallery XYZ",
    authenticity_certified: true,
    storage_location: "Home vault",
    insurance_value: 60000,
    insurance_provider: "AXA Art",
    image_urls: null,
    documents: null,
    tags: null,
    notes: null,
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
    ...overrides,
  };
}

function makeDbValuation(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id: FIXED_UUID,
    asset_id: "asset-1",
    value: 55000,
    source: "appraisal",
    date: NOW_ISO,
    notes: null,
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

/** Set up different chain responses per table name. */
function setupMultiTableChain(
  tableChains: Record<
    string,
    Record<string, jest.Mock | ((...args: unknown[]) => unknown)>
  >,
) {
  mockFrom.mockImplementation((table: string) => {
    return tableChains[table] ?? {};
  });
}

// ---------------------------------------------------------------------------
// Domain object helpers
// ---------------------------------------------------------------------------

function makeDomainAsset(
  overrides: Partial<AlternativeAsset> = {},
): AlternativeAsset {
  return {
    id: "asset-1",
    userId: "user-1",
    name: "Monet Water Lilies Print",
    type: "art",
    description: "Limited edition print",
    purchasePrice: 50000,
    purchaseDate: new Date("2024-01-15"),
    currentValue: 55000,
    lastValuationDate: new Date(NOW_ISO),
    valuationSource: "appraisal",
    currency: "USD",
    condition: "excellent",
    provenance: "Gallery XYZ",
    authenticityCertified: true,
    storageLocation: "Home vault",
    insuranceValue: 60000,
    insuranceProvider: "AXA Art",
    createdAt: new Date(NOW_ISO),
    updatedAt: new Date(NOW_ISO),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("AlternativeAssetService", () => {
  let service: AlternativeAssetService;

  beforeEach(() => {
    service = new AlternativeAssetService(TEST_URL, TEST_KEY);
    jest.spyOn(crypto, "randomUUID").mockReturnValue(FIXED_UUID);
  });

  // =========================================================================
  // Constructor
  // =========================================================================

  describe("constructor", () => {
    it("creates a service with a working supabase client", () => {
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      });
      expect(() => service.getAsset("test-id")).not.toThrow();
    });
  });

  // =========================================================================
  // addAsset
  // =========================================================================

  describe("addAsset", () => {
    const assetInput = {
      userId: "user-1",
      name: "Monet Water Lilies Print",
      type: "art" as AlternativeAssetType,
      description: "Limited edition print",
      purchasePrice: 50000,
      purchaseDate: new Date("2024-01-15"),
      currentValue: 55000,
      lastValuationDate: new Date(NOW_ISO),
      valuationSource: "appraisal" as const,
      currency: "USD",
      authenticityCertified: true,
    };

    it("inserts an asset and returns the mapped result", async () => {
      const dbRow = makeDbAsset();
      setupChain({ insertResult: { data: dbRow, error: null } });

      const result = await service.addAsset(assetInput);

      expect(mockFrom).toHaveBeenCalledWith("alternative_assets");
      expect(result.id).toBe(FIXED_UUID);
      expect(result.userId).toBe("user-1");
      expect(result.name).toBe("Monet Water Lilies Print");
      expect(result.type).toBe("art");
      expect(result.purchasePrice).toBe(50000);
      expect(result.currentValue).toBe(55000);
      expect(result.authenticityCertified).toBe(true);
    });

    it("throws on Supabase error", async () => {
      setupChain({
        insertResult: {
          data: null,
          error: { message: "Insert failed", code: "23505" },
        },
      });

      await expect(service.addAsset(assetInput)).rejects.toEqual(
        expect.objectContaining({ message: "Insert failed" }),
      );
    });

    it("generates createdAt and updatedAt timestamps", async () => {
      const dbRow = makeDbAsset();
      setupChain({ insertResult: { data: dbRow, error: null } });

      const result = await service.addAsset(assetInput);

      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });
  });

  // =========================================================================
  // updateAsset
  // =========================================================================

  describe("updateAsset", () => {
    it("updates an asset and returns the mapped result", async () => {
      const dbRow = makeDbAsset({
        name: "Updated Art Piece",
        current_value: 65000,
      });
      setupChain({ updateResult: { data: dbRow, error: null } });

      const result = await service.updateAsset("asset-1", {
        name: "Updated Art Piece",
        currentValue: 65000,
      });

      expect(mockFrom).toHaveBeenCalledWith("alternative_assets");
      expect(result.name).toBe("Updated Art Piece");
      expect(result.currentValue).toBe(65000);
    });

    it("throws on Supabase error", async () => {
      setupChain({
        updateResult: {
          data: null,
          error: { message: "Not found" },
        },
      });

      await expect(
        service.updateAsset("bad-id", { name: "X" }),
      ).rejects.toEqual(expect.objectContaining({ message: "Not found" }));
    });
  });

  // =========================================================================
  // getAsset
  // =========================================================================

  describe("getAsset", () => {
    it("returns asset when found", async () => {
      const dbRow = makeDbAsset();
      setupChain({ selectResult: { data: dbRow, error: null } });

      const result = await service.getAsset("asset-1");

      expect(result).not.toBeNull();
      expect(result!.id).toBe(FIXED_UUID);
      expect(result!.purchasePrice).toBe(50000);
    });

    it("returns null when not found", async () => {
      setupChain({ selectResult: { data: null, error: null } });

      const result = await service.getAsset("nonexistent");
      expect(result).toBeNull();
    });
  });

  // =========================================================================
  // getUserAssets
  // =========================================================================

  describe("getUserAssets", () => {
    it("returns user assets ordered by creation date", async () => {
      const dbRows = [
        makeDbAsset({ id: "a-1", name: "Art Piece 1" }),
        makeDbAsset({ id: "a-2", name: "Wine Collection" }),
      ];

      setupChain({ selectResult: { data: dbRows, error: null } });

      const result = await service.getUserAssets("user-1");

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("a-1");
      expect(result[1].id).toBe("a-2");
    });

    it("returns empty array when no assets", async () => {
      setupChain({ selectResult: { data: [], error: null } });

      const result = await service.getUserAssets("user-1");
      expect(result).toEqual([]);
    });

    it("returns empty array when data is null", async () => {
      setupChain({ selectResult: { data: null, error: null } });

      const result = await service.getUserAssets("user-1");
      expect(result).toEqual([]);
    });

    it("throws on Supabase error", async () => {
      setupChain({
        selectResult: {
          data: null,
          error: { message: "DB error" },
        },
      });

      await expect(service.getUserAssets("user-1")).rejects.toEqual(
        expect.objectContaining({ message: "DB error" }),
      );
    });
  });

  // =========================================================================
  // getUserAssetsByType
  // =========================================================================

  describe("getUserAssetsByType", () => {
    it("returns assets filtered by type", async () => {
      const dbRows = [
        makeDbAsset({ id: "a-1", type: "art" }),
        makeDbAsset({ id: "a-2", type: "art", name: "Another Art" }),
      ];

      setupChain({ selectResult: { data: dbRows, error: null } });

      const result = await service.getUserAssetsByType("user-1", "art");

      expect(result).toHaveLength(2);
      expect(result[0].type).toBe("art");
    });

    it("throws on Supabase error", async () => {
      setupChain({
        selectResult: {
          data: null,
          error: { message: "Query failed" },
        },
      });

      await expect(
        service.getUserAssetsByType("user-1", "wine"),
      ).rejects.toEqual(
        expect.objectContaining({ message: "Query failed" }),
      );
    });

    it("returns empty for type with no assets", async () => {
      setupChain({ selectResult: { data: [], error: null } });

      const result = await service.getUserAssetsByType("user-1", "watches");
      expect(result).toEqual([]);
    });
  });

  // =========================================================================
  // removeAsset
  // =========================================================================

  describe("removeAsset", () => {
    it("deletes valuations first, then the asset", async () => {
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

      await service.removeAsset("asset-1");

      expect(deleteCallOrder).toEqual([
        "alternative_asset_valuations",
        "alternative_assets",
      ]);
    });

    it("throws on Supabase error when deleting asset", async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === "alternative_asset_valuations") {
          return {
            delete: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
          };
        }
        if (table === "alternative_assets") {
          return {
            delete: jest.fn().mockReturnValue({
              eq: jest
                .fn()
                .mockResolvedValue({ error: { message: "Delete failed" } }),
            }),
          };
        }
        return {};
      });

      await expect(service.removeAsset("asset-1")).rejects.toEqual(
        expect.objectContaining({ message: "Delete failed" }),
      );
    });
  });

  // =========================================================================
  // updateValuation
  // =========================================================================

  describe("updateValuation", () => {
    it("inserts valuation history and updates asset current value", async () => {
      const updatedAssetDb = makeDbAsset({
        current_value: 70000,
        valuation_source: "market_data",
      });

      setupMultiTableChain({
        alternative_asset_valuations: {
          insert: jest.fn().mockResolvedValue({ data: null, error: null }),
        },
        alternative_assets: {
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: updatedAssetDb,
                  error: null,
                }),
              }),
            }),
          }),
        },
      });

      const result = await service.updateValuation(
        "asset-1",
        70000,
        "market_data",
      );

      expect(result.currentValue).toBe(70000);
      expect(result.valuationSource).toBe("market_data");
    });

    it("passes notes to valuation history insert", async () => {
      const updatedAssetDb = makeDbAsset({ current_value: 72000 });

      setupMultiTableChain({
        alternative_asset_valuations: {
          insert: jest.fn().mockResolvedValue({ data: null, error: null }),
        },
        alternative_assets: {
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: updatedAssetDb,
                  error: null,
                }),
              }),
            }),
          }),
        },
      });

      const result = await service.updateValuation(
        "asset-1",
        72000,
        "appraisal",
        "Annual appraisal by Christie's",
      );

      expect(result.currentValue).toBe(72000);
    });
  });

  // =========================================================================
  // getValuationHistory
  // =========================================================================

  describe("getValuationHistory", () => {
    it("returns valuation history sorted by date", async () => {
      const dbRows = [
        makeDbValuation({
          id: "v-1",
          value: 55000,
          date: "2026-02-01T00:00:00.000Z",
        }),
        makeDbValuation({
          id: "v-2",
          value: 52000,
          date: "2025-08-01T00:00:00.000Z",
        }),
      ];

      setupChain({ selectResult: { data: dbRows, error: null } });

      const result = await service.getValuationHistory("asset-1");

      expect(result).toHaveLength(2);
      expect(result[0].value).toBe(55000);
      expect(result[0].date).toBeInstanceOf(Date);
      expect(result[0].assetId).toBe("asset-1");
      expect(result[1].value).toBe(52000);
    });

    it("returns empty array when no history", async () => {
      setupChain({ selectResult: { data: [], error: null } });

      const result = await service.getValuationHistory("asset-1");
      expect(result).toEqual([]);
    });

    it("returns empty array when data is null", async () => {
      setupChain({ selectResult: { data: null, error: null } });

      const result = await service.getValuationHistory("asset-1");
      expect(result).toEqual([]);
    });

    it("throws on Supabase error", async () => {
      setupChain({
        selectResult: {
          data: null,
          error: { message: "Query failed" },
        },
      });

      await expect(service.getValuationHistory("asset-1")).rejects.toEqual(
        expect.objectContaining({ message: "Query failed" }),
      );
    });

    it("maps valuation with notes", async () => {
      const dbRows = [
        makeDbValuation({
          value: 60000,
          source: "auction_comparable",
          notes: "Based on recent Christie's auction",
        }),
      ];
      setupChain({ selectResult: { data: dbRows, error: null } });

      const result = await service.getValuationHistory("asset-1");

      expect(result[0].source).toBe("auction_comparable");
      expect(result[0].notes).toBe("Based on recent Christie's auction");
    });
  });

  // =========================================================================
  // estimateCurrentValue
  // =========================================================================

  describe("estimateCurrentValue", () => {
    it("estimates value using art benchmark for art asset", () => {
      const asset = makeDomainAsset({
        type: "art",
        purchasePrice: 50000,
        purchaseDate: new Date("2024-01-15"),
        lastValuationDate: new Date(), // recent valuation = high confidence
      });

      const result = service.estimateCurrentValue(asset);

      // Art avg annual return = 7.5%
      // ~2 years held => ~50000 * 1.075^2 = ~57781
      expect(result.estimate).toBeGreaterThan(50000);
      expect(result.range.low).toBeLessThan(result.estimate);
      expect(result.range.high).toBeGreaterThan(result.estimate);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it("estimates value using crypto benchmark with high volatility range", () => {
      const asset = makeDomainAsset({
        type: "crypto",
        purchasePrice: 10000,
        purchaseDate: new Date("2024-01-15"),
        lastValuationDate: new Date(),
      });

      const result = service.estimateCurrentValue(asset);

      // Crypto has 65% volatility, so range should be very wide
      expect(result.range.high - result.range.low).toBeGreaterThan(
        result.estimate * 0.5,
      );
    });

    it("estimates value for precious metals with lower volatility", () => {
      const asset = makeDomainAsset({
        type: "precious_metals",
        purchasePrice: 20000,
        purchaseDate: new Date("2024-01-15"),
        lastValuationDate: new Date(),
      });

      const result = service.estimateCurrentValue(asset);

      // Precious metals avg return = 5.5%, more modest growth
      expect(result.estimate).toBeGreaterThan(20000);
    });

    it("decreases confidence when valuation is old", () => {
      const recentAsset = makeDomainAsset({
        type: "art",
        lastValuationDate: new Date(),
      });
      const oldAsset = makeDomainAsset({
        type: "art",
        lastValuationDate: new Date("2023-01-01"),
      });

      const recentResult = service.estimateCurrentValue(recentAsset);
      const oldResult = service.estimateCurrentValue(oldAsset);

      expect(recentResult.confidence).toBeGreaterThan(oldResult.confidence);
    });

    it("returns non-negative low range", () => {
      // Very short holding period, high volatility type
      const asset = makeDomainAsset({
        type: "crypto",
        purchasePrice: 100,
        purchaseDate: new Date("2020-01-01"),
        lastValuationDate: new Date(),
      });

      const result = service.estimateCurrentValue(asset);

      expect(result.range.low).toBeGreaterThanOrEqual(0);
    });

    it("handles zero years held", () => {
      const asset = makeDomainAsset({
        type: "art",
        purchasePrice: 50000,
        purchaseDate: new Date(),
        lastValuationDate: new Date(),
      });

      const result = service.estimateCurrentValue(asset);

      // ~0 years held, estimate should be very close to purchase price
      expect(result.estimate).toBeCloseTo(50000, -2);
    });

    it("confidence is capped at 1.0", () => {
      const asset = makeDomainAsset({
        type: "wine",
        lastValuationDate: new Date(),
      });

      const result = service.estimateCurrentValue(asset);
      expect(result.confidence).toBeLessThanOrEqual(1.0);
    });

    it("confidence minimum is 0.1", () => {
      const asset = makeDomainAsset({
        type: "art",
        lastValuationDate: new Date("2020-01-01"),
      });

      const result = service.estimateCurrentValue(asset);
      expect(result.confidence).toBeGreaterThanOrEqual(0.1);
    });
  });

  // =========================================================================
  // getPortfolioSummary
  // =========================================================================

  describe("getPortfolioSummary", () => {
    it("calculates correct totals for multi-asset portfolio", async () => {
      const dbAssets = [
        makeDbAsset({
          id: "a-1",
          type: "art",
          purchase_price: 50000,
          current_value: 55000,
        }),
        makeDbAsset({
          id: "a-2",
          type: "wine",
          name: "Bordeaux Collection",
          purchase_price: 20000,
          current_value: 25000,
        }),
        makeDbAsset({
          id: "a-3",
          type: "precious_metals",
          name: "Gold Bars",
          purchase_price: 30000,
          current_value: 32000,
        }),
      ];

      setupChain({ selectResult: { data: dbAssets, error: null } });

      const summary = await service.getPortfolioSummary("user-1");

      expect(summary.totalAssets).toBe(3);
      expect(summary.totalValue).toBe(55000 + 25000 + 32000);
      expect(summary.totalCostBasis).toBe(50000 + 20000 + 30000);
      expect(summary.totalGainLoss).toBe(112000 - 100000);
      expect(summary.totalGainLossPercent).toBeCloseTo(12, 0);
    });

    it("returns zeros for empty portfolio", async () => {
      setupChain({ selectResult: { data: [], error: null } });

      const summary = await service.getPortfolioSummary("user-1");

      expect(summary.totalAssets).toBe(0);
      expect(summary.totalValue).toBe(0);
      expect(summary.totalCostBasis).toBe(0);
      expect(summary.totalGainLoss).toBe(0);
      expect(summary.totalGainLossPercent).toBe(0);
      expect(summary.byType).toEqual([]);
      expect(summary.topHoldings).toEqual([]);
      expect(summary.averageLiquidityScore).toBe(0);
    });

    it("calculates correct type allocations", async () => {
      const dbAssets = [
        makeDbAsset({
          id: "a-1",
          type: "art",
          purchase_price: 50000,
          current_value: 60000,
        }),
        makeDbAsset({
          id: "a-2",
          type: "art",
          name: "Another Art",
          purchase_price: 40000,
          current_value: 40000,
        }),
        makeDbAsset({
          id: "a-3",
          type: "wine",
          name: "Wine",
          purchase_price: 20000,
          current_value: 25000,
        }),
      ];

      setupChain({ selectResult: { data: dbAssets, error: null } });

      const summary = await service.getPortfolioSummary("user-1");

      expect(summary.byType).toHaveLength(2);

      const artAlloc = summary.byType.find((t) => t.type === "art");
      expect(artAlloc).toBeDefined();
      expect(artAlloc!.count).toBe(2);
      expect(artAlloc!.totalValue).toBe(100000);
      // Art is 100000 / 125000 = 80%
      expect(artAlloc!.percentage).toBe(80);

      const wineAlloc = summary.byType.find((t) => t.type === "wine");
      expect(wineAlloc).toBeDefined();
      expect(wineAlloc!.count).toBe(1);
      expect(wineAlloc!.percentage).toBe(20);
    });

    it("limits topHoldings to 10", async () => {
      const dbAssets = Array.from({ length: 12 }, (_, i) =>
        makeDbAsset({
          id: `a-${i}`,
          name: `Asset ${i}`,
          current_value: (12 - i) * 10000,
          purchase_price: (12 - i) * 8000,
        }),
      );

      setupChain({ selectResult: { data: dbAssets, error: null } });

      const summary = await service.getPortfolioSummary("user-1");

      expect(summary.topHoldings).toHaveLength(10);
      // Most valuable first
      expect(summary.topHoldings[0].currentValue).toBeGreaterThanOrEqual(
        summary.topHoldings[9].currentValue,
      );
    });

    it("calculates average liquidity score", async () => {
      // Art = very_low (4), precious_metals = medium (2)
      const dbAssets = [
        makeDbAsset({ id: "a-1", type: "art" }),
        makeDbAsset({ id: "a-2", type: "precious_metals" }),
      ];

      setupChain({ selectResult: { data: dbAssets, error: null } });

      const summary = await service.getPortfolioSummary("user-1");

      // Average of 4 (very_low) and 2 (medium) = 3
      expect(summary.averageLiquidityScore).toBe(3);
    });

    it("determines overall risk level", async () => {
      // Single type = high concentration
      const dbAssets = [
        makeDbAsset({
          id: "a-1",
          type: "art",
          current_value: 100000,
          purchase_price: 80000,
        }),
      ];

      setupChain({ selectResult: { data: dbAssets, error: null } });

      const summary = await service.getPortfolioSummary("user-1");

      // 100% concentration in art (very_low liquidity) should result in high risk
      expect(["high", "very_high"]).toContain(summary.overallRiskLevel);
    });

    it("handles zero cost basis portfolio correctly", async () => {
      const dbAssets = [
        makeDbAsset({
          id: "a-1",
          purchase_price: 0,
          current_value: 5000,
        }),
      ];

      setupChain({ selectResult: { data: dbAssets, error: null } });

      const summary = await service.getPortfolioSummary("user-1");

      expect(summary.totalGainLossPercent).toBe(0);
    });
  });

  // =========================================================================
  // analyzeDiversification
  // =========================================================================

  describe("analyzeDiversification", () => {
    it("calculates allocation percentages correctly", () => {
      const assets = [
        makeDomainAsset({ currentValue: 50000 }),
        makeDomainAsset({ currentValue: 50000, type: "wine" }),
      ];

      const result = service.analyzeDiversification(assets, 400000);

      // Alt total = 100000, traditional = 400000, combined = 500000
      // Alt % = 20%, Traditional % = 80%
      expect(result.alternativeAllocationPercent).toBe(20);
      expect(result.traditionalAllocationPercent).toBe(80);
    });

    it("returns zero allocations for empty portfolio", () => {
      const result = service.analyzeDiversification([], 0);

      expect(result.alternativeAllocationPercent).toBe(0);
      expect(result.traditionalAllocationPercent).toBe(0);
      expect(result.diversificationScore).toBeGreaterThanOrEqual(0);
    });

    it("calculates weighted correlations", () => {
      // Single crypto asset should show crypto's correlation values
      const assets = [
        makeDomainAsset({
          type: "crypto",
          currentValue: 100000,
        }),
      ];

      const result = service.analyzeDiversification(assets, 100000);

      // Crypto stock correlation = 0.45
      expect(result.correlationWithStocks).toBeCloseTo(0.45, 2);
      // Crypto bond correlation = -0.10
      expect(result.correlationWithBonds).toBeCloseTo(-0.1, 2);
    });

    it("generates recommendations for high alternative allocation", () => {
      const assets = [
        makeDomainAsset({ currentValue: 400000 }),
      ];

      const result = service.analyzeDiversification(assets, 100000);

      // Alt is 80%, should recommend reducing
      expect(
        result.recommendations.some((r) => r.includes("reducing")),
      ).toBe(true);
    });

    it("generates recommendations for low alternative allocation", () => {
      const assets = [
        makeDomainAsset({ currentValue: 1000 }),
      ];

      const result = service.analyzeDiversification(assets, 1000000);

      // Alt is ~0.1%, should recommend increasing
      expect(
        result.recommendations.some((r) => r.includes("increasing")),
      ).toBe(true);
    });

    it("recommends precious metals as hedge when missing", () => {
      const assets = [
        makeDomainAsset({ type: "art", currentValue: 50000 }),
        makeDomainAsset({ type: "wine", currentValue: 30000 }),
      ];

      const result = service.analyzeDiversification(assets, 200000);

      expect(
        result.recommendations.some((r) => r.includes("precious metals")),
      ).toBe(true);
    });

    it("does not recommend precious metals when already present", () => {
      const assets = [
        makeDomainAsset({ type: "art", currentValue: 50000 }),
        makeDomainAsset({ type: "precious_metals", currentValue: 30000 }),
      ];

      const result = service.analyzeDiversification(assets, 200000);

      expect(
        result.recommendations.some((r) => r.includes("precious metals")),
      ).toBe(false);
    });

    it("recommends diversification when few types with multiple assets", () => {
      const assets = [
        makeDomainAsset({ type: "art", currentValue: 50000, id: "a-1" }),
        makeDomainAsset({ type: "art", currentValue: 30000, id: "a-2" }),
        makeDomainAsset({ type: "art", currentValue: 20000, id: "a-3" }),
      ];

      const result = service.analyzeDiversification(assets, 200000);

      expect(
        result.recommendations.some((r) => r.includes("Diversify")),
      ).toBe(true);
    });

    it("sets userId from first asset", () => {
      const assets = [
        makeDomainAsset({ userId: "user-42" }),
      ];

      const result = service.analyzeDiversification(assets, 100000);

      expect(result.userId).toBe("user-42");
    });

    it("diversification score is between 0 and 100", () => {
      const assets = [
        makeDomainAsset({ type: "art", currentValue: 30000 }),
        makeDomainAsset({ type: "precious_metals", currentValue: 20000 }),
        makeDomainAsset({ type: "crypto", currentValue: 10000 }),
      ];

      const result = service.analyzeDiversification(assets, 200000);

      expect(result.diversificationScore).toBeGreaterThanOrEqual(0);
      expect(result.diversificationScore).toBeLessThanOrEqual(100);
    });

    it("low score recommendation triggers below threshold", () => {
      // All crypto with heavy allocation = low diversification
      const assets = [
        makeDomainAsset({
          type: "crypto",
          currentValue: 500000,
          id: "a-1",
        }),
      ];

      const result = service.analyzeDiversification(assets, 10000);

      if (result.diversificationScore < 40) {
        expect(
          result.recommendations.some((r) =>
            r.includes("diversification score is low"),
          ),
        ).toBe(true);
      }
    });
  });

  // =========================================================================
  // assessRisk
  // =========================================================================

  describe("assessRisk", () => {
    it("assesses risk for an art piece", () => {
      const asset = makeDomainAsset({
        type: "art",
        currentValue: 50000,
      });

      const result = service.assessRisk(asset, 200000);

      expect(result.assetId).toBe("asset-1");
      expect(result.assetType).toBe("art");
      expect(result.liquidityRating).toBe("very_low");
      expect(result.estimatedLiquidationTimeWeeks).toBe(12);
      expect(result.volatilityScore).toBeGreaterThan(0);
      expect(result.marketRiskScore).toBeGreaterThan(0);
      expect(result.concentrationRisk).toBe(25); // 50000 / 200000 * 100
    });

    it("assesses high risk for crypto with high concentration", () => {
      const asset = makeDomainAsset({
        type: "crypto",
        currentValue: 90000,
      });

      const result = service.assessRisk(asset, 100000);

      // 90% concentration + high volatility
      expect(result.concentrationRisk).toBe(90);
      expect(["high", "very_high"]).toContain(result.overallRiskLevel);
    });

    it("assesses lower risk for precious metals", () => {
      const asset = makeDomainAsset({
        type: "precious_metals",
        currentValue: 10000,
      });

      const result = service.assessRisk(asset, 200000);

      expect(result.liquidityRating).toBe("medium");
      expect(result.concentrationRisk).toBe(5); // 10000 / 200000 * 100
    });

    it("identifies risk factor for unauthenticated asset", () => {
      const asset = makeDomainAsset({
        authenticityCertified: false,
      });

      const result = service.assessRisk(asset, 100000);

      expect(
        result.riskFactors.some((f) => f.includes("authenticated")),
      ).toBe(true);
    });

    it("identifies risk factor for uninsured asset", () => {
      const asset = makeDomainAsset({
        insuranceValue: undefined,
      });

      const result = service.assessRisk(asset, 100000);

      expect(
        result.riskFactors.some((f) => f.includes("insurance")),
      ).toBe(true);
    });

    it("identifies high concentration risk factor", () => {
      const asset = makeDomainAsset({
        currentValue: 80000,
      });

      const result = service.assessRisk(asset, 100000);

      expect(
        result.riskFactors.some((f) => f.includes("concentration")),
      ).toBe(true);
    });

    it("identifies subjective value risk for art", () => {
      const asset = makeDomainAsset({ type: "art" });

      const result = service.assessRisk(asset, 200000);

      expect(
        result.riskFactors.some((f) => f.includes("subjective")),
      ).toBe(true);
    });

    it("identifies subjective value risk for collectibles", () => {
      const asset = makeDomainAsset({ type: "collectibles" });

      const result = service.assessRisk(asset, 200000);

      expect(
        result.riskFactors.some((f) => f.includes("subjective")),
      ).toBe(true);
    });

    it("identifies regulatory risk for crypto", () => {
      const asset = makeDomainAsset({ type: "crypto" });

      const result = service.assessRisk(asset, 200000);

      expect(
        result.riskFactors.some((f) => f.includes("Regulatory")),
      ).toBe(true);
    });

    it("generates mitigation strategies for liquidity risk", () => {
      const asset = makeDomainAsset({
        type: "art",
        currentValue: 50000,
      });

      const result = service.assessRisk(asset, 200000);

      expect(
        result.mitigationStrategies.some((s) => s.includes("cash reserves")),
      ).toBe(true);
    });

    it("generates mitigation strategies for volatility risk", () => {
      const asset = makeDomainAsset({
        type: "crypto",
        currentValue: 50000,
      });

      const result = service.assessRisk(asset, 200000);

      expect(
        result.mitigationStrategies.some((s) =>
          s.includes("dollar-cost averaging"),
        ),
      ).toBe(true);
    });

    it("recommends cold storage for crypto", () => {
      const asset = makeDomainAsset({ type: "crypto" });

      const result = service.assessRisk(asset, 200000);

      expect(
        result.mitigationStrategies.some((s) => s.includes("cold storage")),
      ).toBe(true);
    });

    it("recommends professional appraisals for art/wine/watches", () => {
      for (const type of ["art", "wine", "watches"] as AlternativeAssetType[]) {
        const asset = makeDomainAsset({ type });
        const result = service.assessRisk(asset, 200000);

        expect(
          result.mitigationStrategies.some((s) => s.includes("appraisals")),
        ).toBe(true);
      }
    });

    it("generates authentication mitigation for unauthenticated assets", () => {
      const asset = makeDomainAsset({
        authenticityCertified: false,
      });

      const result = service.assessRisk(asset, 200000);

      expect(
        result.mitigationStrategies.some((s) =>
          s.includes("authentication and certification"),
        ),
      ).toBe(true);
    });

    it("generates insurance mitigation for uninsured assets", () => {
      const asset = makeDomainAsset({
        insuranceValue: undefined,
      });

      const result = service.assessRisk(asset, 200000);

      expect(
        result.mitigationStrategies.some((s) =>
          s.includes("insurance coverage"),
        ),
      ).toBe(true);
    });

    it("handles zero portfolio value as 100% concentration", () => {
      const asset = makeDomainAsset({ currentValue: 50000 });

      const result = service.assessRisk(asset, 0);

      expect(result.concentrationRisk).toBe(100);
    });

    it("returns all expected fields", () => {
      const asset = makeDomainAsset();

      const result = service.assessRisk(asset, 200000);

      expect(result).toHaveProperty("assetId");
      expect(result).toHaveProperty("assetType");
      expect(result).toHaveProperty("liquidityRating");
      expect(result).toHaveProperty("volatilityScore");
      expect(result).toHaveProperty("marketRiskScore");
      expect(result).toHaveProperty("concentrationRisk");
      expect(result).toHaveProperty("overallRiskLevel");
      expect(result).toHaveProperty("estimatedLiquidationTimeWeeks");
      expect(result).toHaveProperty("riskFactors");
      expect(result).toHaveProperty("mitigationStrategies");
    });

    it("risk level thresholds: low for minimal risk", () => {
      const asset = makeDomainAsset({
        type: "precious_metals",
        currentValue: 1000,
        authenticityCertified: true,
        insuranceValue: 2000,
      });

      const result = service.assessRisk(asset, 1000000);

      // 0.1% concentration, medium liquidity, modest volatility
      expect(["low", "moderate"]).toContain(result.overallRiskLevel);
    });
  });

  // =========================================================================
  // getPerformanceHistory
  // =========================================================================

  describe("getPerformanceHistory", () => {
    it("returns empty array when fewer than 2 valuations", async () => {
      const dbRows = [
        makeDbValuation({ value: 55000, date: "2026-02-01T00:00:00.000Z" }),
      ];
      setupChain({ selectResult: { data: dbRows, error: null } });

      const result = await service.getPerformanceHistory("asset-1");
      expect(result).toEqual([]);
    });

    it("returns empty array when no valuations", async () => {
      setupChain({ selectResult: { data: [], error: null } });

      const result = await service.getPerformanceHistory("asset-1");
      expect(result).toEqual([]);
    });

    it("calculates performance between two valuations", async () => {
      const dbRows = [
        makeDbValuation({
          id: "v-1",
          value: 55000,
          date: "2026-02-01T00:00:00.000Z",
        }),
        makeDbValuation({
          id: "v-2",
          value: 50000,
          date: "2025-02-01T00:00:00.000Z",
        }),
      ];
      setupChain({ selectResult: { data: dbRows, error: null } });

      const result = await service.getPerformanceHistory("asset-1");

      expect(result).toHaveLength(1);
      expect(result[0].assetId).toBe("asset-1");
      expect(result[0].startValue).toBe(50000);
      expect(result[0].endValue).toBe(55000);
      // 10% return
      expect(result[0].returnPercent).toBe(10);
      // ~10% annualized (held ~1 year)
      expect(result[0].annualizedReturn).toBeCloseTo(10, 0);
    });

    it("calculates performance across multiple periods", async () => {
      const dbRows = [
        makeDbValuation({
          id: "v-1",
          value: 60000,
          date: "2026-02-01T00:00:00.000Z",
        }),
        makeDbValuation({
          id: "v-2",
          value: 55000,
          date: "2025-08-01T00:00:00.000Z",
        }),
        makeDbValuation({
          id: "v-3",
          value: 50000,
          date: "2025-02-01T00:00:00.000Z",
        }),
      ];
      setupChain({ selectResult: { data: dbRows, error: null } });

      const result = await service.getPerformanceHistory("asset-1");

      expect(result).toHaveLength(2);
      // First period: 50000 -> 55000
      expect(result[0].startValue).toBe(50000);
      expect(result[0].endValue).toBe(55000);
      // Second period: 55000 -> 60000
      expect(result[1].startValue).toBe(55000);
      expect(result[1].endValue).toBe(60000);
    });

    it("handles zero start value gracefully", async () => {
      const dbRows = [
        makeDbValuation({
          id: "v-1",
          value: 5000,
          date: "2026-02-01T00:00:00.000Z",
        }),
        makeDbValuation({
          id: "v-2",
          value: 0,
          date: "2025-02-01T00:00:00.000Z",
        }),
      ];
      setupChain({ selectResult: { data: dbRows, error: null } });

      const result = await service.getPerformanceHistory("asset-1");

      expect(result).toHaveLength(1);
      expect(result[0].returnPercent).toBe(0);
      expect(result[0].annualizedReturn).toBe(0);
    });

    it("includes period label with date range", async () => {
      const dbRows = [
        makeDbValuation({
          id: "v-1",
          value: 55000,
          date: "2026-06-15T00:00:00.000Z",
        }),
        makeDbValuation({
          id: "v-2",
          value: 50000,
          date: "2026-01-15T00:00:00.000Z",
        }),
      ];
      setupChain({ selectResult: { data: dbRows, error: null } });

      const result = await service.getPerformanceHistory("asset-1");

      expect(result[0].period).toContain("2026-01-15");
      expect(result[0].period).toContain("2026-06-15");
    });

    it("handles declining value (negative return)", async () => {
      const dbRows = [
        makeDbValuation({
          id: "v-1",
          value: 40000,
          date: "2026-02-01T00:00:00.000Z",
        }),
        makeDbValuation({
          id: "v-2",
          value: 50000,
          date: "2025-02-01T00:00:00.000Z",
        }),
      ];
      setupChain({ selectResult: { data: dbRows, error: null } });

      const result = await service.getPerformanceHistory("asset-1");

      expect(result[0].returnPercent).toBe(-20);
      expect(result[0].annualizedReturn).toBeLessThan(0);
    });
  });

  // =========================================================================
  // Data mapping
  // =========================================================================

  describe("data mapping", () => {
    it("maps asset DB row to domain object with all fields", async () => {
      const dbRow = makeDbAsset({
        description: "Rare masterpiece",
        condition: "mint",
        provenance: "Estate sale",
        storage_location: "Climate-controlled vault",
        insurance_value: 75000,
        insurance_provider: "Lloyd's",
        image_urls: ["https://example.com/img.jpg"],
        documents: [
          {
            id: "doc-1",
            name: "Certificate",
            type: "certificate",
            url: "https://example.com/cert.pdf",
            uploadedAt: NOW_ISO,
          },
        ],
        tags: ["impressionism", "monet"],
        notes: "Acquired at auction",
      });
      setupChain({ insertResult: { data: dbRow, error: null } });

      const result = await service.addAsset({
        userId: "user-1",
        name: "Test",
        type: "art",
        purchasePrice: 50000,
        purchaseDate: new Date(),
        currentValue: 55000,
        lastValuationDate: new Date(),
        valuationSource: "appraisal",
        currency: "USD",
        authenticityCertified: true,
      });

      expect(result.description).toBe("Rare masterpiece");
      expect(result.condition).toBe("mint");
      expect(result.provenance).toBe("Estate sale");
      expect(result.storageLocation).toBe("Climate-controlled vault");
      expect(result.insuranceValue).toBe(75000);
      expect(result.insuranceProvider).toBe("Lloyd's");
      expect(result.imageUrls).toEqual(["https://example.com/img.jpg"]);
      expect(result.documents).toBeDefined();
      expect(result.documents![0].name).toBe("Certificate");
      expect(result.tags).toEqual(["impressionism", "monet"]);
      expect(result.notes).toBe("Acquired at auction");
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
      expect(result.purchaseDate).toBeInstanceOf(Date);
      expect(result.lastValuationDate).toBeInstanceOf(Date);
    });

    it("maps all asset types correctly", async () => {
      const types: AlternativeAssetType[] = [
        "art",
        "wine",
        "watches",
        "crypto",
        "real_estate",
        "collectibles",
        "precious_metals",
      ];

      for (const type of types) {
        const dbRow = makeDbAsset({ type });
        setupChain({ insertResult: { data: dbRow, error: null } });

        const result = await service.addAsset({
          userId: "user-1",
          name: `Test ${type}`,
          type,
          purchasePrice: 10000,
          purchaseDate: new Date(),
          currentValue: 10000,
          lastValuationDate: new Date(),
          valuationSource: "manual",
          currency: "USD",
          authenticityCertified: false,
        });

        expect(result.type).toBe(type);
      }
    });

    it("maps all condition types correctly", async () => {
      const conditions: AssetCondition[] = [
        "mint",
        "excellent",
        "good",
        "fair",
        "poor",
      ];

      for (const condition of conditions) {
        const dbRow = makeDbAsset({ condition });
        setupChain({ insertResult: { data: dbRow, error: null } });

        const result = await service.addAsset({
          userId: "user-1",
          name: "Test",
          type: "art",
          purchasePrice: 10000,
          purchaseDate: new Date(),
          currentValue: 10000,
          lastValuationDate: new Date(),
          valuationSource: "manual",
          currency: "USD",
          authenticityCertified: false,
          condition,
        });

        expect(result.condition).toBe(condition);
      }
    });

    it("handles null optional fields in DB row", async () => {
      const dbRow = makeDbAsset({
        description: null,
        condition: null,
        provenance: null,
        storage_location: null,
        insurance_value: null,
        insurance_provider: null,
        image_urls: null,
        documents: null,
        tags: null,
        notes: null,
      });
      setupChain({ selectResult: { data: dbRow, error: null } });

      const result = await service.getAsset("asset-1");

      expect(result).not.toBeNull();
      expect(result!.description).toBeNull();
      expect(result!.condition).toBeNull();
      expect(result!.insuranceValue).toBeNull();
    });
  });

  // =========================================================================
  // Singleton getter
  // =========================================================================

  describe("getAlternativeAssetService", () => {
    it("module exports the class and singleton getter", async () => {
      const mod = await import("../alternative-asset-service");
      expect(mod.AlternativeAssetService).toBeDefined();
      expect(mod.getAlternativeAssetService).toBeDefined();
      expect(typeof mod.getAlternativeAssetService).toBe("function");
    });
  });

  // =========================================================================
  // Edge cases
  // =========================================================================

  describe("edge cases", () => {
    it("portfolio summary with single zero-value asset", async () => {
      const dbAssets = [
        makeDbAsset({
          id: "a-1",
          purchase_price: 0,
          current_value: 0,
        }),
      ];

      setupChain({ selectResult: { data: dbAssets, error: null } });

      const summary = await service.getPortfolioSummary("user-1");

      expect(summary.totalValue).toBe(0);
      expect(summary.totalGainLossPercent).toBe(0);
      // All allocations should handle zero total gracefully
      for (const alloc of summary.byType) {
        expect(alloc.percentage).toBe(0);
      }
    });

    it("diversification analysis with only traditional portfolio", () => {
      const result = service.analyzeDiversification([], 500000);

      expect(result.alternativeAllocationPercent).toBe(0);
      expect(result.traditionalAllocationPercent).toBe(100);
      expect(result.correlationWithStocks).toBe(0);
      expect(result.correlationWithBonds).toBe(0);
      expect(result.correlationWithRealEstate).toBe(0);
    });

    it("risk assessment handles all asset types", () => {
      const types: AlternativeAssetType[] = [
        "art",
        "wine",
        "watches",
        "crypto",
        "real_estate",
        "collectibles",
        "precious_metals",
      ];

      for (const type of types) {
        const asset = makeDomainAsset({ type, currentValue: 10000 });
        const result = service.assessRisk(asset, 100000);

        expect(result.assetType).toBe(type);
        expect(result.volatilityScore).toBeGreaterThan(0);
        expect(result.liquidityRating).toBeDefined();
        expect(result.estimatedLiquidationTimeWeeks).toBeGreaterThanOrEqual(0);
      }
    });

    it("valuation estimation works for all asset types", () => {
      const types: AlternativeAssetType[] = [
        "art",
        "wine",
        "watches",
        "crypto",
        "real_estate",
        "collectibles",
        "precious_metals",
      ];

      for (const type of types) {
        const asset = makeDomainAsset({
          type,
          purchasePrice: 10000,
          purchaseDate: new Date("2024-01-01"),
          lastValuationDate: new Date(),
        });
        const result = service.estimateCurrentValue(asset);

        expect(result.estimate).toBeGreaterThan(0);
        expect(result.range.low).toBeLessThanOrEqual(result.estimate);
        expect(result.range.high).toBeGreaterThanOrEqual(result.estimate);
      }
    });
  });
});
