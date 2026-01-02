import { Suspense } from 'react';
import SmartBudgetManagement from '@/components/financial/SmartBudgetManagement';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';

/**
 * Smart Budget Management Page
 * 
 * AI-powered budget management with recommendations, category breakdown,
 * and inline editing capabilities.
 * 
 * Features:
 * - AI-generated budget suggestions
 * - Category breakdown with charts
 * - Real-time spending tracking
 * - Budget adjustment recommendations
 * - Export functionality
 */

export const metadata = {
  title: 'Smart Budget | CreditMaster Pro',
  description: 'AI-powered budget management with intelligent recommendations',
};

function SmartBudgetLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="space-y-6 animate-pulse">
          {/* Header */}
          <div className="h-12 bg-gray-200 rounded w-1/3 mb-6"></div>
          
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-lg shadow p-6">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="h-8 bg-gray-200 rounded w-3/4"></div>
              </div>
            ))}
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
              <div className="h-6 bg-gray-200 rounded w-1/3 mb-6"></div>
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-20 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="h-6 bg-gray-200 rounded w-1/2 mb-6"></div>
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SmartBudgetPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Suspense fallback={<SmartBudgetLoadingSkeleton />}>
          <SmartBudgetManagement />
        </Suspense>
      </div>
    </div>
  );
}

