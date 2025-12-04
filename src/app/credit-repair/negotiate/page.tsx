/**
 * Pay-for-Delete Negotiation Page
 * 
 * AI-powered negotiation scripts for collection removal
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import PayForDeleteNegotiator from '@/components/credit-repair/PayForDeleteNegotiator';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface User {
  id: string;
  email: string;
  user_metadata: {
    full_name?: string;
  };
}

export default function NegotiatePage() {
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
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading pay-for-delete negotiator...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-cyan-50">
      <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-white/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-r from-orange-600 to-red-600 rounded-lg flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-lg">💰</span>
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                  Pay-for-Delete
                </h1>
                <p className="text-sm text-gray-500">Collection Negotiation</p>
              </div>
            </div>
            
            <nav className="hidden md:flex items-center space-x-6">
              <Link href="/dashboard" className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors">
                Dashboard
              </Link>
              <Link href="/credit-repair" className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors">
                Credit Repair
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                <span className="text-gray-900 font-medium">Pay-for-Delete</span>
              </li>
            </ol>
          </nav>
        </div>

        <div className="mb-6 bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="text-2xl">💰</div>
            <div>
              <h3 className="text-sm font-bold text-orange-900 mb-1">Pay-for-Delete Negotiation</h3>
              <p className="text-xs text-orange-800">
                Negotiate with collection agencies to remove negative items in exchange for payment. 50-70% success rate with proper negotiation.
              </p>
            </div>
          </div>
        </div>

        <PayForDeleteNegotiator />
      </main>
    </div>
  );
}

