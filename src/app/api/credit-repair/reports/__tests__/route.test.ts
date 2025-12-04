/**
 * Tests for Credit Reports API Route
 */

import { NextRequest } from 'next/server';

// Mock dependencies BEFORE importing modules that use them
jest.mock('@/lib/auth/jwt-validation');
jest.mock('@/lib/credit-repair/db', () => ({
  db: {
    creditReports: {
      getCreditReportsByUser: jest.fn(),
      getCreditReportsByBureau: jest.fn(),
      getLatestCreditReport: jest.fn(),
      createCreditReport: jest.fn(),
    },
  },
}));
jest.mock('@/lib/security/audit-logging');

// Import after mocks are set up
import { GET, POST } from '../route';
import { jwtValidation } from '@/lib/auth/jwt-validation';
import { db } from '@/lib/credit-repair/db';
import { auditLogger } from '@/lib/security/audit-logging';

interface MockRequestOptions {
  method?: string;
  body?: unknown;
}

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

describe('/api/credit-repair/reports', () => {
  const mockUser = { id: 'user-123', email: 'test@example.com', name: 'Test User' };
  const mockReport = {
    id: 'report-123',
    userId: 'user-123',
    bureau: 'experian',
    reportDate: new Date('2024-01-15'),
    score: 720,
    reportData: { accounts: [] },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (auditLogger.logAIInteraction as jest.Mock).mockResolvedValue(undefined);
    (auditLogger.logSecurityEvent as jest.Mock).mockResolvedValue(undefined);
  });

  describe('GET /api/credit-repair/reports', () => {
    beforeEach(() => {
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: true,
        user: mockUser,
      });
    });

    it('should return all credit reports for user', async () => {
      (db.creditReports.getCreditReportsByUser as jest.Mock).mockResolvedValue([mockReport]);
      (db.creditReports.getLatestCreditReport as jest.Mock).mockResolvedValue(mockReport);

      const request = createMockRequest('http://localhost:3000/api/credit-repair/reports');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.reports).toHaveLength(1);
      expect(data.data.latestReport).toBeDefined();
      expect(data.data.pagination).toBeDefined();
    });

    it('should filter reports by bureau', async () => {
      (db.creditReports.getCreditReportsByBureau as jest.Mock).mockResolvedValue([mockReport]);
      // Route uses getCreditReportsByUser for latest report
      (db.creditReports.getCreditReportsByUser as jest.Mock).mockResolvedValue([mockReport]);

      const request = createMockRequest('http://localhost:3000/api/credit-repair/reports?bureau=experian');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // Route calls getCreditReportsByBureau with (userId, bureau, fetchLimit)
      expect(db.creditReports.getCreditReportsByBureau).toHaveBeenCalledWith(mockUser.id, 'experian', 50);
    });

    it('should return 401 if not authenticated', async () => {
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: false,
        user: null,
      });

      const request = createMockRequest('http://localhost:3000/api/credit-repair/reports');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 500 on database error', async () => {
      (db.creditReports.getCreditReportsByUser as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      const request = createMockRequest('http://localhost:3000/api/credit-repair/reports');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to get credit reports');
    });
  });

  describe('POST /api/credit-repair/reports', () => {
    beforeEach(() => {
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: true,
        user: mockUser,
      });
    });

    it('should upload new credit report successfully', async () => {
      const validInput = {
        bureau: 'experian',
        reportDate: '2024-01-15',
        score: 720,
        reportData: { accounts: [] },
      };

      (db.creditReports.createCreditReport as jest.Mock).mockResolvedValue(mockReport);

      const request = createMockRequest('http://localhost:3000/api/credit-repair/reports', {
        method: 'POST',
        body: validInput,
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe(mockReport.id);
    });

    it('should return 400 for missing required fields', async () => {
      const invalidInput = {
        bureau: 'experian',
      };

      const request = createMockRequest('http://localhost:3000/api/credit-repair/reports', {
        method: 'POST',
        body: invalidInput,
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required fields');
    });

    it('should return 400 for invalid bureau', async () => {
      const invalidInput = {
        bureau: 'invalid_bureau',
        reportDate: '2024-01-15',
        score: 720,
      };

      const request = createMockRequest('http://localhost:3000/api/credit-repair/reports', {
        method: 'POST',
        body: invalidInput,
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid bureau');
    });

    it('should return 400 for score below 300', async () => {
      const invalidInput = {
        bureau: 'experian',
        reportDate: '2024-01-15',
        score: 250,
      };

      const request = createMockRequest('http://localhost:3000/api/credit-repair/reports', {
        method: 'POST',
        body: invalidInput,
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid score. Must be between 300 and 850');
    });

    it('should return 400 for score above 850', async () => {
      const invalidInput = {
        bureau: 'experian',
        reportDate: '2024-01-15',
        score: 900,
      };

      const request = createMockRequest('http://localhost:3000/api/credit-repair/reports', {
        method: 'POST',
        body: invalidInput,
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid score. Must be between 300 and 850');
    });

    it('should return 401 if not authenticated', async () => {
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: false,
        user: null,
      });

      const validInput = {
        bureau: 'experian',
        reportDate: '2024-01-15',
        score: 720,
      };

      const request = createMockRequest('http://localhost:3000/api/credit-repair/reports', {
        method: 'POST',
        body: validInput,
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 500 on database error', async () => {
      const validInput = {
        bureau: 'experian',
        reportDate: '2024-01-15',
        score: 720,
      };

      (db.creditReports.createCreditReport as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      const request = createMockRequest('http://localhost:3000/api/credit-repair/reports', {
        method: 'POST',
        body: validInput,
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to upload credit report');
    });
  });
});
