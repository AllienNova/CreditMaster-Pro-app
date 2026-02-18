'use client';

/**
 * Investment Research Page
 *
 * AI-powered stock and crypto research interface. Users can search for
 * any symbol and get comprehensive analysis including technical indicators,
 * fundamental metrics, sentiment analysis, and AI-generated insights.
 */

import { useState, useCallback, type ReactNode } from 'react';
import Link from 'next/link';
import type {
  ComprehensiveStockAnalysis,
  SignalType,
  RiskLevel,
  FundamentalRating,
} from '@/lib/investments/types/stock-analysis.types';

// ============================================================================
// TYPES
// ============================================================================

type ResearchTab = 'overview' | 'technical' | 'fundamental' | 'sentiment' | 'ai';

interface RecentSearch {
  symbol: string;
  name: string;
  timestamp: number;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

function formatLargeNumber(value: number): string {
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  return formatCurrency(value);
}

function getSignalColor(signal: SignalType): string {
  switch (signal) {
    case 'strong_buy':
      return 'text-green-700 bg-green-100 dark:text-green-300 dark:bg-green-900';
    case 'buy':
      return 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/50';
    case 'hold':
      return 'text-yellow-600 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-900/50';
    case 'sell':
      return 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/50';
    case 'strong_sell':
      return 'text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-900';
    default:
      return 'text-gray-600 bg-gray-50 dark:text-slate-400 dark:bg-slate-800';
  }
}

function getRiskColor(level: RiskLevel): string {
  switch (level) {
    case 'very_low':
      return 'text-green-700 dark:text-green-400';
    case 'low':
      return 'text-green-600 dark:text-green-400';
    case 'moderate':
      return 'text-yellow-600 dark:text-yellow-400';
    case 'high':
      return 'text-orange-600 dark:text-orange-400';
    case 'very_high':
      return 'text-red-600 dark:text-red-400';
    default:
      return 'text-gray-600 dark:text-slate-400';
  }
}

function getRatingColor(rating: FundamentalRating): string {
  switch (rating) {
    case 'excellent':
      return 'text-green-700 dark:text-green-400';
    case 'good':
      return 'text-green-600 dark:text-green-400';
    case 'fair':
      return 'text-yellow-600 dark:text-yellow-400';
    case 'poor':
      return 'text-orange-600 dark:text-orange-400';
    case 'very_poor':
      return 'text-red-600 dark:text-red-400';
    default:
      return 'text-gray-600 dark:text-slate-400';
  }
}

function getSentimentLabel(score: number): string {
  if (score >= 60) return 'Very Bullish';
  if (score >= 20) return 'Bullish';
  if (score >= -20) return 'Neutral';
  if (score >= -60) return 'Bearish';
  return 'Very Bearish';
}

function getSentimentColor(score: number): string {
  if (score >= 60) return 'text-green-700 dark:text-green-400';
  if (score >= 20) return 'text-green-600 dark:text-green-400';
  if (score >= -20) return 'text-yellow-600 dark:text-yellow-400';
  if (score >= -60) return 'text-orange-600 dark:text-orange-400';
  return 'text-red-600 dark:text-red-400';
}

// ============================================================================
// POPULAR SYMBOLS
// ============================================================================

const POPULAR_SYMBOLS = [
  { symbol: 'AAPL', name: 'Apple' },
  { symbol: 'MSFT', name: 'Microsoft' },
  { symbol: 'GOOGL', name: 'Alphabet' },
  { symbol: 'AMZN', name: 'Amazon' },
  { symbol: 'NVDA', name: 'NVIDIA' },
  { symbol: 'TSLA', name: 'Tesla' },
  { symbol: 'META', name: 'Meta' },
  { symbol: 'JPM', name: 'JPMorgan' },
];

const TAB_ITEMS: Array<{ id: ResearchTab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'technical', label: 'Technical' },
  { id: 'fundamental', label: 'Fundamental' },
  { id: 'sentiment', label: 'Sentiment' },
  { id: 'ai', label: 'AI Insights' },
];

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function ResearchPage() {
  const [searchInput, setSearchInput] = useState('');
  const [analysis, setAnalysis] = useState<ComprehensiveStockAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ResearchTab>('overview');
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem('investment-research-history');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const fetchAnalysis = useCallback(async (symbol: string) => {
    const normalizedSymbol = symbol.trim().toUpperCase();
    if (!normalizedSymbol) {
      setError('Please enter a stock symbol');
      return;
    }

    setLoading(true);
    setError(null);
    setActiveTab('overview');

    try {
      const response = await fetch(`/api/investments/analyze/${normalizedSymbol}`);

      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        throw new Error(
          errData?.error || `Failed to fetch analysis for ${normalizedSymbol}`
        );
      }

      const result = await response.json();

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Analysis returned no data');
      }

      setAnalysis(result.data);

      // Update recent searches
      const newSearch: RecentSearch = {
        symbol: normalizedSymbol,
        name: result.data.name || normalizedSymbol,
        timestamp: Date.now(),
      };

      setRecentSearches((prev) => {
        const filtered = prev.filter((s) => s.symbol !== normalizedSymbol);
        const updated = [newSearch, ...filtered].slice(0, 10);
        try {
          localStorage.setItem('investment-research-history', JSON.stringify(updated));
        } catch {
          // localStorage may be full or unavailable
        }
        return updated;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analysis');
      setAnalysis(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = () => {
    void fetchAnalysis(searchInput);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Investment Research
          </h1>
          <p className="mt-2 text-gray-600 dark:text-slate-400">
            AI-powered comprehensive stock and market analysis
          </p>
        </div>

        {/* Search Bar */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6 mb-6">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-slate-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value.toUpperCase())}
                onKeyDown={handleKeyDown}
                placeholder="Enter stock symbol (e.g., AAPL, MSFT, GOOGL)"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-lg"
                autoFocus
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={loading || !searchInput.trim()}
              className="px-8 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Analyzing...' : 'Analyze'}
            </button>
          </div>

          {/* Popular Symbols */}
          <div className="mt-4">
            <span className="text-sm text-gray-500 dark:text-slate-400 mr-3">
              Popular:
            </span>
            {POPULAR_SYMBOLS.map((item) => (
              <button
                key={item.symbol}
                onClick={() => {
                  setSearchInput(item.symbol);
                  void fetchAnalysis(item.symbol);
                }}
                disabled={loading}
                className="inline-flex items-center px-3 py-1.5 mr-2 mb-2 rounded-full text-sm font-medium bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 hover:bg-emerald-100 dark:hover:bg-emerald-900 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors disabled:opacity-50"
              >
                {item.symbol}
              </button>
            ))}
          </div>

          {/* Recent Searches */}
          {recentSearches.length > 0 && !analysis && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700">
              <span className="text-sm text-gray-500 dark:text-slate-400 mr-3">
                Recent:
              </span>
              {recentSearches.slice(0, 5).map((item) => (
                <button
                  key={item.symbol}
                  onClick={() => {
                    setSearchInput(item.symbol);
                    void fetchAnalysis(item.symbol);
                  }}
                  disabled={loading}
                  className="inline-flex items-center px-3 py-1.5 mr-2 mb-2 rounded-full text-sm font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors disabled:opacity-50"
                >
                  {item.symbol}
                  <span className="ml-1 text-xs text-blue-500 dark:text-blue-400">
                    {item.name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 mb-6">
            <div className="flex items-center gap-3">
              <svg
                className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <h3 className="text-red-800 dark:text-red-200 font-medium">
                  Analysis Error
                </h3>
                <p className="text-red-600 dark:text-red-400 text-sm mt-1">
                  {error}
                </p>
              </div>
            </div>
            <button
              onClick={handleSearch}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading && <ResearchLoadingSkeleton />}

        {/* Analysis Results */}
        {!loading && analysis && (
          <div className="space-y-6">
            {/* Stock Header Card */}
            <StockHeaderCard analysis={analysis} />

            {/* Tab Navigation */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm">
              <div className="border-b border-gray-200 dark:border-slate-700">
                <nav className="flex overflow-x-auto -mb-px">
                  {TAB_ITEMS.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex-shrink-0 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                        activeTab === tab.id
                          ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400'
                          : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:border-gray-300'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </nav>
              </div>

              <div className="p-6">
                {activeTab === 'overview' && <OverviewTab analysis={analysis} />}
                {activeTab === 'technical' && <TechnicalTab analysis={analysis} />}
                {activeTab === 'fundamental' && <FundamentalTab analysis={analysis} />}
                {activeTab === 'sentiment' && <SentimentTab analysis={analysis} />}
                {activeTab === 'ai' && <AIInsightsTab analysis={analysis} />}
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && !analysis && !error && (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-12 text-center">
            <svg
              className="w-16 h-16 mx-auto text-gray-300 dark:text-slate-600 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Search for a Stock
            </h3>
            <p className="text-gray-500 dark:text-slate-400 mb-6 max-w-md mx-auto">
              Enter a stock symbol above to get comprehensive AI-powered analysis
              including technical indicators, fundamental metrics, and sentiment data.
            </p>
            <Link
              href="/investments/watchlist"
              className="text-emerald-600 dark:text-emerald-400 hover:underline text-sm font-medium"
            >
              Or check your watchlist for ideas
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// STOCK HEADER CARD
// ============================================================================

function StockHeaderCard({ analysis }: { analysis: ComprehensiveStockAnalysis }) {
  const { quote, recommendation, riskAssessment } = analysis;
  const isPositive = quote.changePercent >= 0;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Symbol & Price */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center flex-shrink-0">
            <span className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
              {quote.symbol.slice(0, 2)}
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {quote.symbol}
              </h2>
              <span className="text-sm text-gray-500 dark:text-slate-400">
                {analysis.name}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-3xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(quote.price)}
              </span>
              <span
                className={`text-lg font-semibold ${
                  isPositive ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {formatPercent(quote.changePercent)}
              </span>
              <span
                className={`text-sm ${
                  isPositive ? 'text-green-600' : 'text-red-600'
                }`}
              >
                ({isPositive ? '+' : ''}
                {formatCurrency(quote.change)})
              </span>
            </div>
          </div>
        </div>

        {/* Key Badges */}
        <div className="flex flex-wrap gap-2">
          <span
            className={`px-4 py-2 rounded-full text-sm font-semibold ${getSignalColor(
              recommendation.action
            )}`}
          >
            {recommendation.action.replace('_', ' ').toUpperCase()}
          </span>
          <span
            className={`px-4 py-2 rounded-full text-sm font-semibold bg-gray-100 dark:bg-slate-700 ${getRiskColor(
              riskAssessment.overallRisk
            )}`}
          >
            Risk: {riskAssessment.overallRisk.replace('_', ' ')}
          </span>
          <span className="px-4 py-2 rounded-full text-sm font-semibold bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
            Confidence: {(recommendation.confidence * 100).toFixed(0)}%
          </span>
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4 mt-6 pt-6 border-t border-gray-200 dark:border-slate-700">
        <QuickStat label="Market Cap" value={formatLargeNumber(quote.marketCap)} />
        <QuickStat label="P/E Ratio" value={quote.peRatio?.toFixed(2) ?? 'N/A'} />
        <QuickStat label="Volume" value={new Intl.NumberFormat('en-US', { notation: 'compact' }).format(quote.volume)} />
        <QuickStat label="52w High" value={formatCurrency(quote.week52High)} />
        <QuickStat label="52w Low" value={formatCurrency(quote.week52Low)} />
        <QuickStat label="Target" value={formatCurrency(recommendation.targetPrice)} />
      </div>
    </div>
  );
}

function QuickStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">{label}</p>
      <p className="text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
    </div>
  );
}

// ============================================================================
// OVERVIEW TAB
// ============================================================================

function OverviewTab({ analysis }: { analysis: ComprehensiveStockAnalysis }) {
  const { recommendation, riskAssessment, aiAnalysis } = analysis;

  return (
    <div className="space-y-6">
      {/* Recommendation Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Recommendation
          </h3>
          <div className="space-y-3">
            {recommendation.rationale.map((reason, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <svg className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <p className="text-sm text-gray-700 dark:text-slate-300">{reason}</p>
              </div>
            ))}
          </div>

          {/* Key Metrics */}
          <div className="mt-6">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3">
              Key Metrics
            </h4>
            <div className="grid grid-cols-2 gap-3">
              {recommendation.keyMetrics.map((metric) => (
                <div
                  key={metric.name}
                  className="p-3 bg-gray-50 dark:bg-slate-700 rounded-lg"
                >
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    {metric.name}
                  </p>
                  <p
                    className={`text-sm font-semibold mt-1 ${
                      metric.interpretation === 'positive'
                        ? 'text-green-600'
                        : metric.interpretation === 'negative'
                        ? 'text-red-600'
                        : 'text-gray-900 dark:text-white'
                    }`}
                  >
                    {typeof metric.value === 'number'
                      ? metric.value.toFixed(2)
                      : metric.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Risk Assessment */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Risk Assessment
          </h3>
          <div className="space-y-4">
            <RiskBar label="Overall Risk" level={riskAssessment.overallRisk} />
            <RiskBar label="Volatility" level={riskAssessment.volatilityRisk} />
            <RiskBar label="Liquidity" level={riskAssessment.liquidityRisk} />
            <RiskBar label="Fundamental" level={riskAssessment.fundamentalRisk} />
            <RiskBar label="Market" level={riskAssessment.marketRisk} />
            <RiskBar label="Sector" level={riskAssessment.sectorRisk} />
          </div>

          <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-gray-200 dark:border-slate-700">
            <div>
              <p className="text-xs text-gray-500 dark:text-slate-400">Beta</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {riskAssessment.beta.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-slate-400">Sharpe Ratio</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {riskAssessment.sharpeRatio.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-slate-400">Max Drawdown</p>
              <p className="text-lg font-semibold text-red-600">
                {(riskAssessment.maxDrawdown * 100).toFixed(2)}%
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-slate-400">Value at Risk</p>
              <p className="text-lg font-semibold text-red-600">
                {(riskAssessment.valueAtRisk * 100).toFixed(2)}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Warnings */}
      {recommendation.warnings.length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
            Warnings
          </h4>
          <ul className="space-y-1">
            {recommendation.warnings.map((warning, idx) => (
              <li
                key={idx}
                className="text-sm text-yellow-700 dark:text-yellow-300 flex items-start gap-2"
              >
                <span className="flex-shrink-0">-</span>
                {warning}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* AI Summary */}
      <div className="bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-900/20 dark:to-blue-900/20 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
          AI Investment Thesis
        </h3>
        <p className="text-gray-700 dark:text-slate-300 leading-relaxed">
          {aiAnalysis.investmentThesis}
        </p>
      </div>
    </div>
  );
}

function RiskBar({ label, level }: { label: string; level: RiskLevel }) {
  const riskValues: Record<RiskLevel, number> = {
    very_low: 10,
    low: 30,
    moderate: 50,
    high: 70,
    very_high: 90,
  };

  const riskBarColors: Record<RiskLevel, string> = {
    very_low: 'bg-green-500',
    low: 'bg-green-400',
    moderate: 'bg-yellow-400',
    high: 'bg-orange-500',
    very_high: 'bg-red-500',
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-gray-600 dark:text-slate-400">{label}</span>
        <span className={`text-sm font-medium capitalize ${getRiskColor(level)}`}>
          {level.replace('_', ' ')}
        </span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-slate-600 rounded-full h-2">
        <div
          className={`h-2 rounded-full ${riskBarColors[level]}`}
          style={{ width: `${riskValues[level]}%` }}
        />
      </div>
    </div>
  );
}

// ============================================================================
// TECHNICAL TAB
// ============================================================================

function TechnicalTab({ analysis }: { analysis: ComprehensiveStockAnalysis }) {
  const { technical } = analysis;

  return (
    <div className="space-y-6">
      {/* Overall Signal */}
      <div className="flex items-center gap-4">
        <span
          className={`px-4 py-2 rounded-full text-sm font-semibold ${getSignalColor(
            technical.overallSignal
          )}`}
        >
          {technical.overallSignal.replace('_', ' ').toUpperCase()}
        </span>
        <span className="text-sm text-gray-500 dark:text-slate-400">
          Confidence: {(technical.confidence * 100).toFixed(0)}%
        </span>
      </div>

      {/* Trend Analysis */}
      <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Trend Analysis
        </h3>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <TrendBadge label="Short Term" direction={technical.trend.shortTerm} />
          <TrendBadge label="Medium Term" direction={technical.trend.mediumTerm} />
          <TrendBadge label="Long Term" direction={technical.trend.longTerm} />
        </div>
        <p className="text-sm text-gray-700 dark:text-slate-300">
          {technical.trend.description}
        </p>
      </div>

      {/* Indicators Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Moving Averages */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3 uppercase tracking-wider">
            Moving Averages
          </h4>
          <div className="bg-gray-50 dark:bg-slate-700 rounded-lg divide-y divide-gray-200 dark:divide-slate-600">
            <IndicatorRow label="SMA 20" value={technical.indicators.sma20.toFixed(2)} />
            <IndicatorRow label="SMA 50" value={technical.indicators.sma50.toFixed(2)} />
            <IndicatorRow label="SMA 200" value={technical.indicators.sma200.toFixed(2)} />
            <IndicatorRow label="EMA 12" value={technical.indicators.ema12.toFixed(2)} />
            <IndicatorRow label="EMA 26" value={technical.indicators.ema26.toFixed(2)} />
          </div>
        </div>

        {/* Momentum */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3 uppercase tracking-wider">
            Momentum & Volatility
          </h4>
          <div className="bg-gray-50 dark:bg-slate-700 rounded-lg divide-y divide-gray-200 dark:divide-slate-600">
            <IndicatorRow label="RSI (14)" value={technical.indicators.rsi.toFixed(2)} />
            <IndicatorRow
              label="MACD"
              value={technical.indicators.macd.macd.toFixed(4)}
            />
            <IndicatorRow
              label="MACD Signal"
              value={technical.indicators.macd.signal.toFixed(4)}
            />
            <IndicatorRow label="ATR" value={technical.indicators.atr.toFixed(2)} />
            <IndicatorRow label="ADX" value={technical.indicators.adx.toFixed(2)} />
          </div>
        </div>
      </div>

      {/* Support & Resistance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 className="text-sm font-semibold text-green-700 dark:text-green-400 mb-3 uppercase tracking-wider">
            Support Levels
          </h4>
          <div className="space-y-2">
            {technical.support.map((level, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg"
              >
                <span className="text-sm text-gray-600 dark:text-slate-400">
                  S{idx + 1}
                </span>
                <span className="text-sm font-semibold text-green-700 dark:text-green-400">
                  {formatCurrency(level)}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-red-700 dark:text-red-400 mb-3 uppercase tracking-wider">
            Resistance Levels
          </h4>
          <div className="space-y-2">
            {technical.resistance.map((level, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg"
              >
                <span className="text-sm text-gray-600 dark:text-slate-400">
                  R{idx + 1}
                </span>
                <span className="text-sm font-semibold text-red-700 dark:text-red-400">
                  {formatCurrency(level)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Signals List */}
      {technical.signals.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Technical Signals
          </h3>
          <div className="space-y-3">
            {technical.signals.map((signal, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700 rounded-lg"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {signal.indicator}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                    {signal.description}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${getSignalColor(
                      signal.signal
                    )}`}
                  >
                    {signal.signal.replace('_', ' ').toUpperCase()}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-slate-400 capitalize">
                    {signal.strength}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TrendBadge({
  label,
  direction,
}: {
  label: string;
  direction: 'bullish' | 'bearish' | 'neutral';
}) {
  const colors: Record<string, string> = {
    bullish: 'text-green-700 bg-green-100 dark:text-green-300 dark:bg-green-900',
    bearish: 'text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-900',
    neutral: 'text-yellow-700 bg-yellow-100 dark:text-yellow-300 dark:bg-yellow-900',
  };

  return (
    <div className="text-center">
      <p className="text-xs text-gray-500 dark:text-slate-400 mb-2">{label}</p>
      <span className={`px-3 py-1.5 rounded-full text-sm font-semibold capitalize ${colors[direction]}`}>
        {direction}
      </span>
    </div>
  );
}

function IndicatorRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-sm text-gray-600 dark:text-slate-400">{label}</span>
      <span className="text-sm font-semibold text-gray-900 dark:text-white">
        {value}
      </span>
    </div>
  );
}

// ============================================================================
// FUNDAMENTAL TAB
// ============================================================================

function FundamentalTab({ analysis }: { analysis: ComprehensiveStockAnalysis }) {
  const { fundamental } = analysis;

  return (
    <div className="space-y-6">
      {/* Overall Rating */}
      <div className="flex items-center gap-4">
        <span className={`text-2xl font-bold capitalize ${getRatingColor(fundamental.overallRating)}`}>
          {fundamental.overallRating.replace('_', ' ')}
        </span>
        <span className="text-sm text-gray-500 dark:text-slate-400">
          Fundamental Rating
        </span>
      </div>

      {/* Fair Value */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Fair Value Estimate
        </h3>
        <div className="flex items-center gap-6">
          <div>
            <p className="text-3xl font-bold text-blue-700 dark:text-blue-400">
              {formatCurrency(fundamental.fairValue.value)}
            </p>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
              Method: {fundamental.fairValue.method.replace('_', ' ')}
            </p>
          </div>
          <div>
            <p
              className={`text-xl font-semibold ${
                fundamental.fairValue.upside >= 0
                  ? 'text-green-600'
                  : 'text-red-600'
              }`}
            >
              {formatPercent(fundamental.fairValue.upside)} upside
            </p>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
              Confidence: {(fundamental.fairValue.confidence * 100).toFixed(0)}%
            </p>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Valuation */}
        <MetricSection title="Valuation">
          <MetricRow label="P/E Ratio" value={fundamental.valuation.peRatio?.toFixed(2) ?? 'N/A'} />
          <MetricRow label="Forward P/E" value={fundamental.valuation.forwardPE?.toFixed(2) ?? 'N/A'} />
          <MetricRow label="PEG Ratio" value={fundamental.valuation.pegRatio?.toFixed(2) ?? 'N/A'} />
          <MetricRow label="P/B Ratio" value={fundamental.valuation.priceToBook?.toFixed(2) ?? 'N/A'} />
          <MetricRow label="P/S Ratio" value={fundamental.valuation.priceToSales?.toFixed(2) ?? 'N/A'} />
          <MetricRow label="EV/EBITDA" value={fundamental.valuation.evToEbitda?.toFixed(2) ?? 'N/A'} />
        </MetricSection>

        {/* Profitability */}
        <MetricSection title="Profitability">
          <MetricRow label="Gross Margin" value={`${(fundamental.profitability.grossMargin * 100).toFixed(1)}%`} />
          <MetricRow label="Operating Margin" value={`${(fundamental.profitability.operatingMargin * 100).toFixed(1)}%`} />
          <MetricRow label="Net Margin" value={`${(fundamental.profitability.netMargin * 100).toFixed(1)}%`} />
          <MetricRow label="ROE" value={`${(fundamental.profitability.roe * 100).toFixed(1)}%`} />
          <MetricRow label="ROA" value={`${(fundamental.profitability.roa * 100).toFixed(1)}%`} />
          <MetricRow label="ROIC" value={`${(fundamental.profitability.roic * 100).toFixed(1)}%`} />
        </MetricSection>

        {/* Growth */}
        <MetricSection title="Growth">
          <MetricRow label="Revenue YoY" value={formatPercent(fundamental.growth.revenueGrowthYoY * 100)} />
          <MetricRow label="Revenue 3Y" value={formatPercent(fundamental.growth.revenueGrowth3Y * 100)} />
          <MetricRow label="EPS YoY" value={formatPercent(fundamental.growth.epsGrowthYoY * 100)} />
          <MetricRow label="EPS 3Y" value={formatPercent(fundamental.growth.epsGrowth3Y * 100)} />
          <MetricRow label="Earnings Est." value={formatPercent(fundamental.growth.earningsGrowthEstimate * 100)} />
        </MetricSection>
      </div>

      {/* Financial Health */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <MetricSection title="Financial Health">
          <MetricRow label="Current Ratio" value={fundamental.financial.currentRatio.toFixed(2)} />
          <MetricRow label="Quick Ratio" value={fundamental.financial.quickRatio.toFixed(2)} />
          <MetricRow label="Debt/Equity" value={fundamental.financial.debtToEquity.toFixed(2)} />
          <MetricRow label="Interest Coverage" value={fundamental.financial.interestCoverage.toFixed(2)} />
          <MetricRow label="FCF Yield" value={`${(fundamental.financial.freeCashFlowYield * 100).toFixed(1)}%`} />
        </MetricSection>

        {/* Dividend */}
        <MetricSection title="Dividend">
          <MetricRow label="Yield" value={`${(fundamental.dividend.dividendYield * 100).toFixed(2)}%`} />
          <MetricRow label="Payout Ratio" value={`${(fundamental.dividend.dividendPayoutRatio * 100).toFixed(1)}%`} />
          <MetricRow label="5Y Growth" value={formatPercent(fundamental.dividend.dividendGrowth5Y * 100)} />
          <MetricRow label="Consecutive Years" value={fundamental.dividend.yearsOfDividendGrowth.toString()} />
          <MetricRow label="Frequency" value={fundamental.dividend.dividendFrequency} />
        </MetricSection>
      </div>

      {/* Peer Comparison */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Peer Comparison
        </h3>
        <p className="text-sm text-gray-500 dark:text-slate-400 mb-2">
          Sector: {fundamental.comparison.sector} | Industry:{' '}
          {fundamental.comparison.industry} | Relative Valuation:{' '}
          <span className="capitalize font-medium">
            {fundamental.comparison.relativeValuation.replace('_', ' ')}
          </span>
        </p>
        {fundamental.comparison.peers.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-slate-700">
                  <th className="text-left py-3 px-4 text-gray-500 dark:text-slate-400 font-medium">
                    Symbol
                  </th>
                  <th className="text-left py-3 px-4 text-gray-500 dark:text-slate-400 font-medium">
                    Name
                  </th>
                  <th className="text-right py-3 px-4 text-gray-500 dark:text-slate-400 font-medium">
                    Market Cap
                  </th>
                  <th className="text-right py-3 px-4 text-gray-500 dark:text-slate-400 font-medium">
                    P/E
                  </th>
                  <th className="text-right py-3 px-4 text-gray-500 dark:text-slate-400 font-medium">
                    Div Yield
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                {fundamental.comparison.peers.map((peer) => (
                  <tr key={peer.symbol} className="hover:bg-gray-50 dark:hover:bg-slate-700">
                    <td className="py-3 px-4 font-semibold text-gray-900 dark:text-white">
                      {peer.symbol}
                    </td>
                    <td className="py-3 px-4 text-gray-600 dark:text-slate-400">
                      {peer.name}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-900 dark:text-white">
                      {formatLargeNumber(peer.marketCap)}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-900 dark:text-white">
                      {peer.peRatio?.toFixed(2) ?? 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-900 dark:text-white">
                      {peer.dividendYield !== null
                        ? `${(peer.dividendYield * 100).toFixed(2)}%`
                        : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function MetricSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3 uppercase tracking-wider">
        {title}
      </h4>
      <div className="bg-gray-50 dark:bg-slate-700 rounded-lg divide-y divide-gray-200 dark:divide-slate-600">
        {children}
      </div>
    </div>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-sm text-gray-600 dark:text-slate-400">{label}</span>
      <span className="text-sm font-semibold text-gray-900 dark:text-white">
        {value}
      </span>
    </div>
  );
}

// ============================================================================
// SENTIMENT TAB
// ============================================================================

function SentimentTab({ analysis }: { analysis: ComprehensiveStockAnalysis }) {
  const { sentiment } = analysis;

  return (
    <div className="space-y-6">
      {/* Overall Sentiment */}
      <div className="text-center p-6 bg-gray-50 dark:bg-slate-700 rounded-lg">
        <p className="text-sm text-gray-500 dark:text-slate-400 mb-2">
          Overall Sentiment
        </p>
        <p
          className={`text-4xl font-bold ${getSentimentColor(
            sentiment.overallSentiment.score
          )}`}
        >
          {getSentimentLabel(sentiment.overallSentiment.score)}
        </p>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-2">
          Score: {sentiment.overallSentiment.score} / 100 | Confidence:{' '}
          {(sentiment.overallSentiment.confidence * 100).toFixed(0)}%
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* News Sentiment */}
        <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            News Sentiment
          </h3>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {sentiment.newsSentiment.positiveCount}
              </p>
              <p className="text-xs text-gray-500 dark:text-slate-400">Positive</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-500 dark:text-slate-300">
                {sentiment.newsSentiment.neutralCount}
              </p>
              <p className="text-xs text-gray-500 dark:text-slate-400">Neutral</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">
                {sentiment.newsSentiment.negativeCount}
              </p>
              <p className="text-xs text-gray-500 dark:text-slate-400">Negative</p>
            </div>
          </div>
          {sentiment.newsSentiment.topHeadlines.length > 0 && (
            <div className="space-y-3 mt-4 pt-4 border-t border-gray-200 dark:border-slate-600">
              <h4 className="text-sm font-medium text-gray-700 dark:text-slate-300">
                Top Headlines
              </h4>
              {sentiment.newsSentiment.topHeadlines.slice(0, 5).map((headline, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2"
                >
                  <span
                    className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                      headline.sentiment === 'positive'
                        ? 'bg-green-500'
                        : headline.sentiment === 'negative'
                        ? 'bg-red-500'
                        : 'bg-gray-400'
                    }`}
                  />
                  <div>
                    <p className="text-sm text-gray-900 dark:text-white line-clamp-2">
                      {headline.title}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                      {headline.source}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Social & Analyst Sentiment */}
        <div className="space-y-6">
          {/* Social Sentiment */}
          <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Social Sentiment
            </h3>
            <div className="space-y-3">
              <SocialPlatformRow
                label="Twitter"
                bullish={sentiment.socialSentiment.platforms.twitter.bullishPercent}
              />
              <SocialPlatformRow
                label="Reddit"
                bullish={sentiment.socialSentiment.platforms.reddit.bullishPercent}
              />
              <SocialPlatformRow
                label="StockTwits"
                bullish={sentiment.socialSentiment.platforms.stocktwits.bullishPercent}
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-4">
              {sentiment.socialSentiment.mentionCount.toLocaleString()} mentions |
              Trending Score: {sentiment.socialSentiment.trendingScore.toFixed(0)}
            </p>
          </div>

          {/* Analyst Sentiment */}
          <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Analyst Consensus
            </h3>
            <div className="flex items-center gap-4 mb-4">
              <span
                className={`px-4 py-2 rounded-full text-sm font-semibold capitalize ${getSignalColor(
                  sentiment.analystSentiment.consensusRating
                )}`}
              >
                {sentiment.analystSentiment.consensusRating.replace('_', ' ')}
              </span>
              <span className="text-sm text-gray-500 dark:text-slate-400">
                {sentiment.analystSentiment.numberOfAnalysts} analysts
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  Target Price
                </p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {formatCurrency(sentiment.analystSentiment.targetPrice)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-slate-400">Range</p>
                <p className="text-sm text-gray-700 dark:text-slate-300">
                  {formatCurrency(sentiment.analystSentiment.targetPriceLow)} -{' '}
                  {formatCurrency(sentiment.analystSentiment.targetPriceHigh)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Insider & Institutional Activity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Insider Activity
          </h3>
          <span
            className={`inline-block px-3 py-1 rounded-full text-sm font-semibold capitalize mb-3 ${
              sentiment.insiderActivity.netActivity === 'buying'
                ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                : sentiment.insiderActivity.netActivity === 'selling'
                ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                : 'bg-gray-100 text-gray-700 dark:bg-slate-600 dark:text-slate-300'
            }`}
          >
            Net {sentiment.insiderActivity.netActivity}
          </span>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-gray-500 dark:text-slate-400">Buys</p>
              <p className="text-lg font-semibold text-green-600">
                {sentiment.insiderActivity.buyCount}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-slate-400">Sells</p>
              <p className="text-lg font-semibold text-red-600">
                {sentiment.insiderActivity.sellCount}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Institutional Activity
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-slate-400">
                Ownership
              </span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {(sentiment.institutionalActivity.institutionalOwnership * 100).toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-slate-400">
                New Positions
              </span>
              <span className="text-sm font-semibold text-green-600">
                {sentiment.institutionalActivity.newPositions}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-slate-400">
                Increased
              </span>
              <span className="text-sm font-semibold text-green-600">
                {sentiment.institutionalActivity.increasedPositions}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-slate-400">
                Decreased
              </span>
              <span className="text-sm font-semibold text-red-600">
                {sentiment.institutionalActivity.decreasedPositions}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SocialPlatformRow({
  label,
  bullish,
}: {
  label: string;
  bullish: number;
}) {
  const bearish = 100 - bullish;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-gray-600 dark:text-slate-400">{label}</span>
        <span className="text-sm text-gray-900 dark:text-white">
          {bullish.toFixed(0)}% bullish
        </span>
      </div>
      <div className="flex h-2 rounded-full overflow-hidden">
        <div
          className="bg-green-500"
          style={{ width: `${bullish}%` }}
        />
        <div
          className="bg-red-500"
          style={{ width: `${bearish}%` }}
        />
      </div>
    </div>
  );
}

// ============================================================================
// AI INSIGHTS TAB
// ============================================================================

function AIInsightsTab({ analysis }: { analysis: ComprehensiveStockAnalysis }) {
  const { aiAnalysis } = analysis;

  return (
    <div className="space-y-6">
      {/* AI Summary */}
      <div className="bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-900/20 dark:to-blue-900/20 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-3">
          <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            AI Summary
          </h3>
          <span className="text-xs text-gray-500 dark:text-slate-400 ml-auto">
            Model: {aiAnalysis.analysisModel} | Confidence:{' '}
            {(aiAnalysis.confidenceScore * 100).toFixed(0)}%
          </span>
        </div>
        <p className="text-gray-700 dark:text-slate-300 leading-relaxed">
          {aiAnalysis.summary}
        </p>
      </div>

      {/* Bull/Bear Case */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-4">
            Bull Case
          </h3>
          <ul className="space-y-3">
            {aiAnalysis.bullCase.map((point, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-sm text-green-700 dark:text-green-300">
                  {point}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-4">
            Bear Case
          </h3>
          <ul className="space-y-3">
            {aiAnalysis.bearCase.map((point, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M14.707 12.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-sm text-red-700 dark:text-red-300">
                  {point}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Price Targets */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Price Targets
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {aiAnalysis.priceTargets.map((target) => {
            const scenarioColors: Record<string, string> = {
              bull: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
              base: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
              bear: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
            };
            const priceColors: Record<string, string> = {
              bull: 'text-green-700 dark:text-green-400',
              base: 'text-blue-700 dark:text-blue-400',
              bear: 'text-red-700 dark:text-red-400',
            };

            return (
              <div
                key={target.scenario}
                className={`rounded-lg border p-4 ${scenarioColors[target.scenario]}`}
              >
                <p className="text-sm font-medium capitalize text-gray-600 dark:text-slate-400 mb-1">
                  {target.scenario} Case
                </p>
                <p className={`text-2xl font-bold ${priceColors[target.scenario]}`}>
                  {formatCurrency(target.price)}
                </p>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                  Probability: {(target.probability * 100).toFixed(0)}% |{' '}
                  {target.timeframe}
                </p>
                <p className="text-sm text-gray-600 dark:text-slate-400 mt-2">
                  {target.rationale}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Catalysts */}
      {aiAnalysis.catalysts.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Catalysts
          </h3>
          <div className="space-y-3">
            {aiAnalysis.catalysts.map((catalyst, idx) => (
              <div
                key={idx}
                className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-slate-700 rounded-lg"
              >
                <span
                  className={`px-2 py-1 rounded text-xs font-semibold capitalize ${
                    catalyst.direction === 'positive'
                      ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                      : catalyst.direction === 'negative'
                      ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                      : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                  }`}
                >
                  {catalyst.type}
                </span>
                <div className="flex-1">
                  <p className="text-sm text-gray-900 dark:text-white">
                    {catalyst.description}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                    Impact: {catalyst.potentialImpact} | Direction:{' '}
                    {catalyst.direction}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Key Risks */}
      {aiAnalysis.keyRisks.length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200 mb-3">
            Key Risks
          </h3>
          <ul className="space-y-2">
            {aiAnalysis.keyRisks.map((risk, idx) => (
              <li
                key={idx}
                className="text-sm text-yellow-700 dark:text-yellow-300 flex items-start gap-2"
              >
                <span className="flex-shrink-0">-</span>
                {risk}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Investment Thesis */}
      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
          Investment Thesis
        </h3>
        <p className="text-gray-700 dark:text-slate-300 leading-relaxed">
          {aiAnalysis.investmentThesis}
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// LOADING SKELETON
// ============================================================================

function ResearchLoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Card */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gray-200 dark:bg-slate-700" />
          <div>
            <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded w-32 mb-2" />
            <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-48" />
          </div>
        </div>
        <div className="grid grid-cols-6 gap-4 mt-6 pt-6 border-t border-gray-200 dark:border-slate-700">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i}>
              <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-16 mb-2" />
              <div className="h-5 bg-gray-200 dark:bg-slate-700 rounded w-20" />
            </div>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
        <div className="flex gap-6 mb-6 border-b border-gray-200 dark:border-slate-700 pb-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-20"
            />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 bg-gray-200 dark:bg-slate-700 rounded" />
            ))}
          </div>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 bg-gray-200 dark:bg-slate-700 rounded" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
