'use client';

import React, { useMemo } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceDot,
  Line,
  ComposedChart,
} from 'recharts';
import { RiskTolerance } from '@/lib/investments/types/asset-allocation.types';

/**
 * Efficient Frontier Point
 */
export interface EfficientFrontierPoint {
  volatility: number; // Risk (x-axis) - standard deviation as percentage
  expectedReturn: number; // Return (y-axis) - expected return as percentage
  sharpeRatio: number; // Risk-adjusted return metric
  label?: string; // Optional label for the point
  isOptimal?: boolean; // Whether this is an optimal portfolio
}

/**
 * Current Portfolio Position
 */
export interface PortfolioPosition {
  volatility: number;
  expectedReturn: number;
  label: string;
}

/**
 * Props for EfficientFrontierChart
 */
export interface EfficientFrontierChartProps {
  frontierPoints: EfficientFrontierPoint[];
  currentPortfolio?: PortfolioPosition;
  recommendedPortfolio?: PortfolioPosition;
  onPointClick?: (point: EfficientFrontierPoint) => void;
  height?: number;
}

/**
 * Custom Tooltip Props for Efficient Frontier Chart
 */
interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: EfficientFrontierPoint & { label?: string };
  }>;
}

/**
 * Custom Tooltip for Efficient Frontier Chart
 */
const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white dark:bg-slate-800 p-3 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg">
        <p className="font-semibold text-gray-900 dark:text-white mb-2">
          {data.label || 'Portfolio'}
        </p>
        <p className="text-sm text-gray-600 dark:text-slate-300">
          <span className="font-medium">Expected Return:</span> {data.expectedReturn.toFixed(2)}%
        </p>
        <p className="text-sm text-gray-600 dark:text-slate-300">
          <span className="font-medium">Volatility:</span> {data.volatility.toFixed(2)}%
        </p>
        {data.sharpeRatio !== undefined && (
          <p className="text-sm text-gray-600 dark:text-slate-300">
            <span className="font-medium">Sharpe Ratio:</span> {data.sharpeRatio.toFixed(2)}
          </p>
        )}
      </div>
    );
  }
  return null;
};

/**
 * Efficient Frontier Chart Component
 *
 * Displays an interactive risk/return scatter plot showing:
 * - Efficient frontier curve (optimal portfolios)
 * - Current portfolio position
 * - Recommended portfolio position
 * - Interactive point selection
 */
export const EfficientFrontierChart: React.FC<EfficientFrontierChartProps> = ({
  frontierPoints,
  currentPortfolio,
  recommendedPortfolio,
  onPointClick,
  height = 400,
}) => {
  // Sort frontier points by volatility for proper curve rendering
  const sortedFrontierPoints = useMemo(() => {
    return [...frontierPoints].sort((a, b) => a.volatility - b.volatility);
  }, [frontierPoints]);

  // Combine all data points for the chart
  const chartData = useMemo(() => {
    const data = [...sortedFrontierPoints];
    
    if (currentPortfolio) {
      data.push({
        ...currentPortfolio,
        sharpeRatio: 0,
        isOptimal: false,
      });
    }
    
    if (recommendedPortfolio) {
      data.push({
        ...recommendedPortfolio,
        sharpeRatio: 0,
        isOptimal: true,
      });
    }
    
    return data;
  }, [sortedFrontierPoints, currentPortfolio, recommendedPortfolio]);

  return (
    <div className="w-full">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Efficient Frontier
        </h3>
        <p className="text-sm text-gray-600 dark:text-slate-400">
          Risk vs. Return tradeoff. Points on the curve represent optimal portfolios.
        </p>
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <ScatterChart
          margin={{ top: 20, right: 30, bottom: 20, left: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          
          <XAxis
            type="number"
            dataKey="volatility"
            name="Volatility"
            unit="%"
            label={{ value: 'Risk (Volatility %)', position: 'insideBottom', offset: -10 }}
            domain={['auto', 'auto']}
            stroke="#6b7280"
          />
          
          <YAxis
            type="number"
            dataKey="expectedReturn"
            name="Expected Return"
            unit="%"
            label={{ value: 'Expected Return (%)', angle: -90, position: 'insideLeft' }}
            domain={['auto', 'auto']}
            stroke="#6b7280"
          />
          
          <Tooltip content={<CustomTooltip />} />
          
          <Legend />
          
          {/* Efficient Frontier Points */}
          <Scatter
            name="Efficient Frontier"
            data={sortedFrontierPoints}
            fill="#3b82f6"
            line={{ stroke: '#3b82f6', strokeWidth: 2 }}
            shape="circle"
            onClick={(data) => onPointClick?.(data)}
            cursor={onPointClick ? 'pointer' : 'default'}
          />

          {/* Current Portfolio Position */}
          {currentPortfolio && (
            <Scatter
              name="Current Portfolio"
              data={[currentPortfolio]}
              fill="#ef4444"
              shape="diamond"
              legendType="diamond"
            />
          )}

          {/* Recommended Portfolio Position */}
          {recommendedPortfolio && (
            <Scatter
              name="Recommended Portfolio"
              data={[recommendedPortfolio]}
              fill="#10b981"
              shape="star"
              legendType="star"
            />
          )}
        </ScatterChart>
      </ResponsiveContainer>

      {/* Legend Explanation */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
          <span className="text-gray-700 dark:text-slate-300">
            Efficient Frontier (Optimal Portfolios)
          </span>
        </div>

        {currentPortfolio && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 transform rotate-45"></div>
            <span className="text-gray-700 dark:text-slate-300">
              Current Portfolio
            </span>
          </div>
        )}

        {recommendedPortfolio && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500" style={{ clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' }}></div>
            <span className="text-gray-700 dark:text-slate-300">
              Recommended Portfolio
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default EfficientFrontierChart;

