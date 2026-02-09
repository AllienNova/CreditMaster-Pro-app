/**
 * Tradeline Marketplace
 *
 * Authorized user tradeline marketplace with search/filter,
 * tradeline cards, score impact calculator, and provider info.
 *
 * Now integrated with backend API instead of mock data.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';

interface Tradeline {
  id: string;
  providerId: string;
  creditLimit: number;
  ageMonths: number;
  utilization: number;
  price: number;
  estimatedScoreImpact: number;
  bureausReporting: string[];
  available: boolean;
  valueScore?: number;
  // Provider info if joined
  provider?: {
    name: string;
    rating: number;
    verified: boolean;
  };
}

interface TradelineFilters {
  minCreditLimit?: number;
  maxPrice?: number;
  minAge?: number;
  bureaus?: string[];
}

// Fallback mock data for development/offline mode
const mockTradelines: Tradeline[] = [
  { id: '1', providerId: 'p1', creditLimit: 25000, ageMonths: 84, utilization: 5, price: 850, estimatedScoreImpact: 45, bureausReporting: ['Experian', 'Equifax', 'TransUnion'], available: true },
  { id: '2', providerId: 'p2', creditLimit: 15000, ageMonths: 60, utilization: 8, price: 550, estimatedScoreImpact: 35, bureausReporting: ['Experian', 'TransUnion'], available: true },
  { id: '3', providerId: 'p1', creditLimit: 50000, ageMonths: 120, utilization: 3, price: 1200, estimatedScoreImpact: 60, bureausReporting: ['Experian', 'Equifax', 'TransUnion'], available: true },
  { id: '4', providerId: 'p3', creditLimit: 10000, ageMonths: 36, utilization: 10, price: 350, estimatedScoreImpact: 25, bureausReporting: ['Equifax'], available: false },
  { id: '5', providerId: 'p4', creditLimit: 35000, ageMonths: 96, utilization: 4, price: 950, estimatedScoreImpact: 50, bureausReporting: ['Experian', 'Equifax'], available: true },
];

function TradelineCard({ tradeline }: { tradeline: Tradeline }) {
  const ageYears = Math.floor(tradeline.ageMonths / 12);
  const ageRemaining = tradeline.ageMonths % 12;

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border ${tradeline.available ? 'border-gray-200' : 'border-gray-300 dark:border-slate-600 opacity-60'}`}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">
            {tradeline.provider?.name || `Provider ${tradeline.providerId.slice(0, 8)}`}
          </h3>
          <p className="text-sm text-gray-500 dark:text-slate-400">{tradeline.bureausReporting.join(', ')}</p>
        </div>
        <div className="flex items-center gap-2">
          {tradeline.provider?.verified && (
            <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
              Verified
            </span>
          )}
          <span className={`px-2 py-1 text-xs rounded-full ${tradeline.available ? 'bg-green-100 text-green-800' : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300'}`}>
            {tradeline.available ? 'Available' : 'Sold Out'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-xs text-gray-500 dark:text-slate-400">Credit Limit</p>
          <p className="font-semibold text-gray-900 dark:text-white">${tradeline.creditLimit.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-slate-400">Age</p>
          <p className="font-semibold text-gray-900 dark:text-white">{ageYears}y {ageRemaining}m</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-slate-400">Utilization</p>
          <p className="font-semibold text-gray-900 dark:text-white">{tradeline.utilization}%</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-slate-400">Est. Impact</p>
          <p className="font-semibold text-green-600">+{tradeline.estimatedScoreImpact} pts</p>
        </div>
      </div>

      {tradeline.valueScore !== undefined && (
        <div className="mb-4 p-2 bg-blue-50 rounded-lg">
          <p className="text-xs text-blue-600 font-medium">
            Value Score: {tradeline.valueScore.toFixed(1)} (higher is better)
          </p>
        </div>
      )}

      <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-slate-700">
        <span className="text-xl font-bold text-blue-600">${tradeline.price}</span>
        <button disabled={!tradeline.available}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${tradeline.available ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-slate-400 cursor-not-allowed'}`}>
          {tradeline.available ? 'View Details' : 'Unavailable'}
        </button>
      </div>
    </div>
  );
}

function ScoreImpactCalculator({ tradelines }: { tradelines: Tradeline[] }) {
  const [currentScore, setCurrentScore] = useState(650);
  const [selectedTradelines, setSelectedTradelines] = useState<string[]>([]);

  const totalImpact = tradelines
    .filter(t => selectedTradelines.includes(t.id))
    .reduce((sum, t) => sum + t.estimatedScoreImpact, 0);

  const toggleTradeline = (id: string) => {
    setSelectedTradelines(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-blue-50 rounded-xl p-6 border border-blue-100">
      <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Score Impact Calculator</h3>
      <div className="space-y-4">
        <div>
          <label className="text-sm text-gray-600 dark:text-slate-300">Current Score</label>
          <input type="number" value={currentScore} onChange={(e) => setCurrentScore(Number(e.target.value))}
            className="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg" min={300} max={850} />
        </div>

        <div className="space-y-2">
          <label className="text-sm text-gray-600 dark:text-slate-300">Select Tradelines</label>
          {tradelines.filter(t => t.available).slice(0, 5).map(t => (
            <label key={t.id} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedTradelines.includes(t.id)}
                onChange={() => toggleTradeline(t.id)}
                className="rounded border-gray-300 dark:border-slate-600"
              />
              <span className="text-sm text-gray-700 dark:text-slate-200">
                ${t.creditLimit.toLocaleString()} ({Math.floor(t.ageMonths / 12)}y) - +{t.estimatedScoreImpact} pts
              </span>
            </label>
          ))}
        </div>

        <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-lg">
          <div>
            <p className="text-sm text-gray-500 dark:text-slate-400">Estimated New Score</p>
            <p className="text-3xl font-bold text-blue-600">{Math.min(850, currentScore + totalImpact)}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500 dark:text-slate-400">Potential Increase</p>
            <p className="text-2xl font-bold text-green-600">+{totalImpact}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
            <div className="flex justify-between items-start mb-4">
              <div className="space-y-2">
                <div className="h-4 w-32 bg-gray-200 dark:bg-slate-700 rounded" />
                <div className="h-3 w-24 bg-gray-200 dark:bg-slate-700 rounded" />
              </div>
              <div className="h-6 w-16 bg-gray-200 dark:bg-slate-700 rounded-full" />
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              {[1, 2, 3, 4].map((j) => (
                <div key={j} className="space-y-1">
                  <div className="h-3 w-16 bg-gray-200 dark:bg-slate-700 rounded" />
                  <div className="h-4 w-20 bg-gray-200 dark:bg-slate-700 rounded" />
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-slate-700">
              <div className="h-6 w-16 bg-gray-200 dark:bg-slate-700 rounded" />
              <div className="h-10 w-24 bg-gray-200 dark:bg-slate-700 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TradelinesPage() {
  const [tradelines, setTradelines] = useState<Tradeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<TradelineFilters>({ minCreditLimit: 0, maxPrice: 2000, minAge: 0 });
  const [sortBy, setSortBy] = useState<'price' | 'impact' | 'age' | 'value'>('impact');

  // Fetch tradelines from API
  const fetchTradelines = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (filters.minCreditLimit && filters.minCreditLimit > 0) {
        params.append('minCreditLimit', filters.minCreditLimit.toString());
      }
      if (filters.maxPrice) {
        params.append('maxPrice', filters.maxPrice.toString());
      }
      if (filters.minAge && filters.minAge > 0) {
        params.append('minAge', filters.minAge.toString());
      }
      params.append('available', 'true');

      const response = await fetch(`/api/marketplace/tradelines?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch tradelines');
      }

      const result = await response.json();

      if (result.success && result.data) {
        setTradelines(result.data);
      } else {
        // Fallback to mock data if API returns empty or error
        console.warn('Using mock data:', result.error || 'No data returned');
        setTradelines(mockTradelines);
      }
    } catch (err) {
      console.error('Error fetching tradelines:', err);
      // Use mock data as fallback
      setTradelines(mockTradelines);
      setError('Unable to load from server. Showing sample data.');
    } finally {
      setLoading(false);
    }
  }, [filters.minCreditLimit, filters.maxPrice, filters.minAge]);

  // Fetch on mount and when filters change
  useEffect(() => {
    fetchTradelines();
  }, [fetchTradelines]);

  // Sort tradelines client-side
  const sortedTradelines = [...tradelines].sort((a, b) => {
    switch (sortBy) {
      case 'price':
        return a.price - b.price;
      case 'impact':
        return b.estimatedScoreImpact - a.estimatedScoreImpact;
      case 'age':
        return b.ageMonths - a.ageMonths;
      case 'value':
        return (b.valueScore || 0) - (a.valueScore || 0);
      default:
        return 0;
    }
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tradeline Marketplace</h1>
        <p className="text-gray-600 dark:text-slate-300">Authorized user tradelines to boost your credit score</p>
      </div>

      {error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-3">
          <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-sm text-yellow-800">{error}</p>
          <button onClick={fetchTradelines} className="ml-auto text-sm text-yellow-600 hover:text-yellow-800 font-medium">
            Retry
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Filters</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-600 dark:text-slate-300">Min Credit Limit</label>
                <select value={filters.minCreditLimit || 0} onChange={(e) => setFilters({...filters, minCreditLimit: Number(e.target.value)})}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg">
                  <option value={0}>Any</option>
                  <option value={5000}>$5,000+</option>
                  <option value={10000}>$10,000+</option>
                  <option value={25000}>$25,000+</option>
                  <option value={50000}>$50,000+</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-600 dark:text-slate-300">Max Price: ${filters.maxPrice}</label>
                <input type="range" min={100} max={2000} step={50} value={filters.maxPrice}
                  onChange={(e) => setFilters({...filters, maxPrice: Number(e.target.value)})}
                  className="w-full mt-1" />
              </div>
              <div>
                <label className="text-sm text-gray-600 dark:text-slate-300">Min Age (months)</label>
                <select value={filters.minAge || 0} onChange={(e) => setFilters({...filters, minAge: Number(e.target.value)})}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg">
                  <option value={0}>Any</option>
                  <option value={24}>2+ years</option>
                  <option value={36}>3+ years</option>
                  <option value={60}>5+ years</option>
                  <option value={84}>7+ years</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-600 dark:text-slate-300">Sort By</label>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg">
                  <option value="impact">Highest Impact</option>
                  <option value="value">Best Value</option>
                  <option value="price">Lowest Price</option>
                  <option value="age">Oldest First</option>
                </select>
              </div>
            </div>
          </div>
          <ScoreImpactCalculator tradelines={sortedTradelines} />
        </div>

        {/* Tradeline Grid */}
        <div className="lg:col-span-3">
          {loading ? (
            <LoadingSkeleton />
          ) : sortedTradelines.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-xl p-12 text-center border border-gray-200 dark:border-slate-700">
              <svg className="w-12 h-12 mx-auto text-gray-400 dark:text-slate-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-gray-600 dark:text-slate-300 mb-4">No tradelines match your filters</p>
              <button
                onClick={() => setFilters({ minCreditLimit: 0, maxPrice: 2000, minAge: 0 })}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
                Showing {sortedTradelines.length} tradeline{sortedTradelines.length !== 1 ? 's' : ''}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {sortedTradelines.map((t) => <TradelineCard key={t.id} tradeline={t} />)}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
