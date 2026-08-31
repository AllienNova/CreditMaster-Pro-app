"use client";

/**
 * Payment Optimizer.
 *
 * FOUR CLAIMS REMOVED. The page computed a real-looking plan from invented
 * inputs, which is the most convincing kind of wrong.
 *
 * 1. THE DEBTS. `useState<Account[]>([...])` held "Chase Freedom $3,500 at
 *    18.99%", "Capital One $2,800 at 24.99%" and a $5,000 personal loan, so
 *    every reader was shown a payoff plan for $11,300 they did not owe. A
 *    useState INITIALISER is invisible to audit:screen-data (task #100) — this
 *    is a live instance of that blind spot, found by reading.
 *    Now: GET /api/credit-builder/debts (debt_accounts, user-scoped by
 *    withAuth).
 *
 * 2. THE SCORE PROJECTION. The planner started everyone at 650 and added 3
 *    points per month whenever an extra payment landed, then rendered
 *    "+{last.score - 650} Score Increase" and a per-month projected score.
 *    Nothing models that. Both are gone, and no score is predicted anywhere on
 *    this page now.
 *
 * 3. INTEREST SAVED. `const totalInterestSaved = 1250; // Simplified
 *    calculation`. It is not computable here: the planner never accrues
 *    interest — it subtracts payments from balances — so it has no interest
 *    figure to save. The tile shows the reader's own monthly budget instead.
 *
 * 4. THE STRATEGY COMPARISON. A hardcoded table asserting Avalanche costs
 *    "$1,250 interest, +45 points", Snowball "$1,425, +42 points". It is now
 *    computed by running the same planner once per strategy over the reader's
 *    real debts, and shows only Months to Payoff — the one column that both
 *    differs between strategies and follows from what the planner does.
 *
 * KNOWN AND DELIBERATELY NOT PAPERED OVER: the planner ignores interest
 * accrual entirely, so "Months to Payoff" is optimistic for any balance
 * carrying APR. That is a real limitation of the existing calculator, left
 * visible rather than hidden behind a plausible-looking interest column.
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

interface Account {
  id: string;
  name: string;
  type: "credit_card" | "loan" | "medical" | "collection";
  balance: number;
  minPayment: number;
  apr: number;
  dueDate: number;
}

type Strategy = "avalanche" | "snowball" | "utilization";

/**
 * What each strategy is for. Copy about the METHOD, true regardless of whose
 * debts are loaded — unlike the outcome figures that used to sit beside it.
 */
const STRATEGY_NOTES: {
  id: Strategy;
  label: string;
  bestFor: string;
}[] = [
  {
    id: "avalanche",
    label: "Avalanche",
    bestFor: "Paying the least interest overall",
  },
  {
    id: "snowball",
    label: "Snowball",
    bestFor: "Clearing individual debts soonest, for momentum",
  },
  {
    id: "utilization",
    label: "Utilization",
    bestFor: "Bringing card balances down first",
  },
];

export default function PaymentOptimizerPage() {
  const { user, loading: authLoading } = useAuth();
  // Real debts, from GET /api/credit-builder/debts (debt_accounts, scoped to
  // the caller by withAuth). This used to be a useState initialiser holding
  // "Chase Freedom $3,500 at 18.99%", "Capital One $2,800 at 24.99%" and a
  // $5,000 personal loan — so every reader was shown a payoff plan for
  // $11,300 of debt they did not have. A useState initialiser is invisible to
  // audit:screen-data (task #100), which is why it outlived the sweep.
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loadingDebts, setLoadingDebts] = useState(true);
  const [debtsError, setDebtsError] = useState<string | null>(null);
  const [monthlyBudget, setMonthlyBudget] = useState(600);
  const [strategy, setStrategy] = useState<Strategy>("avalanche");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/credit-builder/debts");
        const json = await res.json().catch(() => null);
        if (cancelled) return;
        if (!res.ok || !Array.isArray(json?.debts)) {
          setAccounts([]);
          setDebtsError(
            "We could not load your debts. No balances are filled in for you — try again in a moment.",
          );
        } else {
          setAccounts(
            (json.debts as Record<string, unknown>[]).map((debt) => ({
              id: String(debt.id ?? ""),
              name: String(debt.name ?? debt.creditorName ?? "Debt"),
              type: (debt.type as Account["type"]) ?? "loan",
              balance: Number(debt.balance ?? 0),
              minPayment: Number(debt.minimumPayment ?? 0),
              apr: Number(debt.interestRate ?? 0),
              dueDate: Number(debt.dueDate ?? 1),
            })),
          );
        }
      } catch {
        if (!cancelled) {
          setAccounts([]);
          setDebtsError("We could not reach the debts service.");
        }
      } finally {
        if (!cancelled) setLoadingDebts(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-slate-300">Loading...</p>
        </div>
      </div>
    );
  }

  if (loadingDebts) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-slate-300">
            Loading your debts...
          </p>
        </div>
      </div>
    );
  }

  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);
  const totalMinPayment = accounts.reduce(
    (sum, acc) => sum + acc.minPayment,
    0,
  );

  const getSortedAccounts = (forStrategy: Strategy) => {
    const sorted = [...accounts];
    switch (forStrategy) {
      case "avalanche":
        return sorted.sort((a, b) => b.apr - a.apr);
      case "snowball":
        return sorted.sort((a, b) => a.balance - b.balance);
      case "utilization":
        return sorted.sort((a, b) => {
          if (a.type === "credit_card" && b.type !== "credit_card") return -1;
          if (a.type !== "credit_card" && b.type === "credit_card") return 1;
          return b.apr - a.apr;
        });
      default:
        return sorted;
    }
  };

  interface PaymentEntry {
    name: string;
    amount: number;
    type: "minimum" | "extra";
  }

  interface PlanEntry {
    month: number;
    payments: PaymentEntry[];
    remainingDebt: number;
  }

  const calculatePayoffPlanFor = (forStrategy: Strategy) => {
    const sorted = getSortedAccounts(forStrategy);
    const plan: PlanEntry[] = [];
    let tempAccounts = sorted.map((acc) => ({ ...acc }));
    let month = 1;

    while (tempAccounts.length > 0 && month <= 60) {
      const payments: PaymentEntry[] = [];
      let budgetRemaining = monthlyBudget;

      // Pay minimums
      for (const account of tempAccounts) {
        const payment = Math.min(account.minPayment, account.balance);
        payments.push({ name: account.name, amount: payment, type: "minimum" });
        account.balance -= payment;
        budgetRemaining -= payment;
      }

      // Apply extra to priority account
      if (budgetRemaining > 0 && tempAccounts.length > 0) {
        const priority = tempAccounts[0];
        const extra = Math.min(budgetRemaining, priority.balance);
        const existingPayment = payments.find((p) => p.name === priority.name);
        if (existingPayment) {
          existingPayment.amount += extra;
          existingPayment.type = extra > 0 ? "extra" : "minimum";
        }
        priority.balance -= extra;
      }

      // Remove paid accounts
      tempAccounts = tempAccounts.filter((acc) => acc.balance > 0);

      plan.push({
        month,
        payments,
        remainingDebt: tempAccounts.reduce((sum, acc) => sum + acc.balance, 0),
      });

      month++;
    }

    return plan;
  };

  const plan = calculatePayoffPlanFor(strategy);
  const payoffMonths = plan.length;

  // The same planner, once per strategy, over the reader's real debts. This is
  // what the comparison table shows; nothing about it is asserted.
  const comparison = STRATEGY_NOTES.reduce<Record<Strategy, number>>(
    (acc, entry) => {
      acc[entry.id] = calculatePayoffPlanFor(entry.id).length;
      return acc;
    },
    { avalanche: 0, snowball: 0, utilization: 0 },
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link
            href="/credit-builder"
            className="text-sm text-red-600 hover:text-red-700 mb-2 inline-block"
          >
            ← Back to Credit Builder
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Payment Optimizer
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">
            Strategic debt payoff planner to save money and build credit faster
          </p>
        </div>
      </div>

      {debtsError && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-amber-200 dark:border-amber-900/50">
            <p className="font-medium text-gray-900 dark:text-white mb-1">
              Your debts could not be loaded
            </p>
            <p className="text-sm text-gray-600 dark:text-slate-300">
              {debtsError}
            </p>
          </div>
        </div>
      )}

      {!debtsError && accounts.length === 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700">
            <p className="font-medium text-gray-900 dark:text-white mb-1">
              No debts on your account yet
            </p>
            <p className="text-sm text-gray-600 dark:text-slate-300">
              This planner works from the debts you have recorded. Until there
              are some, there is no payoff plan to show you — the figures below
              stay at zero rather than being filled in with an example.
            </p>
          </div>
        </div>
      )}

      {/* Summary Banner */}
      <div className="bg-gradient-to-r from-red-500 to-emerald-500 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">
                ${totalBalance.toLocaleString()}
              </div>
              <div className="text-sm text-red-100">Total Debt</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">{payoffMonths}</div>
              <div className="text-sm text-red-100">Months to Payoff</div>
            </div>
            {/* "Interest Saved $1,250" was a literal with the comment
                "Simplified calculation". It is not computable here: the
                planner below never accrues interest — it subtracts payments
                from balances — so it has no interest figure to save. Showing
                the monthly budget instead, which is the reader's own input. */}
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">
                ${monthlyBudget.toLocaleString()}
              </div>
              <div className="text-sm text-red-100">Monthly Budget</div>
            </div>
            {/* The tile here read "+N Score Increase", from a projection that
                started every reader at 650 and added 3 points per month with an
                extra payment. Nothing models that, and no score prediction is
                made anywhere in this page now. Debts cleared is countable. */}
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">{accounts.length}</div>
              <div className="text-sm text-red-100">
                {accounts.length === 1 ? "Debt Cleared" : "Debts Cleared"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Strategy Selector */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Payment Strategy
          </h2>

          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <button
              onClick={() => setStrategy("avalanche")}
              className={`p-6 rounded-lg border-2 transition-all ${
                strategy === "avalanche"
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 dark:border-slate-700 hover:border-blue-300"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Avalanche
                </h3>
                {strategy === "avalanche" && (
                  <svg
                    className="w-6 h-6 text-blue-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>
              <p className="text-sm text-gray-600 dark:text-slate-300 mb-3">
                Pay highest APR first
              </p>
              <div className="bg-green-100 text-green-700 text-xs font-semibold px-3 py-1 rounded-full inline-block">
                Most Interest Saved
              </div>
            </button>

            <button
              onClick={() => setStrategy("snowball")}
              className={`p-6 rounded-lg border-2 transition-all ${
                strategy === "snowball"
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 dark:border-slate-700 hover:border-blue-300"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Snowball
                </h3>
                {strategy === "snowball" && (
                  <svg
                    className="w-6 h-6 text-blue-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>
              <p className="text-sm text-gray-600 dark:text-slate-300 mb-3">
                Pay smallest balance first
              </p>
              <div className="bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full inline-block">
                Quick Wins
              </div>
            </button>

            <button
              onClick={() => setStrategy("utilization")}
              className={`p-6 rounded-lg border-2 transition-all ${
                strategy === "utilization"
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 dark:border-slate-700 hover:border-blue-300"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Utilization
                </h3>
                {strategy === "utilization" && (
                  <svg
                    className="w-6 h-6 text-blue-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>
              <p className="text-sm text-gray-600 dark:text-slate-300 mb-3">
                Pay credit cards first
              </p>
              <div className="bg-yellow-100 text-yellow-700 text-xs font-semibold px-3 py-1 rounded-full inline-block">
                Best for Score
              </div>
            </button>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              {strategy === "avalanche" &&
                "Avalanche method saves the most money by targeting high-interest debt first. Best for maximizing savings."}
              {strategy === "snowball" &&
                "Snowball method builds momentum with quick wins. Psychological boost from eliminating accounts faster."}
              {strategy === "utilization" &&
                "Utilization-first method improves your credit score fastest by reducing credit card balances."}
            </p>
          </div>
        </div>

        {/* Monthly Budget */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Monthly Budget
          </h2>

          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700 dark:text-slate-200">
                Total Monthly Payment
              </label>
              <span className="text-3xl font-bold text-blue-600">
                ${monthlyBudget}
              </span>
            </div>
            <input
              type="range"
              min={totalMinPayment}
              max="2000"
              step="50"
              value={monthlyBudget}
              onChange={(e) => setMonthlyBudget(parseInt(e.target.value))}
              className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500 dark:text-slate-400 mt-2">
              <span>Min: ${totalMinPayment}</span>
              <span>Max: $2,000</span>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-4">
              <div className="text-sm text-gray-600 dark:text-slate-300 mb-1">
                Minimum Payments
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                ${totalMinPayment}
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-4">
              <div className="text-sm text-gray-600 dark:text-slate-300 mb-1">
                Extra Payment
              </div>
              <div className="text-2xl font-bold text-green-600">
                ${monthlyBudget - totalMinPayment}
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-4">
              <div className="text-sm text-gray-600 dark:text-slate-300 mb-1">
                Payoff Timeline
              </div>
              <div className="text-2xl font-bold text-blue-600">
                {payoffMonths} months
              </div>
            </div>
          </div>
        </div>

        {/* Account List */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Payment Priority Order
          </h2>

          <div className="space-y-4">
            {getSortedAccounts(strategy).map((account, index) => (
              <div
                key={account.id}
                className="border-2 border-gray-200 dark:border-slate-700 rounded-lg p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-lg font-bold text-blue-600">
                        #{index + 1}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {account.name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-slate-300 capitalize">
                        {account.type.replace("_", " ")}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      ${account.balance.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-slate-300">
                      {account.apr}% APR
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gray-50 dark:bg-slate-900 rounded p-3">
                    <div className="text-xs text-gray-600 dark:text-slate-300">
                      Min Payment
                    </div>
                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                      ${account.minPayment}
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-slate-900 rounded p-3">
                    <div className="text-xs text-gray-600 dark:text-slate-300">
                      Due Date
                    </div>
                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                      {account.dueDate}th
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-slate-900 rounded p-3">
                    <div className="text-xs text-gray-600 dark:text-slate-300">
                      Monthly Interest
                    </div>
                    <div className="text-lg font-bold text-red-600">
                      ${((account.balance * account.apr) / 100 / 12).toFixed(0)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline Visualization */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Payoff Timeline
          </h2>

          <div className="space-y-4">
            {plan.slice(0, 12).map((month) => (
              <div key={month.month} className="flex items-center space-x-4">
                <div className="w-24 text-sm font-medium text-gray-600 dark:text-slate-300">
                  Month {month.month}
                </div>
                <div className="flex-1">
                  <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-6 relative overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-green-500 to-blue-500 h-6 rounded-full transition-all duration-500 flex items-center justify-end pr-3"
                      style={{
                        width: `${((totalBalance - month.remainingDebt) / totalBalance) * 100}%`,
                      }}
                    >
                      <span className="text-xs font-semibold text-white">
                        {month.remainingDebt > 0
                          ? `$${month.remainingDebt.toLocaleString()} left`
                          : "Paid Off!"}
                      </span>
                    </div>
                  </div>
                </div>

              </div>
            ))}
          </div>

          {plan.length > 12 && (
            <div className="mt-4 text-center text-sm text-gray-600 dark:text-slate-300">
              Showing first 12 months of {plan.length}-month plan
            </div>
          )}
        </div>

        {/* Comparison Chart */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Strategy Comparison
          </h2>

          {/* Computed for the reader's OWN debts by running the same planner
              once per strategy. This table was hardcoded: Avalanche "$1,250
              interest, +45 points", Snowball "$1,425, +42 points" — outcome
              claims for debts nobody had read.

              The interest and score columns are gone rather than refilled. The
              planner does not accrue interest (it subtracts payments from
              balances), so there is no interest figure to compare; and nothing
              in this app predicts a credit score. Payoff time IS comparable,
              and it is what actually differs between avalanche and snowball. */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200 dark:border-slate-700">
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">
                    Strategy
                  </th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-900 dark:text-white">
                    Months to Payoff
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">
                    Best For
                  </th>
                </tr>
              </thead>
              <tbody>
                {STRATEGY_NOTES.map((entry) => (
                  <tr
                    key={entry.id}
                    className="border-b border-gray-200 dark:border-slate-700"
                  >
                    <td className="py-4 px-4 font-medium text-gray-900 dark:text-white">
                      {entry.label}
                    </td>
                    <td className="text-right py-4 px-4 text-gray-900 dark:text-white">
                      {comparison[entry.id] > 0 ? comparison[entry.id] : "—"}
                    </td>
                    <td className="py-4 px-4 text-gray-600 dark:text-slate-300">
                      {entry.bestFor}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {accounts.length === 0 && (
              <p className="mt-4 text-sm text-gray-600 dark:text-slate-300">
                Add your debts to compare how long each strategy would take.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
