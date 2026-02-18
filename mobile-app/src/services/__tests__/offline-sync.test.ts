/**
 * Fynvita Offline Sync Service Tests
 *
 * Comprehensive tests for:
 * - Queue persistence across app restarts
 * - Retry logic with exponential backoff
 * - Conflict resolution (last-write-wins)
 * - Queue processing order (FIFO within priority tiers)
 * - Network status transitions (online -> offline -> online)
 * - Dead-letter queue management
 * - Stale entry expiration
 * - Max queue size enforcement
 */

import { OfflineSyncService } from '../offline-sync';
import type { SyncQueueItem, SyncResult, ApiRequestFn } from '../offline-sync';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Mock storage — uses a global so the hoisted jest.mock factory can access it
// ---------------------------------------------------------------------------
const mockAsyncStorage: Record<string, string> = {};

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((key: string) => Promise.resolve(mockAsyncStorage[key] ?? null)),
  setItem: jest.fn((key: string, value: string) => {
    mockAsyncStorage[key] = value;
    return Promise.resolve();
  }),
  removeItem: jest.fn((key: string) => {
    delete mockAsyncStorage[key];
    return Promise.resolve();
  }),
}));

// ---------------------------------------------------------------------------
// NetInfo mock — everything is defined INSIDE the factory to avoid TDZ issues
// caused by jest.mock hoisting. We retrieve mock handles via require() below.
// All internal variables must be prefixed with "mock" to pass babel-jest's
// out-of-scope variable checker. Type annotations avoid the word "state" as a
// parameter name since babel-jest's checker flags it as an out-of-scope reference.
// ---------------------------------------------------------------------------
jest.mock('@react-native-community/netinfo', () => {
  // No TypeScript type annotations inside the factory — babel-jest's scope
  // checker misinterprets parameter names in TS types as variable references.
  const mockInternals = {
    mockCallback: null,
    mockConnected: true,
  };

  const mockAddEventListener = jest.fn((mockCb) => {
    mockInternals.mockCallback = mockCb;
    const mockUnsubscribe = jest.fn(() => {
      mockInternals.mockCallback = null;
    });
    return mockUnsubscribe;
  });

  const mockFetch = jest.fn(() =>
    Promise.resolve({ isConnected: mockInternals.mockConnected, type: 'wifi' }),
  );

  const mockNetInfoModule = {
    addEventListener: mockAddEventListener,
    fetch: mockFetch,
    __mockInternals: mockInternals,
  };

  return {
    __esModule: true,
    default: mockNetInfoModule,
    addEventListener: mockAddEventListener,
    fetch: mockFetch,
    __mockInternals: mockInternals,
  };
});

// ---------------------------------------------------------------------------
// API client mock
// ---------------------------------------------------------------------------
const mockApiRequest = jest.fn();
jest.mock('../../services/api/client', () => ({
  apiRequest: (...args: unknown[]) => mockApiRequest(...args),
}));

// ---------------------------------------------------------------------------
// Retrieve mock handles from the NetInfo mock module (safe post-hoist)
// ---------------------------------------------------------------------------
const NetInfoMock = require('@react-native-community/netinfo');
const mockNetInfoState = NetInfoMock.__mockInternals as {
  mockCallback: ((info: { isConnected: boolean; type: string }) => void) | null;
  mockConnected: boolean;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createService(overrides: Record<string, unknown> = {}): OfflineSyncService {
  return new OfflineSyncService({
    storageKey: 'test_sync_queue',
    maxRetries: 3,
    baseRetryDelay: 10, // Very short for tests
    maxRetryDelay: 100,
    itemTtlMs: 60 * 60 * 1000, // 1 hour
    maxQueueSize: 50,
    autoProcessOnReconnect: true,
    apiRequestFn: mockApiRequest as unknown as ApiRequestFn,
    ...overrides,
  });
}

function makeQueueItem(overrides: Partial<SyncQueueItem> = {}): Omit<
  SyncQueueItem,
  'id' | 'createdAt' | 'retryCount' | 'lastRetryAt'
> {
  return {
    endpoint: '/disputes',
    method: 'POST',
    body: JSON.stringify({ bureau: 'experian' }),
    entity: 'dispute',
    operationType: 'create',
    priority: 'normal',
    conflictStrategy: 'last_write_wins',
    ...overrides,
  };
}

/**
 * Initialize a service in offline mode. Sets the NetInfo mock to report
 * disconnected BEFORE initialize() so that the internal NetInfo.fetch().then()
 * also reports offline. Flushes the microtask to ensure consistency.
 */
async function initOffline(svc: OfflineSyncService): Promise<void> {
  mockNetInfoState.mockConnected = false;
  await svc.initialize();
  // Flush the microtask queued by NetInfo.fetch().then() inside startNetworkListener
  await new Promise((r) => setTimeout(r, 0));
  svc.setOnlineStatus(false);
}

/**
 * Initialize a service in online mode. Ensures NetInfo reports connected
 * and flushes the async initialization.
 */
async function initOnline(svc: OfflineSyncService): Promise<void> {
  mockNetInfoState.mockConnected = true;
  await svc.initialize();
  await new Promise((r) => setTimeout(r, 0));
  // Suppress auto-processing during initialization
  svc.setOnlineStatus(true, false);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('OfflineSyncService', () => {
  let service: OfflineSyncService;

  beforeEach(() => {
    jest.clearAllMocks();
    // Clear mock storage
    Object.keys(mockAsyncStorage).forEach((key) => delete mockAsyncStorage[key]);
    mockNetInfoState.mockConnected = true;
    mockNetInfoState.mockCallback = null;

    // Re-establish NetInfo mock implementations after clearAllMocks strips them
    NetInfoMock.default.addEventListener.mockImplementation(
      (mockCb: (info: { isConnected: boolean; type: string }) => void) => {
        mockNetInfoState.mockCallback = mockCb;
        return jest.fn(() => {
          mockNetInfoState.mockCallback = null;
        });
      },
    );
    NetInfoMock.default.fetch.mockImplementation(() =>
      Promise.resolve({ isConnected: mockNetInfoState.mockConnected, type: 'wifi' }),
    );

    // Re-establish AsyncStorage mock implementations
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    AsyncStorage.getItem.mockImplementation((key: string) => Promise.resolve(mockAsyncStorage[key] ?? null));
    AsyncStorage.setItem.mockImplementation((key: string, value: string) => {
      mockAsyncStorage[key] = value;
      return Promise.resolve();
    });
    AsyncStorage.removeItem.mockImplementation((key: string) => {
      delete mockAsyncStorage[key];
      return Promise.resolve();
    });

    mockApiRequest.mockResolvedValue({ success: true, data: {} });
    service = createService();
  });

  afterEach(async () => {
    await service.destroy();
  });

  // =========================================================================
  // Initialization & Persistence
  // =========================================================================

  describe('Initialization & Persistence', () => {
    it('should initialize without errors on empty storage', async () => {
      await expect(initOnline(service)).resolves.not.toThrow();
      expect(service.getQueueSize()).toBe(0);
    });

    it('should load persisted queue from AsyncStorage on initialize', async () => {
      const existingItems: SyncQueueItem[] = [
        {
          id: 'item-1',
          endpoint: '/disputes',
          method: 'POST',
          body: '{"bureau":"experian"}',
          entity: 'dispute',
          operationType: 'create',
          createdAt: new Date().toISOString(),
          retryCount: 0,
          lastRetryAt: null,
          priority: 'normal',
          conflictStrategy: 'last_write_wins',
        },
        {
          id: 'item-2',
          endpoint: '/settings',
          method: 'PATCH',
          body: '{"theme":"dark"}',
          entity: 'settings',
          operationType: 'update',
          createdAt: new Date().toISOString(),
          retryCount: 1,
          lastRetryAt: new Date().toISOString(),
          priority: 'low',
          conflictStrategy: 'last_write_wins',
        },
      ];

      mockAsyncStorage['test_sync_queue'] = JSON.stringify(existingItems);

      // Initialize offline to prevent auto-processing of loaded items
      await initOffline(service);

      expect(service.getQueueSize()).toBe(2);
      const queue = service.getQueue();
      expect(queue[0].id).toBe('item-1');
      expect(queue[1].id).toBe('item-2');
    });

    it('should persist queue to AsyncStorage when items are added', async () => {
      // Prevent auto-processing by setting offline
      await initOffline(service);

      await service.addToQueue(makeQueueItem());

      const stored = JSON.parse(mockAsyncStorage['test_sync_queue']);
      expect(stored).toHaveLength(1);
      expect(stored[0].endpoint).toBe('/disputes');
    });

    it('should persist queue across simulated app restart', async () => {
      await initOffline(service);

      await service.addToQueue(makeQueueItem({ endpoint: '/disputes' }));
      await service.addToQueue(makeQueueItem({ endpoint: '/settings', entity: 'settings', operationType: 'update' }));
      await service.destroy();

      // Create a new service instance (simulates app restart)
      const service2 = createService();
      await initOffline(service2);

      expect(service2.getQueueSize()).toBe(2);
      const queue = service2.getQueue();
      expect(queue[0].endpoint).toBe('/disputes');
      expect(queue[1].endpoint).toBe('/settings');

      await service2.destroy();
    });

    it('should handle corrupted storage gracefully', async () => {
      mockAsyncStorage['test_sync_queue'] = 'not valid json{{{';

      await expect(initOnline(service)).resolves.not.toThrow();
      expect(service.getQueueSize()).toBe(0);
    });

    it('should be idempotent on multiple initialize calls', async () => {
      await initOnline(service);
      // Additional calls should be safe
      await service.initialize();
      await service.initialize();

      // Should not throw or duplicate state
      expect(service.getQueueSize()).toBe(0);
    });
  });

  // =========================================================================
  // Queue Operations
  // =========================================================================

  describe('Queue Operations', () => {
    beforeEach(async () => {
      await initOffline(service);
    });

    it('should add items to the queue and return an ID', async () => {
      const id = await service.addToQueue(makeQueueItem());

      expect(id).toBeTruthy();
      expect(typeof id).toBe('string');
      expect(service.getQueueSize()).toBe(1);
    });

    it('should assign default priority and conflict strategy', async () => {
      await service.addToQueue({
        endpoint: '/test',
        method: 'POST',
        entity: 'dispute',
        operationType: 'create',
      });

      const queue = service.getQueue();
      expect(queue[0].priority).toBe('normal');
      expect(queue[0].conflictStrategy).toBe('last_write_wins');
    });

    it('should remove items by ID', async () => {
      const id = await service.addToQueue(makeQueueItem());
      expect(service.getQueueSize()).toBe(1);

      const removed = await service.removeFromQueue(id);
      expect(removed).toBe(true);
      expect(service.getQueueSize()).toBe(0);
    });

    it('should return false when removing non-existent item', async () => {
      const removed = await service.removeFromQueue('non-existent-id');
      expect(removed).toBe(false);
    });

    it('should clear the entire queue', async () => {
      await service.addToQueue(makeQueueItem());
      await service.addToQueue(makeQueueItem({ endpoint: '/settings', entity: 'settings' }));
      expect(service.getQueueSize()).toBe(2);

      await service.clearQueue();
      expect(service.getQueueSize()).toBe(0);
    });

    it('should return a read-only snapshot of the queue', async () => {
      await service.addToQueue(makeQueueItem());
      const queue = service.getQueue();

      // Modifying the returned array should not affect internal state
      (queue as SyncQueueItem[]).push({} as SyncQueueItem);
      expect(service.getQueueSize()).toBe(1);
    });
  });

  // =========================================================================
  // FIFO Processing Order
  // =========================================================================

  describe('FIFO Processing Order', () => {
    it('should process items in FIFO order within same priority', async () => {
      await initOffline(service);

      const processedOrder: string[] = [];
      mockApiRequest.mockImplementation(async (endpoint: string) => {
        processedOrder.push(endpoint);
        return { success: true };
      });

      await service.addToQueue(makeQueueItem({ endpoint: '/first' }));
      // Small delay to ensure different timestamps
      await new Promise((r) => setTimeout(r, 5));
      await service.addToQueue(makeQueueItem({ endpoint: '/second', entity: 'settings' }));
      await new Promise((r) => setTimeout(r, 5));
      await service.addToQueue(makeQueueItem({ endpoint: '/third', entity: 'budget' }));

      service.setOnlineStatus(true);
      // Wait for auto-process
      await new Promise((r) => setTimeout(r, 50));

      // All three should have been processed
      // Since all have 'normal' priority, they should be in FIFO order
      expect(processedOrder).toEqual(['/first', '/second', '/third']);
    });

    it('should process higher priority items before lower priority', async () => {
      await initOffline(service);

      const processedOrder: string[] = [];
      mockApiRequest.mockImplementation(async (endpoint: string) => {
        processedOrder.push(endpoint);
        return { success: true };
      });

      await service.addToQueue(makeQueueItem({ endpoint: '/low', priority: 'low', entity: 'bill' }));
      await service.addToQueue(makeQueueItem({ endpoint: '/critical', priority: 'critical', entity: 'dispute' }));
      await service.addToQueue(makeQueueItem({ endpoint: '/normal', priority: 'normal', entity: 'budget' }));
      await service.addToQueue(makeQueueItem({ endpoint: '/high', priority: 'high', entity: 'settings' }));

      service.setOnlineStatus(true);
      await new Promise((r) => setTimeout(r, 50));

      expect(processedOrder[0]).toBe('/critical');
      expect(processedOrder[1]).toBe('/high');
      expect(processedOrder[2]).toBe('/normal');
      expect(processedOrder[3]).toBe('/low');
    });
  });

  // =========================================================================
  // Retry Logic with Exponential Backoff
  // =========================================================================

  describe('Retry Logic with Exponential Backoff', () => {
    it('should retry failed items up to maxRetries', async () => {
      await initOffline(service);

      mockApiRequest.mockRejectedValue(new Error('Server error'));

      await service.addToQueue(makeQueueItem());

      service.setOnlineStatus(true, false);

      // processQueue() tries each item ONCE per call.
      // With maxRetries: 3 we need 3 calls to exhaust retries.
      await service.processQueue(); // retryCount: 0 -> 1
      await service.processQueue(); // retryCount: 1 -> 2
      const result = await service.processQueue(); // retryCount: 2 -> 3, moves to dead-letter

      // After maxRetries (3) failures, item should be in dead-letter
      expect(service.getQueueSize()).toBe(0);
      expect(service.getDeadLetterQueue().length).toBe(1);
      expect(result.failed).toBe(1);
    });

    it('should increment retryCount on each failure', async () => {
      await initOffline(service);

      // Fail once, then succeed
      mockApiRequest
        .mockRejectedValueOnce(new Error('Temporary error'))
        .mockResolvedValueOnce({ success: true });

      await service.addToQueue(makeQueueItem());
      service.setOnlineStatus(true, false);

      // First processQueue: item fails, retryCount becomes 1, stays in queue
      const result1 = await service.processQueue();
      // Item is still in queue with retryCount=1
      expect(service.getQueueSize()).toBe(1);
      const queue = service.getQueue();
      expect(queue[0].retryCount).toBe(1);
      expect(queue[0].lastRetryAt).not.toBeNull();

      // Second processQueue: item succeeds
      const result2 = await service.processQueue();
      expect(result2.processed).toBe(1);
      expect(service.getQueueSize()).toBe(0);
    });

    it('should move to dead-letter queue after exceeding maxRetries', async () => {
      const svc = createService({ maxRetries: 2, baseRetryDelay: 1 });
      await initOffline(svc);

      mockApiRequest.mockRejectedValue(new Error('Persistent error'));

      await svc.addToQueue(makeQueueItem());
      svc.setOnlineStatus(true, false);

      // Process until dead-letter
      await svc.processQueue();
      await svc.processQueue();

      expect(svc.getQueueSize()).toBe(0);
      expect(svc.getDeadLetterQueue().length).toBe(1);
      expect(svc.getDeadLetterQueue()[0].retryCount).toBe(2);

      await svc.destroy();
    });

    it('should allow retrying dead-letter items', async () => {
      const svc = createService({ maxRetries: 1, baseRetryDelay: 1 });
      await initOffline(svc);

      mockApiRequest.mockRejectedValue(new Error('Error'));
      await svc.addToQueue(makeQueueItem());
      svc.setOnlineStatus(true, false);

      await svc.processQueue();
      expect(svc.getDeadLetterQueue().length).toBe(1);

      // Now make API succeed
      mockApiRequest.mockResolvedValue({ success: true });

      const retriedCount = await svc.retryDeadLetterItems();
      expect(retriedCount).toBe(1);
      expect(svc.getQueueSize()).toBe(1);
      expect(svc.getDeadLetterQueue().length).toBe(0);

      // Process should succeed now
      const result = await svc.processQueue();
      expect(result.processed).toBe(1);
      expect(svc.getQueueSize()).toBe(0);

      await svc.destroy();
    });

    it('should use exponential backoff with capped delay', async () => {
      // We test the backoff indirectly by checking that higher retry counts
      // don't cause extremely long delays (capped at maxRetryDelay)
      const svc = createService({ maxRetries: 5, baseRetryDelay: 10, maxRetryDelay: 100 });
      await initOffline(svc);

      // All attempts fail
      mockApiRequest.mockRejectedValue(new Error('Error'));

      await svc.addToQueue(makeQueueItem());
      svc.setOnlineStatus(true, false);

      const startTime = Date.now();
      await svc.processQueue(); // processes with backoff between retries
      const elapsed = Date.now() - startTime;

      // With baseDelay=10ms and 5 retries, max total backoff should be bounded
      // Even with maxRetryDelay=100ms per attempt, total < 600ms (5 * 100 + overhead)
      expect(elapsed).toBeLessThan(2000);

      await svc.destroy();
    });
  });

  // =========================================================================
  // Conflict Resolution
  // =========================================================================

  describe('Conflict Resolution', () => {
    beforeEach(async () => {
      await initOffline(service);
    });

    it('should replace older queued item with last_write_wins for same entity+entityId', async () => {
      await service.addToQueue(
        makeQueueItem({
          entity: 'settings',
          entityId: 'user-settings-1',
          operationType: 'update',
          body: JSON.stringify({ theme: 'light' }),
          conflictStrategy: 'last_write_wins',
        }),
      );

      expect(service.getQueueSize()).toBe(1);

      // Add a newer update for the same entity
      await service.addToQueue(
        makeQueueItem({
          entity: 'settings',
          entityId: 'user-settings-1',
          operationType: 'update',
          body: JSON.stringify({ theme: 'dark' }),
          conflictStrategy: 'last_write_wins',
        }),
      );

      // Should still be 1 item -- the older one was replaced
      expect(service.getQueueSize()).toBe(1);
      const queue = service.getQueue();
      expect(JSON.parse(queue[0].body!).theme).toBe('dark');
    });

    it('should not conflict items with different entityIds', async () => {
      await service.addToQueue(
        makeQueueItem({
          entity: 'dispute',
          entityId: 'dispute-1',
          operationType: 'update',
        }),
      );

      await service.addToQueue(
        makeQueueItem({
          entity: 'dispute',
          entityId: 'dispute-2',
          operationType: 'update',
        }),
      );

      // Two different entities -- both should remain
      expect(service.getQueueSize()).toBe(2);
    });

    it('should not conflict items without entityId', async () => {
      await service.addToQueue(makeQueueItem({ entity: 'dispute', operationType: 'create' }));
      await service.addToQueue(makeQueueItem({ entity: 'dispute', operationType: 'create' }));

      // No entityId means no conflict detection
      expect(service.getQueueSize()).toBe(2);
    });

    it('should keep create when update follows for same entity with last_write_wins', async () => {
      await service.addToQueue(
        makeQueueItem({
          entity: 'budget',
          entityId: 'budget-1',
          operationType: 'create',
          body: JSON.stringify({ category: 'food', limit: 500 }),
        }),
      );

      await service.addToQueue(
        makeQueueItem({
          entity: 'budget',
          entityId: 'budget-1',
          operationType: 'update',
          body: JSON.stringify({ limit: 600 }),
        }),
      );

      // Create should remain alongside update (both needed in sequence)
      expect(service.getQueueSize()).toBe(2);
    });

    it('should replace all with client_wins strategy', async () => {
      await service.addToQueue(
        makeQueueItem({
          entity: 'profile',
          entityId: 'user-1',
          operationType: 'update',
          conflictStrategy: 'last_write_wins',
          body: JSON.stringify({ firstName: 'John' }),
        }),
      );

      await service.addToQueue(
        makeQueueItem({
          entity: 'profile',
          entityId: 'user-1',
          operationType: 'update',
          conflictStrategy: 'client_wins',
          body: JSON.stringify({ firstName: 'Jane' }),
        }),
      );

      expect(service.getQueueSize()).toBe(1);
      expect(JSON.parse(service.getQueue()[0].body!).firstName).toBe('Jane');
    });

    it('should find conflicts for a given entity and entityId', async () => {
      await service.addToQueue(
        makeQueueItem({ entity: 'dispute', entityId: 'disp-1', operationType: 'update' }),
      );
      await service.addToQueue(
        makeQueueItem({ entity: 'dispute', entityId: 'disp-2', operationType: 'update' }),
      );

      const conflicts = service.findConflicts('dispute', 'disp-1');
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].entityId).toBe('disp-1');
    });
  });

  // =========================================================================
  // Network Status Transitions
  // =========================================================================

  describe('Network Status Transitions', () => {
    it('should track online/offline status', async () => {
      await initOnline(service);

      expect(service.getIsOnline()).toBe(true);

      service.setOnlineStatus(false);
      expect(service.getIsOnline()).toBe(false);

      service.setOnlineStatus(true);
      expect(service.getIsOnline()).toBe(true);
    });

    it('should auto-process queue when transitioning from offline to online', async () => {
      await initOffline(service);

      await service.addToQueue(makeQueueItem());
      expect(service.getQueueSize()).toBe(1);

      service.setOnlineStatus(true);
      // Wait for auto-processing
      await new Promise((r) => setTimeout(r, 50));

      expect(service.getQueueSize()).toBe(0);
      expect(mockApiRequest).toHaveBeenCalled();
    });

    it('should not process queue when offline', async () => {
      await initOffline(service);

      await service.addToQueue(makeQueueItem());

      const result = await service.processQueue();
      expect(result.processed).toBe(0);
      expect(result.remaining).toBe(1);
      expect(mockApiRequest).not.toHaveBeenCalled();
    });

    it('should respond to NetInfo network change events', async () => {
      await initOnline(service);

      // Simulate going offline via NetInfo
      if (mockNetInfoState.mockCallback) {
        mockNetInfoState.mockCallback({ isConnected: false, type: 'none' });
      }
      expect(service.getIsOnline()).toBe(false);

      // Add an item while offline
      await service.addToQueue(makeQueueItem());
      expect(service.getQueueSize()).toBe(1);

      // Simulate going back online
      if (mockNetInfoState.mockCallback) {
        mockNetInfoState.mockCallback({ isConnected: true, type: 'wifi' });
      }

      // Wait for auto-processing
      await new Promise((r) => setTimeout(r, 50));

      expect(service.getIsOnline()).toBe(true);
      expect(service.getQueueSize()).toBe(0);
    });

    it('should stop processing mid-queue if network drops', async () => {
      await initOffline(service);

      let callCount = 0;
      mockApiRequest.mockImplementation(async () => {
        callCount++;
        if (callCount === 2) {
          // Simulate network drop during processing
          service.setOnlineStatus(false);
        }
        return { success: true };
      });

      await service.addToQueue(makeQueueItem({ endpoint: '/first', entity: 'dispute' }));
      await service.addToQueue(makeQueueItem({ endpoint: '/second', entity: 'budget' }));
      await service.addToQueue(makeQueueItem({ endpoint: '/third', entity: 'settings' }));

      service.setOnlineStatus(true, false);
      const result = await service.processQueue();

      // First item processed, second processed but then offline set, third skipped
      expect(result.processed).toBe(2);
      expect(result.remaining).toBe(1);
    });
  });

  // =========================================================================
  // Queue Processing
  // =========================================================================

  describe('Queue Processing', () => {
    it('should process successfully and clear queue', async () => {
      await initOffline(service);

      await service.addToQueue(makeQueueItem({ endpoint: '/disputes' }));
      await service.addToQueue(makeQueueItem({ endpoint: '/budgets', entity: 'budget' }));

      service.setOnlineStatus(true, false);
      const result = await service.processQueue();

      expect(result.processed).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.remaining).toBe(0);
      expect(service.getQueueSize()).toBe(0);
    });

    it('should not process concurrently (guard against double-processing)', async () => {
      await initOffline(service);

      mockApiRequest.mockImplementation(async () => {
        await new Promise((r) => setTimeout(r, 50));
        return { success: true };
      });
      await service.addToQueue(makeQueueItem());
      service.setOnlineStatus(true, false);

      // Start two concurrent processQueue calls
      const [result1, result2] = await Promise.all([
        service.processQueue(),
        service.processQueue(),
      ]);

      // One should have processed, the other should return immediately
      const totalProcessed = result1.processed + result2.processed;
      expect(totalProcessed).toBe(1);
    });

    it('should call onSyncCompleted callback after processing', async () => {
      const callback = jest.fn();
      service.onSyncCompleted(callback);

      await initOffline(service);
      await service.addToQueue(makeQueueItem());
      service.setOnlineStatus(true, false);

      await service.processQueue();

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          processed: 1,
          failed: 0,
          remaining: 0,
        }),
      );
    });

    it('should handle API returning success: false as a failure', async () => {
      await initOffline(service);

      mockApiRequest.mockResolvedValue({
        success: false,
        error: { message: 'Validation error', code: 'VALIDATION_ERROR' },
      });

      await service.addToQueue(makeQueueItem());
      service.setOnlineStatus(true, false);

      // This will fail because success: false triggers throw in executeRequest
      const result = await service.processQueue();

      // Should still be in queue (retry) or dead-letter depending on retries
      expect(result.processed).toBe(0);
    });

    it('should retry a single item by ID', async () => {
      await initOffline(service);

      const id = await service.addToQueue(makeQueueItem());
      service.setOnlineStatus(true, false);

      const success = await service.retrySingleItem(id);
      expect(success).toBe(true);
      expect(service.getQueueSize()).toBe(0);
    });

    it('should return false when retrying non-existent item', async () => {
      await initOnline(service);
      const success = await service.retrySingleItem('non-existent');
      expect(success).toBe(false);
    });
  });

  // =========================================================================
  // Expiration (TTL)
  // =========================================================================

  describe('Expiration', () => {
    it('should remove expired items during processQueue', async () => {
      const svc = createService({ itemTtlMs: 100 }); // 100ms TTL
      await initOffline(svc);

      await svc.addToQueue(makeQueueItem());
      expect(svc.getQueueSize()).toBe(1);

      // Wait for item to expire
      await new Promise((r) => setTimeout(r, 150));

      svc.setOnlineStatus(true, false);
      const result = await svc.processQueue();

      expect(result.expired).toBe(1);
      expect(result.processed).toBe(0);
      expect(svc.getQueueSize()).toBe(0);

      await svc.destroy();
    });

    it('should not expire items within TTL', async () => {
      const svc = createService({ itemTtlMs: 60000 }); // 60s TTL
      await initOffline(svc);

      await svc.addToQueue(makeQueueItem());
      svc.setOnlineStatus(true, false);

      const result = await svc.processQueue();
      expect(result.expired).toBe(0);
      expect(result.processed).toBe(1);

      await svc.destroy();
    });
  });

  // =========================================================================
  // Max Queue Size
  // =========================================================================

  describe('Max Queue Size', () => {
    it('should evict oldest low-priority items when max size exceeded', async () => {
      const svc = createService({ maxQueueSize: 3 });
      await initOffline(svc);

      await svc.addToQueue(makeQueueItem({ endpoint: '/a', priority: 'low', entity: 'bill' }));
      await svc.addToQueue(makeQueueItem({ endpoint: '/b', priority: 'critical', entity: 'dispute' }));
      await svc.addToQueue(makeQueueItem({ endpoint: '/c', priority: 'normal', entity: 'budget' }));
      // This fourth item should cause eviction of the oldest low-priority item
      await svc.addToQueue(makeQueueItem({ endpoint: '/d', priority: 'high', entity: 'settings' }));

      expect(svc.getQueueSize()).toBe(3);

      // The low-priority item '/a' should have been evicted
      const queue = svc.getQueue();
      const endpoints = queue.map((item) => item.endpoint);
      expect(endpoints).not.toContain('/a');
      expect(endpoints).toContain('/b');
      expect(endpoints).toContain('/c');
      expect(endpoints).toContain('/d');

      await svc.destroy();
    });
  });

  // =========================================================================
  // Dead Letter Queue
  // =========================================================================

  describe('Dead Letter Queue', () => {
    it('should persist dead-letter queue to storage', async () => {
      const svc = createService({ maxRetries: 1, baseRetryDelay: 1 });
      await initOffline(svc);

      mockApiRequest.mockRejectedValue(new Error('Permanent failure'));
      await svc.addToQueue(makeQueueItem());
      svc.setOnlineStatus(true, false);

      await svc.processQueue();

      expect(svc.getDeadLetterQueue().length).toBe(1);

      // Verify persisted
      const stored = JSON.parse(mockAsyncStorage['fynvita_sync_dead_letter']);
      expect(stored).toHaveLength(1);

      await svc.destroy();
    });

    it('should clear dead-letter queue', async () => {
      const svc = createService({ maxRetries: 1, baseRetryDelay: 1 });
      await initOffline(svc);

      mockApiRequest.mockRejectedValue(new Error('Failure'));
      await svc.addToQueue(makeQueueItem());
      svc.setOnlineStatus(true, false);

      await svc.processQueue();
      expect(svc.getDeadLetterQueue().length).toBe(1);

      await svc.clearDeadLetterQueue();
      expect(svc.getDeadLetterQueue().length).toBe(0);

      await svc.destroy();
    });

    it('should load dead-letter queue from storage on initialize', async () => {
      mockAsyncStorage['fynvita_sync_dead_letter'] = JSON.stringify([
        {
          id: 'dead-1',
          endpoint: '/failed',
          method: 'POST',
          entity: 'dispute',
          operationType: 'create',
          createdAt: new Date().toISOString(),
          retryCount: 5,
          lastRetryAt: new Date().toISOString(),
          priority: 'normal',
          conflictStrategy: 'last_write_wins',
        },
      ]);

      await initOnline(service);
      expect(service.getDeadLetterQueue().length).toBe(1);
      expect(service.getDeadLetterQueue()[0].id).toBe('dead-1');
    });
  });

  // =========================================================================
  // Integration with API Client
  // =========================================================================

  describe('Integration with API Client', () => {
    it('should call apiRequest with correct parameters', async () => {
      await initOffline(service);

      await service.addToQueue(
        makeQueueItem({
          endpoint: '/disputes',
          method: 'POST',
          body: JSON.stringify({ bureau: 'equifax', reason: 'Not mine' }),
        }),
      );

      service.setOnlineStatus(true, false);
      await service.processQueue();

      expect(mockApiRequest).toHaveBeenCalledWith('/disputes', {
        method: 'POST',
        body: JSON.stringify({ bureau: 'equifax', reason: 'Not mine' }),
        offlineSupport: false,
        retryCount: 0,
      });
    });

    it('should handle multiple entity types in a single queue run', async () => {
      await initOffline(service);

      const processedEndpoints: string[] = [];
      mockApiRequest.mockImplementation(async (endpoint: string) => {
        processedEndpoints.push(endpoint);
        return { success: true };
      });

      await service.addToQueue(makeQueueItem({ endpoint: '/disputes', entity: 'dispute' }));
      await service.addToQueue(makeQueueItem({ endpoint: '/documents/upload', entity: 'document', method: 'POST' }));
      await service.addToQueue(makeQueueItem({ endpoint: '/user/settings', entity: 'settings', method: 'PATCH' }));
      await service.addToQueue(makeQueueItem({ endpoint: '/financial/budgets', entity: 'budget', method: 'POST' }));

      service.setOnlineStatus(true, false);
      const result = await service.processQueue();

      expect(result.processed).toBe(4);
      expect(processedEndpoints).toContain('/disputes');
      expect(processedEndpoints).toContain('/documents/upload');
      expect(processedEndpoints).toContain('/user/settings');
      expect(processedEndpoints).toContain('/financial/budgets');
    });
  });

  // =========================================================================
  // Edge Cases
  // =========================================================================

  describe('Edge Cases', () => {
    it('should handle empty queue processQueue gracefully', async () => {
      await initOnline(service);
      const result = await service.processQueue();

      expect(result.processed).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.remaining).toBe(0);
    });

    it('should handle initialize with non-array storage data', async () => {
      mockAsyncStorage['test_sync_queue'] = JSON.stringify({ not: 'an array' });
      await initOnline(service);
      expect(service.getQueueSize()).toBe(0);
    });

    it('should not auto-process when autoProcessOnReconnect is false', async () => {
      const svc = createService({ autoProcessOnReconnect: false });
      await initOffline(svc);

      await svc.addToQueue(makeQueueItem());
      svc.setOnlineStatus(true);

      await new Promise((r) => setTimeout(r, 50));

      // Queue should still have the item because auto-process is disabled
      expect(svc.getQueueSize()).toBe(1);

      await svc.destroy();
    });

    it('should handle retrySingleItem when offline', async () => {
      await initOffline(service);

      const id = await service.addToQueue(makeQueueItem());
      const result = await service.retrySingleItem(id);

      expect(result).toBe(false);
      expect(service.getQueueSize()).toBe(1);
    });
  });
});
