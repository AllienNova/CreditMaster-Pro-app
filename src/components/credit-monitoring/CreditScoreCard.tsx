'use client';

import { Bureau } from '@/lib/credit-monitoring/credit-monitoring-service';

interface CreditScoreCardProps {
  bureau: Bureau;
  score?: number;
  change?: number;
}

export default function CreditScoreCard({ bureau, score, change }: CreditScoreCardProps) {
  const getBureauColor = (bureau: Bureau): string => {
    switch (bureau) {
      case 'experian':
        return 'from-red-500 to-red-600';
      case 'equifax':
        return 'from-blue-500 to-blue-600';
      case 'transunion':
        return 'from-blue-500 to-blue-600';
    }
  };

  const getBureauName = (bureau: Bureau): string => {
    return bureau.charAt(0).toUpperCase() + bureau.slice(1);
  };

  const getScoreRating = (score: number): { label: string; color: string } => {
    if (score >= 800) return { label: 'Excellent', color: 'text-green-600' };
    if (score >= 740) return { label: 'Very Good', color: 'text-blue-600' };
    if (score >= 670) return { label: 'Good', color: 'text-yellow-600' };
    if (score >= 580) return { label: 'Fair', color: 'text-orange-600' };
    return { label: 'Poor', color: 'text-red-600' };
  };

  if (!score) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{getBureauName(bureau)}</h3>
          <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${getBureauColor(bureau)} flex items-center justify-center text-white text-xl`}>
            {bureau.charAt(0).toUpperCase()}
          </div>
        </div>
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-slate-400">No score available</p>
          <button
            type="button"
            className="mt-4 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            Import Score
          </button>
        </div>
      </div>
    );
  }

  const rating = getScoreRating(score);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{getBureauName(bureau)}</h3>
        <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${getBureauColor(bureau)} flex items-center justify-center text-white text-xl`}>
          {bureau.charAt(0).toUpperCase()}
        </div>
      </div>
      
      <div className="mb-4">
        <div className="text-4xl font-bold text-gray-900 dark:text-white">{score}</div>
        <div className={`text-sm font-semibold ${rating.color} mt-1`}>{rating.label}</div>
      </div>
      
      {change !== undefined && change !== 0 && (
        <div className="flex items-center gap-2">
          <span className={`text-sm font-semibold ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {change >= 0 ? '↑' : '↓'} {Math.abs(change)} points
          </span>
          <span className="text-xs text-gray-500 dark:text-slate-400">30 days</span>
        </div>
      )}
      
      {/* Score Range Bar */}
      <div className="mt-4">
        <div className="h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-full bg-gradient-to-r ${getBureauColor(bureau)}`}
            style={{ width: `${(score / 850) * 100}%` }}
          ></div>
        </div>
        <div className="flex justify-between text-xs text-gray-500 dark:text-slate-400 mt-1">
          <span>300</span>
          <span>850</span>
        </div>
      </div>
    </div>
  );
}

