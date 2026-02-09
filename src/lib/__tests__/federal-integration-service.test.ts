import { FederalIntegrationService } from '../federal-integration-service';

describe('FederalIntegrationService', () => {
  let service: FederalIntegrationService;

  beforeEach(() => {
    service = new FederalIntegrationService();
  });

  describe('retrieveNSLDSData', () => {
    it('should retrieve NSLDS data for a user', async () => {
      const userId = 'test-user-123';
      const result = await service.retrieveNSLDSData(userId);
      
      expect(result).toBeDefined();
      expect(result.user_id).toBe(userId);
      expect(result.loans).toBeInstanceOf(Array);
    });

    it('should return mock data structure', async () => {
      const result = await service.retrieveNSLDSData('test-user');
      
      expect(result).toHaveProperty('user_id');
      expect(result).toHaveProperty('loans');
      expect(result).toHaveProperty('grants');
      expect(result).toHaveProperty('last_updated');
    });
  });

  describe('submitFreshStartApplication', () => {
    it('should submit a fresh start application', async () => {
      const applicationData = {
        userId: 'test-user',
        loanIds: ['loan-123'],
        reason: 'Financial hardship',
      };

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
        loanIds: ['loan-123'],
        proposedMonthlyPayment: 200,
      };

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
        loanIds: ['loan-123'],
        targetServicer: 'FedLoan',
      };

      const result = await service.submitConsolidationApplication(applicationData);
      
      expect(result).toBeDefined();
      expect(result.application_id).toBeDefined();
      expect(result.status).toBe('submitted');
    });
  });

  describe('trackApplicationStatus', () => {
    it('should track application status', async () => {
      const applicationId = 'app-123';
      const result = await service.trackApplicationStatus(applicationId);
      
      expect(result).toBeDefined();
      expect(result.application_id).toBe(applicationId);
      expect(result.status).toBeDefined();
    });
  });
});

