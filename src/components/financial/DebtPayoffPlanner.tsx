"use client";

/**
 * Debt Payoff Planner Component
 * Comprehensive debt management with payoff strategies, projections, and tracking
 */

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/Toast";
import AreaChartComponent from "@/components/charts/AreaChart";
import { Icon } from "@/components/ui/Icon";
import type {
  Debt,
  DebtType,
  PayoffStrategy,
  PayoffPlan,
  StrategyComparison,
  DebtOverview,
  PayoffMilestone,
  PayoffInsight,
} from "@/lib/financial/types/debt-payoff.types";
import { CHART_COLORS } from "@/lib/design-tokens/chart-colors";

type TabType = "overview" | "debts" | "strategies" | "timeline" | "milestones";

const DEBT_TYPE_LABELS: Record<DebtType, string> = {
  credit_card: "Credit Card",
  student_loan: "Student Loan",
  auto_loan: "Auto Loan",
  mortgage: "Mortgage",
  personal_loan: "Personal Loan",
  medical: "Medical",
  other: "Other",
};

const DEBT_TYPE_ICONS: Record<DebtType, string> = {
  credit_card: "",
  student_loan: "",
  auto_loan: "",
  mortgage: "",
  personal_loan: "",
  medical: "",
  other: "",
};

const STRATEGY_INFO: Record<
  PayoffStrategy,
  { name: string; description: string; icon: string }
> = {
  avalanche: {
    name: "Avalanche",
    description: "Pay highest interest first - saves the most money",
    icon: "wallet",
  },
  snowball: {
    name: "Snowball",
    description: "Pay smallest balance first - quick wins for motivation",
    icon: "wallet",
  },
  hybrid: {
    name: "Hybrid",
    description: "Balanced approach considering both factors",
    icon: "sparkles",
  },
  ai_optimized: {
    name: "AI-Optimized",
    description: "AI-powered strategy balancing math and psychology",
    icon: "sparkles",
  },
};

interface DebtPayoffData {
  overview: DebtOverview;
  debts: Debt[];
  currentPlan: PayoffPlan;
  comparison?: StrategyComparison;
  milestones: PayoffMilestone[];
  insights: PayoffInsight[];
}

export default function DebtPayoffPlanner() {
  const { user, loading: authLoading } = useAuth();
  const { error: showError } = useToast();
  const [data, setData] = useState<DebtPayoffData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [selectedStrategy, setSelectedStrategy] =
    useState<PayoffStrategy>("avalanche");
  const [extraPayment, setExtraPayment] = useState(0);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [showAddDebtModal, setShowAddDebtModal] = useState(false);

  const fetchDebtData = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);

      // First, get the list of debts from the existing API
      const debtsResponse = await fetch("/api/financial/debt");
      if (!debtsResponse.ok) throw new Error("Failed to fetch debts");
      const debtsResult = await debtsResponse.json();

      // If user has debts, use the new debt strategy optimizer API
      if (debtsResult.data?.debts && debtsResult.data.debts.length > 0) {
        const strategyResponse = await fetch(
          "/api/ai/financial-coach/debt-strategy",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              debts: debtsResult.data.debts.map((d: Debt) => ({
                id: d.id,
                name: d.name,
                balance: d.balance,
                interestRate: d.interestRate,
                minimumPayment: d.minimumPayment,
                type: d.type,
              })),
              extraPayment: extraPayment,
              includeAIOptimization: true,
            }),
          },
        );

        if (strategyResponse.ok) {
          const strategyResult = await strategyResponse.json();
          if (strategyResult.success && strategyResult.data) {
            // Transform the new API response to match the expected format
            interface StrategyPlan extends PayoffPlan {
              method: PayoffStrategy;
            }
            const comparison = strategyResult.data;
            const selectedPlan =
              comparison.strategies.find(
                (s: StrategyPlan) => s.method === selectedStrategy,
              ) || comparison.strategies[0];

            setData({
              overview: debtsResult.data.overview,
              debts: debtsResult.data.debts,
              currentPlan: selectedPlan,
              comparison: comparison,
              milestones: selectedPlan.milestones || [],
              insights: debtsResult.data.insights || [],
            });
            return;
          }
        }
      }

      // Fallback to old API if new API fails or no debts
      const params = new URLSearchParams({
        strategy: selectedStrategy,
        extraPayment: extraPayment.toString(),
        compare: "true",
      });
      const response = await fetch(`/api/financial/debt?${params}`);
      if (!response.ok) throw new Error("Failed to fetch debt data");
      const result = await response.json();
      setData(result.data);
    } catch (error) {
      console.error("Error fetching debt data:", error);
      showError("Failed to load debt data");
    } finally {
      setLoading(false);
    }
  }, [user, selectedStrategy, extraPayment, showError]);

  useEffect(() => {
    if (!authLoading && user) {
      void fetchDebtData();
    }
  }, [authLoading, user, fetchDebtData]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  };

  if (authLoading || loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-white dark:bg-slate-800 rounded-xl shadow p-6"
            >
              <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/2 mb-4"></div>
              <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-slate-400">
          No debt data available
        </p>
      </div>
    );
  }

  const { overview, debts, currentPlan, comparison, milestones, insights } =
    data;

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: "overview", label: "Overview", icon: "chart-bar" },
    { id: "debts", label: "My Debts", icon: "chart-bar" },
    { id: "strategies", label: "Strategies", icon: "chart-bar" },
    { id: "timeline", label: "Timeline", icon: "chart-bar" },
    { id: "milestones", label: "Milestones", icon: "sparkles" },
  ];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <SummaryCard
          title="Total Debt"
          value={formatCurrency(overview.totalDebt)}
          subtitle={`${overview.debtCount} accounts`}
          gradient="from-red-500 to-emerald-500"
        />
        <SummaryCard
          title="Monthly Payments"
          value={formatCurrency(overview.totalMinimumPayments + extraPayment)}
          subtitle={
            extraPayment > 0
              ? `+${formatCurrency(extraPayment)} extra`
              : "Minimum only"
          }
          gradient="from-blue-500 to-blue-500"
        />
        <SummaryCard
          title="Payoff Date"
          value={formatDate(currentPlan.payoffDate)}
          subtitle={`${currentPlan.totalMonths} months`}
          gradient="from-green-500 to-emerald-500"
        />
        <SummaryCard
          title="Interest Saved"
          value={formatCurrency(currentPlan.interestSaved)}
          subtitle={`${currentPlan.monthsSaved} months faster`}
          gradient="from-blue-500 to-blue-500"
        />
      </div>

      {/* Extra Payment Slider */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Extra Monthly Payment
          </h3>
          <span className="text-2xl font-bold text-green-600 dark:text-green-400">
            {formatCurrency(extraPayment)}
          </span>
        </div>
        <label htmlFor="extra-payment-slider" className="sr-only">
          Extra monthly payment amount
        </label>
        <input
          id="extra-payment-slider"
          type="range"
          min="0"
          max="1000"
          step="50"
          value={extraPayment}
          onChange={(e) => setExtraPayment(parseInt(e.target.value))}
          className="w-full h-2 bg-gray-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
          aria-label="Extra monthly payment amount"
        />
        <div className="flex justify-between text-xs text-gray-500 dark:text-slate-400 mt-2">
          <span>$0</span>
          <span>$500</span>
          <span>$1,000</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow overflow-hidden">
        <div className="border-b border-gray-200 dark:border-slate-700">
          <nav className="flex overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                data-testid={`debt-tab-${tab.id}`}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${activeTab === tab.id ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700 dark:text-slate-200 dark:hover:text-gray-300"}`}
              >
                <span>{tab.icon}</span>
                {tab.label}
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
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Insights
                  </h3>
                  {insights.map((insight, i) => (
                    <div
                      key={i}
                      className={`p-4 rounded-lg border ${insight.type === "warning" ? "bg-yellow-50 border-yellow-200" : insight.type === "tip" ? "bg-blue-50 border-blue-200" : "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"}`}
                    >
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {insight.title}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">
                        {insight.description}
                      </p>
                      {insight.impact && (
                        <p className="text-xs text-gray-500 dark:text-slate-500 mt-2">
                          {insight.impact}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Payoff Chart */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Debt Payoff Projection
                </h3>
                <div className="h-64">
                  <AreaChartComponent
                    data={currentPlan.timeline.map((t) => ({
                      label: `Month ${t.month}`,
                      balance: t.totalBalance,
                    }))}
                    areas={[
                      {
                        dataKey: "balance",
                        name: "Remaining Balance",
                        color: CHART_COLORS.red,
                      },
                    ]}
                    height={256}
                    currency={true}
                    xAxisKey="label"
                  />
                </div>
              </div>

              {/* Debt Breakdown by Type */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Debt by Category
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {Object.entries(overview.debtsByType || {}).map(
                    ([type, amount]) => (
                      <div
                        key={type}
                        className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">
                            {DEBT_TYPE_ICONS[type as DebtType]}
                          </span>
                          <div>
                            <p className="text-sm text-gray-500 dark:text-slate-400">
                              {DEBT_TYPE_LABELS[type as DebtType]}
                            </p>
                            <p className="font-semibold text-gray-900 dark:text-white">
                              {formatCurrency(amount as number)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Debts Tab */}
          {activeTab === "debts" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  My Debts
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAddDebtModal(true)}
                  data-testid="add-debt-button"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  + Add Debt
                </button>
              </div>
              {debts.map((debt) => (
                <div
                  key={debt.id}
                  className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">
                        {DEBT_TYPE_ICONS[debt.type]}
                      </span>
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white">
                          {debt.name}
                        </h4>
                        <p className="text-sm text-gray-500 dark:text-slate-400">
                          {DEBT_TYPE_LABELS[debt.type]} • {debt.interestRate}%
                          APR
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-gray-900 dark:text-white">
                        {formatCurrency(debt.balance)}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-slate-400">
                        Min: {formatCurrency(debt.minimumPayment)}/mo
                      </p>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-gray-500 dark:text-slate-400 mb-1">
                      <span>
                        Paid:{" "}
                        {formatCurrency(debt.originalBalance - debt.balance)}
                      </span>
                      <span>
                        {(
                          (1 - debt.balance / debt.originalBalance) *
                          100
                        ).toFixed(0)}
                        %
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 dark:bg-slate-600 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full"
                        style={{
                          width: `${(1 - debt.balance / debt.originalBalance) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Strategies Tab */}
          {activeTab === "strategies" && comparison && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Compare Payoff Strategies
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {(
                  [
                    "avalanche",
                    "snowball",
                    "hybrid",
                    "ai_optimized",
                  ] as PayoffStrategy[]
                )
                  .filter(
                    (strategy) =>
                      strategy !== "ai_optimized" || comparison.ai_optimized,
                  )
                  .map((strategy) => {
                    const plan = comparison[strategy];
                    if (!plan) return null;

                    const isRecommended =
                      comparison.recommendation === strategy;
                    const isSelected = selectedStrategy === strategy;
                    return (
                      <button
                        key={strategy}
                        type="button"
                        onClick={() => setSelectedStrategy(strategy)}
                        className={`p-4 rounded-xl border-2 text-left transition-all ${isSelected ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : "border-gray-200 hover:border-gray-300 dark:border-slate-600"}`}
                      >
                        {isRecommended && (
                          <span className="inline-block px-2 py-1 text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded mb-2">
                            Recommended
                          </span>
                        )}
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-2xl">
                            {STRATEGY_INFO[strategy].icon}
                          </span>
                          <h4 className="font-semibold text-gray-900 dark:text-white">
                            {STRATEGY_INFO[strategy].name}
                          </h4>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-slate-400 mb-3">
                          {STRATEGY_INFO[strategy].description}
                        </p>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-slate-400">
                              Payoff:
                            </span>
                            <span className="font-medium text-gray-900 dark:text-white">
                              {formatDate(plan.payoffDate)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-slate-400">
                              Interest:
                            </span>
                            <span className="font-medium text-gray-900 dark:text-white">
                              {formatCurrency(plan.totalInterestPaid)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-slate-400">
                              Saved:
                            </span>
                            <span className="font-medium text-green-600 dark:text-green-400">
                              {formatCurrency(plan.interestSaved)}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
              </div>
              {comparison.recommendationReason && (
                <p className="text-sm text-gray-600 dark:text-slate-400 bg-gray-50 dark:bg-slate-700 p-4 rounded-lg">
                  {comparison.recommendationReason}
                </p>
              )}
            </div>
          )}

          {/* Timeline Tab */}
          {activeTab === "timeline" && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Payoff Order ({STRATEGY_INFO[selectedStrategy].name})
              </h3>
              <div className="space-y-4">
                {currentPlan.debtOrder.map((debt, i) => (
                  <div
                    key={debt.debtId}
                    className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-slate-700 rounded-lg"
                  >
                    <div className="flex-shrink-0 w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                      <span className="font-bold text-blue-600 dark:text-blue-400">
                        {i + 1}
                      </span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {debt.debtName}
                      </h4>
                      <p className="text-sm text-gray-500 dark:text-slate-400">
                        {formatCurrency(debt.balance)} at {debt.interestRate}%
                        APR
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {formatDate(debt.payoffDate)}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-slate-400">
                        Month {debt.payoffMonth}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Milestones Tab */}
          {activeTab === "milestones" && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Payoff Milestones
              </h3>
              <div className="space-y-3">
                {milestones.map((milestone) => (
                  <div
                    key={milestone.id}
                    className={`flex items-center gap-4 p-4 rounded-lg border ${milestone.achieved ? "bg-green-50 border-green-200" : "bg-gray-50 dark:bg-slate-700 border-gray-200 dark:border-slate-600"}`}
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        milestone.achieved
                          ? "bg-green-500 text-white"
                          : "bg-gray-200 dark:bg-slate-600 text-gray-500 dark:text-slate-400"
                      }`}
                    >
                      {milestone.achieved
                        ? ""
                        : milestone.type === "percentage"
                          ? `${milestone.target}%`
                          : ""}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {milestone.description}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-slate-400">
                        {milestone.achieved
                          ? "Achieved!"
                          : `Projected: ${formatDate(milestone.projectedDate)}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  subtitle,
  gradient,
}: {
  title: string;
  value: string;
  subtitle: string;
  gradient: string;
}) {
  return (
    <div
      className={`bg-gradient-to-br ${gradient} rounded-xl shadow-lg p-6 text-white`}
    >
      <p className="text-sm font-medium opacity-90">{title}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      <p className="text-xs opacity-75 mt-1">{subtitle}</p>
    </div>
  );
}
