'use client';

/**
 * Comprehensive Analysis Panel
 *
 * Displays unified analysis from all 6 investment analysis services:
 * - Technical Analysis
 * - Fundamental Analysis
 * - Sentiment Analysis
 * - Pattern Recognition
 * - AI Recommendations
 * - Portfolio Analysis
 */

import React, { useState, useCallback } from 'react';

// ============================================================================
// TYPES
// ============================================================================

interface ComprehensiveAnalysisPanelProps {
  symbol?: string;
  className?: string;
}

interface AnalysisResult {
  symbol: string;
  analyzedAt: string;
  currentPrice: number;
  overallSignal: 'strong_buy' | 'buy' | 'neutral' | 'sell' | 'strong_sell';
  overallConfidence: number;
  riskLevel: 'low' | 'moderate' | 'high' | 'very_high';
  compositeScore: {
    overall: number;
    technical: number;
    fundamental: number;
    sentiment: number;
    pattern: number;
    confidence: number;
    signal: string;
  };
  correlationAnalysis: {
    overallAlignment: number;
    alignmentLevel: 'strong' | 'moderate' | 'weak' | 'conflicting';
  };
  keyInsights: string[];
  risks: string[];
  opportunities: string[];
  summary: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ComprehensiveAnalysisPanel({
  symbol: initialSymbol = 'AAPL',
  className = '',
}: ComprehensiveAnalysisPanelProps) {
  const [symbol, setSymbol] = useState(initialSymbol);
  const [timeframe, setTimeframe] = useState<string>('1d');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);

  // Fetch comprehensive analysis
  const fetchAnalysis = useCallback(async () => {
    if (!symbol) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/investments/comprehensive-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          symbol: symbol.toUpperCase(),
          timeframe,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch analysis');
      }

      setAnalysis(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch analysis');
    } finally {
      setLoading(false);
    }
  }, [symbol, timeframe]);

  const handleAnalyze = () => {
    fetchAnalysis();
  };

  return (
    <div className={`bg-gray-900 rounded-lg border border-gray-800 ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-800">
        <h2 className="text-2xl font-bold text-white mb-4">
          🎯 Comprehensive Investment Analysis
        </h2>
        <p className="text-gray-400 mb-6">
          Unified analysis combining Technical, Fundamental, Sentiment, Pattern Recognition, AI
          Recommendations, and Portfolio Analysis
        </p>

        {/* Input Controls */}
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Stock Symbol
            </label>
            <input
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              placeholder="Enter symbol (e.g., AAPL)"
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="w-48">
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Timeframe
            </label>
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="1m">1 Minute</option>
              <option value="5m">5 Minutes</option>
              <option value="15m">15 Minutes</option>
              <option value="1h">1 Hour</option>
              <option value="1d">1 Day</option>
              <option value="1w">1 Week</option>
            </select>
          </div>


          <div className="flex items-end">
            <button
              onClick={handleAnalyze}
              disabled={loading || !symbol}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
            >
              {loading ? '🔄 Analyzing...' : '🚀 Analyze'}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-800 rounded-lg">
            <p className="text-red-400">❌ {error}</p>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-400">Analyzing {symbol}...</p>
              <p className="text-sm text-gray-500 mt-2">
                Running comprehensive analysis across all 6 services
              </p>
            </div>
          </div>
        )}

        {!loading && !error && !analysis && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📊</div>
            <p className="text-gray-400 text-lg">Enter a symbol and click Analyze</p>
            <p className="text-sm text-gray-500 mt-2">
              Get comprehensive insights from technical, fundamental, sentiment, and AI analysis
            </p>
          </div>
        )}

        {!loading && analysis && (
          <div className="space-y-6">
            {/* Overall Signal Card */}
            <OverallSignalCard analysis={analysis} />

            {/* Composite Score Grid */}
            <CompositeScoreGrid analysis={analysis} />

            {/* Correlation Analysis */}
            <CorrelationCard analysis={analysis} />

            {/* Insights, Risks, Opportunities */}
            <InsightsGrid analysis={analysis} />

            {/* Summary */}
            <SummaryCard analysis={analysis} />
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function OverallSignalCard({ analysis }: { analysis: AnalysisResult }) {
  const signalConfig = {
    strong_buy: { label: 'STRONG BUY', color: 'bg-green-600', icon: '🚀' },
    buy: { label: 'BUY', color: 'bg-green-500', icon: '📈' },
    neutral: { label: 'NEUTRAL', color: 'bg-gray-600', icon: '➡️' },
    sell: { label: 'SELL', color: 'bg-red-500', icon: '📉' },
    strong_sell: { label: 'STRONG SELL', color: 'bg-red-600', icon: '⚠️' },
  };

  const config = signalConfig[analysis.overallSignal];

  const riskConfig = {
    low: { label: 'Low Risk', color: 'text-green-400', icon: '✅' },
    moderate: { label: 'Moderate Risk', color: 'text-yellow-400', icon: '⚡' },
    high: { label: 'High Risk', color: 'text-orange-400', icon: '⚠️' },
    very_high: { label: 'Very High Risk', color: 'text-red-400', icon: '🔥' },
  };

  const risk = riskConfig[analysis.riskLevel];

  return (
    <div className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 rounded-lg p-6 border border-blue-800/50">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white mb-2">
            {analysis.symbol} - ${analysis.currentPrice.toFixed(2)}
          </h3>
          <div className="flex items-center gap-4">
            <div className={`px-4 py-2 ${config.color} rounded-lg font-bold text-white text-lg`}>
              {config.icon} {config.label}
            </div>
            <div className="text-gray-300">
              <span className="text-sm">Confidence: </span>
              <span className="font-semibold">{(analysis.overallConfidence * 100).toFixed(1)}%</span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className={`${risk.color} font-semibold mb-1`}>
            {risk.icon} {risk.label}
          </div>
          <div className="text-sm text-gray-400">
            Analyzed: {new Date(analysis.analyzedAt).toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
}

function CompositeScoreGrid({ analysis }: { analysis: AnalysisResult }) {
  const scores = [
    { label: 'Overall', value: analysis.compositeScore.overall, icon: '🎯' },
    { label: 'Technical', value: analysis.compositeScore.technical, icon: '📊' },
    { label: 'Fundamental', value: analysis.compositeScore.fundamental, icon: '💼' },
    { label: 'Sentiment', value: analysis.compositeScore.sentiment, icon: '💭' },
    { label: 'Pattern', value: analysis.compositeScore.pattern, icon: '🔍' },
  ];

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-400';
    if (score >= 50) return 'text-yellow-400';
    if (score >= 30) return 'text-orange-400';
    return 'text-red-400';
  };

  const getScoreBarColor = (score: number) => {
    if (score >= 70) return 'bg-green-500';
    if (score >= 50) return 'bg-yellow-500';
    if (score >= 30) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
      <h3 className="text-lg font-semibold text-white mb-4">📈 Composite Scores</h3>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {scores.map((score) => (
          <div key={score.label} className="bg-gray-900/50 rounded-lg p-4">
            <div className="text-center mb-2">
              <div className="text-2xl mb-1">{score.icon}</div>
              <div className="text-sm text-gray-400">{score.label}</div>
            </div>
            <div className={`text-3xl font-bold text-center ${getScoreColor(score.value)}`}>
              {score.value.toFixed(0)}
            </div>
            <div className="mt-2 bg-gray-700 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full ${getScoreBarColor(score.value)} transition-all duration-500`}
                style={{ width: `${score.value}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


function CorrelationCard({ analysis }: { analysis: AnalysisResult }) {
  const alignmentConfig = {
    strong: { label: 'Strong Alignment', color: 'text-green-400', icon: '✅' },
    moderate: { label: 'Moderate Alignment', color: 'text-yellow-400', icon: '⚡' },
    weak: { label: 'Weak Alignment', color: 'text-orange-400', icon: '⚠️' },
    conflicting: { label: 'Conflicting Signals', color: 'text-red-400', icon: '❌' },
  };

  const config = alignmentConfig[analysis.correlationAnalysis.alignmentLevel];

  return (
    <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
      <h3 className="text-lg font-semibold text-white mb-4">🔗 Correlation Analysis</h3>
      <div className="flex items-center justify-between">
        <div>
          <div className={`text-xl font-semibold ${config.color} mb-2`}>
            {config.icon} {config.label}
          </div>
          <p className="text-gray-400 text-sm">
            Alignment Score: {(analysis.correlationAnalysis.overallAlignment * 100).toFixed(1)}%
          </p>
        </div>
        <div className="w-32 h-32">
          <svg viewBox="0 0 100 100" className="transform -rotate-90">
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="#374151"
              strokeWidth="8"
            />
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke={
                analysis.correlationAnalysis.overallAlignment >= 0.7
                  ? '#10b981'
                  : analysis.correlationAnalysis.overallAlignment >= 0.4
                  ? '#f59e0b'
                  : '#ef4444'
              }
              strokeWidth="8"
              strokeDasharray={`${analysis.correlationAnalysis.overallAlignment * 251.2} 251.2`}
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}

function InsightsGrid({ analysis }: { analysis: AnalysisResult }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Key Insights */}
      <div className="bg-blue-900/20 rounded-lg p-4 border border-blue-800/50">
        <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
          💡 Key Insights
        </h4>
        <ul className="space-y-2">
          {analysis.keyInsights.map((insight, idx) => (
            <li key={idx} className="text-sm text-gray-300 flex items-start gap-2">
              <span className="text-blue-400 mt-0.5">•</span>
              <span>{insight}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Risks */}
      <div className="bg-red-900/20 rounded-lg p-4 border border-red-800/50">
        <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
          ⚠️ Risks
        </h4>
        <ul className="space-y-2">
          {analysis.risks.map((risk, idx) => (
            <li key={idx} className="text-sm text-gray-300 flex items-start gap-2">
              <span className="text-red-400 mt-0.5">•</span>
              <span>{risk}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Opportunities */}
      <div className="bg-green-900/20 rounded-lg p-4 border border-green-800/50">
        <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
          🎯 Opportunities
        </h4>
        <ul className="space-y-2">
          {analysis.opportunities.map((opportunity, idx) => (
            <li key={idx} className="text-sm text-gray-300 flex items-start gap-2">
              <span className="text-green-400 mt-0.5">•</span>
              <span>{opportunity}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function SummaryCard({ analysis }: { analysis: AnalysisResult }) {
  return (
    <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 rounded-lg p-6 border border-purple-800/50">
      <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
        📝 Analysis Summary
      </h3>
      <p className="text-gray-300 leading-relaxed">{analysis.summary}</p>
    </div>
  );
}
