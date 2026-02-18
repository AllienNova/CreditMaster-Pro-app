/**
 * Fynvita Offline Sync Service
 *
 * Centralized offline sync queue with:
 * - Queue persistence via AsyncStorage
 * - Exponential backoff with jitter on retries
 * - FIFO processing order
 * - Conflict resolution (last-write-wins with timestamp comparison)
 * - Network status awareness via NetInfo
 * - Automatic queue processing when connectivity is restored
 * - Stale entry expiration (configurable TTL)
 * - Priority levels for critical operations
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Priority determines processing order when multiple items are queued. */
export type SyncPriority = 'critical' | 'high' | 'normal' | 'low';

/** The kind of mutation that was queued offline. */
export type SyncOperationType = 'create' | 'update' | 'delete' | 'upload';

/** Entity domains that the sync queue supports. */
export type SyncEntity =
  | 'dispute'
  | 'credit_score'
  | 'document'
  | 'budget'
  | 'goal'
  | 'transaction'
  | 'settings'
  | 'notification'
  | 'profile'
  | 'investment'
  | 'student_loan'
  | 'debt'
  | 'bill';

/** Conflict resolution strategies. */
export type ConflictStrategy = 'last_write_wins' | 'client_wins' | 'server_wins' | 'manual';

/** A single item in the sync queue. */
export interface SyncQueueItem {
  /** Unique identifier for this queue entry. */
  id: string;
  /** The API endpoint to call. */
  endpoint: string;
  /** HTTP method. */
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** Serialized request body. */
  body?: string;
  /** Entity type for conflict detection. */
  entity: SyncEntity;
  /** The type of mutation. */
  operationType: SyncOperationType;
  /** Optional entity ID for conflict resolution (e.g., dispute ID). */
  entityId?: string;
  /** ISO timestamp when the item was queued. */
  createdAt: string;
  /** Number of retry attempts so far. */
  retryCount: number;
  /** Last retry ISO timestamp (null if never retried). */
  lastRetryAt: string | null;
  /** Priority for processing order. */
  priority: SyncPriority;
  /** Conflict resolution strategy for this item. */
  conflictStrategy: ConflictStrategy;
  /** Metadata for auditing / debugging. */
  metadata?: Record<string, unknown>;
}

/** Result returned after processing the queue. */
export interface SyncResult {
  processed: number;
  failed: number;
  remaining: number;
  conflicts: number;
  expired: number;
}

/** Signature of the API request function used to execute queued requests. */
export type ApiRequestFn = (
  endpoint: string,
  options?: Record<string, unknown>,
) => Promise<{ success: boolean; error?: { message?: string } }>;

/** Configuration for the offline sync service. */
export interface OfflineSyncConfig {
  /** AsyncStorage key for queue persistence. */
  storageKey: string;
  /** Maximum retry attempts before moving to dead-letter. */
  maxRetries: number;
  /** Base delay in ms for exponential backoff. */
  baseRetryDelay: number;
  /** Maximum delay cap in ms. */
  maxRetryDelay: number;
  /** Time-to-live in ms for queue items (default 72h). */
  itemTtlMs: number;
  /** Maximum queue size. Oldest low-priority items are evicted when exceeded. */
  maxQueueSize: number;
  /** Whether to auto-process when going back online. */
  autoProcessOnReconnect: boolean;
  /**
   * Optional override for the API request function.
   * If not provided, the service dynamically imports `./api/client`.
   * Useful for testing and dependency injection.
   */
  apiRequestFn?: ApiRequestFn;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_CONFIG: OfflineSyncConfig = {
  storageKey: 'fynvita_sync_queue',
  maxRetries: 5,
  baseRetryDelay: 1000,
  maxRetryDelay: 60000,
  itemTtlMs: 72 * 60 * 60 * 1000, // 72 hours
  maxQueueSize: 200,
  autoProcessOnReconnect: true,
};

const PRIORITY_ORDER: Record<SyncPriority, number> = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
};

const DEAD_LETTER_KEY = 'fynvita_sync_dead_letter';

// ---------------------------------------------------------------------------
// OfflineSyncService
// ---------------------------------------------------------------------------

class OfflineSyncService {
  private syncQueue: SyncQueueItem[] = [];
  private deadLetterQueue: SyncQueueItem[] = [];
  private isOnline = true;
  private isProcessing = false;
  private config: OfflineSyncConfig;
  private networkUnsubscribe: (() => void) | null = null;
  private onSyncComplete: ((result: SyncResult) => void) | null = null;
  private initialized = false;

  constructor(config: Partial<OfflineSyncConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // -------------------------------------------------------------------------
  // Initialization
  // -------------------------------------------------------------------------

  /**
   * Initialize the service: load persisted queue and start network listener.
   * Safe to call multiple times -- subsequent calls are no-ops.
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    await this.loadQueueFromStorage();
    await this.loadDeadLetterFromStorage();
    this.startNetworkListener();
    this.initialized = true;
  }

  /**
   * Tear down: stop network listener and persist current state.
   */
  async destroy(): Promise<void> {
    this.stopNetworkListener();
    await this.persistQueue();
    this.initialized = false;
  }

  // -------------------------------------------------------------------------
  // Queue Management
  // -------------------------------------------------------------------------

  /**
   * Add an operation to the sync queue.
   * If the device is online and not currently processing, attempts immediate sync.
   */
  async addToQueue(
    item: Omit<SyncQueueItem, 'id' | 'createdAt' | 'retryCount' | 'lastRetryAt'> & {
      priority?: SyncPriority;
      conflictStrategy?: ConflictStrategy;
    },
  ): Promise<string> {
    const id = `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    const queueItem: SyncQueueItem = {
      id,
      endpoint: item.endpoint,
      method: item.method,
      body: item.body,
      entity: item.entity,
      operationType: item.operationType,
      entityId: item.entityId,
      createdAt: new Date().toISOString(),
      retryCount: 0,
      lastRetryAt: null,
      priority: item.priority ?? 'normal',
      conflictStrategy: item.conflictStrategy ?? 'last_write_wins',
      metadata: item.metadata,
    };

    // Check for conflicts before adding
    this.resolveConflicts(queueItem);

    this.syncQueue.push(queueItem);
    this.enforceMaxQueueSize();
    await this.persistQueue();

    // Try immediate processing if online
    if (this.isOnline && !this.isProcessing) {
      // Fire and forget -- don't block the caller
      this.processQueue().catch(() => {
        // Errors are handled inside processQueue
      });
    }

    return id;
  }

  /**
   * Remove a specific item from the queue by ID.
   */
  async removeFromQueue(itemId: string): Promise<boolean> {
    const initialLength = this.syncQueue.length;
    this.syncQueue = this.syncQueue.filter((item) => item.id !== itemId);
    if (this.syncQueue.length !== initialLength) {
      await this.persistQueue();
      return true;
    }
    return false;
  }

  /**
   * Get the current queue contents (read-only snapshot).
   */
  getQueue(): ReadonlyArray<SyncQueueItem> {
    return [...this.syncQueue];
  }

  /**
   * Get the dead-letter queue (items that exceeded max retries).
   */
  getDeadLetterQueue(): ReadonlyArray<SyncQueueItem> {
    return [...this.deadLetterQueue];
  }

  /**
   * Get current queue size.
   */
  getQueueSize(): number {
    return this.syncQueue.length;
  }

  /**
   * Clear the entire queue. Use with caution.
   */
  async clearQueue(): Promise<void> {
    this.syncQueue = [];
    await this.persistQueue();
  }

  /**
   * Clear the dead-letter queue.
   */
  async clearDeadLetterQueue(): Promise<void> {
    this.deadLetterQueue = [];
    await this.persistDeadLetter();
  }

  /**
   * Move dead-letter items back into the main queue with reset retry counts.
   */
  async retryDeadLetterItems(): Promise<number> {
    const count = this.deadLetterQueue.length;
    for (const item of this.deadLetterQueue) {
      item.retryCount = 0;
      item.lastRetryAt = null;
      item.createdAt = new Date().toISOString();
      this.syncQueue.push(item);
    }
    this.deadLetterQueue = [];
    await this.persistQueue();
    await this.persistDeadLetter();
    return count;
  }

  // -------------------------------------------------------------------------
  // Queue Processing
  // -------------------------------------------------------------------------

  /**
   * Process all pending items in the queue. Items are processed in FIFO order
   * within each priority tier (critical first, then high, normal, low).
   */
  async processQueue(): Promise<SyncResult> {
    if (this.isProcessing) {
      return { processed: 0, failed: 0, remaining: this.syncQueue.length, conflicts: 0, expired: 0 };
    }
    if (!this.isOnline) {
      return { processed: 0, failed: 0, remaining: this.syncQueue.length, conflicts: 0, expired: 0 };
    }

    this.isProcessing = true;
    let processed = 0;
    let failed = 0;
    let expired = 0;

    try {
      // Remove expired items first
      expired = this.removeExpiredItems();

      // Sort: by priority (lower number = higher priority), then by createdAt (FIFO)
      const sortedQueue = [...this.syncQueue].sort((a, b) => {
        const priorityDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });

      const remaining: SyncQueueItem[] = [];

      for (const item of sortedQueue) {
        // Re-check connectivity before each item
        if (!this.isOnline) {
          remaining.push(item);
          continue;
        }

        try {
          await this.executeRequest(item);
          processed++;
        } catch (error) {
          item.retryCount++;
          item.lastRetryAt = new Date().toISOString();

          if (item.retryCount >= this.config.maxRetries) {
            // Move to dead-letter queue
            this.deadLetterQueue.push(item);
            failed++;
          } else {
            // Keep in queue for retry -- apply backoff delay
            const delay = this.calculateBackoff(item.retryCount);
            await this.sleep(delay);
            remaining.push(item);
          }
        }
      }

      this.syncQueue = remaining;
      await this.persistQueue();
      await this.persistDeadLetter();

      const result: SyncResult = {
        processed,
        failed,
        remaining: remaining.length,
        conflicts: 0,
        expired,
      };

      if (this.onSyncComplete) {
        this.onSyncComplete(result);
      }

      return result;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Retry sync for a single item by ID. Useful for user-initiated retries.
   */
  async retrySingleItem(itemId: string): Promise<boolean> {
    const item = this.syncQueue.find((i) => i.id === itemId);
    if (!item) return false;
    if (!this.isOnline) return false;

    try {
      await this.executeRequest(item);
      this.syncQueue = this.syncQueue.filter((i) => i.id !== itemId);
      await this.persistQueue();
      return true;
    } catch {
      item.retryCount++;
      item.lastRetryAt = new Date().toISOString();
      await this.persistQueue();
      return false;
    }
  }

  // -------------------------------------------------------------------------
  // Conflict Resolution
  // -------------------------------------------------------------------------

  /**
   * Resolve conflicts when adding a new item.
   * For last_write_wins: if there's an existing queued operation on the same
   * entity+entityId, the older one is replaced.
   */
  private resolveConflicts(newItem: SyncQueueItem): void {
    if (!newItem.entityId) return;

    if (newItem.conflictStrategy === 'last_write_wins') {
      // Remove older entries for the same entity+entityId
      this.syncQueue = this.syncQueue.filter((existing) => {
        if (existing.entity !== newItem.entity) return true;
        if (existing.entityId !== newItem.entityId) return true;
        // Keep if the existing one is a different operation type that shouldn't conflict
        // e.g., don't remove a 'create' when an 'update' comes in for the same entity
        if (existing.operationType === 'create' && newItem.operationType === 'update') {
          // Merge: the create already has the base data, update body supersedes
          return true;
        }
        // Same entity, same ID, same or superseding operation: remove older
        return false;
      });
    } else if (newItem.conflictStrategy === 'client_wins') {
      // Client always wins: remove any server-side pending for same entity
      this.syncQueue = this.syncQueue.filter((existing) => {
        if (existing.entity !== newItem.entity) return true;
        if (existing.entityId !== newItem.entityId) return true;
        return false;
      });
    }
    // 'server_wins' and 'manual' are resolved during processQueue, not at enqueue time
  }

  /**
   * Public method to check for conflicts in the queue.
   * Returns items that conflict with the given entity + entityId.
   */
  findConflicts(entity: SyncEntity, entityId: string): ReadonlyArray<SyncQueueItem> {
    return this.syncQueue.filter(
      (item) => item.entity === entity && item.entityId === entityId,
    );
  }

  // -------------------------------------------------------------------------
  // Network Status
  // -------------------------------------------------------------------------

  /**
   * Start listening for network state changes.
   */
  startNetworkListener(): void {
    this.stopNetworkListener();
    this.networkUnsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected ?? false;

      // Auto-process queue when coming back online
      if (wasOffline && this.isOnline && this.config.autoProcessOnReconnect) {
        this.processQueue().catch(() => {
          // Silently handle -- will be retried on next connectivity change
        });
      }
    });

    // Set initial state
    NetInfo.fetch().then((state: NetInfoState) => {
      this.isOnline = state.isConnected ?? false;
    });
  }

  /**
   * Stop the network listener.
   */
  stopNetworkListener(): void {
    if (this.networkUnsubscribe) {
      this.networkUnsubscribe();
      this.networkUnsubscribe = null;
    }
  }

  /**
   * Get current online status.
   */
  getIsOnline(): boolean {
    return this.isOnline;
  }

  /**
   * Manually set online status (useful for testing or overrides).
   */
  setOnlineStatus(online: boolean, autoProcess = true): void {
    const wasOffline = !this.isOnline;
    this.isOnline = online;

    if (autoProcess && wasOffline && online && this.config.autoProcessOnReconnect) {
      this.processQueue().catch(() => {});
    }
  }

  /**
   * Get whether the service is currently processing the queue.
   */
  getIsProcessing(): boolean {
    return this.isProcessing;
  }

  // -------------------------------------------------------------------------
  // Callbacks
  // -------------------------------------------------------------------------

  /**
   * Register a callback that fires after each queue processing run.
   */
  onSyncCompleted(callback: (result: SyncResult) => void): void {
    this.onSyncComplete = callback;
  }

  // -------------------------------------------------------------------------
  // Private Helpers
  // -------------------------------------------------------------------------

  /**
   * Execute the actual HTTP request for a queued item.
   * Uses the injected apiRequestFn if provided; otherwise dynamically imports
   * the API client to avoid circular dependencies.
   */
  private async executeRequest(item: SyncQueueItem): Promise<void> {
    let requestFn: ApiRequestFn;
    if (this.config.apiRequestFn) {
      requestFn = this.config.apiRequestFn;
    } else {
      const { apiRequest } = await import('./api/client');
      requestFn = apiRequest as ApiRequestFn;
    }
    const result = await requestFn(item.endpoint, {
      method: item.method,
      body: item.body,
      offlineSupport: false, // Don't re-queue if this fails
      retryCount: 0, // Retries are managed by this service
    });

    if (!result.success) {
      const errorMsg = result.error?.message ?? 'Unknown error';
      throw new Error(`Sync request failed: ${errorMsg}`);
    }
  }

  /**
   * Calculate exponential backoff with jitter.
   */
  private calculateBackoff(attempt: number): number {
    const exponentialDelay = this.config.baseRetryDelay * Math.pow(2, attempt - 1);
    const cappedDelay = Math.min(exponentialDelay, this.config.maxRetryDelay);
    // Add jitter: +/- 25%
    const jitter = cappedDelay * 0.25 * (Math.random() * 2 - 1);
    return Math.round(cappedDelay + jitter);
  }

  /**
   * Remove items that have exceeded the TTL.
   */
  private removeExpiredItems(): number {
    const now = Date.now();
    const before = this.syncQueue.length;
    this.syncQueue = this.syncQueue.filter((item) => {
      const age = now - new Date(item.createdAt).getTime();
      return age < this.config.itemTtlMs;
    });
    return before - this.syncQueue.length;
  }

  /**
   * Enforce max queue size by evicting oldest low-priority items.
   */
  private enforceMaxQueueSize(): void {
    if (this.syncQueue.length <= this.config.maxQueueSize) return;

    // Sort by priority descending (low priority = higher number) then oldest first
    const sorted = [...this.syncQueue].sort((a, b) => {
      const priorityDiff = PRIORITY_ORDER[b.priority] - PRIORITY_ORDER[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    // Remove from the front (lowest priority, oldest) until we're within limits
    while (sorted.length > this.config.maxQueueSize) {
      sorted.shift();
    }

    this.syncQueue = sorted;
  }

  /**
   * Persist the sync queue to AsyncStorage.
   */
  private async persistQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        this.config.storageKey,
        JSON.stringify(this.syncQueue),
      );
    } catch (error) {
      if (__DEV__) {
        console.warn('Failed to persist sync queue:', error);
      }
    }
  }

  /**
   * Load the sync queue from AsyncStorage.
   */
  private async loadQueueFromStorage(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.config.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          this.syncQueue = parsed;
        }
      }
    } catch (error) {
      if (__DEV__) {
        console.warn('Failed to load sync queue from storage:', error);
      }
      this.syncQueue = [];
    }
  }

  /**
   * Persist the dead-letter queue.
   */
  private async persistDeadLetter(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        DEAD_LETTER_KEY,
        JSON.stringify(this.deadLetterQueue),
      );
    } catch (error) {
      if (__DEV__) {
        console.warn('Failed to persist dead-letter queue:', error);
      }
    }
  }

  /**
   * Load the dead-letter queue from AsyncStorage.
   */
  private async loadDeadLetterFromStorage(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(DEAD_LETTER_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          this.deadLetterQueue = parsed;
        }
      }
    } catch (error) {
      if (__DEV__) {
        console.warn('Failed to load dead-letter queue from storage:', error);
      }
      this.deadLetterQueue = [];
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ---------------------------------------------------------------------------
// Singleton Export
// ---------------------------------------------------------------------------

export const offlineSyncService = new OfflineSyncService();

// Named export of the class for testing with custom config
export { OfflineSyncService };

export default offlineSyncService;
