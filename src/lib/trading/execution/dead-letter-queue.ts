/**
 * Dead-Letter Queue
 *
 * In-memory queue for failed reconciliation items and unroutable order
 * messages. Items are retried up to maxRetries; after exhaustion the
 * INC_DEAD_LETTER incident is emitted.
 */

import {
  INC_DEAD_LETTER,
  type CanonicalIncident,
} from "@/lib/trading/incidents/incident-codes";

// ============================================================================
// TYPES
// ============================================================================

export interface DeadLetterItem {
  id: string;
  orderId: string;
  reason: string;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  payload: Record<string, unknown>;
}

export interface DLQEvent {
  type: "ENQUEUED" | "RETRIED" | "EXHAUSTED";
  item: DeadLetterItem;
  incident: CanonicalIncident | null;
}

// ============================================================================
// DEAD LETTER QUEUE
// ============================================================================

export class DeadLetterQueue {
  private readonly items: Map<string, DeadLetterItem> = new Map();
  private readonly listeners: Array<(event: DLQEvent) => void> = [];
  private nextId = 1;

  /**
   * Subscribe to DLQ events.
   */
  onEvent(listener: (event: DLQEvent) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const idx = this.listeners.indexOf(listener);
      if (idx >= 0) this.listeners.splice(idx, 1);
    };
  }

  /**
   * Add a failed item to the queue.
   */
  enqueue(params: {
    orderId: string;
    reason: string;
    maxRetries?: number;
    payload?: Record<string, unknown>;
  }): DeadLetterItem {
    const item: DeadLetterItem = {
      id: `dlq-${this.nextId++}`,
      orderId: params.orderId,
      reason: params.reason,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: params.maxRetries ?? 3,
      payload: params.payload ?? {},
    };
    this.items.set(item.id, item);

    this.emit({ type: "ENQUEUED", item, incident: null });
    return item;
  }

  /**
   * Remove and return the oldest item, or undefined if empty.
   */
  dequeue(): DeadLetterItem | undefined {
    const first = this.items.values().next();
    if (first.done) return undefined;
    this.items.delete(first.value.id);
    return first.value;
  }

  /**
   * Returns all items in queue order.
   */
  getAll(): DeadLetterItem[] {
    return Array.from(this.items.values());
  }

  /**
   * Returns a single item by id, or undefined.
   */
  get(itemId: string): DeadLetterItem | undefined {
    return this.items.get(itemId);
  }

  /**
   * Returns the number of items in the queue.
   */
  size(): number {
    return this.items.size;
  }

  /**
   * Attempt to retry an item. Increments retryCount.
   *
   * Returns true if the item was marked for retry (caller should
   * actually re-process it). Returns false if the item has exhausted
   * retries, in which case INC_DEAD_LETTER is emitted.
   */
  retry(itemId: string): boolean {
    const item = this.items.get(itemId);
    if (!item) return false;

    item.retryCount += 1;

    if (item.retryCount > item.maxRetries) {
      this.emit({ type: "EXHAUSTED", item, incident: INC_DEAD_LETTER });
      return false;
    }

    this.emit({ type: "RETRIED", item, incident: null });
    return true;
  }

  /**
   * Remove an item from the queue (e.g. after successful retry).
   */
  remove(itemId: string): boolean {
    return this.items.delete(itemId);
  }

  /**
   * Remove all items.
   */
  clear(): void {
    this.items.clear();
  }

  // ==========================================================================
  // PRIVATE
  // ==========================================================================

  private emit(event: DLQEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }
}
