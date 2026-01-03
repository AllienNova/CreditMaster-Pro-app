/**
 * Comprehensive Investment Analysis Demo Page
 *
 * Showcases the unified InvestmentAnalysisEngine that integrates all 6 analysis services
 */

import React from 'react';
import { ComprehensiveAnalysisPanel } from '@/components/investments/analysis/ComprehensiveAnalysisPanel';

export const metadata = {
  title: 'Comprehensive Analysis | CreditMaster Pro',
  description: 'Unified investment analysis combining technical, fundamental, sentiment, pattern recognition, AI recommendations, and portfolio analysis',
};

export default function ComprehensiveAnalysisPage() {
  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Comprehensive Investment Analysis
          </h1>
          <p className="text-gray-400 text-lg">
            Powered by the unified InvestmentAnalysisEngine integrating all 6 analysis services
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <FeatureCard
            icon="📊"
            title="Technical Analysis"
            description="14 indicators including SMA, EMA, RSI, MACD, Bollinger Bands, and more"
          />
          <FeatureCard
            icon="💼"
            title="Fundamental Analysis"
            description="Valuation metrics, profitability ratios, growth analysis, and DCF valuation"
          />
          <FeatureCard
            icon="💭"
            title="Sentiment Analysis"
            description="News sentiment, social media trends, analyst consensus, and insider activity"
          />
          <FeatureCard
            icon="🔍"
            title="Pattern Recognition"
            description="Chart pattern detection including head & shoulders, triangles, flags, and more"
          />
          <FeatureCard
            icon="🤖"
            title="AI Recommendations"
            description="Machine learning-powered price predictions and portfolio rebalancing"
          />
          <FeatureCard
            icon="📈"
            title="Portfolio Analysis"
            description="Risk metrics, diversification analysis, VaR calculations, and performance tracking"
          />
        </div>

        {/* Main Analysis Panel */}
        <ComprehensiveAnalysisPanel symbol="AAPL" />

        {/* Info Section */}
        <div className="mt-8 bg-blue-900/20 border border-blue-800/50 rounded-lg p-6">
          <h3 className="text-xl font-semibold text-white mb-4">
            🎯 How It Works
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-gray-300">
            <div>
              <h4 className="font-semibold text-white mb-2">Composite Scoring</h4>
              <p className="text-sm">
                Combines scores from all 6 services using weighted averages: Technical (30%),
                Fundamental (35%), Sentiment (20%), Pattern (15%). Confidence is calculated based
                on variance between services.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-2">Correlation Analysis</h4>
              <p className="text-sm">
                Measures alignment between different analysis types on a -1 to 1 scale. Strong
                alignment (≥0.7) indicates high confidence, while conflicting signals (&lt;0.3)
                suggest caution.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-2">Risk Assessment</h4>
              <p className="text-sm">
                Evaluates multiple risk factors including volatility, technical indicators,
                fundamental health, and sentiment trends to provide an overall risk level.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-2">Actionable Insights</h4>
              <p className="text-sm">
                Generates key insights, identifies risks, and highlights opportunities based on
                comprehensive analysis across all services.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 hover:border-blue-600/50 transition-colors">
      <div className="text-3xl mb-2">{icon}</div>
      <h3 className="text-white font-semibold mb-1">{title}</h3>
      <p className="text-sm text-gray-400">{description}</p>
    </div>
  );
}

