/**
 * Tests for Impact Calculator API Route
 * 
 * Tests:
 * - POST /api/credit-repair/impact
 */

import { NextRequest } from 'next/server';

// Mock dependencies BEFORE importing modules that use them
jest.mock('@/lib/auth/jwt-validation');
jest.mock('@/lib/credit-repair', () => ({
  creditRepairService: {
    calculateImpact: jest.fn(),
  },
}));
jest.mock('@/lib/security/audit-logging');

// Import after mocks are set up
import { POST } from '../route';
import { jwtValidation } from '@/lib/auth/jwt-validation';
import { creditRepairService } from '@/lib/credit-repair';
import { auditLogger } from '@/lib/security/audit-logging';

interface MockRequestOptions {
  method?: string;
  body?: unknown;
}

// Helper function to create mock NextRequest
function createMockRequest(urlString: string, options?: MockRequestOptions) {
  const parsedUrl = new URL(urlString);
  const request = {
    url: urlString,
    method: options?.method || 'GET',
    json: jest.fn().mockResolvedValue(options?.body || {}),
    headers: new Headers(),
    nextUrl: parsedUrl,
  } as unknown as NextRequest;
  return request;
}

describe('/api/credit-repair/impact', () => {
  const mockUser = { id: 'user-123', email: 'test@example.com', name: 'Test User' };

  beforeEach(() => {
    jest.clearAllMocks();
    (auditLogger.logAIInteraction as jest.Mock).mockResolvedValue(undefined);
    (auditLogger.logSecurityEvent as jest.Mock).mockResolvedValue(undefined);
  });

  describe('POST /api/credit-repair/impact', () => {
    beforeEach(() => {
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: true,
        user: mockUser,
      });
    });

    it('should calculate impact for valid action', async () => {
      const validInput = {
        action: 'pay_down_utilization',
        data: { currentUtilization: 80, targetUtilization: 30 },
      };

      (creditRepairService.calculateImpact as jest.Mock).mockResolvedValue(50);

      const request = createMockRequest('http://localhost:3000/api/credit-repair/impact', {
        method: 'POST',
        body: validInput,
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.action).toBe('pay_down_utilization');
      expect(data.data.estimatedImpact).toBe(50);
      expect(data.data.description).toBe('High Impact (50-100 points)');
      expect(data.data.timeline).toBe('30 days');
      expect(data.data.successRate).toBe(95);
    });

    it('should return correct impact description for very high impact', async () => {
      const validInput = {
        action: 'dispute_inaccuracy',
        data: {},
      };

      (creditRepairService.calculateImpact as jest.Mock).mockResolvedValue(120);

      const request = createMockRequest('http://localhost:3000/api/credit-repair/impact', {
        method: 'POST',
        body: validInput,
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.estimatedImpact).toBe(120);
      expect(data.data.description).toBe('Very High Impact (100+ points)');
    });

    it('should return correct impact description for medium impact', async () => {
      const validInput = {
        action: 'goodwill_letter',
        data: {},
      };

      (creditRepairService.calculateImpact as jest.Mock).mockResolvedValue(30);

      const request = createMockRequest('http://localhost:3000/api/credit-repair/impact', {
        method: 'POST',
        body: validInput,
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.estimatedImpact).toBe(30);
      expect(data.data.description).toBe('Medium Impact (20-50 points)');
    });

    it('should return correct impact description for low impact', async () => {
      const validInput = {
        action: 'remove_inquiry',
        data: {},
      };

      (creditRepairService.calculateImpact as jest.Mock).mockResolvedValue(15);

      const request = createMockRequest('http://localhost:3000/api/credit-repair/impact', {
        method: 'POST',
        body: validInput,
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.estimatedImpact).toBe(15);
      expect(data.data.description).toBe('Low Impact (10-20 points)');
    });

    it('should return correct impact description for minimal impact', async () => {
      const validInput = {
        action: 'optimize_payment_timing',
        data: {},
      };

      (creditRepairService.calculateImpact as jest.Mock).mockResolvedValue(5);

      const request = createMockRequest('http://localhost:3000/api/credit-repair/impact', {
        method: 'POST',
        body: validInput,
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.estimatedImpact).toBe(5);
      expect(data.data.description).toBe('Minimal Impact (<10 points)');
    });

    it('should return 400 for missing action field', async () => {
      const invalidInput = {
        data: {},
      };

      const request = createMockRequest('http://localhost:3000/api/credit-repair/impact', {
        method: 'POST',
        body: invalidInput,
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required field: action');
    });

    it('should return 400 for invalid action type', async () => {
      const invalidInput = {
        action: 'invalid_action',
        data: {},
      };

      const request = createMockRequest('http://localhost:3000/api/credit-repair/impact', {
        method: 'POST',
        body: invalidInput,
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid action type');
      expect(data.validActions).toBeDefined();
    });

    it('should return 401 if not authenticated', async () => {
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: false,
        user: null,
      });

      const validInput = {
        action: 'pay_down_utilization',
        data: {},
      };

      const request = createMockRequest('http://localhost:3000/api/credit-repair/impact', {
        method: 'POST',
        body: validInput,
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 500 on service error', async () => {
      const validInput = {
        action: 'pay_down_utilization',
        data: {},
      };

      (creditRepairService.calculateImpact as jest.Mock).mockRejectedValue(
        new Error('Service error')
      );

      const request = createMockRequest('http://localhost:3000/api/credit-repair/impact', {
        method: 'POST',
        body: validInput,
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to calculate impact');
    });
  });
});
