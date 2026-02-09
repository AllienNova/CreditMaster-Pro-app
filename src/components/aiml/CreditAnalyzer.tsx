'use client';

import { useState } from 'react';

interface CreditAnalyzerProps {
  onAnalyze?: (analysis: CreditAnalysisOutput) => void;
}

interface CreditAnalysisOutput {
  score_factors: string[];
  negative_items: Array<{
    item: string;
    impact: 'high' | 'medium' | 'low';
    disputable: boolean;
    reason: string;
  }>;
  positive_items: string[];
  action_plan: Array<{
    step: number;
    action: string;
    timeline: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  timeline_estimate: string;
  estimated_score_improvement: number;
}

export default function CreditAnalyzer({ onAnalyze }: CreditAnalyzerProps) {
  const [creditScore, setCreditScore] = useState('');
  const [goals, setGoals] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [analysis, setAnalysis] = useState<CreditAnalysisOutput | null>(null);

  const handleAnalyze = async () => {
    setLoading(true);
    setError('');
    setAnalysis(null);

    try {
      const response = await fetch('/api/credit/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          creditReport: {
            accounts: [], // In real app, this would come from actual credit report
            inquiries: [],
          },
          creditScore: creditScore ? parseInt(creditScore) : undefined,
          goals: goals ? goals.split('\n').filter(g => g.trim()) : undefined,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to analyze credit report');
      }

      setAnalysis(data.data.analysis);
      
      if (onAnalyze) {
        onAnalyze(data.data.analysis);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 bg-red-50';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50';
      case 'low':
        return 'text-green-600 bg-green-50';
      default:
        return 'text-gray-600 dark:text-slate-300 bg-gray-50 dark:bg-slate-900';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high':
        return 'text-red-600';
      case 'medium':
        return 'text-yellow-600';
      case 'low':
        return 'text-green-600';
      default:
        return 'text-gray-600 dark:text-slate-300';
    }
  };

  return (
    <div className="credit-analyzer">
      <div className="max-w-4xl mx-auto p-6">
        <h2 className="text-3xl font-bold mb-6">AI-Powered Credit Report Analyzer</h2>
        <p className="text-gray-600 dark:text-slate-300 mb-8">
          Get comprehensive credit analysis using DeepSeek R1's advanced reasoning
        </p>

        <div className="space-y-6">
          {/* Input Section */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
            <h3 className="text-xl font-semibold mb-4">Credit Information</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Current Credit Score (Optional)</label>
                <input
                  type="number"
                  value={creditScore}
                  onChange={(e) => setCreditScore(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="650"
                  min="300"
                  max="850"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Your Goals (One per line, optional)</label>
                <textarea
                  value={goals}
                  onChange={(e) => setGoals(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={4}
                  placeholder="Improve score to 700+&#10;Remove negative items&#10;Qualify for mortgage"
                />
              </div>
            </div>
          </div>

          {/* Analyze Button */}
          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Analyzing...' : 'Analyze Credit Report'}
          </button>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Analysis Results */}
          {analysis && (
            <div className="space-y-6">
              {/* Score Improvement Estimate */}
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg shadow-lg p-6">
                <h3 className="text-2xl font-bold mb-2">Estimated Score Improvement</h3>
                <p className="text-4xl font-bold">+{analysis.estimated_score_improvement} points</p>
                <p className="text-sm mt-2">Timeline: {analysis.timeline_estimate}</p>
              </div>

              {/* Score Factors */}
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
                <h3 className="text-xl font-semibold mb-4">Score Factors</h3>
                <ul className="space-y-2">
                  {analysis.score_factors.map((factor, i) => (
                    <li key={i} className="flex items-start">
                      <span className="text-blue-500 mr-2">•</span>
                      <span>{factor}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Negative Items */}
              {analysis.negative_items.length > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
                  <h3 className="text-xl font-semibold mb-4">Negative Items</h3>
                  <div className="space-y-4">
                    {analysis.negative_items.map((item, i) => (
                      <div key={i} className="border-l-4 border-red-500 pl-4 py-2">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold">{item.item}</h4>
                          <span className={`text-sm px-2 py-1 rounded ${getImpactColor(item.impact)}`}>
                            {item.impact.toUpperCase()} IMPACT
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-slate-300 mb-2">{item.reason}</p>
                        {item.disputable && (
                          <span className="inline-block text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                            Disputable
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Positive Items */}
              {analysis.positive_items.length > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
                  <h3 className="text-xl font-semibold mb-4">Positive Items</h3>
                  <ul className="space-y-2">
                    {analysis.positive_items.map((item, i) => (
                      <li key={i} className="flex items-start">
                        <span className="text-green-500 mr-2"></span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Action Plan */}
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
                <h3 className="text-xl font-semibold mb-4">Action Plan</h3>
                <div className="space-y-4">
                  {analysis.action_plan.map((step) => (
                    <div key={step.step} className="flex">
                      <div className="flex-shrink-0 w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold mr-4">
                        {step.step}
                      </div>
                      <div className="flex-grow">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold">{step.action}</h4>
                          <span className={`text-xs px-2 py-1 rounded ${getPriorityColor(step.priority)}`}>
                            {step.priority.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-slate-300">Timeline: {step.timeline}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-xs text-gray-500 dark:text-slate-400 text-center">
                Analysis powered by DeepSeek R1 • AIML API
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

