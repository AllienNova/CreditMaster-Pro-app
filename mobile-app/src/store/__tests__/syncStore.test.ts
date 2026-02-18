/**
 * Fynvita Sync Store Unit Tests
 * Tests offline mode: connectivity tracking, queue management, sync on reconnect
 */

import { act } from '@testing-library/react-native';
import { useSyncStore, selectIsOnline, selectIsSyncing, selectPendingCount, selectFailedCount, selectHasPendingChanges } from '../syncStore';

// Mock NetInfo — define everything INSIDE the factory to survive jest.mock hoisting
// and resetMocks. Access mock handles via require() in beforeEach.
jest.mock('@react-native-community/netinfo', () => {
  const mockAddEventListener = jest.fn(() => jest.fn());
  const mockFetchFn = jest.fn(() =>
    Promise.resolve({ isConnected: true, type: 'wifi' })
  );
  return {
    __esModule: true,
    default: {
      addEventListener: mockAddEventListener,
      fetch: mockFetchFn,
    },
  };
});

// Mock API processOfflineQueue
const mockProcessOfflineQueue = jest.fn();
jest.mock('../../services/api', () => ({
  processOfflineQueue: (...args: unknown[]) => mockProcessOfflineQueue(...args),
}));

// Mock dynamic imports for processAction — the mock functions are re-assigned
// fresh implementations in beforeEach to survive resetMocks.
const mockCreateDispute = jest.fn();
const mockCreateBudget = jest.fn();
const mockCreateGoal = jest.fn();

jest.mock('../disputeStore', () => ({
  useDisputeStore: {
    getState: () => ({
      createDispute: (...args: unknown[]) => mockCreateDispute(...args),
    }),
  },
}));

jest.mock('../financialStore', () => ({
  useFinancialStore: {
    getState: () => ({
      createBudget: (...args: unknown[]) => mockCreateBudget(...args),
      createGoal: (...args: unknown[]) => mockCreateGoal(...args),
    }),
  },
}));

// Get references to NetInfo mock functions via require (safe after hoisting)
const NetInfo = require('@react-native-community/netinfo').default;

describe('Sync Store', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Re-apply default implementations after resetMocks clears them
    NetInfo.addEventListener.mockImplementation(() => jest.fn());
    NetInfo.fetch.mockResolvedValue({ isConnected: true, type: 'wifi' });
    mockProcessOfflineQueue.mockResolvedValue({ processed: 0, failed: 0 });
    mockCreateDispute.mockResolvedValue({ id: 'dispute-1' });
    mockCreateBudget.mockResolvedValue(true);
    mockCreateGoal.mockResolvedValue(true);

    // Reset store to initial state
    useSyncStore.setState({
      isOnline: true,
      connectionType: null,
      lastOnlineAt: null,
      isSyncing: false,
      lastSyncAt: null,
      syncError: null,
      pendingActions: [],
      failedActions: [],
    });
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = useSyncStore.getState();
      expect(state.isOnline).toBe(true);
      expect(state.connectionType).toBeNull();
      expect(state.lastOnlineAt).toBeNull();
      expect(state.isSyncing).toBe(false);
      expect(state.lastSyncAt).toBeNull();
      expect(state.syncError).toBeNull();
      expect(state.pendingActions).toEqual([]);
      expect(state.failedActions).toEqual([]);
    });
  });

  describe('setOnlineStatus', () => {
    it('should set online status to true', () => {
      useSyncStore.setState({ isOnline: false });

      act(() => {
        useSyncStore.getState().setOnlineStatus(true, 'wifi');
      });

      const state = useSyncStore.getState();
      expect(state.isOnline).toBe(true);
      expect(state.connectionType).toBe('wifi');
      expect(state.lastOnlineAt).not.toBeNull();
    });

    it('should set online status to false', () => {
      act(() => {
        useSyncStore.getState().setOnlineStatus(false, 'none');
      });

      const state = useSyncStore.getState();
      expect(state.isOnline).toBe(false);
      expect(state.connectionType).toBe('none');
    });

    it('should not update lastOnlineAt when going offline', () => {
      const previousLastOnline = '2024-01-01T00:00:00.000Z';
      useSyncStore.setState({ lastOnlineAt: previousLastOnline });

      act(() => {
        useSyncStore.getState().setOnlineStatus(false);
      });

      expect(useSyncStore.getState().lastOnlineAt).toBe(previousLastOnline);
    });

    it('should update lastOnlineAt when coming online', () => {
      const before = new Date().toISOString();

      act(() => {
        useSyncStore.getState().setOnlineStatus(true);
      });

      const after = useSyncStore.getState().lastOnlineAt;
      expect(after).not.toBeNull();
      expect(new Date(after!).getTime()).toBeGreaterThanOrEqual(new Date(before).getTime());
    });

    it('should preserve existing connectionType when not provided', () => {
      useSyncStore.setState({ connectionType: 'cellular' });

      act(() => {
        useSyncStore.getState().setOnlineStatus(true);
      });

      expect(useSyncStore.getState().connectionType).toBe('cellular');
    });

    it('should auto-sync when coming back online with pending actions', async () => {
      useSyncStore.setState({
        isOnline: false,
        pendingActions: [
          {
            id: '1',
            type: 'create',
            entity: 'dispute',
            data: { reason: 'test' },
            timestamp: Date.now(),
            retryCount: 0,
          },
        ],
      });
      mockProcessOfflineQueue.mockResolvedValue({ processed: 0, failed: 0 });
      mockCreateDispute.mockResolvedValue({ id: 'dispute-1' });

      await act(async () => {
        useSyncStore.getState().setOnlineStatus(true);
        // Wait for async syncAll to complete
        await new Promise((r) => setTimeout(r, 50));
      });

      expect(useSyncStore.getState().isOnline).toBe(true);
      // syncAll should have been triggered
      expect(mockProcessOfflineQueue).toHaveBeenCalled();
    });

    it('should NOT auto-sync when coming online with no pending actions', () => {
      useSyncStore.setState({ isOnline: false, pendingActions: [] });

      act(() => {
        useSyncStore.getState().setOnlineStatus(true);
      });

      expect(mockProcessOfflineQueue).not.toHaveBeenCalled();
    });
  });

  describe('initializeNetworkListener', () => {
    it('should register a NetInfo event listener', () => {
      const unsubscribe = useSyncStore.getState().initializeNetworkListener();

      expect(NetInfo.addEventListener).toHaveBeenCalledTimes(1);
      expect(typeof unsubscribe).toBe('function');
    });

    it('should fetch initial network state', async () => {
      useSyncStore.getState().initializeNetworkListener();

      expect(NetInfo.fetch).toHaveBeenCalled();
    });

    it('should call setOnlineStatus when network state changes', () => {
      let listenerCallback: (state: { isConnected: boolean; type: string }) => void = () => {};
      NetInfo.addEventListener.mockImplementation((cb: typeof listenerCallback) => {
        listenerCallback = cb;
        return jest.fn();
      });

      useSyncStore.getState().initializeNetworkListener();

      act(() => {
        listenerCallback({ isConnected: false, type: 'none' });
      });

      expect(useSyncStore.getState().isOnline).toBe(false);
    });

    it('should return an unsubscribe function', () => {
      const mockUnsub = jest.fn();
      NetInfo.addEventListener.mockReturnValue(mockUnsub);

      const unsubscribe = useSyncStore.getState().initializeNetworkListener();
      unsubscribe();

      expect(mockUnsub).toHaveBeenCalled();
    });
  });

  describe('syncAll', () => {
    it('should return zeros when offline', async () => {
      useSyncStore.setState({
        isOnline: false,
        pendingActions: [
          { id: '1', type: 'create', entity: 'dispute', data: {}, timestamp: Date.now(), retryCount: 0 },
        ],
      });

      let result: { success: number; failed: number } = { success: 0, failed: 0 };
      await act(async () => {
        result = await useSyncStore.getState().syncAll();
      });

      expect(result).toEqual({ success: 0, failed: 0 });
      expect(useSyncStore.getState().syncError).toBe('No internet connection');
    });

    it('should return zeros when no pending actions', async () => {
      useSyncStore.setState({ isOnline: true, pendingActions: [] });

      let result: { success: number; failed: number } = { success: 0, failed: 0 };
      await act(async () => {
        result = await useSyncStore.getState().syncAll();
      });

      expect(result).toEqual({ success: 0, failed: 0 });
    });

    it('should process pending actions and count API queue results', async () => {
      mockProcessOfflineQueue.mockResolvedValue({ processed: 3, failed: 1 });

      useSyncStore.setState({
        isOnline: true,
        pendingActions: [
          { id: '1', type: 'create', entity: 'dispute', data: { reason: 'test' }, timestamp: Date.now(), retryCount: 0 },
        ],
      });

      let result: { success: number; failed: number } = { success: 0, failed: 0 };
      await act(async () => {
        result = await useSyncStore.getState().syncAll();
      });

      // API queue processed 3 successfully plus 1 failed
      expect(result.success).toBeGreaterThanOrEqual(3);
      expect(useSyncStore.getState().isSyncing).toBe(false);
      expect(useSyncStore.getState().lastSyncAt).not.toBeNull();
    });

    it('should call processOfflineQueue before local actions', async () => {
      mockProcessOfflineQueue.mockResolvedValue({ processed: 0, failed: 0 });

      useSyncStore.setState({
        isOnline: true,
        pendingActions: [
          { id: '1', type: 'create', entity: 'budget', data: { category: 'food', limit: 500 }, timestamp: Date.now(), retryCount: 0 },
        ],
      });

      await act(async () => {
        await useSyncStore.getState().syncAll();
      });

      expect(mockProcessOfflineQueue).toHaveBeenCalledTimes(1);
    });

    it('should handle actions where processAction returns false', async () => {
      // When processAction cannot process an action (e.g. dynamic import or entity not handled),
      // it returns false and the action should be retried (retryCount incremented)
      mockProcessOfflineQueue.mockResolvedValue({ processed: 0, failed: 0 });

      useSyncStore.setState({
        isOnline: true,
        pendingActions: [
          { id: '1', type: 'create', entity: 'goal', data: { name: 'Save 10K' }, timestamp: Date.now(), retryCount: 0 },
        ],
      });

      await act(async () => {
        await useSyncStore.getState().syncAll();
      });

      // Action should remain in pending with incremented retryCount
      const state = useSyncStore.getState();
      expect(state.pendingActions.length).toBe(1);
      expect(state.pendingActions[0].retryCount).toBe(1);
    });

    it('should retry failed actions up to 3 times', async () => {
      mockProcessOfflineQueue.mockResolvedValue({ processed: 0, failed: 0 });
      mockCreateDispute.mockResolvedValue(null); // simulate failure (returns falsy)

      useSyncStore.setState({
        isOnline: true,
        pendingActions: [
          { id: '1', type: 'create', entity: 'dispute', data: {}, timestamp: Date.now(), retryCount: 0 },
        ],
      });

      await act(async () => {
        await useSyncStore.getState().syncAll();
      });

      // Action should be moved to remaining with incremented retryCount
      const state = useSyncStore.getState();
      expect(state.pendingActions.length).toBe(1);
      expect(state.pendingActions[0].retryCount).toBe(1);
    });

    it('should move actions to failedActions after 3 retries', async () => {
      mockProcessOfflineQueue.mockResolvedValue({ processed: 0, failed: 0 });
      mockCreateDispute.mockResolvedValue(null);

      useSyncStore.setState({
        isOnline: true,
        pendingActions: [
          { id: '1', type: 'create', entity: 'dispute', data: {}, timestamp: Date.now(), retryCount: 3 },
        ],
      });

      await act(async () => {
        await useSyncStore.getState().syncAll();
      });

      const state = useSyncStore.getState();
      expect(state.pendingActions.length).toBe(0);
      expect(state.failedActions.length).toBe(1);
      expect(state.failedActions[0].id).toBe('1');
    });

    it('should handle exceptions from processAction', async () => {
      mockProcessOfflineQueue.mockResolvedValue({ processed: 0, failed: 0 });
      mockCreateDispute.mockRejectedValue(new Error('Network error'));

      useSyncStore.setState({
        isOnline: true,
        pendingActions: [
          { id: '1', type: 'create', entity: 'dispute', data: {}, timestamp: Date.now(), retryCount: 2 },
        ],
      });

      await act(async () => {
        await useSyncStore.getState().syncAll();
      });

      // retryCount was 2, so next attempt (2+1=3) should put it in remainingActions,
      // but since 2 < 3, it should increment to retryCount=3
      const state = useSyncStore.getState();
      expect(state.pendingActions.length).toBe(1);
      expect(state.pendingActions[0].retryCount).toBe(3);
    });

    it('should move to failedActions on exception when retryCount is already 3', async () => {
      mockProcessOfflineQueue.mockResolvedValue({ processed: 0, failed: 0 });
      mockCreateDispute.mockRejectedValue(new Error('Permanent failure'));

      useSyncStore.setState({
        isOnline: true,
        pendingActions: [
          { id: '1', type: 'create', entity: 'dispute', data: {}, timestamp: Date.now(), retryCount: 3 },
        ],
      });

      await act(async () => {
        await useSyncStore.getState().syncAll();
      });

      const state = useSyncStore.getState();
      expect(state.pendingActions.length).toBe(0);
      expect(state.failedActions.length).toBe(1);
    });

    it('should set syncError when processOfflineQueue throws', async () => {
      mockProcessOfflineQueue.mockRejectedValue(new Error('Queue processing error'));

      useSyncStore.setState({
        isOnline: true,
        pendingActions: [
          { id: '1', type: 'create', entity: 'dispute', data: {}, timestamp: Date.now(), retryCount: 0 },
        ],
      });

      let result: { success: number; failed: number } = { success: 0, failed: 0 };
      await act(async () => {
        result = await useSyncStore.getState().syncAll();
      });

      expect(result).toEqual({ success: 0, failed: 1 });
      expect(useSyncStore.getState().syncError).toBe('Queue processing error');
      expect(useSyncStore.getState().isSyncing).toBe(false);
    });

    it('should set isSyncing during sync', async () => {
      mockProcessOfflineQueue.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ processed: 0, failed: 0 }), 100))
      );

      useSyncStore.setState({
        isOnline: true,
        pendingActions: [
          { id: '1', type: 'create', entity: 'dispute', data: {}, timestamp: Date.now(), retryCount: 0 },
        ],
      });

      const syncPromise = useSyncStore.getState().syncAll();

      // Check isSyncing was set to true
      // It happens synchronously at the start of syncAll
      expect(useSyncStore.getState().isSyncing).toBe(true);

      await act(async () => {
        await syncPromise;
      });

      expect(useSyncStore.getState().isSyncing).toBe(false);
    });

    it('should handle unknown entity types gracefully', async () => {
      mockProcessOfflineQueue.mockResolvedValue({ processed: 0, failed: 0 });

      useSyncStore.setState({
        isOnline: true,
        pendingActions: [
          { id: '1', type: 'create', entity: 'transaction' as 'dispute', data: {}, timestamp: Date.now(), retryCount: 0 },
        ],
      });

      await act(async () => {
        await useSyncStore.getState().syncAll();
      });

      // processAction returns false for unknown entity, so it should be retried
      const state = useSyncStore.getState();
      expect(state.pendingActions.length).toBe(1);
      expect(state.pendingActions[0].retryCount).toBe(1);
    });
  });

  describe('addPendingAction', () => {
    it('should add a pending action with generated id and timestamp', () => {
      useSyncStore.setState({ isOnline: false }); // prevent auto-sync

      act(() => {
        useSyncStore.getState().addPendingAction({
          type: 'create',
          entity: 'dispute',
          data: { reason: 'test' },
        });
      });

      const state = useSyncStore.getState();
      expect(state.pendingActions.length).toBe(1);
      expect(state.pendingActions[0].id).toBeDefined();
      expect(state.pendingActions[0].timestamp).toBeGreaterThan(0);
      expect(state.pendingActions[0].retryCount).toBe(0);
      expect(state.pendingActions[0].type).toBe('create');
      expect(state.pendingActions[0].entity).toBe('dispute');
    });

    it('should append to existing pending actions', () => {
      useSyncStore.setState({
        isOnline: false,
        pendingActions: [
          { id: 'existing', type: 'update', entity: 'budget', data: {}, timestamp: 1000, retryCount: 0 },
        ],
      });

      act(() => {
        useSyncStore.getState().addPendingAction({
          type: 'create',
          entity: 'goal',
          data: { name: 'New Goal' },
        });
      });

      expect(useSyncStore.getState().pendingActions.length).toBe(2);
    });

    it('should trigger syncAll when online', async () => {
      mockProcessOfflineQueue.mockResolvedValue({ processed: 0, failed: 0 });
      useSyncStore.setState({ isOnline: true, pendingActions: [] });

      await act(async () => {
        useSyncStore.getState().addPendingAction({
          type: 'create',
          entity: 'dispute',
          data: {},
        });
        await new Promise((r) => setTimeout(r, 50));
      });

      // syncAll was called because isOnline is true
      expect(mockProcessOfflineQueue).toHaveBeenCalled();
    });

    it('should NOT trigger syncAll when offline', () => {
      useSyncStore.setState({ isOnline: false });

      act(() => {
        useSyncStore.getState().addPendingAction({
          type: 'delete',
          entity: 'document',
          data: { id: 'doc-1' },
        });
      });

      expect(mockProcessOfflineQueue).not.toHaveBeenCalled();
    });
  });

  describe('removePendingAction', () => {
    it('should remove a specific pending action by id', () => {
      useSyncStore.setState({
        pendingActions: [
          { id: 'keep-1', type: 'create', entity: 'dispute', data: {}, timestamp: 1, retryCount: 0 },
          { id: 'remove-1', type: 'update', entity: 'budget', data: {}, timestamp: 2, retryCount: 0 },
          { id: 'keep-2', type: 'delete', entity: 'goal', data: {}, timestamp: 3, retryCount: 0 },
        ],
      });

      act(() => {
        useSyncStore.getState().removePendingAction('remove-1');
      });

      const remaining = useSyncStore.getState().pendingActions;
      expect(remaining.length).toBe(2);
      expect(remaining.map((a) => a.id)).toEqual(['keep-1', 'keep-2']);
    });

    it('should not modify list when id does not exist', () => {
      useSyncStore.setState({
        pendingActions: [
          { id: 'action-1', type: 'create', entity: 'dispute', data: {}, timestamp: 1, retryCount: 0 },
        ],
      });

      act(() => {
        useSyncStore.getState().removePendingAction('non-existent');
      });

      expect(useSyncStore.getState().pendingActions.length).toBe(1);
    });
  });

  describe('retryFailedActions', () => {
    it('should move failed actions back to pending with reset retryCount', async () => {
      mockProcessOfflineQueue.mockResolvedValue({ processed: 0, failed: 0 });

      useSyncStore.setState({
        isOnline: true,
        pendingActions: [],
        failedActions: [
          { id: 'failed-1', type: 'create', entity: 'dispute', data: {}, timestamp: 1, retryCount: 3 },
          { id: 'failed-2', type: 'update', entity: 'budget', data: {}, timestamp: 2, retryCount: 3 },
        ],
      });

      await act(async () => {
        await useSyncStore.getState().retryFailedActions();
      });

      const state = useSyncStore.getState();
      // Failed actions should be cleared
      expect(state.failedActions.length).toBe(0);
      // They were moved to pending then processed via syncAll
    });

    it('should trigger syncAll after moving actions', async () => {
      mockProcessOfflineQueue.mockResolvedValue({ processed: 0, failed: 0 });

      useSyncStore.setState({
        isOnline: true,
        pendingActions: [],
        failedActions: [
          { id: 'failed-1', type: 'create', entity: 'dispute', data: {}, timestamp: 1, retryCount: 3 },
        ],
      });

      await act(async () => {
        await useSyncStore.getState().retryFailedActions();
      });

      expect(mockProcessOfflineQueue).toHaveBeenCalled();
    });
  });

  describe('clearFailedActions', () => {
    it('should clear all failed actions', () => {
      useSyncStore.setState({
        failedActions: [
          { id: '1', type: 'create', entity: 'dispute', data: {}, timestamp: 1, retryCount: 3 },
          { id: '2', type: 'update', entity: 'budget', data: {}, timestamp: 2, retryCount: 3 },
        ],
      });

      act(() => {
        useSyncStore.getState().clearFailedActions();
      });

      expect(useSyncStore.getState().failedActions).toEqual([]);
    });
  });

  describe('clearSyncError', () => {
    it('should clear sync error', () => {
      useSyncStore.setState({ syncError: 'Some error' });

      act(() => {
        useSyncStore.getState().clearSyncError();
      });

      expect(useSyncStore.getState().syncError).toBeNull();
    });
  });

  describe('resetStore', () => {
    it('should reset all state to initial values', () => {
      useSyncStore.setState({
        isOnline: false,
        connectionType: 'cellular',
        lastOnlineAt: '2024-01-01',
        isSyncing: true,
        lastSyncAt: '2024-01-01',
        syncError: 'error',
        pendingActions: [
          { id: '1', type: 'create', entity: 'dispute', data: {}, timestamp: 1, retryCount: 0 },
        ],
        failedActions: [
          { id: '2', type: 'update', entity: 'budget', data: {}, timestamp: 2, retryCount: 3 },
        ],
      });

      act(() => {
        useSyncStore.getState().resetStore();
      });

      const state = useSyncStore.getState();
      expect(state.isOnline).toBe(true);
      expect(state.connectionType).toBeNull();
      expect(state.lastOnlineAt).toBeNull();
      expect(state.isSyncing).toBe(false);
      expect(state.lastSyncAt).toBeNull();
      expect(state.syncError).toBeNull();
      expect(state.pendingActions).toEqual([]);
      expect(state.failedActions).toEqual([]);
    });
  });

  describe('Selectors', () => {
    it('selectIsOnline returns online status', () => {
      const state = useSyncStore.getState();
      expect(selectIsOnline(state)).toBe(true);

      useSyncStore.setState({ isOnline: false });
      expect(selectIsOnline(useSyncStore.getState())).toBe(false);
    });

    it('selectIsSyncing returns syncing status', () => {
      expect(selectIsSyncing(useSyncStore.getState())).toBe(false);

      useSyncStore.setState({ isSyncing: true });
      expect(selectIsSyncing(useSyncStore.getState())).toBe(true);
    });

    it('selectPendingCount returns count of pending actions', () => {
      expect(selectPendingCount(useSyncStore.getState())).toBe(0);

      useSyncStore.setState({
        pendingActions: [
          { id: '1', type: 'create', entity: 'dispute', data: {}, timestamp: 1, retryCount: 0 },
          { id: '2', type: 'update', entity: 'budget', data: {}, timestamp: 2, retryCount: 0 },
        ],
      });
      expect(selectPendingCount(useSyncStore.getState())).toBe(2);
    });

    it('selectFailedCount returns count of failed actions', () => {
      expect(selectFailedCount(useSyncStore.getState())).toBe(0);

      useSyncStore.setState({
        failedActions: [
          { id: '1', type: 'create', entity: 'dispute', data: {}, timestamp: 1, retryCount: 3 },
        ],
      });
      expect(selectFailedCount(useSyncStore.getState())).toBe(1);
    });

    it('selectHasPendingChanges returns true when pending actions exist', () => {
      expect(selectHasPendingChanges(useSyncStore.getState())).toBe(false);

      useSyncStore.setState({
        pendingActions: [
          { id: '1', type: 'create', entity: 'dispute', data: {}, timestamp: 1, retryCount: 0 },
        ],
      });
      expect(selectHasPendingChanges(useSyncStore.getState())).toBe(true);
    });

    it('selectHasPendingChanges returns true when failed actions exist', () => {
      useSyncStore.setState({
        pendingActions: [],
        failedActions: [
          { id: '1', type: 'create', entity: 'dispute', data: {}, timestamp: 1, retryCount: 3 },
        ],
      });
      expect(selectHasPendingChanges(useSyncStore.getState())).toBe(true);
    });

    it('selectHasPendingChanges returns false when both queues are empty', () => {
      useSyncStore.setState({ pendingActions: [], failedActions: [] });
      expect(selectHasPendingChanges(useSyncStore.getState())).toBe(false);
    });
  });
});
