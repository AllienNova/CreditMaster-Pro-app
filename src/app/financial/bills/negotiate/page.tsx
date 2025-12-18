import { Suspense } from 'react';
import { Metadata } from 'next';
import BillNegotiationAssistant from '@/components/financial/BillNegotiationAssistant';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Bill Negotiation Assistant | CPFI',
  description:
    'AI-powered bill negotiation with scripts, talking points, and savings tracking',
  openGraph: {
    title: 'Bill Negotiation Assistant | CPFI',
    description:
      'AI-powered bill negotiation with scripts, talking points, and savings tracking',
    type: 'website',
  },
};

function NegotiationLoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-xl h-32"
          />
        ))}
      </div>
      <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded" />
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-6" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 bg-gray-200 dark:bg-gray-700 rounded"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function BillNegotiationPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
            <Link
              href="/financial/bills"
              className="hover:text-blue-600 dark:hover:text-blue-400"
            >
              Bills & Subscriptions
            </Link>
            <span>/</span>
            <span className="text-gray-900 dark:text-white">Negotiate</span>
          </nav>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Bill Negotiation Assistant
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            AI-powered negotiation scripts and tracking to help you save money
            on your bills
          </p>
        </div>
        <Suspense fallback={<NegotiationLoadingSkeleton />}>
          <BillNegotiationAssistant />
        </Suspense>
      </div>
    </div>
  );
}

