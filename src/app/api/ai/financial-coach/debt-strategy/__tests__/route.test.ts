/**
 * Debt Strategy API Route Tests
 *
 * Tests for POST /api/ai/financial-coach/debt-strategy endpoint
 *
 * Note: These are basic smoke tests focusing on authentication and validation.
 * Full integration tests with actual service calls should be run separately.
 */

import { POST } from '../route';
import { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Mock dependencies
jest.mock('@supabase/ssr');
jest.mock('next/headers', () => ({
  cookies: jest.fn(() => Promise.resolve({
    getAll: () => [],
  })),
}));

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
    jest.clearAllMocks();

    // Mock Supabase auth
    (createServerClient as jest.Mock).mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: mockUser },
        }),
      },
    });
  });

  describe('Authentication', () => {
    it('should return 401 if user is not authenticated', async () => {
      (createServerClient as jest.Mock).mockReturnValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: null },
          }),
        },
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



