/**
 * CPFI Credit Store Unit Tests
 */

import { act, renderHook } from '@testing-library/react-native';
import { useCreditStore, selectAverageScore, selectScoreByBureau, selectUnreadAlerts } from '../creditStore';

// Mock API services
jest.mock('../../services/api', () => ({
  creditScoreApi: {
    getScores: jest.fn(),
    getHistory: jest.fn(),
    getFactors: jest.fn(),
    refreshScores: jest.fn(),
    simulateImpact: jest.fn(),
  },
  creditMonitoringApi: {
    getStatus: jest.fn(),
    getAlerts: jest.fn(),
    acknowledgeAlert: jest.fn(),
    acknowledgeAllAlerts: jest.fn(),
    updateSettings: jest.fn(),
  },
  creditReportApi: {
    getReports: jest.fn(),
    getReport: jest.fn(),
  },
}));

const { creditScoreApi, creditMonitoringApi } = require('../../services/api');

describe('Credit Store', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset store state
    useCreditStore.getState().resetStore();
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = useCreditStore.getState();
      expect(state.scores).toEqual([]);
      expect(state.scoreHistory).toBeNull();
      expect(state.factors).toEqual([]);
      expect(state.alerts).toEqual([]);
      expect(state.isLoadingScores).toBe(false);
      expect(state.scoreError).toBeNull();
    });
  });

  describe('fetchScores', () => {
    it('should fetch scores successfully', async () => {
      const mockScores = [
        { bureau: 'experian', score: 720, date: '2024-01-15' },
        { bureau: 'equifax', score: 715, date: '2024-01-15' },
        { bureau: 'transunion', score: 725, date: '2024-01-15' },
      ];

      creditScoreApi.getScores.mockResolvedValueOnce({
        success: true,
        data: { scores: mockScores },
      });

      await act(async () => {
        await useCreditStore.getState().fetchScores();
      });

      const state = useCreditStore.getState();
      expect(state.scores).toEqual(mockScores);
      expect(state.isLoadingScores).toBe(false);
      expect(state.scoreError).toBeNull();
    });

    it('should handle fetch scores error', async () => {
      creditScoreApi.getScores.mockResolvedValueOnce({
        success: false,
        error: { message: 'Failed to fetch scores' },
      });

      await act(async () => {
        await useCreditStore.getState().fetchScores();
      });

      const state = useCreditStore.getState();
      expect(state.scores).toEqual([]);
      expect(state.scoreError).toBe('Failed to fetch scores');
    });

    it('should handle network error', async () => {
      creditScoreApi.getScores.mockRejectedValueOnce(new Error('Network error'));

      await act(async () => {
        await useCreditStore.getState().fetchScores();
      });

      const state = useCreditStore.getState();
      expect(state.scoreError).toBe('Network error');
    });
  });

  describe('fetchScoreHistory', () => {
    it('should fetch score history successfully', async () => {
      const mockHistory = {
        dataPoints: [
          { date: '2024-01-01', score: 700 },
          { date: '2024-02-01', score: 710 },
        ],
      };

      creditScoreApi.getHistory.mockResolvedValueOnce({
        success: true,
        data: mockHistory,
      });

      await act(async () => {
        await useCreditStore.getState().fetchScoreHistory(6);
      });

      expect(useCreditStore.getState().scoreHistory).toEqual(mockHistory);
    });
  });

  describe('fetchFactors', () => {
    it('should fetch credit factors successfully', async () => {
      const mockFactors = [
        { name: 'Payment History', impact: 'high', status: 'excellent' },
        { name: 'Credit Utilization', impact: 'high', status: 'good' },
      ];

      creditScoreApi.getFactors.mockResolvedValueOnce({
        success: true,
        data: { factors: mockFactors },
      });

      await act(async () => {
        await useCreditStore.getState().fetchFactors();
      });

      expect(useCreditStore.getState().factors).toEqual(mockFactors);
    });
  });

  describe('simulateImpact', () => {
    it('should simulate score impact successfully', async () => {
      const mockResult = {
        currentScore: 720,
        projectedScore: 750,
        impact: 30,
      };

      creditScoreApi.simulateImpact.mockResolvedValueOnce({
        success: true,
        data: mockResult,
      });

      let result;
      await act(async () => {
        result = await useCreditStore.getState().simulateImpact({ payOffDebt: 5000 });
      });

      expect(result).toEqual(mockResult);
    });

    it('should return null on simulation failure', async () => {
      creditScoreApi.simulateImpact.mockResolvedValueOnce({
        success: false,
      });

      let result;
      await act(async () => {
        result = await useCreditStore.getState().simulateImpact({ payOffDebt: 5000 });
      });

      expect(result).toBeNull();
    });
  });

  describe('Monitoring Alerts', () => {
    it('should fetch alerts successfully', async () => {
      const mockAlerts = [
        { id: '1', type: 'score_change', message: 'Score increased', acknowledged: false },
        { id: '2', type: 'new_account', message: 'New account opened', acknowledged: true },
      ];

      creditMonitoringApi.getAlerts.mockResolvedValueOnce({
        success: true,
        data: { items: mockAlerts },
      });

      await act(async () => {
        await useCreditStore.getState().fetchAlerts();
      });

      const state = useCreditStore.getState();
      expect(state.alerts).toEqual(mockAlerts);
      expect(state.unreadAlertCount).toBe(1);
    });

    it('should acknowledge single alert', async () => {
      // Set initial state with alerts
      useCreditStore.setState({
        alerts: [
          {
            id: '1',
            userId: 'user-1',
            bureau: 'experian',
            alertType: 'score_change' as const,
            type: 'score_change' as const,
            severity: 'medium' as const,
            title: 'Score Change',
            description: 'Test',
            message: 'Test',
            createdAt: new Date().toISOString(),
            acknowledged: false,
          },
        ],
        unreadAlertCount: 1,
      });

      creditMonitoringApi.acknowledgeAlert.mockResolvedValueOnce({ success: true });

      await act(async () => {
        await useCreditStore.getState().acknowledgeAlert('1');
      });

      const state = useCreditStore.getState();
      expect(state.alerts[0].acknowledged).toBe(true);
      expect(state.unreadAlertCount).toBe(0);
    });

    it('should acknowledge all alerts', async () => {
      useCreditStore.setState({
        alerts: [
          {
            id: '1',
            userId: 'user-1',
            bureau: 'experian',
            alertType: 'score_change' as const,
            type: 'score_change' as const,
            severity: 'medium' as const,
            title: 'Alert 1',
            description: 'Test alert 1',
            createdAt: new Date().toISOString(),
            acknowledged: false,
          },
          {
            id: '2',
            userId: 'user-1',
            bureau: 'equifax',
            alertType: 'new_account' as const,
            type: 'new_account' as const,
            severity: 'low' as const,
            title: 'Alert 2',
            description: 'Test alert 2',
            createdAt: new Date().toISOString(),
            acknowledged: false,
          },
        ],
        unreadAlertCount: 2,
      });

      creditMonitoringApi.acknowledgeAllAlerts.mockResolvedValueOnce({ success: true });

      await act(async () => {
        await useCreditStore.getState().acknowledgeAllAlerts();
      });

      const state = useCreditStore.getState();
      expect(state.alerts.every(a => a.acknowledged)).toBe(true);
      expect(state.unreadAlertCount).toBe(0);
    });
  });

  describe('Selectors', () => {
    it('selectAverageScore should calculate average', () => {
      const state = {
        scores: [
          { bureau: 'experian', score: 720 },
          { bureau: 'equifax', score: 710 },
          { bureau: 'transunion', score: 730 },
        ],
      };
      expect(selectAverageScore(state as any)).toBe(720);
    });

    it('selectAverageScore should return 0 for empty scores', () => {
      expect(selectAverageScore({ scores: [] } as any)).toBe(0);
    });

    it('selectScoreByBureau should find correct score', () => {
      const state = {
        scores: [
          { bureau: 'experian' as const, score: 720 },
          { bureau: 'equifax' as const, score: 710 },
        ],
      };
      expect(selectScoreByBureau('experian')(state as any)?.score).toBe(720);
    });

    it('selectUnreadAlerts should filter unread', () => {
      const state = {
        alerts: [
          {
            id: '1',
            userId: 'user-1',
            bureau: 'experian',
            alertType: 'score_change' as const,
            type: 'score_change' as const,
            severity: 'medium' as const,
            title: 'Alert 1',
            description: 'Test',
            createdAt: new Date().toISOString(),
            acknowledged: false,
          },
          {
            id: '2',
            userId: 'user-1',
            bureau: 'equifax',
            alertType: 'new_account' as const,
            type: 'new_account' as const,
            severity: 'low' as const,
            title: 'Alert 2',
            description: 'Test',
            createdAt: new Date().toISOString(),
            acknowledged: true,
          },
          {
            id: '3',
            userId: 'user-1',
            bureau: 'transunion',
            alertType: 'inquiry' as const,
            type: 'inquiry' as const,
            severity: 'medium' as const,
            title: 'Alert 3',
            description: 'Test',
            createdAt: new Date().toISOString(),
            acknowledged: false,
          },
        ],
      };
      expect(selectUnreadAlerts(state as any)).toHaveLength(2);
    });
  });

  describe('Utility Actions', () => {
    it('should clear errors', () => {
      useCreditStore.setState({ scoreError: 'Test error', alertError: 'Alert error' });
      useCreditStore.getState().clearErrors();
      const state = useCreditStore.getState();
      expect(state.scoreError).toBeNull();
      expect(state.alertError).toBeNull();
    });

    it('should reset store', () => {
      useCreditStore.setState({
        scores: [{
          id: 'score-1',
          userId: 'user-1',
          bureau: 'experian' as const,
          score: 700,
          date: new Date().toISOString(),
        }],
        alerts: [{
          id: '1',
          userId: 'user-1',
          bureau: 'experian',
          alertType: 'score_change' as const,
          type: 'score_change' as const,
          severity: 'medium' as const,
          title: 'Test',
          description: 'Test',
          createdAt: new Date().toISOString(),
          acknowledged: false,
        }],
      });
      useCreditStore.getState().resetStore();
      const state = useCreditStore.getState();
      expect(state.scores).toEqual([]);
      expect(state.alerts).toEqual([]);
    });
  });
});

