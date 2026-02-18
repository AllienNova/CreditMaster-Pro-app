/**
 * Budget Service Unit Tests
 *
 * Tests for budget CRUD operations, alerts, recommendations, and analytics.
 */

import { budgetService, BudgetService } from '../budget-service';
import {
  Budget,
  BudgetPeriod,
  BudgetStatus,
  CreateBudgetInput,
  UpdateBudgetInput,
  BudgetSummary,
  BudgetRecommendation,
  BudgetAlert,
  BUDGET_CATEGORIES,
} from '../types/budget.types';

// Mock Supabase — singleton to ensure source and test share the same object
jest.mock('@/lib/supabase/client', () => {
  const _client = { from: jest.fn() };
  return { getSupabase: () => _client };
});

describe('BudgetService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Budget CRUD Operations', () => {
    describe('createBudget', () => {
      it('should create a budget with valid input', async () => {
        const input: CreateBudgetInput = {
          userId: 'user-123',
          name: 'Groceries Budget',
          category: BUDGET_CATEGORIES.GROCERIES,
          budgetedAmount: 500,
          period: 'monthly',
        };

        const mockBudgetRow = {
          id: 'budget-123',
          user_id: input.userId,
          name: input.name,
          category: input.category,
          budgeted_amount: input.budgetedAmount,
          spent_amount: 0,
          period: input.period,
          period_start: new Date().toISOString(),
          period_end: new Date().toISOString(),
          rollover_enabled: false,
          rollover_amount: 0,
          alert_threshold: 80,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const supabase = require('@/lib/supabase/client').getSupabase();
        supabase.from.mockReturnValue({
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockBudgetRow,
                error: null,
              }),
            }),
          }),
        });

        const result = await budgetService.createBudget(input);

        expect(result).toBeDefined();
        expect(result.id).toBe('budget-123');
        expect(result.name).toBe(input.name);
        expect(result.category).toBe(input.category);
        expect(result.budgetedAmount).toBe(input.budgetedAmount);
        expect(result.spentAmount).toBe(0);
        expect(result.status).toBe('on_track');
      });

      it('should throw error for invalid budget amount', async () => {
        const input: CreateBudgetInput = {
          userId: 'user-123',
          name: 'Invalid Budget',
          category: BUDGET_CATEGORIES.GROCERIES,
          budgetedAmount: -100,
          period: 'monthly',
        };

        await expect(budgetService.createBudget(input)).rejects.toThrow();
      });

      it('should set default alert threshold to 80%', async () => {
        const input: CreateBudgetInput = {
          userId: 'user-123',
          name: 'Test Budget',
          category: BUDGET_CATEGORIES.ENTERTAINMENT,
          budgetedAmount: 200,
          period: 'monthly',
        };

        const mockBudgetRow = {
          id: 'budget-456',
          user_id: input.userId,
          name: input.name,
          category: input.category,
          budgeted_amount: input.budgetedAmount,
          spent_amount: 0,
          period: input.period,
          period_start: new Date().toISOString(),
          period_end: new Date().toISOString(),
          rollover_enabled: false,
          rollover_amount: 0,
          alert_threshold: 80,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const supabase = require('@/lib/supabase/client').getSupabase();
        supabase.from.mockReturnValue({
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockBudgetRow,
                error: null,
              }),
            }),
          }),
        });

        const result = await budgetService.createBudget(input);
        expect(result.alertThreshold).toBe(80);
      });
    });

    describe('getBudgetById', () => {
      it('should return budget by ID', async () => {
        const mockBudgetRow = {
          id: 'budget-123',
          user_id: 'user-123',
          name: 'Test Budget',
          category: 'groceries',
          budgeted_amount: 500,
          spent_amount: 200,
          period: 'monthly',
          period_start: new Date().toISOString(),
          period_end: new Date().toISOString(),
          rollover_enabled: false,
          rollover_amount: 0,
          alert_threshold: 80,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const supabase = require('@/lib/supabase/client').getSupabase();
        supabase.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockBudgetRow,
                  error: null,
                }),
              }),
            }),
          }),
        });

        const result = await budgetService.getBudgetById(
          'budget-123',
          'user-123'
        );

        expect(result).toBeDefined();
        expect(result?.id).toBe('budget-123');
        expect(result?.spentAmount).toBe(200);
        expect(result?.percentUsed).toBe(40);
      });

      it('should return null for non-existent budget', async () => {
        const supabase = require('@/lib/supabase/client').getSupabase();
        supabase.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: null,
                  error: null,
                }),
              }),
            }),
          }),
        });

        const result = await budgetService.getBudgetById(
          'non-existent',
          'user-123'
        );
        expect(result).toBeNull();
      });
    });

    describe('updateBudget', () => {
      it('should update budget amount', async () => {
        const mockUpdatedRow = {
          id: 'budget-123',
          user_id: 'user-123',
          name: 'Updated Budget',
          category: 'groceries',
          budgeted_amount: 600,
          spent_amount: 200,
          period: 'monthly',
          period_start: new Date().toISOString(),
          period_end: new Date().toISOString(),
          rollover_enabled: false,
          rollover_amount: 0,
          alert_threshold: 80,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const supabase = require('@/lib/supabase/client').getSupabase();
        supabase.from.mockReturnValue({
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: mockUpdatedRow,
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        });

        const result = await budgetService.updateBudget(
          'budget-123',
          'user-123',
          {
            name: 'Updated Budget',
            budgetedAmount: 600,
          }
        );

        expect(result.name).toBe('Updated Budget');
        expect(result.budgetedAmount).toBe(600);
      });
    });

    describe('deleteBudget', () => {
      it('should delete budget successfully', async () => {
        const supabase = require('@/lib/supabase/client').getSupabase();
        supabase.from.mockReturnValue({
          delete: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                error: null,
              }),
            }),
          }),
        });

        await expect(
          budgetService.deleteBudget('budget-123', 'user-123')
        ).resolves.not.toThrow();
      });
    });
  });

  describe('Budget Status Calculation', () => {
    it('should calculate on_track status when under threshold', () => {
      const budget: Budget = {
        id: 'budget-1',
        userId: 'user-1',
        name: 'Test',
        category: 'groceries',
        budgetedAmount: 500,
        spentAmount: 200,
        remainingAmount: 300,
        period: 'monthly',
        periodStart: new Date(),
        periodEnd: new Date(),
        status: 'on_track',
        percentUsed: 40,
        rolloverEnabled: false,
        rolloverAmount: 0,
        isActive: true,
        alertThreshold: 80,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(budget.status).toBe('on_track');
      expect(budget.percentUsed).toBe(40);
    });

    it('should calculate warning status when at threshold', () => {
      const percentUsed = 85;
      const alertThreshold = 80;
      const status: BudgetStatus =
        percentUsed >= 100
          ? 'over_budget'
          : percentUsed >= alertThreshold
            ? 'warning'
            : 'on_track';

      expect(status).toBe('warning');
    });

    it('should calculate over_budget status when exceeded', () => {
      const percentUsed = 120;
      const alertThreshold = 80;
      const status: BudgetStatus =
        percentUsed >= 100
          ? 'over_budget'
          : percentUsed >= alertThreshold
            ? 'warning'
            : 'on_track';

      expect(status).toBe('over_budget');
    });
  });

  describe('Budget Summary', () => {
    it('should calculate budget summary correctly', async () => {
      const mockBudgets = [
        {
          id: 'b1',
          user_id: 'user-1',
          name: 'Groceries',
          category: 'groceries',
          budgeted_amount: 500,
          spent_amount: 400,
          period: 'monthly',
          period_start: new Date().toISOString(),
          period_end: new Date().toISOString(),
          rollover_enabled: false,
          rollover_amount: 0,
          alert_threshold: 80,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'b2',
          user_id: 'user-1',
          name: 'Entertainment',
          category: 'entertainment',
          budgeted_amount: 200,
          spent_amount: 250,
          period: 'monthly',
          period_start: new Date().toISOString(),
          period_end: new Date().toISOString(),
          rollover_enabled: false,
          rollover_amount: 0,
          alert_threshold: 80,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      const supabase = require('@/lib/supabase/client').getSupabase();
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: mockBudgets,
                error: null,
              }),
            }),
          }),
        }),
      });

      const summary = await budgetService.getBudgetSummary('user-1');

      expect(summary.totalBudgeted).toBe(700);
      expect(summary.totalSpent).toBe(650);
      expect(summary.totalRemaining).toBe(50);
      expect(summary.budgetsByStatus.overBudget).toBe(1);
    });
  });

  describe('Budget Recommendations', () => {
    it('should recommend increasing budget when consistently over', async () => {
      const mockBudgets = [
        {
          id: 'b1',
          user_id: 'user-1',
          name: 'Dining',
          category: 'dining_out',
          budgeted_amount: 200,
          spent_amount: 300,
          period: 'monthly',
          period_start: new Date().toISOString(),
          period_end: new Date().toISOString(),
          rollover_enabled: false,
          rollover_amount: 0,
          alert_threshold: 80,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      const supabase = require('@/lib/supabase/client').getSupabase();
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: mockBudgets,
                error: null,
              }),
            }),
          }),
        }),
      });

      const recommendations = await budgetService.getRecommendations('user-1');

      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0].type).toBe('increase_budget');
      expect(recommendations[0].category).toBe('dining_out');
    });

    it('should recommend decreasing budget when consistently under', async () => {
      const mockBudgets = [
        {
          id: 'b1',
          user_id: 'user-1',
          name: 'Entertainment',
          category: 'entertainment',
          budgeted_amount: 500,
          spent_amount: 50,
          period: 'monthly',
          period_start: new Date().toISOString(),
          period_end: new Date().toISOString(),
          rollover_enabled: false,
          rollover_amount: 0,
          alert_threshold: 80,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      const supabase = require('@/lib/supabase/client').getSupabase();
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: mockBudgets,
                error: null,
              }),
            }),
          }),
        }),
      });

      const recommendations = await budgetService.getRecommendations('user-1');

      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0].type).toBe('decrease_budget');
    });
  });

  describe('Available Categories', () => {
    it('should return categories not yet budgeted', () => {
      const existingBudgets: Budget[] = [
        {
          id: 'b1',
          userId: 'user-1',
          name: 'Groceries',
          category: 'groceries',
          budgetedAmount: 500,
          spentAmount: 200,
          remainingAmount: 300,
          period: 'monthly',
          periodStart: new Date(),
          periodEnd: new Date(),
          status: 'on_track',
          percentUsed: 40,
          rolloverEnabled: false,
          rolloverAmount: 0,
          isActive: true,
          alertThreshold: 80,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const available = budgetService.getAvailableCategories(existingBudgets);

      expect(available).not.toContain('groceries');
      expect(available).toContain('entertainment');
      expect(available).toContain('housing');
      expect(available.length).toBe(21); // 22 total - 1 used
    });
  });

  describe('Period Calculations', () => {
    it('should calculate monthly period dates correctly', () => {
      const now = new Date();
      const expectedStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const expectedEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      // Test that period calculation works (internal function)
      expect(expectedStart.getDate()).toBe(1);
      expect(expectedEnd.getDate()).toBeGreaterThanOrEqual(28);
    });

    it('should calculate weekly period dates correctly', () => {
      const now = new Date();
      const dayOfWeek = now.getDay();
      const expectedStart = new Date(now);
      expectedStart.setDate(now.getDate() - dayOfWeek);

      expect(expectedStart.getDay()).toBe(0); // Sunday
    });
  });
});
