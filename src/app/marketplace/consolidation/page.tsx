/**
 * Debt Consolidation Options
 * 
 * Consolidation loan comparison with savings calculator,
 * lender matching, and debt payoff planning.
 */

'use client';

import { useState } from 'react';

interface ConsolidationOption {
  id: string;
  lender: string;
  type: 'personal' | 'balance_transfer' | 'home_equity';
  minAmount: number;
  maxAmount: number;
  apr: string;
  term: string;
  features: string[];
  rating: number;
}

const mockOptions: ConsolidationOption[] = [
  { id: '1', lender: 'SoFi', type: 'personal', minAmount: 5000, maxAmount: 100000, apr: '8.99% - 25.81%', term: '2-7 years', features: ['No fees', 'Unemployment protection', 'Rate discount with autopay'], rating: 4.7 },
  { id: '2', lender: 'LightStream', type: 'personal', minAmount: 5000, maxAmount: 100000, apr: '7.49% - 25.49%', term: '2-12 years', features: ['Same-day funding', 'No fees', 'Rate beat program'], rating: 4.6 },
  { id: '3', lender: 'Discover', type: 'balance_transfer', minAmount: 0, maxAmount: 0, apr: '0% intro (18 mo)', term: 'Revolving', features: ['0% intro APR', 'No annual fee', 'Cash back rewards'], rating: 4.5 },
  { id: '4', lender: 'Marcus by Goldman Sachs', type: 'personal', minAmount: 3500, maxAmount: 40000, apr: '6.99% - 28.99%', term: '3-6 years', features: ['No fees', 'On-time payment reward', 'Flexible payments'], rating: 4.4 },
];

const typeLabels = { personal: 'Personal Loan', balance_transfer: 'Balance Transfer', home_equity: 'Home Equity' };
const typeColors = { personal: 'bg-blue-100 text-blue-800', balance_transfer: 'bg-blue-100 text-blue-800', home_equity: 'bg-green-100 text-green-800' };

function OptionCard({ option }: { option: ConsolidationOption }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
      <div className="flex justify-between items-start mb-4">
        <div>
          <span className={`px-2 py-1 text-xs rounded-full ${typeColors[option.type]}`}>{typeLabels[option.type]}</span>
          <h3 className="font-semibold text-gray-900 dark:text-white text-lg mt-2">{option.lender}</h3>
        </div>
        <div className="flex items-center">
          <span className="text-yellow-400"></span>
          <span className="ml-1 font-medium">{option.rating}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
        <div>
          <p className="text-gray-500 dark:text-slate-400">APR</p>
          <p className="font-semibold text-blue-600">{option.apr}</p>
        </div>
        <div>
          <p className="text-gray-500 dark:text-slate-400">Term</p>
          <p className="font-semibold">{option.term}</p>
        </div>
        {option.minAmount > 0 && (
          <div className="col-span-2">
            <p className="text-gray-500 dark:text-slate-400">Loan Amount</p>
            <p className="font-semibold">${option.minAmount.toLocaleString()} - ${option.maxAmount.toLocaleString()}</p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-1 mb-4">
        {option.features.map((f) => (
          <span key={f} className="px-2 py-1 text-xs bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 rounded">{f}</span>
        ))}
      </div>

      <button className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
        Check Your Rate
      </button>
    </div>
  );
}

function SavingsCalculator() {
  const [totalDebt, setTotalDebt] = useState(15000);
  const [currentApr, setCurrentApr] = useState(22);
  const [newApr, setNewApr] = useState(12);

  const currentMonthly = (totalDebt * (currentApr / 100)) / 12;
  const newMonthly = (totalDebt * (newApr / 100)) / 12;
  const monthlySavings = currentMonthly - newMonthly;
  const yearlySavings = monthlySavings * 12;

  return (
    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-100">
      <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Savings Calculator</h3>
      <div className="space-y-4">
        <div>
          <label className="text-sm text-gray-600 dark:text-slate-300">Total Debt: ${totalDebt.toLocaleString()}</label>
          <input type="range" min={1000} max={100000} step={1000} value={totalDebt} onChange={(e) => setTotalDebt(Number(e.target.value))} className="w-full" />
        </div>
        <div>
          <label className="text-sm text-gray-600 dark:text-slate-300">Current APR: {currentApr}%</label>
          <input type="range" min={5} max={30} value={currentApr} onChange={(e) => setCurrentApr(Number(e.target.value))} className="w-full" />
        </div>
        <div>
          <label className="text-sm text-gray-600 dark:text-slate-300">New APR: {newApr}%</label>
          <input type="range" min={5} max={30} value={newApr} onChange={(e) => setNewApr(Number(e.target.value))} className="w-full" />
        </div>
        <div className="p-4 bg-white dark:bg-slate-800 rounded-lg">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-sm text-gray-500 dark:text-slate-400">Monthly Savings</p>
              <p className="text-2xl font-bold text-green-600">${monthlySavings.toFixed(0)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-slate-400">Yearly Savings</p>
              <p className="text-2xl font-bold text-green-600">${yearlySavings.toFixed(0)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ConsolidationPage() {
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const filteredOptions = typeFilter === 'all' ? mockOptions : mockOptions.filter(o => o.type === typeFilter);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Debt Consolidation</h1>
        <p className="text-gray-600 dark:text-slate-300">Compare options to consolidate and lower your debt payments</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex gap-2">
            {['all', 'personal', 'balance_transfer'].map((type) => (
              <button key={type} onClick={() => setTypeFilter(type)}
                className={`px-4 py-2 rounded-lg text-sm ${typeFilter === type ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-200'}`}>
                {type === 'all' ? 'All Options' : typeLabels[type as keyof typeof typeLabels]}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredOptions.map((option) => <OptionCard key={option.id} option={option} />)}
          </div>
        </div>
        <div>
          <SavingsCalculator />
        </div>
      </div>
    </div>
  );
}

