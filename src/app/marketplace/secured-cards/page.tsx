/**
 * Secured Card Comparison
 * 
 * Best secured credit cards marketplace with card comparison,
 * detail modal, AI recommendations, and application tracking.
 */

'use client';

import { useState } from 'react';

interface SecuredCard {
  id: string;
  name: string;
  issuer: string;
  annualFee: number;
  minDeposit: number;
  maxDeposit: number;
  apr: string;
  rewards: string;
  creditBureaus: string[];
  features: string[];
  rating: number;
  recommended: boolean;
}

const mockCards: SecuredCard[] = [
  { id: '1', name: 'Discover it® Secured', issuer: 'Discover', annualFee: 0, minDeposit: 200, maxDeposit: 2500, apr: '28.24%', rewards: '2% cash back on gas/restaurants', creditBureaus: ['Experian', 'Equifax', 'TransUnion'], features: ['No annual fee', 'Cash back rewards', 'Free FICO score'], rating: 4.8, recommended: true },
  { id: '2', name: 'Capital One Platinum Secured', issuer: 'Capital One', annualFee: 0, minDeposit: 49, maxDeposit: 200, apr: '30.74%', rewards: 'None', creditBureaus: ['Experian', 'Equifax', 'TransUnion'], features: ['Low deposit option', 'Credit line increase possible', 'No foreign transaction fees'], rating: 4.5, recommended: true },
  { id: '3', name: 'Chime Credit Builder', issuer: 'Chime', annualFee: 0, minDeposit: 0, maxDeposit: 10000, apr: '0%', rewards: 'None', creditBureaus: ['Experian', 'Equifax', 'TransUnion'], features: ['No credit check', 'No minimum deposit', 'No interest'], rating: 4.6, recommended: false },
  { id: '4', name: 'OpenSky® Secured Visa®', issuer: 'OpenSky', annualFee: 35, minDeposit: 200, maxDeposit: 3000, apr: '22.64%', rewards: 'None', creditBureaus: ['Experian', 'Equifax', 'TransUnion'], features: ['No credit check', 'Reports to all 3 bureaus', 'Online account management'], rating: 4.2, recommended: false },
];

function CardComparisonRow({ card }: { card: SecuredCard }) {
  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border ${card.recommended ? 'border-blue-300 ring-2 ring-blue-100' : 'border-gray-200 dark:border-slate-700'}`}>
      {card.recommended && (
        <span className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full mb-3">
          ⭐ AI Recommended
        </span>
      )}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">{card.name}</h3>
          <p className="text-sm text-gray-500 dark:text-slate-400">{card.issuer}</p>
        </div>
        <div className="flex items-center">
          <span className="text-yellow-400"></span>
          <span className="ml-1 font-medium">{card.rating}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
        <div>
          <p className="text-gray-500 dark:text-slate-400">Annual Fee</p>
          <p className="font-semibold">{card.annualFee === 0 ? 'None' : `$${card.annualFee}`}</p>
        </div>
        <div>
          <p className="text-gray-500 dark:text-slate-400">Min Deposit</p>
          <p className="font-semibold">${card.minDeposit}</p>
        </div>
        <div>
          <p className="text-gray-500 dark:text-slate-400">APR</p>
          <p className="font-semibold">{card.apr}</p>
        </div>
        <div>
          <p className="text-gray-500 dark:text-slate-400">Rewards</p>
          <p className="font-semibold text-xs">{card.rewards}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 mb-4">
        {card.features.slice(0, 3).map((f) => (
          <span key={f} className="px-2 py-1 text-xs bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 rounded">{f}</span>
        ))}
      </div>

      <div className="flex gap-2">
        <button className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
          Apply Now
        </button>
        <button className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-slate-700 dark:bg-slate-900">
          Details
        </button>
      </div>
    </div>
  );
}

export default function SecuredCardsPage() {
  const [sortBy, setSortBy] = useState<'rating' | 'fee' | 'deposit'>('rating');
  const [showNoFeeOnly, setShowNoFeeOnly] = useState(false);

  const filteredCards = mockCards
    .filter(c => !showNoFeeOnly || c.annualFee === 0)
    .sort((a, b) => sortBy === 'rating' ? b.rating - a.rating : sortBy === 'fee' ? a.annualFee - b.annualFee : a.minDeposit - b.minDeposit);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Secured Credit Cards</h1>
        <p className="text-gray-600 dark:text-slate-300">Compare the best secured cards for building credit</p>
      </div>

      {/* AI Recommendation Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-600 rounded-xl p-6 text-white">
        <h2 className="text-lg font-semibold mb-2">AI Recommendation</h2>
        <p className="text-blue-100">Based on your profile, we recommend the <strong>Discover it® Secured</strong> for its cash back rewards and $0 annual fee.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-slate-700">
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as 'rating' | 'fee' | 'deposit')}
          className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm">
          <option value="rating">Highest Rated</option>
          <option value="fee">Lowest Fee</option>
          <option value="deposit">Lowest Deposit</option>
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={showNoFeeOnly} onChange={(e) => setShowNoFeeOnly(e.target.checked)} className="rounded" />
          No Annual Fee Only
        </label>
      </div>

      {/* Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredCards.map((card) => <CardComparisonRow key={card.id} card={card} />)}
      </div>
    </div>
  );
}

