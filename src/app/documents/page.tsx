import { Suspense } from 'react';
import DocumentLibrary from '@/components/documents/DocumentLibrary';
import DocumentStats from '@/components/documents/DocumentStats';

export const metadata = {
  title: 'Documents | CPFI',
  description: 'Manage your credit repair documents',
};

export default function DocumentsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Document Library</h1>
          <p className="mt-2 text-gray-600">
            Upload and manage your credit repair documents
          </p>
        </div>
        
        <Suspense fallback={<StatsLoadingSkeleton />}>
          <DocumentStats />
        </Suspense>
        
        <Suspense fallback={<LibraryLoadingSkeleton />}>
          <DocumentLibrary />
        </Suspense>
      </div>
    </div>
  );
}

// Loading Skeletons
function StatsLoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 animate-pulse">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-white rounded-lg shadow p-6">
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="h-8 bg-gray-200 rounded w-3/4"></div>
        </div>
      ))}
    </div>
  );
}

function LibraryLoadingSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow p-6 animate-pulse">
      <div className="h-10 bg-gray-200 rounded mb-6"></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-48 bg-gray-200 rounded"></div>
        ))}
      </div>
    </div>
  );
}

