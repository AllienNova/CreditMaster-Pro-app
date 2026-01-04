/**
 * Offline Queue System
 * 
 * Manages queued actions when offline and syncs them when connection is restored
 */

'use client';

export interface QueuedAction {
  id: string;
  type: 'analysis' | 'preference' | 'portfolio' | 'alert';
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  data?: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  status: 'pending' | 'processing' | 'failed' | 'completed';
  error?: string;
}

export interface OfflineQueueOptions {
  maxQueueSize?: number;
  maxRetries?: number;
  retryDelay?: number;
  storageKey?: string;
}

const DEFAULT_OPTIONS: Required<OfflineQueueOptions> = {
  maxQueueSize: 100,
  maxRetries: 3,
  retryDelay: 1000,
  storageKey: 'offline-action-queue',
};

export class OfflineQueue {
  private queue: QueuedAction[] = [];
  private options: Required<OfflineQueueOptions>;
  private isProcessing = false;
  private listeners: Set<(queue: QueuedAction[]) => void> = new Set();

  constructor(options: OfflineQueueOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.loadQueue();
  }

  /**
   * Add an action to the queue
   */
  add(action: Omit<QueuedAction, 'id' | 'timestamp' | 'retryCount' | 'status'>): string {
    const queuedAction: QueuedAction = {
      ...action,
      id: this.generateId(),
      timestamp: Date.now(),
      retryCount: 0,
      status: 'pending',
    };

    // Check queue size limit
    if (this.queue.length >= this.options.maxQueueSize) {
      // Remove oldest completed or failed action
      const indexToRemove = this.queue.findIndex(
        (a) => a.status === 'completed' || a.status === 'failed'
      );
      if (indexToRemove !== -1) {
        this.queue.splice(indexToRemove, 1);
      } else {
        throw new Error('Queue is full');
      }
    }

    this.queue.push(queuedAction);
    this.saveQueue();
    this.notifyListeners();

    return queuedAction.id;
  }

  /**
   * Process all pending actions in the queue
   */
  async processQueue(): Promise<void> {
    if (this.isProcessing) return;

    this.isProcessing = true;

    const pendingActions = this.queue.filter((a) => a.status === 'pending');

    for (const action of pendingActions) {
      try {
        action.status = 'processing';
        this.notifyListeners();

        const response = await fetch(action.endpoint, {
          method: action.method,
          headers: action.data ? { 'Content-Type': 'application/json' } : {},
          body: action.data ? JSON.stringify(action.data) : undefined,
        });

        if (response.ok) {
          action.status = 'completed';
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (error) {
        action.retryCount++;
        action.error = error instanceof Error ? error.message : 'Unknown error';

        if (action.retryCount >= action.maxRetries) {
          action.status = 'failed';
        } else {
          action.status = 'pending';
          // Wait before retrying
          await new Promise((resolve) => setTimeout(resolve, this.options.retryDelay));
        }
      }

      this.saveQueue();
      this.notifyListeners();
    }

    this.isProcessing = false;
  }

  /**
   * Get all actions in the queue
   */
  getQueue(): QueuedAction[] {
    return [...this.queue];
  }

  /**
   * Get pending actions count
   */
  getPendingCount(): number {
    return this.queue.filter((a) => a.status === 'pending').length;
  }

  /**
   * Clear completed and failed actions
   */
  clearCompleted(): void {
    this.queue = this.queue.filter((a) => a.status === 'pending' || a.status === 'processing');
    this.saveQueue();
    this.notifyListeners();
  }

  /**
   * Subscribe to queue changes
   */
  subscribe(listener: (queue: QueuedAction[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private loadQueue(): void {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(this.options.storageKey);
      if (stored) {
        this.queue = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load offline queue:', error);
    }
  }

  private saveQueue(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(this.options.storageKey, JSON.stringify(this.queue));
    } catch (error) {
      console.error('Failed to save offline queue:', error);
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener(this.getQueue()));
  }
}

// Singleton instance
let offlineQueueInstance: OfflineQueue | null = null;

export function getOfflineQueue(): OfflineQueue {
  if (!offlineQueueInstance) {
    offlineQueueInstance = new OfflineQueue();
  }
  return offlineQueueInstance;
}

