/**
 * useMarketData Hook Tests
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { useMarketData } from '../useMarketData';
import type { StockQuote } from '@/lib/investments/types/market-data.types';
import { MarketStatus } from '@/lib/investments/types/market-data.types';

// Mock useAuth hook
jest.mock('../useAuth', () => ({
  useAuth: jest.fn(),
}));

import { useAuth } from '../useAuth';
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// Mock fetch
const mockFetch = global.fetch as jest.Mock;

// Helper to create proper Response objects with clone() method
const createMockResponse = (
  data: any,
  options: { ok?: boolean; status?: number } = {}
) => {
  const responseBody = JSON.stringify(data);
  return new Response(responseBody, {
    status: options.status || (options.ok !== false ? 200 : 500),
    headers: { 'Content-Type': 'application/json' },
  });
};

const mockQuote: StockQuote = {
  symbol: 'AAPL',
  price: 160.5,
  change: 2.5,
  changePercent: 1.58,
  volume: 50000000,
  avgVolume: 45000000,
  marketCap: 2500000000000,
  high: 162,
  low: 158,
  open: 159,
  previousClose: 158,
  week52High: 180,
  week52Low: 120,
  timestamp: new Date(),
  marketStatus: MarketStatus.OPEN,
};

const mockHistoricalData = [
  {
    timestamp: Date.now() - 86400000,
    open: 158,
    high: 162,
    low: 157,
    close: 160,
    volume: 45000000,
  },
  {
    timestamp: Date.now(),
    open: 160,
    high: 163,
    low: 159,
    close: 161,
    volume: 50000000,
  },
];

describe('useMarketData', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    mockUseAuth.mockReturnValue({
      user: { id: 'test-user-id', email: 'test@example.com' } as any,
      loading: false,
      error: null,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
    });
    mockFetch.mockResolvedValue(
      createMockResponse({ success: true, data: mockQuote })
    );
  });

  it('should fetch quote data on mount', async () => {
    const { result } = renderHook(() => useMarketData({ symbol: 'AAPL' }));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Dates are serialized to strings through JSON, compare key fields
    expect(result.current.quote?.symbol).toBe(mockQuote.symbol);
    expect(result.current.quote?.price).toBe(mockQuote.price);
    expect(result.current.error).toBeNull();
    expect(mockFetch).toHaveBeenCalled();
    const fetchCall = mockFetch.mock.calls[0];
    const requestUrl =
      typeof fetchCall[0] === 'string' ? fetchCall[0] : fetchCall[0].url;
    expect(requestUrl).toBe('/api/investments/quote/AAPL');
  });

  it('should not fetch when disabled', async () => {
    const { result } = renderHook(() =>
      useMarketData({ symbol: 'AAPL', enabled: false })
    );

    // Wait a bit to ensure no fetch is triggered
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.current.quote).toBeNull();
    // Note: loading may still be true since the hook doesn't call fetch when disabled
  });

  it('should fetch historical data', async () => {
    mockFetch
      .mockResolvedValueOnce(
        createMockResponse({ success: true, data: mockQuote })
      )
      .mockResolvedValueOnce(
        createMockResponse({ success: true, data: mockHistoricalData })
      );

    const { result } = renderHook(() => useMarketData({ symbol: 'AAPL' }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.fetchHistorical('1D', 30);
    });

    expect(result.current.historicalData).toEqual(mockHistoricalData);
    // Check the second call (first is quote, second is historical)
    const historicalCall = mockFetch.mock.calls[1];
    const requestUrl =
      typeof historicalCall[0] === 'string'
        ? historicalCall[0]
        : historicalCall[0].url;
    expect(requestUrl).toBe(
      '/api/investments/historical/AAPL?interval=1D&limit=30'
    );
  });

  it('should handle fetch errors', async () => {
    mockFetch.mockResolvedValueOnce(
      createMockResponse(
        { error: 'Failed to fetch quote' },
        { ok: false, status: 500 }
      )
    );

    const { result } = renderHook(() => useMarketData({ symbol: 'AAPL' }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to fetch quote');
    expect(result.current.quote).toBeNull();
  });

  it('should refresh quote data', async () => {
    const { result } = renderHook(() => useMarketData({ symbol: 'AAPL' }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.refresh();
    });

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('should handle network errors', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useMarketData({ symbol: 'AAPL' }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Network error');
  });

  it('should cancel pending requests on unmount', async () => {
    const abortSpy = jest.spyOn(AbortController.prototype, 'abort');

    const { unmount } = renderHook(() => useMarketData({ symbol: 'AAPL' }));

    unmount();

    expect(abortSpy).toHaveBeenCalled();
  });
});
