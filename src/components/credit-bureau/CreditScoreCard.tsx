"use client";

import { useState } from "react";

interface CreditScoreCardProps {
  score: number;
  bureau: "experian" | "equifax" | "transunion";
  previousScore?: number;
  lastUpdated: Date;
  factors?: {
    positive: string[];
    negative: string[];
  };
}

export default function CreditScoreCard({
  score,
  bureau,
  previousScore,
  lastUpdated,
  factors,
}: CreditScoreCardProps) {
  const [showFactors, setShowFactors] = useState(false);

  // Calculate score change
  const scoreChange = previousScore ? score - previousScore : 0;
  const scoreChangePercent = previousScore
    ? ((scoreChange / previousScore) * 100).toFixed(1)
    : "0";

  // Determine score rating
  const getScoreRating = (score: number) => {
    if (score >= 800)
      return { label: "Excellent", color: "text-green-600", bg: "bg-green-50" };
    if (score >= 740)
      return { label: "Very Good", color: "text-blue-600", bg: "bg-blue-50" };
    if (score >= 670)
      return { label: "Good", color: "text-blue-600", bg: "bg-blue-50" };
    if (score >= 580)
      return { label: "Fair", color: "text-yellow-600", bg: "bg-yellow-50" };
    return { label: "Poor", color: "text-red-600", bg: "bg-red-50" };
  };

  const rating = getScoreRating(score);

  // Bureau colors
  const bureauColors = {
    experian: "from-blue-500 to-blue-600",
    equifax: "from-red-500 to-red-600",
    transunion: "from-blue-500 to-blue-600",
  };

  // Bureau names
  const bureauNames = {
    experian: "Experian",
    equifax: "Equifax",
    transunion: "TransUnion",
  };

  // Calculate gauge rotation (score range 300-850)
  const minScore = 300;
  const maxScore = 850;
  const normalizedScore = ((score - minScore) / (maxScore - minScore)) * 180;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-slate-700 hover:shadow-xl transition-shadow">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div
            className={`w-3 h-3 rounded-full bg-gradient-to-r ${bureauColors[bureau]}`}
          />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {bureauNames[bureau]}
          </h3>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-sm font-medium ${rating.bg} ${rating.color}`}
        >
          {rating.label}
        </span>
      </div>

      {/* Score Display */}
      <div className="text-center mb-6">
        <div className="relative inline-block">
          {/* Gauge Background */}
          <svg className="w-48 h-24" viewBox="0 0 200 100">
            {/* Background arc */}
            <path
              d="M 20 80 A 80 80 0 0 1 180 80"
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="12"
              strokeLinecap="round"
            />
            {/* Score arc */}
            <path
              d="M 20 80 A 80 80 0 0 1 180 80"
              fill="none"
              stroke="url(#scoreGradient)"
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={`${normalizedScore * 2.51} 1000`}
            />
            {/* Gradient definition */}
            <defs>
              <linearGradient
                id="scoreGradient"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="0%"
              >
                <stop offset="0%" stopColor="#ef4444" />
                <stop offset="50%" stopColor="#eab308" />
                <stop offset="100%" stopColor="#22c55e" />
              </linearGradient>
            </defs>
          </svg>

          {/* Score Number */}
          <div className="absolute inset-0 flex flex-col items-center justify-center mt-4">
            <div className="text-5xl font-bold text-gray-900 dark:text-white">
              {score}
            </div>
            <div className="text-sm text-gray-500 dark:text-slate-400">
              out of 850
            </div>
          </div>
        </div>

        {/* Score Change */}
        {previousScore && (
          <div className="mt-4 flex items-center justify-center space-x-2">
            {scoreChange > 0 ? (
              <>
                <svg
                  className="w-5 h-5 text-green-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-green-600 font-semibold">
                  +{scoreChange} points ({scoreChangePercent}%)
                </span>
              </>
            ) : scoreChange < 0 ? (
              <>
                <svg
                  className="w-5 h-5 text-red-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-red-600 font-semibold">
                  {scoreChange} points ({scoreChangePercent}%)
                </span>
              </>
            ) : (
              <span className="text-gray-500 dark:text-slate-400 font-semibold">
                No change
              </span>
            )}
          </div>
        )}
      </div>

      {/* Last Updated */}
      <div className="text-center text-sm text-gray-500 dark:text-slate-400 mb-4">
        Last updated:{" "}
        {lastUpdated.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}
      </div>

      {/* Score Factors */}
      {factors && (
        <div className="border-t border-gray-200 dark:border-slate-700 pt-4">
          <button
            onClick={() => setShowFactors(!showFactors)}
            className="w-full flex items-center justify-between text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-white dark:hover:text-white"
          >
            <span>Score Factors</span>
            <svg
              className={`w-5 h-5 transition-transform ${showFactors ? "rotate-180" : ""}`}
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
          </button>

          {showFactors && (
            <div className="mt-4 space-y-4">
              {/* Positive Factors */}
              {factors.positive.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-green-600 mb-2 flex items-center">
                    <svg
                      className="w-4 h-4 mr-1"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Positive Factors
                  </h4>
                  <ul className="space-y-1">
                    {factors.positive.map((factor, index) => (
                      <li
                        key={index}
                        className="text-sm text-gray-600 dark:text-slate-300 pl-5"
                      >
                        • {factor}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Negative Factors */}
              {factors.negative.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-red-600 mb-2 flex items-center">
                    <svg
                      className="w-4 h-4 mr-1"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Negative Factors
                  </h4>
                  <ul className="space-y-1">
                    {factors.negative.map((factor, index) => (
                      <li
                        key={index}
                        className="text-sm text-gray-600 dark:text-slate-300 pl-5"
                      >
                        • {factor}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Action Button */}
      <div className="mt-6">
        <button
          className={`w-full py-2 px-4 rounded-lg font-medium text-white bg-gradient-to-r ${bureauColors[bureau]} hover:opacity-90 transition-opacity`}
        >
          View Full Report
        </button>
      </div>
    </div>
  );
}
