import { Suspense } from 'react';
import { Metadata } from 'next';
import BankAccountsList from '@/components/financial/BankAccountsList';

export const metadata: Metadata = {
  title: 'Bank Accounts | CPFI',
  description: 'Manage your connected bank accounts and view balances',
};

function AccountsLoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-lg shadow p-6">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="h-8 bg-gray-200 rounded w-3/4"></div>
          </div>
        ))}
      </div>

      {/* Accounts */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="h-6 bg-gray-200 rounded w-1/4 mb-6"></div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function BankAccountsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Bank Accounts</h1>
          <p className="mt-2 text-gray-600">
            Manage your connected bank accounts and view balances
          </p>
        </div>

        {/* Accounts Content */}
        <Suspense fallback={<AccountsLoadingSkeleton />}>
          <BankAccountsList />
        </Suspense>
      </div>
    </div>
  );
}

