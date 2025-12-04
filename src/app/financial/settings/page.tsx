import { Suspense } from 'react';
import { Metadata } from 'next';
import FinancialSettings from '@/components/financial/FinancialSettings';

export const metadata: Metadata = {
  title: 'Financial Settings | CreditMaster Pro',
  description: 'Manage your financial preferences and settings',
};

function SettingsLoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="h-6 bg-gray-200 rounded w-1/4 mb-6"></div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Financial Settings</h1>
          <p className="mt-2 text-gray-600">
            Manage your financial preferences and settings
          </p>
        </div>

        <Suspense fallback={<SettingsLoadingSkeleton />}>
          <FinancialSettings />
        </Suspense>
      </div>
    </div>
  );
}

