/**
 * Tradeline Marketplace
 * 
 * Authorized user tradeline marketplace with search/filter,
 * tradeline cards, score impact calculator, and provider info.
 */

'use client';

import { useState } from 'react';

interface Tradeline {
  id: string;
  provider: string;
  creditLimit: number;
  ageMonths: number;
  utilization: number;
  price: number;
  estimatedImpact: number;
  bureaus: string[];
  available: boolean;
}

const mockTradelines: Tradeline[] = [
  { id: '1', provider: 'TradeLine Pro', creditLimit: 25000, ageMonths: 84, utilization: 5, price: 850, estimatedImpact: 45, bureaus: ['Experian', 'Equifax', 'TransUnion'], available: true },
  { id: '2', provider: 'Credit Boost Inc', creditLimit: 15000, ageMonths: 60, utilization: 8, price: 550, estimatedImpact: 35, bureaus: ['Experian', 'TransUnion'], available: true },
  { id: '3', provider: 'AU Solutions', creditLimit: 50000, ageMonths: 120, utilization: 3, price: 1200, estimatedImpact: 60, bureaus: ['Experian', 'Equifax', 'TransUnion'], available: true },
  { id: '4', provider: 'TradeLine Pro', creditLimit: 10000, ageMonths: 36, utilization: 10, price: 350, estimatedImpact: 25, bureaus: ['Equifax'], available: false },
  { id: '5', provider: 'Prime Tradelines', creditLimit: 35000, ageMonths: 96, utilization: 4, price: 950, estimatedImpact: 50, bureaus: ['Experian', 'Equifax'], available: true },
];

function TradelineCard({ tradeline }: { tradeline: Tradeline }) {
  const ageYears = Math.floor(tradeline.ageMonths / 12);
  const ageRemaining = tradeline.ageMonths % 12;

  return (
    <div className={`bg-white rounded-xl p-6 shadow-sm border ${tradeline.available ? 'border-gray-200' : 'border-gray-300 opacity-60'}`}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-semibold text-gray-900">{tradeline.provider}</h3>
          <p className="text-sm text-gray-500">{tradeline.bureaus.join(', ')}</p>
        </div>
        <span className={`px-2 py-1 text-xs rounded-full ${tradeline.available ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
          {tradeline.available ? 'Available' : 'Sold Out'}
        </span>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-xs text-gray-500">Credit Limit</p>
          <p className="font-semibold text-gray-900">${tradeline.creditLimit.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Age</p>
          <p className="font-semibold text-gray-900">{ageYears}y {ageRemaining}m</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Utilization</p>
          <p className="font-semibold text-gray-900">{tradeline.utilization}%</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Est. Impact</p>
          <p className="font-semibold text-green-600">+{tradeline.estimatedImpact} pts</p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <span className="text-xl font-bold text-indigo-600">${tradeline.price}</span>
        <button disabled={!tradeline.available}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${tradeline.available ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}>
          {tradeline.available ? 'View Details' : 'Unavailable'}
        </button>
      </div>
    </div>
  );
}

function ScoreImpactCalculator() {
  const [currentScore, setCurrentScore] = useState(650);
  const [selectedTradelines, setSelectedTradelines] = useState<string[]>([]);

  const totalImpact = mockTradelines
    .filter(t => selectedTradelines.includes(t.id))
    .reduce((sum, t) => sum + t.estimatedImpact, 0);

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-100">
      <h3 className="font-semibold text-gray-900 mb-4">Score Impact Calculator</h3>
      <div className="space-y-4">
        <div>
          <label className="text-sm text-gray-600">Current Score</label>
          <input type="number" value={currentScore} onChange={(e) => setCurrentScore(Number(e.target.value))}
            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg" min={300} max={850} />
        </div>
        <div className="flex items-center justify-between p-4 bg-white rounded-lg">
          <div>
            <p className="text-sm text-gray-500">Estimated New Score</p>
            <p className="text-3xl font-bold text-indigo-600">{Math.min(850, currentScore + totalImpact)}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Potential Increase</p>
            <p className="text-2xl font-bold text-green-600">+{totalImpact}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TradelinesPage() {
  const [filters, setFilters] = useState({ minLimit: 0, maxPrice: 2000, minAge: 0 });
  const [sortBy, setSortBy] = useState<'price' | 'impact' | 'age'>('impact');

  const filteredTradelines = mockTradelines
    .filter(t => t.creditLimit >= filters.minLimit && t.price <= filters.maxPrice && t.ageMonths >= filters.minAge)
    .sort((a, b) => sortBy === 'price' ? a.price - b.price : sortBy === 'impact' ? b.estimatedImpact - a.estimatedImpact : b.ageMonths - a.ageMonths);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tradeline Marketplace</h1>
        <p className="text-gray-600">Authorized user tradelines to boost your credit score</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-4">Filters</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-600">Min Credit Limit</label>
                <select value={filters.minLimit} onChange={(e) => setFilters({...filters, minLimit: Number(e.target.value)})}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg">
                  <option value={0}>Any</option>
                  <option value={10000}>$10,000+</option>
                  <option value={25000}>$25,000+</option>
                  <option value={50000}>$50,000+</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-600">Max Price</label>
                <input type="range" min={200} max={2000} value={filters.maxPrice}
                  onChange={(e) => setFilters({...filters, maxPrice: Number(e.target.value)})}
                  className="w-full" />
                <p className="text-sm text-gray-500">${filters.maxPrice}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Sort By</label>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value as 'price' | 'impact' | 'age')}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg">
                  <option value="impact">Highest Impact</option>
                  <option value="price">Lowest Price</option>
                  <option value="age">Oldest First</option>
                </select>
              </div>
            </div>
          </div>
          <ScoreImpactCalculator />
        </div>

        {/* Tradeline Grid */}
        <div className="lg:col-span-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredTradelines.map((t) => <TradelineCard key={t.id} tradeline={t} />)}
          </div>
        </div>
      </div>
    </div>
  );
}

