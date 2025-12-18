import { Suspense } from 'react';
import DisputeList from '@/components/disputes/DisputeList';
import DisputeStats from '@/components/disputes/DisputeStats';

export const metadata = {
  title: 'Disputes | CPFI',
  description: 'Manage your credit report disputes',
};

export default function DisputesPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Credit Disputes</h1>
          <p className="mt-2 text-gray-600">
            Track and manage your credit report disputes across all three bureaus
          </p>
        </div>

        {/* Stats Section */}
        <Suspense fallback={<StatsLoadingSkeleton />}>
          <DisputeStats />
        </Suspense>

        {/* Disputes List */}
        <Suspense fallback={<ListLoadingSkeleton />}>
          <DisputeList />
        </Suspense>
      </div>
    </div>
  );
}

// Loading Skeletons
function StatsLoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="h-8 bg-gray-200 rounded w-3/4"></div>
        </div>
      ))}
    </div>
  );
}

function ListLoadingSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200 animate-pulse">
        <div className="h-10 bg-gray-200 rounded w-1/3"></div>
      </div>
      <div className="divide-y divide-gray-200">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="p-6 animate-pulse">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="h-6 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </div>
              <div className="h-8 bg-gray-200 rounded w-24"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

