'use client';

/**
 * Milestone Timeline Component
 * 
 * Visual timeline of goal milestones and achievements.
 */

interface Milestone {
  id: string;
  amount: number;
  date: Date;
  achieved: boolean;
  description: string;
}

interface MilestoneTimelineProps {
  milestones: Milestone[];
}

export default function MilestoneTimeline({ milestones }: MilestoneTimelineProps) {
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(date));
  };

  const sortedMilestones = [...milestones].sort((a, b) => a.amount - b.amount);

  return (
    <div className="space-y-4">
      {sortedMilestones.map((milestone, index) => (
        <div key={milestone.id} className="relative flex items-start gap-4">
          {/* Timeline Line */}
          {index < sortedMilestones.length - 1 && (
            <div className="absolute left-4 top-8 bottom-0 w-0.5 bg-gray-200 dark:bg-slate-700"></div>
          )}

          {/* Milestone Marker */}
          <div className={`relative z-10 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
            milestone.achieved 
              ? 'bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg shadow-green-500/50' 
              : 'bg-gray-200 dark:bg-slate-700'
          }`}>
            {milestone.achieved ? (
              <span className="text-white text-sm"></span>
            ) : (
              <span className="text-gray-500 dark:text-slate-400 text-sm">{index + 1}</span>
            )}
          </div>

          {/* Milestone Content */}
          <div className={`flex-1 p-3 rounded-lg border ${
            milestone.achieved 
              ? 'bg-green-50 border-green-200' 
              : 'bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700'
          }`}>
            <div className="flex items-start justify-between mb-1">
              <div className="flex-1">
                <div className="font-medium text-gray-900 dark:text-white">
                  {formatCurrency(milestone.amount)}
                </div>
                <div className="text-sm text-gray-600 dark:text-slate-300">{milestone.description}</div>
              </div>
              {milestone.achieved && (
                <span className="text-xl animate-bounce"></span>
              )}
            </div>
            <div className="text-xs text-gray-500 dark:text-slate-400">
              Target: {formatDate(milestone.date)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

