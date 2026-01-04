/**
 * Tests for useOnline Hook
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useOnline } from '../useOnline';

describe('useOnline', () => {
  let originalFetch: typeof global.fetch;

  beforeAll(() => {
    originalFetch = global.fetch;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Mock fetch
    global.fetch = jest.fn();

    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('should initialize with online status', () => {
    const { result } = renderHook(() => useOnline());

    expect(result.current.isOnline).toBe(true);
    expect(result.current.wasOffline).toBe(false);
    expect(result.current.lastOnlineAt).toBeInstanceOf(Date);
    expect(result.current.lastOfflineAt).toBe(null);
  });

  it('should initialize with offline status when navigator.onLine is false', () => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false,
    });

    const { result } = renderHook(() => useOnline());

    expect(result.current.isOnline).toBe(false);
    expect(result.current.wasOffline).toBe(true);
    expect(result.current.lastOnlineAt).toBe(null);
    expect(result.current.lastOfflineAt).toBeInstanceOf(Date);
  });

  it('should handle online event', async () => {
    // Mock successful health check
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true });

    const { result } = renderHook(() => useOnline());

    // Simulate going offline first
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false,
    });

    await act(async () => {
      window.dispatchEvent(new Event('offline'));
      await Promise.resolve(); // Allow state updates to flush
    });

    expect(result.current.isOnline).toBe(false);
    expect(result.current.wasOffline).toBe(true);

    // Simulate coming back online
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });

    await act(async () => {
      window.dispatchEvent(new Event('online'));
      await Promise.resolve(); // Allow state updates to flush
    });

    expect(result.current.isOnline).toBe(true);
    expect(result.current.lastOnlineAt).toBeInstanceOf(Date);
  });

  it('should handle offline event', async () => {
    const { result } = renderHook(() => useOnline());

    expect(result.current.isOnline).toBe(true);

    await act(async () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });
      window.dispatchEvent(new Event('offline'));
      await Promise.resolve(); // Allow state updates to flush
    });

    expect(result.current.isOnline).toBe(false);
    expect(result.current.wasOffline).toBe(true);
    expect(result.current.lastOfflineAt).toBeInstanceOf(Date);
  });

  it('should verify connectivity with checkConnection', async () => {
    const { result } = renderHook(() => useOnline());

    // Mock successful health check
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true });

    const isConnected = await result.current.checkConnection();

    expect(isConnected).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith('/api/health', {
      method: 'HEAD',
      cache: 'no-cache',
      signal: expect.any(AbortSignal),
    });
  });

  it('should return false when health check fails', async () => {
    const { result } = renderHook(() => useOnline());

    // Mock failed health check
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    const isConnected = await result.current.checkConnection();

    expect(isConnected).toBe(false);
  });

  it('should call checkConnection when online event fires', async () => {
    // Mock successful health check
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true });

    const { result } = renderHook(() => useOnline());

    const initialCallCount = (global.fetch as jest.Mock).mock.calls.length;

    await act(async () => {
      window.dispatchEvent(new Event('online'));
      await Promise.resolve(); // Allow state updates to flush
    });

    // Verify that checkConnection was called (fetch was invoked)
    expect((global.fetch as jest.Mock).mock.calls.length).toBeGreaterThan(initialCallCount);
  });

  it('should cleanup event listeners on unmount', () => {
    const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => useOnline());

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));
  });
});

