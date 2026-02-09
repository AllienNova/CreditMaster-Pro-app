'use client';

/**
 * Model Monitoring Component
 *
 * Admin dashboard component for monitoring AI model usage, costs, and performance metrics.
 */

import { useState, useMemo } from 'react';

export interface ModelUsageData {
  modelId: string;
  modelName: string;
  provider: string;
  requests: number;
  inputTokens: number;
  outputTokens: number;
  totalCost: number;
  avgLatency: number;
  errorRate: number;
  successRate: number;
}

export interface UsageTrend {
  date: string;
  requests: number;
  cost: number;
  tokens: number;
}

interface ModelMonitoringProps {
  usageData?: ModelUsageData[];
  trends?: UsageTrend[];
  dateRange?: 'day' | 'week' | 'month';
  onDateRangeChange?: (range: 'day' | 'week' | 'month') => void;
  className?: string;
}

// Sample data for demonstration
const SAMPLE_USAGE_DATA: ModelUsageData[] = [
  { modelId: 'gpt-4o', modelName: 'GPT-4o', provider: 'OpenAI', requests: 12450, inputTokens: 8234000, outputTokens: 2156000, totalCost: 73.42, avgLatency: 2340, errorRate: 0.8, successRate: 99.2 },
  { modelId: 'gpt-4o-mini', modelName: 'GPT-4o Mini', provider: 'OpenAI', requests: 45230, inputTokens: 12456000, outputTokens: 4567000, totalCost: 4.61, avgLatency: 890, errorRate: 0.3, successRate: 99.7 },
  { modelId: 'claude-3-5-sonnet', modelName: 'Claude 3.5 Sonnet', provider: 'Anthropic', requests: 8920, inputTokens: 5678000, outputTokens: 1890000, totalCost: 45.38, avgLatency: 1890, errorRate: 0.5, successRate: 99.5 },
  { modelId: 'llama-3.1-70b', modelName: 'Llama 3.1 70B', provider: 'Meta', requests: 23450, inputTokens: 9876000, outputTokens: 3210000, totalCost: 4.74, avgLatency: 1234, errorRate: 1.2, successRate: 98.8 },
  { modelId: 'mistral-large', modelName: 'Mistral Large', provider: 'Mistral', requests: 6780, inputTokens: 3456000, outputTokens: 1234000, totalCost: 14.32, avgLatency: 1567, errorRate: 0.6, successRate: 99.4 },
];

const SAMPLE_TRENDS: UsageTrend[] = [
  { date: '2024-01-01', requests: 2340, cost: 12.45, tokens: 1234000 },
  { date: '2024-01-02', requests: 2890, cost: 15.67, tokens: 1567000 },
  { date: '2024-01-03', requests: 3120, cost: 18.23, tokens: 1890000 },
  { date: '2024-01-04', requests: 2780, cost: 14.56, tokens: 1456000 },
  { date: '2024-01-05', requests: 3450, cost: 21.34, tokens: 2134000 },
  { date: '2024-01-06', requests: 4120, cost: 25.67, tokens: 2567000 },
  { date: '2024-01-07', requests: 3890, cost: 22.89, tokens: 2289000 },
];

export default function ModelMonitoring({
  usageData = SAMPLE_USAGE_DATA,
  trends = SAMPLE_TRENDS,
  dateRange = 'week',
  onDateRangeChange,
  className = '',
}: ModelMonitoringProps) {
  const [selectedRange, setSelectedRange] = useState<'day' | 'week' | 'month'>(dateRange);
  const [sortBy, setSortBy] = useState<'requests' | 'cost' | 'latency'>('cost');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Calculate totals
  const totals = useMemo(() => ({
    requests: usageData.reduce((sum, d) => sum + d.requests, 0),
    cost: usageData.reduce((sum, d) => sum + d.totalCost, 0),
    inputTokens: usageData.reduce((sum, d) => sum + d.inputTokens, 0),
    outputTokens: usageData.reduce((sum, d) => sum + d.outputTokens, 0),
    avgLatency: usageData.reduce((sum, d) => sum + d.avgLatency, 0) / usageData.length,
  }), [usageData]);

  // Sort data
  const sortedData = useMemo(() => {
    return [...usageData].sort((a, b) => {
      const aVal = sortBy === 'requests' ? a.requests : sortBy === 'cost' ? a.totalCost : a.avgLatency;
      const bVal = sortBy === 'requests' ? b.requests : sortBy === 'cost' ? b.totalCost : b.avgLatency;
      return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
    });
  }, [usageData, sortBy, sortOrder]);

  const handleRangeChange = (range: 'day' | 'week' | 'month') => {
    setSelectedRange(range);
    onDateRangeChange?.(range);
  };

  const formatNumber = (n: number) => n.toLocaleString();
  const formatCurrency = (n: number) => `$${n.toFixed(2)}`;
  const formatTokens = (n: number) => n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : `${(n / 1000).toFixed(0)}K`;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Date Range */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">AI Model Monitoring</h2>
        <div className="flex gap-2">
          {(['day', 'week', 'month'] as const).map(range => (
            <button
              key={range}
              onClick={() => handleRangeChange(range)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${ selectedRange === range ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 dark:text-slate-200 hover:bg-gray-200 dark:bg-slate-700' }`}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-4">
          <p className="text-sm text-gray-500 dark:text-slate-400">Total Requests</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatNumber(totals.requests)}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-4">
          <p className="text-sm text-gray-500 dark:text-slate-400">Total Cost</p>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(totals.cost)}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-4">
          <p className="text-sm text-gray-500 dark:text-slate-400">Total Tokens</p>
          <p className="text-2xl font-bold text-blue-600">{formatTokens(totals.inputTokens + totals.outputTokens)}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-4">
          <p className="text-sm text-gray-500 dark:text-slate-400">Avg Latency</p>
          <p className="text-2xl font-bold text-blue-600">{totals.avgLatency.toFixed(0)}ms</p>
        </div>
      </div>

      {/* Usage Trend Chart (simplified bar representation) */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Usage Trend</h3>
        <div className="flex items-end justify-between h-32 gap-2">
          {trends.map((trend, i) => {
            const maxCost = Math.max(...trends.map(t => t.cost));
            const height = (trend.cost / maxCost) * 100;
            return (
              <div key={i} className="flex-1 flex flex-col items-center">
                <div
                  className="w-full bg-blue-500 rounded-t hover:bg-blue-600 transition-colors"
                  style={{ height: `${height}%` }}
                  title={`${trend.date}: ${formatCurrency(trend.cost)}`}
                />
                <span className="text-xs text-gray-500 dark:text-slate-400 mt-1">{trend.date.slice(-2)}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Model Usage Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Model Usage by Provider</h3>
            <div className="flex gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'requests' | 'cost' | 'latency')}
                className="text-sm border border-gray-300 dark:border-slate-600 rounded-lg px-2 py-1"
              >
                <option value="cost">Sort by Cost</option>
                <option value="requests">Sort by Requests</option>
                <option value="latency">Sort by Latency</option>
              </select>
              <button
                onClick={() => setSortOrder(o => o === 'asc' ? 'desc' : 'asc')}
                className="px-2 py-1 text-sm border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 dark:bg-slate-900"
              >
                {sortOrder === 'desc' ? '↓' : '↑'}
              </button>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-slate-900">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Model</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Requests</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Input Tokens</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Output Tokens</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Cost</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Avg Latency</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Success Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
              {sortedData.map((model) => (
                <tr key={model.modelId} className="hover:bg-gray-50 dark:hover:bg-slate-700 dark:bg-slate-900">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900 dark:text-white">{model.modelName}</div>
                    <div className="text-xs text-gray-500 dark:text-slate-400">{model.provider}</div>
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-gray-900 dark:text-white">{formatNumber(model.requests)}</td>
                  <td className="px-4 py-3 text-right text-sm text-gray-600 dark:text-slate-300">{formatTokens(model.inputTokens)}</td>
                  <td className="px-4 py-3 text-right text-sm text-gray-600 dark:text-slate-300">{formatTokens(model.outputTokens)}</td>
                  <td className="px-4 py-3 text-right text-sm font-medium text-green-600">{formatCurrency(model.totalCost)}</td>
                  <td className="px-4 py-3 text-right text-sm text-gray-600 dark:text-slate-300">{model.avgLatency}ms</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                      model.successRate >= 99 ? 'bg-green-100 text-green-800' :
                      model.successRate >= 95 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {model.successRate.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cost Breakdown by Provider */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Cost Breakdown by Provider</h3>
        <div className="space-y-3">
          {Object.entries(
            usageData.reduce((acc, d) => {
              acc[d.provider] = (acc[d.provider] || 0) + d.totalCost;
              return acc;
            }, {} as Record<string, number>)
          ).sort((a, b) => b[1] - a[1]).map(([provider, cost]) => {
            const percentage = (cost / totals.cost) * 100;
            return (
              <div key={provider}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-gray-900 dark:text-white">{provider}</span>
                  <span className="text-gray-600 dark:text-slate-300">{formatCurrency(cost)} ({percentage.toFixed(1)}%)</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                  <div
                    className="bg-blue-600 rounded-full h-2 transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

