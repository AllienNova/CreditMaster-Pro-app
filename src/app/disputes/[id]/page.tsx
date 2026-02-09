import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import DisputeDetail from '@/components/disputes/DisputeDetail';

export const metadata = {
  title: 'Dispute Details | Fynvita',
  description: 'View and manage dispute details',
};

interface DisputePageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function DisputePage({ params }: DisputePageProps) {
  const { id } = await params;

  if (!id) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Suspense fallback={<DetailLoadingSkeleton />}>
          <DisputeDetail disputeId={id} />
        </Suspense>
      </div>
    </div>
  );
}

// Loading Skeleton
function DetailLoadingSkeleton() {
  return (
    <div className="animate-pulse">
      {/* Header */}
      <div className="mb-6">
        <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-1/3 mb-2"></div>
        <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/4"></div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
            <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded w-1/4 mb-4"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded"></div>
              <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded"></div>
              <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-3/4"></div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
            <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded w-1/4 mb-4"></div>
            <div className="h-64 bg-gray-200 dark:bg-slate-700 rounded"></div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
            <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded w-1/2 mb-4"></div>
            <div className="space-y-3">
              <div className="h-10 bg-gray-200 dark:bg-slate-700 rounded"></div>
              <div className="h-10 bg-gray-200 dark:bg-slate-700 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
