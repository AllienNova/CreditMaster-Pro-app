import { Suspense } from 'react';
import CreditMonitoringDashboard from '@/components/credit-monitoring/CreditMonitoringDashboard';

export const metadata = {
  title: 'Credit Monitoring | CPFI',
  description: 'Monitor your credit scores across all three bureaus',
};

export default function CreditMonitoringPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Credit Monitoring</h1>
          <p className="mt-2 text-gray-600">
            Track your credit scores and get alerts for important changes
          </p>
        </div>
        
        <Suspense fallback={<DashboardLoadingSkeleton />}>
          <CreditMonitoringDashboard />
        </Suspense>
      </div>
    </div>
  );
}

// Loading Skeleton
function DashboardLoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Score Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-lg shadow p-6">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="h-12 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/3"></div>
          </div>
        ))}
      </div>
      
      {/* Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="h-6 bg-gray-200 rounded w-1/4 mb-6"></div>
        <div className="h-64 bg-gray-200 rounded"></div>
      </div>
      
      {/* Alerts */}
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

