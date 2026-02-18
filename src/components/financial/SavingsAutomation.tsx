"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/Toast";
import {
  SavingsRule,
  SavingsGoal,
  SavingsSummary,
  SavingsInsight,
  SavingsRecommendation,
  SavingsRuleType,
  SavingsGoalCategory,
} from "@/lib/financial/types/savings.types";

interface SavingsAutomationData {
  summary: SavingsSummary;
  rules: SavingsRule[];
  goals: SavingsGoal[];
  insights: SavingsInsight[];
  recommendations: SavingsRecommendation[];
}

const RULE_TYPE_LABELS: Record<SavingsRuleType, string> = {
  round_up: "Round-Up",
  percentage: "Percentage",
  fixed: "Fixed Amount",
  surplus: "Surplus",
  goal_based: "Goal-Based",
};

const GOAL_CATEGORY_LABELS: Record<SavingsGoalCategory, string> = {
  emergency_fund: "Emergency Fund",
  vacation: "Vacation",
  major_purchase: "Major Purchase",
  education: "Education",
  retirement: "Retirement",
  home_down_payment: "Home Down Payment",
  debt_payoff: "Debt Payoff",
  custom: "Custom",
};

const GOAL_ICONS: Record<SavingsGoalCategory, string> = {
  emergency_fund: "",
  vacation: "",
  major_purchase: "",
  education: "",
  retirement: "",
  home_down_payment: "",
  debt_payoff: "",
  custom: "",
};

export default function SavingsAutomation() {
  const { user, loading: authLoading } = useAuth();
  const toast = useToast();
  const [data, setData] = useState<SavingsAutomationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "rules" | "goals">(
    "overview",
  );
  const [showCreateRuleModal, setShowCreateRuleModal] = useState(false);
  const [showCreateGoalModal, setShowCreateGoalModal] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const response = await fetch("/api/financial/savings?type=all");
      if (!response.ok) throw new Error("Failed to fetch data");

      const result = await response.json();
      setData(result.data);
    } catch (_error) {
      // SavingsAutomation error: Error fetching savings automation data
      void _error;
      toast.error("Failed to load savings data");
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (!authLoading && user) {
      void fetchData();
    }
  }, [authLoading, user, fetchData]);

  const handleToggleRule = async (ruleId: string) => {
    try {
      const response = await fetch(`/api/financial/savings/rules/${ruleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle" }),
      });

      if (!response.ok) throw new Error("Failed to toggle rule");

      toast.success("Rule updated successfully");
      void fetchData();
    } catch (_error) {
      // SavingsAutomation error: Error toggling rule
      void _error;
      toast.error("Failed to update rule");
    }
  };

  const handleAddContribution = async (goalId: string, amount: number) => {
    try {
      const response = await fetch(`/api/financial/savings/goals/${goalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "contribute", amount }),
      });

      if (!response.ok) throw new Error("Failed to add contribution");

      toast.success(`Added $${amount.toFixed(2)} to goal`);
      void fetchData();
    } catch (_error) {
      // SavingsAutomation error: Error adding contribution
      void _error;
      toast.error("Failed to add contribution");
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
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

  if (!data) return null;

  const { summary, rules, goals, insights, recommendations } = data;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold opacity-90">
              Total Auto-Saved
            </h3>
            <span className="text-2xl"></span>
          </div>
          <div className="text-3xl font-bold">
            {formatCurrency(summary.totalSaved)}
          </div>
          <div className="text-sm opacity-90 mt-1">
            {summary.activeRules} active rules
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-600 dark:text-slate-400">
              This Month
            </h3>
            <span className="text-2xl"></span>
          </div>
          <div className="text-3xl font-bold text-green-600">
            {formatCurrency(summary.totalSavedThisMonth)}
          </div>
          <div className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            Automated savings
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-600 dark:text-slate-400">
              Round-Up Savings
            </h3>
            <span className="text-2xl"></span>
          </div>
          <div className="text-3xl font-bold text-blue-600">
            {formatCurrency(summary.roundUpSavings)}
          </div>
          <div className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            Spare change saved
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-600 dark:text-slate-400">
              Goals Progress
            </h3>
            <span className="text-2xl"></span>
          </div>
          <div className="text-3xl font-bold text-blue-600">
            {summary.goalsOnTrack}/{summary.activeGoals}
          </div>
          <div className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            On track
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow">
        <div className="border-b border-gray-200 dark:border-slate-700">
          <nav className="flex -mb-px">
            {(["overview", "rules", "goals"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === tab ? "border-green-500 text-green-600" : "border-transparent text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-gray-300"}`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Insights */}
              {insights.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Insights
                  </h3>
                  <div className="space-y-3">
                    {insights.map((insight, index) => (
                      <div
                        key={index}
                        className={`p-4 rounded-lg border ${insight.type === "warning" ? "bg-yellow-50 border-yellow-200" : insight.type === "achievement" ? "bg-green-50 border-green-200" : "bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800"}`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold text-gray-900 dark:text-white">
                              {insight.title}
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">
                              {insight.description}
                            </p>
                          </div>
                          {insight.actionable && insight.action && (
                            <button className="px-3 py-1 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600">
                              {insight.action.label}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {recommendations.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Recommendations
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {recommendations.map((rec) => (
                      <div
                        key={rec.id}
                        className="p-4 bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg border border-green-200 dark:border-green-800"
                      >
                        <h4 className="font-semibold text-gray-900 dark:text-white">
                          {rec.title}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">
                          {rec.description}
                        </p>
                        {rec.potentialSavings > 0 && (
                          <p className="text-sm text-green-600 dark:text-green-400 mt-2">
                            Potential savings:{" "}
                            {formatCurrency(rec.potentialSavings)}/month
                          </p>
                        )}
                        <button
                          onClick={() =>
                            rec.type === "new_rule"
                              ? setShowCreateRuleModal(true)
                              : setShowCreateGoalModal(true)
                          }
                          className="mt-3 px-4 py-2 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600"
                        >
                          {rec.type === "new_rule"
                            ? "Create Rule"
                            : "Create Goal"}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Rules Tab */}
          {activeTab === "rules" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Savings Rules
                </h3>
                <button
                  onClick={() => setShowCreateRuleModal(true)}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                >
                  + New Rule
                </button>
              </div>

              {rules.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-slate-400">
                  <p className="text-4xl mb-4"></p>
                  <p>
                    No savings rules yet. Create one to start automating your
                    savings!
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {rules.map((rule) => (
                    <div
                      key={rule.id}
                      className="p-4 bg-gray-50 dark:bg-slate-700 rounded-lg flex items-center justify-between"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-12 h-12 rounded-full flex items-center justify-center text-xl ${rule.status === "active" ? "bg-green-100" : "bg-gray-200 dark:bg-slate-600"}`}
                        >
                          {rule.type === "round_up"
                            ? ""
                            : rule.type === "percentage"
                              ? ""
                              : ""}
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-white">
                            {rule.name}
                          </h4>
                          <p className="text-sm text-gray-500 dark:text-slate-400">
                            {RULE_TYPE_LABELS[rule.type]} •{" "}
                            {formatCurrency(rule.totalSaved)} saved
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${rule.status === "active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800 dark:bg-slate-600 dark:text-slate-200"}`}
                        >
                          {rule.status}
                        </span>
                        <button
                          onClick={() => handleToggleRule(rule.id)}
                          className="px-3 py-1 text-sm border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-600"
                        >
                          {rule.status === "active" ? "Pause" : "Resume"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Goals Tab */}
          {activeTab === "goals" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Savings Goals
                </h3>
                <button
                  onClick={() => setShowCreateGoalModal(true)}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                >
                  + New Goal
                </button>
              </div>

              {goals.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-slate-400">
                  <p className="text-4xl mb-4"></p>
                  <p>
                    No savings goals yet. Create one to start tracking your
                    progress!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {goals.map((goal) => (
                    <div
                      key={goal.id}
                      className="p-4 bg-gray-50 dark:bg-slate-700 rounded-lg"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-2xl">
                          {GOAL_ICONS[goal.category]}
                        </span>
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-white">
                            {goal.name}
                          </h4>
                          <p className="text-sm text-gray-500 dark:text-slate-400">
                            {GOAL_CATEGORY_LABELS[goal.category]}
                          </p>
                        </div>
                      </div>

                      <div className="mb-3">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600 dark:text-slate-400">
                            {formatCurrency(goal.currentAmount)} of{" "}
                            {formatCurrency(goal.targetAmount)}
                          </span>
                          <span className="font-semibold text-green-600">
                            {goal.progressPercentage.toFixed(0)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-slate-600 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              goal.onTrack ? "bg-green-500" : "bg-yellow-500"
                            }`}
                            style={{
                              width: `${Math.min(100, goal.progressPercentage)}%`,
                            }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${goal.onTrack ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"}`}
                        >
                          {goal.onTrack ? "On Track" : "Behind"}
                        </span>
                        <button
                          onClick={() => handleAddContribution(goal.id, 50)}
                          className="px-3 py-1 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600"
                        >
                          + Add $50
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create Rule Modal Placeholder */}
      {showCreateRuleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Create Savings Rule
            </h3>
            <p className="text-gray-600 dark:text-slate-400 mb-4">
              Rule creation form coming soon...
            </p>
            <button
              onClick={() => setShowCreateRuleModal(false)}
              className="w-full px-4 py-2 bg-gray-200 dark:bg-slate-700 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Create Goal Modal Placeholder */}
      {showCreateGoalModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Create Savings Goal
            </h3>
            <p className="text-gray-600 dark:text-slate-400 mb-4">
              Goal creation form coming soon...
            </p>
            <button
              onClick={() => setShowCreateGoalModal(false)}
              className="w-full px-4 py-2 bg-gray-200 dark:bg-slate-700 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
