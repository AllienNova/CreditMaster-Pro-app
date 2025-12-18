/**
 * Investment Intelligence Dashboard Page
 * 
 * Main page for AI-powered investment analysis and recommendations
 */

import { Suspense } from 'react';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import dynamic from 'next/dynamic';

// Dynamic import for client components
const InvestmentDashboard = dynamic(
  () => import('@/components/investments/dashboard/InvestmentDashboard'),
  { 
    ssr: false,
    loading: () => <DashboardLoading />
  }
);

function DashboardLoading() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        <p className="text-gray-400 mt-4">Loading Investment Dashboard...</p>
      </div>
    </div>
  );
}

export default async function InvestmentsPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect('/auth/signin?callbackUrl=/investments');
  }

  return (
    <Suspense fallback={<DashboardLoading />}>
      <InvestmentDashboard userId={session.user.id} />
    </Suspense>
  );
}

export const metadata = {
  title: 'Investment Intelligence | CreditMaster Pro',
  description: 'AI-powered investment analysis, technical indicators, pattern recognition, and personalized recommendations',
};

