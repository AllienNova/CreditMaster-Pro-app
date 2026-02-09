/**
 * Order Execution Engine Tests
 *
 * Unit tests for configuration and type definitions.
 * Integration tests require live broker connections.
 */

// Mock Supabase before importing anything else
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    })),
  })),
  supabaseAdmin: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));

import { DEFAULT_EXECUTION_CONFIG } from '../order-execution-engine';

describe('OrderExecutionEngine Configuration', () => {
  describe('DEFAULT_EXECUTION_CONFIG', () => {
    it('should have correct default mode', () => {
      expect(DEFAULT_EXECUTION_CONFIG.mode).toBe('paper');
    });

    it('should have correct default data feed', () => {
      expect(DEFAULT_EXECUTION_CONFIG.dataFeed).toBe('iex');
    });

    it('should have price validation enabled by default', () => {
      expect(DEFAULT_EXECUTION_CONFIG.priceValidation).toBe(true);
    });

    it('should have correct default max price deviation', () => {
      expect(DEFAULT_EXECUTION_CONFIG.maxPriceDeviation).toBe(0.02);
    });

    it('should have order confirmation enabled by default', () => {
      expect(DEFAULT_EXECUTION_CONFIG.orderConfirmation).toBe(true);
    });

    it('should have pre-trade risk check enabled by default', () => {
      expect(DEFAULT_EXECUTION_CONFIG.preTradeRiskCheck).toBe(true);
    });

    it('should have auto reconnect enabled by default', () => {
      expect(DEFAULT_EXECUTION_CONFIG.autoReconnect).toBe(true);
    });

    it('should have empty credentials by default', () => {
      expect(DEFAULT_EXECUTION_CONFIG.apiKey).toBe('');
      expect(DEFAULT_EXECUTION_CONFIG.apiSecret).toBe('');
    });
  });

  describe('ExecutionConfig type structure', () => {
    it('should define all required config properties', () => {
      const config = DEFAULT_EXECUTION_CONFIG;

      expect(config).toHaveProperty('mode');
      expect(config).toHaveProperty('apiKey');
      expect(config).toHaveProperty('apiSecret');
      expect(config).toHaveProperty('dataFeed');
      expect(config).toHaveProperty('autoReconnect');
      expect(config).toHaveProperty('priceValidation');
      expect(config).toHaveProperty('maxPriceDeviation');
      expect(config).toHaveProperty('orderConfirmation');
      expect(config).toHaveProperty('preTradeRiskCheck');
    });

    it('should have valid mode values', () => {
      expect(['live', 'paper', 'simulation']).toContain(
        DEFAULT_EXECUTION_CONFIG.mode
      );
    });

    it('should have valid data feed values', () => {
      expect(['iex', 'sip']).toContain(DEFAULT_EXECUTION_CONFIG.dataFeed);
    });

    it('should have numeric max price deviation', () => {
      expect(typeof DEFAULT_EXECUTION_CONFIG.maxPriceDeviation).toBe('number');
      expect(DEFAULT_EXECUTION_CONFIG.maxPriceDeviation).toBeGreaterThan(0);
      expect(DEFAULT_EXECUTION_CONFIG.maxPriceDeviation).toBeLessThan(1);
    });
  });
});
