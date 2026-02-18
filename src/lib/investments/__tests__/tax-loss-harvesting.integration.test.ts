/**
 * Tax-Loss Harvesting Integration Tests
 *
 * Tests the full tax-loss harvesting pipeline including:
 * - Opportunity identification across multiple holdings
 * - Wash sale rule validation (30-day lookback & lookforward)
 * - Tax savings calculations across all tax brackets
 * - Long-term vs short-term capital gains treatment
 * - Priority determination and recommended actions
 * - Tax-optimized rebalancing recommendations
 * - Replacement security suggestions by asset type
 * - Annual loss deduction limits and carryforward
 * - State tax integration
 * - Edge cases: empty holdings, all gains, mixed scenarios
 */

import { TaxLossHarvestingService, getTaxLossHarvestingService } from '../services/TaxLossHarvestingService';
import {
  TaxBracket,
  CapitalGainsTreatment,
} from '../types/tax-loss-harvesting.types';
import type { Holding, Transaction } from '../types/portfolio.types';

// ============================================================================
// TEST DATA FACTORIES
// ============================================================================

function createHolding(overrides: Partial<Holding> & { symbol: string }): Holding {
  const now = new Date();
  const oneYearAgo = new Date(now.getTime() - 400 * 24 * 60 * 60 * 1000);
  return {
    id: `holding-${overrides.symbol}`,
    userId: 'user-001',
    symbol: overrides.symbol,
    name: `${overrides.symbol} Inc.`,
    shares: 100,
    averageCostBasis: 150,
    currentPrice: 120,
    totalValue: 12000,
    totalCost: 15000,
    gainLoss: -3000,
    gainLossPercent: -20,
    sector: 'Technology',
    assetType: 'stock',
    lastUpdated: now,
    createdAt: oneYearAgo,
    ...overrides,
  };
}

function createTransaction(overrides: Partial<Transaction> & { symbol: string }): Transaction {
  const now = new Date();
  return {
    id: `tx-${overrides.symbol}-${Date.now()}`,
    holdingId: `holding-${overrides.symbol}`,
    userId: 'user-001',
    symbol: overrides.symbol,
    type: 'buy',
    shares: 50,
    pricePerShare: 120,
    totalAmount: 6000,
    date: now,
    createdAt: now,
    ...overrides,
  };
}

function createLossHolding(
  symbol: string,
  totalCost: number,
  totalValue: number,
  createdDaysAgo: number,
  assetType: Holding['assetType'] = 'stock'
): Holding {
  const now = new Date();
  return createHolding({
    symbol,
    shares: 100,
    averageCostBasis: totalCost / 100,
    currentPrice: totalValue / 100,
    totalCost,
    totalValue,
    gainLoss: totalValue - totalCost,
    gainLossPercent: ((totalValue - totalCost) / totalCost) * 100,
    assetType,
    createdAt: new Date(now.getTime() - createdDaysAgo * 24 * 60 * 60 * 1000),
  });
}

// ============================================================================
// TESTS
// ============================================================================

describe('TaxLossHarvestingService — Integration', () => {
  let service: TaxLossHarvestingService;

  beforeEach(() => {
    // Reset singleton between tests
    // The module-level variable is not directly accessible, so we create fresh instances
    service = new TaxLossHarvestingService({
      taxBracket: TaxBracket.BRACKET_24,
      minLossThreshold: 100,
      transactionCostPerTrade: 0,
      washSaleLookbackDays: 30,
      washSaleLookforwardDays: 30,
      annualLossDeductionLimit: 3000,
      currentYearLossesAlreadyUsed: 0,
      considerStateTax: false,
    });
  });

  // ==========================================================================
  // TAX BRACKET COVERAGE
  // ==========================================================================

  describe('Tax Bracket Coverage', () => {
    it('should calculate 0% long-term rate for BRACKET_10', () => {
      const svc = new TaxLossHarvestingService({ taxBracket: TaxBracket.BRACKET_10 });
      const savings = svc.calculateTaxSavings(1000, CapitalGainsTreatment.LONG_TERM);
      expect(savings).toBe(0); // 0% rate for 10% bracket
    });

    it('should calculate 0% long-term rate for BRACKET_12', () => {
      const svc = new TaxLossHarvestingService({ taxBracket: TaxBracket.BRACKET_12 });
      const savings = svc.calculateTaxSavings(1000, CapitalGainsTreatment.LONG_TERM);
      expect(savings).toBe(0); // 0% rate for 12% bracket
    });

    it('should calculate 15% long-term rate for BRACKET_22', () => {
      const svc = new TaxLossHarvestingService({ taxBracket: TaxBracket.BRACKET_22 });
      const savings = svc.calculateTaxSavings(1000, CapitalGainsTreatment.LONG_TERM);
      expect(savings).toBe(150); // 15%
    });

    it('should calculate 15% long-term rate for BRACKET_24', () => {
      const savings = service.calculateTaxSavings(1000, CapitalGainsTreatment.LONG_TERM);
      expect(savings).toBe(150); // 15%
    });

    it('should calculate 15% long-term rate for BRACKET_32', () => {
      const svc = new TaxLossHarvestingService({ taxBracket: TaxBracket.BRACKET_32 });
      const savings = svc.calculateTaxSavings(1000, CapitalGainsTreatment.LONG_TERM);
      expect(savings).toBe(150); // 15%
    });

    it('should calculate 15% long-term rate for BRACKET_35', () => {
      const svc = new TaxLossHarvestingService({ taxBracket: TaxBracket.BRACKET_35 });
      const savings = svc.calculateTaxSavings(1000, CapitalGainsTreatment.LONG_TERM);
      expect(savings).toBe(150); // 15%
    });

    it('should calculate 20% long-term rate for BRACKET_37', () => {
      const svc = new TaxLossHarvestingService({ taxBracket: TaxBracket.BRACKET_37 });
      const savings = svc.calculateTaxSavings(1000, CapitalGainsTreatment.LONG_TERM);
      expect(savings).toBe(200); // 20%
    });

    it('should use ordinary income rate for short-term in each bracket', () => {
      const brackets = [
        { bracket: TaxBracket.BRACKET_10, rate: 0.10 },
        { bracket: TaxBracket.BRACKET_12, rate: 0.12 },
        { bracket: TaxBracket.BRACKET_22, rate: 0.22 },
        { bracket: TaxBracket.BRACKET_24, rate: 0.24 },
        { bracket: TaxBracket.BRACKET_32, rate: 0.32 },
        { bracket: TaxBracket.BRACKET_35, rate: 0.35 },
        { bracket: TaxBracket.BRACKET_37, rate: 0.37 },
      ];

      for (const { bracket, rate } of brackets) {
        const svc = new TaxLossHarvestingService({ taxBracket: bracket });
        const savings = svc.calculateTaxSavings(1000, CapitalGainsTreatment.SHORT_TERM);
        expect(savings).toBeCloseTo(1000 * rate, 2);
      }
    });
  });

  // ==========================================================================
  // STATE TAX INTEGRATION
  // ==========================================================================

  describe('State Tax Integration', () => {
    it('should add state tax to savings when considerStateTax is true', () => {
      const svc = new TaxLossHarvestingService({
        taxBracket: TaxBracket.BRACKET_24,
        stateTaxRate: 0.06,
        considerStateTax: true,
      });

      const savings = svc.calculateTaxSavings(2000, CapitalGainsTreatment.SHORT_TERM);
      // Federal: 2000 * 0.24 = 480, State: 2000 * 0.06 = 120, Total: 600
      expect(savings).toBe(600);
    });

    it('should not add state tax when considerStateTax is false', () => {
      const svc = new TaxLossHarvestingService({
        taxBracket: TaxBracket.BRACKET_24,
        stateTaxRate: 0.06,
        considerStateTax: false,
      });

      const savings = svc.calculateTaxSavings(2000, CapitalGainsTreatment.SHORT_TERM);
      expect(savings).toBe(480); // Only federal
    });

    it('should not add state tax when stateTaxRate is undefined', () => {
      const svc = new TaxLossHarvestingService({
        taxBracket: TaxBracket.BRACKET_24,
        considerStateTax: true,
        // stateTaxRate not set
      });

      const savings = svc.calculateTaxSavings(2000, CapitalGainsTreatment.SHORT_TERM);
      expect(savings).toBe(480); // Only federal
    });

    it('should combine state tax with long-term capital gains rate', () => {
      const svc = new TaxLossHarvestingService({
        taxBracket: TaxBracket.BRACKET_24,
        stateTaxRate: 0.05,
        considerStateTax: true,
      });

      const savings = svc.calculateTaxSavings(1000, CapitalGainsTreatment.LONG_TERM);
      // Federal: 1000 * 0.15 = 150, State: 1000 * 0.05 = 50, Total: 200
      expect(savings).toBe(200);
    });
  });

  // ==========================================================================
  // OPPORTUNITY IDENTIFICATION
  // ==========================================================================

  describe('analyzeTaxLossOpportunities', () => {
    it('should identify only holdings with losses above threshold', async () => {
      const holdings: Holding[] = [
        createLossHolding('AAPL', 15000, 12000, 400), // $3000 loss — above threshold
        createLossHolding('TSLA', 10000, 9000, 180),  // $1000 loss — above threshold
        createLossHolding('MSFT', 22500, 26250, 400), // $3750 gain — excluded
        createLossHolding('TINY', 1050, 1000, 400),   // $50 loss — below $100 threshold
      ];

      const analysis = await service.analyzeTaxLossOpportunities(holdings, []);

      expect(analysis.opportunities.length).toBe(2);
      expect(analysis.opportunities.map((o) => o.holding.symbol)).toEqual(
        expect.arrayContaining(['AAPL', 'TSLA'])
      );
    });

    it('should return empty opportunities when no holdings have losses', async () => {
      const holdings: Holding[] = [
        createLossHolding('AAPL', 10000, 15000, 400), // gain
        createLossHolding('MSFT', 10000, 12000, 400), // gain
      ];

      const analysis = await service.analyzeTaxLossOpportunities(holdings, []);

      expect(analysis.opportunities.length).toBe(0);
      expect(analysis.totalUnrealizedLosses).toBe(0);
      expect(analysis.totalEstimatedTaxSavings).toBe(0);
      expect(analysis.summary.opportunitiesCount).toBe(0);
      expect(analysis.summary.averageSavingsPerOpportunity).toBe(0);
    });

    it('should return empty opportunities for empty holdings array', async () => {
      const analysis = await service.analyzeTaxLossOpportunities([], []);

      expect(analysis.opportunities.length).toBe(0);
      expect(analysis.totalUnrealizedLosses).toBe(0);
      expect(analysis.summary.averageSavingsPerOpportunity).toBe(0);
    });

    it('should classify long-term holdings (>= 365 days) correctly', async () => {
      const holdings = [createLossHolding('AAPL', 15000, 12000, 400)]; // 400 days ago

      const analysis = await service.analyzeTaxLossOpportunities(holdings, []);

      expect(analysis.opportunities[0].capitalGainsTreatment).toBe(
        CapitalGainsTreatment.LONG_TERM
      );
      expect(analysis.opportunities[0].holdingPeriodDays).toBeGreaterThanOrEqual(365);
    });

    it('should classify short-term holdings (< 365 days) correctly', async () => {
      const holdings = [createLossHolding('TSLA', 10000, 9000, 180)]; // 180 days ago

      const analysis = await service.analyzeTaxLossOpportunities(holdings, []);

      expect(analysis.opportunities[0].capitalGainsTreatment).toBe(
        CapitalGainsTreatment.SHORT_TERM
      );
      expect(analysis.opportunities[0].holdingPeriodDays).toBeLessThan(365);
    });

    it('should calculate loss percentage correctly', async () => {
      const holdings = [createLossHolding('AAPL', 10000, 7000, 400)]; // 30% loss

      const analysis = await service.analyzeTaxLossOpportunities(holdings, []);

      expect(analysis.opportunities[0].lossPercentage).toBeCloseTo(30, 0);
    });

    it('should sort opportunities by priority then tax savings descending', async () => {
      const holdings = [
        createLossHolding('SMALL', 600, 200, 400),    // $400 loss, low-ish savings
        createLossHolding('LARGE', 20000, 15000, 400), // $5000 loss, high savings, high priority
        createLossHolding('MED', 5000, 3500, 400),     // $1500 loss, medium savings
      ];

      const analysis = await service.analyzeTaxLossOpportunities(holdings, []);

      // High priority should come first
      if (analysis.opportunities.length >= 2) {
        const priorities = analysis.opportunities.map((o) => o.priority);
        const priorityOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };
        for (let i = 0; i < priorities.length - 1; i++) {
          expect(priorityOrder[priorities[i]]).toBeGreaterThanOrEqual(
            priorityOrder[priorities[i + 1]]
          );
        }
      }
    });

    it('should use default portfolioId when not provided', async () => {
      const analysis = await service.analyzeTaxLossOpportunities([], []);
      expect(analysis.portfolioId).toBe('default');
    });

    it('should use custom portfolioId when provided', async () => {
      const analysis = await service.analyzeTaxLossOpportunities([], [], 'custom-port');
      expect(analysis.portfolioId).toBe('custom-port');
    });

    it('should set analyzedAt to current time', async () => {
      const before = new Date();
      const analysis = await service.analyzeTaxLossOpportunities([], []);
      const after = new Date();

      expect(analysis.analyzedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(analysis.analyzedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should include the configured taxBracket in the result', async () => {
      const analysis = await service.analyzeTaxLossOpportunities([], []);
      expect(analysis.taxBracket).toBe(TaxBracket.BRACKET_24);
    });
  });

  // ==========================================================================
  // ANNUAL LOSS DEDUCTION & CARRYFORWARD
  // ==========================================================================

  describe('Annual Loss Deduction and Carryforward', () => {
    it('should cap current year losses at the annual deduction limit', async () => {
      const holdings = [createLossHolding('AAPL', 15000, 10000, 400)]; // $5000 loss

      const analysis = await service.analyzeTaxLossOpportunities(holdings, []);

      expect(analysis.currentYearLossesUsed).toBe(3000); // capped at $3000
      expect(analysis.carryforwardLosses).toBe(2000); // $5000 - $3000
    });

    it('should account for already-used losses in current year', async () => {
      const svc = new TaxLossHarvestingService({
        taxBracket: TaxBracket.BRACKET_24,
        annualLossDeductionLimit: 3000,
        currentYearLossesAlreadyUsed: 2000,
      });

      const holdings = [createLossHolding('AAPL', 15000, 12000, 400)]; // $3000 loss

      const analysis = await svc.analyzeTaxLossOpportunities(holdings, []);

      // Only $1000 remaining of $3000 limit (2000 already used)
      expect(analysis.currentYearLossesUsed).toBe(1000);
      expect(analysis.carryforwardLosses).toBe(2000);
    });

    it('should have zero carryforward when losses are under limit', async () => {
      const holdings = [createLossHolding('AAPL', 2000, 1500, 400)]; // $500 loss

      const analysis = await service.analyzeTaxLossOpportunities(holdings, []);

      expect(analysis.currentYearLossesUsed).toBe(500);
      expect(analysis.carryforwardLosses).toBe(0);
    });
  });

  // ==========================================================================
  // WASH SALE VALIDATION
  // ==========================================================================

  describe('Wash Sale Rule Validation', () => {
    it('should detect purchase_before violation within 30 days', () => {
      const holding = createHolding({ symbol: 'AAPL' });
      const now = new Date();
      const fifteenDaysAgo = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);

      const transactions = [
        createTransaction({
          symbol: 'AAPL',
          type: 'buy',
          date: fifteenDaysAgo,
        }),
      ];

      const violations = service.validateWashSaleRules(holding, transactions);

      expect(violations.length).toBe(1);
      expect(violations[0].violationType).toBe('purchase_before');
      expect(violations[0].severity).toBe('error');
      expect(violations[0].daysFromSale).toBe(15);
    });

    it('should detect purchase_after violation within 30 days', () => {
      const holding = createHolding({ symbol: 'AAPL' });
      const now = new Date();
      const tenDaysFromNow = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);

      const transactions = [
        createTransaction({
          symbol: 'AAPL',
          type: 'buy',
          date: tenDaysFromNow,
        }),
      ];

      const violations = service.validateWashSaleRules(holding, transactions);

      expect(violations.length).toBe(1);
      expect(violations[0].violationType).toBe('purchase_after');
      expect(violations[0].severity).toBe('warning');
      expect(violations[0].daysFromSale).toBe(10);
    });

    it('should NOT flag sell transactions as wash sale violations', () => {
      const holding = createHolding({ symbol: 'AAPL' });
      const now = new Date();
      const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);

      const transactions = [
        createTransaction({
          symbol: 'AAPL',
          type: 'sell',
          date: fiveDaysAgo,
        }),
      ];

      const violations = service.validateWashSaleRules(holding, transactions);

      expect(violations.length).toBe(0);
    });

    it('should NOT flag transactions for different symbols', () => {
      const holding = createHolding({ symbol: 'AAPL' });
      const now = new Date();
      const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);

      const transactions = [
        createTransaction({
          symbol: 'MSFT',
          type: 'buy',
          date: fiveDaysAgo,
        }),
      ];

      const violations = service.validateWashSaleRules(holding, transactions);

      expect(violations.length).toBe(0);
    });

    it('should NOT flag purchases beyond the 30-day lookback', () => {
      const holding = createHolding({ symbol: 'AAPL' });
      const now = new Date();
      const fortyFiveDaysAgo = new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000);

      const transactions = [
        createTransaction({
          symbol: 'AAPL',
          type: 'buy',
          date: fortyFiveDaysAgo,
        }),
      ];

      const violations = service.validateWashSaleRules(holding, transactions);

      expect(violations.length).toBe(0);
    });

    it('should detect multiple violations from multiple transactions', () => {
      const holding = createHolding({ symbol: 'AAPL' });
      const now = new Date();

      const transactions = [
        createTransaction({
          symbol: 'AAPL',
          type: 'buy',
          date: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
        }),
        createTransaction({
          symbol: 'AAPL',
          type: 'buy',
          date: new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000),
        }),
      ];

      const violations = service.validateWashSaleRules(holding, transactions);

      expect(violations.length).toBe(2);
      expect(violations.every((v) => v.violationType === 'purchase_before')).toBe(true);
    });
  });

  // ==========================================================================
  // WASH SALE RISK ASSESSMENT (via full pipeline)
  // ==========================================================================

  describe('Wash Sale Risk Assessment via Pipeline', () => {
    it('should assess washSaleRisk as high when error violations exist', async () => {
      const holdings = [createLossHolding('AAPL', 15000, 12000, 400)];
      const now = new Date();
      const transactions = [
        createTransaction({
          symbol: 'AAPL',
          type: 'buy',
          date: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
        }),
      ];

      const analysis = await service.analyzeTaxLossOpportunities(holdings, transactions);

      expect(analysis.opportunities[0].washSaleRisk).toBe('high');
      expect(analysis.opportunities[0].washSaleViolations.length).toBeGreaterThan(0);
    });

    it('should assess washSaleRisk as low when only 1-2 warnings exist', async () => {
      const holdings = [createLossHolding('AAPL', 15000, 12000, 400)];
      const now = new Date();
      // Future purchases trigger warnings (not errors)
      const transactions = [
        createTransaction({
          symbol: 'AAPL',
          type: 'buy',
          date: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000),
        }),
      ];

      const analysis = await service.analyzeTaxLossOpportunities(holdings, transactions);

      expect(analysis.opportunities[0].washSaleRisk).toBe('low');
    });

    it('should assess washSaleRisk as medium when more than 2 warnings exist', async () => {
      const holdings = [createLossHolding('AAPL', 15000, 12000, 400)];
      const now = new Date();
      // 3 future purchases = 3 warnings
      const transactions = [
        createTransaction({
          symbol: 'AAPL',
          type: 'buy',
          date: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
        }),
        createTransaction({
          symbol: 'AAPL',
          type: 'buy',
          date: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000),
        }),
        createTransaction({
          symbol: 'AAPL',
          type: 'buy',
          date: new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000),
        }),
      ];

      const analysis = await service.analyzeTaxLossOpportunities(holdings, transactions);

      expect(analysis.opportunities[0].washSaleRisk).toBe('medium');
    });

    it('should assess washSaleRisk as none when no violations', async () => {
      const holdings = [createLossHolding('AAPL', 15000, 12000, 400)];

      const analysis = await service.analyzeTaxLossOpportunities(holdings, []);

      expect(analysis.opportunities[0].washSaleRisk).toBe('none');
    });
  });

  // ==========================================================================
  // PRIORITY DETERMINATION
  // ==========================================================================

  describe('Priority Determination', () => {
    it('should assign high priority for large losses with high savings and no wash sale risk', async () => {
      // loss > $1000 and savings > $300 and washSaleRisk = 'none'
      const holdings = [createLossHolding('AAPL', 20000, 15000, 400)]; // $5000 loss

      const analysis = await service.analyzeTaxLossOpportunities(holdings, []);

      expect(analysis.opportunities[0].priority).toBe('high');
    });

    it('should assign low priority for small losses (< $500)', async () => {
      // loss < $500
      const holdings = [createLossHolding('SMALL', 1400, 1000, 400)]; // $400 loss

      const analysis = await service.analyzeTaxLossOpportunities(holdings, []);

      expect(analysis.opportunities[0].priority).toBe('low');
    });

    it('should assign low priority when washSaleRisk is high', async () => {
      const holdings = [createLossHolding('AAPL', 20000, 15000, 400)]; // Big loss
      const now = new Date();
      // Buy within 30 days -> error -> high wash sale risk
      const transactions = [
        createTransaction({
          symbol: 'AAPL',
          type: 'buy',
          date: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        }),
      ];

      const analysis = await service.analyzeTaxLossOpportunities(holdings, transactions);

      expect(analysis.opportunities[0].priority).toBe('low');
    });

    it('should assign medium priority for moderate losses without wash sale issues', async () => {
      // loss > $500 but conditions for high not fully met (e.g., savings not > 300 for some configs)
      const svc = new TaxLossHarvestingService({
        taxBracket: TaxBracket.BRACKET_10,
        minLossThreshold: 100,
      });
      // $700 loss, short-term, 10% bracket -> savings = 70 (< 300), so not high
      // loss > 500 and washSaleRisk = none -> medium
      const holdings = [createLossHolding('MED', 1700, 1000, 180)]; // $700 loss, short-term

      const analysis = await svc.analyzeTaxLossOpportunities(holdings, []);

      expect(analysis.opportunities[0].priority).toBe('medium');
    });
  });

  // ==========================================================================
  // RECOMMENDED ACTIONS
  // ==========================================================================

  describe('Recommended Actions', () => {
    it('should recommend hold when washSaleRisk is high', async () => {
      const holdings = [createLossHolding('AAPL', 20000, 15000, 400)];
      const now = new Date();
      const transactions = [
        createTransaction({
          symbol: 'AAPL',
          type: 'buy',
          date: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        }),
      ];

      const analysis = await service.analyzeTaxLossOpportunities(holdings, transactions);

      expect(analysis.opportunities[0].recommendedAction).toBe('hold');
    });

    it('should recommend review when washSaleRisk is medium', async () => {
      const holdings = [createLossHolding('AAPL', 20000, 15000, 400)];
      const now = new Date();
      // 3 future buy warnings -> medium risk
      const transactions = [
        createTransaction({ symbol: 'AAPL', type: 'buy', date: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000) }),
        createTransaction({ symbol: 'AAPL', type: 'buy', date: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000) }),
        createTransaction({ symbol: 'AAPL', type: 'buy', date: new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000) }),
      ];

      const analysis = await service.analyzeTaxLossOpportunities(holdings, transactions);

      expect(analysis.opportunities[0].recommendedAction).toBe('review');
    });

    it('should recommend sell for high-priority opportunities with no wash sale risk', async () => {
      const holdings = [createLossHolding('AAPL', 20000, 15000, 400)];

      const analysis = await service.analyzeTaxLossOpportunities(holdings, []);

      expect(analysis.opportunities[0].recommendedAction).toBe('sell');
    });

    it('should recommend sell for medium-priority opportunities with no wash sale risk', async () => {
      // medium priority: loss > 500, not meeting all high criteria
      const svc = new TaxLossHarvestingService({
        taxBracket: TaxBracket.BRACKET_10,
        minLossThreshold: 100,
      });
      const holdings = [createLossHolding('MED', 1700, 1000, 180)]; // $700 loss

      const analysis = await svc.analyzeTaxLossOpportunities(holdings, []);

      expect(analysis.opportunities[0].recommendedAction).toBe('sell');
    });

    it('should recommend review for low-priority opportunities without high wash sale risk', async () => {
      // low priority: loss < 500
      const holdings = [createLossHolding('LOW', 1400, 1000, 400)]; // $400 loss

      const analysis = await service.analyzeTaxLossOpportunities(holdings, []);

      expect(analysis.opportunities[0].recommendedAction).toBe('review');
    });
  });

  // ==========================================================================
  // TAX-OPTIMIZED REBALANCING
  // ==========================================================================

  describe('generateTaxOptimizedRebalancing', () => {
    it('should generate sell recommendations for actionable opportunities', async () => {
      const holdings = [
        createLossHolding('AAPL', 20000, 15000, 400), // high priority, sell
        createLossHolding('TSLA', 10000, 9000, 180),  // medium priority, sell
      ];

      const analysis = await service.analyzeTaxLossOpportunities(holdings, []);

      expect(analysis.recommendations.length).toBe(2);
      for (const rec of analysis.recommendations) {
        expect(['sell', 'hold']).toContain(rec.action);
      }
    });

    it('should skip opportunities with hold recommendation (high wash sale risk)', async () => {
      const holdings = [createLossHolding('AAPL', 20000, 15000, 400)];
      const now = new Date();
      // Create wash sale violation -> hold recommendation
      const transactions = [
        createTransaction({
          symbol: 'AAPL',
          type: 'buy',
          date: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        }),
      ];

      const analysis = await service.analyzeTaxLossOpportunities(holdings, transactions);

      // The opportunity is identified, but recommendation is skipped for "hold" ones
      expect(analysis.opportunities.length).toBe(1);
      expect(analysis.opportunities[0].recommendedAction).toBe('hold');
      expect(analysis.recommendations.length).toBe(0); // Skipped
    });

    it('should set action to hold for review recommendations', async () => {
      const holdings = [createLossHolding('AAPL', 20000, 15000, 400)];
      const now = new Date();
      // 3 future buy warnings -> medium wash sale risk -> review action
      const transactions = [
        createTransaction({ symbol: 'AAPL', type: 'buy', date: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000) }),
        createTransaction({ symbol: 'AAPL', type: 'buy', date: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000) }),
        createTransaction({ symbol: 'AAPL', type: 'buy', date: new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000) }),
      ];

      const analysis = await service.analyzeTaxLossOpportunities(holdings, transactions);

      // recommendedAction = 'review', so in generateTaxOptimizedRebalancing the action becomes 'hold'
      const rec = analysis.recommendations.find((r) => r.symbol === 'AAPL');
      expect(rec).toBeDefined();
      expect(rec!.action).toBe('hold');
    });

    it('should include replacement suggestions in recommendations', async () => {
      const holdings = [createLossHolding('AAPL', 20000, 15000, 400)];

      const analysis = await service.analyzeTaxLossOpportunities(holdings, []);

      const rec = analysis.recommendations[0];
      expect(rec.replacementSuggestions).toBeDefined();
      expect(rec.replacementSuggestions!.length).toBeGreaterThan(0);
    });

    it('should set washSaleCompliant correctly', async () => {
      const holdings = [createLossHolding('AAPL', 20000, 15000, 400)];

      const analysis = await service.analyzeTaxLossOpportunities(holdings, []);

      expect(analysis.recommendations[0].washSaleCompliant).toBe(true);
    });

    it('should set washSaleCompliant to false when risk is not none', async () => {
      const holdings = [createLossHolding('AAPL', 20000, 15000, 400)];
      const now = new Date();
      // 1 future warning -> low risk, but not 'none'
      const transactions = [
        createTransaction({
          symbol: 'AAPL',
          type: 'buy',
          date: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000),
        }),
      ];

      const analysis = await service.analyzeTaxLossOpportunities(holdings, transactions);

      const rec = analysis.recommendations.find((r) => r.symbol === 'AAPL');
      expect(rec).toBeDefined();
      expect(rec!.washSaleCompliant).toBe(false);
    });

    it('should include detailed notes in recommendations', async () => {
      const holdings = [createLossHolding('AAPL', 20000, 15000, 400)];

      const analysis = await service.analyzeTaxLossOpportunities(holdings, []);

      const rec = analysis.recommendations[0];
      expect(rec.notes).toContain('Unrealized loss:');
      expect(rec.notes).toContain('Estimated tax savings:');
      expect(rec.notes).toContain('Holding period:');
    });

    it('should include wash sale warning count in notes when violations exist', async () => {
      const holdings = [createLossHolding('AAPL', 20000, 15000, 400)];
      const now = new Date();
      const transactions = [
        createTransaction({
          symbol: 'AAPL',
          type: 'buy',
          date: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000),
        }),
      ];

      const analysis = await service.analyzeTaxLossOpportunities(holdings, transactions);

      const rec = analysis.recommendations.find((r) => r.symbol === 'AAPL');
      expect(rec!.notes).toContain('wash sale warning(s)');
    });

    it('should include "Recommended for immediate tax-loss harvesting" for sell action', async () => {
      const holdings = [createLossHolding('AAPL', 20000, 15000, 400)];

      const analysis = await service.analyzeTaxLossOpportunities(holdings, []);

      const rec = analysis.recommendations[0];
      expect(rec.notes).toContain('Recommended for immediate tax-loss harvesting');
    });

    it('should include "Review wash sale implications" for review action', async () => {
      const holdings = [createLossHolding('AAPL', 20000, 15000, 400)];
      const now = new Date();
      const transactions = [
        createTransaction({ symbol: 'AAPL', type: 'buy', date: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000) }),
        createTransaction({ symbol: 'AAPL', type: 'buy', date: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000) }),
        createTransaction({ symbol: 'AAPL', type: 'buy', date: new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000) }),
      ];

      const analysis = await service.analyzeTaxLossOpportunities(holdings, transactions);

      const rec = analysis.recommendations.find((r) => r.symbol === 'AAPL');
      expect(rec!.notes).toContain('Review wash sale implications');
    });
  });

  // ==========================================================================
  // REPLACEMENT SUGGESTIONS
  // ==========================================================================

  describe('Replacement Security Suggestions', () => {
    it('should suggest broad market ETFs for stock holdings', async () => {
      const holdings = [createLossHolding('AAPL', 15000, 12000, 400)]; // assetType: stock

      const analysis = await service.analyzeTaxLossOpportunities(holdings, []);

      expect(analysis.recommendations[0].replacementSuggestions).toEqual(
        expect.arrayContaining(['VTI', 'VOO', 'SPY'])
      );
    });

    it('should suggest bond ETFs for bond holdings', async () => {
      const holdings = [createLossHolding('BND_LOSS', 15000, 12000, 400, 'bond')];

      const analysis = await service.analyzeTaxLossOpportunities(holdings, []);

      expect(analysis.recommendations[0].replacementSuggestions).toEqual(
        expect.arrayContaining(['AGG', 'BND', 'TLT'])
      );
    });

    it('should suggest ETF replacements for ETF holdings', async () => {
      const holdings = [createLossHolding('ETF_LOSS', 15000, 12000, 400, 'etf')];

      const analysis = await service.analyzeTaxLossOpportunities(holdings, []);

      expect(analysis.recommendations[0].replacementSuggestions).toEqual(
        expect.arrayContaining(['VTI', 'VOO', 'SPY'])
      );
    });

    it('should suggest mutual fund replacements for mutual_fund holdings', async () => {
      const holdings = [createLossHolding('MF_LOSS', 15000, 12000, 400, 'mutual_fund')];

      const analysis = await service.analyzeTaxLossOpportunities(holdings, []);

      expect(analysis.recommendations[0].replacementSuggestions).toEqual(
        expect.arrayContaining(['VTSAX', 'VFIAX', 'FXAIX'])
      );
    });

    it('should suggest crypto replacements for crypto holdings', async () => {
      const holdings = [createLossHolding('SHIB', 15000, 12000, 400, 'crypto')];

      const analysis = await service.analyzeTaxLossOpportunities(holdings, []);

      expect(analysis.recommendations[0].replacementSuggestions).toEqual(
        expect.arrayContaining(['BTC', 'ETH'])
      );
    });

    it('should default to stock suggestions for other/unknown asset types', async () => {
      const holdings = [createLossHolding('OTHER', 15000, 12000, 400, 'other')];

      const analysis = await service.analyzeTaxLossOpportunities(holdings, []);

      expect(analysis.recommendations[0].replacementSuggestions).toEqual(
        expect.arrayContaining(['VTI', 'VOO', 'SPY'])
      );
    });
  });

  // ==========================================================================
  // SUMMARY METRICS
  // ==========================================================================

  describe('Summary Metrics', () => {
    it('should compute correct summary statistics', async () => {
      const holdings = [
        createLossHolding('AAPL', 15000, 12000, 400), // $3000 loss
        createLossHolding('TSLA', 10000, 9000, 180),  // $1000 loss
      ];

      const analysis = await service.analyzeTaxLossOpportunities(holdings, []);

      expect(analysis.summary.opportunitiesCount).toBe(2);
      expect(analysis.summary.totalPotentialSavings).toBe(analysis.totalEstimatedTaxSavings);
      expect(analysis.summary.averageSavingsPerOpportunity).toBe(
        analysis.totalEstimatedTaxSavings / 2
      );
    });

    it('should account for transaction costs in estimatedNetBenefit', async () => {
      const svc = new TaxLossHarvestingService({
        taxBracket: TaxBracket.BRACKET_24,
        transactionCostPerTrade: 10,
      });

      const holdings = [
        createLossHolding('AAPL', 15000, 12000, 400),
        createLossHolding('TSLA', 10000, 9000, 180),
      ];

      const analysis = await svc.analyzeTaxLossOpportunities(holdings, []);

      // Net benefit = total savings - (opportunities * cost per trade)
      expect(analysis.summary.estimatedNetBenefit).toBe(
        analysis.summary.totalPotentialSavings - 2 * 10
      );
    });

    it('should count wash sale warnings across all opportunities', async () => {
      const holdings = [
        createLossHolding('AAPL', 15000, 12000, 400),
        createLossHolding('TSLA', 10000, 9000, 180),
      ];
      const now = new Date();
      const transactions = [
        createTransaction({ symbol: 'AAPL', type: 'buy', date: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000) }),
        createTransaction({ symbol: 'TSLA', type: 'buy', date: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000) }),
      ];

      const analysis = await service.analyzeTaxLossOpportunities(holdings, transactions);

      expect(analysis.washSaleWarnings).toBe(2); // 1 per holding
    });

    it('should count only high-priority opportunities', async () => {
      const holdings = [
        createLossHolding('BIG', 50000, 40000, 400), // high priority
        createLossHolding('TINY', 1400, 1000, 400),  // low priority (loss < 500)
      ];

      const analysis = await service.analyzeTaxLossOpportunities(holdings, []);

      expect(analysis.summary.highPriorityCount).toBeGreaterThanOrEqual(1);
    });
  });

  // ==========================================================================
  // SINGLETON FACTORY
  // ==========================================================================

  describe('getTaxLossHarvestingService', () => {
    it('should return a new instance when config is provided', () => {
      const instance1 = getTaxLossHarvestingService({ taxBracket: TaxBracket.BRACKET_22 });
      const instance2 = getTaxLossHarvestingService({ taxBracket: TaxBracket.BRACKET_37 });

      // Since config is provided, it creates a new instance each time
      expect(instance2).not.toBe(instance1);
    });

    it('should return the same instance when no config is provided', () => {
      // First call with config sets the singleton
      getTaxLossHarvestingService({ taxBracket: TaxBracket.BRACKET_24 });

      // Subsequent calls without config return the same singleton
      const a = getTaxLossHarvestingService();
      const b = getTaxLossHarvestingService();
      expect(a).toBe(b);
    });
  });

  // ==========================================================================
  // EDGE CASES
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle holdings with exactly the threshold loss ($100)', async () => {
      // totalCost - totalValue = exactly $100 — should NOT be included (> threshold required, not >=)
      // Actually the code uses: unrealizedLoss <= threshold => skip. So $100 is skipped.
      const holdings = [createLossHolding('EDGE', 1100, 1000, 400)]; // $100 loss

      const analysis = await service.analyzeTaxLossOpportunities(holdings, []);

      expect(analysis.opportunities.length).toBe(0);
    });

    it('should handle holdings with loss just above threshold ($101)', async () => {
      const holdings = [createLossHolding('EDGE', 1101, 1000, 400)]; // $101 loss

      const analysis = await service.analyzeTaxLossOpportunities(holdings, []);

      expect(analysis.opportunities.length).toBe(1);
    });

    it('should handle holdings created exactly 365 days ago as long-term', async () => {
      const now = new Date();
      const holdings = [
        createLossHolding('BORDER', 15000, 12000, 365), // exactly 365 days
      ];

      const analysis = await service.analyzeTaxLossOpportunities(holdings, []);

      expect(analysis.opportunities[0].capitalGainsTreatment).toBe(
        CapitalGainsTreatment.LONG_TERM
      );
    });

    it('should handle holdings created 364 days ago as short-term', async () => {
      const holdings = [createLossHolding('BORDER', 15000, 12000, 364)];

      const analysis = await service.analyzeTaxLossOpportunities(holdings, []);

      expect(analysis.opportunities[0].capitalGainsTreatment).toBe(
        CapitalGainsTreatment.SHORT_TERM
      );
    });

    it('should handle transaction at exactly day 0 (same day) as purchase_before', () => {
      const holding = createHolding({ symbol: 'AAPL' });
      const now = new Date();

      const transactions = [
        createTransaction({
          symbol: 'AAPL',
          type: 'buy',
          date: now, // same day
        }),
      ];

      const violations = service.validateWashSaleRules(holding, transactions);

      // daysDiff = 0, which is >= 0 and <= 30 -> purchase_before
      expect(violations.length).toBe(1);
      expect(violations[0].violationType).toBe('purchase_before');
    });
  });
});
