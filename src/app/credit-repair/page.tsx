/**
 * Credit Intelligence Dashboard Page
 *
 * Main hub for credit tools showing:
 * - Credit Intelligence Score (0-100)
 * - Quick Actions (30-day strategies)
 * - Medium-Term Strategies (60-90 days)
 * - Long-Term Planning (6+ months)
 * - Navigation to all credit intelligence tools
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import CreditRepairDashboard from '@/components/credit-repair/CreditRepairDashboard';
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

export default function CreditRepairPage() {
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
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading credit repair dashboard...</p>
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
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-600 rounded-lg flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-lg">💳</span>
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-600 bg-clip-text text-transparent">
                  CPFI
                </h1>
                <p className="text-sm text-gray-500">Credit Repair System</p>
              </div>
            </div>
            
            {/* Navigation */}
            <nav className="hidden md:flex items-center space-x-6">
              <Link href="/dashboard" className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors">
                Dashboard
              </Link>
              <Link href="/credit-repair" className="text-sm font-medium text-blue-600 border-b-2 border-blue-600 pb-1">
                Credit Repair
              </Link>
              <Link href="/student-loan-agent" className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors">
                Student Loans
              </Link>
              <Link href="/pricing" className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors">
                Pricing
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
        {/* Quick Access Tools */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Credit Intelligence Tools</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              href="/credit-repair/disputes"
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border-2 border-transparent hover:border-red-500"
            >
              <div className="text-3xl mb-3">⚡</div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Dispute Letter Generator</h3>
              <p className="text-sm text-gray-600">Generate FCRA-compliant dispute letters</p>
              <div className="mt-3 text-xs text-red-600 font-semibold">Learn Proven Strategies</div>
            </Link>

            <Link
              href="/credit-repair/cards"
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border-2 border-transparent hover:border-green-500"
            >
              <div className="text-3xl mb-3">💳</div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Utilization Calculator</h3>
              <p className="text-sm text-gray-600">Calculate optimal credit card usage</p>
              <div className="mt-3 text-xs text-green-600 font-semibold">Smart Strategies</div>
            </Link>

            <Link
              href="/credit-repair/goodwill"
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border-2 border-transparent hover:border-purple-500"
            >
              <div className="text-3xl mb-3">💌</div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Goodwill Templates</h3>
              <p className="text-sm text-gray-600">AI-generated goodwill letter templates</p>
              <div className="mt-3 text-xs text-purple-600 font-semibold">Professional Templates</div>
            </Link>

            <Link
              href="/credit-repair/negotiate"
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border-2 border-transparent hover:border-orange-500"
            >
              <div className="text-3xl mb-3">💰</div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Negotiation Guide</h3>
              <p className="text-sm text-gray-600">Learn pay-for-delete strategies</p>
              <div className="mt-3 text-xs text-orange-600 font-semibold">Expert Guidance</div>
            </Link>
          </div>
        </div>

        {/* Credit Repair Dashboard Component */}
        <CreditRepairDashboard userId={user?.id} />

        {/* Additional Tools */}
        <div className="mt-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">More Tools</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link 
              href="/credit-repair/inquiries"
              className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center space-x-3">
                <div className="text-2xl">🔍</div>
                <div>
                  <h3 className="font-bold text-gray-900">Inquiry Removal</h3>
                  <p className="text-xs text-gray-600">Remove hard inquiries</p>
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
                  <h3 className="font-bold text-gray-900">Payment Timing</h3>
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
                  <h3 className="font-bold text-gray-900">Credit Building</h3>
                  <p className="text-xs text-gray-600">Build credit from scratch</p>
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* Info Section */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-bold text-blue-900 mb-2">🤖 AI-Powered Credit Repair</h3>
          <p className="text-sm text-blue-800 mb-4">
            Our system uses advanced AI to analyze your credit report and provide personalized strategies 
            that are 3-5x faster than traditional credit repair methods.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">70-95%</div>
              <div className="text-xs text-blue-700">Success Rate</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">30-90</div>
              <div className="text-xs text-blue-700">Days to Results</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">10-100+</div>
              <div className="text-xs text-blue-700">Point Increase</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

