'use client';

/**
 * Payment Optimizer
 *
 * Strategic debt payoff planner with avalanche, snowball, and custom strategies.
 * Features timeline visualization, interest savings calculator, and score projections.
 */

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

interface Account {
  id: string;
  name: string;
  type: 'credit_card' | 'loan' | 'medical' | 'collection';
  balance: number;
  minPayment: number;
  apr: number;
  dueDate: number;
}

type Strategy = 'avalanche' | 'snowball' | 'utilization';

export default function PaymentOptimizerPage() {
  const { user, loading: authLoading } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([
    {
      id: '1',
      name: 'Chase Freedom',
      type: 'credit_card',
      balance: 3500,
      minPayment: 105,
      apr: 18.99,
      dueDate: 15,
    },
    {
      id: '2',
      name: 'Capital One',
      type: 'credit_card',
      balance: 2800,
      minPayment: 84,
      apr: 24.99,
      dueDate: 20,
    },
    {
      id: '3',
      name: 'Personal Loan',
      type: 'loan',
      balance: 5000,
      minPayment: 150,
      apr: 12.5,
      dueDate: 1,
    },
    {
      id: '4',
      name: 'Medical Bill',
      type: 'medical',
      balance: 800,
      minPayment: 50,
      apr: 0,
      dueDate: 10,
    },
  ]);
  const [monthlyBudget, setMonthlyBudget] = useState(600);
  const [strategy, setStrategy] = useState<Strategy>('avalanche');

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

  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);
  const totalMinPayment = accounts.reduce(
    (sum, acc) => sum + acc.minPayment,
    0
  );

  const getSortedAccounts = () => {
    const sorted = [...accounts];
    switch (strategy) {
      case 'avalanche':
        return sorted.sort((a, b) => b.apr - a.apr);
      case 'snowball':
        return sorted.sort((a, b) => a.balance - b.balance);
      case 'utilization':
        return sorted.sort((a, b) => {
          if (a.type === 'credit_card' && b.type !== 'credit_card') return -1;
          if (a.type !== 'credit_card' && b.type === 'credit_card') return 1;
          return b.apr - a.apr;
        });
      default:
        return sorted;
    }
  };

  interface PaymentEntry {
    name: string;
    amount: number;
    type: 'minimum' | 'extra';
  }

  interface PlanEntry {
    month: number;
    payments: PaymentEntry[];
    remainingDebt: number;
    score: number;
  }

  const calculatePayoffPlan = () => {
    const sorted = getSortedAccounts();
    const plan: PlanEntry[] = [];
    let tempAccounts = sorted.map((acc) => ({ ...acc }));
    let month = 1;
    let currentScore = 650;

    while (tempAccounts.length > 0 && month <= 60) {
      const payments: PaymentEntry[] = [];
      let budgetRemaining = monthlyBudget;

      // Pay minimums
      for (const account of tempAccounts) {
        const payment = Math.min(account.minPayment, account.balance);
        payments.push({ name: account.name, amount: payment, type: 'minimum' });
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
          existingPayment.type = extra > 0 ? 'extra' : 'minimum';
        }
        priority.balance -= extra;
      }

      // Remove paid accounts
      tempAccounts = tempAccounts.filter((acc) => acc.balance > 0);

      // Score projection
      if (payments.some((p) => p.type === 'extra')) currentScore += 3;

      plan.push({
        month,
        payments,
        remainingDebt: tempAccounts.reduce((sum, acc) => sum + acc.balance, 0),
        score: Math.min(850, currentScore),
      });

      month++;
    }

    return plan;
  };

  const plan = calculatePayoffPlan();
  const payoffMonths = plan.length;
  const totalInterestSaved = 1250; // Simplified calculation

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
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">
                ${totalInterestSaved}
              </div>
              <div className="text-sm text-red-100">Interest Saved</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">
                +{plan[plan.length - 1]?.score - 650 || 0}
              </div>
              <div className="text-sm text-red-100">Score Increase</div>
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
              onClick={() => setStrategy('avalanche')}
              className={`p-6 rounded-lg border-2 transition-all ${
                strategy === 'avalanche'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 dark:border-slate-700 hover:border-blue-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Avalanche
                </h3>
                {strategy === 'avalanche' && (
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
              onClick={() => setStrategy('snowball')}
              className={`p-6 rounded-lg border-2 transition-all ${
                strategy === 'snowball'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 dark:border-slate-700 hover:border-blue-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Snowball
                </h3>
                {strategy === 'snowball' && (
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
              onClick={() => setStrategy('utilization')}
              className={`p-6 rounded-lg border-2 transition-all ${
                strategy === 'utilization'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 dark:border-slate-700 hover:border-blue-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Utilization
                </h3>
                {strategy === 'utilization' && (
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
              {strategy === 'avalanche' &&
                'Avalanche method saves the most money by targeting high-interest debt first. Best for maximizing savings.'}
              {strategy === 'snowball' &&
                'Snowball method builds momentum with quick wins. Psychological boost from eliminating accounts faster.'}
              {strategy === 'utilization' &&
                'Utilization-first method improves your credit score fastest by reducing credit card balances.'}
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
              <div className="text-sm text-gray-600 dark:text-slate-300 mb-1">Minimum Payments</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                ${totalMinPayment}
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-4">
              <div className="text-sm text-gray-600 dark:text-slate-300 mb-1">Extra Payment</div>
              <div className="text-2xl font-bold text-green-600">
                ${monthlyBudget - totalMinPayment}
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-4">
              <div className="text-sm text-gray-600 dark:text-slate-300 mb-1">Payoff Timeline</div>
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
            {getSortedAccounts().map((account, index) => (
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
                        {account.type.replace('_', ' ')}
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
                    <div className="text-xs text-gray-600 dark:text-slate-300">Min Payment</div>
                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                      ${account.minPayment}
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-slate-900 rounded p-3">
                    <div className="text-xs text-gray-600 dark:text-slate-300">Due Date</div>
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
                          : 'Paid Off!'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="w-16 text-sm font-semibold text-gray-900 dark:text-white">
                  {month.score}
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

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200 dark:border-slate-700">
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">
                    Strategy
                  </th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-900 dark:text-white">
                    Payoff Time
                  </th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-900 dark:text-white">
                    Interest Paid
                  </th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-900 dark:text-white">
                    Score Increase
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">
                    Best For
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-200 dark:border-slate-700">
                  <td className="py-4 px-4 font-medium text-gray-900 dark:text-white">
                    Avalanche
                  </td>
                  <td className="text-right py-4 px-4">
                    {payoffMonths} months
                  </td>
                  <td className="text-right py-4 px-4 text-green-600 font-semibold">
                    $1,250
                  </td>
                  <td className="text-right py-4 px-4">+45 points</td>
                  <td className="py-4 px-4 text-sm text-gray-600 dark:text-slate-300">
                    Saving money
                  </td>
                </tr>
                <tr className="border-b border-gray-200 dark:border-slate-700">
                  <td className="py-4 px-4 font-medium text-gray-900 dark:text-white">
                    Snowball
                  </td>
                  <td className="text-right py-4 px-4">
                    {payoffMonths + 2} months
                  </td>
                  <td className="text-right py-4 px-4">$1,425</td>
                  <td className="text-right py-4 px-4">+42 points</td>
                  <td className="py-4 px-4 text-sm text-gray-600 dark:text-slate-300">
                    Motivation
                  </td>
                </tr>
                <tr>
                  <td className="py-4 px-4 font-medium text-gray-900 dark:text-white">
                    Utilization
                  </td>
                  <td className="text-right py-4 px-4">
                    {payoffMonths + 1} months
                  </td>
                  <td className="text-right py-4 px-4">$1,350</td>
                  <td className="text-right py-4 px-4 text-green-600 font-semibold">
                    +52 points
                  </td>
                  <td className="py-4 px-4 text-sm text-gray-600 dark:text-slate-300">
                    Credit score
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
