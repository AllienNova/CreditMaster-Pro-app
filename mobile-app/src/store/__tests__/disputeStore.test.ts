/**
 * Fynvita Dispute Store Unit Tests
 */

import { act } from '@testing-library/react-native';
import { useDisputeStore, selectDisputesByStatus, selectActiveDisputes, selectDisputeStats } from '../disputeStore';

// Mock API services
jest.mock('../../services/api', () => ({
  disputeApi: {
    getAll: jest.fn(),
    getById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    send: jest.fn(),
  },
  disputeLetterApi: {
    generateAILetter: jest.fn(),
    generateFromTemplate: jest.fn(),
    getStrategyRecommendations: jest.fn(),
  },
  disputeResourcesApi: {
    getTemplates: jest.fn(),
    getStrategies: jest.fn(),
    getReasons: jest.fn(),
  },
}));

const { disputeApi, disputeLetterApi, disputeResourcesApi } = require('../../services/api');

import type { Dispute } from '../../services/api/types';

// Helper to create mock Dispute objects with required fields
const createMockDispute = (overrides: Partial<Dispute> = {}): Dispute => ({
  id: overrides.id || '1',
  userId: overrides.userId || 'user-1',
  bureau: overrides.bureau || 'experian',
  status: overrides.status || 'pending',
  itemType: overrides.itemType || 'late_payment',
  creditorName: overrides.creditorName || 'Test Creditor',
  disputeReason: overrides.disputeReason || 'Incorrect information',
  createdAt: overrides.createdAt || new Date().toISOString(),
  updatedAt: overrides.updatedAt || new Date().toISOString(),
});

describe('Dispute Store', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useDisputeStore.getState().resetStore();
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = useDisputeStore.getState();
      expect(state.disputes).toEqual([]);
      expect(state.currentDispute).toBeNull();
      expect(state.templates).toEqual([]);
      expect(state.strategies).toEqual([]);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('fetchDisputes', () => {
    it('should fetch disputes successfully', async () => {
      const mockDisputes = [
        createMockDispute({ id: '1', status: 'pending', bureau: 'experian' }),
        createMockDispute({ id: '2', status: 'resolved', bureau: 'equifax' }),
      ];

      disputeApi.getAll.mockResolvedValueOnce({
        success: true,
        data: { items: mockDisputes, total: 2 },
      });

      await act(async () => {
        await useDisputeStore.getState().fetchDisputes();
      });

      const state = useDisputeStore.getState();
      expect(state.disputes).toEqual(mockDisputes);
      expect(state.totalDisputes).toBe(2);
      expect(state.isLoading).toBe(false);
    });

    it('should handle fetch error', async () => {
      disputeApi.getAll.mockResolvedValueOnce({
        success: false,
        error: { message: 'Failed to fetch' },
      });

      await act(async () => {
        await useDisputeStore.getState().fetchDisputes();
      });

      expect(useDisputeStore.getState().error).toBe('Failed to fetch');
    });
  });

  describe('createDispute', () => {
    it('should create dispute successfully', async () => {
      const newDispute = createMockDispute({ id: '1', status: 'pending', bureau: 'experian' });

      disputeApi.create.mockResolvedValueOnce({
        success: true,
        data: newDispute,
      });

      let result;
      await act(async () => {
        result = await useDisputeStore.getState().createDispute({
          bureau: 'experian',
          status: 'pending',
          itemType: 'late_payment',
          creditorName: 'Test Creditor',
          disputeReason: 'Incorrect information',
        });
      });

      expect(result).toEqual(newDispute);
      expect(useDisputeStore.getState().disputes).toContainEqual(newDispute);
    });

    it('should return null on create failure', async () => {
      disputeApi.create.mockResolvedValueOnce({
        success: false,
        error: { message: 'Create failed' },
      });

      let result;
      await act(async () => {
        result = await useDisputeStore.getState().createDispute({
          bureau: 'experian',
          status: 'pending',
          itemType: 'late_payment',
          creditorName: 'Test Creditor',
          disputeReason: 'Incorrect information',
        });
      });

      expect(result).toBeNull();
      expect(useDisputeStore.getState().error).toBe('Create failed');
    });
  });

  describe('updateDispute', () => {
    it('should update dispute successfully', async () => {
      useDisputeStore.setState({
        disputes: [createMockDispute({ id: '1', status: 'pending', bureau: 'experian' })],
      });

      disputeApi.update.mockResolvedValueOnce({
        success: true,
        data: createMockDispute({ id: '1', status: 'in_progress', bureau: 'experian' }),
      });

      let result;
      await act(async () => {
        result = await useDisputeStore.getState().updateDispute('1', { status: 'in_progress' });
      });

      expect(result).toBe(true);
      expect(useDisputeStore.getState().disputes[0].status).toBe('in_progress');
    });
  });

  describe('deleteDispute', () => {
    it('should delete dispute successfully', async () => {
      useDisputeStore.setState({
        disputes: [createMockDispute({ id: '1' }), createMockDispute({ id: '2' })],
        totalDisputes: 2,
      });

      disputeApi.delete.mockResolvedValueOnce({ success: true });

      let result;
      await act(async () => {
        result = await useDisputeStore.getState().deleteDispute('1');
      });

      expect(result).toBe(true);
      expect(useDisputeStore.getState().disputes).toHaveLength(1);
      expect(useDisputeStore.getState().totalDisputes).toBe(1);
    });
  });

  describe('sendDispute', () => {
    it('should send dispute successfully', async () => {
      useDisputeStore.setState({
        disputes: [createMockDispute({ id: '1', status: 'pending' })],
      });

      disputeApi.send.mockResolvedValueOnce({
        success: true,
        data: createMockDispute({ id: '1', status: 'sent' }),
      });

      let result;
      await act(async () => {
        result = await useDisputeStore.getState().sendDispute('1');
      });

      expect(result).toBe(true);
      expect(useDisputeStore.getState().disputes[0].status).toBe('sent');
    });
  });

  describe('AI Letter Generation', () => {
    it('should generate AI letter successfully', async () => {
      // When no currentDispute is set, the store calls generateFromTemplate
      disputeLetterApi.generateFromTemplate.mockResolvedValueOnce({
        success: true,
        data: { letter: 'Generated dispute letter content...' },
      });

      let result;
      await act(async () => {
        result = await useDisputeStore.getState().generateAILetter({
          disputeType: 'late_payment',
          bureau: 'experian',
          accountInfo: { accountNumber: '1234' },
        });
      });

      expect(result).toBe('Generated dispute letter content...');
      expect(useDisputeStore.getState().generatedLetter).toBe('Generated dispute letter content...');
    });

    it('should clear generated letter', () => {
      useDisputeStore.setState({ generatedLetter: 'Test letter' });
      useDisputeStore.getState().clearGeneratedLetter();
      expect(useDisputeStore.getState().generatedLetter).toBeNull();
    });
  });

  describe('Resources', () => {
    it('should fetch templates', async () => {
      const mockTemplates = [{ id: '1', name: 'Late Payment Template' }];
      disputeResourcesApi.getTemplates.mockResolvedValueOnce({
        success: true,
        data: { templates: mockTemplates },
      });

      await act(async () => {
        await useDisputeStore.getState().fetchTemplates();
      });

      expect(useDisputeStore.getState().templates).toEqual(mockTemplates);
    });

    it('should fetch strategies', async () => {
      const mockStrategies = [{ id: '1', name: 'Aggressive Strategy' }];
      disputeResourcesApi.getStrategies.mockResolvedValueOnce({
        success: true,
        data: { strategies: mockStrategies },
      });

      await act(async () => {
        await useDisputeStore.getState().fetchStrategies();
      });

      expect(useDisputeStore.getState().strategies).toEqual(mockStrategies);
    });
  });

  describe('Filters', () => {
    it('should set status filter and refetch', async () => {
      disputeApi.getAll.mockResolvedValue({ success: true, data: { items: [], total: 0 } });

      await act(async () => {
        useDisputeStore.getState().setStatusFilter('pending');
      });

      expect(useDisputeStore.getState().statusFilter).toBe('pending');
      expect(disputeApi.getAll).toHaveBeenCalled();
    });

    it('should set bureau filter and refetch', async () => {
      disputeApi.getAll.mockResolvedValue({ success: true, data: { items: [], total: 0 } });

      await act(async () => {
        useDisputeStore.getState().setBureauFilter('experian');
      });

      expect(useDisputeStore.getState().bureauFilter).toBe('experian');
    });
  });

  describe('Selectors', () => {
    it('selectDisputesByStatus should filter by status', () => {
      const state = {
        disputes: [
          { id: '1', status: 'pending' },
          { id: '2', status: 'resolved' },
          { id: '3', status: 'pending' },
        ],
      };
      expect(selectDisputesByStatus('pending')(state as any)).toHaveLength(2);
    });

    it('selectActiveDisputes should return active disputes', () => {
      const state = {
        disputes: [
          { id: '1', status: 'pending' },
          { id: '2', status: 'in_progress' },
          { id: '3', status: 'resolved' },
          { id: '4', status: 'under_review' },
        ],
      };
      expect(selectActiveDisputes(state as any)).toHaveLength(3);
    });

    it('selectDisputeStats should calculate stats', () => {
      const state = {
        totalDisputes: 5,
        disputes: [
          { status: 'pending' },
          { status: 'pending' },
          { status: 'in_progress' },
          { status: 'resolved' },
          { status: 'rejected' },
        ],
      };
      const stats = selectDisputeStats(state as any);
      expect(stats.total).toBe(5);
      expect(stats.pending).toBe(2);
      expect(stats.inProgress).toBe(1);
      expect(stats.resolved).toBe(1);
      expect(stats.rejected).toBe(1);
    });
  });
});

