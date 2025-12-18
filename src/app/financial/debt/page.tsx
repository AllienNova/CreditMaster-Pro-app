import { Suspense } from 'react';
import { Metadata } from 'next';
import DebtPayoffPlanner from '@/components/financial/DebtPayoffPlanner';

export const metadata: Metadata = {
  title: 'Debt Payoff Planner | CPFI',
  description:
    'Create a personalized debt payoff strategy and track your progress to financial freedom',
};

function DebtLoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"
          >
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4"></div>
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DebtPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Debt Payoff Planner
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Create a personalized debt payoff strategy and track your progress
            to financial freedom.
          </p>
        </div>

        {/* Quick Stats Banner */}
        <div className="mb-6 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Your Debt-Free Journey</h2>
              <p className="text-blue-100 mt-1">
                Choose a strategy, add extra payments, and watch your debt
                disappear faster.
              </p>
            </div>
            <div className="flex gap-4">
              <div className="text-center">
                <p className="text-3xl font-bold">🏔️</p>
                <p className="text-xs text-blue-100">Avalanche</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold">⛄</p>
                <p className="text-xs text-blue-100">Snowball</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold">⚖️</p>
                <p className="text-xs text-blue-100">Hybrid</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <Suspense fallback={<DebtLoadingSkeleton />}>
          <DebtPayoffPlanner />
        </Suspense>

        {/* Educational Section */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
            <div className="text-3xl mb-3">🏔️</div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Avalanche Method
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Pay off debts with the highest interest rates first. This method
              saves you the most money in interest over time, making it
              mathematically optimal.
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
            <div className="text-3xl mb-3">⛄</div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Snowball Method
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Pay off smallest balances first for quick wins. This method
              provides psychological motivation by eliminating debts faster,
              keeping you engaged.
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
            <div className="text-3xl mb-3">⚖️</div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Hybrid Method
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              A balanced approach that considers both interest rates and
              balances. Get the best of both worlds with optimized payoff order
              and motivation.
            </p>
          </div>
        </div>

        {/* Tips Section */}
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-xl shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            💡 Tips for Faster Debt Payoff
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <span className="text-green-500">✓</span>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <strong className="text-gray-900 dark:text-white">
                  Automate payments
                </strong>{' '}
                - Set up automatic payments to never miss a due date
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-green-500">✓</span>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <strong className="text-gray-900 dark:text-white">
                  Round up payments
                </strong>{' '}
                - Pay $300 instead of $285 to chip away faster
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-green-500">✓</span>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <strong className="text-gray-900 dark:text-white">
                  Use windfalls wisely
                </strong>{' '}
                - Apply tax refunds and bonuses to debt
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-green-500">✓</span>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <strong className="text-gray-900 dark:text-white">
                  Negotiate rates
                </strong>{' '}
                - Call creditors to request lower interest rates
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
