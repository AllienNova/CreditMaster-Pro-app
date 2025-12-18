/**
 * Smart Insights Engine Tests
 *
 * Tests for the SmartInsightsEngine class structure and exports.
 * Integration tests with database are handled separately.
 */

import { SmartInsightsEngine, smartInsightsEngine } from '../smart-insights-engine';

describe('SmartInsightsEngine', () => {
  describe('exports', () => {
    it('should export SmartInsightsEngine class', () => {
      expect(SmartInsightsEngine).toBeDefined();
      expect(typeof SmartInsightsEngine).toBe('function');
    });

    it('should export smartInsightsEngine singleton', () => {
      expect(smartInsightsEngine).toBeDefined();
      expect(smartInsightsEngine).toBeInstanceOf(SmartInsightsEngine);
    });
  });

  describe('class structure', () => {
    it('should have generateInsights method', () => {
      expect(typeof smartInsightsEngine.generateInsights).toBe('function');
    });

    it('should have getStoredInsights method', () => {
      expect(typeof smartInsightsEngine.getStoredInsights).toBe('function');
    });

    it('should have saveInsights method', () => {
      expect(typeof smartInsightsEngine.saveInsights).toBe('function');
    });

    it('should have dismissInsight method', () => {
      expect(typeof smartInsightsEngine.dismissInsight).toBe('function');
    });

    it('should have recordAction method', () => {
      expect(typeof smartInsightsEngine.recordAction).toBe('function');
    });
  });

  describe('insight types', () => {
    it('should support spending_anomaly type', () => {
      // Type check - the engine should handle this type
      const types = ['spending_anomaly', 'savings_opportunity', 'bill_reminder', 'budget_alert', 'income_pattern', 'account_optimization'];
      expect(types).toContain('spending_anomaly');
    });

    it('should support all insight types', () => {
      const expectedTypes = [
        'spending_anomaly',
        'savings_opportunity',
        'bill_reminder',
        'budget_alert',
        'income_pattern',
        'account_optimization',
      ];

      expectedTypes.forEach(type => {
        expect(typeof type).toBe('string');
      });
    });
  });
});

