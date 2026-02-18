"use client";

import { useState, useEffect } from "react";

interface InvestmentRecommendation {
  id: string;
  symbol: string;
  name: string;
  type: "buy" | "sell" | "hold";
  reasoning: string;
  confidence: number; // 0-100
  targetPrice: number;
  currentPrice: number;
  potentialReturn: number; // percentage
  riskLevel: "low" | "medium" | "high";
  timeframe: string;
}

interface RiskAnalysis {
  overallRisk: "low" | "medium" | "high";
  riskScore: number; // 0-100
  factors: Array<{
    factor: string;
    level: "low" | "medium" | "high";
    description: string;
  }>;
  recommendations: string[];
}

interface DiversificationSuggestion {
  id: string;
  assetClass: string;
  currentAllocation: number; // percentage
  recommendedAllocation: number; // percentage
  reasoning: string;
  impact: "high" | "medium" | "low";
}

interface MarketPrediction {
  timeframe: "1_month" | "3_months" | "6_months";
  predictedReturn: number; // percentage
  confidence: number; // 0-100
  factors: string[];
}

interface PerformanceForecast {
  period: string;
  projectedValue: number;
  projectedReturn: number; // percentage
  confidence: number;
}

interface AIInvestmentData {
  recommendations: InvestmentRecommendation[];
  riskAnalysis: RiskAnalysis;
  diversificationSuggestions: DiversificationSuggestion[];
  marketPredictions: MarketPrediction[];
  performanceForecasts: PerformanceForecast[];
  portfolioHealthScore: number; // 0-100
  aiInsights: string[];
}

export default function AIInvestmentInsights() {
  const [data, setData] = useState<AIInvestmentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/financial/investments/ai-insights");

      if (!response.ok) {
        throw new Error("Failed to fetch AI investment insights");
      }

      const result = await response.json();
      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (level: "low" | "medium" | "high") => {
    switch (level) {
      case "low":
        return "text-green-600 bg-green-100";
      case "medium":
        return "text-yellow-600 bg-yellow-100";
      case "high":
        return "text-red-600 bg-red-100";
    }
  };

  const getTypeColor = (type: "buy" | "sell" | "hold") => {
    switch (type) {
      case "buy":
        return "text-green-600 bg-green-100";
      case "sell":
        return "text-red-600 bg-red-100";
      case "hold":
        return "text-blue-600 bg-blue-100";
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 mb-6 animate-pulse">
        <div className="h-8 bg-white dark:bg-slate-800/20 rounded w-1/3 mb-4"></div>
        <div className="h-24 bg-white dark:bg-slate-800/20 rounded"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-6">
        <p className="text-red-800 font-medium">Error loading AI insights</p>
        <p className="text-red-600 text-sm mt-1">{error}</p>
        <button
          onClick={fetchData}
          className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 mb-6 text-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-white dark:bg-slate-800/20 rounded-lg flex items-center justify-center text-2xl"></div>
          <div>
            <h2 className="text-xl font-bold">AI Investment Intelligence</h2>
            <p className="text-blue-100 text-sm">
              Powered by advanced market analysis
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-2 hover:bg-white dark:bg-slate-800/10 rounded-lg transition-colors"
        >
          {isExpanded ? (
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 15l7-7 7 7"
              />
            </svg>
          ) : (
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          )}
        </button>
      </div>

      {isExpanded && (
        <div className="space-y-6">
          {/* Portfolio Health Score */}
          <div className="bg-white dark:bg-slate-800/10 backdrop-blur-sm rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold flex items-center space-x-2">
                <span className="text-xl"></span>
                <span>Portfolio Health Score</span>
              </h3>
              <span className="text-2xl font-bold">
                {data.portfolioHealthScore}/100
              </span>
            </div>
            <div className="w-full bg-white dark:bg-slate-800/20 rounded-full h-3">
              <div
                className="bg-white dark:bg-slate-800 rounded-full h-3 transition-all duration-500"
                style={{ width: `${data.portfolioHealthScore}%` }}
              ></div>
            </div>
            <p className="text-blue-100 text-sm mt-2">
              {data.portfolioHealthScore >= 80
                ? "Excellent portfolio health"
                : data.portfolioHealthScore >= 60
                  ? "Good portfolio health with room for improvement"
                  : "Portfolio needs attention"}
            </p>
          </div>

          {/* AI Investment Recommendations */}
          <div className="bg-white dark:bg-slate-800/10 backdrop-blur-sm rounded-lg p-4">
            <h3 className="font-semibold mb-3 flex items-center space-x-2">
              <span className="text-xl"></span>
              <span>AI Investment Recommendations</span>
            </h3>
            <div className="space-y-3">
              {data.recommendations.slice(0, 3).map((rec) => (
                <div
                  key={rec.id}
                  className="bg-white dark:bg-slate-800/10 rounded-lg p-3"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold">{rec.symbol}</span>
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium ${getTypeColor(rec.type)}`}
                        >
                          {rec.type.toUpperCase()}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium ${getRiskColor(rec.riskLevel)}`}
                        >
                          {rec.riskLevel} risk
                        </span>
                      </div>
                      <p className="text-sm text-blue-100 mt-1">{rec.name}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {rec.potentialReturn > 0 ? "+" : ""}
                        {rec.potentialReturn.toFixed(1)}%
                      </div>
                      <div className="text-xs text-blue-200">
                        {rec.confidence}% confidence
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-blue-100">{rec.reasoning}</p>
                  <div className="flex items-center justify-between mt-2 text-xs text-blue-200">
                    <span>Target: ${rec.targetPrice.toFixed(2)}</span>
                    <span>Current: ${rec.currentPrice.toFixed(2)}</span>
                    <span>{rec.timeframe}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Risk Analysis */}
          <div className="bg-white dark:bg-slate-800/10 backdrop-blur-sm rounded-lg p-4">
            <h3 className="font-semibold mb-3 flex items-center space-x-2">
              <span className="text-xl"></span>
              <span>Portfolio Risk Analysis</span>
            </h3>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm">Overall Risk Level</span>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${getRiskColor(data.riskAnalysis.overallRisk)}`}
              >
                {data.riskAnalysis.overallRisk.toUpperCase()} (
                {data.riskAnalysis.riskScore}/100)
              </span>
            </div>
            <div className="space-y-2 mb-3">
              {data.riskAnalysis.factors.slice(0, 3).map((factor, idx) => (
                <div key={idx} className="flex items-start space-x-2 text-sm">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${getRiskColor(factor.level)} flex-shrink-0`}
                  >
                    {factor.level}
                  </span>
                  <div>
                    <span className="font-medium">{factor.factor}:</span>
                    <span className="text-blue-100 ml-1">
                      {factor.description}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-white/20 pt-3">
              <p className="text-sm font-medium mb-2">Recommendations:</p>
              <ul className="space-y-1">
                {data.riskAnalysis.recommendations
                  .slice(0, 2)
                  .map((rec, idx) => (
                    <li
                      key={idx}
                      className="text-sm text-blue-100 flex items-start space-x-2"
                    >
                      <span>•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
              </ul>
            </div>
          </div>

          {/* Diversification Suggestions */}
          <div className="bg-white dark:bg-slate-800/10 backdrop-blur-sm rounded-lg p-4">
            <h3 className="font-semibold mb-3 flex items-center space-x-2">
              <span className="text-xl"></span>
              <span>Diversification Suggestions</span>
            </h3>
            <div className="space-y-3">
              {data.diversificationSuggestions.slice(0, 3).map((suggestion) => (
                <div
                  key={suggestion.id}
                  className="bg-white dark:bg-slate-800/10 rounded-lg p-3"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{suggestion.assetClass}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        suggestion.impact === "high"
                          ? "bg-red-100 text-red-600"
                          : suggestion.impact === "medium"
                            ? "bg-yellow-100 text-yellow-600"
                            : "bg-green-100 text-green-600"
                      }`}
                    >
                      {suggestion.impact} impact
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm mb-2">
                    <span className="text-blue-200">Current:</span>
                    <span className="font-medium">
                      {suggestion.currentAllocation}%
                    </span>
                    <span className="text-blue-200">→</span>
                    <span className="text-blue-200">Recommended:</span>
                    <span className="font-medium">
                      {suggestion.recommendedAllocation}%
                    </span>
                  </div>
                  <p className="text-sm text-blue-100">
                    {suggestion.reasoning}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Market Predictions & Performance Forecasts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Market Predictions */}
            <div className="bg-white dark:bg-slate-800/10 backdrop-blur-sm rounded-lg p-4">
              <h3 className="font-semibold mb-3 text-sm">Market Predictions</h3>
              <div className="space-y-2">
                {data.marketPredictions.map((pred, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-blue-100">
                      {pred.timeframe === "1_month"
                        ? "1 Month"
                        : pred.timeframe === "3_months"
                          ? "3 Months"
                          : "6 Months"}
                    </span>
                    <div className="text-right">
                      <div
                        className={`font-medium ${pred.predictedReturn >= 0 ? "text-green-300" : "text-red-300"}`}
                      >
                        {pred.predictedReturn > 0 ? "+" : ""}
                        {pred.predictedReturn.toFixed(1)}%
                      </div>
                      <div className="text-xs text-blue-200">
                        {pred.confidence}% confidence
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Performance Forecasts */}
            <div className="bg-white dark:bg-slate-800/10 backdrop-blur-sm rounded-lg p-4">
              <h3 className="font-semibold mb-3 text-sm">
                Performance Forecasts
              </h3>
              <div className="space-y-2">
                {data.performanceForecasts.slice(0, 3).map((forecast, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-blue-100">{forecast.period}</span>
                    <div className="text-right">
                      <div className="font-medium">
                        ${(forecast.projectedValue / 1000).toFixed(1)}K
                      </div>
                      <div className="text-xs text-blue-200">
                        {forecast.projectedReturn > 0 ? "+" : ""}
                        {forecast.projectedReturn.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* AI Insights */}
          <div className="bg-white dark:bg-slate-800/10 backdrop-blur-sm rounded-lg p-4">
            <h3 className="font-semibold mb-3">Key AI Insights</h3>
            <ul className="space-y-2">
              {data.aiInsights.map((insight, idx) => (
                <li
                  key={idx}
                  className="text-sm text-blue-100 flex items-start space-x-2"
                >
                  <span className="text-white font-bold">•</span>
                  <span>{insight}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
