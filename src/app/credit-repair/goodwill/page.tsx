/**
 * Goodwill Letters Page
 *
 * AI-powered goodwill letter generator for late payment removal
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import GoodwillLetterGenerator from "@/components/credit-repair/GoodwillLetterGenerator";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface User {
  id: string;
  email: string;
  user_metadata: {
    full_name?: string;
  };
}

export default function GoodwillPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/auth/login");
        return;
      }

      setUser(session.user as User);
      setLoading(false);
    };

    getUser();
  }, [router, supabase.auth]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-blue-50 to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-slate-300">
            Loading goodwill letter generator...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50 to-blue-50">
      <header className="bg-white dark:bg-slate-800/80 backdrop-blur-sm shadow-sm border-b border-white/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-emerald-600 rounded-lg flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-lg"></span>
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent">
                  Goodwill Letters
                </h1>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  Late Payment Removal
                </p>
              </div>
            </div>

            <nav className="hidden md:flex items-center space-x-6">
              <Link
                href="/dashboard"
                className="text-sm font-medium text-gray-700 dark:text-slate-200 hover:text-blue-600 transition-colors"
              >
                Dashboard
              </Link>
              <Link
                href="/credit-repair"
                className="text-sm font-medium text-gray-700 dark:text-slate-200 hover:text-blue-600 transition-colors"
              >
                Credit Repair
              </Link>
            </nav>

            <div className="flex items-center space-x-4">
              <span className="hidden sm:block text-sm text-gray-700 dark:text-slate-200 max-w-32 truncate">
                {user?.user_metadata?.full_name || user?.email}
              </span>
              <button
                onClick={handleSignOut}
                className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-md text-sm font-medium text-gray-700 dark:text-slate-200 bg-white hover:bg-gray-50 dark:hover:bg-slate-700 dark:bg-slate-900 transition-colors"
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
                <Link
                  href="/credit-repair"
                  className="text-gray-500 hover:text-gray-700 dark:hover:text-slate-200 dark:text-slate-200"
                >
                  Credit Repair
                </Link>
              </li>
              <li>
                <span className="text-gray-400 dark:text-slate-500">/</span>
              </li>
              <li>
                <span className="text-gray-900 dark:text-white font-medium">
                  Goodwill Letters
                </span>
              </li>
            </ol>
          </nav>
        </div>

        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="text-2xl"></div>
            <div>
              <h3 className="text-sm font-bold text-blue-900 mb-1">
                AI-Powered Goodwill Letters
              </h3>
              <p className="text-xs text-blue-800">
                Request removal of late payments with personalized, empathetic
                letters. 60% success rate for customers with good payment
                history.
              </p>
            </div>
          </div>
        </div>

        <GoodwillLetterGenerator />
      </main>
    </div>
  );
}
