'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoanList from '@/components/student-loans/LoanList';
import PortfolioAnalysis from '@/components/student-loans/PortfolioAnalysis';
import AddLoanForm, { type NewLoanFormData } from '@/components/student-loans/AddLoanForm';

interface StudentLoan {
  loan_id: string;
  loan_type: string;
  servicer_name: string;
  current_balance: number;
  interest_rate: number;
  loan_status: string;
  disbursement_date: string;
  repayment_start_date: string;
}

interface PortfolioStats {
  total_loans: number;
  total_debt: number;
  weighted_interest_rate: number;
  loans_by_status: Record<string, number>;
  loans_by_servicer: Record<string, number>;
}

export default function StudentLoansPage() {
  const router = useRouter();
  const [loans, setLoans] = useState<StudentLoan[]>([]);
  const [portfolioStats, setPortfolioStats] = useState<PortfolioStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    fetchLoans();
  }, []);

  const fetchLoans = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/student-loans/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: 'current-user' }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch loans');
      }

      const data = await response.json();
      setLoans(data.loans || []);
      setPortfolioStats(data.analysis || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleAddLoan = async (loanData: NewLoanFormData) => {
    try {
      // In a real app, this would call an API to add the loan
      console.log('Adding loan:', loanData);
      
      // Refresh loans after adding
      await fetchLoans();
      setShowAddForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add loan');
    }
  };

  const handleViewStrategies = (loanId: string) => {
    router.push(`/ai-strategies?loan=${loanId}`);
  };

  const handleCreateDispute = (loanId: string) => {
    router.push(`/disputes/student-loans?loan=${loanId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-1/4 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="h-32 bg-gray-200 dark:bg-slate-700 rounded"></div>
              <div className="h-32 bg-gray-200 dark:bg-slate-700 rounded"></div>
              <div className="h-32 bg-gray-200 dark:bg-slate-700 rounded"></div>
            </div>
            <div className="h-96 bg-gray-200 dark:bg-slate-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Student Loans</h1>
            <p className="text-gray-600 dark:text-slate-300 mt-2">
              Manage your student loan portfolio and get AI-powered strategies
            </p>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Add Loan
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Portfolio Analysis */}
        {portfolioStats && (
          <div className="mb-8">
            <PortfolioAnalysis stats={portfolioStats} />
          </div>
        )}

        {/* Loan List */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm">
          <div className="p-6 border-b border-gray-200 dark:border-slate-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Your Loans</h2>
            <p className="text-gray-600 dark:text-slate-300 mt-1">
              {loans.length} {loans.length === 1 ? 'loan' : 'loans'} in your portfolio
            </p>
          </div>
          <LoanList
            loans={loans}
            onViewStrategies={handleViewStrategies}
            onCreateDispute={handleCreateDispute}
          />
        </div>

        {/* Add Loan Modal */}
        {showAddForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-lg p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Add Student Loan</h2>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="text-gray-400 hover:text-gray-600 dark:text-slate-300"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <AddLoanForm
                onSubmit={handleAddLoan}
                onCancel={() => setShowAddForm(false)}
              />
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && loans.length === 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-12 text-center">
            <svg
              className="w-16 h-16 text-gray-400 dark:text-slate-500 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No loans yet</h3>
            <p className="text-gray-600 dark:text-slate-300 mb-6">
              Add your first student loan to get started with AI-powered strategies
            </p>
            <button
              onClick={() => setShowAddForm(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add Your First Loan
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
