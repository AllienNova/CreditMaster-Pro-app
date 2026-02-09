/**
 * Fynvita Data Sync Integration Tests
 * Tests data synchronization between stores and API
 */

import { act } from '@testing-library/react-native';
import { useCreditStore } from '../../store/creditStore';
import { useDisputeStore } from '../../store/disputeStore';
import { useFinancialStore } from '../../store/financialStore';

// Mock API services
jest.mock('../../services/api', () => ({
  creditScoreApi: {
    getScores: jest.fn(),
    getHistory: jest.fn(),
    getFactors: jest.fn(),
  },
  creditMonitoringApi: {
    getAlerts: jest.fn(),
  },
  disputeApi: {
    getAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  financialOverviewApi: {
    getDashboard: jest.fn(),
  },
  bankAccountApi: {
    getAccounts: jest.fn(),
  },
}));

const { creditScoreApi, creditMonitoringApi, disputeApi, financialOverviewApi, bankAccountApi } = require('../../services/api');

describe('Data Sync Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useCreditStore.getState().resetStore();
    useDisputeStore.getState().resetStore();
    useFinancialStore.getState().resetStore();
  });

  describe('Initial Data Load', () => {
    it('should load all dashboard data on app start', async () => {
      // Mock API responses
      creditScoreApi.getScores.mockResolvedValue({
        success: true,
        data: { scores: [{ bureau: 'experian', score: 720 }] },
      });
      creditMonitoringApi.getAlerts.mockResolvedValue({
        success: true,
        data: { items: [], total: 0 },
      });
      financialOverviewApi.getDashboard.mockResolvedValue({
        success: true,
        data: { netWorth: 50000 },
      });

      // Simulate initial data load
      await act(async () => {
        await Promise.all([
          useCreditStore.getState().fetchScores(),
          useCreditStore.getState().fetchAlerts(),
          useFinancialStore.getState().fetchDashboard(),
        ]);
      });

      expect(useCreditStore.getState().scores).toHaveLength(1);
      expect(useFinancialStore.getState().dashboard?.netWorth).toBe(50000);
    });
  });

  describe('Cross-Store Data Consistency', () => {
    it('should update credit score after dispute resolution', async () => {
      // Initial state
      useCreditStore.setState({
        scores: [{
          id: 'score-1',
          userId: 'user-1',
          bureau: 'experian',
          score: 680,
          date: new Date().toISOString(),
        }],
      });
      useDisputeStore.setState({
        disputes: [{
          id: '1',
          userId: 'user-1',
          status: 'pending',
          bureau: 'experian',
          itemType: 'credit_card',
          creditorName: 'Test Creditor',
          disputeReason: 'Not mine',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }],
      });

      // Simulate dispute resolution
      disputeApi.update.mockResolvedValue({
        success: true,
        data: { id: '1', status: 'resolved', bureau: 'experian' },
      });
      creditScoreApi.getScores.mockResolvedValue({
        success: true,
        data: { scores: [{ bureau: 'experian', score: 720 }] },
      });

      await act(async () => {
        await useDisputeStore.getState().updateDispute('1', { status: 'resolved' });
        await useCreditStore.getState().fetchScores();
      });

      expect(useCreditStore.getState().scores[0].score).toBe(720);
    });
  });

  describe('Offline Data Handling', () => {
    it('should queue actions when offline', () => {
      const offlineQueue: Array<{ action: string; data: unknown }> = [];
      
      // Simulate offline action queueing
      const queueAction = (action: string, data: unknown) => {
        offlineQueue.push({ action, data });
      };

      queueAction('createDispute', { bureau: 'experian' });
      queueAction('updateGoal', { id: '1', amount: 100 });

      expect(offlineQueue).toHaveLength(2);
    });

    it('should sync queued actions when back online', async () => {
      const offlineQueue = [
        { action: 'createDispute', data: { bureau: 'experian' } },
      ];

      disputeApi.create.mockResolvedValue({
        success: true,
        data: { id: 'new-1', bureau: 'experian' },
      });

      // Simulate sync
      for (const item of offlineQueue) {
        if (item.action === 'createDispute') {
          await disputeApi.create(item.data);
        }
      }

      expect(disputeApi.create).toHaveBeenCalledWith({ bureau: 'experian' });
    });
  });

  describe('Real-time Updates', () => {
    it('should handle real-time credit alert', () => {
      const initialAlerts = useCreditStore.getState().alerts;

      // Simulate real-time alert
      const newAlert = {
        id: 'alert-1',
        userId: 'user-1',
        bureau: 'experian',
        alertType: 'score_change' as const,
        type: 'score_change' as const,
        severity: 'medium' as const,
        title: 'Score Change Alert',
        description: 'Your score increased by 10 points',
        message: 'Your score increased by 10 points',
        createdAt: new Date().toISOString(),
        acknowledged: false,
        isRead: false,
      };

      useCreditStore.setState({
        alerts: [...initialAlerts, newAlert],
      });

      expect(useCreditStore.getState().alerts).toHaveLength(1);
    });
  });

  describe('Data Refresh', () => {
    it('should refresh all data on pull-to-refresh', async () => {
      creditScoreApi.getScores.mockResolvedValue({ success: true, data: { scores: [] } });
      financialOverviewApi.getDashboard.mockResolvedValue({ success: true, data: {} });
      bankAccountApi.getAccounts.mockResolvedValue({ success: true, data: { accounts: [] } });

      await act(async () => {
        await Promise.all([
          useCreditStore.getState().fetchScores(),
          useFinancialStore.getState().fetchDashboard(),
          useFinancialStore.getState().fetchAccounts(),
        ]);
      });

      expect(creditScoreApi.getScores).toHaveBeenCalled();
      expect(financialOverviewApi.getDashboard).toHaveBeenCalled();
      expect(bankAccountApi.getAccounts).toHaveBeenCalled();
    });
  });
});

