"use client";

/**
 * Budget Overview Component
 *
 * Displays monthly budget summary with key metrics and AI recommendations.
 */

interface BudgetOverviewProps {
  analysis: {
    totalBudgeted: number;
    totalSpent: number;
    totalRemaining: number;
    percentUsed: number;
    categoriesOverBudget: number;
    categoriesNearLimit: number;
    daysRemaining: number;
    projectedSpending: number;
    projectedOverage: number;
  };
  period: string;
}

export default function BudgetOverview({
  analysis,
  period,
}: BudgetOverviewProps) {
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusColor = (percentUsed: number): string => {
    if (percentUsed >= 100) return "text-red-600";
    if (percentUsed >= 90) return "text-yellow-600";
    if (percentUsed >= 75) return "text-blue-600";
    return "text-green-600";
  };

  const getStatusIcon = (percentUsed: number): string => {
    if (percentUsed >= 100) return "";
    if (percentUsed >= 90) return "";
    if (percentUsed >= 75) return "";
    return "";
  };

  return (
    <div
      className="grid grid-cols-1 md:grid-cols-4 gap-6"
      data-testid="budget-overview"
    >
      {/* Total Budgeted */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-600 dark:text-slate-300">
            Total Budget
          </h3>
          <span className="text-2xl"></span>
        </div>
        <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
          {formatCurrency(analysis.totalBudgeted)}
        </div>
        <div className="text-sm text-gray-500 dark:text-slate-400 capitalize">
          {period} period
        </div>
      </div>

      {/* Total Spent */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-600 dark:text-slate-300">
            Spent
          </h3>
          <span className="text-2xl">
            {getStatusIcon(analysis.percentUsed)}
          </span>
        </div>
        <div
          className={`text-3xl font-bold mb-1 ${getStatusColor(analysis.percentUsed)}`}
        >
          {formatCurrency(analysis.totalSpent)}
        </div>
        <div className="text-sm text-gray-500 dark:text-slate-400">
          {analysis.percentUsed.toFixed(1)}% of budget
        </div>
      </div>

      {/* Remaining */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-600 dark:text-slate-300">
            Remaining
          </h3>
          <span className="text-2xl"></span>
        </div>
        <div className="text-3xl font-bold text-green-600 mb-1">
          {formatCurrency(analysis.totalRemaining)}
        </div>
        <div className="text-sm text-gray-500 dark:text-slate-400">
          {analysis.daysRemaining} days left
        </div>
      </div>

      {/* Projected */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-600 dark:text-slate-300">
            Projected
          </h3>
          <span className="text-2xl"></span>
        </div>
        <div
          className={`text-3xl font-bold mb-1 ${
            analysis.projectedOverage > 0 ? "text-red-600" : "text-green-600"
          }`}
        >
          {formatCurrency(analysis.projectedSpending)}
        </div>
        <div className="text-sm text-gray-500 dark:text-slate-400">
          {analysis.projectedOverage > 0
            ? `${formatCurrency(analysis.projectedOverage)} over`
            : "On track"}
        </div>
      </div>

      {/* Alerts Banner */}
      {(analysis.categoriesOverBudget > 0 ||
        analysis.categoriesNearLimit > 0) && (
        <div className="md:col-span-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl"></span>
            <div className="flex-1">
              <h4 className="font-semibold text-yellow-900 mb-1">
                Budget Alerts
              </h4>
              <div className="text-sm text-yellow-800 space-y-1">
                {analysis.categoriesOverBudget > 0 && (
                  <div>
                    <span className="font-medium">
                      {analysis.categoriesOverBudget}
                    </span>{" "}
                    {analysis.categoriesOverBudget === 1
                      ? "category is"
                      : "categories are"}{" "}
                    over budget
                  </div>
                )}
                {analysis.categoriesNearLimit > 0 && (
                  <div>
                    <span className="font-medium">
                      {analysis.categoriesNearLimit}
                    </span>{" "}
                    {analysis.categoriesNearLimit === 1
                      ? "category is"
                      : "categories are"}{" "}
                    near the limit (90%+)
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
