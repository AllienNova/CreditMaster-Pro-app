import { Suspense } from "react";
import { Metadata } from "next";
import TransactionsList from "@/components/financial/TransactionsList";

export const metadata: Metadata = {
  title: "Transactions | Fynvita",
  description: "View and manage your financial transactions",
};

function TransactionsLoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
        <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded w-1/4 mb-6"></div>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-20 bg-gray-200 dark:bg-slate-700 rounded"
            ></div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function TransactionsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Transactions
          </h1>
          <p className="mt-2 text-gray-600 dark:text-slate-300">
            View and manage your financial transactions
          </p>
        </div>

        {/* Transactions Content */}
        <Suspense fallback={<TransactionsLoadingSkeleton />}>
          <TransactionsList />
        </Suspense>
      </div>
    </div>
  );
}
