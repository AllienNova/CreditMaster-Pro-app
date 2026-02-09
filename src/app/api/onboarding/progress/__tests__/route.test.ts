/**
 * Tests for Onboarding Progress API
 */

import { NextRequest } from 'next/server';
import { GET, POST } from '../route';

// Mock Supabase
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(),
        })),
      })),
      upsert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(),
        })),
      })),
    })),
  })),
}));

describe('/api/onboarding/progress', () => {
  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('should return 401 if user is not authenticated', async () => {
      const { createClient } = require('@/lib/supabase/server');
      createClient.mockReturnValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: null },
            error: new Error('Not authenticated'),
          }),
        },
      });

      const request = new NextRequest('http://localhost:3000/api/onboarding/progress');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return default progress if no saved progress exists', async () => {
      const { createClient } = require('@/lib/supabase/server');
      createClient.mockReturnValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
        from: jest.fn(() => ({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST116' }, // Not found error
              }),
            })),
          })),
        })),
      });

      const request = new NextRequest('http://localhost:3000/api/onboarding/progress');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.current_step).toBe(1);
      expect(data.completed_steps).toEqual([]);
      expect(data.form_data).toEqual({});
    });

    it('should return saved progress if it exists', async () => {
      const mockProgress = {
        id: 'progress-id',
        user_id: mockUser.id,
        current_step: 3,
        completed_steps: [1, 2],
        form_data: { step_1: { name: 'John' } },
        last_updated: '2026-01-07T12:00:00Z',
      };

      const { createClient } = require('@/lib/supabase/server');
      createClient.mockReturnValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
        from: jest.fn(() => ({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({
                data: mockProgress,
                error: null,
              }),
            })),
          })),
        })),
      });

      const request = new NextRequest('http://localhost:3000/api/onboarding/progress');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockProgress);
    });
  });

  describe('POST', () => {
    it('should return 401 if user is not authenticated', async () => {
      const { createClient } = require('@/lib/supabase/server');
      createClient.mockReturnValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: null },
            error: new Error('Not authenticated'),
          }),
        },
      });

      const request = new NextRequest('http://localhost:3000/api/onboarding/progress', {
        method: 'POST',
        body: JSON.stringify({
          current_step: 2,
          completed_steps: [1],
          form_data: {},
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should validate current_step is between 1 and 5', async () => {
      const { createClient } = require('@/lib/supabase/server');
      createClient.mockReturnValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
      });

      const request = new NextRequest('http://localhost:3000/api/onboarding/progress', {
        method: 'POST',
        body: JSON.stringify({
          current_step: 10,
          completed_steps: [],
          form_data: {},
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid current_step');
    });
  });
});

