"use client";

/**
 * Cryptocurrency Analysis Detail Page
 *
 * Phase 5.4.3: Comprehensive crypto analysis with on-chain metrics,
 * tokenomics, sentiment analysis, and price charts
 */

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  CryptoAnalysis,
  OnChainMetrics,
  DeFiMetrics,
  TokenomicsAnalysis,
  CryptoSentiment,
} from "@/lib/investments/types/crypto-analysis.types";
import { LineChartComponent } from "@/components/charts";

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function CryptoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const coinId = params.coinId as string;

  const [analysis, setAnalysis] = useState<CryptoAnalysis | null>(null);
  const [sentiment, setSentiment] = useState<CryptoSentiment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [priceTimeframe, setPriceTimeframe] = useState<
    "24h" | "7d" | "30d" | "1y"
  >("7d");

  // Fetch crypto analysis
  const fetchAnalysis = useCallback(async () => {
    if (!coinId) return;

    setLoading(true);
    try {
      const [analysisRes, sentimentRes] = await Promise.all([
        fetch(`/api/investments/crypto/${coinId}`),
        fetch(`/api/investments/crypto/${coinId}/sentiment`),
      ]);

      if (!analysisRes.ok || !sentimentRes.ok) {
        throw new Error("Failed to fetch crypto analysis");
      }

      const [analysisData, sentimentData] = await Promise.all([
        analysisRes.json(),
        sentimentRes.json(),
      ]);

      setAnalysis(analysisData.data);
      setSentiment(sentimentData.data);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load crypto analysis",
      );
    } finally {
      setLoading(false);
    }
  }, [coinId]);

  useEffect(() => {
    fetchAnalysis();
  }, [fetchAnalysis]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Loading State */}
        {loading && <LoadingState />}

        {/* Error State */}
        {error && <ErrorState message={error} onRetry={fetchAnalysis} />}

        {/* Analysis Content */}
        {!loading && !error && analysis && sentiment && (
          <div className="space-y-6">
            {/* Header */}
            <CryptoHeader analysis={analysis} />

            {/* Analysis Score Card */}
            <AnalysisScoreCard analysis={analysis} />

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* On-Chain Metrics */}
              {analysis.onChainMetrics && (
                <OnChainMetricsCard metrics={analysis.onChainMetrics} />
              )}

              {/* Tokenomics */}
              <TokenomicsCard tokenomics={analysis.tokenomics} />
            </div>

            {/* DeFi Metrics (if applicable) */}
            {analysis.defiMetrics && (
              <DeFiMetricsCard metrics={analysis.defiMetrics} />
            )}

            {/* Sentiment Gauge */}
            <SentimentGauge sentiment={sentiment} />

            {/* AI Insights */}
            <AIInsightsCard analysis={analysis} />
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// CRYPTO HEADER COMPONENT
// ============================================================================

interface CryptoHeaderProps {
  analysis: CryptoAnalysis;
}

function CryptoHeader({ analysis }: CryptoHeaderProps) {
  const getScoreColor = (score: number): string => {
    if (score >= 80)
      return "text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-300";
    if (score >= 60)
      return "text-blue-600 bg-blue-100 dark:bg-blue-900 dark:text-blue-300";
    if (score >= 40)
      return "text-yellow-600 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-300";
    return "text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-300";
  };

  const getGrade = (score: number): string => {
    if (score >= 90) return "A+";
    if (score >= 80) return "A";
    if (score >= 70) return "B+";
    if (score >= 60) return "B";
    if (score >= 50) return "C+";
    if (score >= 40) return "C";
    if (score >= 30) return "D";
    return "F";
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-4 mb-4">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {analysis.name}
            </h1>
            <span className="text-xl text-gray-500 dark:text-slate-400">
              {analysis.symbol.toUpperCase()}
            </span>
            <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium capitalize">
              {analysis.category.replace("_", " ")}
            </span>
          </div>

          {/* Recommendations */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300">
              AI Recommendations:
            </h3>
            {analysis.recommendations.slice(0, 3).map((rec, idx) => (
              <p
                key={idx}
                className="text-sm text-gray-600 dark:text-slate-400"
              >
                • {rec}
              </p>
            ))}
          </div>
        </div>

        {/* Overall Score */}
        <div className="text-center">
          <p className="text-sm text-gray-500 dark:text-slate-400 mb-2">
            Overall Grade
          </p>
          <div
            className={`px-6 py-3 rounded-lg ${getScoreColor(analysis.overallScore)}`}
          >
            <p className="text-4xl font-bold">
              {getGrade(analysis.overallScore)}
            </p>
          </div>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-2">
            Score: {analysis.overallScore.toFixed(0)}/100
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// ANALYSIS SCORE CARD COMPONENT
// ============================================================================

interface AnalysisScoreCardProps {
  analysis: CryptoAnalysis;
}

function AnalysisScoreCard({ analysis }: AnalysisScoreCardProps) {
  const getScoreColor = (score: number): string => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-blue-600";
    if (score >= 40) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
        Analysis Summary
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
          <p className="text-sm text-gray-500 dark:text-slate-400 mb-1">
            Overall Score
          </p>
          <p
            className={`text-3xl font-bold ${getScoreColor(analysis.overallScore)}`}
          >
            {analysis.overallScore.toFixed(0)}
          </p>
        </div>

        <div className="text-center p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
          <p className="text-sm text-gray-500 dark:text-slate-400 mb-1">
            Category
          </p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white capitalize">
            {analysis.category.replace("_", " ")}
          </p>
        </div>

        <div className="text-center p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
          <p className="text-sm text-gray-500 dark:text-slate-400 mb-1">
            Data Quality
          </p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {(analysis.metadata.dataQuality * 100).toFixed(0)}%
          </p>
        </div>

        <div className="text-center p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
          <p className="text-sm text-gray-500 dark:text-slate-400 mb-1">
            Last Updated
          </p>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            {new Date(analysis.metadata.lastUpdated).toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// ON-CHAIN METRICS COMPONENT
// ============================================================================

interface OnChainMetricsCardProps {
  metrics: OnChainMetrics;
}

function OnChainMetricsCard({ metrics }: OnChainMetricsCardProps) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
        On-Chain Metrics
      </h2>

      <div className="space-y-4">
        {/* Network Activity */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3">
            Network Activity
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">
                Active Addresses (24h)
              </p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {metrics.networkActivity.activeAddresses24h.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">
                New Addresses (24h)
              </p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {metrics.networkActivity.newAddresses24h.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">
                Address Growth Rate
              </p>
              <p
                className={`text-lg font-semibold ${
                  metrics.networkActivity.addressGrowthRate >= 0
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {metrics.networkActivity.addressGrowthRate.toFixed(2)}%
              </p>
            </div>
          </div>
        </div>

        {/* Transaction Metrics */}
        <div className="pt-4 border-t border-gray-200 dark:border-slate-700">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3">
            Transaction Metrics
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">
                Transactions (24h)
              </p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {metrics.transactionMetrics.transactionCount24h.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">
                Volume (24h)
              </p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                $
                {(
                  metrics.transactionMetrics.transactionVolume24h / 1e6
                ).toFixed(2)}
                M
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">
                Avg Transaction Value
              </p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                ${metrics.transactionMetrics.averageTransactionValue.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">
                Avg Fee
              </p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                ${metrics.transactionMetrics.averageFee.toFixed(4)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// TOKENOMICS CARD COMPONENT
// ============================================================================

interface TokenomicsCardProps {
  tokenomics: TokenomicsAnalysis;
}

function TokenomicsCard({ tokenomics }: TokenomicsCardProps) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
        Tokenomics
      </h2>

      <div className="space-y-4">
        {/* Supply Metrics */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3">
            Supply Metrics
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">
                Total Supply
              </p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {(tokenomics.supplyMechanics.totalSupply / 1e6).toFixed(2)}M
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">
                Circulating Supply
              </p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {(tokenomics.supplyMechanics.circulatingSupply / 1e6).toFixed(
                  2,
                )}
                M
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">
                Inflation Rate
              </p>
              <p
                className={`text-lg font-semibold ${
                  tokenomics.supplyMechanics.inflationRate < 5
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {tokenomics.supplyMechanics.inflationRate.toFixed(2)}%
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">
                Burn Rate
              </p>
              <p className="text-lg font-semibold text-green-600">
                {tokenomics.supplyMechanics.burnRate?.toFixed(2) ?? "0.00"}%
              </p>
            </div>
          </div>
        </div>

        {/* Distribution */}
        <div className="pt-4 border-t border-gray-200 dark:border-slate-700">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3">
            Token Distribution
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">
                Top 10 Holders
              </p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {tokenomics.distribution.top10HoldersPercentage.toFixed(2)}%
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">
                Top 100 Holders
              </p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {tokenomics.distribution.top100HoldersPercentage.toFixed(2)}%
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">
                Whale Concentration
              </p>
              <p
                className={`text-lg font-semibold ${
                  tokenomics.distribution.whaleConcentration > 50
                    ? "text-red-600"
                    : "text-green-600"
                }`}
              >
                {tokenomics.distribution.whaleConcentration.toFixed(2)}%
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">
                Gini Coefficient
              </p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {tokenomics.distribution.giniCoefficient?.toFixed(3) ?? "N/A"}
              </p>
            </div>
          </div>
        </div>

        {/* Vesting Schedule */}
        {tokenomics.vestingSchedule && (
          <div className="pt-4 border-t border-gray-200 dark:border-slate-700">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3">
              Vesting Schedule
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">
                  Total Vested
                </p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {tokenomics.vestingSchedule.totalVested.toFixed(2)}%
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">
                  Total Unlocked
                </p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {tokenomics.vestingSchedule.totalUnlocked.toFixed(2)}%
                </p>
              </div>
              {tokenomics.vestingSchedule.nextUnlockDate && (
                <>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">
                      Next Unlock Date
                    </p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {new Date(
                        tokenomics.vestingSchedule.nextUnlockDate,
                      ).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">
                      Next Unlock Amount
                    </p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {(
                        (tokenomics.vestingSchedule.nextUnlockAmount ?? 0) / 1e6
                      ).toFixed(2)}
                      M
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// DEFI METRICS CARD COMPONENT
// ============================================================================

interface DeFiMetricsCardProps {
  metrics: DeFiMetrics;
}

function DeFiMetricsCard({ metrics }: DeFiMetricsCardProps) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
        DeFi Metrics
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">
            Total Value Locked
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            ${(metrics.tvl.current / 1e9).toFixed(2)}B
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">
            TVL Change (24h)
          </p>
          <p
            className={`text-2xl font-bold ${
              metrics.tvl.change24h >= 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            {metrics.tvl.change24h >= 0 ? "+" : ""}
            {metrics.tvl.change24h.toFixed(2)}%
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">
            Protocol Revenue (24h)
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            ${((metrics.protocolRevenue?.revenue24h ?? 0) / 1e6).toFixed(2)}M
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">
            Avg APY
          </p>
          <p className="text-2xl font-bold text-green-600">
            {metrics.yieldFarming?.averageAPY?.toFixed(2) ?? "0.00"}%
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SENTIMENT GAUGE COMPONENT
// ============================================================================

interface SentimentGaugeProps {
  sentiment: CryptoSentiment;
}

function SentimentGauge({ sentiment }: SentimentGaugeProps) {
  const getSentimentColor = (score: number): string => {
    if (score >= 70) return "text-green-600";
    if (score >= 50) return "text-yellow-600";
    if (score >= 30) return "text-orange-600";
    return "text-red-600";
  };

  const getSentimentLabel = (score: number): string => {
    if (score >= 70) return "Extreme Greed";
    if (score >= 50) return "Greed";
    if (score >= 30) return "Fear";
    return "Extreme Fear";
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
        Market Sentiment
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Fear & Greed Index */}
        <div className="text-center">
          <p className="text-sm text-gray-500 dark:text-slate-400 mb-2">
            Fear & Greed Index
          </p>
          <p
            className={`text-5xl font-bold ${getSentimentColor(sentiment.fearGreedIndex.value)}`}
          >
            {sentiment.fearGreedIndex.value}
          </p>
          <p className="text-sm text-gray-600 dark:text-slate-400 mt-2">
            {sentiment.fearGreedIndex.classification}
          </p>
        </div>

        {/* Social Metrics */}
        <div>
          <p className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3">
            Social Metrics
          </p>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-slate-400">
                Twitter Mentions
              </span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {sentiment.socialMetrics.twitterMentions24h.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-slate-400">
                Reddit Subscribers
              </span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {sentiment.socialMetrics.redditSubscribers?.toLocaleString() ??
                  "N/A"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-slate-400">
                Reddit Active Users
              </span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {sentiment.socialMetrics.redditActiveUsers?.toLocaleString() ??
                  "N/A"}
              </span>
            </div>
          </div>
        </div>

        {/* News Sentiment */}
        <div>
          <p className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3">
            News Sentiment
          </p>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-slate-400">
                Positive
              </span>
              <span className="text-sm font-semibold text-green-600">
                {sentiment.newsSentiment.positiveNews}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-slate-400">
                Neutral
              </span>
              <span className="text-sm font-semibold text-gray-600 dark:text-slate-300">
                {sentiment.newsSentiment.neutralNews}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-slate-400">
                Negative
              </span>
              <span className="text-sm font-semibold text-red-600">
                {sentiment.newsSentiment.negativeNews}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// AI INSIGHTS CARD COMPONENT
// ============================================================================

interface AIInsightsCardProps {
  analysis: CryptoAnalysis;
}

function AIInsightsCard({ analysis }: AIInsightsCardProps) {
  const getRecommendationColor = (rec: string): string => {
    if (rec === "strong_buy" || rec === "buy")
      return "bg-green-100 text-green-800";
    if (rec === "hold") return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
        AI Insights & Recommendations
      </h2>

      <div className="space-y-4">
        {/* Overall Score */}
        <div className="flex items-center gap-4">
          <span
            className={`px-4 py-2 rounded-lg font-semibold ${
              analysis.overallScore >= 70
                ? "bg-green-100 text-green-700"
                : analysis.overallScore >= 50
                  ? "bg-blue-100 text-blue-700"
                  : analysis.overallScore >= 30
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-red-100 text-red-700"
            }`}
          >
            Score: {analysis.overallScore.toFixed(0)}/100
          </span>
          <span className="text-sm text-gray-600 dark:text-slate-400">
            Data Quality: {(analysis.metadata.dataQuality * 100).toFixed(0)}%
          </span>
        </div>

        {/* Recommendations */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3">
            AI Recommendations
          </h3>
          <ul className="space-y-2">
            {analysis.recommendations.map((rec, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span className="text-sm text-gray-700 dark:text-slate-300">
                  {rec}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// LOADING & ERROR STATES
// ============================================================================

function LoadingState() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-12">
      <div className="flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-gray-500 dark:text-slate-400">
          Loading crypto analysis...
        </p>
      </div>
    </div>
  );
}

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-12">
      <div className="flex flex-col items-center justify-center">
        <div className="text-red-500 text-5xl mb-4"></div>
        <p className="text-gray-900 dark:text-white font-semibold mb-2">
          Error Loading Analysis
        </p>
        <p className="text-gray-500 dark:text-slate-400 mb-4">{message}</p>
        <button
          onClick={onRetry}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
