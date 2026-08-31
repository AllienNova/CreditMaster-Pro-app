import { FederalIntegrationService } from '../federal-integration-service';
import axios, { AxiosInstance } from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;
type MockAxiosClient = {
  get: jest.Mock;
  post: jest.Mock;
};

describe('FederalIntegrationService', () => {
  let service: FederalIntegrationService;
  let mockNsldsInstance: MockAxiosClient;
  let mockFsaInstance: MockAxiosClient;

  beforeEach(() => {
    jest.clearAllMocks();
    mockNsldsInstance = {
      get: jest.fn(),
      post: jest.fn(),
    };
    mockFsaInstance = {
      get: jest.fn(),
      post: jest.fn(),
    };

    mockedAxios.create = jest.fn()
      .mockImplementationOnce(() => mockNsldsInstance as unknown as AxiosInstance)
      .mockImplementationOnce(() => mockFsaInstance as unknown as AxiosInstance);

    service = new FederalIntegrationService();
  });

  describe('retrieveNSLDSData', () => {
    it('should retrieve NSLDS data for a user', async () => {
      const userId = 'test-user-123';
      const mockResponse = {
        data: {
          user_id: userId,
          loans: [
            { id: 'loan-1', balance: 10000, type: 'Direct Subsidized' },
            { id: 'loan-2', balance: 15000, type: 'Direct Unsubsidized' },
          ],
          total_debt: 25000,
        },
      };

      // Mock the axios get call
      mockNsldsInstance.get.mockResolvedValue(mockResponse);

      const result = await service.retrieveNSLDSData(userId);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.loans).toBeInstanceOf(Array);
      expect(result.loans).toHaveLength(2);
    });

    it('should return mock data structure', async () => {
      const mockResponse = {
        data: {
          user_id: 'test-user',
          loans: [],
          grants: [],
          total_debt: 0,
          last_updated: new Date().toISOString(),
        },
      };

      const mockGet = jest.fn().mockResolvedValue(mockResponse);
      mockNsldsInstance.get = mockGet;

      const result = await service.retrieveNSLDSData('test-user');

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('loans');
      expect(result).toHaveProperty('total_debt');
    });
  });

  describe('submitFreshStartApplication', () => {
    it('should submit a fresh start application', async () => {
      const applicationData = {
        userId: 'test-user',
        programType: 'fresh-start' as const,
        loanIds: ['loan-123'],
        personalInfo: {
          firstName: 'John',
          lastName: 'Doe',
          ssn: '123-45-6789',
          dateOfBirth: '1990-01-01',
          email: 'john@example.com',
          phone: '555-1234'
        }
      };

      const mockResponse = {
        data: {
          application_id: 'app-123',
          status: 'submitted',
        },
      };

      const mockPost = jest.fn().mockResolvedValue(mockResponse);
      mockFsaInstance.post = mockPost;

      const result = await service.submitFreshStartApplication(applicationData);

      expect(result).toBeDefined();
      expect(result.application_id).toBeDefined();
      expect(result.status).toBe('submitted');
    });
  });

  describe('submitRehabilitationApplication', () => {
    it('should submit a rehabilitation application', async () => {
      const applicationData = {
        userId: 'test-user',
        programType: 'rehabilitation' as const,
        loanIds: ['loan-123'],
        personalInfo: {
          firstName: 'John',
          lastName: 'Doe',
          ssn: '123-45-6789',
          dateOfBirth: '1990-01-01',
          email: 'john@example.com',
          phone: '555-1234'
        }
      };

      const mockResponse = {
        data: {
          application_id: 'app-456',
          status: 'submitted',
        },
      };

      const mockPost = jest.fn().mockResolvedValue(mockResponse);
      mockFsaInstance.post = mockPost;

      const result = await service.submitRehabilitationApplication(applicationData);

      expect(result).toBeDefined();
      expect(result.application_id).toBeDefined();
      expect(result.status).toBe('submitted');
    });
  });

  describe('submitConsolidationApplication', () => {
    it('should submit a consolidation application', async () => {
      const applicationData = {
        userId: 'test-user',
        programType: 'consolidation' as const,
        loanIds: ['loan-123'],
        personalInfo: {
          firstName: 'John',
          lastName: 'Doe',
          ssn: '123-45-6789',
          dateOfBirth: '1990-01-01',
          email: 'john@example.com',
          phone: '555-1234'
        }
      };

      const mockResponse = {
        data: {
          application_id: 'app-789',
          status: 'submitted',
        },
      };

      const mockPost = jest.fn().mockResolvedValue(mockResponse);
      mockFsaInstance.post = mockPost;

      const result = await service.submitConsolidationApplication(applicationData);

      expect(result).toBeDefined();
      expect(result.application_id).toBeDefined();
      expect(result.status).toBe('submitted');
    });
  });

  describe('trackApplicationStatus', () => {
    it('should track application status', async () => {
      const applicationId = 'app-123';

      const mockResponse = {
        data: {
          status: 'under_review',
          last_updated: new Date().toISOString(),
          next_steps: ['Wait for review'],
          estimated_completion: '2024-03-01',
        },
      };

      const mockGet = jest.fn().mockResolvedValue(mockResponse);
      mockFsaInstance.get = mockGet;

      const result = await service.trackApplicationStatus(applicationId);

      expect(result).toBeDefined();
      expect(result.status).toBe('under_review');
      expect(result.last_updated).toBeDefined();
      expect(result.next_steps).toEqual(['Wait for review']);
      expect(result.estimated_completion).toBe('2024-03-01');
    });
  });
});

