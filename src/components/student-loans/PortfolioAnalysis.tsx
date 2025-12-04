'use client';

interface PortfolioStats {
  total_loans: number;
  total_debt: number;
  weighted_interest_rate: number;
  loans_by_status: Record<string, number>;
  loans_by_servicer: Record<string, number>;
}

interface PortfolioAnalysisProps {
  stats: PortfolioStats;
}

export default function PortfolioAnalysis({ stats }: PortfolioAnalysisProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  // Calculate monthly payment estimate (assuming 10-year standard repayment)
  const estimateMonthlyPayment = () => {
    const monthlyRate = stats.weighted_interest_rate / 100 / 12;
    const numPayments = 120; // 10 years
    if (monthlyRate === 0) {
      return stats.total_debt / numPayments;
    }
    return stats.total_debt * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
           (Math.pow(1 + monthlyRate, numPayments) - 1);
  };

  const monthlyPayment = estimateMonthlyPayment();

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Total Debt Card */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-600">Total Debt</h3>
          <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-3xl font-bold text-gray-900 mb-1">{formatCurrency(stats.total_debt)}</p>
        <p className="text-sm text-gray-500">{stats.total_loans} {stats.total_loans === 1 ? 'loan' : 'loans'}</p>
      </div>

      {/* Weighted Interest Rate Card */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-600">Avg. Interest Rate</h3>
          <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        </div>
        <p className="text-3xl font-bold text-gray-900 mb-1">{formatPercent(stats.weighted_interest_rate)}</p>
        <p className="text-sm text-gray-500">Weighted average</p>
      </div>

      {/* Estimated Monthly Payment Card */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-600">Est. Monthly Payment</h3>
          <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <p className="text-3xl font-bold text-gray-900 mb-1">{formatCurrency(monthlyPayment)}</p>
        <p className="text-sm text-gray-500">10-year standard plan</p>
      </div>

      {/* Loans by Status */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 md:col-span-2">
        <h3 className="text-sm font-medium text-gray-900 mb-4">Loans by Status</h3>
        <div className="space-y-3">
          {Object.entries(stats.loans_by_status).map(([status, count]) => {
            const percentage = (count / stats.total_loans) * 100;
            const statusLabel = status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            
            return (
              <div key={status}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700">{statusLabel}</span>
                  <span className="text-gray-900 font-medium">{count} ({percentage.toFixed(0)}%)</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Loans by Servicer */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h3 className="text-sm font-medium text-gray-900 mb-4">Loans by Servicer</h3>
        <div className="space-y-3">
          {Object.entries(stats.loans_by_servicer).map(([servicer, count]) => {
            const percentage = (count / stats.total_loans) * 100;
            
            return (
              <div key={servicer} className="flex justify-between items-center">
                <span className="text-sm text-gray-700">{servicer}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-900 font-medium">{count}</span>
                  <span className="text-xs text-gray-500">({percentage.toFixed(0)}%)</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* AI Insights */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow-sm p-6 border border-blue-200 md:col-span-3">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">💡 AI-Powered Insights</h3>
            <p className="text-sm text-gray-700 mb-3">
              Based on your portfolio analysis, our AI has identified potential opportunities:
            </p>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>You may qualify for income-driven repayment plans that could lower your monthly payment</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Some of your loans may be eligible for Public Service Loan Forgiveness (PSLF)</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Consolidation could simplify your payments and potentially unlock forgiveness options</span>
              </li>
            </ul>
            <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
              Get Personalized AI Strategy
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

