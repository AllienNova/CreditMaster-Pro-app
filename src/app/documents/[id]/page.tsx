import { Suspense } from 'react';
import DocumentViewer from '@/components/documents/DocumentViewer';

export const metadata = {
  title: 'Document Viewer | CPFI',
  description: 'View document details',
};

interface DocumentPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function DocumentPage({ params }: DocumentPageProps) {
  const { id } = await params;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Suspense fallback={<ViewerLoadingSkeleton />}>
          <DocumentViewer documentId={id} />
        </Suspense>
      </div>
    </div>
  );
}

// Loading Skeleton
function ViewerLoadingSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
      <div className="bg-white rounded-lg shadow p-6">
        <div className="h-96 bg-gray-200 rounded"></div>
      </div>
    </div>
  );
}

