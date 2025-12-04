/**
 * Tests for /api/credit-repair/disputes/[id]
 * 
 * Coverage:
 * - GET endpoint (fetch single dispute)
 * - PUT endpoint (update dispute with optimistic locking)
 * - DELETE endpoint (delete dispute)
 * - Authentication
 * - Validation
 * - Error handling
 */

import { GET, PUT, DELETE } from '../route';
import { NextRequest } from 'next/server';
import { jwtValidation } from '@/lib/auth/jwt-validation';
import { db } from '@/lib/credit-repair/db';
import { auditLogger } from '@/lib/security/audit-logging';

// Mock dependencies
jest.mock('@/lib/auth/jwt-validation');
jest.mock('@/lib/credit-repair/db');
jest.mock('@/lib/security/audit-logging');

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

describe('/api/credit-repair/disputes/[id]', () => {
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

  const mockParams = Promise.resolve({ id: 'dispute-123' });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock audit logger
    (auditLogger.logAIInteraction as jest.Mock).mockResolvedValue(undefined);
    (auditLogger.logSecurityEvent as jest.Mock).mockResolvedValue(undefined);
  });

  describe('GET /api/credit-repair/disputes/[id]', () => {
    it('should return single dispute', async () => {
      // Mock authentication
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: true,
        user: mockUser,
      });

      // Mock database
      (db.disputes.getDispute as jest.Mock).mockResolvedValue(mockDispute);

      const request = new NextRequest('http://localhost:3000/api/credit-repair/disputes/dispute-123');
      const response = await GET(request, { params: mockParams });
      const data = await response.json();


      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe(mockDispute.id);
      expect(data.data.status).toBe(mockDispute.status);
      expect(db.disputes.getDispute).toHaveBeenCalledWith('dispute-123', mockUser.id);
    });

    it('should return 404 if dispute not found', async () => {
      // Mock authentication
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: true,
        user: mockUser,
      });

      // Mock database returning null
      (db.disputes.getDispute as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/credit-repair/disputes/dispute-123');
      const response = await GET(request, { params: mockParams });
      const data = await response.json();


      expect(response.status).toBe(404);
      expect(data.error).toBe('Dispute not found');
    });

    it('should return 401 if not authenticated', async () => {
      // Mock authentication failure
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: false,
        user: null,
      });

      const request = new NextRequest('http://localhost:3000/api/credit-repair/disputes/dispute-123');
      const response = await GET(request, { params: mockParams });
      const data = await response.json();


      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('PUT /api/credit-repair/disputes/[id]', () => {
    const validUpdate = {
      status: 'sent',
      letterContent: 'Updated letter content',
    };

    it('should update dispute successfully', async () => {
      // Mock authentication
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: true,
        user: mockUser,
      });

      // Mock database
      const updatedDispute = { ...mockDispute, ...validUpdate };
      (db.disputes.updateDispute as jest.Mock).mockResolvedValue(updatedDispute);

      const request = createMockRequest('http://localhost:3000/api/credit-repair/disputes/dispute-123', {
        method: 'PUT',
        body: validUpdate,
      });
      const response = await PUT(request, { params: mockParams });
      const data = await response.json();


      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe(updatedDispute.id);
      expect(data.data.status).toBe(updatedDispute.status);
      expect(db.disputes.updateDispute).toHaveBeenCalledWith(
        'dispute-123',
        mockUser.id,
        validUpdate,
        undefined
      );
    });

    it('should handle optimistic locking', async () => {
      // Mock authentication
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: true,
        user: mockUser,
      });

      const expectedUpdatedAt = new Date().toISOString();
      const updateWithLocking = {
        ...validUpdate,
        expectedUpdatedAt,
      };

      // Mock database
      const updatedDispute = { ...mockDispute, ...validUpdate };
      (db.disputes.updateDispute as jest.Mock).mockResolvedValue(updatedDispute);

      const request = createMockRequest('http://localhost:3000/api/credit-repair/disputes/dispute-123', {
        method: 'PUT',
        body: updateWithLocking,
      });
      const response = await PUT(request, { params: mockParams });
      const data = await response.json();


      expect(response.status).toBe(200);
      expect(db.disputes.updateDispute).toHaveBeenCalledWith(
        'dispute-123',
        mockUser.id,
        validUpdate,
        new Date(expectedUpdatedAt)
      );
    });

    it('should return 409 on optimistic locking conflict', async () => {
      // Mock authentication
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: true,
        user: mockUser,
      });

      // Mock database throwing optimistic locking error
      (db.disputes.updateDispute as jest.Mock).mockRejectedValue(
        new Error('Dispute was modified by another process')
      );

      const request = createMockRequest('http://localhost:3000/api/credit-repair/disputes/dispute-123', {
        method: 'PUT',
        body: validUpdate,
      });
      const response = await PUT(request, { params: mockParams });
      const data = await response.json();


      expect(response.status).toBe(409);
      expect(data.error).toContain('modified by another process');
    });

    it('should return 400 for invalid strategy', async () => {
      // Mock authentication
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: true,
        user: mockUser,
      });

      const invalidUpdate = { strategy: 'invalid_strategy' };
      const request = createMockRequest('http://localhost:3000/api/credit-repair/disputes/dispute-123', {
        method: 'PUT',
        body: invalidUpdate,
      });
      const response = await PUT(request, { params: mockParams });
      const data = await response.json();


      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid strategy');
    });

    it('should return 401 if not authenticated', async () => {
      // Mock authentication failure
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: false,
        user: null,
      });

      const request = createMockRequest('http://localhost:3000/api/credit-repair/disputes/dispute-123', {
        method: 'PUT',
        body: validUpdate,
      });
      const response = await PUT(request, { params: mockParams });
      const data = await response.json();


      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('DELETE /api/credit-repair/disputes/[id]', () => {
    it('should delete dispute successfully', async () => {
      // Mock authentication
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: true,
        user: mockUser,
      });

      // Mock database
      (db.disputes.deleteDispute as jest.Mock).mockResolvedValue(true);

      const request = new NextRequest('http://localhost:3000/api/credit-repair/disputes/dispute-123', {
        method: 'DELETE',
      });
      const response = await DELETE(request, { params: mockParams });
      const data = await response.json();


      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Dispute deleted successfully');
      expect(db.disputes.deleteDispute).toHaveBeenCalledWith('dispute-123', mockUser.id);
    });

    it('should return 404 if dispute not found', async () => {
      // Mock authentication
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: true,
        user: mockUser,
      });

      // Mock database returning false (not found)
      (db.disputes.deleteDispute as jest.Mock).mockResolvedValue(false);

      const request = new NextRequest('http://localhost:3000/api/credit-repair/disputes/dispute-123', {
        method: 'DELETE',
      });
      const response = await DELETE(request, { params: mockParams });
      const data = await response.json();


      expect(response.status).toBe(404);
      expect(data.error).toBe('Dispute not found');
    });

    it('should return 401 if not authenticated', async () => {
      // Mock authentication failure
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: false,
        user: null,
      });

      const request = new NextRequest('http://localhost:3000/api/credit-repair/disputes/dispute-123', {
        method: 'DELETE',
      });
      const response = await DELETE(request, { params: mockParams });
      const data = await response.json();


      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });
  });
});
