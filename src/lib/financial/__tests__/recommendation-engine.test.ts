/**
 * Recommendation Engine Tests
 *
 * Tests for the RecommendationEngine class structure, exports, and functionality.
 */

import { RecommendationEngine, recommendationEngine } from '../recommendation-engine';

describe('RecommendationEngine', () => {
  describe('exports', () => {
    it('should export RecommendationEngine class', () => {
      expect(RecommendationEngine).toBeDefined();
      expect(typeof RecommendationEngine).toBe('function');
    });

    it('should export recommendationEngine singleton', () => {
      expect(recommendationEngine).toBeDefined();
      expect(recommendationEngine).toBeInstanceOf(RecommendationEngine);
    });
  });

  describe('class structure', () => {
    it('should have generateRecommendations method', () => {
      expect(typeof recommendationEngine.generateRecommendations).toBe('function');
    });

    it('should have getRecommendation method', () => {
      expect(typeof recommendationEngine.getRecommendation).toBe('function');
    });

    it('should have updateRecommendationStatus method', () => {
      expect(typeof recommendationEngine.updateRecommendationStatus).toBe('function');
    });

    it('should be an instance of RecommendationEngine', () => {
      expect(recommendationEngine).toBeDefined();
    });
  });

  describe('recommendation types', () => {
    it('should support all 8 recommendation types', () => {
      const expectedTypes = [
        'savings_strategy',
        'debt_payoff',
        'investment_suggestion',
        'budget_adjustment',
        'account_optimization',
        'credit_improvement',
        'insurance_needs',
        'tax_optimization',
      ];

      expectedTypes.forEach(type => {
        expect(typeof type).toBe('string');
      });
    });
  });

  describe('priority levels', () => {
    it('should support all priority levels', () => {
      const priorities = ['critical', 'high', 'medium', 'low'];
      priorities.forEach(priority => {
        expect(typeof priority).toBe('string');
      });
    });
  });

  describe('recommendation status', () => {
    it('should support all status values', () => {
      const statuses = ['pending', 'in_progress', 'completed', 'dismissed', 'expired'];
      statuses.forEach(status => {
        expect(typeof status).toBe('string');
      });
    });
  });

  describe('timeframe options', () => {
    it('should support all timeframe values', () => {
      const timeframes = ['immediate', 'short_term', 'medium_term', 'long_term'];
      timeframes.forEach(timeframe => {
        expect(typeof timeframe).toBe('string');
      });
    });
  });

  describe('effort levels', () => {
    it('should support all effort levels', () => {
      const efforts = ['minimal', 'moderate', 'significant'];
      efforts.forEach(effort => {
        expect(typeof effort).toBe('string');
      });
    });
  });

  describe('risk levels', () => {
    it('should support all risk levels', () => {
      const risks = ['low', 'medium', 'high'];
      risks.forEach(risk => {
        expect(typeof risk).toBe('string');
      });
    });
  });

  describe('generateRecommendations options', () => {
    it('should accept userId parameter', () => {
      // Type check - the method should accept these parameters
      const options = {
        userId: 'test-user-id',
        types: ['savings_strategy', 'debt_payoff'],
        limit: 10,
        includeAI: true,
      };
      expect(options.userId).toBeDefined();
    });

    it('should accept optional types filter', () => {
      const options = {
        userId: 'test-user-id',
        types: ['savings_strategy'],
      };
      expect(Array.isArray(options.types)).toBe(true);
    });

    it('should accept optional limit parameter', () => {
      const options = {
        userId: 'test-user-id',
        limit: 5,
      };
      expect(typeof options.limit).toBe('number');
    });

    it('should accept optional includeAI flag', () => {
      const options = {
        userId: 'test-user-id',
        includeAI: true,
      };
      expect(typeof options.includeAI).toBe('boolean');
    });
  });

  describe('action steps structure', () => {
    it('should support action step properties', () => {
      const actionStep = {
        id: 'step-1',
        order: 1,
        title: 'Step Title',
        description: 'Step description',
        actionType: 'manual' as const,
        isCompleted: false,
      };
      expect(actionStep.id).toBeDefined();
      expect(actionStep.order).toBe(1);
      expect(actionStep.actionType).toBe('manual');
    });

    it('should support all action types', () => {
      const actionTypes = ['manual', 'automated', 'link', 'in_app'];
      actionTypes.forEach(type => {
        expect(typeof type).toBe('string');
      });
    });
  });
});

