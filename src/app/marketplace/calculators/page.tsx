/**
 * Credit Calculators Suite
 * 
 * Financial planning tools including loan, debt payoff, utilization,
 * mortgage, and savings calculators.
 */

'use client';

import { useState } from 'react';

type CalculatorType = 'loan' | 'debt' | 'utilization' | 'mortgage' | 'savings';

function LoanCalculator() {
  const [principal, setPrincipal] = useState(10000);
  const [rate, setRate] = useState(7.5);
  const [term, setTerm] = useState(36);

  const monthlyRate = rate / 100 / 12;
  const payment = principal * (monthlyRate * Math.pow(1 + monthlyRate, term)) / (Math.pow(1 + monthlyRate, term) - 1);
  const totalPaid = payment * term;
  const totalInterest = totalPaid - principal;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="text-sm text-gray-600">Loan Amount</label>
          <input type="number" value={principal} onChange={(e) => setPrincipal(Number(e.target.value))}
            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg" />
        </div>
        <div>
          <label className="text-sm text-gray-600">Interest Rate (%)</label>
          <input type="number" step="0.1" value={rate} onChange={(e) => setRate(Number(e.target.value))}
            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg" />
        </div>
        <div>
          <label className="text-sm text-gray-600">Term (months)</label>
          <input type="number" value={term} onChange={(e) => setTerm(Number(e.target.value))}
            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4 p-4 bg-indigo-50 rounded-lg">
        <div className="text-center">
          <p className="text-sm text-gray-600">Monthly Payment</p>
          <p className="text-2xl font-bold text-indigo-600">${payment.toFixed(2)}</p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-600">Total Interest</p>
          <p className="text-2xl font-bold text-red-600">${totalInterest.toFixed(2)}</p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-600">Total Paid</p>
          <p className="text-2xl font-bold text-gray-900">${totalPaid.toFixed(2)}</p>
        </div>
      </div>
    </div>
  );
}

function DebtPayoffCalculator() {
  const [balance, setBalance] = useState(5000);
  const [rate, setRate] = useState(18);
  const [payment, setPayment] = useState(200);

  const monthlyRate = rate / 100 / 12;
  let months = 0, totalInterest = 0, remaining = balance;
  while (remaining > 0 && months < 600) {
    const interest = remaining * monthlyRate;
    totalInterest += interest;
    remaining = remaining + interest - payment;
    months++;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="text-sm text-gray-600">Current Balance</label>
          <input type="number" value={balance} onChange={(e) => setBalance(Number(e.target.value))}
            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg" />
        </div>
        <div>
          <label className="text-sm text-gray-600">APR (%)</label>
          <input type="number" step="0.1" value={rate} onChange={(e) => setRate(Number(e.target.value))}
            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg" />
        </div>
        <div>
          <label className="text-sm text-gray-600">Monthly Payment</label>
          <input type="number" value={payment} onChange={(e) => setPayment(Number(e.target.value))}
            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 p-4 bg-green-50 rounded-lg">
        <div className="text-center">
          <p className="text-sm text-gray-600">Payoff Time</p>
          <p className="text-2xl font-bold text-green-600">{Math.floor(months / 12)}y {months % 12}m</p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-600">Total Interest</p>
          <p className="text-2xl font-bold text-red-600">${totalInterest.toFixed(2)}</p>
        </div>
      </div>
    </div>
  );
}

function UtilizationCalculator() {
  const [limit, setLimit] = useState(10000);
  const [balance, setBalance] = useState(3000);

  const utilization = (balance / limit) * 100;
  const optimal = limit * 0.3;
  const excellent = limit * 0.1;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm text-gray-600">Credit Limit</label>
          <input type="number" value={limit} onChange={(e) => setLimit(Number(e.target.value))}
            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg" />
        </div>
        <div>
          <label className="text-sm text-gray-600">Current Balance</label>
          <input type="number" value={balance} onChange={(e) => setBalance(Number(e.target.value))}
            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg" />
        </div>
      </div>
      <div className="p-4 bg-gray-50 rounded-lg">
        <div className="flex justify-between mb-2">
          <span className="text-sm text-gray-600">Current Utilization</span>
          <span className={`font-bold ${utilization <= 10 ? 'text-green-600' : utilization <= 30 ? 'text-yellow-600' : 'text-red-600'}`}>
            {utilization.toFixed(1)}%
          </span>
        </div>
        <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
          <div className={`h-full ${utilization <= 10 ? 'bg-green-500' : utilization <= 30 ? 'bg-yellow-500' : 'bg-red-500'}`}
            style={{ width: `${Math.min(utilization, 100)}%` }} />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-gray-500">For 30% utilization:</span> <span className="font-medium">${optimal.toFixed(0)}</span></div>
          <div><span className="text-gray-500">For 10% utilization:</span> <span className="font-medium">${excellent.toFixed(0)}</span></div>
        </div>
      </div>
    </div>
  );
}

const calculators: { id: CalculatorType; name: string; icon: string; description: string }[] = [
  { id: 'loan', name: 'Loan Payment', icon: '💰', description: 'Calculate monthly loan payments' },
  { id: 'debt', name: 'Debt Payoff', icon: '📉', description: 'Plan your debt payoff timeline' },
  { id: 'utilization', name: 'Utilization', icon: '📊', description: 'Optimize credit utilization' },
  { id: 'mortgage', name: 'Mortgage', icon: '🏠', description: 'Estimate mortgage payments' },
  { id: 'savings', name: 'Savings Goal', icon: '🎯', description: 'Plan your savings timeline' },
];

export default function CalculatorsPage() {
  const [active, setActive] = useState<CalculatorType>('loan');

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Credit Calculators</h1>
        <p className="text-gray-600">Financial planning tools for better credit decisions</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {calculators.map((calc) => (
          <button key={calc.id} onClick={() => setActive(calc.id)}
            className={`p-4 rounded-xl text-left transition-all ${active === calc.id ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white border border-gray-200 hover:border-indigo-300'}`}>
            <span className="text-2xl">{calc.icon}</span>
            <p className={`font-medium mt-2 ${active === calc.id ? 'text-white' : 'text-gray-900'}`}>{calc.name}</p>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">{calculators.find(c => c.id === active)?.name} Calculator</h2>
        {active === 'loan' && <LoanCalculator />}
        {active === 'debt' && <DebtPayoffCalculator />}
        {active === 'utilization' && <UtilizationCalculator />}
        {active === 'mortgage' && <LoanCalculator />}
        {active === 'savings' && <DebtPayoffCalculator />}
      </div>
    </div>
  );
}

