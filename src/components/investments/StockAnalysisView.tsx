'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { LineChartComponent, ChartContainer } from '@/components/charts';
import type { ComprehensiveStockAnalysis } from '@/lib/investments/types/stock-analysis.types';

interface StockAnalysisViewProps {
  symbol: string;
}

type AnalysisTab = 'technical' | 'fundamental' | 'sentiment' | 'ai';

export default function StockAnalysisView({ symbol }: StockAnalysisViewProps) {
  const { user, loading: authLoading } = useAuth();
  const [analysis, setAnalysis] = useState<ComprehensiveStockAnalysis | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<AnalysisTab>('technical');

  const fetchAnalysis = useCallback(async () => {
    if (!user || !symbol) return;
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/investments/analyze/${symbol}`);
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to fetch analysis');
      }
      const result = await response.json();
      if (result.success) {
        setAnalysis(result.data);
      } else {
        throw new Error(result.error || 'Analysis failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analysis');
    } finally {
      setLoading(false);
    }
  }, [user, symbol]);

  useEffect(() => {
    if (!authLoading && user && symbol) {
      void fetchAnalysis();
    }
  }, [authLoading, user, symbol, fetchAnalysis]);

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(n);

  const formatPercent = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;

  const formatLargeNumber = (n: number) => {
    if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
    if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
    if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
    return formatCurrency(n);
  };

  if (loading) return <AnalysisSkeleton />;

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <h3 className="text-red-800 dark:text-red-200 font-medium">Error</h3>
        <p className="text-red-600 dark:text-red-400 mt-1">{error}</p>
        <button
          type="button"
          onClick={() => void fetchAnalysis()}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-lg shadow">
        <span className="text-6xl">📊</span>
        <h3 className="mt-4 text-xl font-semibold text-gray-900 dark:text-white">
          No Analysis Available
        </h3>
        <p className="mt-2 text-gray-500 dark:text-gray-400">
          Unable to retrieve analysis for {symbol}
        </p>
      </div>
    );
  }

  const { quote, recommendation } = analysis;
  const isPositive = quote.change >= 0;

  return (
    <div className="space-y-6">
      {/* Stock Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {quote.symbol}
              </h2>
              <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded">
                {quote.exchange}
              </span>
            </div>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {quote.name}
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(quote.price)}
            </p>
            <p
              className={`text-lg font-medium ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
            >
              {isPositive ? '▲' : '▼'} {formatCurrency(Math.abs(quote.change))}{' '}
              ({formatPercent(quote.changePercent)})
            </p>
          </div>
        </div>
        {/* Recommendation Badge */}
        <div className="mt-4 flex items-center gap-4">
          <RecommendationBadge
            action={recommendation.action}
            confidence={recommendation.confidence}
          />
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Target: {formatCurrency(recommendation.targetPrice)}
          </span>
        </div>
      </div>

      {/* Price Chart */}
      <ChartContainer title="Price History" className="h-[350px]">
        <LineChartComponent
          data={generateMockPriceData(quote.price, 30)}
          lines={[{ dataKey: 'price', name: 'Price', color: '#3B82F6' }]}
          height={280}
          currency
        />
      </ChartContainer>

      {/* Analysis Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex -mb-px">
            {(
              ['technical', 'fundamental', 'sentiment', 'ai'] as AnalysisTab[]
            ).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>
        <div className="p-6">
          {activeTab === 'technical' && <TechnicalTab analysis={analysis} />}
          {activeTab === 'fundamental' && (
            <FundamentalTab
              analysis={analysis}
              formatLargeNumber={formatLargeNumber}
            />
          )}
          {activeTab === 'sentiment' && <SentimentTab analysis={analysis} />}
          {activeTab === 'ai' && <AITab analysis={analysis} />}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function RecommendationBadge({
  action,
  confidence,
}: {
  action: string;
  confidence: number;
}) {
  const colors: Record<string, string> = {
    strong_buy: 'bg-green-600',
    buy: 'bg-green-500',
    hold: 'bg-yellow-500',
    sell: 'bg-red-500',
    strong_sell: 'bg-red-600',
  };
  const labels: Record<string, string> = {
    strong_buy: 'Strong Buy',
    buy: 'Buy',
    hold: 'Hold',
    sell: 'Sell',
    strong_sell: 'Strong Sell',
  };
  return (
    <span
      className={`px-3 py-1 text-white text-sm font-medium rounded ${colors[action] || 'bg-gray-500'}`}
    >
      {labels[action] || action} ({Math.round(confidence * 100)}%)
    </span>
  );
}

function TechnicalTab({ analysis }: { analysis: ComprehensiveStockAnalysis }) {
  const { technical } = analysis;
  const { indicators } = technical;

  const getRSIColor = (rsi: number) => {
    if (rsi >= 70) return 'text-red-600 dark:text-red-400';
    if (rsi <= 30) return 'text-green-600 dark:text-green-400';
    return 'text-gray-900 dark:text-white';
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* RSI */}
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <h4 className="text-sm text-gray-500 dark:text-gray-400">RSI (14)</h4>
          <p className={`text-2xl font-bold ${getRSIColor(indicators.rsi)}`}>
            {indicators.rsi.toFixed(2)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {indicators.rsi >= 70
              ? 'Overbought'
              : indicators.rsi <= 30
                ? 'Oversold'
                : 'Neutral'}
          </p>
        </div>
        {/* MACD */}
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <h4 className="text-sm text-gray-500 dark:text-gray-400">MACD</h4>
          <p
            className={`text-2xl font-bold ${indicators.macd.histogram >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
          >
            {indicators.macd.histogram.toFixed(4)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Signal: {indicators.macd.signal.toFixed(4)}
          </p>
        </div>
        {/* ADX */}
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <h4 className="text-sm text-gray-500 dark:text-gray-400">
            ADX (Trend Strength)
          </h4>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {indicators.adx.toFixed(2)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {indicators.adx >= 25 ? 'Strong Trend' : 'Weak Trend'}
          </p>
        </div>
      </div>
      {/* Moving Averages */}
      <div>
        <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
          Moving Averages
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            label="SMA 20"
            value={`$${indicators.sma20.toFixed(2)}`}
          />
          <MetricCard
            label="SMA 50"
            value={`$${indicators.sma50.toFixed(2)}`}
          />
          <MetricCard
            label="SMA 200"
            value={`$${indicators.sma200.toFixed(2)}`}
          />
          <MetricCard label="VWAP" value={`$${indicators.vwap.toFixed(2)}`} />
        </div>
      </div>
      {/* Bollinger Bands */}
      <div>
        <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
          Bollinger Bands
        </h4>
        <div className="grid grid-cols-3 gap-4">
          <MetricCard
            label="Upper"
            value={`$${indicators.bollingerBands.upper.toFixed(2)}`}
          />
          <MetricCard
            label="Middle"
            value={`$${indicators.bollingerBands.middle.toFixed(2)}`}
          />
          <MetricCard
            label="Lower"
            value={`$${indicators.bollingerBands.lower.toFixed(2)}`}
          />
        </div>
      </div>
      {/* Overall Signal */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <span className="text-gray-700 dark:text-gray-300">
            Technical Signal
          </span>
          <span className="font-bold text-blue-600 dark:text-blue-400">
            {technical.overallSignal.replace('_', ' ').toUpperCase()}
          </span>
        </div>
        <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Confidence: {(technical.confidence * 100).toFixed(1)}%
        </div>
      </div>
    </div>
  );
}

function FundamentalTab({
  analysis,
  formatLargeNumber,
}: {
  analysis: ComprehensiveStockAnalysis;
  formatLargeNumber: (n: number) => string;
}) {
  const { fundamental, quote } = analysis;

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Market Cap"
          value={formatLargeNumber(quote.marketCap)}
        />
        <MetricCard
          label="P/E Ratio"
          value={quote.peRatio?.toFixed(2) || 'N/A'}
        />
        <MetricCard
          label="EPS"
          value={quote.eps ? `$${quote.eps.toFixed(2)}` : 'N/A'}
        />
        <MetricCard
          label="52W Range"
          value={`$${quote.week52Low} - $${quote.week52High}`}
        />
      </div>
      {/* Valuation */}
      <div>
        <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
          Valuation Metrics
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            label="P/B Ratio"
            value={fundamental.valuation.priceToBook?.toFixed(2) || 'N/A'}
          />
          <MetricCard
            label="P/S Ratio"
            value={fundamental.valuation.priceToSales?.toFixed(2) || 'N/A'}
          />
          <MetricCard
            label="PEG Ratio"
            value={fundamental.valuation.pegRatio?.toFixed(2) || 'N/A'}
          />
          <MetricCard
            label="EV/EBITDA"
            value={fundamental.valuation.evToEbitda?.toFixed(2) || 'N/A'}
          />
        </div>
      </div>
      {/* Profitability */}
      <div>
        <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
          Profitability
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            label="Gross Margin"
            value={`${(fundamental.profitability.grossMargin * 100).toFixed(1)}%`}
          />
          <MetricCard
            label="Net Margin"
            value={`${(fundamental.profitability.netMargin * 100).toFixed(1)}%`}
          />
          <MetricCard
            label="ROE"
            value={`${(fundamental.profitability.roe * 100).toFixed(1)}%`}
          />
          <MetricCard
            label="ROA"
            value={`${(fundamental.profitability.roa * 100).toFixed(1)}%`}
          />
        </div>
      </div>
      {/* Dividend */}
      {quote.dividend !== null && (
        <div>
          <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
            Dividend
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <MetricCard
              label="Annual Dividend"
              value={`$${quote.dividend.toFixed(2)}`}
            />
            <MetricCard
              label="Dividend Yield"
              value={`${(quote.dividendYield || 0).toFixed(2)}%`}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function SentimentTab({ analysis }: { analysis: ComprehensiveStockAnalysis }) {
  const { sentiment } = analysis;

  // Normalize score from -100 to 100 range to 0 to 1 range
  const normalizeScore = (score: number) => (score + 100) / 200;

  const getSentimentColor = (score: number) => {
    const normalized = normalizeScore(score);
    if (normalized >= 0.6) return 'text-green-600 dark:text-green-400';
    if (normalized <= 0.4) return 'text-red-600 dark:text-red-400';
    return 'text-yellow-600 dark:text-yellow-400';
  };

  const getSentimentLabel = (score: number) => {
    const normalized = normalizeScore(score);
    if (normalized >= 0.7) return 'Very Bullish';
    if (normalized >= 0.6) return 'Bullish';
    if (normalized >= 0.5) return 'Neutral';
    if (normalized >= 0.4) return 'Bearish';
    return 'Very Bearish';
  };

  const totalAnalysts =
    sentiment.analystSentiment.ratingDistribution.strongBuy +
    sentiment.analystSentiment.ratingDistribution.buy +
    sentiment.analystSentiment.ratingDistribution.hold +
    sentiment.analystSentiment.ratingDistribution.sell +
    sentiment.analystSentiment.ratingDistribution.strongSell;

  return (
    <div className="space-y-6">
      {/* Overall Sentiment */}
      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
        <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Overall Sentiment
        </h4>
        <div className="flex items-center gap-4">
          <div className="text-4xl font-bold">
            <span
              className={getSentimentColor(sentiment.overallSentiment.score)}
            >
              {sentiment.overallSentiment.score.toFixed(0)}
            </span>
          </div>
          <div>
            <p
              className={`font-medium ${getSentimentColor(sentiment.overallSentiment.score)}`}
            >
              {sentiment.overallSentiment.label.replace('_', ' ').toUpperCase()}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Based on news, social media, and analyst data
            </p>
          </div>
        </div>
      </div>
      {/* Sentiment Sources */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <h5 className="text-sm text-gray-500 dark:text-gray-400">
            News Sentiment
          </h5>
          <p
            className={`text-xl font-bold ${getSentimentColor(sentiment.newsSentiment.score)}`}
          >
            {getSentimentLabel(sentiment.newsSentiment.score)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {sentiment.newsSentiment.articleCount} articles analyzed
          </p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <h5 className="text-sm text-gray-500 dark:text-gray-400">
            Social Sentiment
          </h5>
          <p
            className={`text-xl font-bold ${getSentimentColor(sentiment.socialSentiment.score)}`}
          >
            {getSentimentLabel(sentiment.socialSentiment.score)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {sentiment.socialSentiment.mentionCount.toLocaleString()} mentions
          </p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <h5 className="text-sm text-gray-500 dark:text-gray-400">
            Analyst Rating
          </h5>
          <p className="text-xl font-bold text-gray-900 dark:text-white">
            {sentiment.analystSentiment.consensusRating
              .replace('_', ' ')
              .toUpperCase()}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {sentiment.analystSentiment.numberOfAnalysts} analysts
          </p>
        </div>
      </div>
      {/* Analyst Breakdown */}
      <div>
        <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
          Analyst Recommendations
        </h4>
        <div className="flex gap-2">
          <AnalystBar
            label="Buy"
            count={
              sentiment.analystSentiment.ratingDistribution.strongBuy +
              sentiment.analystSentiment.ratingDistribution.buy
            }
            color="bg-green-500"
            total={totalAnalysts}
          />
          <AnalystBar
            label="Hold"
            count={sentiment.analystSentiment.ratingDistribution.hold}
            color="bg-yellow-500"
            total={totalAnalysts}
          />
          <AnalystBar
            label="Sell"
            count={
              sentiment.analystSentiment.ratingDistribution.sell +
              sentiment.analystSentiment.ratingDistribution.strongSell
            }
            color="bg-red-500"
            total={totalAnalysts}
          />
        </div>
      </div>
    </div>
  );
}

function AnalystBar({
  label,
  count,
  color,
  total,
}: {
  label: string;
  count: number;
  color: string;
  total: number;
}) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex-1">
      <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
        <span>{label}</span>
        <span>{count}</span>
      </div>
      <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function AITab({ analysis }: { analysis: ComprehensiveStockAnalysis }) {
  const { aiAnalysis, recommendation } = analysis;

  return (
    <div className="space-y-6">
      {/* AI Summary */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
        <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
          AI Analysis Summary
        </h4>
        <p className="text-gray-700 dark:text-gray-300">{aiAnalysis.summary}</p>
      </div>
      {/* Investment Thesis */}
      <div>
        <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
          Investment Thesis
        </h4>
        <p className="text-gray-600 dark:text-gray-400">
          {aiAnalysis.investmentThesis}
        </p>
      </div>
      {/* Bull/Bear Case */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 className="text-lg font-medium text-green-600 dark:text-green-400 mb-3">
            🐂 Bull Case
          </h4>
          <ul className="space-y-2">
            {aiAnalysis.bullCase.map((point, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-gray-600 dark:text-gray-400"
              >
                <span className="text-green-500 mt-1">✓</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="text-lg font-medium text-red-600 dark:text-red-400 mb-3">
            🐻 Bear Case
          </h4>
          <ul className="space-y-2">
            {aiAnalysis.bearCase.map((point, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-gray-600 dark:text-gray-400"
              >
                <span className="text-red-500 mt-1">✗</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      {/* Key Risks */}
      <div>
        <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
          Key Risks
        </h4>
        <ul className="space-y-2">
          {aiAnalysis.keyRisks.map((risk, i) => (
            <li
              key={i}
              className="flex items-start gap-2 text-gray-600 dark:text-gray-400"
            >
              <span className="text-yellow-500 mt-1">⚠</span>
              <span>{risk}</span>
            </li>
          ))}
        </ul>
      </div>
      {/* Recommendation Rationale */}
      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
        <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
          Recommendation Rationale
        </h4>
        <ul className="space-y-2">
          {recommendation.rationale.map((point, i) => (
            <li key={i} className="text-gray-600 dark:text-gray-400">
              • {point}
            </li>
          ))}
        </ul>
      </div>
      {/* Confidence */}
      <div className="text-sm text-gray-500 dark:text-gray-400">
        AI Confidence Score: {(aiAnalysis.confidenceScore * 100).toFixed(1)}% |
        Model: {aiAnalysis.analysisModel}
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-lg font-semibold text-gray-900 dark:text-white">
        {value}
      </p>
    </div>
  );
}

function generateMockPriceData(currentPrice: number, days: number) {
  const data = [];
  let price = currentPrice * (0.9 + Math.random() * 0.1);
  for (let i = days; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    price = price * (1 + (Math.random() - 0.48) * 0.03);
    data.push({
      label: date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      price: Math.round(price * 100) / 100,
    });
  }
  data[data.length - 1].price = currentPrice;
  return data;
}

function AnalysisSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 h-32" />
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 h-[350px]" />
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 h-[400px]" />
    </div>
  );
}
