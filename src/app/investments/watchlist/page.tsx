'use client';

/**
 * Watchlist Page
 * Track stocks you're interested in
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { EmptyState } from '@/components/ui/EmptyState';

interface WatchlistItem {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  addedAt: string;
}

// Popular stock suggestions
const STOCK_SUGGESTIONS = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'JPM',
];

export default function WatchlistPage() {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [newSymbol, setNewSymbol] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load watchlist from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('investment-watchlist');
    if (stored) {
      try {
        setWatchlist(JSON.parse(stored));
      } catch {
        console.error('Failed to parse watchlist');
      }
    }
    setIsLoading(false);
  }, []);

  // Save watchlist to localStorage when it changes
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem('investment-watchlist', JSON.stringify(watchlist));
    }
  }, [watchlist, isLoading]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatPercent = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };

  const handleAddSymbol = async (symbol: string) => {
    const normalizedSymbol = symbol.trim().toUpperCase();

    if (!normalizedSymbol) {
      setError('Please enter a stock symbol');
      return;
    }

    if (watchlist.some((item) => item.symbol === normalizedSymbol)) {
      setError(`${normalizedSymbol} is already in your watchlist`);
      return;
    }

    // Add with placeholder data
    const newItem: WatchlistItem = {
      symbol: normalizedSymbol,
      name: normalizedSymbol,
      price: 0,
      change: 0,
      changePercent: 0,
      addedAt: new Date().toISOString(),
    };

    setWatchlist((prev) => [...prev, newItem]);
    setNewSymbol('');
    setIsAddModalOpen(false);
    setError(null);

    // Fetch real data (would call API in production)
    // For now, simulate with random data
    setTimeout(() => {
      setWatchlist((prev) =>
        prev.map((item) =>
          item.symbol === normalizedSymbol
            ? {
                ...item,
                name: getStockName(normalizedSymbol),
                price: 100 + Math.random() * 400,
                change: (Math.random() - 0.5) * 20,
                changePercent: (Math.random() - 0.5) * 5,
              }
            : item
        )
      );
    }, 500);
  };

  const handleRemove = (symbol: string) => {
    if (confirm(`Remove ${symbol} from your watchlist?`)) {
      setWatchlist((prev) => prev.filter((item) => item.symbol !== symbol));
    }
  };

  // Get stock name (would come from API in production)
  const getStockName = (symbol: string): string => {
    const names: Record<string, string> = {
      AAPL: 'Apple Inc.',
      MSFT: 'Microsoft Corporation',
      GOOGL: 'Alphabet Inc.',
      AMZN: 'Amazon.com Inc.',
      TSLA: 'Tesla, Inc.',
      NVDA: 'NVIDIA Corporation',
      META: 'Meta Platforms, Inc.',
      JPM: 'JPMorgan Chase & Co.',
    };
    return names[symbol] || symbol;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-1/3" />
            <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/2" />
            <div className="space-y-3 mt-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-gray-200 dark:bg-slate-700 rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Watchlist
            </h1>
            <p className="mt-2 text-gray-600 dark:text-slate-400">
              Track stocks you're interested in
            </p>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Stock
          </button>
        </div>

        {/* Popular Suggestions (shown when empty) */}
        {watchlist.length === 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Popular Stocks
            </h2>
            <p className="text-sm text-gray-600 dark:text-slate-400 mb-4">
              Click to add to your watchlist
            </p>
            <div className="flex flex-wrap gap-2">
              {STOCK_SUGGESTIONS.map((symbol) => (
                <button
                  key={symbol}
                  onClick={() => handleAddSymbol(symbol)}
                  className="inline-flex items-center px-3 py-2 rounded-full text-sm font-medium bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-slate-200 hover:bg-emerald-100 dark:hover:bg-emerald-900 hover:text-emerald-800 dark:hover:text-emerald-200 transition-colors"
                >
                  {symbol}
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Watchlist */}
        {watchlist.length === 0 ? (
          <EmptyState
            type="no-data"
            title="Your Watchlist is Empty"
            description="Add stocks to track their performance and get insights"
            primaryAction={{
              label: 'Add Your First Stock',
              onClick: () => setIsAddModalOpen(true),
            }}
          />
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm overflow-hidden">
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {watchlist.map((item) => (
                <li key={item.symbol}>
                  <Link
                    href={`/investments/analyze/${item.symbol}`}
                    className="block hover:bg-gray-50 dark:hover:bg-slate-750 transition-colors"
                  >
                    <div className="px-6 py-4 flex items-center justify-between">
                      <div className="flex items-center min-w-0 flex-1">
                        <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                            {item.symbol.slice(0, 2)}
                          </span>
                        </div>
                        <div className="ml-4 min-w-0">
                          <p className="text-base font-semibold text-gray-900 dark:text-white truncate">
                            {item.symbol}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-slate-400 truncate">
                            {item.name}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-base font-semibold text-gray-900 dark:text-white">
                            {item.price > 0 ? formatCurrency(item.price) : '...'}
                          </p>
                          {item.price > 0 && (
                            <p
                              className={`text-sm font-medium ${ item.changePercent >= 0 ? 'text-emerald-600' : 'text-red-600 dark:text-red-400' }`}
                            >
                              {formatPercent(item.changePercent)}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            handleRemove(item.symbol);
                          }}
                          className="p-2 text-gray-400 dark:text-slate-500 hover:text-red-500 transition-colors"
                          title="Remove from watchlist"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Add Modal */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
              <div
                className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
                onClick={() => setIsAddModalOpen(false)}
              />
              <div className="relative transform overflow-hidden rounded-lg bg-white dark:bg-slate-800 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-md">
                <div className="px-6 py-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Add to Watchlist
                    </h3>
                    <button
                      onClick={() => setIsAddModalOpen(false)}
                      className="text-gray-400 hover:text-gray-500 dark:text-slate-400"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <p className="text-sm text-gray-600 dark:text-slate-400 mb-4">
                    Enter a stock symbol to add to your watchlist
                  </p>

                  {error && (
                    <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
                      {error}
                    </div>
                  )}

                  <input
                    type="text"
                    value={newSymbol}
                    onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddSymbol(newSymbol)}
                    placeholder="Enter symbol (e.g., AAPL)"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    autoFocus
                  />

                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={() => setIsAddModalOpen(false)}
                      className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleAddSymbol(newSymbol)}
                      className="flex-1 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700"
                    >
                      Add
                    </button>
                  </div>

                  {/* Quick Add */}
                  <div className="mt-6 pt-4 border-t border-gray-200 dark:border-slate-700">
                    <p className="text-sm font-medium text-gray-600 dark:text-slate-400 mb-2">
                      Quick Add:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {STOCK_SUGGESTIONS.slice(0, 4).map((symbol) => (
                        <button
                          key={symbol}
                          onClick={() => setNewSymbol(symbol)}
                          className="px-3 py-1.5 text-sm font-medium bg-gray-100 text-gray-700 dark:text-slate-300 rounded-lg hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600"
                        >
                          {symbol}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
