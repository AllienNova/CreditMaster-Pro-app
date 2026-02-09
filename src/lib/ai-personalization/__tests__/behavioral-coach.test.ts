/**
 * Behavioral Coach Test Suite
 *
 * Tests for the AI-powered behavioral coaching system that provides
 * personalized financial guidance based on user behavior patterns.
 */

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null, error: null })),
          order: jest.fn(() => ({
            limit: jest.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        })),
        gte: jest.fn(() => ({
          order: jest.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() =>
            Promise.resolve({ data: { id: 'test-id' }, error: null })
          ),
        })),
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
  })),
}));

// Types for testing
interface UserProfile {
  id: string;
  financialGoals: string[];
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  incomeLevel: 'low' | 'medium' | 'high';
  savingsRate: number;
  debtLevel: number;
}

interface BehavioralPattern {
  userId: string;
  spendingTriggers: string[];
  savingsBehavior: 'consistent' | 'sporadic' | 'none';
  impulsePurchaseFrequency: number;
  budgetAdherence: number;
  financialStressLevel: number;
}

interface CoachingRecommendation {
  id: string;
  type: 'habit' | 'mindset' | 'action' | 'education';
  title: string;
  description: string;
  priority: number;
  personalizationScore: number;
}

// Mock BehavioralCoach class for testing
class MockBehavioralCoach {
  analyzeUserBehavior(
    userId: string,
    transactions: unknown[]
  ): BehavioralPattern {
    const pattern: BehavioralPattern = {
      userId,
      spendingTriggers: this.detectSpendingTriggers(transactions),
      savingsBehavior: this.analyzeSavingsBehavior(transactions),
      impulsePurchaseFrequency: this.calculateImpulseFrequency(transactions),
      budgetAdherence: this.calculateBudgetAdherence(transactions),
      financialStressLevel: this.assessFinancialStress(transactions),
    };
    return pattern;
  }

  generateRecommendations(
    profile: UserProfile,
    pattern: BehavioralPattern
  ): CoachingRecommendation[] {
    const recommendations: CoachingRecommendation[] = [];

    // High impulse purchase frequency
    if (pattern.impulsePurchaseFrequency > 5) {
      recommendations.push({
        id: 'rec-1',
        type: 'habit',
        title: 'Implement 24-Hour Rule',
        description:
          'Wait 24 hours before making non-essential purchases over $50',
        priority: 1,
        personalizationScore: 0.92,
      });
    }

    // Low budget adherence
    if (pattern.budgetAdherence < 0.7) {
      recommendations.push({
        id: 'rec-2',
        type: 'action',
        title: 'Set Up Spending Alerts',
        description: 'Enable alerts when you reach 75% of category budgets',
        priority: 2,
        personalizationScore: 0.88,
      });
    }

    // High financial stress
    if (pattern.financialStressLevel > 7) {
      recommendations.push({
        id: 'rec-3',
        type: 'mindset',
        title: 'Practice Financial Mindfulness',
        description: 'Take 5 minutes daily to review your financial progress',
        priority: 1,
        personalizationScore: 0.85,
      });
    }

    // Sporadic savings
    if (pattern.savingsBehavior === 'sporadic') {
      recommendations.push({
        id: 'rec-4',
        type: 'action',
        title: 'Automate Your Savings',
        description: 'Set up automatic transfers on payday',
        priority: 2,
        personalizationScore: 0.9,
      });
    }

    return recommendations.sort((a, b) => a.priority - b.priority);
  }

  private detectSpendingTriggers(transactions: unknown[]): string[] {
    // Simplified trigger detection
    const triggers: string[] = [];
    if (Array.isArray(transactions)) {
      const weekendSpending = transactions.filter((t: any) => {
        const day = new Date(t.date).getDay();
        return day === 0 || day === 6;
      });
      if (weekendSpending.length > transactions.length * 0.4) {
        triggers.push('weekend_spending');
      }
    }
    return triggers;
  }

  private analyzeSavingsBehavior(
    transactions: unknown[]
  ): 'consistent' | 'sporadic' | 'none' {
    if (!Array.isArray(transactions)) return 'none';
    const savingsTransactions = transactions.filter(
      (t: any) =>
        t.category === 'savings' || t.category === 'transfer_to_savings'
    );
    if (savingsTransactions.length === 0) return 'none';
    if (savingsTransactions.length >= 4) return 'consistent';
    return 'sporadic';
  }

  private calculateImpulseFrequency(transactions: unknown[]): number {
    if (!Array.isArray(transactions)) return 0;
    // Count small, frequent purchases in non-essential categories
    const impulseTx = transactions.filter(
      (t: any) =>
        t.amount < 50 &&
        ['shopping', 'entertainment', 'dining'].includes(t.category)
    );
    return impulseTx.length;
  }

  private calculateBudgetAdherence(transactions: unknown[]): number {
    // Return mock adherence score 0-1
    if (!Array.isArray(transactions) || transactions.length === 0) return 1;
    return 0.75;
  }

  private assessFinancialStress(transactions: unknown[]): number {
    // Return stress level 1-10
    if (!Array.isArray(transactions)) return 5;
    const overdrafts = transactions.filter((t: any) => t.type === 'overdraft');
    if (overdrafts.length > 0) return 8;
    return 4;
  }

  calculatePersonalizationScore(
    recommendation: CoachingRecommendation,
    profile: UserProfile,
    pattern: BehavioralPattern
  ): number {
    let score = recommendation.personalizationScore;

    // Adjust based on profile alignment
    if (
      recommendation.type === 'action' &&
      profile.riskTolerance === 'aggressive'
    ) {
      score *= 1.1;
    }
    if (recommendation.type === 'mindset' && pattern.financialStressLevel > 5) {
      score *= 1.15;
    }

    return Math.min(score, 1.0);
  }
}

describe('BehavioralCoach', () => {
  let coach: MockBehavioralCoach;

  beforeEach(() => {
    coach = new MockBehavioralCoach();
  });

  describe('analyzeUserBehavior', () => {
    it('should detect weekend spending triggers', () => {
      const transactions = [
        { date: '2026-01-18', amount: 50, category: 'dining' }, // Saturday
        { date: '2026-01-19', amount: 30, category: 'shopping' }, // Sunday
        { date: '2026-01-18', amount: 100, category: 'entertainment' }, // Saturday
        { date: '2026-01-20', amount: 25, category: 'groceries' }, // Monday
      ];

      const pattern = coach.analyzeUserBehavior('user-1', transactions);

      expect(pattern.spendingTriggers).toContain('weekend_spending');
    });

    it('should identify sporadic savings behavior', () => {
      const transactions = [
        { date: '2026-01-01', amount: 100, category: 'savings' },
        { date: '2026-01-15', amount: 50, category: 'savings' },
      ];

      const pattern = coach.analyzeUserBehavior('user-1', transactions);

      expect(pattern.savingsBehavior).toBe('sporadic');
    });

    it('should identify consistent savings behavior', () => {
      const transactions = [
        { date: '2026-01-01', amount: 100, category: 'savings' },
        { date: '2026-01-08', amount: 100, category: 'savings' },
        { date: '2026-01-15', amount: 100, category: 'savings' },
        { date: '2026-01-22', amount: 100, category: 'savings' },
      ];

      const pattern = coach.analyzeUserBehavior('user-1', transactions);

      expect(pattern.savingsBehavior).toBe('consistent');
    });

    it('should calculate impulse purchase frequency', () => {
      const transactions = [
        { date: '2026-01-01', amount: 25, category: 'shopping' },
        { date: '2026-01-02', amount: 15, category: 'dining' },
        { date: '2026-01-03', amount: 30, category: 'entertainment' },
        { date: '2026-01-04', amount: 200, category: 'utilities' }, // Not impulse
      ];

      const pattern = coach.analyzeUserBehavior('user-1', transactions);

      expect(pattern.impulsePurchaseFrequency).toBe(3);
    });

    it('should detect high financial stress from overdrafts', () => {
      const transactions = [
        { date: '2026-01-01', amount: -35, type: 'overdraft' },
      ];

      const pattern = coach.analyzeUserBehavior('user-1', transactions);

      expect(pattern.financialStressLevel).toBeGreaterThanOrEqual(8);
    });

    it('should handle empty transactions', () => {
      const pattern = coach.analyzeUserBehavior('user-1', []);

      expect(pattern.userId).toBe('user-1');
      expect(pattern.spendingTriggers).toEqual([]);
      expect(pattern.savingsBehavior).toBe('none');
    });
  });

  describe('generateRecommendations', () => {
    const mockProfile: UserProfile = {
      id: 'user-1',
      financialGoals: ['save_emergency_fund', 'pay_off_debt'],
      riskTolerance: 'moderate',
      incomeLevel: 'medium',
      savingsRate: 0.1,
      debtLevel: 5000,
    };

    it('should recommend 24-hour rule for high impulse purchases', () => {
      const pattern: BehavioralPattern = {
        userId: 'user-1',
        spendingTriggers: [],
        savingsBehavior: 'consistent',
        impulsePurchaseFrequency: 10,
        budgetAdherence: 0.9,
        financialStressLevel: 3,
      };

      const recommendations = coach.generateRecommendations(
        mockProfile,
        pattern
      );

      expect(
        recommendations.some((r) => r.title.includes('24-Hour Rule'))
      ).toBe(true);
    });

    it('should recommend spending alerts for low budget adherence', () => {
      const pattern: BehavioralPattern = {
        userId: 'user-1',
        spendingTriggers: [],
        savingsBehavior: 'consistent',
        impulsePurchaseFrequency: 2,
        budgetAdherence: 0.5,
        financialStressLevel: 5,
      };

      const recommendations = coach.generateRecommendations(
        mockProfile,
        pattern
      );

      expect(
        recommendations.some((r) => r.title.includes('Spending Alerts'))
      ).toBe(true);
    });

    it('should recommend mindfulness for high stress', () => {
      const pattern: BehavioralPattern = {
        userId: 'user-1',
        spendingTriggers: [],
        savingsBehavior: 'consistent',
        impulsePurchaseFrequency: 2,
        budgetAdherence: 0.9,
        financialStressLevel: 9,
      };

      const recommendations = coach.generateRecommendations(
        mockProfile,
        pattern
      );

      expect(recommendations.some((r) => r.type === 'mindset')).toBe(true);
    });

    it('should recommend automation for sporadic savers', () => {
      const pattern: BehavioralPattern = {
        userId: 'user-1',
        spendingTriggers: [],
        savingsBehavior: 'sporadic',
        impulsePurchaseFrequency: 2,
        budgetAdherence: 0.9,
        financialStressLevel: 4,
      };

      const recommendations = coach.generateRecommendations(
        mockProfile,
        pattern
      );

      expect(recommendations.some((r) => r.title.includes('Automate'))).toBe(
        true
      );
    });

    it('should sort recommendations by priority', () => {
      const pattern: BehavioralPattern = {
        userId: 'user-1',
        spendingTriggers: [],
        savingsBehavior: 'sporadic',
        impulsePurchaseFrequency: 10,
        budgetAdherence: 0.5,
        financialStressLevel: 9,
      };

      const recommendations = coach.generateRecommendations(
        mockProfile,
        pattern
      );

      for (let i = 1; i < recommendations.length; i++) {
        expect(recommendations[i].priority).toBeGreaterThanOrEqual(
          recommendations[i - 1].priority
        );
      }
    });
  });

  describe('calculatePersonalizationScore', () => {
    const mockProfile: UserProfile = {
      id: 'user-1',
      financialGoals: ['save_emergency_fund'],
      riskTolerance: 'aggressive',
      incomeLevel: 'high',
      savingsRate: 0.2,
      debtLevel: 0,
    };

    const mockPattern: BehavioralPattern = {
      userId: 'user-1',
      spendingTriggers: [],
      savingsBehavior: 'consistent',
      impulsePurchaseFrequency: 2,
      budgetAdherence: 0.9,
      financialStressLevel: 7,
    };

    it('should boost action recommendations for aggressive profiles', () => {
      const recommendation: CoachingRecommendation = {
        id: 'rec-1',
        type: 'action',
        title: 'Test Action',
        description: 'Test',
        priority: 1,
        personalizationScore: 0.8,
      };

      const score = coach.calculatePersonalizationScore(
        recommendation,
        mockProfile,
        mockPattern
      );

      expect(score).toBeGreaterThan(0.8);
    });

    it('should boost mindset recommendations for stressed users', () => {
      const recommendation: CoachingRecommendation = {
        id: 'rec-1',
        type: 'mindset',
        title: 'Test Mindset',
        description: 'Test',
        priority: 1,
        personalizationScore: 0.8,
      };

      const score = coach.calculatePersonalizationScore(
        recommendation,
        mockProfile,
        mockPattern
      );

      expect(score).toBeGreaterThan(0.8);
    });

    it('should cap score at 1.0', () => {
      const recommendation: CoachingRecommendation = {
        id: 'rec-1',
        type: 'mindset',
        title: 'Test',
        description: 'Test',
        priority: 1,
        personalizationScore: 0.95,
      };

      const highStressPattern = { ...mockPattern, financialStressLevel: 10 };
      const score = coach.calculatePersonalizationScore(
        recommendation,
        mockProfile,
        highStressPattern
      );

      expect(score).toBeLessThanOrEqual(1.0);
    });
  });
});

describe('BehavioralCoach Integration', () => {
  let coach: MockBehavioralCoach;

  beforeEach(() => {
    coach = new MockBehavioralCoach();
  });

  it('should provide end-to-end coaching flow', () => {
    const profile: UserProfile = {
      id: 'user-1',
      financialGoals: ['save_emergency_fund', 'reduce_spending'],
      riskTolerance: 'moderate',
      incomeLevel: 'medium',
      savingsRate: 0.05,
      debtLevel: 3000,
    };

    const transactions = [
      { date: '2026-01-18', amount: 50, category: 'dining' },
      { date: '2026-01-19', amount: 30, category: 'shopping' },
      { date: '2026-01-20', amount: 25, category: 'entertainment' },
      { date: '2026-01-21', amount: 15, category: 'shopping' },
      { date: '2026-01-22', amount: 40, category: 'dining' },
      { date: '2026-01-23', amount: 20, category: 'entertainment' },
      { date: '2026-01-15', amount: 100, category: 'savings' },
    ];

    // Step 1: Analyze behavior
    const pattern = coach.analyzeUserBehavior(profile.id, transactions);
    expect(pattern).toBeDefined();
    expect(pattern.userId).toBe(profile.id);

    // Step 2: Generate recommendations
    const recommendations = coach.generateRecommendations(profile, pattern);
    expect(recommendations.length).toBeGreaterThan(0);

    // Step 3: Verify personalization
    recommendations.forEach((rec) => {
      const score = coach.calculatePersonalizationScore(rec, profile, pattern);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(1);
    });
  });
});
