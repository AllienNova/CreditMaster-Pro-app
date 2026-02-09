/**
 * Credit Builder Loans Marketplace
 * 
 * Small installment loans for credit building with loan comparison,
 * calculator, lender profiles, and pre-qualification.
 */

'use client';

import { useState } from 'react';

interface BuilderLoan {
  id: string;
  lender: string;
  minAmount: number;
  maxAmount: number;
  termMonths: number[];
  apr: string;
  monthlyPayment: string;
  features: string[];
  rating: number;
  requirements: string[];
}

const mockLoans: BuilderLoan[] = [
  { id: '1', lender: 'Self', minAmount: 520, maxAmount: 1800, termMonths: [12, 24], apr: '15.92%', monthlyPayment: '$25-$150', features: ['No credit check', 'Reports to all 3 bureaus', 'Savings component'], rating: 4.6, requirements: ['Valid SSN', 'US bank account'] },
  { id: '2', lender: 'MoneyLion', minAmount: 500, maxAmount: 1000, termMonths: [12], apr: '5.99%', monthlyPayment: '$42-$84', features: ['Low APR', 'Mobile app', 'Financial tracking'], rating: 4.4, requirements: ['Bank account', 'Income verification'] },
  { id: '3', lender: 'Chime Credit Builder', minAmount: 1, maxAmount: 10000, termMonths: [0], apr: '0%', monthlyPayment: 'Varies', features: ['No interest', 'No fees', 'Secured by your money'], rating: 4.7, requirements: ['Chime account', 'Direct deposit'] },
  { id: '4', lender: 'Kikoff', minAmount: 500, maxAmount: 500, termMonths: [12], apr: '0%', monthlyPayment: '$5', features: ['$5/month', 'No credit check', 'Reports to bureaus'], rating: 4.3, requirements: ['Valid ID', 'Bank account'] },
];

function LoanCard({ loan }: { loan: BuilderLoan }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white text-lg">{loan.lender}</h3>
          <div className="flex items-center mt-1">
            <span className="text-yellow-400"></span>
            <span className="ml-1 text-sm font-medium">{loan.rating}</span>
          </div>
        </div>
        <span className="text-xl font-bold text-blue-600">{loan.apr} APR</span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
        <div>
          <p className="text-gray-500 dark:text-slate-400">Loan Amount</p>
          <p className="font-semibold">${loan.minAmount} - ${loan.maxAmount}</p>
        </div>
        <div>
          <p className="text-gray-500 dark:text-slate-400">Monthly Payment</p>
          <p className="font-semibold">{loan.monthlyPayment}</p>
        </div>
        <div>
          <p className="text-gray-500 dark:text-slate-400">Terms</p>
          <p className="font-semibold">{loan.termMonths.join(', ')} months</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 mb-4">
        {loan.features.map((f) => (
          <span key={f} className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded">{f}</span>
        ))}
      </div>

      <div className="flex gap-2">
        <button className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
          Check Eligibility
        </button>
        <button className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-slate-700 dark:bg-slate-900">
          Learn More
        </button>
      </div>
    </div>
  );
}

function LoanCalculator() {
  const [amount, setAmount] = useState(1000);
  const [term, setTerm] = useState(12);
  const [rate, setRate] = useState(15);

  const monthlyRate = rate / 100 / 12;
  const payment = amount * (monthlyRate * Math.pow(1 + monthlyRate, term)) / (Math.pow(1 + monthlyRate, term) - 1);

  return (
    <div className="bg-gradient-to-br from-blue-50 to-blue-50 rounded-xl p-6 border border-blue-100">
      <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Loan Calculator</h3>
      <div className="space-y-4">
        <div>
          <label className="text-sm text-gray-600 dark:text-slate-300">Loan Amount: ${amount}</label>
          <input type="range" min={100} max={3000} value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="w-full" />
        </div>
        <div>
          <label className="text-sm text-gray-600 dark:text-slate-300">Term: {term} months</label>
          <input type="range" min={6} max={36} value={term} onChange={(e) => setTerm(Number(e.target.value))} className="w-full" />
        </div>
        <div className="p-4 bg-white dark:bg-slate-800 rounded-lg text-center">
          <p className="text-sm text-gray-500 dark:text-slate-400">Estimated Monthly Payment</p>
          <p className="text-3xl font-bold text-blue-600">${payment.toFixed(2)}</p>
        </div>
      </div>
    </div>
  );
}

export default function LoansPage() {
  const [sortBy, setSortBy] = useState<'rating' | 'apr'>('rating');

  const sortedLoans = [...mockLoans].sort((a, b) => sortBy === 'rating' ? b.rating - a.rating : parseFloat(a.apr) - parseFloat(b.apr));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Credit Builder Loans</h1>
        <p className="text-gray-600 dark:text-slate-300">Small installment loans designed to build your credit</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center gap-4">
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as 'rating' | 'apr')}
              className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm">
              <option value="rating">Highest Rated</option>
              <option value="apr">Lowest APR</option>
            </select>
          </div>
          {sortedLoans.map((loan) => <LoanCard key={loan.id} loan={loan} />)}
        </div>
        <div>
          <LoanCalculator />
        </div>
      </div>
    </div>
  );
}

