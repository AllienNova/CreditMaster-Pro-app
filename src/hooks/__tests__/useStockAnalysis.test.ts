/**
 * useStockAnalysis Hook Tests
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { useStockAnalysis } from '../useStockAnalysis';
import type {
  ComprehensiveStockAnalysis,
  TechnicalAnalysis,
} from '@/lib/investments/types/stock-analysis.types';

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

const mockTechnicalAnalysis: TechnicalAnalysis = {
  symbol: 'AAPL',
  timestamp: new Date(),
  indicators: {
    sma20: 150,
    sma50: 145,
    sma200: 140,
    ema12: 151,
    ema26: 148,
    rsi: 65,
    macd: {
      macd: 2.5,
      signal: 1.3,
      histogram: 1.2,
    },
    stochastic: { k: 70, d: 65 },
    bollingerBands: {
      upper: 160,
      middle: 150,
      lower: 140,
      bandwidth: 13.33,
    },
    atr: 5.2,
    obv: 1000000,
    vwap: 155,
    adx: 25,
    cci: 50,
  },
  support: [145, 140],
  resistance: [155, 160],
  trend: {
    shortTerm: 'bullish',
    mediumTerm: 'bullish',
    longTerm: 'bullish',
    strength: 0.75,
    description: 'Strong bullish trend across all timeframes',
  },
  signals: [],
  overallSignal: 'buy',
  confidence: 0.8,
};

const mockComprehensiveAnalysis: ComprehensiveStockAnalysis = {
  symbol: 'AAPL',
  name: 'Apple Inc.',
  timestamp: new Date(),
  quote: {} as any,
  technical: mockTechnicalAnalysis,
  fundamental: {} as any,
  sentiment: {} as any,
  aiAnalysis: {} as any,
  riskAssessment: {} as any,
  recommendation: {} as any,
};

describe('useStockAnalysis', () => {
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
      createMockResponse({ success: true, data: mockComprehensiveAnalysis })
    );
  });

  it('should fetch comprehensive analysis on mount', async () => {
    const { result } = renderHook(() => useStockAnalysis({ symbol: 'AAPL' }));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Dates are serialized to strings through JSON, compare key fields
    expect(result.current.analysis?.symbol).toBe(
      mockComprehensiveAnalysis.symbol
    );
    expect(result.current.analysis?.recommendation).toEqual(
      mockComprehensiveAnalysis.recommendation
    );
    expect(result.current.error).toBeNull();
  });

  it('should not fetch when disabled', async () => {
    const { result } = renderHook(() =>
      useStockAnalysis({ symbol: 'AAPL', enabled: false })
    );

    // Wait a bit to ensure no fetch is triggered
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should fetch technical analysis individually', async () => {
    mockFetch
      .mockResolvedValueOnce(
        createMockResponse({ success: true, data: mockComprehensiveAnalysis })
      )
      .mockResolvedValueOnce(
        createMockResponse({ success: true, data: mockTechnicalAnalysis })
      );

    const { result } = renderHook(() => useStockAnalysis({ symbol: 'AAPL' }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const technical = await result.current.getTechnical();

    // Dates are serialized to strings through JSON, compare key fields
    expect(technical?.symbol).toBe(mockTechnicalAnalysis.symbol);
    expect(technical?.indicators.rsi).toBe(
      mockTechnicalAnalysis.indicators.rsi
    );
    // Check the second call (first is comprehensive, second is technical)
    const technicalCall = mockFetch.mock.calls[1];
    const requestUrl =
      typeof technicalCall[0] === 'string'
        ? technicalCall[0]
        : technicalCall[0].url;
    expect(requestUrl).toBe('/api/investments/analyze/AAPL/technical');
  });

  it('should cache analysis data', async () => {
    // Mock both initial comprehensive analysis and technical analysis
    mockFetch
      .mockResolvedValueOnce(
        createMockResponse({ success: true, data: mockComprehensiveAnalysis })
      )
      .mockResolvedValueOnce(
        createMockResponse({ success: true, data: mockTechnicalAnalysis })
      );

    const { result } = renderHook(() =>
      useStockAnalysis({ symbol: 'AAPL', cacheTime: 60000 })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // First call should fetch
    await result.current.getTechnical();
    expect(mockFetch).toHaveBeenCalledTimes(2); // Initial + getTechnical

    // Second call should use cache
    await result.current.getTechnical();
    expect(mockFetch).toHaveBeenCalledTimes(2); // No additional call
  });

  it('should handle fetch errors', async () => {
    mockFetch.mockResolvedValueOnce(
      createMockResponse(
        { error: 'Analysis failed' },
        { ok: false, status: 500 }
      )
    );

    const { result } = renderHook(() => useStockAnalysis({ symbol: 'AAPL' }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Analysis failed');
    expect(result.current.analysis).toBeNull();
  });

  it('should refresh analysis data', async () => {
    const { result } = renderHook(() => useStockAnalysis({ symbol: 'AAPL' }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.refresh();
    });

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
