/**
 * Fynvita Disputes API Service Tests
 */

import { disputeApi, disputeLetterApi, disputeResourcesApi } from '../disputes';
import { api } from '../client';

// Mock the API client
jest.mock('../client', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

describe('Dispute API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAll', () => {
    it('should fetch all disputes', async () => {
      const mockDisputes = { items: [], total: 0 };

      (api.get as jest.Mock).mockResolvedValueOnce({ success: true, data: mockDisputes });

      const result = await disputeApi.getAll();

      expect(api.get).toHaveBeenCalledWith('/disputes');
      expect(result.data).toEqual(mockDisputes);
    });

    it('should fetch disputes with filters', async () => {
      (api.get as jest.Mock).mockResolvedValueOnce({ success: true, data: { items: [] } });

      await disputeApi.getAll({ status: 'pending', bureau: 'experian', page: 1 });

      expect(api.get).toHaveBeenCalledWith('/disputes?status=pending&bureau=experian&page=1');
    });
  });

  describe('getById', () => {
    it('should fetch single dispute', async () => {
      const mockDispute = { id: 'dispute-1', status: 'pending' };

      (api.get as jest.Mock).mockResolvedValueOnce({ success: true, data: mockDispute });

      const result = await disputeApi.getById('dispute-1');

      expect(api.get).toHaveBeenCalledWith('/disputes/dispute-1');
      expect(result.data).toEqual(mockDispute);
    });
  });

  describe('create', () => {
    it('should create new dispute', async () => {
      const newDispute: any = {
        bureau: 'experian' as const,
        itemType: 'late_payment',
        creditorName: 'Test Creditor',
        disputeReason: 'Not mine',
      };
      const createdDispute = { id: 'new-1', ...newDispute };

      (api.post as jest.Mock).mockResolvedValueOnce({ success: true, data: createdDispute });

      const result = await disputeApi.create(newDispute);

      expect(api.post).toHaveBeenCalledWith('/disputes', newDispute);
      expect(result.data).toEqual(createdDispute);
    });
  });

  describe('update', () => {
    it('should update dispute', async () => {
      const updates: any = { status: 'in_progress' as const };

      (api.patch as jest.Mock).mockResolvedValueOnce({ success: true, data: { id: '1', ...updates } });

      await disputeApi.update('1', updates);

      expect(api.patch).toHaveBeenCalledWith('/disputes/1', updates);
    });
  });

  describe('delete', () => {
    it('should delete dispute', async () => {
      (api.delete as jest.Mock).mockResolvedValueOnce({ success: true });

      await disputeApi.delete('dispute-1');

      expect(api.delete).toHaveBeenCalledWith('/disputes/dispute-1');
    });
  });

  describe('send', () => {
    it('should send dispute', async () => {
      (api.patch as jest.Mock).mockResolvedValueOnce({ success: true, data: { status: 'sent' } });

      await disputeApi.send('dispute-1');

      expect(api.patch).toHaveBeenCalledWith('/disputes/dispute-1/send', { sentDate: expect.any(String) });
    });
  });
});

describe('Dispute Letter API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateAILetter', () => {
    it('should generate AI letter', async () => {
      const disputeId = 'dispute-123';

      (api.post as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: { letter: 'Generated letter content', confidence: 0.95 },
      });

      const result = await disputeLetterApi.generateAILetter(disputeId);

      expect(api.post).toHaveBeenCalledWith('/disputes/dispute-123/generate', { mode: 'ai' });
      expect(result.data?.letter).toBe('Generated letter content');
    });
  });

  describe('getStrategyRecommendations', () => {
    it('should get strategy recommendations', async () => {
      const scenario = {
        disputeType: 'late_payment',
        previousAttempts: 0,
        hasEvidence: true,
      };

      (api.post as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: { recommendations: [{ strategyId: '1', name: 'Aggressive', confidence: 0.9, reasoning: 'Best approach' }] },
      });

      await disputeLetterApi.getStrategyRecommendations(scenario);

      expect(api.post).toHaveBeenCalledWith('/disputes/recommend-strategy', scenario);
    });
  });
});

describe('Dispute Resources API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getTemplates', () => {
    it('should fetch templates', async () => {
      (api.get as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: { templates: [{ id: '1', name: 'Template 1' }] },
      });

      await disputeResourcesApi.getTemplates();

      expect(api.get).toHaveBeenCalledWith('/disputes/templates', { cache: true, cacheTime: 3600000 });
    });
  });

  describe('getStrategies', () => {
    it('should fetch strategies', async () => {
      (api.get as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: { strategies: [] },
      });

      await disputeResourcesApi.getStrategies();

      expect(api.get).toHaveBeenCalledWith('/disputes/strategies', { cache: true, cacheTime: 3600000 });
    });
  });

  describe('getReasons', () => {
    it('should fetch dispute reasons', async () => {
      (api.get as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: { reasons: [] },
      });

      await disputeResourcesApi.getReasons();

      expect(api.get).toHaveBeenCalledWith('/disputes/reasons', { cache: true, cacheTime: 3600000 });
    });
  });
});

