'use client';

import { CreditScoreHistory } from '@/lib/credit-monitoring/credit-monitoring-service';
import { useState } from 'react';

interface CreditScoreChartProps {
  history: CreditScoreHistory[];
}

export default function CreditScoreChart({ history }: CreditScoreChartProps) {
  const [selectedBureaus, setSelectedBureaus] = useState<string[]>(['experian', 'equifax', 'transunion']);
  const [timeRange, setTimeRange] = useState<'30' | '90' | '180' | '365'>('365');

  const getBureauColor = (bureau: string): string => {
    switch (bureau) {
      case 'experian':
        return '#ef4444'; // red
      case 'equifax':
        return '#3b82f6'; // blue
      case 'transunion':
        return '#8b5cf6'; // purple
      default:
        return '#6b7280'; // gray
    }
  };

  const toggleBureau = (bureau: string) => {
    setSelectedBureaus(prev =>
      prev.includes(bureau)
        ? prev.filter(b => b !== bureau)
        : [...prev, bureau]
    );
  };

  // Filter data by time range
  const filterByTimeRange = (scores: Array<{ date: Date; score: number }>) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(timeRange));
    return scores.filter(s => s.date >= cutoffDate);
  };

  // Get all unique dates across all bureaus
  const getAllDates = (): Date[] => {
    const dates = new Set<string>();
    history.forEach(bureauHistory => {
      const filtered = filterByTimeRange(bureauHistory.scores);
      filtered.forEach(score => {
        dates.add(score.date.toISOString().split('T')[0]);
      });
    });
    return Array.from(dates)
      .sort()
      .map(d => new Date(d));
  };

  const allDates = getAllDates();

  // Calculate chart dimensions
  const chartWidth = 800;
  const chartHeight = 400;
  const padding = { top: 20, right: 20, bottom: 40, left: 60 };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  // Calculate scales
  const minScore = 300;
  const maxScore = 850;
  const scoreRange = maxScore - minScore;

  const getX = (index: number): number => {
    return padding.left + (index / (allDates.length - 1 || 1)) * innerWidth;
  };

  const getY = (score: number): number => {
    return padding.top + innerHeight - ((score - minScore) / scoreRange) * innerHeight;
  };

  // Generate path for each bureau
  const generatePath = (bureauHistory: CreditScoreHistory): string => {
    const filtered = filterByTimeRange(bureauHistory.scores);
    if (filtered.length === 0) return '';

    const points = allDates.map((date, index) => {
      const score = filtered.find(s =>
        s.date.toISOString().split('T')[0] === date.toISOString().split('T')[0]
      );
      if (!score) return null;
      return { x: getX(index), y: getY(score.score) };
    }).filter(p => p !== null);

    if (points.length === 0) return '';

    return points.map((p, i) =>
      i === 0 ? `M ${p!.x} ${p!.y}` : `L ${p!.x} ${p!.y}`
    ).join(' ');
  };

  if (history.length === 0 || allDates.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 dark:text-slate-500 text-6xl mb-4"></div>
        <p className="text-gray-600 dark:text-slate-300">No score history available</p>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-2">
          Scores will appear here once you start tracking
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        {/* Bureau Toggles */}
        <div className="flex gap-2">
          {history.map(bureauHistory => (
            <button
              key={bureauHistory.bureau}
              type="button"
              onClick={() => toggleBureau(bureauHistory.bureau)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${ selectedBureaus.includes(bureauHistory.bureau) ? 'text-white' : 'bg-gray-100 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:bg-slate-700' }`}
              style={{
                backgroundColor: selectedBureaus.includes(bureauHistory.bureau)
                  ? getBureauColor(bureauHistory.bureau)
                  : undefined,
              }}
            >
              {bureauHistory.bureau.charAt(0).toUpperCase() + bureauHistory.bureau.slice(1)}
            </button>
          ))}
        </div>

        {/* Time Range */}
        <div className="flex gap-2">
          {(['30', '90', '180', '365'] as const).map(range => (
            <button
              key={range}
              type="button"
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 rounded text-sm ${ timeRange === range ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:bg-slate-700' }`}
            >
              {range}d
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="overflow-x-auto">
        <svg width={chartWidth} height={chartHeight} className="mx-auto">
          {/* Grid lines */}
          {[300, 400, 500, 600, 700, 800].map(score => (
            <g key={score}>
              <line
                x1={padding.left}
                y1={getY(score)}
                x2={chartWidth - padding.right}
                y2={getY(score)}
                stroke="#e5e7eb"
                strokeWidth="1"
              />
              <text
                x={padding.left - 10}
                y={getY(score) + 4}
                textAnchor="end"
                fontSize="12"
                fill="#6b7280"
              >
                {score}
              </text>
            </g>
          ))}

          {/* X-axis labels */}
          {allDates.filter((_, i) => i % Math.ceil(allDates.length / 6) === 0).map((date, i) => {
            const index = allDates.indexOf(date);
            return (
              <text
                key={i}
                x={getX(index)}
                y={chartHeight - padding.bottom + 20}
                textAnchor="middle"
                fontSize="12"
                fill="#6b7280"
              >
                {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </text>
            );
          })}

          {/* Lines */}
          {history
            .filter(bureauHistory => selectedBureaus.includes(bureauHistory.bureau))
            .map(bureauHistory => (
              <path
                key={bureauHistory.bureau}
                d={generatePath(bureauHistory)}
                fill="none"
                stroke={getBureauColor(bureauHistory.bureau)}
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}

          {/* Data points */}
          {history
            .filter(bureauHistory => selectedBureaus.includes(bureauHistory.bureau))
            .map(bureauHistory => {
              const filtered = filterByTimeRange(bureauHistory.scores);
              return filtered.map((score, i) => {
                const dateIndex = allDates.findIndex(d =>
                  d.toISOString().split('T')[0] === score.date.toISOString().split('T')[0]
                );
                if (dateIndex === -1) return null;
                return (
                  <circle
                    key={`${bureauHistory.bureau}-${i}`}
                    cx={getX(dateIndex)}
                    cy={getY(score.score)}
                    r="4"
                    fill={getBureauColor(bureauHistory.bureau)}
                    stroke="white"
                    strokeWidth="2"
                  />
                );
              });
            })}
        </svg>
      </div>
    </div>
  );
}
