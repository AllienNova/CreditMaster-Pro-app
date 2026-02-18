'use client';

/**
 * Investments Layout
 *
 * Shared layout for all investment sub-pages with navigation tabs.
 * Provides consistent header and tab navigation between investment features.
 */

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ReactNode } from 'react';

interface NavItem {
  label: string;
  href: string;
  description: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Overview',
    href: '/investments',
    description: 'Portfolio summary and key metrics',
  },
  {
    label: 'Holdings',
    href: '/investments/holdings',
    description: 'View and manage your positions',
  },
  {
    label: 'Performance',
    href: '/investments/performance',
    description: 'Historical returns and benchmarks',
  },
  {
    label: 'Watchlist',
    href: '/investments/watchlist',
    description: 'Track stocks of interest',
  },
  {
    label: 'Research',
    href: '/investments/research',
    description: 'AI-powered stock analysis',
  },
  {
    label: 'Analytics',
    href: '/investments/analytics',
    description: 'Risk and diversification metrics',
  },
  {
    label: 'Signals',
    href: '/investments/signals',
    description: 'AI trading signals',
  },
  {
    label: 'Dividends',
    href: '/investments/dividends',
    description: 'Dividend income tracking',
  },
  {
    label: 'Rebalance',
    href: '/investments/rebalance',
    description: 'Portfolio rebalancing tools',
  },
];

function isActiveRoute(pathname: string, href: string): boolean {
  if (href === '/investments') {
    return pathname === '/investments';
  }
  return pathname.startsWith(href);
}

export default function InvestmentsLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      {/* Navigation Bar */}
      <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav
            className="flex overflow-x-auto scrollbar-hide -mb-px"
            aria-label="Investment navigation"
          >
            {NAV_ITEMS.map((item) => {
              const isActive = isActiveRoute(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.description}
                  className={`
                    flex-shrink-0 px-4 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
                    ${
                      isActive
                        ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400'
                        : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:border-gray-300 dark:hover:border-slate-500'
                    }
                  `}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Page Content */}
      {children}
    </div>
  );
}
