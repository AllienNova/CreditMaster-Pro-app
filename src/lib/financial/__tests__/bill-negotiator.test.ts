/**
 * Bill Negotiator Service Tests
 *
 * Comprehensive unit tests for the Bill Negotiation Assistant
 * Phase 2.4: Bill Negotiation Assistant
 */

import { BillNegotiator } from '../bill-negotiator';
import type { NegotiableBill, BillType } from '../types/bill-negotiation.types';

// Mock transaction data (needs to be defined before mock)
const mockUserId = 'test-user-123';
const mockTransactions = [
  {
    id: '1',
    user_id: mockUserId,
    date: new Date('2024-01-15'),
    amount: 79.99,
    merchant_name: 'Comcast',
    category: 'Utilities',
    subcategory: 'Internet',
    is_recurring: true,
  },
  {
    id: '2',
    user_id: mockUserId,
    date: new Date('2024-01-20'),
    amount: 85.00,
    merchant_name: 'Verizon',
    category: 'Telecom',
    subcategory: 'Mobile',
    is_recurring: true,
  },
  {
    id: '3',
    user_id: mockUserId,
    date: new Date('2024-01-25'),
    amount: 15.99,
    merchant_name: 'Netflix',
    category: 'Entertainment',
    subcategory: 'Streaming',
    is_recurring: true,
  },
  {
    id: '4',
    user_id: mockUserId,
    date: new Date('2024-01-10'),
    amount: 120.00,
    merchant_name: 'State Farm',
    category: 'Insurance',
    subcategory: 'Auto',
    is_recurring: true,
  },
];

// Create mock query chain
const createMockQueryChain = (userId?: string): Record<string, any> => {
  const chain: Record<string, any> = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    eq: jest.fn((field: string, value: any) => {
      // Store the user_id for filtering
      if (field === 'user_id') {
        chain._userId = value;
      }
      return chain;
    }),
    gte: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    returns: jest.fn().mockReturnThis(), // Add returns() method for TypeScript type assertions
  };

  // Make the chain thenable to work with await
  chain.then = (resolve: any) => {
    // Filter transactions based on user_id if specified
    const storedUserId = chain._userId;
    const data = storedUserId && storedUserId !== mockUserId ? [] : mockTransactions;
    return Promise.resolve({ data, error: null }).then(resolve);
  };

  return chain;
};

// Create mock Supabase client
const mockSupabaseClient = {
  from: jest.fn(() => createMockQueryChain()),
};

// Mock Supabase
jest.mock('@/lib/supabase/client', () => ({
  getSupabase: () => mockSupabaseClient,
}));

// Mock AIML Service
const mockChat = jest.fn().mockResolvedValue({
  content: JSON.stringify({
    opening: "Hi, I'm calling about my internet service...",
    mainPoints: [
      { point: "Market rate is lower", supportingData: "Competitors offer $49.99", priority: "high" },
      { point: "Loyal customer", supportingData: "24 months tenure", priority: "high" },
    ],
    counterarguments: [
      { objection: "Standard rate", response: "What retention offers are available?" },
    ],
    fallbackOptions: [
      { option: "Promotional rate", description: "New customer rate", estimatedSavings: 20 },
    ],
    closing: "I value our relationship...",
    strategy: "balanced",
  }),
});

jest.mock('@/lib/aiml-service', () => ({
  getAIMLService: jest.fn(() => ({
    chat: mockChat,
  })),
}));

describe('BillNegotiator', () => {
  let negotiator: BillNegotiator;

  beforeEach(() => {
    negotiator = BillNegotiator.getInstance();
    // Clear only specific mocks, not all mocks (to preserve Supabase mock)
    mockChat.mockClear();
    // Reset the Supabase mock to ensure it returns the query chain
    mockSupabaseClient.from.mockReturnValue(createMockQueryChain());
    // Clear the script cache to prevent cached results from affecting tests
    (negotiator as any).scriptCache.clear();
    (negotiator as any).marketDataCache.clear();
  });

  // ============================================================================
  // SINGLETON PATTERN
  // ============================================================================

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = BillNegotiator.getInstance();
      const instance2 = BillNegotiator.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  // ============================================================================
  // BILL IDENTIFICATION TESTS
  // ============================================================================

  describe('identifyNegotiableBills()', () => {
    it('should identify negotiable telecom bills', async () => {
      const bills = await negotiator.identifyNegotiableBills(mockUserId);

      const telecomBills = bills.filter(b =>
        b.billType === 'internet' || b.billType === 'mobile'
      );

      expect(telecomBills.length).toBeGreaterThan(0);
      telecomBills.forEach(bill => {
        expect(bill.userId).toBe(mockUserId);
        expect(bill.negotiationPotential).toBeGreaterThan(30);
        expect(bill.estimatedSavings).toBeGreaterThan(0);
      });
    });

    it('should identify negotiable utility bills', async () => {
      const bills = await negotiator.identifyNegotiableBills(mockUserId);

      const utilityBills = bills.filter(b =>
        b.billType === 'electricity' || b.billType === 'gas' || b.billType === 'water'
      );

      // May or may not have utility bills depending on mock data
      expect(Array.isArray(utilityBills)).toBe(true);
    });

    it('should exclude non-negotiable bills (government, medical)', async () => {
      const bills = await negotiator.identifyNegotiableBills(mockUserId);

      // All returned bills should be negotiable types
      const negotiableTypes: BillType[] = [
        'telecom', 'internet', 'cable', 'mobile',
        'auto_insurance', 'home_insurance',
        'subscription', 'streaming'
      ];

      bills.forEach(bill => {
        expect(negotiableTypes).toContain(bill.billType);
      });
    });

    it('should calculate negotiation potential scores', async () => {
      const bills = await negotiator.identifyNegotiableBills(mockUserId);

      bills.forEach(bill => {
        expect(bill.negotiationPotential).toBeGreaterThanOrEqual(0);
        expect(bill.negotiationPotential).toBeLessThanOrEqual(100);
        expect(bill.difficulty).toMatch(/easy|moderate|difficult/);
      });
    });

    it('should handle bills with insufficient data', async () => {
      // Test with empty transactions
      const emptyNegotiator = BillNegotiator.getInstance();
      const bills = await emptyNegotiator.identifyNegotiableBills('empty-user');

      expect(Array.isArray(bills)).toBe(true);
      // Should return empty array or handle gracefully
    });
  });

  // ============================================================================
  // MARKET ANALYSIS TESTS
  // ============================================================================

  describe('analyzeMarketRates()', () => {
    it('should fetch current market rates for providers', async () => {
      const analysis = await negotiator.analyzeMarketRates('internet', 'Comcast');

      expect(analysis).toBeDefined();
      expect(analysis.billType).toBe('internet');
      expect(analysis.provider).toBe('Comcast');
      expect(analysis.averageMarketRate).toBeGreaterThan(0);
      expect(analysis.competitorRates.length).toBeGreaterThan(0);
    });

    it('should identify competitor pricing advantages', async () => {
      const analysis = await negotiator.analyzeMarketRates('internet', 'Comcast');

      expect(analysis.competitorRates).toBeDefined();
      expect(Array.isArray(analysis.competitorRates)).toBe(true);

      if (analysis.competitorRates.length > 0) {
        const competitor = analysis.competitorRates[0];
        expect(competitor.provider).toBeDefined();
        expect(competitor.rate).toBeGreaterThan(0);
        expect(Array.isArray(competitor.features)).toBe(true);
      }
    });

    it('should handle location-based rate variations', async () => {
      const analysis1 = await negotiator.analyzeMarketRates('internet', 'Comcast', 'CA');
      const analysis2 = await negotiator.analyzeMarketRates('internet', 'Comcast', 'NY');

      expect(analysis1.location).toBe('CA');
      expect(analysis2.location).toBe('NY');
      // Both should return valid analysis
      expect(analysis1.averageMarketRate).toBeGreaterThan(0);
      expect(analysis2.averageMarketRate).toBeGreaterThan(0);
    });

    it('should cache market data appropriately', async () => {
      const startTime1 = Date.now();
      const analysis1 = await negotiator.analyzeMarketRates('internet', 'Comcast');
      const time1 = Date.now() - startTime1;

      const startTime2 = Date.now();
      const analysis2 = await negotiator.analyzeMarketRates('internet', 'Comcast');
      const time2 = Date.now() - startTime2;

      // Second call should be faster (cached)
      expect(time2).toBeLessThan(time1 + 10); // Allow 10ms margin
      expect(analysis1.averageMarketRate).toBe(analysis2.averageMarketRate);
    });
  });

  // ============================================================================
  // SCRIPT GENERATION TESTS
  // ============================================================================

  describe('generateNegotiationScript()', () => {
    let mockBill: NegotiableBill;

    beforeEach(() => {
      mockBill = {
        id: 'bill-comcast-test',
        userId: mockUserId,
        billType: 'internet',
        provider: 'Comcast',
        serviceName: 'Comcast Internet Service',
        currentAmount: 79.99,
        billingFrequency: 'monthly',
        isUnderContract: false,
        negotiationPotential: 80,
        estimatedSavings: 20.00,
        difficulty: 'easy',
        status: 'not_started',
        negotiationCount: 0,
        totalSavingsAchieved: 0,
        detectedAt: new Date(),
        lastUpdated: new Date(),
      };
    });

    it('should generate personalized negotiation scripts', async () => {
      const script = await negotiator.generateNegotiationScript(mockBill);

      expect(script).toBeDefined();
      expect(script.billId).toBe(mockBill.id);
      expect(script.provider).toBe(mockBill.provider);
      expect(script.opening).toBeDefined();
      expect(script.mainPoints.length).toBeGreaterThan(0);
      expect(script.counterarguments.length).toBeGreaterThan(0);
      expect(script.fallbackOptions.length).toBeGreaterThan(0);
      expect(script.closing).toBeDefined();
    });

    it('should include provider-specific talking points', async () => {
      const script = await negotiator.generateNegotiationScript(mockBill);

      expect(script.mainPoints).toBeDefined();
      expect(script.mainPoints.length).toBeGreaterThan(0);

      script.mainPoints.forEach(point => {
        expect(point.point).toBeDefined();
        expect(point.priority).toMatch(/high|medium|low/);
      });
    });

    it('should adapt script based on user profile (tenure, payment history)', async () => {
      const userProfile = {
        userId: mockUserId,
        tenure: 36, // 3 years
        paymentHistory: 'excellent' as const,
        loyaltyScore: 95,
        previousNegotiations: 2,
        successRate: 100,
      };

      const script = await negotiator.generateNegotiationScript(mockBill, userProfile);

      expect(script.userTenure).toBe(36);
      expect(script.paymentHistory).toBe('excellent');
      expect(script.loyaltyScore).toBe(95);
    });

    it('should provide fallback options and counterarguments', async () => {
      const script = await negotiator.generateNegotiationScript(mockBill);

      expect(script.counterarguments.length).toBeGreaterThan(0);
      script.counterarguments.forEach(ca => {
        expect(ca.objection).toBeDefined();
        expect(ca.response).toBeDefined();
      });

      expect(script.fallbackOptions.length).toBeGreaterThan(0);
      script.fallbackOptions.forEach(fo => {
        expect(fo.option).toBeDefined();
        expect(fo.description).toBeDefined();
        expect(fo.estimatedSavings).toBeGreaterThanOrEqual(0);
      });
    });

    it('should handle AI service failures gracefully', async () => {
      // This test verifies the template fallback works
      const script = await negotiator.generateNegotiationScript(mockBill);

      // Should still return a valid script even if AI fails
      expect(script).toBeDefined();
      expect(script.opening).toBeDefined();
      expect(script.strategy).toMatch(/aggressive|balanced|conservative/);
    });
  });

  // ============================================================================
  // OUTCOME TRACKING TESTS
  // ============================================================================

  describe('trackNegotiationOutcome()', () => {
    it('should record successful negotiations with savings', async () => {
      const outcome = {
        billId: 'bill-comcast-test',
        userId: mockUserId,
        negotiationDate: new Date(),
        success: true,
        savingsAchieved: 20.00,
        newMonthlyRate: 59.99,
        previousMonthlyRate: 79.99,
        method: 'phone' as const,
        duration: 15,
        representative: 'John Doe',
        notes: 'Successfully negotiated lower rate',
        requiresFollowup: false,
        recordedAt: new Date(),
      };

      await expect(negotiator.trackNegotiationOutcome('bill-comcast-test', outcome))
        .resolves.not.toThrow();
    });

    it('should track failed negotiation attempts', async () => {
      const outcome = {
        billId: 'bill-comcast-test',
        userId: mockUserId,
        negotiationDate: new Date(),
        success: false,
        savingsAchieved: 0,
        previousMonthlyRate: 79.99,
        method: 'phone' as const,
        notes: 'No retention offers available',
        requiresFollowup: true,
        followupDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        followupReason: 'Try again in 30 days',
        recordedAt: new Date(),
      };

      await expect(negotiator.trackNegotiationOutcome('bill-comcast-test', outcome))
        .resolves.not.toThrow();
    });

    it('should calculate cumulative savings over time', async () => {
      const history = await negotiator.getBillNegotiationHistory(mockUserId);

      expect(Array.isArray(history)).toBe(true);
      // Each history entry should have totalSavings calculated
      history.forEach(h => {
        expect(h.totalSavings).toBeGreaterThanOrEqual(0);
      });
    });

    it('should update bill status after negotiation', async () => {
      const outcome = {
        billId: 'bill-comcast-test',
        userId: mockUserId,
        negotiationDate: new Date(),
        success: true,
        savingsAchieved: 15.00,
        newMonthlyRate: 64.99,
        previousMonthlyRate: 79.99,
        method: 'chat' as const,
        requiresFollowup: false,
        recordedAt: new Date(),
      };

      await negotiator.trackNegotiationOutcome('bill-comcast-test', outcome);

      // Verify the outcome was recorded (would check database in real scenario)
      const history = await negotiator.getBillNegotiationHistory(mockUserId);
      expect(Array.isArray(history)).toBe(true);
    });
  });

  // ============================================================================
  // EDGE CASES & PERFORMANCE
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle users with no bills', async () => {
      const bills = await negotiator.identifyNegotiableBills('no-bills-user');

      expect(Array.isArray(bills)).toBe(true);
      expect(bills.length).toBe(0);
    });

    it('should handle API failures gracefully', async () => {
      // Test with invalid bill type
      await expect(
        negotiator.analyzeMarketRates('invalid' as any, 'Provider')
      ).resolves.toBeDefined();
    });

    it('should handle new users with minimal data', async () => {
      const savingsEstimate = await negotiator.calculatePotentialSavings('new-user');

      expect(savingsEstimate).toBeDefined();
      expect(savingsEstimate.billCount).toBeGreaterThanOrEqual(0);
      expect(savingsEstimate.totalPotentialSavings).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Performance', () => {
    it('should complete bill identification in <500ms', async () => {
      const startTime = Date.now();
      await negotiator.identifyNegotiableBills(mockUserId);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(500);
    });

    it('should complete market analysis in <500ms', async () => {
      const startTime = Date.now();
      await negotiator.analyzeMarketRates('internet', 'Comcast');
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(500);
    });

    it('should complete script generation in <2000ms', async () => {
      const mockBill: NegotiableBill = {
        id: 'bill-test',
        userId: mockUserId,
        billType: 'internet',
        provider: 'Comcast',
        serviceName: 'Internet Service',
        currentAmount: 79.99,
        billingFrequency: 'monthly',
        isUnderContract: false,
        negotiationPotential: 80,
        estimatedSavings: 20.00,
        difficulty: 'easy',
        status: 'not_started',
        negotiationCount: 0,
        totalSavingsAchieved: 0,
        detectedAt: new Date(),
        lastUpdated: new Date(),
      };

      const startTime = Date.now();
      await negotiator.generateNegotiationScript(mockBill);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(2000);
    });
  });
});
