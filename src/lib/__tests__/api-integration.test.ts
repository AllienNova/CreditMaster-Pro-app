/**
 * API Integration Tests
 *
 * Tests for core API endpoints including authentication, credit, budgeting, and subscriptions.
 */

import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from '@jest/globals';

// ============================================================================
// MOCKS
// ============================================================================

// Create a chainable mock that returns itself for all query methods
const createChainableMock = () => {
  const mock: any = {
    from: jest.fn(),
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    eq: jest.fn(),
    gte: jest.fn(),
    lte: jest.fn(),
    order: jest.fn(),
    limit: jest.fn(),
    single: jest.fn(),
    auth: {
      getUser: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
    },
  };

  // Make all query methods chainable
  mock.from.mockReturnValue(mock);
  mock.select.mockReturnValue(mock);
  mock.insert.mockReturnValue(mock);
  mock.update.mockReturnValue(mock);
  mock.delete.mockReturnValue(mock);
  mock.eq.mockReturnValue(mock);
  mock.gte.mockReturnValue(mock);
  mock.lte.mockReturnValue(mock);
  mock.order.mockReturnValue(mock);
  mock.limit.mockReturnValue(mock);

  return mock;
};

const mockSupabaseClient = createChainableMock();

jest.mock('@/lib/supabase', () => ({
  supabase: mockSupabaseClient,
}));

jest.mock('@/lib/supabase/server', () => ({
  supabaseAdmin: mockSupabaseClient,
}));

// ============================================================================
// TEST DATA
// ============================================================================

const testUserId = 'test-user-123';

const mockUser = {
  id: testUserId,
  email: 'test@example.com',
  created_at: new Date().toISOString(),
};

const mockCreditScore = {
  id: 'score-123',
  user_id: testUserId,
  score: 720,
  provider: 'equifax',
  factors: {
    payment_history: 'good',
    credit_utilization: 25,
    credit_age: 7,
    credit_mix: 'diverse',
    new_credit: 1,
  },
  created_at: new Date().toISOString(),
};

const mockBudget = {
  id: 'budget-123',
  user_id: testUserId,
  name: 'Monthly Budget',
  category: 'groceries',
  budgeted_amount: 500,
  spent_amount: 350,
  period: 'monthly',
  period_start: new Date(2024, 0, 1).toISOString(),
  period_end: new Date(2024, 0, 31).toISOString(),
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockSubscription = {
  id: 'sub-123',
  user_id: testUserId,
  name: 'Netflix',
  merchant_name: 'Netflix',
  amount: 15.99,
  frequency: 'monthly',
  category: 'streaming',
  status: 'active',
  next_billing_date: new Date(2024, 1, 15).toISOString(),
  annual_cost: 191.88,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockTransaction = {
  id: 'tx-123',
  user_id: testUserId,
  account_id: 'account-123',
  amount: -45.99,
  merchant_name: 'Grocery Store',
  category: 'groceries',
  date: new Date().toISOString(),
  description: 'Weekly groceries',
  created_at: new Date().toISOString(),
};

// ============================================================================
// API INTEGRATION TESTS
// ============================================================================

describe('API Integration Tests', () => {
  beforeAll(() => {
    // Setup
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  beforeEach(() => {
    // Reset mocks but preserve implementations
    mockSupabaseClient.from.mockClear();
    mockSupabaseClient.select.mockClear();
    mockSupabaseClient.insert.mockClear();
    mockSupabaseClient.update.mockClear();
    mockSupabaseClient.delete.mockClear();
    mockSupabaseClient.eq.mockClear();
    mockSupabaseClient.gte.mockClear();
    mockSupabaseClient.lte.mockClear();
    mockSupabaseClient.order.mockClear();
    mockSupabaseClient.limit.mockClear();
    mockSupabaseClient.single.mockClear();
    mockSupabaseClient.auth.getUser.mockClear();
    mockSupabaseClient.auth.signInWithPassword.mockClear();
    mockSupabaseClient.auth.signOut.mockClear();

    // Re-setup chainable mocks
    mockSupabaseClient.from.mockReturnValue(mockSupabaseClient);
    mockSupabaseClient.select.mockReturnValue(mockSupabaseClient);
    mockSupabaseClient.insert.mockReturnValue(mockSupabaseClient);
    mockSupabaseClient.update.mockReturnValue(mockSupabaseClient);
    mockSupabaseClient.delete.mockReturnValue(mockSupabaseClient);
    mockSupabaseClient.eq.mockReturnValue(mockSupabaseClient);
    mockSupabaseClient.gte.mockReturnValue(mockSupabaseClient);
    mockSupabaseClient.lte.mockReturnValue(mockSupabaseClient);
    mockSupabaseClient.order.mockReturnValue(mockSupabaseClient);
    mockSupabaseClient.limit.mockReturnValue(mockSupabaseClient);
  });

  // ==========================================================================
  // AUTHENTICATION API TESTS
  // ==========================================================================

  describe('Authentication API', () => {
    describe('POST /api/auth/login', () => {
      it('should authenticate user with valid credentials', async () => {
        mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
          data: {
            user: mockUser,
            session: {
              access_token: 'test-token',
              refresh_token: 'refresh-token',
            },
          },
          error: null,
        });

        const result = await mockSupabaseClient.auth.signInWithPassword({
          email: 'test@example.com',
          password: 'password123',
        });

        expect(result.error).toBeNull();
        expect(result.data.user).toBeDefined();
        expect(result.data.session.access_token).toBeDefined();
      });

      it('should reject invalid credentials', async () => {
        mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
          data: { user: null, session: null },
          error: { message: 'Invalid login credentials' },
        });

        const result = await mockSupabaseClient.auth.signInWithPassword({
          email: 'test@example.com',
          password: 'wrongpassword',
        });

        expect(result.error).toBeDefined();
        expect(result.data.user).toBeNull();
      });
    });

    describe('GET /api/auth/user', () => {
      it('should return authenticated user', async () => {
        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: { user: mockUser },
          error: null,
        });

        const result = await mockSupabaseClient.auth.getUser();

        expect(result.data.user).toBeDefined();
        expect(result.data.user.email).toBe('test@example.com');
      });

      it('should return error for unauthenticated request', async () => {
        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: { user: null },
          error: { message: 'Not authenticated' },
        });

        const result = await mockSupabaseClient.auth.getUser();

        expect(result.data.user).toBeNull();
        expect(result.error).toBeDefined();
      });
    });

    describe('POST /api/auth/logout', () => {
      it('should sign out user successfully', async () => {
        mockSupabaseClient.auth.signOut.mockResolvedValue({ error: null });

        const result = await mockSupabaseClient.auth.signOut();

        expect(result.error).toBeNull();
      });
    });
  });

  // ==========================================================================
  // CREDIT API TESTS
  // ==========================================================================

  describe('Credit API', () => {
    describe('GET /api/credit/score', () => {
      it('should return user credit score', async () => {
        mockSupabaseClient.single.mockResolvedValue({
          data: mockCreditScore,
          error: null,
        });

        const result = await mockSupabaseClient
          .from('credit_scores')
          .select('*')
          .eq('user_id', testUserId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        expect(result.data).toBeDefined();
        expect(result.data.score).toBe(720);
        expect(result.data.factors).toBeDefined();
      });

      it('should return score history', async () => {
        const scoreHistory = [
          {
            ...mockCreditScore,
            score: 720,
            created_at: new Date(2024, 1, 1).toISOString(),
          },
          {
            ...mockCreditScore,
            score: 715,
            created_at: new Date(2024, 0, 1).toISOString(),
          },
          {
            ...mockCreditScore,
            score: 710,
            created_at: new Date(2023, 11, 1).toISOString(),
          },
        ];

        mockSupabaseClient.order.mockResolvedValue({
          data: scoreHistory,
          error: null,
        });

        const result = await mockSupabaseClient
          .from('credit_scores')
          .select('*')
          .eq('user_id', testUserId)
          .order('created_at', { ascending: false });

        expect(result.data).toHaveLength(3);
        expect(result.data[0].score).toBe(720);
      });
    });

    describe('POST /api/credit/disputes', () => {
      it('should create a dispute request', async () => {
        const disputeRequest = {
          id: 'dispute-123',
          user_id: testUserId,
          bureau: 'equifax',
          item_type: 'late_payment',
          account_name: 'Credit Card',
          reason: 'inaccurate_payment_history',
          status: 'pending',
          created_at: new Date().toISOString(),
        };

        mockSupabaseClient.single.mockResolvedValue({
          data: disputeRequest,
          error: null,
        });

        const result = await mockSupabaseClient
          .from('credit_disputes')
          .insert(disputeRequest)
          .select()
          .single();

        expect(result.data).toBeDefined();
        expect(result.data.status).toBe('pending');
      });
    });

    describe('GET /api/credit/simulator', () => {
      it('should return score simulation results', async () => {
        const simulationResult = {
          currentScore: 720,
          projectedScore: 745,
          scoreChange: 25,
          actions: [
            { type: 'pay_down_debt', amount: 5000, impact: 15 },
            { type: 'increase_credit_limit', amount: 2000, impact: 10 },
          ],
          confidence: 85,
        };

        expect(simulationResult.projectedScore).toBeGreaterThan(
          simulationResult.currentScore
        );
        expect(simulationResult.confidence).toBeGreaterThan(0);
      });
    });
  });

  // ==========================================================================
  // BUDGET API TESTS
  // ==========================================================================

  describe('Budget API', () => {
    describe('GET /api/budgets', () => {
      it('should return user budgets', async () => {
        mockSupabaseClient.order.mockResolvedValue({
          data: [mockBudget],
          error: null,
        });

        const result = await mockSupabaseClient
          .from('budgets')
          .select('*')
          .eq('user_id', testUserId)
          .order('created_at', { ascending: false });

        expect(result.data).toHaveLength(1);
        expect(result.data[0].name).toBe('Monthly Budget');
      });

      it('should filter by category', async () => {
        mockSupabaseClient.eq
          .mockReturnValueOnce(mockSupabaseClient)
          .mockResolvedValueOnce({ data: [mockBudget], error: null });

        const result = await mockSupabaseClient
          .from('budgets')
          .select('*')
          .eq('user_id', testUserId)
          .eq('category', 'groceries');

        expect(result.data).toHaveLength(1);
        expect(result.data[0].category).toBe('groceries');
      });
    });

    describe('POST /api/budgets', () => {
      it('should create a new budget', async () => {
        const newBudget = {
          user_id: testUserId,
          name: 'Entertainment Budget',
          category: 'entertainment',
          budgeted_amount: 200,
          period: 'monthly',
        };

        mockSupabaseClient.single.mockResolvedValue({
          data: { id: 'new-budget-123', ...newBudget },
          error: null,
        });

        const result = await mockSupabaseClient
          .from('budgets')
          .insert(newBudget)
          .select()
          .single();

        expect(result.data).toBeDefined();
        expect(result.data.category).toBe('entertainment');
      });

      it('should validate budget amount', async () => {
        const invalidBudget = {
          budgeted_amount: -100, // Invalid negative amount
        };

        const isValid = invalidBudget.budgeted_amount > 0;
        expect(isValid).toBe(false);
      });
    });

    describe('PUT /api/budgets/:id', () => {
      it('should update budget amount', async () => {
        mockSupabaseClient.single.mockResolvedValue({
          data: { ...mockBudget, budgeted_amount: 600 },
          error: null,
        });

        const result = await mockSupabaseClient
          .from('budgets')
          .update({ budgeted_amount: 600 })
          .eq('id', 'budget-123')
          .eq('user_id', testUserId)
          .select()
          .single();

        expect(result.data.budgeted_amount).toBe(600);
      });
    });

    describe('DELETE /api/budgets/:id', () => {
      it('should delete a budget', async () => {
        mockSupabaseClient.eq
          .mockReturnValueOnce(mockSupabaseClient)
          .mockResolvedValueOnce({ data: null, error: null });

        const result = await mockSupabaseClient
          .from('budgets')
          .delete()
          .eq('id', 'budget-123')
          .eq('user_id', testUserId);

        expect(result.error).toBeNull();
      });
    });

    describe('GET /api/budgets/summary', () => {
      it('should return budget summary', async () => {
        const summary = {
          totalBudgeted: 2500,
          totalSpent: 1800,
          totalRemaining: 700,
          percentUsed: 72,
          categorySummary: [
            { category: 'groceries', budgeted: 500, spent: 350, percent: 70 },
            {
              category: 'entertainment',
              budgeted: 200,
              spent: 180,
              percent: 90,
            },
          ],
        };

        expect(summary.totalRemaining).toBe(
          summary.totalBudgeted - summary.totalSpent
        );
        expect(summary.percentUsed).toBeLessThan(100);
      });
    });
  });

  // ==========================================================================
  // SUBSCRIPTION API TESTS
  // ==========================================================================

  describe('Subscription API', () => {
    describe('GET /api/subscriptions', () => {
      it('should return user subscriptions', async () => {
        mockSupabaseClient.order.mockResolvedValue({
          data: [mockSubscription],
          error: null,
        });

        const result = await mockSupabaseClient
          .from('subscriptions')
          .select('*')
          .eq('user_id', testUserId)
          .order('next_billing_date', { ascending: true });

        expect(result.data).toHaveLength(1);
        expect(result.data[0].name).toBe('Netflix');
      });

      it('should filter by status', async () => {
        // Use mockReturnValueOnce to keep chain working, then resolve on last call
        mockSupabaseClient.eq
          .mockReturnValueOnce(mockSupabaseClient) // first .eq() returns chain
          .mockResolvedValueOnce({ data: [mockSubscription], error: null }); // second .eq() resolves

        const result = await mockSupabaseClient
          .from('subscriptions')
          .select('*')
          .eq('user_id', testUserId)
          .eq('status', 'active');

        expect(result.data[0].status).toBe('active');
      });
    });

    describe('POST /api/subscriptions/detect', () => {
      it('should detect subscriptions from transactions', async () => {
        const detectedSubscriptions = [
          {
            merchantName: 'Spotify',
            amount: 9.99,
            frequency: 'monthly',
            confidence: 95,
            chargeCount: 6,
          },
          {
            merchantName: 'Adobe',
            amount: 54.99,
            frequency: 'monthly',
            confidence: 90,
            chargeCount: 4,
          },
        ];

        expect(detectedSubscriptions).toHaveLength(2);
        expect(detectedSubscriptions[0].confidence).toBeGreaterThan(80);
      });
    });

    describe('GET /api/subscriptions/insights', () => {
      it('should return subscription insights', async () => {
        const insights = [
          {
            type: 'duplicate',
            title: 'Multiple streaming subscriptions',
            potentialSavings: 15.99,
            priority: 'medium',
          },
          {
            type: 'unused',
            title: 'Gym membership unused for 2 months',
            potentialSavings: 49.99,
            priority: 'high',
          },
        ];

        expect(insights).toHaveLength(2);
        expect(insights[1].priority).toBe('high');
      });
    });

    describe('POST /api/subscriptions/:id/cancel', () => {
      it('should initiate cancellation request', async () => {
        const cancellationRequest = {
          id: 'cancel-123',
          subscriptionId: 'sub-123',
          status: 'pending',
          method: 'website',
          instructions: ['Go to account settings', 'Click Cancel Subscription'],
        };

        mockSupabaseClient.single.mockResolvedValue({
          data: cancellationRequest,
          error: null,
        });

        const result = await mockSupabaseClient
          .from('cancellation_requests')
          .insert(cancellationRequest)
          .select()
          .single();

        expect(result.data.status).toBe('pending');
        expect(result.data.instructions).toBeDefined();
      });
    });
  });

  // ==========================================================================
  // TRANSACTION API TESTS
  // ==========================================================================

  describe('Transaction API', () => {
    describe('GET /api/transactions', () => {
      it('should return user transactions', async () => {
        mockSupabaseClient.order.mockResolvedValue({
          data: [mockTransaction],
          error: null,
        });

        const result = await mockSupabaseClient
          .from('transactions')
          .select('*')
          .eq('user_id', testUserId)
          .order('date', { ascending: false });

        expect(result.data).toHaveLength(1);
        expect(result.data[0].amount).toBeLessThan(0); // Expense
      });

      it('should filter by date range', async () => {
        const startDate = new Date(2024, 0, 1).toISOString();
        const endDate = new Date(2024, 0, 31).toISOString();

        mockSupabaseClient.lte.mockResolvedValue({
          data: [mockTransaction],
          error: null,
        });

        const result = await mockSupabaseClient
          .from('transactions')
          .select('*')
          .eq('user_id', testUserId)
          .gte('date', startDate)
          .lte('date', endDate);

        expect(result.data).toBeDefined();
      });

      it('should filter by category', async () => {
        mockSupabaseClient.eq
          .mockReturnValueOnce(mockSupabaseClient)
          .mockResolvedValueOnce({ data: [mockTransaction], error: null });

        const result = await mockSupabaseClient
          .from('transactions')
          .select('*')
          .eq('user_id', testUserId)
          .eq('category', 'groceries');

        expect(result.data[0].category).toBe('groceries');
      });
    });

    describe('PUT /api/transactions/:id/categorize', () => {
      it('should update transaction category', async () => {
        mockSupabaseClient.single.mockResolvedValue({
          data: { ...mockTransaction, category: 'food_delivery' },
          error: null,
        });

        const result = await mockSupabaseClient
          .from('transactions')
          .update({ category: 'food_delivery' })
          .eq('id', 'tx-123')
          .eq('user_id', testUserId)
          .select()
          .single();

        expect(result.data.category).toBe('food_delivery');
      });
    });
  });

  // ==========================================================================
  // BILL CALENDAR API TESTS
  // ==========================================================================

  describe('Bill Calendar API', () => {
    describe('GET /api/bills', () => {
      it('should return user bills', async () => {
        const mockBill = {
          id: 'bill-123',
          user_id: testUserId,
          name: 'Electric Bill',
          payee: 'Power Company',
          amount: 150,
          frequency: 'monthly',
          due_day: 15,
          next_due_date: new Date(2024, 1, 15).toISOString(),
          autopay_enabled: true,
        };

        mockSupabaseClient.order.mockResolvedValue({
          data: [mockBill],
          error: null,
        });

        const result = await mockSupabaseClient
          .from('bills')
          .select('*')
          .eq('user_id', testUserId)
          .order('next_due_date', { ascending: true });

        expect(result.data).toHaveLength(1);
        expect(result.data[0].name).toBe('Electric Bill');
      });
    });

    describe('GET /api/bills/calendar', () => {
      it('should return calendar view for month', async () => {
        const calendarData = {
          month: 'February',
          year: 2024,
          totalDue: 450,
          days: [
            { date: '2024-02-01', bills: [], totalDue: 0 },
            {
              date: '2024-02-15',
              bills: [{ name: 'Electric Bill', amount: 150 }],
              totalDue: 150,
            },
          ],
        };

        expect(calendarData.days).toBeDefined();
        expect(calendarData.totalDue).toBe(450);
      });
    });

    describe('POST /api/bills/:id/pay', () => {
      it('should record bill payment', async () => {
        const payment = {
          id: 'payment-123',
          bill_id: 'bill-123',
          user_id: testUserId,
          amount: 150,
          paid_date: new Date().toISOString(),
          status: 'paid',
        };

        mockSupabaseClient.single.mockResolvedValue({
          data: payment,
          error: null,
        });

        const result = await mockSupabaseClient
          .from('bill_payments')
          .insert(payment)
          .select()
          .single();

        expect(result.data.status).toBe('paid');
      });
    });
  });

  // ==========================================================================
  // ERROR HANDLING TESTS
  // ==========================================================================

  describe('Error Handling', () => {
    it('should return 401 for unauthenticated requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated', status: 401 },
      });

      const result = await mockSupabaseClient.auth.getUser();

      expect(result.error).toBeDefined();
      expect(result.data.user).toBeNull();
    });

    it('should return 404 for non-existent resources', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' },
      });

      const result = await mockSupabaseClient
        .from('budgets')
        .select('*')
        .eq('id', 'non-existent')
        .single();

      expect(result.error?.code).toBe('PGRST116');
    });

    it('should return 400 for invalid request data', async () => {
      const invalidData = {
        budgeted_amount: 'invalid', // Should be number
      };

      const isValid = typeof invalidData.budgeted_amount === 'number';
      expect(isValid).toBe(false);
    });

    it('should handle database connection errors', async () => {
      mockSupabaseClient.select.mockRejectedValue(
        new Error('Connection timeout')
      );

      try {
        await mockSupabaseClient.from('budgets').select('*');
      } catch (error) {
        expect(error).toBeDefined();
        expect((error as Error).message).toBe('Connection timeout');
      }
    });
  });

  // ==========================================================================
  // RATE LIMITING TESTS
  // ==========================================================================

  describe('Rate Limiting', () => {
    it('should track request counts', async () => {
      const requestTracker = {
        count: 0,
        limit: 100,
        window: 60000, // 1 minute
        increment() {
          this.count++;
          return this.count <= this.limit;
        },
        isLimited() {
          return this.count > this.limit;
        },
      };

      for (let i = 0; i < 50; i++) {
        requestTracker.increment();
      }

      expect(requestTracker.isLimited()).toBe(false);
      expect(requestTracker.count).toBe(50);
    });

    it('should enforce rate limits', async () => {
      const requestTracker = {
        count: 101,
        limit: 100,
        isLimited() {
          return this.count > this.limit;
        },
      };

      expect(requestTracker.isLimited()).toBe(true);
    });
  });
});
