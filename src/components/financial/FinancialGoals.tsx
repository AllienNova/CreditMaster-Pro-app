"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { EmptyState } from "@/components/ui/EmptyState";
import AIGoalsOptimizer from "./AIGoalsOptimizer";
import GoalInvestmentDashboard, {
  type GoalSummary,
  type GoalProjectionData,
  type AllocationSummary,
  type GoalStatus as InvestmentGoalStatus,
  type GoalType as InvestmentGoalType,
} from "@/components/goals/GoalInvestmentDashboard";

interface FinancialGoal {
  id: string;
  type: "emergency_fund" | "debt_payoff" | "savings" | "investment" | "custom";
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: Date;
  status: "active" | "completed" | "paused";
  createdAt: Date;
}

export default function FinancialGoals() {
  const { user, loading: authLoading } = useAuth();
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showInvestmentView, setShowInvestmentView] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState<string | undefined>();
  const [investmentProjection, setInvestmentProjection] = useState<GoalProjectionData | undefined>();
  const [investmentAllocations, setInvestmentAllocations] = useState<AllocationSummary[] | undefined>();
  const [newGoal, setNewGoal] = useState({
    type: "savings" as FinancialGoal["type"],
    name: "",
    targetAmount: "",
    currentAmount: "",
    targetDate: "",
  });

  const fetchGoals = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);

      const response = await fetch(`/api/financial/goals`);
      if (!response.ok) throw new Error("Failed to fetch goals");

      const data = await response.json();
      setGoals(data.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load goals");
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchGoalInvestmentData = useCallback(async (goalId: string) => {
    try {
      const response = await fetch(`/api/financial/goals/${goalId}/investment`);
      if (!response.ok) return;
      const data = await response.json();
      if (!data.success) return;

      const inv = data.data;
      setInvestmentProjection({
        goalId,
        currentAmount: inv.currentAmount,
        targetAmount: inv.targetAmount,
        projectedAmount: inv.projection.projectedAmount,
        scenarios: inv.projection.scenarios,
        monthlyDataPoints: inv.projection.monthlyDataPoints,
        requiredMonthlyContribution: inv.projection.requiredMonthlyContribution,
        shortfall: inv.projection.shortfall,
      });

      setInvestmentAllocations(
        inv.allocation.map((a: { assetClass: string; label: string; percent: number; value: number; color: string }) => ({
          assetClass: a.assetClass,
          label: a.label,
          percent: a.percent,
          value: a.value,
          color: a.color,
        })),
      );
    } catch {
      // Investment data is supplementary; silently ignore fetch failures
    }
  }, []);

  const handleSelectGoal = useCallback(
    (goalId: string) => {
      setSelectedGoalId(goalId);
      void fetchGoalInvestmentData(goalId);
    },
    [fetchGoalInvestmentData],
  );

  useEffect(() => {
    if (!authLoading && user) {
      void fetchGoals();
    }
  }, [authLoading, user, fetchGoals]);

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Use authenticated user ID from context
      const userId = user?.id || "";
      if (!userId) {
        throw new Error("Authentication required");
      }

      const response = await fetch("/api/financial/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          type: newGoal.type,
          name: newGoal.name,
          targetAmount: parseFloat(newGoal.targetAmount),
          currentAmount: newGoal.currentAmount
            ? parseFloat(newGoal.currentAmount)
            : 0,
          targetDate: new Date(newGoal.targetDate),
        }),
      });

      if (!response.ok) throw new Error("Failed to create goal");

      await fetchGoals();
      setShowCreateModal(false);
      setNewGoal({
        type: "savings",
        name: "",
        targetAmount: "",
        currentAmount: "",
        targetDate: "",
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create goal");
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getProgress = (current: number, target: number): number => {
    return Math.min((current / target) * 100, 100);
  };

  const getDaysRemaining = (targetDate: Date): number => {
    const now = new Date();
    const diff = targetDate.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const getGoalIcon = (type: string): string => {
    const icons: Record<string, string> = {
      emergency_fund: "",
      debt_payoff: "",
      savings: "",
      investment: "",
      custom: "",
    };
    return icons[type] || "";
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "active":
        return "bg-blue-100 text-blue-800";
      case "paused":
        return "bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-slate-100";
      default:
        return "bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-slate-100";
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white dark:bg-slate-800 rounded-lg shadow p-6"
            >
              <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/2 mb-4"></div>
              <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
        <div className="text-center py-12">
          <div className="text-red-600 text-xl mb-4"></div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Error Loading Goals
          </h3>
          <p className="text-gray-600 dark:text-slate-300 mb-4">{error}</p>
          <button
            type="button"
            onClick={fetchGoals}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const activeGoals = goals.filter((g) => g.status === "active");
  const completedGoals = goals.filter((g) => g.status === "completed");
  const totalTarget = goals.reduce((sum, g) => sum + g.targetAmount, 0);
  const totalCurrent = goals.reduce((sum, g) => sum + g.currentAmount, 0);

  return (
    <div className="space-y-6">
      {/* AI Goals Optimizer - NEW */}
      <AIGoalsOptimizer />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-600 dark:text-slate-300">
              Total Goals
            </h3>
            <span className="text-2xl"></span>
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            {goals.length}
          </div>
          <div className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            {activeGoals.length} active
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-600 dark:text-slate-300">
              Target Amount
            </h3>
            <span className="text-2xl"></span>
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(totalTarget)}
          </div>
          <div className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            Total target
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-600 dark:text-slate-300">
              Current Progress
            </h3>
            <span className="text-2xl"></span>
          </div>
          <div className="text-3xl font-bold text-blue-600">
            {formatCurrency(totalCurrent)}
          </div>
          <div className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            {totalTarget > 0
              ? `${((totalCurrent / totalTarget) * 100).toFixed(1)}%`
              : "0%"}{" "}
            complete
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-600 dark:text-slate-300">
              Completed
            </h3>
            <span className="text-2xl"></span>
          </div>
          <div className="text-3xl font-bold text-green-600">
            {completedGoals.length}
          </div>
          <div className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            Goals achieved
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3">
        {goals.length > 0 && (
          <button
            type="button"
            onClick={() => setShowInvestmentView(!showInvestmentView)}
            className={`px-6 py-3 rounded-lg transition-colors font-semibold ${
              showInvestmentView
                ? "bg-purple-600 text-white hover:bg-purple-700"
                : "border border-purple-300 dark:border-purple-600 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20"
            }`}
          >
            {showInvestmentView ? "Hide Investment View" : "Investment View"}
          </button>
        )}
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          data-testid="create-goal-button"
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
        >
          + Create Goal
        </button>
      </div>

      {/* Goals List */}
      {goals.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow">
          <EmptyState
            type="no-goals"
            title="No goals yet"
            description="Set your first financial goal and start working towards it"
            primaryAction={{
              label: "Create Your First Goal",
              onClick: () => setShowCreateModal(true),
            }}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {goals.map((goal) => {
            const progress = getProgress(goal.currentAmount, goal.targetAmount);
            const daysRemaining = getDaysRemaining(goal.targetDate);
            const remaining = goal.targetAmount - goal.currentAmount;

            return (
              <div
                key={goal.id}
                className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="text-4xl">{getGoalIcon(goal.type)}</div>
                    <div>
                      {/*
                        /financial/coach/goal-detail/[id] existed with nothing
                        linking to it, so a goal could be listed but never
                        opened. The name is the affordance a user reaches for.
                      */}
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        <Link
                          href={`/financial/coach/goal-detail/${goal.id}`}
                          className="hover:text-emerald-700 hover:underline dark:hover:text-emerald-400"
                        >
                          {goal.name}
                        </Link>
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold capitalize ${getStatusColor(goal.status)}`}
                        >
                          {goal.status}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-slate-400 capitalize">
                          {goal.type.replace("_", " ")}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-600 dark:text-slate-300">
                        Progress
                      </span>
                      <span className="text-sm font-bold text-gray-900 dark:text-white">
                        {progress.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-4">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-blue-500 h-4 rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-gray-500 dark:text-slate-400 mb-1">
                        Current
                      </div>
                      <div className="text-lg font-bold text-blue-600">
                        {formatCurrency(goal.currentAmount)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 dark:text-slate-400 mb-1">
                        Target
                      </div>
                      <div className="text-lg font-bold text-gray-900 dark:text-white">
                        {formatCurrency(goal.targetAmount)}
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-200 dark:border-slate-700">
                    <div className="flex items-center justify-between text-sm">
                      <div>
                        <span className="text-gray-600 dark:text-slate-300">
                          Remaining:{" "}
                        </span>
                        <span className="font-bold text-gray-900 dark:text-white">
                          {formatCurrency(remaining)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-slate-300">
                          Due:{" "}
                        </span>
                        <span
                          className={`font-bold ${daysRemaining < 30 ? "text-red-600" : "text-gray-900 dark:text-white"}`}
                        >
                          {daysRemaining > 0
                            ? `${daysRemaining} days`
                            : "Overdue"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Goal Investment Dashboard */}
      {showInvestmentView && goals.length > 0 && (
        <GoalInvestmentDashboard
          goals={goals.map((g): GoalSummary => {
            const progress = getProgress(g.currentAmount, g.targetAmount);
            const isOnTrack = getDaysRemaining(g.targetDate) > 0 && progress >= 25;
            const goalTypeMap: Record<string, InvestmentGoalType> = {
              emergency_fund: "emergency",
              debt_payoff: "custom",
              savings: "custom",
              investment: "custom",
              custom: "custom",
            };
            const statusMap: Record<string, InvestmentGoalStatus> = {
              active: isOnTrack ? "on_track" : "behind",
              completed: "ahead",
              paused: "at_risk",
            };
            return {
              id: g.id,
              name: g.name,
              type: goalTypeMap[g.type] || "custom",
              color: g.type === "investment" ? "#8B5CF6" : g.type === "savings" ? "#3B82F6" : g.type === "emergency_fund" ? "#22C55E" : g.type === "debt_payoff" ? "#EF4444" : "#6B7280",
              targetAmount: g.targetAmount,
              currentAmount: g.currentAmount,
              targetDate: g.targetDate,
              percentComplete: progress,
              status: statusMap[g.status] || "on_track",
              monthlyContribution: 0,
              projectedAmount: g.currentAmount,
              isOnTrack,
            };
          })}
          totalInvested={totalCurrent}
          totalProjected={totalCurrent}
          projectionData={investmentProjection}
          allocations={investmentAllocations}
          selectedGoalId={selectedGoalId}
          onSelectGoal={handleSelectGoal}
          onAddGoal={() => setShowCreateModal(true)}
          onEditGoal={() => {}}
          onViewDetails={(goalId) => handleSelectGoal(goalId)}
        />
      )}

      {/* Create Goal Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div
            className="bg-white dark:bg-slate-800 rounded-lg max-w-md w-full p-6"
            data-testid="goal-modal"
          >
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Create Financial Goal
            </h2>

            <form onSubmit={handleCreateGoal} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">
                  Goal Type
                </label>
                <select
                  value={newGoal.type}
                  onChange={(e) =>
                    setNewGoal({
                      ...newGoal,
                      type: e.target.value as FinancialGoal["type"],
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="emergency_fund">Emergency Fund</option>
                  <option value="debt_payoff">Debt Payoff</option>
                  <option value="savings">Savings</option>
                  <option value="investment">Investment</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">
                  Goal Name
                </label>
                <input
                  type="text"
                  value={newGoal.name}
                  onChange={(e) =>
                    setNewGoal({ ...newGoal, name: e.target.value })
                  }
                  name="goalName"
                  data-testid="goal-name-input"
                  required
                  placeholder="e.g., Save for vacation"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">
                  Target Amount
                </label>
                <input
                  type="number"
                  value={newGoal.targetAmount}
                  onChange={(e) =>
                    setNewGoal({ ...newGoal, targetAmount: e.target.value })
                  }
                  name="targetAmount"
                  data-testid="goal-target-amount-input"
                  required
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">
                  Current Amount
                </label>
                <input
                  type="number"
                  value={newGoal.currentAmount}
                  onChange={(e) =>
                    setNewGoal({ ...newGoal, currentAmount: e.target.value })
                  }
                  name="currentAmount"
                  data-testid="goal-current-amount-input"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">
                  Target Date
                </label>
                <input
                  type="date"
                  value={newGoal.targetDate}
                  onChange={(e) =>
                    setNewGoal({ ...newGoal, targetDate: e.target.value })
                  }
                  name="targetDate"
                  data-testid="goal-target-date-input"
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-200 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 dark:bg-slate-900 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  data-testid="save-goal-button"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
