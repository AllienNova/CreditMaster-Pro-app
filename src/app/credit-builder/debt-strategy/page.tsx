'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';

// Types
interface Debt {
  id: string;
  name: string;
  type:
    | 'credit_card'
    | 'personal_loan'
    | 'auto_loan'
    | 'student_loan'
    | 'medical'
    | 'other';
  balance: number;
  interestRate: number;
  minimumPayment: number;
  priority: number;
}

interface StrategyResult {
  strategyName: string;
  totalInterestPaid: number;
  timeToPayoff: number; // months
  monthlyPayment: number;
  totalPaid: number;
  pros: string[];
  cons: string[];
  bestFor: string[];
  payoffSchedule: {
    month: number;
    totalRemaining: number;
    interestPaid: number;
    principalPaid: number;
  }[];
}

interface ConsolidationOption {
  id: string;
  name: string;
  type: 'personal_loan' | 'balance_transfer' | 'heloc' | 'debt_management';
  interestRate: number;
  fee: number;
  term: number; // months
  monthlyPayment: number;
  totalCost: number;
  creditImpact: 'positive' | 'neutral' | 'negative';
  requirements: string[];
  pros: string[];
  cons: string[];
}

export default function DebtStrategyAnalyzer() {
  const { user, loading: authLoading } = useAuth();

  const [debts, setDebts] = useState<Debt[]>([]);
  const [monthlyBudget, setMonthlyBudget] = useState(500);
  const [selectedStrategy, setSelectedStrategy] = useState<
    'snowball' | 'avalanche' | 'hybrid' | 'consolidation'
  >('avalanche');
  const [results, setResults] = useState<StrategyResult[]>([]);
  const [consolidationOptions, setConsolidationOptions] = useState<
    ConsolidationOption[]
  >([]);
  const [showAddDebt, setShowAddDebt] = useState(false);
  const [showComparison, setShowComparison] = useState(false);

  // New debt form
  const [newDebt, setNewDebt] = useState<Partial<Debt>>({
    name: '',
    type: 'credit_card',
    balance: 0,
    interestRate: 0,
    minimumPayment: 0,
  });

  useEffect(() => {
    fetchDebts();
    fetchConsolidationOptions();
  }, []);

  useEffect(() => {
    if (debts.length > 0 && monthlyBudget > 0) {
      calculateStrategies();
    }
  }, [debts, monthlyBudget]);

  const fetchDebts = async () => {
    try {
      const response = await fetch('/api/credit-builder/debts');
      if (response.ok) {
        const data = await response.json();
        setDebts(data.debts || []);
      }
    } catch (err) {
      console.error('Failed to fetch debts:', err);
      // Use mock data for demo
      setDebts([
        {
          id: '1',
          name: 'Chase Credit Card',
          type: 'credit_card',
          balance: 5000,
          interestRate: 19.99,
          minimumPayment: 125,
          priority: 1,
        },
        {
          id: '2',
          name: 'Discover Card',
          type: 'credit_card',
          balance: 3000,
          interestRate: 24.99,
          minimumPayment: 90,
          priority: 2,
        },
        {
          id: '3',
          name: 'Personal Loan',
          type: 'personal_loan',
          balance: 8000,
          interestRate: 12.5,
          minimumPayment: 250,
          priority: 3,
        },
      ]);
    }
  };

  const fetchConsolidationOptions = () => {
    const options: ConsolidationOption[] = [
      {
        id: 'personal_loan',
        name: 'Personal Consolidation Loan',
        type: 'personal_loan',
        interestRate: 10.5,
        fee: 200,
        term: 48,
        monthlyPayment: 0,
        totalCost: 0,
        creditImpact: 'neutral',
        requirements: ['Credit score 640+', 'Stable income', 'DTI under 43%'],
        pros: [
          'Fixed monthly payment',
          'Lower interest rate than credit cards',
          'Single payment to manage',
          'No collateral required',
        ],
        cons: [
          'May require good credit',
          'Origination fees (1-8%)',
          "Doesn't address spending habits",
          'Hard inquiry on credit',
        ],
      },
      {
        id: 'balance_transfer',
        name: '0% Balance Transfer Card',
        type: 'balance_transfer',
        interestRate: 0,
        fee: 300, // 3% transfer fee
        term: 18,
        monthlyPayment: 0,
        totalCost: 0,
        creditImpact: 'positive',
        requirements: [
          'Good to excellent credit (700+)',
          'Low utilization on current cards',
        ],
        pros: [
          '0% APR for 12-21 months',
          'Can save significant interest',
          'Simplifies payments',
          'May increase available credit',
        ],
        cons: [
          'Transfer fee (3-5%)',
          'Requires excellent credit',
          'High rate after promo period',
          'Must pay off before promo ends',
        ],
      },
      {
        id: 'heloc',
        name: 'Home Equity Line of Credit',
        type: 'heloc',
        interestRate: 7.5,
        fee: 500,
        term: 120,
        monthlyPayment: 0,
        totalCost: 0,
        creditImpact: 'neutral',
        requirements: [
          'Home ownership',
          '20%+ equity',
          'Good credit',
          'Stable income',
        ],
        pros: [
          'Lowest interest rates',
          'Tax deductible (sometimes)',
          'Flexible borrowing',
          'Large credit lines available',
        ],
        cons: [
          'Home is collateral - risk of foreclosure',
          'Closing costs ($500-$2000)',
          'Variable interest rate',
          'Long approval process',
        ],
      },
      {
        id: 'dmp',
        name: 'Debt Management Plan (Credit Counseling)',
        type: 'debt_management',
        interestRate: 8,
        fee: 50,
        term: 48,
        monthlyPayment: 0,
        totalCost: 0,
        creditImpact: 'negative',
        requirements: [
          'Unsecured debt only',
          'Ability to make monthly payments',
        ],
        pros: [
          'Reduced interest rates (6-10%)',
          'Single monthly payment',
          'Stops late fees and penalties',
          'Professional guidance',
        ],
        cons: [
          'Must close credit card accounts',
          'Shows on credit report',
          'Monthly fees ($25-75)',
          '3-5 year commitment',
        ],
      },
    ];

    setConsolidationOptions(options);
  };

  const calculateStrategies = () => {
    const totalDebt = debts.reduce((sum, debt) => sum + debt.balance, 0);
    const totalMinimum = debts.reduce(
      (sum, debt) => sum + debt.minimumPayment,
      0
    );
    const extraPayment = Math.max(0, monthlyBudget - totalMinimum);

    // Avalanche Method (highest interest first)
    const avalanche = calculatePayoffStrategy(
      [...debts].sort((a, b) => b.interestRate - a.interestRate),
      monthlyBudget,
      'Avalanche Method'
    );

    // Snowball Method (smallest balance first)
    const snowball = calculatePayoffStrategy(
      [...debts].sort((a, b) => a.balance - b.balance),
      monthlyBudget,
      'Snowball Method'
    );

    // Hybrid Method (balance sweet spot)
    const hybrid = calculatePayoffStrategy(
      [...debts].sort((a, b) => {
        const scoreA = (a.balance / 1000) * a.interestRate;
        const scoreB = (b.balance / 1000) * b.interestRate;
        return scoreB - scoreA;
      }),
      monthlyBudget,
      'Hybrid Method'
    );

    setResults([avalanche, snowball, hybrid]);
  };

  const calculatePayoffStrategy = (
    sortedDebts: Debt[],
    budget: number,
    strategyName: string
  ): StrategyResult => {
    const remainingDebts = sortedDebts.map((d) => ({ ...d }));
    let month = 0;
    let totalInterest = 0;
    let totalPrincipal = 0;
    const schedule: StrategyResult['payoffSchedule'] = [];

    while (remainingDebts.some((d) => d.balance > 0) && month < 600) {
      month++;
      let budgetRemaining = budget;
      let monthInterest = 0;
      let monthPrincipal = 0;

      // Pay minimum on all debts
      remainingDebts.forEach((debt) => {
        if (debt.balance > 0) {
          const interest = (debt.balance * (debt.interestRate / 100)) / 12;
          const principal = Math.min(
            debt.minimumPayment - interest,
            debt.balance
          );

          debt.balance -= principal;
          budgetRemaining -= debt.minimumPayment;
          monthInterest += interest;
          monthPrincipal += principal;
        }
      });

      // Apply extra payment to priority debt
      if (budgetRemaining > 0) {
        const priorityDebt = remainingDebts.find((d) => d.balance > 0);
        if (priorityDebt) {
          const extraPrincipal = Math.min(
            budgetRemaining,
            priorityDebt.balance
          );
          priorityDebt.balance -= extraPrincipal;
          monthPrincipal += extraPrincipal;
        }
      }

      totalInterest += monthInterest;
      totalPrincipal += monthPrincipal;

      const totalRemaining = remainingDebts.reduce(
        (sum, d) => sum + d.balance,
        0
      );

      if (month % 6 === 0 || totalRemaining === 0) {
        schedule.push({
          month,
          totalRemaining,
          interestPaid: totalInterest,
          principalPaid: totalPrincipal,
        });
      }

      if (totalRemaining === 0) break;
    }

    // Strategy-specific metadata
    let pros: string[] = [];
    let cons: string[] = [];
    let bestFor: string[] = [];

    if (strategyName === 'Avalanche Method') {
      pros = [
        'Saves the most money in interest',
        'Mathematically optimal',
        'Fastest overall payoff',
        'Best for high-interest debt',
      ];
      cons = [
        'Slower initial wins',
        'Requires discipline',
        'Less psychological motivation',
      ];
      bestFor = [
        'High-interest credit card debt',
        'Those focused on minimizing costs',
        'Mathematically-minded individuals',
      ];
    } else if (strategyName === 'Snowball Method') {
      pros = [
        'Quick early wins for motivation',
        'Psychologically rewarding',
        'Simplifies accounts faster',
        'Great for staying motivated',
      ];
      cons = [
        'Costs more in interest',
        'Not mathematically optimal',
        'Takes longer overall',
      ];
      bestFor = [
        'Those needing motivation',
        'Multiple small debts',
        'Psychological quick wins important',
      ];
    } else {
      pros = [
        'Balance of savings and motivation',
        'Targets medium-sized high-interest debts',
        'Good compromise approach',
      ];
      cons = ['Not optimal for any single metric', 'More complex to calculate'];
      bestFor = ['Mixed debt portfolio', 'Want balance of both methods'];
    }

    return {
      strategyName,
      totalInterestPaid: totalInterest,
      timeToPayoff: month,
      monthlyPayment: budget,
      totalPaid: totalInterest + totalPrincipal,
      pros,
      cons,
      bestFor,
      payoffSchedule: schedule,
    };
  };

  const addDebt = () => {
    if (!newDebt.name || !newDebt.balance || !newDebt.interestRate) return;

    const debt: Debt = {
      id: Date.now().toString(),
      name: newDebt.name,
      type: newDebt.type || 'credit_card',
      balance: newDebt.balance,
      interestRate: newDebt.interestRate,
      minimumPayment:
        newDebt.minimumPayment || Math.max(25, newDebt.balance * 0.025),
      priority: debts.length + 1,
    };

    setDebts([...debts, debt]);
    setNewDebt({
      name: '',
      type: 'credit_card',
      balance: 0,
      interestRate: 0,
      minimumPayment: 0,
    });
    setShowAddDebt(false);
  };

  const removeDebt = (id: string) => {
    setDebts(debts.filter((d) => d.id !== id));
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-orange-600 mx-auto"></div>
          <p className="mt-6 text-lg text-gray-700 font-medium">
            Loading Debt Strategy Analyzer...
          </p>
        </div>
      </div>
    );
  }

  const totalDebt = debts.reduce((sum, d) => sum + d.balance, 0);
  const totalMinimum = debts.reduce((sum, d) => sum + d.minimumPayment, 0);
  const weightedAPR =
    debts.length > 0
      ? debts.reduce((sum, d) => sum + d.interestRate * d.balance, 0) /
        totalDebt
      : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Link
            href="/credit-builder"
            className="inline-flex items-center text-orange-600 hover:text-orange-700 mb-4"
          >
            ← Back to Credit Builder
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Debt Strategy Analyzer 📊
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Compare settlement, consolidation, snowball, and avalanche methods.
            Find the optimal debt payoff strategy for your situation.
          </p>
        </div>

        {/* Debt Summary */}
        <div className="bg-gradient-to-r from-orange-600 to-red-600 rounded-xl p-6 mb-8 text-white shadow-xl">
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center">
              <p className="text-sm opacity-90 mb-1">Total Debt</p>
              <p className="text-3xl font-bold">
                ${totalDebt.toLocaleString()}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm opacity-90 mb-1">Monthly Minimum</p>
              <p className="text-3xl font-bold">
                ${totalMinimum.toLocaleString()}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm opacity-90 mb-1">Weighted APR</p>
              <p className="text-3xl font-bold">{weightedAPR.toFixed(1)}%</p>
            </div>
            <div className="text-center">
              <p className="text-sm opacity-90 mb-1">Accounts</p>
              <p className="text-3xl font-bold">{debts.length}</p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column: Debt Input */}
          <div className="space-y-6">
            {/* Debt List */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">Your Debts</h2>
                <button
                  onClick={() => setShowAddDebt(!showAddDebt)}
                  className="px-4 py-2 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 transition-colors"
                >
                  + Add Debt
                </button>
              </div>

              {showAddDebt && (
                <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Debt name (e.g., Chase Card)"
                      value={newDebt.name}
                      onChange={(e) =>
                        setNewDebt({ ...newDebt, name: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                    <select
                      value={newDebt.type}
                      onChange={(e) =>
                        setNewDebt({ ...newDebt, type: e.target.value as any })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="credit_card">Credit Card</option>
                      <option value="personal_loan">Personal Loan</option>
                      <option value="auto_loan">Auto Loan</option>
                      <option value="student_loan">Student Loan</option>
                      <option value="medical">Medical Debt</option>
                      <option value="other">Other</option>
                    </select>
                    <input
                      type="number"
                      placeholder="Balance ($)"
                      value={newDebt.balance || ''}
                      onChange={(e) =>
                        setNewDebt({
                          ...newDebt,
                          balance: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Interest Rate (%)"
                      value={newDebt.interestRate || ''}
                      onChange={(e) =>
                        setNewDebt({
                          ...newDebt,
                          interestRate: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                    <input
                      type="number"
                      placeholder="Minimum Payment ($)"
                      value={newDebt.minimumPayment || ''}
                      onChange={(e) =>
                        setNewDebt({
                          ...newDebt,
                          minimumPayment: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                    <button
                      onClick={addDebt}
                      className="w-full py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700"
                    >
                      Add Debt
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {debts.map((debt) => (
                  <div
                    key={debt.id}
                    className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-semibold text-gray-900">
                          {debt.name}
                        </p>
                        <p className="text-sm text-gray-600">
                          {debt.type.replace('_', ' ')}
                        </p>
                      </div>
                      <button
                        onClick={() => removeDebt(debt.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        ×
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-gray-600">Balance</p>
                        <p className="font-semibold">
                          ${debt.balance.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">APR</p>
                        <p className="font-semibold">{debt.interestRate}%</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-gray-600">Minimum Payment</p>
                        <p className="font-semibold">
                          ${debt.minimumPayment.toLocaleString()}/mo
                        </p>
                      </div>
                    </div>
                  </div>
                ))}

                {debts.length === 0 && (
                  <p className="text-center text-gray-500 py-8">
                    No debts added yet. Click "Add Debt" to get started.
                  </p>
                )}
              </div>
            </div>

            {/* Monthly Budget */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Monthly Payment Budget
              </h3>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  How much can you pay toward debt each month?
                </label>
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold text-gray-900">$</span>
                  <input
                    type="number"
                    value={monthlyBudget}
                    onChange={(e) =>
                      setMonthlyBudget(parseFloat(e.target.value) || 0)
                    }
                    className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg text-2xl font-bold focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <input
                  type="range"
                  min={totalMinimum}
                  max={totalMinimum * 3}
                  value={monthlyBudget}
                  onChange={(e) => setMonthlyBudget(parseFloat(e.target.value))}
                  className="w-full mt-4"
                />
              </div>

              <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="text-sm text-orange-900">
                  <strong>Extra payment:</strong> $
                  {Math.max(0, monthlyBudget - totalMinimum).toLocaleString()}
                  /mo
                </p>
                <p className="text-xs text-orange-700 mt-1">
                  This extra amount accelerates your debt payoff significantly
                </p>
              </div>
            </div>
          </div>

          {/* Middle Column: Strategy Results */}
          <div className="lg:col-span-2 space-y-6">
            {results.length > 0 && (
              <>
                {/* Strategy Comparison */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">
                    Strategy Comparison
                  </h2>

                  <div className="grid md:grid-cols-3 gap-4 mb-6">
                    {results.map((result) => (
                      <div
                        key={result.strategyName}
                        className="p-4 bg-gradient-to-br from-orange-50 to-red-50 rounded-xl border-2 border-orange-200"
                      >
                        <h3 className="font-bold text-gray-900 mb-3">
                          {result.strategyName}
                        </h3>

                        <div className="space-y-2 text-sm">
                          <div>
                            <p className="text-gray-600">Time to payoff</p>
                            <p className="text-xl font-bold text-orange-600">
                              {Math.floor(result.timeToPayoff / 12)}y{' '}
                              {result.timeToPayoff % 12}m
                            </p>
                          </div>

                          <div>
                            <p className="text-gray-600">Total interest</p>
                            <p className="font-semibold">
                              ${result.totalInterestPaid.toLocaleString()}
                            </p>
                          </div>

                          <div>
                            <p className="text-gray-600">Total paid</p>
                            <p className="font-semibold">
                              ${result.totalPaid.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Best Strategy Recommendation */}
                  {(() => {
                    const best = results.reduce((prev, current) =>
                      current.totalInterestPaid < prev.totalInterestPaid
                        ? current
                        : prev
                    );
                    return (
                      <div className="p-4 bg-green-50 border-2 border-green-300 rounded-lg">
                        <p className="font-semibold text-green-900 mb-2">
                          💡 Recommended: {best.strategyName}
                        </p>
                        <p className="text-sm text-green-800">
                          Saves $
                          {(
                            results.reduce(
                              (max, r) => Math.max(max, r.totalInterestPaid),
                              0
                            ) - best.totalInterestPaid
                          ).toLocaleString()}{' '}
                          in interest compared to other strategies
                        </p>
                      </div>
                    );
                  })()}
                </div>

                {/* Detailed Strategy Breakdown */}
                {results.map((result) => (
                  <div
                    key={result.strategyName}
                    className="bg-white rounded-xl shadow-lg p-6"
                  >
                    <h3 className="text-xl font-bold text-gray-900 mb-4">
                      {result.strategyName} - Detailed Analysis
                    </h3>

                    <div className="grid md:grid-cols-2 gap-6 mb-6">
                      <div>
                        <h4 className="font-semibold text-green-700 mb-2 flex items-center gap-2">
                          <span>✓</span> Pros
                        </h4>
                        <ul className="space-y-1">
                          {result.pros.map((pro, idx) => (
                            <li key={idx} className="text-sm text-gray-700">
                              • {pro}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h4 className="font-semibold text-red-700 mb-2 flex items-center gap-2">
                          <span>✗</span> Cons
                        </h4>
                        <ul className="space-y-1">
                          {result.cons.map((con, idx) => (
                            <li key={idx} className="text-sm text-gray-700">
                              • {con}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <h4 className="font-semibold text-blue-900 mb-2">
                        Best For:
                      </h4>
                      <ul className="space-y-1">
                        {result.bestFor.map((item, idx) => (
                          <li key={idx} className="text-sm text-blue-800">
                            • {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}

                {/* Consolidation Options */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">
                    Consolidation Options
                  </h2>

                  <div className="grid md:grid-cols-2 gap-4">
                    {consolidationOptions.map((option) => {
                      const monthlyPayment = totalDebt / option.term;
                      const totalInterest =
                        monthlyPayment * option.term - totalDebt + option.fee;

                      return (
                        <div
                          key={option.id}
                          className="p-4 bg-gray-50 rounded-lg border-2 border-gray-200"
                        >
                          <div className="flex justify-between items-start mb-3">
                            <h3 className="font-bold text-gray-900">
                              {option.name}
                            </h3>
                            <span
                              className={`px-2 py-1 rounded text-xs font-semibold ${
                                option.creditImpact === 'positive'
                                  ? 'bg-green-100 text-green-800'
                                  : option.creditImpact === 'neutral'
                                    ? 'bg-gray-100 text-gray-800'
                                    : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {option.creditImpact} impact
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                            <div>
                              <p className="text-gray-600">APR</p>
                              <p className="font-semibold">
                                {option.interestRate}%
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-600">Term</p>
                              <p className="font-semibold">
                                {option.term} months
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-600">Monthly</p>
                              <p className="font-semibold">
                                ${monthlyPayment.toFixed(0)}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-600">Total Interest</p>
                              <p className="font-semibold">
                                ${totalInterest.toFixed(0)}
                              </p>
                            </div>
                          </div>

                          <div className="mb-3">
                            <p className="text-xs font-semibold text-gray-700 mb-1">
                              Requirements:
                            </p>
                            <ul className="text-xs text-gray-600 space-y-1">
                              {option.requirements.map((req, idx) => (
                                <li key={idx}>• {req}</li>
                              ))}
                            </ul>
                          </div>

                          <details className="text-xs">
                            <summary className="cursor-pointer font-semibold text-gray-700">
                              Pros & Cons
                            </summary>
                            <div className="mt-2 space-y-2">
                              <div>
                                <p className="font-semibold text-green-700">
                                  Pros:
                                </p>
                                <ul className="text-gray-600">
                                  {option.pros.slice(0, 2).map((pro, idx) => (
                                    <li key={idx}>• {pro}</li>
                                  ))}
                                </ul>
                              </div>
                              <div>
                                <p className="font-semibold text-red-700">
                                  Cons:
                                </p>
                                <ul className="text-gray-600">
                                  {option.cons.slice(0, 2).map((con, idx) => (
                                    <li key={idx}>• {con}</li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </details>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {debts.length === 0 && (
              <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                <span className="text-6xl mb-4 block">📊</span>
                <p className="text-gray-500">
                  Add your debts and set a monthly budget to see personalized
                  strategies
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Educational Info */}
        <div className="mt-8 bg-orange-50 border border-orange-200 rounded-xl p-6">
          <h3 className="font-semibold text-orange-900 mb-3">
            Understanding Debt Payoff Strategies
          </h3>
          <div className="grid md:grid-cols-3 gap-4 text-sm text-orange-800">
            <div>
              <p className="font-semibold mb-1">Avalanche Method</p>
              <p>
                Pay minimums on all debts, put extra toward highest interest
                rate. Mathematically optimal - saves most money.
              </p>
            </div>
            <div>
              <p className="font-semibold mb-1">Snowball Method</p>
              <p>
                Pay minimums on all debts, put extra toward smallest balance.
                Provides quick wins for motivation.
              </p>
            </div>
            <div>
              <p className="font-semibold mb-1">Consolidation</p>
              <p>
                Combine multiple debts into one loan with lower interest.
                Simplifies payments but requires good credit.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
