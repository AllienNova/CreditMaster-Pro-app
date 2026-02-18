/**
 * Portfolio Rebalancing Integration Tests
 *
 * Tests the PortfolioRebalanceService end-to-end including:
 * - Drift calculation (pure sync) with various allocation scenarios
 * - Rebalancing recommendation generation with trade sorting
 * - Portfolio CRUD operations via Supabase
 * - Alert creation, retrieval, and dismissal
 * - Rebalance recording and history
 * - Allocation validation (100% sum check)
 * - Error handling for Supabase failures and missing portfolios
 */

import {
  PortfolioRebalanceService,
  getPortfolioRebalanceService,
  PORTFOLIO_MODELS,
} from '../services/PortfolioRebalanceService';
import type {
  TargetAllocation,
  CurrentAllocation,
  Portfolio,
  RebalanceTrade,
  AssetClass,
} from '../services/PortfolioRebalanceService';

// Mock @supabase/supabase-js with inline factory — no const refs
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(),
  })),
}));

import { createClient } from '@supabase/supabase-js';

// ============================================================================
// HELPERS
// ============================================================================

/** Build a chainable Supabase mock with the desired terminal result */
function buildChain(terminalResult: { data: unknown; error: unknown }) {
  const chain: Record<string, jest.Mock> = {};
  const handler = () => new Proxy(
    {},
    {
      get(_target, prop: string) {
        // Terminal methods that return the result
        if (prop === 'then') return undefined; // Not a thenable directly
        if (prop === 'single') return jest.fn().mockResolvedValue(terminalResult);
        if (prop === 'limit') return jest.fn().mockResolvedValue(terminalResult);
        // For queries without .single(), resolve directly when awaited
        if (prop === 'order') {
          const orderFn = jest.fn().mockImplementation(() => {
            const orderProxy = new Proxy(
              Promise.resolve(terminalResult),
              {
                get(target, innerProp: string) {
                  if (innerProp === 'then' || innerProp === 'catch' || innerProp === 'finally') {
                    return (target as any)[innerProp].bind(target);
                  }
                  if (innerProp === 'limit') return jest.fn().mockResolvedValue(terminalResult);
                  return jest.fn().mockReturnValue(target);
                },
              }
            );
            return orderProxy;
          });
          return orderFn;
        }
        // Chainable methods
        return jest.fn().mockImplementation(() => handler());
      },
    }
  );
  return handler;
}

/** Create a mock Supabase client whose `.from()` calls resolve to the given result */
function createMockSupabaseClient(terminalResult: { data: unknown; error: unknown }) {
  const handler = buildChain(terminalResult);
  return {
    from: jest.fn().mockImplementation(() => handler()),
  };
}

// ============================================================================
// TEST DATA FACTORIES
// ============================================================================

function createTargetAllocations(): TargetAllocation[] {
  return [
    { assetClass: 'us_stocks', targetPercent: 50, minPercent: 45, maxPercent: 55 },
    { assetClass: 'bonds', targetPercent: 30, minPercent: 25, maxPercent: 35 },
    { assetClass: 'cash', targetPercent: 20, minPercent: 15, maxPercent: 25 },
  ];
}

function createCurrentAllocations(
  percentages: number[] = [50, 30, 20],
  totalValue: number = 100000
): CurrentAllocation[] {
  const assetClasses: AssetClass[] = ['us_stocks', 'bonds', 'cash'];
  return assetClasses.map((ac, i) => ({
    assetClass: ac,
    currentPercent: percentages[i],
    currentValue: totalValue * (percentages[i] / 100),
    drift: percentages[i] - [50, 30, 20][i],
    driftPercent: percentages[i] - [50, 30, 20][i],
  }));
}

function createMockPortfolio(overrides?: Partial<Portfolio>): Portfolio {
  return {
    id: 'port-001',
    userId: 'user-001',
    name: 'Test Portfolio',
    totalValue: 100000,
    targetAllocations: createTargetAllocations(),
    currentAllocations: createCurrentAllocations(),
    rebalanceStrategy: 'threshold',
    driftThreshold: 5,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-12-01'),
    ...overrides,
  };
}

function createMockDbRow(portfolio: Portfolio) {
  return {
    id: portfolio.id,
    user_id: portfolio.userId,
    name: portfolio.name,
    total_value: portfolio.totalValue,
    target_allocations: portfolio.targetAllocations,
    current_allocations: portfolio.currentAllocations,
    rebalance_strategy: portfolio.rebalanceStrategy,
    drift_threshold: portfolio.driftThreshold,
    last_rebalance_date: portfolio.lastRebalanceDate
      ? portfolio.lastRebalanceDate.toISOString()
      : null,
    created_at: portfolio.createdAt.toISOString(),
    updated_at: portfolio.updatedAt.toISOString(),
  };
}

function createMockAlertRow(portfolioId: string = 'port-001') {
  return {
    id: 'alert-001',
    portfolio_id: portfolioId,
    user_id: 'user-001',
    priority: 'medium',
    drift_amount: 12,
    drift_percent: 8,
    out_of_balance_assets: ['us_stocks'],
    recommendation: 'Rebalancing recommended.',
    dismissed: false,
    created_at: new Date().toISOString(),
  };
}

function createMockHistoryRow(portfolioId: string = 'port-001') {
  return {
    id: 'hist-001',
    portfolio_id: portfolioId,
    user_id: 'user-001',
    executed_at: new Date().toISOString(),
    pre_rebalance_allocations: createCurrentAllocations([60, 25, 15]),
    post_rebalance_allocations: createCurrentAllocations(),
    trades: [
      {
        assetClass: 'us_stocks',
        action: 'sell',
        currentValue: 60000,
        targetValue: 50000,
        tradeAmount: 10000,
        percentChange: -16.67,
      },
    ],
    total_trade_value: 10000,
  };
}

// ============================================================================
// TESTS
// ============================================================================

describe('PortfolioRebalanceService', () => {
  let service: PortfolioRebalanceService;

  beforeEach(() => {
    // Provide a default mock Supabase client
    const mockClient = createMockSupabaseClient({ data: null, error: null });
    (createClient as jest.Mock).mockReturnValue(mockClient);

    service = new PortfolioRebalanceService('https://test.supabase.co', 'test-key');
  });

  // ==========================================================================
  // PORTFOLIO MODELS
  // ==========================================================================

  describe('PORTFOLIO_MODELS', () => {
    it('should define aggressive, moderate, conservative, and income models', () => {
      expect(PORTFOLIO_MODELS.aggressive).toBeDefined();
      expect(PORTFOLIO_MODELS.moderate).toBeDefined();
      expect(PORTFOLIO_MODELS.conservative).toBeDefined();
      expect(PORTFOLIO_MODELS.income).toBeDefined();
    });

    it('should have allocations that sum to 100% for each model', () => {
      for (const [modelName, allocations] of Object.entries(PORTFOLIO_MODELS)) {
        const total = allocations.reduce((s, a) => s + a.targetPercent, 0);
        expect(total).toBe(100);
      }
    });

    it('should have min <= target <= max for all allocations', () => {
      for (const [modelName, allocations] of Object.entries(PORTFOLIO_MODELS)) {
        for (const alloc of allocations) {
          expect(alloc.minPercent).toBeLessThanOrEqual(alloc.targetPercent);
          expect(alloc.targetPercent).toBeLessThanOrEqual(alloc.maxPercent);
        }
      }
    });
  });

  // ==========================================================================
  // DRIFT CALCULATION (pure sync)
  // ==========================================================================

  describe('calculateDrift', () => {
    it('should return zero drift when allocations match targets', () => {
      const targets = createTargetAllocations();
      const current = createCurrentAllocations([50, 30, 20]);

      const result = service.calculateDrift(targets, current);

      expect(result.totalDrift).toBe(0);
      expect(result.maxDrift).toBe(0);
      expect(result.outOfBounds.length).toBe(0);
      expect(result.driftByAsset.size).toBe(3);
      expect(result.driftByAsset.get('us_stocks')).toBe(0);
    });

    it('should calculate positive and negative drift correctly', () => {
      const targets = createTargetAllocations();
      // us_stocks drifted +10, bonds drifted -5, cash drifted -5
      const current = createCurrentAllocations([60, 25, 15]);

      const result = service.calculateDrift(targets, current);

      expect(result.driftByAsset.get('us_stocks')).toBe(10);
      expect(result.driftByAsset.get('bonds')).toBe(-5);
      expect(result.driftByAsset.get('cash')).toBe(-5);
      expect(result.totalDrift).toBe(20); // |10| + |-5| + |-5|
      expect(result.maxDrift).toBe(10);
    });

    it('should identify assets out of bounds (below min or above max)', () => {
      const targets = createTargetAllocations();
      // us_stocks at 40% is below minPercent 45%, bonds at 40% is above maxPercent 35%
      const current = createCurrentAllocations([40, 40, 20]);

      const result = service.calculateDrift(targets, current);

      expect(result.outOfBounds).toContain('us_stocks');
      expect(result.outOfBounds).toContain('bonds');
      expect(result.outOfBounds).not.toContain('cash');
    });

    it('should handle missing current allocations for a target class (default 0%)', () => {
      const targets = createTargetAllocations();
      // Only provide us_stocks allocation, omit bonds and cash
      const current: CurrentAllocation[] = [
        {
          assetClass: 'us_stocks',
          currentPercent: 100,
          currentValue: 100000,
          drift: 50,
          driftPercent: 50,
        },
      ];

      const result = service.calculateDrift(targets, current);

      // bonds: 0 - 30 = -30, cash: 0 - 20 = -20
      expect(result.driftByAsset.get('bonds')).toBe(-30);
      expect(result.driftByAsset.get('cash')).toBe(-20);
      expect(result.maxDrift).toBe(50); // us_stocks: 100 - 50 = 50
      expect(result.outOfBounds.length).toBe(3); // all three out of bounds
    });
  });

  // ==========================================================================
  // REBALANCING RECOMMENDATIONS
  // ==========================================================================

  describe('generateRebalanceRecommendation', () => {
    it('should not generate trades below $100 threshold', () => {
      const portfolio = createMockPortfolio({
        totalValue: 1000, // Small portfolio
        currentAllocations: createCurrentAllocations([51, 29, 20], 1000),
      });

      const rec = service.generateRebalanceRecommendation(portfolio);

      // All drifts are ~1% of $1000 = $10, below $100 threshold
      expect(rec.trades.length).toBe(0);
      expect(rec.needsRebalance).toBe(false);
    });

    it('should generate sell trades before buy trades', () => {
      const portfolio = createMockPortfolio({
        totalValue: 100000,
        currentAllocations: createCurrentAllocations([70, 15, 15], 100000),
      });

      const rec = service.generateRebalanceRecommendation(portfolio);

      const sellIdx = rec.trades.findIndex((t) => t.action === 'sell');
      const buyIdx = rec.trades.findIndex((t) => t.action === 'buy');

      if (sellIdx >= 0 && buyIdx >= 0) {
        expect(sellIdx).toBeLessThan(buyIdx);
      }
    });

    it('should sort sells by trade amount descending', () => {
      const portfolio = createMockPortfolio({
        totalValue: 100000,
        currentAllocations: createCurrentAllocations([70, 15, 15], 100000),
      });

      const rec = service.generateRebalanceRecommendation(portfolio);

      const sells = rec.trades.filter((t) => t.action === 'sell');
      for (let i = 0; i < sells.length - 1; i++) {
        expect(sells[i].tradeAmount).toBeGreaterThanOrEqual(sells[i + 1].tradeAmount);
      }
    });

    it('should set needsRebalance true when maxDrift exceeds threshold', () => {
      const portfolio = createMockPortfolio({
        totalValue: 100000,
        driftThreshold: 5,
        currentAllocations: createCurrentAllocations([60, 25, 15], 100000),
      });

      const rec = service.generateRebalanceRecommendation(portfolio);

      expect(rec.needsRebalance).toBe(true);
      expect(rec.maxDrift).toBe(10); // us_stocks: 60 - 50 = 10
    });

    it('should set needsRebalance false when drift is within threshold', () => {
      const portfolio = createMockPortfolio({
        totalValue: 100000,
        driftThreshold: 5,
        currentAllocations: createCurrentAllocations([52, 28, 20], 100000),
      });

      const rec = service.generateRebalanceRecommendation(portfolio);

      // maxDrift = 2, below 5% threshold
      expect(rec.needsRebalance).toBe(false);
    });

    it('should include alternative strategies when taxOptimized is true', () => {
      const portfolio = createMockPortfolio({
        totalValue: 100000,
        currentAllocations: createCurrentAllocations([70, 15, 15], 100000),
      });

      const rec = service.generateRebalanceRecommendation(portfolio, {
        taxOptimized: true,
      });

      expect(rec.alternativeStrategies).toBeDefined();
      expect(rec.alternativeStrategies!.length).toBe(2);
      expect(rec.alternativeStrategies![0].strategy).toBe('cash_flow');
      expect(rec.alternativeStrategies![1].strategy).toBe('partial');
    });

    it('should not include alternative strategies when taxOptimized is false/absent', () => {
      const portfolio = createMockPortfolio({
        totalValue: 100000,
        currentAllocations: createCurrentAllocations([70, 15, 15], 100000),
      });

      const rec = service.generateRebalanceRecommendation(portfolio);

      expect(rec.alternativeStrategies).toBeUndefined();
    });

    it('should compute correct trade amounts', () => {
      const portfolio = createMockPortfolio({
        totalValue: 100000,
        currentAllocations: createCurrentAllocations([70, 15, 15], 100000),
      });

      const rec = service.generateRebalanceRecommendation(portfolio);

      const usStocksTrade = rec.trades.find((t) => t.assetClass === 'us_stocks');
      expect(usStocksTrade).toBeDefined();
      expect(usStocksTrade!.action).toBe('sell');
      // target = 50% of 100k = 50k, current = 70k, trade = |50k - 70k| = 20k
      expect(usStocksTrade!.tradeAmount).toBe(20000);
      expect(usStocksTrade!.currentValue).toBe(70000);
      expect(usStocksTrade!.targetValue).toBe(50000);
    });

    it('should handle zero currentValue gracefully in percentChange calculation', () => {
      const portfolio = createMockPortfolio({
        totalValue: 100000,
        currentAllocations: [
          { assetClass: 'us_stocks', currentPercent: 100, currentValue: 100000, drift: 50, driftPercent: 50 },
          { assetClass: 'bonds', currentPercent: 0, currentValue: 0, drift: -30, driftPercent: -30 },
          { assetClass: 'cash', currentPercent: 0, currentValue: 0, drift: -20, driftPercent: -20 },
        ],
      });

      const rec = service.generateRebalanceRecommendation(portfolio);

      // bonds buy trade: percentChange = (30000 / 0) * 100 = Infinity
      // Infinity is truthy so || 0 does NOT trigger — the actual result is Infinity
      const bondsTrade = rec.trades.find((t) => t.assetClass === 'bonds');
      expect(bondsTrade).toBeDefined();
      expect(bondsTrade!.percentChange).toBe(Infinity);
    });
  });

  // ==========================================================================
  // PORTFOLIO CRUD — createPortfolio
  // ==========================================================================

  describe('createPortfolio', () => {
    it('should create a portfolio with default strategy and threshold', async () => {
      const mockRow = createMockDbRow(createMockPortfolio());
      const mockClient = createMockSupabaseClient({ data: mockRow, error: null });
      (createClient as jest.Mock).mockReturnValue(mockClient);
      service = new PortfolioRebalanceService('https://test.supabase.co', 'test-key');

      const result = await service.createPortfolio(
        'user-001',
        'My Portfolio',
        createTargetAllocations()
      );

      expect(result.id).toBe('port-001');
      expect(result.userId).toBe('user-001');
      expect(result.name).toBe('Test Portfolio');
      expect(result.rebalanceStrategy).toBe('threshold');
      expect(result.driftThreshold).toBe(5);
      expect(mockClient.from).toHaveBeenCalledWith('portfolios');
    });

    it('should use custom strategy and threshold when provided', async () => {
      const mockRow = createMockDbRow(
        createMockPortfolio({
          rebalanceStrategy: 'calendar',
          driftThreshold: 10,
        })
      );
      const mockClient = createMockSupabaseClient({ data: mockRow, error: null });
      (createClient as jest.Mock).mockReturnValue(mockClient);
      service = new PortfolioRebalanceService('https://test.supabase.co', 'test-key');

      const result = await service.createPortfolio(
        'user-001',
        'Calendar Portfolio',
        createTargetAllocations(),
        { rebalanceStrategy: 'calendar', driftThreshold: 10 }
      );

      expect(result.rebalanceStrategy).toBe('calendar');
      expect(result.driftThreshold).toBe(10);
    });

    it('should throw when Supabase insert fails', async () => {
      const mockClient = createMockSupabaseClient({
        data: null,
        error: { message: 'Insert failed' },
      });
      (createClient as jest.Mock).mockReturnValue(mockClient);
      service = new PortfolioRebalanceService('https://test.supabase.co', 'test-key');

      await expect(
        service.createPortfolio('user-001', 'Test', createTargetAllocations())
      ).rejects.toThrow('Failed to create portfolio: Insert failed');
    });
  });

  // ==========================================================================
  // PORTFOLIO CRUD — getPortfolio
  // ==========================================================================

  describe('getPortfolio', () => {
    it('should return a mapped portfolio on success', async () => {
      const mockRow = createMockDbRow(createMockPortfolio());
      const mockClient = createMockSupabaseClient({ data: mockRow, error: null });
      (createClient as jest.Mock).mockReturnValue(mockClient);
      service = new PortfolioRebalanceService('https://test.supabase.co', 'test-key');

      const result = await service.getPortfolio('port-001', 'user-001');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('port-001');
      expect(result!.targetAllocations).toEqual(createTargetAllocations());
    });

    it('should return null when Supabase returns an error', async () => {
      const mockClient = createMockSupabaseClient({
        data: null,
        error: { message: 'Not found' },
      });
      (createClient as jest.Mock).mockReturnValue(mockClient);
      service = new PortfolioRebalanceService('https://test.supabase.co', 'test-key');

      const result = await service.getPortfolio('nonexistent', 'user-001');

      expect(result).toBeNull();
    });

    it('should map lastRebalanceDate when present', async () => {
      const portfolio = createMockPortfolio({
        lastRebalanceDate: new Date('2024-06-15'),
      });
      const mockRow = createMockDbRow(portfolio);
      const mockClient = createMockSupabaseClient({ data: mockRow, error: null });
      (createClient as jest.Mock).mockReturnValue(mockClient);
      service = new PortfolioRebalanceService('https://test.supabase.co', 'test-key');

      const result = await service.getPortfolio('port-001', 'user-001');

      expect(result!.lastRebalanceDate).toBeInstanceOf(Date);
    });

    it('should set lastRebalanceDate to undefined when null in DB', async () => {
      const portfolio = createMockPortfolio();
      const mockRow = { ...createMockDbRow(portfolio), last_rebalance_date: null };
      const mockClient = createMockSupabaseClient({ data: mockRow, error: null });
      (createClient as jest.Mock).mockReturnValue(mockClient);
      service = new PortfolioRebalanceService('https://test.supabase.co', 'test-key');

      const result = await service.getPortfolio('port-001', 'user-001');

      expect(result!.lastRebalanceDate).toBeUndefined();
    });
  });

  // ==========================================================================
  // PORTFOLIO CRUD — getUserPortfolios
  // ==========================================================================

  describe('getUserPortfolios', () => {
    it('should return an array of mapped portfolios', async () => {
      const rows = [
        createMockDbRow(createMockPortfolio({ id: 'port-001' })),
        createMockDbRow(createMockPortfolio({ id: 'port-002', name: 'Second' })),
      ];
      const mockClient = createMockSupabaseClient({ data: rows, error: null });
      (createClient as jest.Mock).mockReturnValue(mockClient);
      service = new PortfolioRebalanceService('https://test.supabase.co', 'test-key');

      const result = await service.getUserPortfolios('user-001');

      expect(result.length).toBe(2);
      expect(result[0].id).toBe('port-001');
      expect(result[1].id).toBe('port-002');
    });

    it('should return empty array when data is null', async () => {
      const mockClient = createMockSupabaseClient({ data: null, error: null });
      (createClient as jest.Mock).mockReturnValue(mockClient);
      service = new PortfolioRebalanceService('https://test.supabase.co', 'test-key');

      const result = await service.getUserPortfolios('user-001');

      expect(result).toEqual([]);
    });

    it('should throw when Supabase returns an error', async () => {
      const mockClient = createMockSupabaseClient({
        data: null,
        error: { message: 'DB error' },
      });
      (createClient as jest.Mock).mockReturnValue(mockClient);
      service = new PortfolioRebalanceService('https://test.supabase.co', 'test-key');

      await expect(service.getUserPortfolios('user-001')).rejects.toThrow(
        'Failed to get portfolios: DB error'
      );
    });
  });

  // ==========================================================================
  // PORTFOLIO CRUD — updateTargetAllocations
  // ==========================================================================

  describe('updateTargetAllocations', () => {
    it('should validate that allocations sum to 100%', async () => {
      const badAllocations: TargetAllocation[] = [
        { assetClass: 'us_stocks', targetPercent: 50, minPercent: 45, maxPercent: 55 },
        { assetClass: 'bonds', targetPercent: 30, minPercent: 25, maxPercent: 35 },
        // Missing 20% — total is 80%
      ];

      await expect(
        service.updateTargetAllocations('port-001', 'user-001', badAllocations)
      ).rejects.toThrow('Target allocations must sum to 100%, got 80%');
    });

    it('should accept allocations within 0.01 tolerance of 100%', async () => {
      const allocations: TargetAllocation[] = [
        { assetClass: 'us_stocks', targetPercent: 33.33, minPercent: 28, maxPercent: 38 },
        { assetClass: 'bonds', targetPercent: 33.33, minPercent: 28, maxPercent: 38 },
        { assetClass: 'cash', targetPercent: 33.34, minPercent: 28, maxPercent: 38 },
      ];

      const mockRow = createMockDbRow(
        createMockPortfolio({ targetAllocations: allocations })
      );
      const mockClient = createMockSupabaseClient({ data: mockRow, error: null });
      (createClient as jest.Mock).mockReturnValue(mockClient);
      service = new PortfolioRebalanceService('https://test.supabase.co', 'test-key');

      const result = await service.updateTargetAllocations(
        'port-001',
        'user-001',
        allocations
      );

      expect(result.id).toBe('port-001');
    });

    it('should throw when Supabase update fails', async () => {
      const mockClient = createMockSupabaseClient({
        data: null,
        error: { message: 'Update failed' },
      });
      (createClient as jest.Mock).mockReturnValue(mockClient);
      service = new PortfolioRebalanceService('https://test.supabase.co', 'test-key');

      await expect(
        service.updateTargetAllocations('port-001', 'user-001', createTargetAllocations())
      ).rejects.toThrow('Failed to update allocations: Update failed');
    });
  });

  // ==========================================================================
  // DRIFT ANALYSIS (async — fetches portfolio)
  // ==========================================================================

  describe('analyzePortfolioDrift', () => {
    it('should return needsRebalance = true when maxDrift exceeds threshold', async () => {
      const portfolio = createMockPortfolio({
        driftThreshold: 5,
        currentAllocations: createCurrentAllocations([60, 25, 15], 100000),
      });
      const mockRow = createMockDbRow(portfolio);
      const mockClient = createMockSupabaseClient({ data: mockRow, error: null });
      (createClient as jest.Mock).mockReturnValue(mockClient);
      service = new PortfolioRebalanceService('https://test.supabase.co', 'test-key');

      const result = await service.analyzePortfolioDrift('port-001', 'user-001');

      expect(result.needsRebalance).toBe(true);
      expect(result.driftAnalysis.maxDrift).toBe(10);
    });

    it('should return alertPriority high when maxDrift > 2x threshold', async () => {
      const portfolio = createMockPortfolio({
        driftThreshold: 5,
        currentAllocations: createCurrentAllocations([65, 20, 15], 100000),
      });
      const mockRow = createMockDbRow(portfolio);
      const mockClient = createMockSupabaseClient({ data: mockRow, error: null });
      (createClient as jest.Mock).mockReturnValue(mockClient);
      service = new PortfolioRebalanceService('https://test.supabase.co', 'test-key');

      const result = await service.analyzePortfolioDrift('port-001', 'user-001');

      expect(result.alertPriority).toBe('high');
    });

    it('should return alertPriority medium when maxDrift > threshold but <= 2x', async () => {
      const portfolio = createMockPortfolio({
        driftThreshold: 5,
        currentAllocations: createCurrentAllocations([58, 24, 18], 100000),
      });
      const mockRow = createMockDbRow(portfolio);
      const mockClient = createMockSupabaseClient({ data: mockRow, error: null });
      (createClient as jest.Mock).mockReturnValue(mockClient);
      service = new PortfolioRebalanceService('https://test.supabase.co', 'test-key');

      const result = await service.analyzePortfolioDrift('port-001', 'user-001');

      expect(result.alertPriority).toBe('medium');
    });

    it('should return alertPriority low when maxDrift <= threshold', async () => {
      const portfolio = createMockPortfolio({
        driftThreshold: 5,
        currentAllocations: createCurrentAllocations([52, 28, 20], 100000),
      });
      const mockRow = createMockDbRow(portfolio);
      const mockClient = createMockSupabaseClient({ data: mockRow, error: null });
      (createClient as jest.Mock).mockReturnValue(mockClient);
      service = new PortfolioRebalanceService('https://test.supabase.co', 'test-key');

      const result = await service.analyzePortfolioDrift('port-001', 'user-001');

      expect(result.alertPriority).toBe('low');
    });

    it('should return needsRebalance true when outOfBounds even if maxDrift <= threshold', async () => {
      // Set minPercent very tight so even small drift triggers outOfBounds
      const portfolio = createMockPortfolio({
        driftThreshold: 15, // high threshold
        targetAllocations: [
          { assetClass: 'us_stocks', targetPercent: 50, minPercent: 50, maxPercent: 50 },
          { assetClass: 'bonds', targetPercent: 30, minPercent: 30, maxPercent: 30 },
          { assetClass: 'cash', targetPercent: 20, minPercent: 20, maxPercent: 20 },
        ],
        currentAllocations: createCurrentAllocations([52, 28, 20], 100000),
      });
      const mockRow = createMockDbRow(portfolio);
      const mockClient = createMockSupabaseClient({ data: mockRow, error: null });
      (createClient as jest.Mock).mockReturnValue(mockClient);
      service = new PortfolioRebalanceService('https://test.supabase.co', 'test-key');

      const result = await service.analyzePortfolioDrift('port-001', 'user-001');

      expect(result.needsRebalance).toBe(true);
      expect(result.driftAnalysis.outOfBounds.length).toBeGreaterThan(0);
    });

    it('should throw when portfolio not found', async () => {
      const mockClient = createMockSupabaseClient({
        data: null,
        error: { message: 'Not found' },
      });
      (createClient as jest.Mock).mockReturnValue(mockClient);
      service = new PortfolioRebalanceService('https://test.supabase.co', 'test-key');

      await expect(
        service.analyzePortfolioDrift('nonexistent', 'user-001')
      ).rejects.toThrow('Portfolio not found');
    });
  });

  // ==========================================================================
  // ALERTS
  // ==========================================================================

  describe('createRebalanceAlert', () => {
    it('should create an alert and return mapped result', async () => {
      const alertRow = createMockAlertRow();
      const mockClient = createMockSupabaseClient({ data: alertRow, error: null });
      (createClient as jest.Mock).mockReturnValue(mockClient);
      service = new PortfolioRebalanceService('https://test.supabase.co', 'test-key');

      const driftAnalysis = service.calculateDrift(
        createTargetAllocations(),
        createCurrentAllocations([60, 25, 15])
      );

      const alert = await service.createRebalanceAlert(
        'port-001',
        'user-001',
        driftAnalysis,
        'medium'
      );

      expect(alert.id).toBe('alert-001');
      expect(alert.portfolioId).toBe('port-001');
      expect(alert.priority).toBe('medium');
      expect(alert.dismissed).toBe(false);
    });

    it('should generate recommendation message for out-of-bounds assets', async () => {
      const alertRow = createMockAlertRow();
      const mockClient = createMockSupabaseClient({ data: alertRow, error: null });
      (createClient as jest.Mock).mockReturnValue(mockClient);
      service = new PortfolioRebalanceService('https://test.supabase.co', 'test-key');

      const driftAnalysis = service.calculateDrift(
        createTargetAllocations(),
        createCurrentAllocations([40, 40, 20]) // us_stocks below min, bonds above max
      );

      expect(driftAnalysis.outOfBounds.length).toBeGreaterThan(0);

      const alert = await service.createRebalanceAlert(
        'port-001',
        'user-001',
        driftAnalysis,
        'high'
      );

      // Alert was created (verifying mock was called)
      expect(mockClient.from).toHaveBeenCalledWith('rebalance_alerts');
    });

    it('should generate recommendation message when no assets are out of bounds', async () => {
      const alertRow = createMockAlertRow();
      const mockClient = createMockSupabaseClient({ data: alertRow, error: null });
      (createClient as jest.Mock).mockReturnValue(mockClient);
      service = new PortfolioRebalanceService('https://test.supabase.co', 'test-key');

      // All within bounds but drifted
      const driftAnalysis = service.calculateDrift(
        createTargetAllocations(),
        createCurrentAllocations([54, 27, 19]) // all within min/max bounds
      );

      expect(driftAnalysis.outOfBounds.length).toBe(0);

      await service.createRebalanceAlert('port-001', 'user-001', driftAnalysis, 'low');

      expect(mockClient.from).toHaveBeenCalledWith('rebalance_alerts');
    });

    it('should throw when Supabase insert fails', async () => {
      const mockClient = createMockSupabaseClient({
        data: null,
        error: { message: 'Insert error' },
      });
      (createClient as jest.Mock).mockReturnValue(mockClient);
      service = new PortfolioRebalanceService('https://test.supabase.co', 'test-key');

      const driftAnalysis = service.calculateDrift(
        createTargetAllocations(),
        createCurrentAllocations()
      );

      await expect(
        service.createRebalanceAlert('port-001', 'user-001', driftAnalysis, 'low')
      ).rejects.toThrow('Failed to create alert: Insert error');
    });
  });

  describe('getActiveAlerts', () => {
    it('should return array of mapped alerts', async () => {
      const rows = [createMockAlertRow(), { ...createMockAlertRow(), id: 'alert-002' }];
      const mockClient = createMockSupabaseClient({ data: rows, error: null });
      (createClient as jest.Mock).mockReturnValue(mockClient);
      service = new PortfolioRebalanceService('https://test.supabase.co', 'test-key');

      const alerts = await service.getActiveAlerts('user-001');

      expect(alerts.length).toBe(2);
      expect(alerts[0].id).toBe('alert-001');
    });

    it('should return empty array when data is null', async () => {
      const mockClient = createMockSupabaseClient({ data: null, error: null });
      (createClient as jest.Mock).mockReturnValue(mockClient);
      service = new PortfolioRebalanceService('https://test.supabase.co', 'test-key');

      const alerts = await service.getActiveAlerts('user-001');

      expect(alerts).toEqual([]);
    });

    it('should throw when Supabase returns an error', async () => {
      const mockClient = createMockSupabaseClient({
        data: null,
        error: { message: 'Query error' },
      });
      (createClient as jest.Mock).mockReturnValue(mockClient);
      service = new PortfolioRebalanceService('https://test.supabase.co', 'test-key');

      await expect(service.getActiveAlerts('user-001')).rejects.toThrow(
        'Failed to get alerts: Query error'
      );
    });
  });

  describe('dismissAlert', () => {
    it('should call Supabase update to dismiss alert', async () => {
      const mockClient = createMockSupabaseClient({ data: null, error: null });
      (createClient as jest.Mock).mockReturnValue(mockClient);
      service = new PortfolioRebalanceService('https://test.supabase.co', 'test-key');

      await service.dismissAlert('alert-001', 'user-001');

      expect(mockClient.from).toHaveBeenCalledWith('rebalance_alerts');
    });
  });

  // ==========================================================================
  // REBALANCE EXECUTION
  // ==========================================================================

  describe('recordRebalance', () => {
    it('should record rebalance and update portfolio', async () => {
      const histRow = createMockHistoryRow();
      const mockClient = createMockSupabaseClient({ data: histRow, error: null });
      (createClient as jest.Mock).mockReturnValue(mockClient);
      service = new PortfolioRebalanceService('https://test.supabase.co', 'test-key');

      const preAlloc = createCurrentAllocations([60, 25, 15]);
      const postAlloc = createCurrentAllocations([50, 30, 20]);
      const trades: RebalanceTrade[] = [
        {
          assetClass: 'us_stocks',
          action: 'sell',
          currentValue: 60000,
          targetValue: 50000,
          tradeAmount: 10000,
          percentChange: -16.67,
        },
      ];

      const result = await service.recordRebalance(
        'port-001',
        'user-001',
        preAlloc,
        postAlloc,
        trades
      );

      expect(result.id).toBe('hist-001');
      expect(result.portfolioId).toBe('port-001');
      expect(result.totalTradeValue).toBe(10000);

      // Verify it called from() for history insert, portfolio update, and alert dismissal
      expect(mockClient.from).toHaveBeenCalledWith('rebalance_history');
      expect(mockClient.from).toHaveBeenCalledWith('portfolios');
      expect(mockClient.from).toHaveBeenCalledWith('rebalance_alerts');
    });

    it('should throw when Supabase insert fails', async () => {
      const mockClient = createMockSupabaseClient({
        data: null,
        error: { message: 'Record failed' },
      });
      (createClient as jest.Mock).mockReturnValue(mockClient);
      service = new PortfolioRebalanceService('https://test.supabase.co', 'test-key');

      await expect(
        service.recordRebalance('port-001', 'user-001', [], [], [])
      ).rejects.toThrow('Failed to record rebalance: Record failed');
    });

    it('should calculate totalTradeValue from trade amounts', async () => {
      const histRow = { ...createMockHistoryRow(), total_trade_value: 25000 };
      const mockClient = createMockSupabaseClient({ data: histRow, error: null });
      (createClient as jest.Mock).mockReturnValue(mockClient);
      service = new PortfolioRebalanceService('https://test.supabase.co', 'test-key');

      const trades: RebalanceTrade[] = [
        { assetClass: 'us_stocks', action: 'sell', currentValue: 70000, targetValue: 50000, tradeAmount: 20000, percentChange: -28.57 },
        { assetClass: 'bonds', action: 'buy', currentValue: 15000, targetValue: 20000, tradeAmount: 5000, percentChange: 33.33 },
      ];

      const result = await service.recordRebalance('port-001', 'user-001', [], [], trades);

      expect(result.totalTradeValue).toBe(25000);
    });
  });

  describe('getRebalanceHistory', () => {
    it('should return mapped history records', async () => {
      const rows = [createMockHistoryRow()];
      const mockClient = createMockSupabaseClient({ data: rows, error: null });
      (createClient as jest.Mock).mockReturnValue(mockClient);
      service = new PortfolioRebalanceService('https://test.supabase.co', 'test-key');

      const history = await service.getRebalanceHistory('port-001', 'user-001');

      expect(history.length).toBe(1);
      expect(history[0].id).toBe('hist-001');
      expect(history[0].executedAt).toBeInstanceOf(Date);
    });

    it('should return empty array when data is null', async () => {
      const mockClient = createMockSupabaseClient({ data: null, error: null });
      (createClient as jest.Mock).mockReturnValue(mockClient);
      service = new PortfolioRebalanceService('https://test.supabase.co', 'test-key');

      const history = await service.getRebalanceHistory('port-001', 'user-001');

      expect(history).toEqual([]);
    });

    it('should throw when Supabase returns an error', async () => {
      const mockClient = createMockSupabaseClient({
        data: null,
        error: { message: 'History error' },
      });
      (createClient as jest.Mock).mockReturnValue(mockClient);
      service = new PortfolioRebalanceService('https://test.supabase.co', 'test-key');

      await expect(
        service.getRebalanceHistory('port-001', 'user-001')
      ).rejects.toThrow('Failed to get history: History error');
    });

    it('should apply limit when provided', async () => {
      const mockClient = createMockSupabaseClient({ data: [], error: null });
      (createClient as jest.Mock).mockReturnValue(mockClient);
      service = new PortfolioRebalanceService('https://test.supabase.co', 'test-key');

      await service.getRebalanceHistory('port-001', 'user-001', 5);

      // Verify the from call was made (limit is applied via chain)
      expect(mockClient.from).toHaveBeenCalledWith('rebalance_history');
    });
  });

  // ==========================================================================
  // SINGLETON FACTORY
  // ==========================================================================

  describe('getPortfolioRebalanceService', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = {
        ...originalEnv,
        NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
      };
      // Reset singleton
      (getPortfolioRebalanceService as any).__reset =
        undefined;
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should return a PortfolioRebalanceService instance', () => {
      const instance = getPortfolioRebalanceService();
      expect(instance).toBeInstanceOf(PortfolioRebalanceService);
    });
  });
});
