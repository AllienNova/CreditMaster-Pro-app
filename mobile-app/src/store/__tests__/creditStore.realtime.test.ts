/**
 * Credit Store Real-Time Updates Tests
 * Tests for background sync, notifications, and real-time update functionality
 */

import { act } from '@testing-library/react-native';
import { useCreditStore } from '../creditStore';

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
}));

// Mock push notification service
jest.mock('../../services/notifications/pushNotificationService', () => ({
  pushNotificationService: {
    scheduleLocalNotification: jest.fn(),
    cancelNotification: jest.fn(),
    cancelAllNotifications: jest.fn(),
  },
}));

const { creditScoreApi, creditMonitoringApi } = require('../../services/api');
const { pushNotificationService } = require('../../services/notifications/pushNotificationService');

describe('Credit Store - Real-Time Updates', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    useCreditStore.getState().resetStore();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Background Sync', () => {
    it('should enable background sync with default interval', () => {
      act(() => {
        useCreditStore.getState().enableBackgroundSync();
      });

      const state = useCreditStore.getState();
      expect(state.isBackgroundSyncEnabled).toBe(true);
      expect(state.backgroundSyncInterval).toBe(5 * 60 * 1000); // 5 minutes
    });

    it('should enable background sync with custom interval', () => {
      const customInterval = 10 * 60 * 1000; // 10 minutes

      act(() => {
        useCreditStore.getState().enableBackgroundSync(customInterval);
      });

      const state = useCreditStore.getState();
      expect(state.isBackgroundSyncEnabled).toBe(true);
      expect(state.backgroundSyncInterval).toBe(customInterval);
    });

    it('should disable background sync', () => {
      act(() => {
        useCreditStore.getState().enableBackgroundSync();
      });

      act(() => {
        useCreditStore.getState().disableBackgroundSync();
      });

      const state = useCreditStore.getState();
      expect(state.isBackgroundSyncEnabled).toBe(false);
    });

    it('should perform background sync successfully', async () => {
      const mockScores = [
        { id: '1', bureau: 'experian', score: 720, date: '2024-01-01', change: 0 },
      ];
      const mockAlerts = [
        { id: '1', title: 'Test Alert', description: 'Test', severity: 'low', acknowledged: false },
      ];

      creditScoreApi.getScores.mockResolvedValue({
        success: true,
        data: { scores: mockScores },
      });

      creditMonitoringApi.getAlerts.mockResolvedValue({
        success: true,
        data: { items: mockAlerts, total: 1 },
      });

      await act(async () => {
        await useCreditStore.getState().performBackgroundSync();
      });

      const state = useCreditStore.getState();
      expect(state.scores).toEqual(mockScores);
      expect(state.alerts).toEqual(mockAlerts);
      expect(state.lastBackgroundSync).toBeTruthy();
      expect(state.isSyncingInBackground).toBe(false);
    });

    it('should skip background sync if already syncing', async () => {
      useCreditStore.setState({ isSyncingInBackground: true });

      await act(async () => {
        await useCreditStore.getState().performBackgroundSync();
      });

      expect(creditScoreApi.getScores).not.toHaveBeenCalled();
    });
  });

  describe('Score Change Detection', () => {
    it('should detect score increase and send notification', async () => {
      const oldScores = [
        { id: '1', userId: 'test-user', bureau: 'experian' as const, score: 700, date: '2024-01-01', change: 0 },
      ];
      const newScores = [
        { id: '1', userId: 'test-user', bureau: 'experian' as const, score: 720, date: '2024-01-02', change: 20 },
      ];

      pushNotificationService.scheduleLocalNotification.mockResolvedValue('notif-1');

      await act(async () => {
        await useCreditStore.getState().handleScoreChange(newScores, oldScores);
      });

      expect(pushNotificationService.scheduleLocalNotification).toHaveBeenCalledWith(
        expect.stringContaining('📈'),
        expect.stringContaining('increased by 20 points to 720'),
        expect.objectContaining({
          screen: '/credit/score-detail',
        })
      );
    });

    it('should detect score decrease and send notification', async () => {
      const oldScores = [
        { id: '1', userId: 'test-user', bureau: 'experian' as const, score: 720, date: '2024-01-01', change: 0 },
      ];
      const newScores = [
        { id: '1', userId: 'test-user', bureau: 'experian' as const, score: 700, date: '2024-01-02', change: -20 },
      ];

      pushNotificationService.scheduleLocalNotification.mockResolvedValue('notif-1');

      await act(async () => {
        await useCreditStore.getState().handleScoreChange(newScores, oldScores);
      });

      expect(pushNotificationService.scheduleLocalNotification).toHaveBeenCalledWith(
        expect.stringContaining('📉'),
        expect.stringContaining('decreased by 20 points to 700'),
        expect.any(Object)
      );
    });

    it('should not send notification for small score changes (< 5 points)', async () => {
      const oldScores = [
        { id: '1', userId: 'test-user', bureau: 'experian' as const, score: 700, date: '2024-01-01', change: 0 },
      ];
      const newScores = [
        { id: '1', userId: 'test-user', bureau: 'experian' as const, score: 703, date: '2024-01-02', change: 3 },
      ];

      await act(async () => {
        await useCreditStore.getState().handleScoreChange(newScores, oldScores);
      });

      expect(pushNotificationService.scheduleLocalNotification).not.toHaveBeenCalled();
    });

    it('should handle multiple bureau score changes', async () => {
      const oldScores = [
        { id: '1', userId: 'test-user', bureau: 'experian' as const, score: 700, date: '2024-01-01', change: 0 },
        { id: '2', userId: 'test-user', bureau: 'equifax' as const, score: 710, date: '2024-01-01', change: 0 },
      ];
      const newScores = [
        { id: '1', userId: 'test-user', bureau: 'experian' as const, score: 720, date: '2024-01-02', change: 20 },
        { id: '2', userId: 'test-user', bureau: 'equifax' as const, score: 725, date: '2024-01-02', change: 15 },
      ];

      pushNotificationService.scheduleLocalNotification.mockResolvedValue('notif-1');

      await act(async () => {
        await useCreditStore.getState().handleScoreChange(newScores, oldScores);
      });

      expect(pushNotificationService.scheduleLocalNotification).toHaveBeenCalledTimes(2);
    });
  });

  describe('New Alert Handling', () => {
    it('should send notification for new critical alert', async () => {
      const newAlert = {
        id: '1',
        userId: 'test-user',
        bureau: 'experian',
        title: 'Fraud Alert',
        description: 'Suspicious activity detected',
        severity: 'critical' as const,
        acknowledged: false,
        createdAt: '2024-01-01',
        alertType: 'fraud_alert' as const,
      };

      pushNotificationService.scheduleLocalNotification.mockResolvedValue('notif-1');

      await act(async () => {
        await useCreditStore.getState().handleNewAlert(newAlert);
      });

      expect(pushNotificationService.scheduleLocalNotification).toHaveBeenCalledWith(
        expect.stringContaining('🚨'),
        expect.stringContaining('Suspicious activity detected'),
        expect.objectContaining({
          screen: '/monitoring/alerts',
          id: '1',
        })
      );
    });

    it('should send notification for new high severity alert', async () => {
      const newAlert = {
        id: '2',
        userId: 'test-user',
        bureau: 'equifax',
        title: 'New Inquiry',
        description: 'Hard inquiry detected',
        severity: 'high' as const,
        acknowledged: false,
        createdAt: '2024-01-01',
        alertType: 'inquiry' as const,
      };

      pushNotificationService.scheduleLocalNotification.mockResolvedValue('notif-2');

      await act(async () => {
        await useCreditStore.getState().handleNewAlert(newAlert);
      });

      expect(pushNotificationService.scheduleLocalNotification).toHaveBeenCalledWith(
        expect.stringContaining('⚠️'),
        expect.any(String),
        expect.any(Object)
      );
    });
  });

  describe('Timestamp Tracking', () => {
    it('should update lastScoreFetch when fetching scores', async () => {
      const mockScores = [
        { id: '1', bureau: 'experian', score: 720, date: '2024-01-01', change: 0 },
      ];

      creditScoreApi.getScores.mockResolvedValue({
        success: true,
        data: { scores: mockScores },
      });

      await act(async () => {
        await useCreditStore.getState().fetchScores();
      });

      const state = useCreditStore.getState();
      expect(state.lastScoreFetch).toBeTruthy();
      expect(state.lastScoreUpdate).toBeTruthy();
    });

    it('should update lastAlertFetch when fetching alerts', async () => {
      const mockAlerts = [
        { id: '1', title: 'Test', description: 'Test', severity: 'low', acknowledged: false },
      ];

      creditMonitoringApi.getAlerts.mockResolvedValue({
        success: true,
        data: { items: mockAlerts, total: 1 },
      });

      await act(async () => {
        await useCreditStore.getState().fetchAlerts();
      });

      const state = useCreditStore.getState();
      expect(state.lastAlertFetch).toBeTruthy();
    });
  });

  describe('Store Reset', () => {
    it('should clean up background sync on reset', () => {
      act(() => {
        useCreditStore.getState().enableBackgroundSync();
      });

      act(() => {
        useCreditStore.getState().resetStore();
      });

      const state = useCreditStore.getState();
      expect(state.isBackgroundSyncEnabled).toBe(false);
    });
  });
});

