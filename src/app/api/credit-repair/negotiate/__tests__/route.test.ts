/**
 * Tests for Pay-for-Delete Negotiation API Route
 * 
 * Tests:
 * - GET /api/credit-repair/negotiate
 * - POST /api/credit-repair/negotiate
 */

import { NextRequest } from 'next/server';

// Mock dependencies BEFORE importing modules that use them
jest.mock('@/lib/auth/jwt-validation');
jest.mock('@/lib/credit-repair/db', () => ({
  db: {
    negotiations: {
      getNegotiationsByUser: jest.fn(),
      getNegotiationStats: jest.fn(),
      createNegotiation: jest.fn(),
    },
  },
}));
jest.mock('@/lib/credit-repair', () => ({
  negotiationService: {
    generateNegotiationScript: jest.fn(),
    calculateSettlement: jest.fn(),
  },
}));
jest.mock('@/lib/security/audit-logging');

// Import after mocks are set up
import { GET, POST } from '../route';
import { jwtValidation } from '@/lib/auth/jwt-validation';
import { db } from '@/lib/credit-repair/db';
import { negotiationService } from '@/lib/credit-repair';
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

describe('/api/credit-repair/negotiate', () => {
  const mockUser = { id: 'user-123', email: 'test@example.com', name: 'Test User' };
  const mockNegotiation = {
    id: 'negotiation-123',
    userId: 'user-123',
    collectionId: 'collection-123',
    collectionAgency: 'Test Collections',
    currentBalance: 5000,
    targetSettlement: 40,
    status: 'draft',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (auditLogger.logAIInteraction as jest.Mock).mockResolvedValue(undefined);
    (auditLogger.logSecurityEvent as jest.Mock).mockResolvedValue(undefined);
  });

  describe('GET /api/credit-repair/negotiate', () => {
    beforeEach(() => {
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: true,
        user: mockUser,
      });
    });

    it('should return all negotiations for user', async () => {
      // Mock database - route expects { negotiations, total }
      (db.negotiations.getNegotiationsByUser as jest.Mock).mockResolvedValue({
        negotiations: [mockNegotiation],
        total: 1,
      });
      (db.negotiations.getNegotiationStats as jest.Mock).mockResolvedValue({
        total: 1,
        byStatus: { draft: 1 },
      });

      const request = createMockRequest('http://localhost:3000/api/credit-repair/negotiate');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.negotiations).toHaveLength(1);
      expect(data.data.stats).toBeDefined();
      expect(data.data.pagination).toBeDefined();
    });

    it('should filter negotiations by status', async () => {
      // Mock database - route expects { negotiations, total }
      (db.negotiations.getNegotiationsByUser as jest.Mock).mockResolvedValue({
        negotiations: [mockNegotiation],
        total: 1,
      });
      (db.negotiations.getNegotiationStats as jest.Mock).mockResolvedValue({
        total: 1,
        byStatus: { draft: 1 },
      });

      const request = createMockRequest('http://localhost:3000/api/credit-repair/negotiate?status=draft');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // Route maps 'draft' to 'pending' status
      expect(db.negotiations.getNegotiationsByUser).toHaveBeenCalledWith(mockUser.id, {
        status: 'pending',
        limit: 50,
        offset: 0,
      });
    });

    it('should return 401 if not authenticated', async () => {
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: false,
        user: null,
      });

      const request = createMockRequest('http://localhost:3000/api/credit-repair/negotiate');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 500 on database error', async () => {
      (db.negotiations.getNegotiationsByUser as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      const request = createMockRequest('http://localhost:3000/api/credit-repair/negotiate');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to get negotiations');
    });
  });

  describe('POST /api/credit-repair/negotiate', () => {
    beforeEach(() => {
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: true,
        user: mockUser,
      });
    });

    it('should create new negotiation with AI-generated scripts', async () => {
      const validInput = {
        collectionId: 'collection-123',
        collectionAgency: 'Test Collections',
        currentBalance: 5000,
        generateScript: true,
      };

      (negotiationService.generateNegotiationScript as jest.Mock).mockResolvedValue({
        phoneScript: 'Phone script...',
        emailScript: 'Email script...',
        letterScript: 'Letter script...',
      });
      (negotiationService.calculateSettlement as jest.Mock).mockReturnValue({
        settlementAmount: 2000,
        percentage: 40,
        savings: 3000,
      });
      (db.negotiations.createNegotiation as jest.Mock).mockResolvedValue(mockNegotiation);

      const request = createMockRequest('http://localhost:3000/api/credit-repair/negotiate', {
        method: 'POST',
        body: validInput,
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.negotiation.id).toBe(mockNegotiation.id);
      expect(data.data.settlement).toBeDefined();
      expect(negotiationService.generateNegotiationScript).toHaveBeenCalled();
    });

    it('should create negotiation without generating scripts', async () => {
      const validInput = {
        collectionId: 'collection-123',
        collectionAgency: 'Test Collections',
        currentBalance: 5000,
        generateScript: false,
      };

      (negotiationService.calculateSettlement as jest.Mock).mockReturnValue({
        settlementAmount: 2000,
        percentage: 40,
        savings: 3000,
      });
      (db.negotiations.createNegotiation as jest.Mock).mockResolvedValue(mockNegotiation);

      const request = createMockRequest('http://localhost:3000/api/credit-repair/negotiate', {
        method: 'POST',
        body: validInput,
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(negotiationService.generateNegotiationScript).not.toHaveBeenCalled();
    });

    it('should return 400 for missing required fields', async () => {
      const invalidInput = {
        collectionId: 'collection-123',
        // Missing collectionAgency, currentBalance
      };

      const request = createMockRequest('http://localhost:3000/api/credit-repair/negotiate', {
        method: 'POST',
        body: invalidInput,
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required fields');
    });

    it('should return 401 if not authenticated', async () => {
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: false,
        user: null,
      });

      const validInput = {
        collectionId: 'collection-123',
        collectionAgency: 'Test Collections',
        currentBalance: 5000,
      };

      const request = createMockRequest('http://localhost:3000/api/credit-repair/negotiate', {
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
        collectionId: 'collection-123',
        collectionAgency: 'Test Collections',
        currentBalance: 5000,
        generateScript: true,
      };

      (negotiationService.generateNegotiationScript as jest.Mock).mockRejectedValue(
        new Error('Service error')
      );

      const request = createMockRequest('http://localhost:3000/api/credit-repair/negotiate', {
        method: 'POST',
        body: validInput,
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to create negotiation');
    });
  });
});
