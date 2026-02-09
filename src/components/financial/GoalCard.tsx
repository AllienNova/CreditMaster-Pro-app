'use client';

/**
 * Goal Card Component
 * 
 * Individual goal display with progress visualization, milestones, and actions.
 */

import { useState } from 'react';
import GoalProgressBar from './GoalProgressBar';
import MilestoneTimeline from './MilestoneTimeline';

interface Milestone {
  id: string;
  amount: number;
  date: Date;
  achieved: boolean;
  description: string;
}

interface FinancialGoal {
  id: string;
  type: 'emergency_fund' | 'debt_payoff' | 'savings' | 'investment' | 'retirement' | 'custom';
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  status: 'active' | 'completed' | 'paused';
  autoSaveEnabled?: boolean;
  autoSaveAmount?: number;
  milestones?: Milestone[];
  createdAt: string;
}

interface GoalCardProps {
  goal: FinancialGoal;
  onEdit: (goal: FinancialGoal) => void;
  onDelete: (goalId: string) => void;
  onToggleAutoSave: (goalId: string, enabled: boolean) => void;
}

export default function GoalCard({ goal, onEdit, onDelete, onToggleAutoSave }: GoalCardProps) {
  const [showMilestones, setShowMilestones] = useState(false);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getProgress = (): number => {
    return Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
  };

  const getDaysRemaining = (): number => {
    const now = new Date();
    const target = new Date(goal.targetDate);
    const diff = target.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const getGoalIcon = (type: string): string => {
    switch (type) {
      case 'emergency_fund': return '';
      case 'debt_payoff': return '';
      case 'savings': return '';
      case 'investment': return '';
      case 'retirement': return '';
      default: return '';
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700';
      case 'active': return 'bg-blue-100 text-blue-700';
      case 'paused': return 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-200';
      default: return 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-200';
    }
  };

  const progress = getProgress();
  const daysRemaining = getDaysRemaining();

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-4xl">{getGoalIcon(goal.type)}</span>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{goal.name}</h3>
            <span className={`inline-block text-xs px-2 py-1 rounded-full ${getStatusColor(goal.status)}`}>
              {goal.status}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onEdit(goal)}
            className="p-2 text-gray-600 dark:text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            aria-label="Edit goal"
          >
                      </button>
          <button
            onClick={() => onDelete(goal.id)}
            className="p-2 text-gray-600 dark:text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            aria-label="Delete goal"
          >
                      </button>
        </div>
      </div>

      {/* Progress */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-slate-200">Progress</span>
          <span className="text-sm font-semibold text-gray-900 dark:text-white">
            {formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}
          </span>
        </div>
        <GoalProgressBar progress={progress} />
        <div className="flex items-center justify-between mt-2 text-xs text-gray-500 dark:text-slate-400">
          <span>{progress.toFixed(1)}% complete</span>
          <span>{daysRemaining > 0 ? `${daysRemaining} days left` : 'Overdue'}</span>
        </div>
      </div>

      {/* Auto-Save Toggle */}
      {goal.status === 'active' && (
        <div className="mb-4 p-3 bg-gradient-to-br from-blue-50 to-blue-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900 dark:text-white">Auto-Save</div>
              <div className="text-xs text-gray-600 dark:text-slate-300">
                {goal.autoSaveEnabled 
                  ? `${formatCurrency(goal.autoSaveAmount || 0)}/month` 
                  : 'Not enabled'}
              </div>
            </div>
            <button
              onClick={() => onToggleAutoSave(goal.id, !goal.autoSaveEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                goal.autoSaveEnabled ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-slate-800 transition-transform ${
                  goal.autoSaveEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      )}

      {/* Milestones Toggle */}
      {goal.milestones && goal.milestones.length > 0 && (
        <div>
          <button
            onClick={() => setShowMilestones(!showMilestones)}
            className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 dark:hover:bg-slate-700 dark:bg-slate-800 rounded-lg transition-colors"
          >
            <span className="text-sm font-medium text-gray-700 dark:text-slate-200">
              Milestones ({goal.milestones.filter(m => m.achieved).length}/{goal.milestones.length})
            </span>
            <span className="text-gray-500 dark:text-slate-400">{showMilestones ? '▲' : '▼'}</span>
          </button>

          {showMilestones && (
            <div className="mt-3">
              <MilestoneTimeline milestones={goal.milestones} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

