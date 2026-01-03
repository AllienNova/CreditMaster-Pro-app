/**
 * Tax-Loss Harvesting Service Tests
 */

import { TaxLossHarvestingService, getTaxLossHarvestingService } from '../TaxLossHarvestingService';
import {
  TaxBracket,
  CapitalGainsTreatment,
  TaxLossHarvestingConfig,
} from '../../types/tax-loss-harvesting.types';
import { Holding, Transaction } from '../../types/portfolio.types';

describe('TaxLossHarvestingService', () => {
  let service: TaxLossHarvestingService;
  let mockHoldings: Holding[];
  let mockTransactions: Transaction[];

  beforeEach(() => {
    // Reset singleton
    (getTaxLossHarvestingService as any).taxLossHarvestingServiceInstance = null;

    const config: Partial<TaxLossHarvestingConfig> = {
      taxBracket: TaxBracket.BRACKET_24,
      minLossThreshold: 100,
      transactionCostPerTrade: 0,
      washSaleLookbackDays: 30,
      washSaleLookforwardDays: 30,
      annualLossDeductionLimit: 3000,
      currentYearLossesAlreadyUsed: 0,
      considerStateTax: false,
    };

    service = new TaxLossHarvestingService(config);

    // Create mock holdings with losses
    const now = new Date();
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);

    mockHoldings = [
      {
        id: '1',
        userId: 'user1',
        symbol: 'AAPL',
        name: 'Apple Inc.',
        shares: 100,
        averageCostBasis: 150,
        currentPrice: 120,
        totalValue: 12000, // 100 * 120
        totalCost: 15000, // 100 * 150
        gainLoss: -3000,
        gainLossPercent: -20,
        sector: 'Technology',
        assetType: 'stock',
        lastUpdated: now,
        createdAt: oneYearAgo, // Long-term holding
      },
      {
        id: '2',
        userId: 'user1',
        symbol: 'TSLA',
        name: 'Tesla Inc.',
        shares: 50,
        averageCostBasis: 200,
        currentPrice: 180,
        totalValue: 9000, // 50 * 180
        totalCost: 10000, // 50 * 200
        gainLoss: -1000,
        gainLossPercent: -10,
        sector: 'Automotive',
        assetType: 'stock',
        lastUpdated: now,
        createdAt: sixMonthsAgo, // Short-term holding
      },
      {
        id: '3',
        userId: 'user1',
        symbol: 'MSFT',
        name: 'Microsoft Corp.',
        shares: 75,
        averageCostBasis: 300,
        currentPrice: 350,
        totalValue: 26250, // 75 * 350
        totalCost: 22500, // 75 * 300
        gainLoss: 3750,
        gainLossPercent: 16.67,
        sector: 'Technology',
        assetType: 'stock',
        lastUpdated: now,
        createdAt: oneYearAgo, // Profitable holding - should be excluded
      },
    ];

    mockTransactions = [];
  });

  describe('analyzeTaxLossOpportunities', () => {
    it('should identify holdings with unrealized losses', async () => {
      const analysis = await service.analyzeTaxLossOpportunities(mockHoldings, mockTransactions);

      expect(analysis.opportunities.length).toBe(2); // AAPL and TSLA have losses
      expect(analysis.totalUnrealizedLosses).toBe(4000); // 3000 + 1000
      expect(analysis.summary.opportunitiesCount).toBe(2);
    });

    it('should calculate tax savings correctly for long-term losses', async () => {
      const analysis = await service.analyzeTaxLossOpportunities(mockHoldings, mockTransactions);

      const appleOpportunity = analysis.opportunities.find((o) => o.holding.symbol === 'AAPL');
      expect(appleOpportunity).toBeDefined();
      expect(appleOpportunity!.capitalGainsTreatment).toBe(CapitalGainsTreatment.LONG_TERM);
      expect(appleOpportunity!.unrealizedLoss).toBe(3000);
      // Long-term capital gains rate for 24% bracket is 15%
      expect(appleOpportunity!.estimatedTaxSavings).toBe(450); // 3000 * 0.15
    });

    it('should calculate tax savings correctly for short-term losses', async () => {
      const analysis = await service.analyzeTaxLossOpportunities(mockHoldings, mockTransactions);

      const teslaOpportunity = analysis.opportunities.find((o) => o.holding.symbol === 'TSLA');
      expect(teslaOpportunity).toBeDefined();
      expect(teslaOpportunity!.capitalGainsTreatment).toBe(CapitalGainsTreatment.SHORT_TERM);
      expect(teslaOpportunity!.unrealizedLoss).toBe(1000);
      // Short-term uses ordinary income tax rate (24%)
      expect(teslaOpportunity!.estimatedTaxSavings).toBe(240); // 1000 * 0.24
    });

    it('should exclude holdings below minimum loss threshold', async () => {
      // Add a holding with small loss
      const smallLossHolding: Holding = {
        ...mockHoldings[0],
        id: '4',
        symbol: 'SMALL',
        totalCost: 1050,
        totalValue: 1000,
        gainLoss: -50,
      };

      const analysis = await service.analyzeTaxLossOpportunities(
        [...mockHoldings, smallLossHolding],
        mockTransactions
      );

      expect(analysis.opportunities.find((o) => o.holding.symbol === 'SMALL')).toBeUndefined();
    });

    it('should calculate current year losses and carryforward correctly', async () => {
      const analysis = await service.analyzeTaxLossOpportunities(mockHoldings, mockTransactions);

      expect(analysis.currentYearLossesUsed).toBe(3000); // IRS annual limit
      expect(analysis.carryforwardLosses).toBe(1000); // 4000 - 3000
    });
  });

  describe('validateWashSaleRules', () => {
    it('should detect wash sale violations for purchases within 30 days before sale', () => {
      const holding = mockHoldings[0]; // AAPL
      const now = new Date();
      const twentyDaysAgo = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000);

      const transactions: Transaction[] = [
        {
          id: 't1',
          holdingId: '1',
          userId: 'user1',
          symbol: 'AAPL',
          type: 'buy',
          shares: 50,
          pricePerShare: 120,
          totalAmount: 6000,
          date: twentyDaysAgo,
          createdAt: twentyDaysAgo,
        },
      ];

      const violations = service.validateWashSaleRules(holding, transactions);

      expect(violations.length).toBe(1);
      expect(violations[0].violationType).toBe('purchase_before');
      expect(violations[0].severity).toBe('error');
      expect(violations[0].daysFromSale).toBe(20);
    });

    it('should not detect wash sale violations for purchases more than 30 days before sale', () => {
      const holding = mockHoldings[0]; // AAPL
      const now = new Date();
      const fortyDaysAgo = new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000);

      const transactions: Transaction[] = [
        {
          id: 't1',
          holdingId: '1',
          userId: 'user1',
          symbol: 'AAPL',
          type: 'buy',
          shares: 50,
          pricePerShare: 120,
          totalAmount: 6000,
          date: fortyDaysAgo,
          createdAt: fortyDaysAgo,
        },
      ];

      const violations = service.validateWashSaleRules(holding, transactions);

      expect(violations.length).toBe(0);
    });

    it('should not detect wash sale violations for sell transactions', () => {
      const holding = mockHoldings[0]; // AAPL
      const now = new Date();
      const twentyDaysAgo = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000);

      const transactions: Transaction[] = [
        {
          id: 't1',
          holdingId: '1',
          userId: 'user1',
          symbol: 'AAPL',
          type: 'sell',
          shares: 50,
          pricePerShare: 120,
          totalAmount: 6000,
          date: twentyDaysAgo,
          createdAt: twentyDaysAgo,
        },
      ];

      const violations = service.validateWashSaleRules(holding, transactions);

      expect(violations.length).toBe(0);
    });

    it('should not detect wash sale violations for different symbols', () => {
      const holding = mockHoldings[0]; // AAPL
      const now = new Date();
      const twentyDaysAgo = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000);

      const transactions: Transaction[] = [
        {
          id: 't1',
          holdingId: '2',
          userId: 'user1',
          symbol: 'TSLA',
          type: 'buy',
          shares: 50,
          pricePerShare: 180,
          totalAmount: 9000,
          date: twentyDaysAgo,
          createdAt: twentyDaysAgo,
        },
      ];

      const violations = service.validateWashSaleRules(holding, transactions);

      expect(violations.length).toBe(0);
    });
  });

  describe('calculateTaxSavings', () => {
    it('should calculate tax savings for short-term losses using ordinary income rate', () => {
      const savings = service.calculateTaxSavings(1000, CapitalGainsTreatment.SHORT_TERM);

      // 24% tax bracket
      expect(savings).toBe(240); // 1000 * 0.24
    });

    it('should calculate tax savings for long-term losses using capital gains rate', () => {
      const savings = service.calculateTaxSavings(1000, CapitalGainsTreatment.LONG_TERM);

      // 15% long-term capital gains rate for 24% bracket
      expect(savings).toBe(150); // 1000 * 0.15
    });

    it('should include state tax when configured', () => {
      const serviceWithStateTax = new TaxLossHarvestingService({
        taxBracket: TaxBracket.BRACKET_24,
        stateTaxRate: 0.05, // 5% state tax
        considerStateTax: true,
      });

      const savings = serviceWithStateTax.calculateTaxSavings(
        1000,
        CapitalGainsTreatment.SHORT_TERM
      );

      // Federal (24%) + State (5%) = 29%
      expect(savings).toBe(290); // 1000 * 0.29
    });
  });

  describe('generateTaxOptimizedRebalancing', () => {
    it('should generate sell recommendations for high-priority opportunities', async () => {
      const analysis = await service.analyzeTaxLossOpportunities(mockHoldings, mockTransactions);

      expect(analysis.recommendations.length).toBeGreaterThan(0);

      const appleRecommendation = analysis.recommendations.find((r) => r.symbol === 'AAPL');
      expect(appleRecommendation).toBeDefined();
      expect(appleRecommendation!.action).toBe('sell');
      expect(appleRecommendation!.quantity).toBe(100);
      expect(appleRecommendation!.washSaleCompliant).toBe(true);
      expect(appleRecommendation!.replacementSuggestions).toBeDefined();
      expect(appleRecommendation!.replacementSuggestions!.length).toBeGreaterThan(0);
    });

    it('should provide replacement suggestions', async () => {
      const analysis = await service.analyzeTaxLossOpportunities(mockHoldings, mockTransactions);

      const appleRecommendation = analysis.recommendations.find((r) => r.symbol === 'AAPL');
      expect(appleRecommendation!.replacementSuggestions).toContain('VTI');
      expect(appleRecommendation!.replacementSuggestions).toContain('VOO');
      expect(appleRecommendation!.replacementSuggestions).toContain('SPY');
    });
  });

  describe('getTaxLossHarvestingService', () => {
    it('should return singleton instance', () => {
      const instance1 = getTaxLossHarvestingService();
      const instance2 = getTaxLossHarvestingService();

      expect(instance1).toBe(instance2);
    });

    it('should create new instance with custom config', () => {
      const config: Partial<TaxLossHarvestingConfig> = {
        taxBracket: TaxBracket.BRACKET_37,
      };

      const instance = getTaxLossHarvestingService(config);
      expect(instance).toBeDefined();
    });
  });
});
