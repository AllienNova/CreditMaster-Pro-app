/**
 * Tests for /api/credit-repair/disputes
 *
 * Coverage:
 * - GET endpoint (fetch all disputes with filtering)
 * - POST endpoint (create new dispute)
 * - Authentication
 * - Validation
 * - Error handling
 */

import 'openai/shims/node';
import { NextRequest } from 'next/server';

// Mock dependencies BEFORE importing modules that use them
jest.mock('@/lib/auth/jwt-validation');
jest.mock('@/lib/credit-repair/db', () => ({
  db: {
    disputes: {
      getDisputesByUser: jest.fn(),
      getDisputesByStatus: jest.fn(),
      getDisputesByBureau: jest.fn(),
      getDisputeStats: jest.fn(),
      createDispute: jest.fn(),
    },
  },
}));
jest.mock('@/lib/credit-repair/dispute-service');
jest.mock('@/lib/security/audit-logging');

// Import after mocks are set up
import { GET, POST } from '../route';
import { jwtValidation } from '@/lib/auth/jwt-validation';
import { db } from '@/lib/credit-repair/db';
import { disputeService } from '@/lib/credit-repair/dispute-service';
import { auditLogger } from '@/lib/security/audit-logging';

interface MockRequestOptions {
  method?: string;
  body?: unknown;
}

/**
 * Helper function to create a properly mocked NextRequest
 * This ensures the json() method works correctly in tests
 */
function createMockRequest(url: string, options?: MockRequestOptions) {
  const request = {
    url,
    method: options?.method || 'GET',
    json: jest.fn().mockResolvedValue(options?.body || {}),
    headers: new Headers(),
    nextUrl: new URL(url),
  } as unknown as NextRequest;
  return request;
}

describe('/api/credit-repair/disputes', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
  };

  const mockDispute = {
    id: 'dispute-123',
    userId: 'user-123',
    itemType: 'late_payment',
    itemDescription: 'Late payment on credit card',
    creditorName: 'Test Bank',
    accountNumber: '****1234',
    disputeReason: 'Not my account',
    strategy: 'basic_dispute',
    bureau: 'experian',
    status: 'draft',
    letterContent: 'Dispute letter content...',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock audit logger
    (auditLogger.logAIInteraction as jest.Mock).mockResolvedValue(undefined);
    (auditLogger.logSecurityEvent as jest.Mock).mockResolvedValue(undefined);
  });

  describe('GET /api/credit-repair/disputes', () => {
    it('should return all disputes for user', async () => {
      // Mock authentication
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: true,
        user: mockUser,
      });

      // Mock database
      (db.disputes.getDisputesByUser as jest.Mock).mockResolvedValue({
        disputes: [mockDispute],
        total: 1,
      });
      (db.disputes.getDisputeStats as jest.Mock).mockResolvedValue({
        total: 1,
        byStatus: { draft: 1 },
        byBureau: { experian: 1 },
      });

      const request = createMockRequest('http://localhost:3000/api/credit-repair/disputes');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data.disputes)).toBe(true);
      expect(data.data.disputes[0].id).toBe(mockDispute.id);
      expect(data.data.disputes[0].status).toBe(mockDispute.status);
      expect(data.data.stats).toBeDefined();
      expect(data.data.stats.total).toBe(1);
      expect(db.disputes.getDisputesByUser).toHaveBeenCalledWith(mockUser.id, {
        status: undefined,
        bureau: undefined,
        strategy: undefined,
        limit: 50,
        offset: 0,
      });
    });

    it('should filter disputes by status', async () => {
      // Mock authentication
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: true,
        user: mockUser,
      });

      // Mock database - when status is provided, API calls getDisputesByStatus
      (db.disputes.getDisputesByStatus as jest.Mock).mockResolvedValue([mockDispute]);
      (db.disputes.getDisputeStats as jest.Mock).mockResolvedValue({
        total: 1,
        byStatus: { draft: 1 },
        byBureau: { experian: 1 },
      });

      const request = createMockRequest('http://localhost:3000/api/credit-repair/disputes?status=draft');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(db.disputes.getDisputesByStatus).toHaveBeenCalledWith(mockUser.id, 'draft', 50);
    });

    it('should return 401 if not authenticated', async () => {
      // Mock authentication failure
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: false,
        user: null,
      });

      const request = createMockRequest('http://localhost:3000/api/credit-repair/disputes');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('POST /api/credit-repair/disputes', () => {
    const validInput = {
      itemType: 'late_payment',
      itemDescription: 'Late payment on credit card',
      creditorName: 'Test Bank',
      accountNumber: '****1234',
      balance: 1000,
      inaccuracyType: 'not_mine',
      strategy: 'basic_dispute',
      bureau: 'experian',
      generateLetter: true,
    };

    it('should create new dispute with AI-generated letter', async () => {
      // Mock authentication
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: true,
        user: mockUser,
      });

      // Mock dispute service
      (disputeService.generateDisputeLetter as jest.Mock).mockResolvedValue({
        letter: 'Generated dispute letter...',
        subject: 'Dispute Letter',
        tips: ['Tip 1', 'Tip 2'],
      });

      // Mock database
      (db.disputes.createDispute as jest.Mock).mockResolvedValue(mockDispute);

      const request = createMockRequest('http://localhost:3000/api/credit-repair/disputes', {
        method: 'POST',
        body: validInput,
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe(mockDispute.id);
      expect(data.data.status).toBe(mockDispute.status);
      expect(disputeService.generateDisputeLetter).toHaveBeenCalled();
      expect(db.disputes.createDispute).toHaveBeenCalled();
      expect(auditLogger.logAIInteraction).toHaveBeenCalled();
    });

    it('should create dispute without generating letter', async () => {
      // Mock authentication
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: true,
        user: mockUser,
      });

      // Mock database
      (db.disputes.createDispute as jest.Mock).mockResolvedValue(mockDispute);

      const input = { ...validInput, generateLetter: false };
      const request = createMockRequest('http://localhost:3000/api/credit-repair/disputes', {
        method: 'POST',
        body: input,
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(disputeService.generateDisputeLetter).not.toHaveBeenCalled();
      expect(db.disputes.createDispute).toHaveBeenCalled();
    });

    it('should return 400 for missing required fields', async () => {
      // Mock authentication
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: true,
        user: mockUser,
      });

      const invalidInput = { itemType: 'late_payment' }; // Missing required fields
      const request = createMockRequest('http://localhost:3000/api/credit-repair/disputes', {
        method: 'POST',
        body: invalidInput,
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required fields');
    });

    it('should return 400 for invalid strategy', async () => {
      // Mock authentication
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: true,
        user: mockUser,
      });

      const invalidInput = { ...validInput, strategy: 'invalid_strategy' };
      const request = createMockRequest('http://localhost:3000/api/credit-repair/disputes', {
        method: 'POST',
        body: invalidInput,
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid strategy');
    });

    it('should return 400 for invalid bureau', async () => {
      // Mock authentication
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: true,
        user: mockUser,
      });

      const invalidInput = { ...validInput, bureau: 'invalid_bureau' };
      const request = createMockRequest('http://localhost:3000/api/credit-repair/disputes', {
        method: 'POST',
        body: invalidInput,
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid bureau');
    });

    it('should return 401 if not authenticated', async () => {
      // Mock authentication failure
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: false,
        user: null,
      });

      const request = createMockRequest('http://localhost:3000/api/credit-repair/disputes', {
        method: 'POST',
        body: validInput,
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });
  });
});
