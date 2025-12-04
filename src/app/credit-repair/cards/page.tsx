/**
 * Credit Cards / Utilization Optimizer Page
 * 
 * Optimize credit card utilization with:
 * - Multi-card management
 * - Per-card utilization calculation
 * - Overall utilization tracking
 * - Payment optimization algorithm
 * - Score impact predictions
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import UtilizationOptimizer from '@/components/credit-repair/UtilizationOptimizer';
import Link from 'next/link';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

interface User {
  id: string;
  email: string;
  user_metadata: {
    full_name?: string;
  };
}

export default function CardsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/login');
        return;
      }

      setUser(session.user as User);
      setLoading(false);
    };

    getUser();
  }, [router, supabase.auth]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-cyan-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading utilization optimizer...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-cyan-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-white/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-r from-green-600 to-teal-600 rounded-lg flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-lg">💳</span>
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent">
                  Utilization Optimizer
                </h1>
                <p className="text-sm text-gray-500">Credit Card Management</p>
              </div>
            </div>
            
            {/* Navigation */}
            <nav className="hidden md:flex items-center space-x-6">
              <Link href="/dashboard" className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors">
                Dashboard
              </Link>
              <Link href="/credit-repair" className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors">
                Credit Repair
              </Link>
              <Link href="/credit-repair/disputes" className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors">
                Disputes
              </Link>
              <Link href="/credit-repair/cards" className="text-sm font-medium text-green-600 border-b-2 border-green-600 pb-1">
                Cards
              </Link>
            </nav>

            <div className="flex items-center space-x-4">
              <span className="hidden sm:block text-sm text-gray-700 max-w-32 truncate">
                {user?.user_metadata?.full_name || user?.email}
              </span>
              <button 
                onClick={handleSignOut}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <div className="mb-6">
          <nav className="flex" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-2 text-sm">
              <li>
                <Link href="/credit-repair" className="text-gray-500 hover:text-gray-700">
                  Credit Repair
                </Link>
              </li>
              <li>
                <span className="text-gray-400">/</span>
              </li>
              <li>
                <span className="text-gray-900 font-medium">Cards</span>
              </li>
            </ol>
          </nav>
        </div>

        {/* Info Banner */}
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="text-2xl">💳</div>
            <div>
              <h3 className="text-sm font-bold text-green-900 mb-1">Credit Utilization Optimization</h3>
              <p className="text-xs text-green-800">
                Utilization is 30% of your credit score. Keep it under 10% per card and overall for maximum impact. 
                Our AI calculates the optimal payment distribution to boost your score by 10-50 points.
              </p>
            </div>
          </div>
        </div>

        {/* Utilization Optimizer Component */}
        <UtilizationOptimizer />

        {/* Utilization Guide */}
        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Utilization Impact Guide</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border-2 border-green-500 rounded-lg p-4 bg-green-50">
              <div className="text-center mb-2">
                <div className="text-3xl font-bold text-green-600">0-10%</div>
                <div className="text-sm text-green-700 font-semibold">Excellent</div>
              </div>
              <p className="text-xs text-green-800 text-center">
                Maximum score impact. Aim for this range on all cards.
              </p>
            </div>

            <div className="border-2 border-yellow-500 rounded-lg p-4 bg-yellow-50">
              <div className="text-center mb-2">
                <div className="text-3xl font-bold text-yellow-600">10-30%</div>
                <div className="text-sm text-yellow-700 font-semibold">Good</div>
              </div>
              <p className="text-xs text-yellow-800 text-center">
                Acceptable range. Minor negative impact on score.
              </p>
            </div>

            <div className="border-2 border-red-500 rounded-lg p-4 bg-red-50">
              <div className="text-center mb-2">
                <div className="text-3xl font-bold text-red-600">30%+</div>
                <div className="text-sm text-red-700 font-semibold">High Risk</div>
              </div>
              <p className="text-xs text-red-800 text-center">
                Significant negative impact. Pay down immediately.
              </p>
            </div>
          </div>
        </div>

        {/* Pro Tips */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-bold text-blue-900 mb-3">💡 Pro Tips for Maximum Impact</h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li className="flex items-start space-x-2">
              <span className="text-blue-600 font-bold">1.</span>
              <span><strong>Pay BEFORE statement date</strong> - Utilization is reported on statement closing date, not due date</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-blue-600 font-bold">2.</span>
              <span><strong>Keep cards open</strong> - Closing cards reduces total available credit and increases utilization</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-blue-600 font-bold">3.</span>
              <span><strong>Request credit limit increases</strong> - Higher limits = lower utilization (if you don't spend more)</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-blue-600 font-bold">4.</span>
              <span><strong>Use multiple cards</strong> - Spread purchases across cards to keep per-card utilization low</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-blue-600 font-bold">5.</span>
              <span><strong>Make multiple payments</strong> - Pay down balances multiple times per month to keep utilization low</span>
            </li>
          </ul>
        </div>

        {/* Score Impact Calculator */}
        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Expected Score Impact</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Utilization Reduction</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span>50% → 30%</span>
                  <span className="font-bold text-green-600">+10-15 points</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span>50% → 10%</span>
                  <span className="font-bold text-green-600">+20-30 points</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span>50% → 0%</span>
                  <span className="font-bold text-green-600">+30-50 points</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Timeline</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-start space-x-2">
                  <span className="text-blue-600 font-bold">Day 1:</span>
                  <span>Make payment to reduce utilization</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-blue-600 font-bold">Day 2-7:</span>
                  <span>Payment posts to account</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-blue-600 font-bold">Day 8-30:</span>
                  <span>Wait for statement closing date</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-blue-600 font-bold">Day 31-45:</span>
                  <span>New utilization reported to bureaus</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-blue-600 font-bold">Day 46+:</span>
                  <span className="font-bold text-green-600">Score increases! 🎉</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Related Tools */}
        <div className="mt-8">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Related Tools</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link 
              href="/credit-repair/disputes"
              className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center space-x-3">
                <div className="text-2xl">⚡</div>
                <div>
                  <h4 className="font-bold text-gray-900">Dispute Accelerator</h4>
                  <p className="text-xs text-gray-600">Remove inaccurate items</p>
                </div>
              </div>
            </Link>

            <Link 
              href="/credit-repair/payments"
              className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center space-x-3">
                <div className="text-2xl">📅</div>
                <div>
                  <h4 className="font-bold text-gray-900">Payment Timing</h4>
                  <p className="text-xs text-gray-600">Optimize payment dates</p>
                </div>
              </div>
            </Link>

            <Link 
              href="/credit-repair/building"
              className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center space-x-3">
                <div className="text-2xl">🏗️</div>
                <div>
                  <h4 className="font-bold text-gray-900">Credit Building</h4>
                  <p className="text-xs text-gray-600">Build credit history</p>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

