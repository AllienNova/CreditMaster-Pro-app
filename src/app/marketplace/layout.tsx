/**
 * Marketplace Layout
 * 
 * Shared layout for all marketplace pages with navigation sidebar,
 * marketplace branding, and consistent styling.
 */

import Link from 'next/link';
import { ReactNode } from 'react';

interface MarketplaceLayoutProps {
  children: ReactNode;
}

const marketplaceCategories = [
  { name: 'Overview', href: '/marketplace', icon: '🏠' },
  { name: 'Credit Monitoring', href: '/marketplace/monitoring', icon: '📊' },
  { name: 'Tradelines', href: '/marketplace/tradelines', icon: '📈' },
  { name: 'Credit Repair Services', href: '/marketplace/services', icon: '🔧' },
  { name: 'Education Library', href: '/marketplace/education', icon: '📚' },
  { name: 'Calculators', href: '/marketplace/calculators', icon: '🧮' },
  { name: 'Report Analysis', href: '/marketplace/analysis', icon: '🔍' },
  { name: 'Secured Cards', href: '/marketplace/secured-cards', icon: '💳' },
  { name: 'Builder Loans', href: '/marketplace/loans', icon: '💰' },
  { name: 'Debt Consolidation', href: '/marketplace/consolidation', icon: '📋' },
  { name: 'Credit Attorneys', href: '/marketplace/attorneys', icon: '⚖️' },
  { name: 'Financial Coaching', href: '/marketplace/coaching', icon: '🎯' },
  { name: 'Community', href: '/marketplace/community', icon: '👥' },
];

export default function MarketplaceLayout({ children }: MarketplaceLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">
                ← Dashboard
              </Link>
              <div className="h-6 w-px bg-gray-300" />
              <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Marketplace
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500">
                Trusted products & services for credit building
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar Navigation */}
        <aside className="w-64 bg-white border-r border-gray-200 min-h-[calc(100vh-4rem)] hidden lg:block">
          <nav className="p-4 space-y-1">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-3">
              Categories
            </p>
            {marketplaceCategories.map((category) => (
              <Link
                key={category.href}
                href={category.href}
                className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
              >
                <span className="text-lg">{category.icon}</span>
                <span>{category.name}</span>
              </Link>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

