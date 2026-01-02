'use client';

import React from 'react';

export interface ScoreGaugeProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  showLabel?: boolean;
  change?: number;
  className?: string;
}

export type ScoreRating = 'Poor' | 'Fair' | 'Good' | 'Very Good' | 'Excellent';

export const getScoreColor = (score: number): string => {
  if (score >= 800) return '#22C55E'; // Excellent - green-500
  if (score >= 740) return '#84CC16'; // Very Good - lime-500
  if (score >= 670) return '#EAB308'; // Good - yellow-500
  if (score >= 580) return '#F97316'; // Fair - orange-500
  return '#EF4444'; // Poor - red-500
};

export const getScoreLabel = (score: number): ScoreRating => {
  if (score >= 800) return 'Excellent';
  if (score >= 740) return 'Very Good';
  if (score >= 670) return 'Good';
  if (score >= 580) return 'Fair';
  return 'Poor';
};

export const getScoreBgColor = (score: number): string => {
  if (score >= 800) return 'bg-green-100';
  if (score >= 740) return 'bg-lime-100';
  if (score >= 670) return 'bg-yellow-100';
  if (score >= 580) return 'bg-orange-100';
  return 'bg-red-100';
};

export const getScoreTextColor = (score: number): string => {
  if (score >= 800) return 'text-green-600';
  if (score >= 740) return 'text-lime-600';
  if (score >= 670) return 'text-yellow-600';
  if (score >= 580) return 'text-orange-600';
  return 'text-red-600';
};

export default function ScoreGauge({
  score,
  size = 200,
  strokeWidth = 12,
  showLabel = true,
  change,
  className = '',
}: ScoreGaugeProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const minScore = 300;
  const maxScore = 850;
  const normalizedScore = Math.max(minScore, Math.min(maxScore, score));
  const progress = (normalizedScore - minScore) / (maxScore - minScore);
  const strokeDashoffset = circumference - progress * circumference;
  const scoreColor = getScoreColor(score);
  const scoreLabel = getScoreLabel(score);

  // Calculate font sizes based on component size
  const scoreFontSize = Math.round(size * 0.22);
  const labelFontSize = Math.round(size * 0.08);
  const changeFontSize = Math.round(size * 0.065);

  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
      data-testid="score-gauge"
      role="img"
      aria-label={`Credit score ${score}, rated ${scoreLabel}`}
    >
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
        data-testid="score-gauge-svg"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#E5E7EB"
          strokeWidth={strokeWidth}
          fill="transparent"
          data-testid="background-circle"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={scoreColor}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
          data-testid="progress-circle"
        />
      </svg>
      
      {/* Score display in center */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-bold"
          style={{ fontSize: scoreFontSize, color: scoreColor }}
          data-testid="score-value"
        >
          {score}
        </span>
        
        {showLabel && (
          <span
            className="text-gray-600 font-medium mt-1"
            style={{ fontSize: labelFontSize }}
            data-testid="score-label"
          >
            {scoreLabel}
          </span>
        )}
        
        {change !== undefined && change !== 0 && (
          <div
            className={`mt-2 px-2 py-0.5 rounded-full ${
              change >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}
            style={{ fontSize: changeFontSize }}
            data-testid="score-change"
          >
            {change >= 0 ? '+' : ''}{change}
          </div>
        )}
      </div>
    </div>
  );
}

