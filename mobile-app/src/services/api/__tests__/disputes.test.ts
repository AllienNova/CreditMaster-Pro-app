/**
 * CPFI Disputes API Service Tests
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
      const newDispute = { bureau: 'experian', itemType: 'late_payment' };
      const createdDispute = { id: 'new-1', ...newDispute };

      (api.post as jest.Mock).mockResolvedValueOnce({ success: true, data: createdDispute });

      const result = await disputeApi.create(newDispute);

      expect(api.post).toHaveBeenCalledWith('/disputes', newDispute);
      expect(result.data).toEqual(createdDispute);
    });
  });

  describe('update', () => {
    it('should update dispute', async () => {
      const updates = { status: 'in_progress' };

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
      (api.post as jest.Mock).mockResolvedValueOnce({ success: true, data: { status: 'sent' } });

      await disputeApi.send('dispute-1');

      expect(api.post).toHaveBeenCalledWith('/disputes/dispute-1/send');
    });
  });
});

describe('Dispute Letter API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateAILetter', () => {
    it('should generate AI letter', async () => {
      const params = {
        disputeType: 'late_payment',
        bureau: 'experian',
        accountInfo: { accountNumber: '1234' },
      };

      (api.post as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: { letter: 'Generated letter content' },
      });

      const result = await disputeLetterApi.generateAILetter(params);

      expect(api.post).toHaveBeenCalledWith('/disputes/letters/generate', params);
      expect(result.data?.letter).toBe('Generated letter content');
    });
  });

  describe('getStrategyRecommendations', () => {
    it('should get strategy recommendations', async () => {
      (api.get as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: { strategies: [{ name: 'Aggressive' }] },
      });

      await disputeLetterApi.getStrategyRecommendations('late_payment');

      expect(api.get).toHaveBeenCalledWith('/disputes/strategies/recommend?type=late_payment');
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

