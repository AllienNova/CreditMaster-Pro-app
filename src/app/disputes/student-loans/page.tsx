'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import DisputeStrategyCard from '@/components/disputes/DisputeStrategyCard';

interface DisputeStrategy {
  dispute_id: string;
  loan_id: string;
  error_type: string;
  dispute_strategy: string;
  letter_content: string;
  success_probability: number;
  estimated_timeline: number;
  required_documentation: string[];
  legal_precedents: string[];
  created_at: Date;
}

function StudentLoanDisputesContent() {
  const searchParams = useSearchParams();
  const loanId = searchParams.get('loan');

  const [strategies, setStrategies] = useState<DisputeStrategy[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState<DisputeStrategy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const fetchDisputeStrategies = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/disputes/generate-student-loan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loan_id: loanId }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch dispute strategies');
      }

      const data = await response.json();
      setStrategies(data.strategies || []);
      if (data.strategies && data.strategies.length > 0) {
        setSelectedStrategy(data.strategies[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [loanId]);

  useEffect(() => {
    if (loanId) {
      void fetchDisputeStrategies();
    }
  }, [loanId, fetchDisputeStrategies]);

  const handleGenerateLetter = async (strategy: DisputeStrategy) => {
    setGenerating(true);
    try {
      // In a real app, this would call an API to generate the dispute letter
      console.log('Generating letter for strategy:', strategy.dispute_id);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      alert('Dispute letter generated successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate letter');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-1/3 mb-8"></div>
            <div className="h-96 bg-gray-200 dark:bg-slate-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!loanId) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-12 text-center">
            <svg className="w-16 h-16 text-gray-400 dark:text-slate-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">No Loan Selected</h2>
            <p className="text-gray-600 dark:text-slate-300 mb-6">
              Please select a loan from your portfolio to create a dispute
            </p>
            <a
              href="/student-loans"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go to Student Loans
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-300 mb-2">
            <a href="/student-loans" className="hover:text-blue-600">Student Loans</a>
            <span>/</span>
            <span>Dispute Strategies</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Student Loan Dispute Strategies</h1>
          <p className="text-gray-600 dark:text-slate-300 mt-2">
            AI-powered dispute strategies based on servicer error detection
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <div className="flex items-start gap-4">
            <svg className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="text-lg font-semibold text-blue-900 mb-2">How Dispute Strategies Work</h3>
              <p className="text-sm text-blue-800 mb-3">
                Our AI analyzes your loan servicer's records for common errors including:
              </p>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>Payment misapplication or miscounting</li>
                <li>Incorrect interest calculations</li>
                <li>Improper forbearance or deferment handling</li>
                <li>PSLF payment count errors</li>
                <li>Servicer transfer issues</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Dispute Strategies */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {strategies.length === 0 ? (
            <div className="col-span-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm p-12 text-center">
              <svg className="w-16 h-16 text-gray-400 dark:text-slate-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Errors Detected</h3>
              <p className="text-gray-600 dark:text-slate-300 mb-6">
                Our AI hasn't detected any servicer errors for this loan yet. Check back later or contact support if you believe there's an error.
              </p>
              <button
                onClick={fetchDisputeStrategies}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Re-scan for Errors
              </button>
            </div>
          ) : (
            strategies.map((strategy, index) => (
              <DisputeStrategyCard
                key={strategy.dispute_id}
                strategy={strategy}
                rank={index + 1}
                isSelected={selectedStrategy?.dispute_id === strategy.dispute_id}
                onSelect={() => setSelectedStrategy(strategy)}
                onGenerateLetter={() => handleGenerateLetter(strategy)}
                generating={generating}
              />
            ))
          )}
        </div>

        {/* Selected Strategy Details */}
        {selectedStrategy && (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Dispute Strategy Details</h2>

            {/* Letter Preview */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Dispute Letter Preview</h3>
              <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-6 border border-gray-200 dark:border-slate-700">
                <pre className="text-sm text-gray-700 dark:text-slate-200 whitespace-pre-wrap font-sans">
                  {selectedStrategy.letter_content || 'Letter content will be generated when you click "Generate Dispute Letter"'}
                </pre>
              </div>
            </div>

            {/* Documentation Checklist */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Documentation Checklist</h3>
              <div className="space-y-2">
                {selectedStrategy.required_documentation.map((doc, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-900 rounded-lg">
                    <input
                      type="checkbox"
                      className="w-5 h-5 text-blue-600 border-gray-300 dark:border-slate-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-slate-200">{doc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Legal Precedents */}
            {selectedStrategy.legal_precedents && selectedStrategy.legal_precedents.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Supporting Legal Precedents</h3>
                <div className="space-y-3">
                  {selectedStrategy.legal_precedents.map((precedent, index) => (
                    <div key={index} className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-sm text-gray-700 dark:text-slate-200">{precedent}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        {selectedStrategy && (
          <div className="flex gap-4">
            <button
              onClick={() => handleGenerateLetter(selectedStrategy)}
              disabled={generating}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? 'Generating...' : 'Generate Dispute Letter'}
            </button>
            <button className="px-6 py-3 bg-white border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-200 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 dark:bg-slate-900 transition-colors font-medium">
              Download Documentation
            </button>
            <button className="px-6 py-3 bg-white border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-200 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 dark:bg-slate-900 transition-colors font-medium">
              Contact Support
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function StudentLoanDisputesPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="text-lg">Loading...</div></div>}>
      <StudentLoanDisputesContent />
    </Suspense>
  );
}
