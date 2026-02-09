import { Suspense } from 'react';
import CreateDisputeForm from '@/components/disputes/CreateDisputeForm';

export const metadata = {
  title: 'Create Dispute | Fynvita',
  description: 'Create a new credit dispute',
};

export default function NewDisputePage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Create New Dispute
          </h1>
          <p className="mt-2 text-gray-600 dark:text-slate-300">
            Follow the steps below to create a professional dispute letter
          </p>
        </div>

        <Suspense fallback={<FormLoadingSkeleton />}>
          <CreateDisputeForm />
        </Suspense>
      </div>
    </div>
  );
}

// Loading Skeleton
function FormLoadingSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-8 animate-pulse">
      <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-1/3 mb-6"></div>
      <div className="space-y-4">
        <div className="h-12 bg-gray-200 dark:bg-slate-700 rounded"></div>
        <div className="h-12 bg-gray-200 dark:bg-slate-700 rounded"></div>
        <div className="h-12 bg-gray-200 dark:bg-slate-700 rounded"></div>
      </div>
    </div>
  );
}
