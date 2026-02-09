'use client';

import { useState } from 'react';

interface AlternativePlan {
  name: string;
  monthly_payment: number;
  total_cost: number;
  pros: string[];
  cons: string[];
}

interface PSLFAnalysis {
  eligible: boolean;
  qualifying_payments: number;
  remaining_payments: number;
  estimated_forgiveness_amount: number;
}

interface RecommendedPlan {
  name: string;
  description: string;
  monthly_payment: number;
  total_cost: number;
  forgiveness_eligible: boolean;
  forgiveness_timeline?: string;
}

interface LoanStrategy {
  recommended_plan: RecommendedPlan;
  alternative_plans: AlternativePlan[];
  pslf_analysis: PSLFAnalysis;
  tax_implications: string;
  recommendations: string[];
}

interface LoanStrategyCalculatorProps {
  onCalculate?: (strategy: LoanStrategy) => void;
}

interface LoanData {
  totalBalance: string;
  interestRate: string;
  loanType: string;
  servicer: string;
  monthlyPayment?: string;
}

interface FinancialSituation {
  income: string;
  familySize: string;
  state: string;
  employmentType: string;
}

export default function LoanStrategyCalculator({ onCalculate }: LoanStrategyCalculatorProps) {
  const [loanData, setLoanData] = useState<LoanData>({
    totalBalance: '',
    interestRate: '',
    loanType: '',
    servicer: '',
    monthlyPayment: '',
  });

  const [financialSituation, setFinancialSituation] = useState<FinancialSituation>({
    income: '',
    familySize: '',
    state: '',
    employmentType: '',
  });

  const [goals, setGoals] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [strategy, setStrategy] = useState<LoanStrategy | null>(null);

  const handleCalculate = async () => {
    setLoading(true);
    setError('');
    setStrategy(null);

    try {
      // Validate inputs
      if (!loanData.totalBalance || !loanData.interestRate || !loanData.loanType) {
        throw new Error('Please fill in all required loan information');
      }
      if (!financialSituation.income || !financialSituation.familySize || !financialSituation.state) {
        throw new Error('Please fill in all required financial information');
      }

      const response = await fetch('/api/student-loans/strategy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          loanData: {
            totalBalance: parseFloat(loanData.totalBalance),
            interestRate: parseFloat(loanData.interestRate),
            loanType: loanData.loanType,
            servicer: loanData.servicer,
            monthlyPayment: loanData.monthlyPayment ? parseFloat(loanData.monthlyPayment) : undefined,
          },
          financialSituation: {
            income: parseFloat(financialSituation.income),
            familySize: parseInt(financialSituation.familySize),
            state: financialSituation.state,
            employmentType: financialSituation.employmentType,
          },
          goals: goals ? goals.split('\n').filter(g => g.trim()) : undefined,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to generate loan strategy');
      }

      setStrategy(data.data.strategy);
      
      if (onCalculate) {
        onCalculate(data.data.strategy);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div className="loan-strategy-calculator">
      <div className="max-w-4xl mx-auto p-6">
        <h2 className="text-3xl font-bold mb-6">Student Loan Strategy Calculator</h2>
        <p className="text-gray-600 dark:text-slate-300 mb-8">
          Calculate optimal repayment strategy using DeepSeek V3.1 Terminus's advanced mathematical reasoning
        </p>

        <div className="space-y-6">
          {/* Loan Information */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
            <h3 className="text-xl font-semibold mb-4">Loan Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Total Balance *</label>
                <input
                  type="number"
                  value={loanData.totalBalance}
                  onChange={(e) => setLoanData({ ...loanData, totalBalance: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="50000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Interest Rate (%) *</label>
                <input
                  type="number"
                  step="0.1"
                  value={loanData.interestRate}
                  onChange={(e) => setLoanData({ ...loanData, interestRate: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="5.5"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Loan Type *</label>
                <select
                  value={loanData.loanType}
                  onChange={(e) => setLoanData({ ...loanData, loanType: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select loan type</option>
                  <option value="Direct Subsidized">Direct Subsidized</option>
                  <option value="Direct Unsubsidized">Direct Unsubsidized</option>
                  <option value="Direct PLUS">Direct PLUS</option>
                  <option value="FFEL">FFEL</option>
                  <option value="Perkins">Perkins</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Loan Servicer *</label>
                <input
                  type="text"
                  value={loanData.servicer}
                  onChange={(e) => setLoanData({ ...loanData, servicer: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="FedLoan, Nelnet, etc."
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Current Monthly Payment (Optional)</label>
                <input
                  type="number"
                  value={loanData.monthlyPayment}
                  onChange={(e) => setLoanData({ ...loanData, monthlyPayment: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="500"
                />
              </div>
            </div>
          </div>

          {/* Financial Situation */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
            <h3 className="text-xl font-semibold mb-4">Financial Situation</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Annual Income *</label>
                <input
                  type="number"
                  value={financialSituation.income}
                  onChange={(e) => setFinancialSituation({ ...financialSituation, income: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="45000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Family Size *</label>
                <input
                  type="number"
                  value={financialSituation.familySize}
                  onChange={(e) => setFinancialSituation({ ...financialSituation, familySize: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">State *</label>
                <input
                  type="text"
                  value={financialSituation.state}
                  onChange={(e) => setFinancialSituation({ ...financialSituation, state: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="CA"
                  maxLength={2}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Employment Type *</label>
                <select
                  value={financialSituation.employmentType}
                  onChange={(e) => setFinancialSituation({ ...financialSituation, employmentType: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select employment type</option>
                  <option value="nonprofit">Nonprofit</option>
                  <option value="government">Government</option>
                  <option value="private">Private Sector</option>
                  <option value="self-employed">Self-Employed</option>
                </select>
              </div>
            </div>
          </div>

          {/* Goals */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
            <h3 className="text-xl font-semibold mb-4">Your Goals (Optional)</h3>
            <textarea
              value={goals}
              onChange={(e) => setGoals(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Minimize total cost&#10;Qualify for PSLF&#10;Pay off in 10 years"
            />
          </div>

          {/* Calculate Button */}
          <button
            onClick={handleCalculate}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Calculating...' : 'Calculate Strategy'}
          </button>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Strategy Results */}
          {strategy && (
            <div className="space-y-6">
              {/* Recommended Plan */}
              <div className="bg-gradient-to-r from-green-500 to-blue-600 text-white rounded-lg shadow-lg p-6">
                <h3 className="text-2xl font-bold mb-4">Recommended Plan</h3>
                <h4 className="text-xl font-semibold mb-2">{strategy.recommended_plan.name}</h4>
                <p className="mb-4">{strategy.recommended_plan.description}</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm opacity-90">Monthly Payment</p>
                    <p className="text-2xl font-bold">{formatCurrency(strategy.recommended_plan.monthly_payment)}</p>
                  </div>
                  <div>
                    <p className="text-sm opacity-90">Total Cost</p>
                    <p className="text-2xl font-bold">{formatCurrency(strategy.recommended_plan.total_cost)}</p>
                  </div>
                </div>
                {strategy.recommended_plan.forgiveness_eligible && (
                  <div className="mt-4 bg-white dark:bg-slate-800 bg-opacity-20 rounded p-3">
                    <p className="font-semibold">Forgiveness Eligible</p>
                    <p className="text-sm">{strategy.recommended_plan.forgiveness_timeline}</p>
                  </div>
                )}
              </div>

              {/* PSLF Analysis */}
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
                <h3 className="text-xl font-semibold mb-4">PSLF Analysis</h3>
                {strategy.pslf_analysis.eligible ? (
                  <div className="space-y-3">
                    <div className="flex items-center text-green-600">
                      <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="font-semibold">You are eligible for PSLF!</span>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-slate-300">Qualifying Payments</p>
                        <p className="text-xl font-bold">{strategy.pslf_analysis.qualifying_payments}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-slate-300">Remaining Payments</p>
                        <p className="text-xl font-bold">{strategy.pslf_analysis.remaining_payments}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-slate-300">Est. Forgiveness</p>
                        <p className="text-xl font-bold">{formatCurrency(strategy.pslf_analysis.estimated_forgiveness_amount)}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-600 dark:text-slate-300">You are not currently eligible for PSLF based on your employment type.</p>
                )}
              </div>

              {/* Alternative Plans */}
              {strategy.alternative_plans.length > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
                  <h3 className="text-xl font-semibold mb-4">Alternative Plans</h3>
                  <div className="space-y-4">
                    {strategy.alternative_plans.map((plan: AlternativePlan, i: number) => (
                      <div key={i} className="border rounded-lg p-4">
                        <h4 className="font-semibold mb-2">{plan.name}</h4>
                        <div className="grid grid-cols-2 gap-4 mb-3">
                          <div>
                            <p className="text-sm text-gray-600 dark:text-slate-300">Monthly Payment</p>
                            <p className="font-semibold">{formatCurrency(plan.monthly_payment)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 dark:text-slate-300">Total Cost</p>
                            <p className="font-semibold">{formatCurrency(plan.total_cost)}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm font-medium text-green-600 mb-1">Pros:</p>
                            <ul className="text-sm space-y-1">
                              {plan.pros.map((pro: string, j: number) => (
                                <li key={j}>• {pro}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-red-600 mb-1">Cons:</p>
                            <ul className="text-sm space-y-1">
                              {plan.cons.map((con: string, j: number) => (
                                <li key={j}>• {con}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tax Implications */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                <h3 className="text-xl font-semibold mb-2">Tax Implications</h3>
                <p className="text-gray-700 dark:text-slate-200">{strategy.tax_implications}</p>
              </div>

              {/* Recommendations */}
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
                <h3 className="text-xl font-semibold mb-4">Recommendations</h3>
                <ul className="space-y-2">
                  {strategy.recommendations.map((rec: string, i: number) => (
                    <li key={i} className="flex items-start">
                      <span className="text-blue-500 mr-2">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <p className="text-xs text-gray-500 dark:text-slate-400 text-center">
                Strategy calculated by DeepSeek V3.1 Terminus • AIML API
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

