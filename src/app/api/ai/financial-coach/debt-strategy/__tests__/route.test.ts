/**
 * Debt Strategy API Route Tests
 *
 * Tests for POST /api/ai/financial-coach/debt-strategy endpoint
 *
 * Note: These are basic smoke tests focusing on authentication and validation.
 * Full integration tests with actual service calls should be run separately.
 */

import { NextRequest } from 'next/server';

// Mock transitive dependencies that require env vars at import time
jest.mock('@/lib/supabase/client', () => ({
  getSupabase: jest.fn(() => ({})),
}));

const mockGetUser = jest.fn();

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
  supabaseAdmin: {},
}));

jest.mock('@/lib/financial/financial-context-engine', () => ({
  financialContextEngine: {
    getFinancialContext: jest.fn(),
  },
}));

jest.mock('@/lib/financial/debt-strategy-optimizer', () => ({
  debtStrategyOptimizer: {
    compareStrategies: jest.fn(),
    calculateSnowball: jest.fn(),
    calculateAvalanche: jest.fn(),
  },
}));

// Import AFTER mocks are set up
import { POST } from '../route';
import { createClient } from '@/lib/supabase/server';

describe('POST /api/ai/financial-coach/debt-strategy - Basic Tests', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
  };

  const mockDebts = [
    {
      id: 'debt-1',
      name: 'Credit Card',
      balance: 5000,
      interestRate: 18.5,
      minimumPayment: 150,
    },
    {
      id: 'debt-2',
      name: 'Personal Loan',
      balance: 10000,
      interestRate: 12.0,
      minimumPayment: 300,
    },
  ];

  beforeEach(() => {
    // Re-setup createClient mock (resetMocks: true clears it between tests)
    (createClient as jest.Mock).mockResolvedValue({
      auth: {
        getUser: mockGetUser,
      },
    });

    // Default: authenticated user
    mockGetUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });
  });

  describe('Authentication', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      });

      const request = new NextRequest('http://localhost:3000/api/ai/financial-coach/debt-strategy', {
        method: 'POST',
        body: JSON.stringify({ debts: mockDebts, extraPayment: 200 }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('Request Validation', () => {
    it('should return 400 if debts array is empty', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/financial-coach/debt-strategy', {
        method: 'POST',
        body: JSON.stringify({ debts: [], extraPayment: 200 }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INVALID_REQUEST');
    });

    it('should return 400 if debt has negative balance', async () => {
      const invalidDebts = [
        { ...mockDebts[0], balance: -1000 },
      ];

      const request = new NextRequest('http://localhost:3000/api/ai/financial-coach/debt-strategy', {
        method: 'POST',
        body: JSON.stringify({ debts: invalidDebts, extraPayment: 200 }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should return 400 if interest rate exceeds 100%', async () => {
      const invalidDebts = [
        { ...mockDebts[0], interestRate: 150 },
      ];

      const request = new NextRequest('http://localhost:3000/api/ai/financial-coach/debt-strategy', {
        method: 'POST',
        body: JSON.stringify({ debts: invalidDebts, extraPayment: 200 }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });
  });
});
