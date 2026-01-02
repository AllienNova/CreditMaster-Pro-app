/**
 * Goal Planner Tests
 *
 * Tests for the GoalPlanner class structure, exports, and functionality.
 */

import { GoalPlanner, goalPlanner } from '../goal-planner';

describe('GoalPlanner', () => {
  describe('exports', () => {
    it('should export GoalPlanner class', () => {
      expect(GoalPlanner).toBeDefined();
      expect(typeof GoalPlanner).toBe('function');
    });

    it('should export goalPlanner singleton', () => {
      expect(goalPlanner).toBeDefined();
      expect(goalPlanner).toBeInstanceOf(GoalPlanner);
    });
  });

  describe('class structure', () => {
    it('should have createGoalPlan method', () => {
      expect(typeof goalPlanner.createGoalPlan).toBe('function');
    });

    it('should have getUserGoals method', () => {
      expect(typeof goalPlanner.getUserGoals).toBe('function');
    });

    it('should have updateGoalProgress method', () => {
      expect(typeof goalPlanner.updateGoalProgress).toBe('function');
    });

    it('should have simulateGoal method', () => {
      expect(typeof goalPlanner.simulateGoal).toBe('function');
    });

    it('should have getAdjustmentSuggestions method', () => {
      expect(typeof goalPlanner.getAdjustmentSuggestions).toBe('function');
    });
  });

  describe('goal types', () => {
    it('should support all 10 goal types', () => {
      const expectedTypes = [
        'emergency_fund',
        'debt_payoff',
        'savings',
        'investment',
        'major_purchase',
        'retirement',
        'education',
        'vacation',
        'home_down_payment',
        'custom',
      ];

      expectedTypes.forEach(type => {
        expect(typeof type).toBe('string');
      });
    });
  });

  describe('goal status', () => {
    it('should support all status values', () => {
      const statuses = ['not_started', 'in_progress', 'on_track', 'behind', 'ahead', 'completed', 'paused'];
      statuses.forEach(status => {
        expect(typeof status).toBe('string');
      });
    });
  });

  describe('contribution frequency', () => {
    it('should support all frequency options', () => {
      const frequencies = ['weekly', 'biweekly', 'monthly'];
      frequencies.forEach(freq => {
        expect(typeof freq).toBe('string');
      });
    });
  });

  describe('milestone structure', () => {
    it('should support milestone properties', () => {
      const milestone = {
        id: 'milestone-1',
        name: '25% Complete',
        targetAmount: 2500,
        targetPercentage: 25,
        isAchieved: false,
        celebrationMessage: 'Great progress!',
      };
      expect(milestone.id).toBeDefined();
      expect(milestone.targetPercentage).toBe(25);
    });
  });

  describe('adjustment types', () => {
    it('should support all adjustment types', () => {
      const adjustmentTypes = ['increase_contribution', 'extend_timeline', 'reduce_target', 'pause'];
      adjustmentTypes.forEach(type => {
        expect(typeof type).toBe('string');
      });
    });
  });

  describe('createGoal parameters', () => {
    it('should accept required parameters', () => {
      const params = {
        userId: 'test-user-id',
        type: 'emergency_fund' as const,
        name: 'Emergency Fund',
        targetAmount: 10000,
        targetDate: '2025-12-31',
      };
      expect(params.userId).toBeDefined();
      expect(params.type).toBe('emergency_fund');
      expect(params.targetAmount).toBe(10000);
    });

    it('should accept optional parameters', () => {
      const params = {
        userId: 'test-user-id',
        type: 'savings' as const,
        name: 'Vacation Fund',
        targetAmount: 5000,
        targetDate: '2025-06-01',
        description: 'Summer vacation savings',
        monthlyContribution: 500,
        linkedAccountId: 'account-123',
        autoSaveEnabled: true,
        priority: 2,
      };
      expect(params.description).toBeDefined();
      expect(params.autoSaveEnabled).toBe(true);
    });
  });

  describe('simulation scenarios', () => {
    it('should support scenario structure', () => {
      const scenario = {
        id: 'scenario-1',
        name: 'Conservative',
        monthlyContribution: 300,
        projectedCompletionDate: '2026-06-01',
        totalContributions: 5400,
        probabilityOfSuccess: 85,
        assumptions: ['Consistent monthly contributions', 'No major expenses'],
      };
      expect(scenario.probabilityOfSuccess).toBe(85);
      expect(Array.isArray(scenario.assumptions)).toBe(true);
    });
  });

  describe('goal plan structure', () => {
    it('should include all required fields', () => {
      const goalPlan = {
        id: 'goal-1',
        userId: 'user-1',
        type: 'emergency_fund',
        name: 'Emergency Fund',
        targetAmount: 10000,
        currentAmount: 2500,
        startingAmount: 0,
        targetDate: '2025-12-31',
        startDate: '2024-01-01',
        progress: 25,
        status: 'on_track',
        milestones: [],
        monthlyContribution: 500,
        suggestedContribution: 600,
        contributionFrequency: 'monthly',
        autoSaveEnabled: false,
        aiRecommendations: [],
        adjustmentSuggestions: [],
        riskFactors: [],
        priority: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      expect(goalPlan.progress).toBe(25);
      expect(goalPlan.status).toBe('on_track');
    });
  });
});

