"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";

// Types
interface Income {
  id: string;
  source: string;
  amount: number;
  frequency: "weekly" | "biweekly" | "monthly" | "yearly";
  type: "salary" | "freelance" | "passive" | "other";
}

interface Expense {
  id: string;
  category: string;
  name: string;
  amount: number;
  frequency: "weekly" | "biweekly" | "monthly" | "yearly";
  type: "fixed" | "variable" | "discretionary";
  essential: boolean;
}

interface BudgetInsight {
  type: "warning" | "success" | "info" | "critical";
  title: string;
  message: string;
  actionable: boolean;
  action?: string;
}

interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: Date;
  priority: "high" | "medium" | "low";
}

export default function BudgetOptimizer() {
  const { user, loading: authLoading } = useAuth();

  const [incomes, setIncomes] = useState<Income[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [insights, setInsights] = useState<BudgetInsight[]>([]);
  const [showAddIncome, setShowAddIncome] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [budgetMethod, setBudgetMethod] = useState<
    "50-30-20" | "80-20" | "60-20-20"
  >("50-30-20");

  const expenseCategories = [
    "Housing",
    "Transportation",
    "Food & Dining",
    "Utilities",
    "Healthcare",
    "Insurance",
    "Debt Payments",
    "Entertainment",
    "Shopping",
    "Personal Care",
    "Education",
    "Savings & Investments",
    "Subscriptions",
    "Childcare",
    "Other",
  ];

  useEffect(() => {
    fetchFinancialData();
  }, []);

  useEffect(() => {
    if (incomes.length > 0 || expenses.length > 0) {
      generateInsights();
    }
  }, [incomes, expenses, budgetMethod]);

  const fetchFinancialData = async () => {
    try {
      const response = await fetch("/api/credit-builder/budget");
      if (response.ok) {
        const data = await response.json();
        setIncomes(data.incomes || []);
        setExpenses(data.expenses || []);
        setSavingsGoals(data.savingsGoals || []);
      }
    } catch (err) {
      console.error("Failed to fetch financial data:", err);
      // Demo data
      setIncomes([
        {
          id: "1",
          source: "Full-time Job",
          amount: 5000,
          frequency: "monthly",
          type: "salary",
        },
        {
          id: "2",
          source: "Side Hustle",
          amount: 500,
          frequency: "monthly",
          type: "freelance",
        },
      ]);
      setExpenses([
        {
          id: "1",
          category: "Housing",
          name: "Rent",
          amount: 1500,
          frequency: "monthly",
          type: "fixed",
          essential: true,
        },
        {
          id: "2",
          category: "Transportation",
          name: "Car Payment",
          amount: 350,
          frequency: "monthly",
          type: "fixed",
          essential: true,
        },
        {
          id: "3",
          category: "Food & Dining",
          name: "Groceries",
          amount: 400,
          frequency: "monthly",
          type: "variable",
          essential: true,
        },
        {
          id: "4",
          category: "Utilities",
          name: "Electric & Gas",
          amount: 150,
          frequency: "monthly",
          type: "variable",
          essential: true,
        },
        {
          id: "5",
          category: "Entertainment",
          name: "Streaming Services",
          amount: 50,
          frequency: "monthly",
          type: "fixed",
          essential: false,
        },
      ]);
    }
  };

  const normalizeToMonthly = (amount: number, frequency: string): number => {
    switch (frequency) {
      case "weekly":
        return amount * 4.33;
      case "biweekly":
        return amount * 2.17;
      case "yearly":
        return amount / 12;
      default:
        return amount;
    }
  };

  const getTotalMonthlyIncome = () => {
    return incomes.reduce(
      (sum, income) =>
        sum + normalizeToMonthly(income.amount, income.frequency),
      0,
    );
  };

  const getTotalMonthlyExpenses = () => {
    return expenses.reduce(
      (sum, expense) =>
        sum + normalizeToMonthly(expense.amount, expense.frequency),
      0,
    );
  };

  const getExpensesByType = () => {
    const essential = expenses
      .filter((e) => e.essential)
      .reduce((sum, e) => sum + normalizeToMonthly(e.amount, e.frequency), 0);
    const discretionary = expenses
      .filter((e) => !e.essential)
      .reduce((sum, e) => sum + normalizeToMonthly(e.amount, e.frequency), 0);
    return { essential, discretionary };
  };

  const getExpensesByCategory = () => {
    const byCategory: Record<string, number> = {};
    expenses.forEach((expense) => {
      const monthly = normalizeToMonthly(expense.amount, expense.frequency);
      byCategory[expense.category] =
        (byCategory[expense.category] || 0) + monthly;
    });
    return byCategory;
  };

  const generateInsights = () => {
    const insights: BudgetInsight[] = [];
    const totalIncome = getTotalMonthlyIncome();
    const totalExpenses = getTotalMonthlyExpenses();
    const surplus = totalIncome - totalExpenses;
    const { essential, discretionary } = getExpensesByType();

    // Cash flow analysis
    if (surplus < 0) {
      insights.push({
        type: "critical",
        title: "Negative Cash Flow",
        message: `You're spending $${Math.abs(surplus).toLocaleString()} more than you earn each month. This is unsustainable and requires immediate action.`,
        actionable: true,
        action: "Review discretionary expenses and identify cuts",
      });
    } else if (surplus < totalIncome * 0.1) {
      insights.push({
        type: "warning",
        title: "Low Savings Rate",
        message: `You're only saving ${((surplus / totalIncome) * 100).toFixed(1)}% of your income. Aim for at least 20% to build financial security.`,
        actionable: true,
        action: "Increase savings by reducing discretionary spending",
      });
    } else {
      insights.push({
        type: "success",
        title: "Positive Cash Flow",
        message: `Great job! You have $${surplus.toLocaleString()} surplus each month. Make sure to allocate this toward savings and debt payoff.`,
        actionable: true,
        action: "Set up automatic transfers to savings",
      });
    }

    // Budget method analysis
    if (budgetMethod === "50-30-20") {
      const needs = essential;
      const wants = discretionary;
      const savings = surplus;

      const needsPercent = (needs / totalIncome) * 100;
      const wantsPercent = (wants / totalIncome) * 100;
      const savingsPercent = (savings / totalIncome) * 100;

      if (needsPercent > 50) {
        insights.push({
          type: "warning",
          title: "50/30/20 Rule: Needs Too High",
          message: `Your essential expenses are ${needsPercent.toFixed(1)}% of income (target: 50%). Consider ways to reduce housing, transportation, or other fixed costs.`,
          actionable: true,
          action: "Look for roommates, refinance loans, or relocate",
        });
      }

      if (wantsPercent > 30) {
        insights.push({
          type: "warning",
          title: "50/30/20 Rule: Wants Too High",
          message: `Your discretionary spending is ${wantsPercent.toFixed(1)}% of income (target: 30%). Cut back on dining out, subscriptions, and entertainment.`,
          actionable: true,
          action: "Cancel unused subscriptions and limit dining out",
        });
      }

      if (savingsPercent < 20) {
        insights.push({
          type: "info",
          title: "50/30/20 Rule: Boost Savings",
          message: `You're saving ${savingsPercent.toFixed(1)}% of income (target: 20%). Small increases compound significantly over time.`,
          actionable: true,
          action: "Increase savings by 1% each month",
        });
      }
    }

    // Category-specific insights
    const byCategory = getExpensesByCategory();

    if (byCategory["Housing"] > totalIncome * 0.3) {
      insights.push({
        type: "warning",
        title: "Housing Costs Too High",
        message: `Housing is ${((byCategory["Housing"] / totalIncome) * 100).toFixed(1)}% of income (max recommended: 30%). This limits your financial flexibility.`,
        actionable: true,
        action: "Consider downsizing, getting roommates, or relocating",
      });
    }

    if (byCategory["Food & Dining"] > totalIncome * 0.15) {
      insights.push({
        type: "info",
        title: "Food Spending High",
        message: `Food costs are ${((byCategory["Food & Dining"] / totalIncome) * 100).toFixed(1)}% of income. Meal prep and cooking at home can save hundreds monthly.`,
        actionable: true,
        action: "Meal prep Sundays and limit dining out to 2x/week",
      });
    }

    if (byCategory["Subscriptions"] && byCategory["Subscriptions"] > 100) {
      insights.push({
        type: "info",
        title: "Subscription Creep",
        message: `You're spending $${byCategory["Subscriptions"].toFixed(0)}/month on subscriptions. Review and cancel services you don't actively use.`,
        actionable: true,
        action: "Audit all subscriptions and cancel unused ones",
      });
    }

    // Emergency fund
    const emergencyFundGoal = essential * 6;
    insights.push({
      type: "info",
      title: "Emergency Fund Target",
      message: `Based on your essential expenses ($${essential.toLocaleString()}/mo), you need $${emergencyFundGoal.toLocaleString()} in emergency savings (6 months).`,
      actionable: true,
      action: `Save $${(emergencyFundGoal / 12).toFixed(0)}/month to reach goal in 1 year`,
    });

    setInsights(insights);
  };

  const addIncome = (income: Partial<Income>) => {
    if (!income.source || !income.amount) return;
    const newIncome: Income = {
      id: Date.now().toString(),
      source: income.source,
      amount: income.amount,
      frequency: income.frequency || "monthly",
      type: income.type || "salary",
    };
    setIncomes([...incomes, newIncome]);
    setShowAddIncome(false);
  };

  const addExpense = (expense: Partial<Expense>) => {
    if (!expense.name || !expense.amount) return;
    const newExpense: Expense = {
      id: Date.now().toString(),
      category: expense.category || "Other",
      name: expense.name,
      amount: expense.amount,
      frequency: expense.frequency || "monthly",
      type: expense.type || "variable",
      essential: expense.essential ?? false,
    };
    setExpenses([...expenses, newExpense]);
    setShowAddExpense(false);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-600 mx-auto"></div>
          <p className="mt-6 text-lg text-gray-700 dark:text-slate-200 font-medium">
            Loading Budget & Cash Flow Optimizer...
          </p>
        </div>
      </div>
    );
  }

  const totalIncome = getTotalMonthlyIncome();
  const totalExpenses = getTotalMonthlyExpenses();
  const surplus = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? (surplus / totalIncome) * 100 : 0;
  const { essential, discretionary } = getExpensesByType();
  const byCategory = getExpensesByCategory();

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Link
            href="/credit-builder"
            className="inline-flex items-center text-green-600 hover:text-green-700 mb-4"
          >
            ← Back to Credit Builder
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Budget & Cash Flow Optimizer
          </h1>
          <p className="text-lg text-gray-600 dark:text-slate-300 max-w-3xl mx-auto">
            Optimize your cash flow, track spending, and maximize savings. Smart
            budgeting is the foundation of credit improvement.
          </p>
        </div>

        {/* Cash Flow Summary */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl p-6 mb-8 text-white shadow-xl">
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center">
              <p className="text-sm opacity-90 mb-1">Monthly Income</p>
              <p className="text-3xl font-bold">
                ${totalIncome.toLocaleString()}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm opacity-90 mb-1">Monthly Expenses</p>
              <p className="text-3xl font-bold">
                ${totalExpenses.toLocaleString()}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm opacity-90 mb-1">Cash Flow</p>
              <p
                className={`text-3xl font-bold ${surplus >= 0 ? "" : "text-red-200"}`}
              >
                {surplus >= 0 ? "+" : "-"}${Math.abs(surplus).toLocaleString()}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm opacity-90 mb-1">Savings Rate</p>
              <p className="text-3xl font-bold">{savingsRate.toFixed(1)}%</p>
            </div>
          </div>
        </div>

        {/* Budget Method Selector */}
        <div className="text-center mb-8">
          <p className="text-sm text-gray-600 dark:text-slate-300 mb-3">
            Budget Framework:
          </p>
          <div className="inline-flex gap-3">
            {(["50-30-20", "80-20", "60-20-20"] as const).map((method) => (
              <button
                key={method}
                onClick={() => setBudgetMethod(method)}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                  budgetMethod === method
                    ? "bg-green-600 text-white"
                    : "bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200 border-2 border-gray-200 dark:border-slate-700 hover:border-green-300"
                }`}
              >
                {method}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-2">
            {budgetMethod === "50-30-20" && "50% needs, 30% wants, 20% savings"}
            {budgetMethod === "80-20" && "80% spending, 20% savings"}
            {budgetMethod === "60-20-20" && "60% needs, 20% wants, 20% savings"}
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column: Income & Expenses */}
          <div className="space-y-6">
            {/* Income */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Income
                </h2>
                <button
                  onClick={() => setShowAddIncome(!showAddIncome)}
                  className="px-3 py-1 bg-green-600 text-white text-sm font-semibold rounded hover:bg-green-700"
                >
                  + Add
                </button>
              </div>

              {showAddIncome && (
                <div className="mb-4 p-4 bg-gray-50 dark:bg-slate-900 rounded-lg border">
                  <input
                    type="text"
                    placeholder="Source (e.g., Salary)"
                    className="w-full px-3 py-2 border rounded mb-2 text-sm"
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        const target = e.target as HTMLInputElement;
                        const amount = parseFloat(prompt("Amount?") || "0");
                        addIncome({
                          source: target.value,
                          amount,
                          frequency: "monthly",
                          type: "salary",
                        });
                        target.value = "";
                      }
                    }}
                  />
                </div>
              )}

              <div className="space-y-2">
                {incomes.map((income) => (
                  <div
                    key={income.id}
                    className="p-3 bg-green-50 rounded-lg border border-green-200"
                  >
                    <div className="flex justify-between">
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {income.source}
                      </p>
                      <p className="font-bold text-green-600">
                        $
                        {normalizeToMonthly(
                          income.amount,
                          income.frequency,
                        ).toLocaleString()}
                        /mo
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Expenses */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Expenses
                </h2>
                <button
                  onClick={() => setShowAddExpense(!showAddExpense)}
                  className="px-3 py-1 bg-red-600 text-white text-sm font-semibold rounded hover:bg-red-700"
                >
                  + Add
                </button>
              </div>

              {showAddExpense && (
                <div className="mb-4 p-4 bg-gray-50 dark:bg-slate-900 rounded-lg border">
                  <input
                    type="text"
                    placeholder="Expense name"
                    className="w-full px-3 py-2 border rounded mb-2 text-sm"
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        const target = e.target as HTMLInputElement;
                        const amount = parseFloat(prompt("Amount?") || "0");
                        const category = prompt("Category?") || "Other";
                        addExpense({
                          name: target.value,
                          amount,
                          category,
                          frequency: "monthly",
                          essential: false,
                        });
                        target.value = "";
                      }
                    }}
                  />
                </div>
              )}

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {expenses.map((expense) => (
                  <div
                    key={expense.id}
                    className="p-3 bg-red-50 rounded-lg border border-red-200"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {expense.name}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-slate-300">
                          {expense.category}
                        </p>
                      </div>
                      <p className="font-bold text-red-600">
                        $
                        {normalizeToMonthly(
                          expense.amount,
                          expense.frequency,
                        ).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Middle Column: Visualization */}
          <div className="lg:col-span-2 space-y-6">
            {/* Budget Breakdown */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                Budget Breakdown
              </h2>

              <div className="mb-8">
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-700 dark:text-slate-200">
                    Needs (Essential)
                  </span>
                  <span className="text-sm font-semibold text-gray-700 dark:text-slate-200">
                    ${essential.toLocaleString()} (
                    {((essential / totalIncome) * 100).toFixed(1)}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-4">
                  <div
                    className="bg-blue-500 h-4 rounded-full"
                    style={{
                      width: `${Math.min((essential / totalIncome) * 100, 100)}%`,
                    }}
                  ></div>
                </div>
              </div>

              <div className="mb-8">
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-700 dark:text-slate-200">
                    Wants (Discretionary)
                  </span>
                  <span className="text-sm font-semibold text-gray-700 dark:text-slate-200">
                    ${discretionary.toLocaleString()} (
                    {((discretionary / totalIncome) * 100).toFixed(1)}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-4">
                  <div
                    className="bg-blue-500 h-4 rounded-full"
                    style={{
                      width: `${Math.min((discretionary / totalIncome) * 100, 100)}%`,
                    }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-700 dark:text-slate-200">
                    Savings
                  </span>
                  <span className="text-sm font-semibold text-gray-700 dark:text-slate-200">
                    ${Math.max(0, surplus).toLocaleString()} (
                    {Math.max(0, savingsRate).toFixed(1)}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-4">
                  <div
                    className="bg-green-500 h-4 rounded-full"
                    style={{
                      width: `${Math.min(Math.max(0, savingsRate), 100)}%`,
                    }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Spending by Category */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                Spending by Category
              </h2>

              <div className="space-y-3">
                {Object.entries(byCategory)
                  .sort((a, b) => b[1] - a[1])
                  .map(([category, amount]) => (
                    <div key={category}>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm text-gray-700 dark:text-slate-200">
                          {category}
                        </span>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                          ${amount.toLocaleString()} (
                          {((amount / totalIncome) * 100).toFixed(1)}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-orange-400 to-red-400 h-2 rounded-full"
                          style={{ width: `${(amount / totalIncome) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Insights & Recommendations */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                AI Insights & Recommendations
              </h2>

              <div className="space-y-4">
                {insights.map((insight, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-lg border-2 ${
                      insight.type === "critical"
                        ? "bg-red-50 border-red-300"
                        : insight.type === "warning"
                          ? "bg-yellow-50 border-yellow-300"
                          : insight.type === "success"
                            ? "bg-green-50 border-green-300"
                            : "bg-blue-50 border-blue-300"
                    }`}
                  >
                    <h3
                      className={`font-semibold mb-2 ${
                        insight.type === "critical"
                          ? "text-red-900"
                          : insight.type === "warning"
                            ? "text-yellow-900"
                            : insight.type === "success"
                              ? "text-green-900"
                              : "text-blue-900"
                      }`}
                    >
                      {insight.type === "critical" && ""}
                      {insight.type === "warning" && ""}
                      {insight.type === "success" && ""}
                      {insight.type === "info" && ""}
                      {insight.title}
                    </h3>
                    <p
                      className={`text-sm mb-2 ${
                        insight.type === "critical"
                          ? "text-red-800"
                          : insight.type === "warning"
                            ? "text-yellow-800"
                            : insight.type === "success"
                              ? "text-green-800"
                              : "text-blue-800"
                      }`}
                    >
                      {insight.message}
                    </p>
                    {insight.actionable && insight.action && (
                      <p
                        className={`text-xs font-semibold ${
                          insight.type === "critical"
                            ? "text-red-900"
                            : insight.type === "warning"
                              ? "text-yellow-900"
                              : insight.type === "success"
                                ? "text-green-900"
                                : "text-blue-900"
                        }`}
                      >
                        → Action: {insight.action}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Educational Info */}
        <div className="mt-8 bg-green-50 border border-green-200 rounded-xl p-6">
          <h3 className="font-semibold text-green-900 mb-3">
            Budget Rules Explained
          </h3>
          <div className="grid md:grid-cols-3 gap-4 text-sm text-green-800">
            <div>
              <p className="font-semibold mb-1">50/30/20 Rule</p>
              <p>
                Most popular framework. 50% for needs (housing, food), 30% for
                wants (entertainment), 20% for savings and debt payoff.
              </p>
            </div>
            <div>
              <p className="font-semibold mb-1">80/20 Rule</p>
              <p>
                Simplified approach. Pay yourself first by saving 20%, then
                spend the remaining 80% however you like. Great for beginners.
              </p>
            </div>
            <div>
              <p className="font-semibold mb-1">60/20/20 Rule</p>
              <p>
                Stricter version. 60% for needs, 20% for wants, 20% for savings.
                Best for aggressive debt payoff or savings goals.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
