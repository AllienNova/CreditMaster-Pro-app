/**
 * Disputes Page
 * 
 * AI-powered dispute letter generator with:
 * - 10 proven dispute strategies
 * - FCRA-compliant letter generation
 * - Success rate predictions
 * - 30-day tracking
 * - CFPB escalation
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import DisputeAccelerator from '@/components/credit-repair/DisputeAccelerator';
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

export default function DisputesPage() {
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
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dispute accelerator...</p>
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
              <div className="w-10 h-10 bg-gradient-to-r from-red-600 to-orange-600 rounded-lg flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-lg">⚡</span>
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
                  Dispute Accelerator
                </h1>
                <p className="text-sm text-gray-500">AI-Powered FCRA Disputes</p>
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
              <Link href="/credit-repair/disputes" className="text-sm font-medium text-red-600 border-b-2 border-red-600 pb-1">
                Disputes
              </Link>
              <Link href="/credit-repair/cards" className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors">
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
                <span className="text-gray-900 font-medium">Disputes</span>
              </li>
            </ol>
          </nav>
        </div>

        {/* Info Banner */}
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="text-2xl">⚡</div>
            <div>
              <h3 className="text-sm font-bold text-red-900 mb-1">AI-Powered Dispute Letters</h3>
              <p className="text-xs text-red-800">
                Generate FCRA-compliant dispute letters with 70-95% success rate. Our AI analyzes your situation 
                and selects the best strategy for maximum effectiveness.
              </p>
            </div>
          </div>
        </div>

        {/* Dispute Accelerator Component */}
        <DisputeAccelerator userId={user?.id} />

        {/* Strategy Guide */}
        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Dispute Strategy Guide</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-bold text-gray-900 mb-2">📋 Basic Dispute</h3>
              <p className="text-sm text-gray-600 mb-2">Best for: Simple inaccuracies</p>
              <div className="text-xs text-green-600 font-semibold">Success Rate: 70%</div>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-bold text-gray-900 mb-2">✅ Debt Validation</h3>
              <p className="text-sm text-gray-600 mb-2">Best for: Collections & debts</p>
              <div className="text-xs text-green-600 font-semibold">Success Rate: 75%</div>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-bold text-gray-900 mb-2">🔍 Method of Verification</h3>
              <p className="text-sm text-gray-600 mb-2">Best for: Challenging bureau process</p>
              <div className="text-xs text-green-600 font-semibold">Success Rate: 65%</div>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-bold text-gray-900 mb-2">⏰ Statute of Limitations</h3>
              <p className="text-sm text-gray-600 mb-2">Best for: Old debts (7+ years)</p>
              <div className="text-xs text-green-600 font-semibold">Success Rate: 95%</div>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-bold text-gray-900 mb-2">🛡️ Identity Theft</h3>
              <p className="text-sm text-gray-600 mb-2">Best for: Fraudulent accounts</p>
              <div className="text-xs text-green-600 font-semibold">Success Rate: 85%</div>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-bold text-gray-900 mb-2">📊 Mixed File</h3>
              <p className="text-sm text-gray-600 mb-2">Best for: Wrong person's info</p>
              <div className="text-xs text-green-600 font-semibold">Success Rate: 80%</div>
            </div>
          </div>
        </div>

        {/* Tips Section */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-bold text-blue-900 mb-3">💡 Pro Tips for Success</h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li className="flex items-start space-x-2">
              <span className="text-blue-600 font-bold">1.</span>
              <span>Send disputes via certified mail with return receipt</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-blue-600 font-bold">2.</span>
              <span>Keep copies of all correspondence and tracking numbers</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-blue-600 font-bold">3.</span>
              <span>Wait 30 days for bureau response before following up</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-blue-600 font-bold">4.</span>
              <span>If no response after 30 days, file CFPB complaint</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-blue-600 font-bold">5.</span>
              <span>Dispute one item at a time for best results</span>
            </li>
          </ul>
        </div>

        {/* Related Tools */}
        <div className="mt-8">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Related Tools</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link 
              href="/credit-repair/cards"
              className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center space-x-3">
                <div className="text-2xl">💳</div>
                <div>
                  <h4 className="font-bold text-gray-900">Utilization Optimizer</h4>
                  <p className="text-xs text-gray-600">Optimize credit card usage</p>
                </div>
              </div>
            </Link>

            <Link 
              href="/credit-repair/goodwill"
              className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center space-x-3">
                <div className="text-2xl">💌</div>
                <div>
                  <h4 className="font-bold text-gray-900">Goodwill Letters</h4>
                  <p className="text-xs text-gray-600">Remove late payments</p>
                </div>
              </div>
            </Link>

            <Link 
              href="/credit-repair/negotiate"
              className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center space-x-3">
                <div className="text-2xl">💰</div>
                <div>
                  <h4 className="font-bold text-gray-900">Pay-for-Delete</h4>
                  <p className="text-xs text-gray-600">Negotiate collections</p>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

