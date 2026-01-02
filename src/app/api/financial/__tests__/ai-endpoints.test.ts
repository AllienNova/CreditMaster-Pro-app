/**
 * AI API Endpoints Tests
 *
 * Tests for all 9 AI-powered API endpoints
 */

import { server } from '@/__tests__/mocks/server';
import { rest } from 'msw';

const BASE_URL = 'http://localhost';

describe('AI API Endpoints', () => {
  describe('GET /api/financial/ai-insights', () => {
    it('should return AI insights data', async () => {
      const response = await fetch(`${BASE_URL}/api/financial/ai-insights`);
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.data).toHaveProperty('insights');
      expect(data.data).toHaveProperty('predictions');
      expect(data.data).toHaveProperty('healthScore');
    });

    it('should return 401 for unauthorized requests', async () => {
      server.use(
        rest.get(`${BASE_URL}/api/financial/ai-insights`, (req, res, ctx) => {
          return res(ctx.status(401), ctx.json({ error: 'Unauthorized' }));
        })
      );

      const response = await fetch(`${BASE_URL}/api/financial/ai-insights`);
      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/financial/budget/ai-optimize', () => {
    it('should return budget optimization data', async () => {
      const response = await fetch(`${BASE_URL}/api/financial/budget/ai-optimize`);
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.data).toHaveProperty('optimizationScore');
      expect(data.data).toHaveProperty('currentBudget');
      expect(data.data).toHaveProperty('optimizedBudget');
      expect(data.data).toHaveProperty('categoryOptimizations');
      expect(data.data).toHaveProperty('savingsOpportunities');
    });

    it('should validate budget data structure', async () => {
      const response = await fetch(`${BASE_URL}/api/financial/budget/ai-optimize`);
      const data = await response.json();

      expect(data.data.currentBudget).toHaveProperty('income');
      expect(data.data.currentBudget).toHaveProperty('expenses');
      expect(data.data.currentBudget).toHaveProperty('savings');
      expect(data.data.optimizedBudget).toHaveProperty('income');
      expect(data.data.optimizedBudget).toHaveProperty('expenses');
      expect(data.data.optimizedBudget).toHaveProperty('savings');
    });
  });

  describe('GET /api/financial/goals/ai-optimize', () => {
    it('should return goals optimization data', async () => {
      const response = await fetch(`${BASE_URL}/api/financial/goals/ai-optimize`);
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.data).toHaveProperty('optimizationScore');
      expect(data.data).toHaveProperty('goals');
      expect(data.data).toHaveProperty('recommendations');
    });

    it('should validate goal data structure', async () => {
      const response = await fetch(`${BASE_URL}/api/financial/goals/ai-optimize`);
      const data = await response.json();

      expect(Array.isArray(data.data.goals)).toBe(true);
      if (data.data.goals.length > 0) {
        const goal = data.data.goals[0];
        expect(goal).toHaveProperty('id');
        expect(goal).toHaveProperty('name');
        expect(goal).toHaveProperty('targetAmount');
        expect(goal).toHaveProperty('currentAmount');
        expect(goal).toHaveProperty('confidence');
      }
    });
  });

  describe('GET /api/financial/spending/ai-insights', () => {
    it('should return spending insights data', async () => {
      const response = await fetch(`${BASE_URL}/api/financial/spending/ai-insights`);
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.data).toHaveProperty('spendingScore');
      expect(data.data).toHaveProperty('patterns');
      expect(data.data).toHaveProperty('anomalies');
      expect(data.data).toHaveProperty('predictions');
      expect(data.data).toHaveProperty('recommendations');
    });

    it('should validate spending patterns', async () => {
      const response = await fetch(`${BASE_URL}/api/financial/spending/ai-insights`);
      const data = await response.json();

      expect(Array.isArray(data.data.patterns)).toBe(true);
      if (data.data.patterns.length > 0) {
        const pattern = data.data.patterns[0];
        expect(pattern).toHaveProperty('category');
        expect(pattern).toHaveProperty('trend');
        expect(pattern).toHaveProperty('confidence');
      }
    });
  });

  describe('GET /api/financial/bills/ai-optimize', () => {
    it('should return bills optimization data', async () => {
      const response = await fetch(`${BASE_URL}/api/financial/bills/ai-optimize`);
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.data).toHaveProperty('optimizationScore');
      expect(data.data).toHaveProperty('totalMonthlySavings');
      expect(data.data).toHaveProperty('bills');
      expect(data.data).toHaveProperty('savingsOpportunities');
    });

    it('should validate savings opportunities', async () => {
      const response = await fetch(`${BASE_URL}/api/financial/bills/ai-optimize`);
      const data = await response.json();

      expect(Array.isArray(data.data.savingsOpportunities)).toBe(true);
      if (data.data.savingsOpportunities.length > 0) {
        const opportunity = data.data.savingsOpportunities[0];
        expect(opportunity).toHaveProperty('savings');
        expect(opportunity).toHaveProperty('confidence');
      }
    });
  });

  describe('GET /api/financial/credit/ai-insights', () => {
    it('should return credit insights data', async () => {
      const response = await fetch(`${BASE_URL}/api/financial/credit/ai-insights`);
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.data).toHaveProperty('creditHealthScore');
      expect(data.data).toHaveProperty('scorePredictions');
      expect(data.data).toHaveProperty('factorImpacts');
      expect(data.data).toHaveProperty('improvementOpportunities');
      expect(data.data).toHaveProperty('alerts');
    });
  });

  describe('GET /api/financial/disputes/ai-strategy', () => {
    it('should return dispute strategy data', async () => {
      const response = await fetch(`${BASE_URL}/api/financial/disputes/ai-strategy`);
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.data).toHaveProperty('strategyScore');
      expect(data.data).toHaveProperty('disputes');
      expect(data.data).toHaveProperty('recommendations');
      expect(data.data).toHaveProperty('templates');
    });
  });

  describe('GET /api/financial/investments/ai-insights', () => {
    it('should return investment insights data', async () => {
      const response = await fetch(`${BASE_URL}/api/financial/investments/ai-insights`);
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.data).toHaveProperty('portfolioHealthScore');
      expect(data.data).toHaveProperty('recommendations');
      expect(data.data).toHaveProperty('riskAnalysis');
      expect(data.data).toHaveProperty('diversificationSuggestions');
    });
  });

  describe('GET /api/financial/credit-builder/ai-roadmap', () => {
    it('should return credit roadmap data', async () => {
      const response = await fetch(`${BASE_URL}/api/financial/credit-builder/ai-roadmap`);
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.data).toHaveProperty('roadmapScore');
      expect(data.data).toHaveProperty('milestones');
      expect(data.data).toHaveProperty('timelinePredictions');
      expect(data.data).toHaveProperty('prioritizedActions');
      expect(data.data).toHaveProperty('progressMetrics');
      expect(data.data).toHaveProperty('strategyRecommendations');
    });

    it('should validate progress metrics', async () => {
      const response = await fetch(`${BASE_URL}/api/financial/credit-builder/ai-roadmap`);
      const data = await response.json();

      expect(data.data.progressMetrics).toHaveProperty('currentScore');
      expect(data.data.progressMetrics).toHaveProperty('targetScore');
      expect(data.data.progressMetrics).toHaveProperty('completionPercentage');
      expect(data.data.progressMetrics).toHaveProperty('onTrack');
    });
  });

  describe('GET /api/financial/credit-repair/ai-strategy', () => {
    it('should return credit repair strategy data', async () => {
      const response = await fetch(`${BASE_URL}/api/financial/credit-repair/ai-strategy`);
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.data).toHaveProperty('repairScore');
      expect(data.data).toHaveProperty('successMetrics');
      expect(data.data).toHaveProperty('quickWins');
      expect(data.data).toHaveProperty('prioritizedActions');
      expect(data.data).toHaveProperty('impactPredictions');
      expect(data.data).toHaveProperty('timelineEstimates');
      expect(data.data).toHaveProperty('strategyOptimizations');
    });

    it('should validate success metrics', async () => {
      const response = await fetch(`${BASE_URL}/api/financial/credit-repair/ai-strategy`);
      const data = await response.json();

      expect(data.data.successMetrics).toHaveProperty('overallSuccessProbability');
      expect(data.data.successMetrics).toHaveProperty('estimatedScoreIncrease');
      expect(data.data.successMetrics).toHaveProperty('estimatedTimeframe');
      expect(data.data.successMetrics).toHaveProperty('confidenceLevel');
    });

    it('should validate impact predictions', async () => {
      const response = await fetch(`${BASE_URL}/api/financial/credit-repair/ai-strategy`);
      const data = await response.json();

      expect(Array.isArray(data.data.impactPredictions)).toBe(true);
      if (data.data.impactPredictions.length > 0) {
        const prediction = data.data.impactPredictions[0];
        expect(prediction).toHaveProperty('action');
        expect(prediction).toHaveProperty('currentScore');
        expect(prediction).toHaveProperty('predictedScore');
        expect(prediction).toHaveProperty('scoreIncrease');
        expect(prediction).toHaveProperty('confidence');
      }
    });
  });
});

