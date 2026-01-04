/**
 * OfflineQueue Tests
 */

import { OfflineQueue, QueuedAction } from '../OfflineQueue';

describe('OfflineQueue', () => {
  let queue: OfflineQueue;

  beforeEach(() => {
    // Clear localStorage
    localStorage.clear();
    
    // Create new queue instance
    queue = new OfflineQueue({ storageKey: 'test-queue' });
    
    // Mock fetch
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('add', () => {
    it('should add action to queue', () => {
      const actionId = queue.add({
        type: 'analysis',
        endpoint: '/api/test',
        method: 'POST',
        data: { test: 'data' },
        maxRetries: 3,
      });

      expect(actionId).toBeDefined();
      expect(queue.getQueue()).toHaveLength(1);
      expect(queue.getPendingCount()).toBe(1);
    });

    it('should generate unique IDs for each action', () => {
      const id1 = queue.add({
        type: 'analysis',
        endpoint: '/api/test1',
        method: 'POST',
        maxRetries: 3,
      });

      const id2 = queue.add({
        type: 'analysis',
        endpoint: '/api/test2',
        method: 'POST',
        maxRetries: 3,
      });

      expect(id1).not.toBe(id2);
    });

    it('should throw error when queue is full', () => {
      const smallQueue = new OfflineQueue({ maxQueueSize: 2 });

      smallQueue.add({ type: 'analysis', endpoint: '/api/1', method: 'POST', maxRetries: 3 });
      smallQueue.add({ type: 'analysis', endpoint: '/api/2', method: 'POST', maxRetries: 3 });

      expect(() => {
        smallQueue.add({ type: 'analysis', endpoint: '/api/3', method: 'POST', maxRetries: 3 });
      }).toThrow('Queue is full');
    });
  });

  describe('processQueue', () => {
    it('should process pending actions successfully', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      queue.add({
        type: 'analysis',
        endpoint: '/api/test',
        method: 'POST',
        data: { test: 'data' },
        maxRetries: 3,
      });

      await queue.processQueue();

      const actions = queue.getQueue();
      expect(actions[0].status).toBe('completed');
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ test: 'data' }),
        })
      );
    });

    it('should retry failed actions', async () => {
      (global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        });

      queue.add({
        type: 'analysis',
        endpoint: '/api/test',
        method: 'POST',
        maxRetries: 3,
      });

      await queue.processQueue();

      const actions = queue.getQueue();
      expect(actions[0].retryCount).toBe(1);
      expect(actions[0].status).toBe('pending');
    });

    it('should mark action as failed after max retries', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      queue.add({
        type: 'analysis',
        endpoint: '/api/test',
        method: 'POST',
        maxRetries: 2,
      });

      // Process multiple times to exceed max retries
      await queue.processQueue();
      await queue.processQueue();

      const actions = queue.getQueue();
      expect(actions[0].status).toBe('failed');
      expect(actions[0].retryCount).toBe(2);
    });
  });

  describe('clearCompleted', () => {
    it('should remove completed and failed actions', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      queue.add({ type: 'analysis', endpoint: '/api/1', method: 'POST', maxRetries: 3 });
      queue.add({ type: 'analysis', endpoint: '/api/2', method: 'POST', maxRetries: 3 });

      await queue.processQueue();

      expect(queue.getQueue()).toHaveLength(2);

      queue.clearCompleted();

      expect(queue.getQueue()).toHaveLength(0);
    });
  });

  describe('subscribe', () => {
    it('should notify listeners on queue changes', () => {
      const listener = jest.fn();
      queue.subscribe(listener);

      queue.add({ type: 'analysis', endpoint: '/api/test', method: 'POST', maxRetries: 3 });

      expect(listener).toHaveBeenCalledWith(expect.arrayContaining([
        expect.objectContaining({ endpoint: '/api/test' }),
      ]));
    });

    it('should allow unsubscribing', () => {
      const listener = jest.fn();
      const unsubscribe = queue.subscribe(listener);

      unsubscribe();

      queue.add({ type: 'analysis', endpoint: '/api/test', method: 'POST', maxRetries: 3 });

      expect(listener).not.toHaveBeenCalled();
    });
  });
});

