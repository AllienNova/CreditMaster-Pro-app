"use client";

/**
 * Goal Investment Dashboard
 *
 * Comprehensive dashboard for goal-based investing with:
 * - Goal overview cards with progress
 * - Projection charts and scenarios
 * - Contribution schedule summary
 * - Allocation visualization
 */

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Target,
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
  PieChart,
  BarChart3,
  ChevronRight,
  Plus,
  Settings,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
} from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

export type GoalType =
  | "retirement"
  | "house"
  | "education"
  | "emergency"
  | "vacation"
  | "car"
  | "wedding"
  | "custom";
export type GoalStatus = "on_track" | "ahead" | "behind" | "at_risk";

export interface GoalSummary {
  id: string;
  name: string;
  type: GoalType;
  icon?: string;
  color: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: Date;
  percentComplete: number;
  status: GoalStatus;
  monthlyContribution: number;
  projectedAmount: number;
  isOnTrack: boolean;
}

export interface ProjectionScenario {
  label: string;
  amount: number;
  probability: number;
}

export interface GoalProjectionData {
  goalId: string;
  currentAmount: number;
  targetAmount: number;
  projectedAmount: number;
  scenarios: ProjectionScenario[];
  monthlyDataPoints: { month: string; projected: number; target: number }[];
  requiredMonthlyContribution: number;
  shortfall?: number;
}

export interface AllocationSummary {
  assetClass: string;
  label: string;
  percent: number;
  value: number;
  color: string;
}

export interface GoalInvestmentDashboardProps {
  goals: GoalSummary[];
  totalInvested: number;
  totalProjected: number;
  projectionData?: GoalProjectionData;
  allocations?: AllocationSummary[];
  selectedGoalId?: string;
  onSelectGoal: (goalId: string) => void;
  onAddGoal: () => void;
  onEditGoal: (goalId: string) => void;
  onViewDetails: (goalId: string) => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const GOAL_TYPE_ICONS: Record<GoalType, string> = {
  retirement: "",
  house: "",
  education: "",
  emergency: "",
  vacation: "",
  car: "",
  wedding: "",
  custom: "",
};

const STATUS_CONFIG: Record<
  GoalStatus,
  { color: string; bgColor: string; label: string }
> = {
  on_track: {
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/20",
    label: "On Track",
  },
  ahead: { color: "text-blue-400", bgColor: "bg-blue-500/20", label: "Ahead" },
  behind: {
    color: "text-amber-400",
    bgColor: "bg-amber-500/20",
    label: "Behind",
  },
  at_risk: {
    color: "text-red-400",
    bgColor: "bg-red-500/20",
    label: "At Risk",
  },
};

// ============================================================================
// COMPONENT
// ============================================================================

export function GoalInvestmentDashboard({
  goals,
  totalInvested,
  totalProjected,
  projectionData,
  allocations,
  selectedGoalId,
  onSelectGoal,
  onAddGoal,
  onEditGoal,
  onViewDetails,
}: GoalInvestmentDashboardProps) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const selectedGoal = useMemo(
    () => goals.find((g) => g.id === selectedGoalId),
    [goals, selectedGoalId],
  );

  const overallProgress = useMemo(() => {
    if (goals.length === 0) return 0;
    const totalTarget = goals.reduce((sum, g) => sum + g.targetAmount, 0);
    const totalCurrent = goals.reduce((sum, g) => sum + g.currentAmount, 0);
    return totalTarget > 0 ? (totalCurrent / totalTarget) * 100 : 0;
  }, [goals]);

  const goalsOnTrack = useMemo(
    () =>
      goals.filter((g) => g.status === "on_track" || g.status === "ahead")
        .length,
    [goals],
  );

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Target className="w-5 h-5" />}
          label="Active Goals"
          value={goals.length.toString()}
          subValue={`${goalsOnTrack} on track`}
          color="blue"
        />
        <StatCard
          icon={<DollarSign className="w-5 h-5" />}
          label="Total Invested"
          value={`$${totalInvested.toLocaleString()}`}
          subValue={`${overallProgress.toFixed(1)}% of targets`}
          color="emerald"
        />
        <StatCard
          icon={<TrendingUp className="w-5 h-5" />}
          label="Projected Value"
          value={`$${totalProjected.toLocaleString()}`}
          subValue="at current growth"
          color="purple"
        />
        <StatCard
          icon={<Calendar className="w-5 h-5" />}
          label="Monthly Contributions"
          value={`$${goals.reduce((sum, g) => sum + g.monthlyContribution, 0).toLocaleString()}`}
          subValue="across all goals"
          color="amber"
        />
      </div>

      {/* Goals Grid */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Your Goals</h2>
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => setViewMode("grid")}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  viewMode === "grid"
                    ? "bg-gray-700 text-white"
                    : "text-gray-400 dark:text-slate-500 hover:text-white"
                }`}
              >
                Grid
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  viewMode === "list"
                    ? "bg-gray-700 text-white"
                    : "text-gray-400 dark:text-slate-500 hover:text-white"
                }`}
              >
                List
              </button>
            </div>
            <button
              onClick={onAddGoal}
              className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-500 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Goal
            </button>
          </div>
        </div>

        {goals.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Target className="w-12 h-12 text-gray-600 dark:text-slate-300 mx-auto mb-3" />
            <p className="text-gray-400 dark:text-slate-500">No goals yet</p>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
              Create your first investment goal to get started
            </p>
            <button
              onClick={onAddGoal}
              className="mt-4 px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-500 rounded-lg inline-flex items-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Goal
            </button>
          </div>
        ) : viewMode === "grid" ? (
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {goals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                isSelected={goal.id === selectedGoalId}
                onSelect={() => onSelectGoal(goal.id)}
                onEdit={() => onEditGoal(goal.id)}
                onViewDetails={() => onViewDetails(goal.id)}
              />
            ))}
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {goals.map((goal) => (
              <GoalListItem
                key={goal.id}
                goal={goal}
                isSelected={goal.id === selectedGoalId}
                onSelect={() => onSelectGoal(goal.id)}
                onViewDetails={() => onViewDetails(goal.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Projection & Allocation Section */}
      {selectedGoal && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Projection Panel */}
          {projectionData && (
            <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-800">
                <h3 className="text-lg font-semibold text-white">Projection</h3>
                <p className="text-sm text-gray-400 dark:text-slate-500">
                  {selectedGoal.name}
                </p>
              </div>
              <div className="p-6 space-y-6">
                {/* Scenario Bars */}
                <div className="space-y-3">
                  {projectionData.scenarios.map((scenario, idx) => (
                    <div key={idx}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-400 dark:text-slate-500">
                          {scenario.label}
                        </span>
                        <span className="text-white font-medium">
                          ${scenario.amount.toLocaleString()}
                        </span>
                      </div>
                      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            idx === 0
                              ? "bg-red-500/60"
                              : idx === 1
                                ? "bg-blue-500"
                                : "bg-emerald-500/60"
                          }`}
                          style={{
                            width: `${(scenario.amount / projectionData.targetAmount) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}

                  {/* Target Line */}
                  <div className="relative pt-2">
                    <div className="absolute left-0 right-0 top-0 h-px bg-amber-500" />
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-amber-400">Target</span>
                      <span className="text-amber-400 font-medium">
                        ${projectionData.targetAmount.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Shortfall Warning */}
                {projectionData.shortfall && projectionData.shortfall > 0 && (
                  <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-amber-200">
                          Potential Shortfall: $
                          {projectionData.shortfall.toLocaleString()}
                        </p>
                        <p className="text-xs text-amber-300/70 mt-1">
                          Consider increasing monthly contribution to $
                          {projectionData.requiredMonthlyContribution.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action */}
                <button
                  onClick={() => onViewDetails(selectedGoal.id)}
                  className="w-full py-2 text-sm text-blue-400 hover:text-blue-300 border border-blue-500/30 hover:border-blue-500/50 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  View Detailed Projections
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Allocation Panel */}
          {allocations && allocations.length > 0 && (
            <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-800">
                <h3 className="text-lg font-semibold text-white">Allocation</h3>
                <p className="text-sm text-gray-400 dark:text-slate-500">
                  {selectedGoal.name}
                </p>
              </div>
              <div className="p-6">
                {/* Pie Chart Placeholder */}
                <div className="flex justify-center mb-6">
                  <div className="relative w-40 h-40">
                    <svg
                      viewBox="0 0 100 100"
                      className="w-full h-full -rotate-90"
                    >
                      {
                        allocations.reduce(
                          (acc, alloc, idx) => {
                            const startAngle = acc.offset;
                            const angle = (alloc.percent / 100) * 360;
                            const endAngle = startAngle + angle;

                            const startRad = (startAngle * Math.PI) / 180;
                            const endRad = (endAngle * Math.PI) / 180;

                            const x1 = 50 + 40 * Math.cos(startRad);
                            const y1 = 50 + 40 * Math.sin(startRad);
                            const x2 = 50 + 40 * Math.cos(endRad);
                            const y2 = 50 + 40 * Math.sin(endRad);

                            const largeArc = angle > 180 ? 1 : 0;

                            acc.elements.push(
                              <path
                                key={idx}
                                d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`}
                                fill={alloc.color}
                                className="hover:opacity-80 transition-opacity cursor-pointer"
                              />,
                            );

                            return { elements: acc.elements, offset: endAngle };
                          },
                          { elements: [] as React.ReactNode[], offset: 0 },
                        ).elements
                      }
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-white">
                          $
                          {(
                            allocations.reduce((sum, a) => sum + a.value, 0) /
                            1000
                          ).toFixed(1)}
                          K
                        </p>
                        <p className="text-xs text-gray-500 dark:text-slate-400">
                          Total
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Allocation List */}
                <div className="space-y-2">
                  {allocations.map((alloc, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: alloc.color }}
                        />
                        <span className="text-sm text-gray-300">
                          {alloc.label}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm text-white font-medium">
                          {alloc.percent}%
                        </span>
                        <span className="text-xs text-gray-500 dark:text-slate-400 ml-2">
                          ${alloc.value.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function StatCard({
  icon,
  label,
  value,
  subValue,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subValue: string;
  color: "blue" | "emerald" | "purple" | "amber";
}) {
  const colorClasses = {
    blue: "bg-blue-500/10 text-blue-400",
    emerald: "bg-emerald-500/10 text-emerald-400",
    purple: "bg-blue-500/10 text-blue-400",
    amber: "bg-amber-500/10 text-amber-400",
  };

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>{icon}</div>
        <span className="text-sm text-gray-400 dark:text-slate-500">
          {label}
        </span>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
        {subValue}
      </p>
    </div>
  );
}

function GoalCard({
  goal,
  isSelected,
  onSelect,
  onEdit,
  onViewDetails,
}: {
  goal: GoalSummary;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onViewDetails: () => void;
}) {
  const statusConfig = STATUS_CONFIG[goal.status];

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={`bg-gray-800/50 rounded-xl border cursor-pointer transition-colors ${
        isSelected ? "border-blue-500" : "border-gray-700 hover:border-gray-600"
      }`}
      onClick={onSelect}
    >
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">
              {goal.icon || GOAL_TYPE_ICONS[goal.type]}
            </span>
            <div>
              <h3 className="font-medium text-white">{goal.name}</h3>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${statusConfig.bgColor} ${statusConfig.color}`}
              >
                {statusConfig.label}
              </span>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="p-1.5 text-gray-500 dark:text-slate-400 hover:text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="mb-3">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-gray-400 dark:text-slate-500">Progress</span>
            <span className="text-white font-medium">
              {goal.percentComplete.toFixed(1)}%
            </span>
          </div>
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, goal.percentComplete)}%`,
                backgroundColor: goal.color,
              }}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-gray-500 dark:text-slate-400">Current</p>
            <p className="text-white font-medium">
              ${goal.currentAmount.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-gray-500 dark:text-slate-400">Target</p>
            <p className="text-white font-medium">
              ${goal.targetAmount.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-3 pt-3 border-t border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-slate-400">
            <Clock className="w-3 h-3" />
            <span>{new Date(goal.targetDate).toLocaleDateString()}</span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails();
            }}
            className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
          >
            Details
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function GoalListItem({
  goal,
  isSelected,
  onSelect,
  onViewDetails,
}: {
  goal: GoalSummary;
  isSelected: boolean;
  onSelect: () => void;
  onViewDetails: () => void;
}) {
  const statusConfig = STATUS_CONFIG[goal.status];

  return (
    <div
      className={`px-6 py-4 cursor-pointer transition-colors ${
        isSelected ? "bg-blue-500/10" : "hover:bg-gray-800/50"
      }`}
      onClick={onSelect}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-2xl">
            {goal.icon || GOAL_TYPE_ICONS[goal.type]}
          </span>
          <div>
            <h3 className="font-medium text-white">{goal.name}</h3>
            <div className="flex items-center gap-3 mt-1">
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${statusConfig.bgColor} ${statusConfig.color}`}
              >
                {statusConfig.label}
              </span>
              <span className="text-xs text-gray-500 dark:text-slate-400">
                Due {new Date(goal.targetDate).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-8">
          <div className="text-right">
            <p className="text-sm text-white font-medium">
              ${goal.currentAmount.toLocaleString()} / $
              {goal.targetAmount.toLocaleString()}
            </p>
            <div className="w-32 h-1.5 bg-gray-700 rounded-full mt-1 overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(100, goal.percentComplete)}%`,
                  backgroundColor: goal.color,
                }}
              />
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-400 dark:text-slate-500">Monthly</p>
            <p className="text-sm text-white font-medium">
              ${goal.monthlyContribution.toLocaleString()}
            </p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails();
            }}
            className="p-2 text-gray-400 dark:text-slate-500 hover:text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default GoalInvestmentDashboard;
