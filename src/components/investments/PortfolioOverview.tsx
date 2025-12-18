'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import {
  PieChartComponent,
  AreaChartComponent,
  ChartContainer,
} from '@/components/charts';
import type {
  Portfolio,
  Holding,
} from '@/lib/investments/types/portfolio.types';

type DateRange = '1M' | '3M' | '6M' | '1Y' | 'ALL';

export default function PortfolioOverview() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>('1M');

  const fetchPortfolio = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const response = await fetch(
        `/api/investments/portfolio?period=${dateRange}`
      );
      if (!response.ok) throw new Error('Failed to fetch portfolio');
      const result = await response.json();
      if (result.success) {
        setPortfolio(result.data);
        setError(null);
      } else {
        throw new Error(result.error || 'Failed to fetch portfolio');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load portfolio');
    } finally {
      setLoading(false);
    }
  }, [user, dateRange]);

  useEffect(() => {
    if (!authLoading && user) {
      void fetchPortfolio();
    }
  }, [authLoading, user, fetchPortfolio]);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercent = (value: number): string => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };

  if (loading) {
    return <PortfolioSkeleton />;
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <h3 className="text-red-800 dark:text-red-200 font-medium">Error</h3>
        <p className="text-red-600 dark:text-red-400 mt-1">{error}</p>
        <button
          type="button"
          onClick={() => void fetchPortfolio()}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!portfolio) {
    return (
      <EmptyPortfolio
        onAddHolding={() => router.push('/investments/holdings')}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          title="Total Value"
          value={formatCurrency(portfolio.totalValue)}
          subValue={`${formatCurrency(portfolio.totalGainLoss)} (${formatPercent(portfolio.totalGainLossPercent)})`}
          isPositive={portfolio.totalGainLoss >= 0}
          icon="💰"
        />
        <SummaryCard
          title="Day Change"
          value={formatCurrency(portfolio.dayChange)}
          subValue={formatPercent(portfolio.dayChangePercent)}
          isPositive={portfolio.dayChange >= 0}
          icon="📈"
        />
        <SummaryCard
          title="Total Cost"
          value={formatCurrency(portfolio.totalCost)}
          subValue={`${portfolio.holdings.length} holdings`}
          icon="💵"
        />
        <SummaryCard
          title="Total Return"
          value={formatPercent(portfolio.totalGainLossPercent)}
          subValue={formatCurrency(portfolio.totalGainLoss)}
          isPositive={portfolio.totalGainLoss >= 0}
          icon="🎯"
        />
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => router.push('/investments/holdings')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <span>➕</span> Add Holding
        </button>
        <button
          type="button"
          onClick={() => router.push('/investments/analyze/AAPL')}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
        >
          <span>📊</span> Analyze Stock
        </button>
        <button
          type="button"
          onClick={() => router.push('/investments/signals')}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
        >
          <span>📡</span> View Signals
        </button>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Allocation Chart */}
        <ChartContainer title="Portfolio Allocation" className="h-[400px]">
          <PieChartComponent
            data={portfolio.allocation.map((a) => ({
              name: a.name,
              value: a.value,
            }))}
            height={320}
            showLabels
            showLegend
            innerRadius={60}
            outerRadius={100}
            currency
          />
        </ChartContainer>

        {/* Performance Chart */}
        <ChartContainer title="Performance" className="h-[400px]">
          <DateRangeSelector selected={dateRange} onSelect={setDateRange} />
          <AreaChartComponent
            data={portfolio.performanceHistory.map((p) => ({
              label: p.date,
              value: p.value,
            }))}
            areas={[
              { dataKey: 'value', name: 'Portfolio Value', color: '#3B82F6' },
            ]}
            height={280}
            currency
            showLegend={false}
          />
        </ChartContainer>
      </div>

      {/* Holdings Table */}
      <HoldingsTable
        holdings={portfolio.holdings}
        onAnalyze={(symbol) => router.push(`/investments/analyze/${symbol}`)}
      />
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface SummaryCardProps {
  title: string;
  value: string;
  subValue?: string;
  isPositive?: boolean;
  icon: string;
}

function SummaryCard({
  title,
  value,
  subValue,
  isPositive,
  icon,
}: SummaryCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <span className="text-2xl">{icon}</span>
        {isPositive !== undefined && (
          <span
            className={`text-sm font-medium ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
          >
            {isPositive ? '▲' : '▼'}
          </span>
        )}
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{title}</p>
      <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
        {value}
      </p>
      {subValue && (
        <p
          className={`text-sm mt-1 ${
            isPositive !== undefined
              ? isPositive
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
              : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          {subValue}
        </p>
      )}
    </div>
  );
}

interface DateRangeSelectorProps {
  selected: DateRange;
  onSelect: (range: DateRange) => void;
}

function DateRangeSelector({ selected, onSelect }: DateRangeSelectorProps) {
  const ranges: DateRange[] = ['1M', '3M', '6M', '1Y', 'ALL'];
  return (
    <div className="flex gap-1 mb-4">
      {ranges.map((range) => (
        <button
          type="button"
          key={range}
          onClick={() => onSelect(range)}
          className={`px-3 py-1 text-sm rounded ${
            selected === range
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          {range}
        </button>
      ))}
    </div>
  );
}

interface HoldingsTableProps {
  holdings: Holding[];
  onAnalyze: (symbol: string) => void;
}

function HoldingsTable({ holdings, onAnalyze }: HoldingsTableProps) {
  const [sortField, setSortField] = useState<keyof Holding>('totalValue');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const sortedHoldings = [...holdings].sort((a, b) => {
    const aVal = a[sortField];
    const bVal = b[sortField];
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    }
    return sortDir === 'asc'
      ? String(aVal).localeCompare(String(bVal))
      : String(bVal).localeCompare(String(aVal));
  });

  const handleSort = (field: keyof Holding) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(n);

  const SortIcon = ({ field }: { field: keyof Holding }) => {
    if (sortField !== field) return <span className="text-gray-300">↕</span>;
    return <span>{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Holdings ({holdings.length})
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                onClick={() => handleSort('symbol')}
              >
                Symbol <SortIcon field="symbol" />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Name
              </th>
              <th
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                onClick={() => handleSort('shares')}
              >
                Shares <SortIcon field="shares" />
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Price
              </th>
              <th
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                onClick={() => handleSort('totalValue')}
              >
                Value <SortIcon field="totalValue" />
              </th>
              <th
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                onClick={() => handleSort('gainLoss')}
              >
                Gain/Loss <SortIcon field="gainLoss" />
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {sortedHoldings.map((holding) => (
              <tr
                key={holding.id}
                className="hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="font-medium text-gray-900 dark:text-white">
                    {holding.symbol}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-500 dark:text-gray-400 max-w-[200px] truncate">
                  {holding.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-gray-900 dark:text-white">
                  {holding.shares.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-gray-900 dark:text-white">
                  {formatCurrency(holding.currentPrice)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right font-medium text-gray-900 dark:text-white">
                  {formatCurrency(holding.totalValue)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <div
                    className={
                      holding.gainLoss >= 0
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    }
                  >
                    <div>{formatCurrency(holding.gainLoss)}</div>
                    <div className="text-sm">
                      {holding.gainLoss >= 0 ? '+' : ''}
                      {holding.gainLossPercent.toFixed(2)}%
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <button
                    type="button"
                    onClick={() => onAnalyze(holding.symbol)}
                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium"
                  >
                    Analyze
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {holdings.length === 0 && (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            No holdings yet. Add your first holding to get started.
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyPortfolio({ onAddHolding }: { onAddHolding: () => void }) {
  return (
    <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-lg shadow">
      <span className="text-6xl">📊</span>
      <h3 className="mt-4 text-xl font-semibold text-gray-900 dark:text-white">
        No Portfolio Data
      </h3>
      <p className="mt-2 text-gray-500 dark:text-gray-400 max-w-md mx-auto">
        Start building your investment portfolio by adding your first holding.
      </p>
      <button
        type="button"
        onClick={onAddHolding}
        className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        Add Your First Holding
      </button>
    </div>
  );
}

function PortfolioSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"
          >
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4" />
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 h-[400px]" />
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 h-[400px]" />
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 h-[300px]" />
    </div>
  );
}
