import { Suspense } from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import StockAnalysisView from '@/components/investments/StockAnalysisView';

interface PageProps {
  params: Promise<{ symbol: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { symbol } = await params;
  const upperSymbol = symbol.toUpperCase();

  return {
    title: `${upperSymbol} Stock Analysis | CPFI`,
    description: `Comprehensive AI-powered analysis of ${upperSymbol} including technical, fundamental, and sentiment analysis`,
    openGraph: {
      title: `${upperSymbol} Stock Analysis | CPFI`,
      description: `Comprehensive AI-powered analysis of ${upperSymbol} including technical, fundamental, and sentiment analysis`,
      type: 'website',
    },
  };
}

function AnalysisLoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 h-32" />
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 h-[350px]" />
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 h-[400px]" />
    </div>
  );
}

export default async function StockAnalysisPage({ params }: PageProps) {
  const { symbol } = await params;
  const upperSymbol = symbol.toUpperCase();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="mb-4 flex items-center text-sm text-gray-500 dark:text-gray-400">
          <Link
            href="/investments"
            className="hover:text-blue-600 dark:hover:text-blue-400"
          >
            Portfolio
          </Link>
          <span className="mx-2">/</span>
          <span className="text-gray-900 dark:text-white">{upperSymbol}</span>
        </nav>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Stock Analysis: {upperSymbol}
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Comprehensive AI-powered analysis including technical, fundamental,
            and sentiment indicators
          </p>
        </div>

        <Suspense fallback={<AnalysisLoadingSkeleton />}>
          <StockAnalysisView symbol={upperSymbol} />
        </Suspense>
      </div>
    </div>
  );
}

