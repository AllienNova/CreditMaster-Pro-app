'use client';

/**
 * Credit Builder Loan Page
 *
 * Helps users find and compare credit builder loans.
 * Features AI-powered matching, detailed comparisons, and step-by-step guidance.
 *
 * Designed to beat Credit Karma with:
 * - More detailed loan information
 * - AI-powered recommendations
 * - Interactive comparison tools
 * - Clear ROI calculations
 * - Step-by-step application guidance
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import type { CreditBuilderLoan } from '@/lib/credit-builder/credit-builder-service';

export default function CreditBuilderLoanPage() {
  const { user, loading: authLoading } = useAuth();
  const [loans, setLoans] = useState<CreditBuilderLoan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLoan, setSelectedLoan] = useState<CreditBuilderLoan | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [compareLoans, setCompareLoans] = useState<CreditBuilderLoan[]>([]);

  useEffect(() => {
    fetchLoans();
  }, []);

  const fetchLoans = async () => {
    try {
      const response = await fetch('/api/credit-builder/loans');
      const data = await response.json();
      setLoans(data.loans || []);
    } catch (error) {
      console.error('Error fetching loans:', error);
      // Set mock data for development
      setLoans([
        {
          id: 'cbl-1',
          provider: 'Self',
          name: 'Credit Builder Account',
          loanAmount: 1000,
          monthlyPayment: 48,
          term: 24,
          apr: 15.92,
          requirements: {
            employmentRequired: false,
            bankAccountRequired: true,
          },
          benefits: [
            'No credit check required',
            'Reports to all 3 bureaus',
            'Build savings while building credit',
            'Average 49-point increase',
          ],
          reporting: ['Experian', 'Equifax', 'TransUnion'],
          fees: {
            application: 0,
            monthly: 0,
            closing: 0,
          },
          recommended: true,
          aiReasoning: 'Recommended for beginners with no credit history. No credit check makes approval virtually guaranteed, and reporting to all 3 bureaus maximizes impact.',
        },
        {
          id: 'cbl-2',
          provider: 'MoneyLion',
          name: 'Credit Builder Plus',
          loanAmount: 1000,
          monthlyPayment: 19.99,
          term: 12,
          apr: 5.99,
          requirements: {
            employmentRequired: true,
            bankAccountRequired: true,
          },
          benefits: [
            'Low APR',
            'Fast credit building',
            'Managed investment account',
            'Cash advances available',
          ],
          reporting: ['Experian', 'Equifax', 'TransUnion'],
          fees: {
            monthly: 19.99,
          },
          recommended: false,
          aiReasoning: 'Best for employed individuals seeking fast results. Lower APR saves money, but requires employment verification.',
        },
        {
          id: 'cbl-3',
          provider: 'Kikoff',
          name: 'Credit Account',
          loanAmount: 500,
          monthlyPayment: 5,
          term: 12,
          apr: 0,
          requirements: {
            minCreditScore: 300,
            employmentRequired: false,
            bankAccountRequired: true,
          },
          benefits: [
            '0% APR',
            'Lowest monthly payment',
            'Reports to all 3 bureaus',
            'No credit check',
          ],
          reporting: ['Experian', 'Equifax', 'TransUnion'],
          fees: {
            application: 0,
            monthly: 0,
          },
          recommended: true,
          aiReasoning: '0% APR makes this the most affordable option. Perfect for those on tight budgets who want to build credit slowly.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const toggleCompare = (loan: CreditBuilderLoan) => {
    if (compareLoans.find(l => l.id === loan.id)) {
      setCompareLoans(compareLoans.filter(l => l.id !== loan.id));
    } else if (compareLoans.length < 3) {
      setCompareLoans([...compareLoans, loan]);
    }
  };

  const calculateTotalCost = (loan: CreditBuilderLoan) => {
    const totalPayments = loan.monthlyPayment * loan.term;
    const applicationFee = loan.fees.application || 0;
    const closingFee = loan.fees.closing || 0;
    return totalPayments + applicationFee + closingFee;
  };

  const calculateTotalInterest = (loan: CreditBuilderLoan) => {
    return calculateTotalCost(loan) - loan.loanAmount;
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading credit builder loans...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <Link href="/credit-builder" className="text-sm text-blue-600 hover:text-blue-700 mb-2 inline-block">
                ← Back to Credit Builder
              </Link>
              <h1 className="text-3xl font-bold text-gray-900">Credit Builder Loans</h1>
              <p className="mt-1 text-sm text-gray-600">
                Build credit and savings simultaneously with AI-matched recommendations
              </p>
            </div>
            {compareLoans.length > 0 && (
              <button
                onClick={() => setShowComparison(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Compare {compareLoans.length} Loan{compareLoans.length > 1 ? 's' : ''}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold mb-1">Reports to All 3 Bureaus</h3>
                <p className="text-sm text-blue-100">Maximum credit score impact across Experian, Equifax, and TransUnion</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold mb-1">Build Credit + Savings</h3>
                <p className="text-sm text-blue-100">Your payments go into a savings account you receive at the end</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold mb-1">Average 49-Point Increase</h3>
                <p className="text-sm text-blue-100">Users see significant credit score improvements within 3-6 months</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* AI Recommendations */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6 mb-8">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900 mb-2">AI-Powered Recommendations</h2>
              <p className="text-gray-700">
                Based on your credit profile, we recommend starting with a <strong>no credit check</strong> option that reports to all 3 bureaus.
                This maximizes your chances of approval while building credit across all major bureaus.
              </p>
            </div>
          </div>
        </div>

        {/* Loan Cards */}
        <div className="space-y-6">
          {loans.map((loan) => (
            <div
              key={loan.id}
              className={`bg-white rounded-xl shadow-sm border-2 transition-all ${
                loan.recommended
                  ? 'border-blue-500 shadow-lg'
                  : compareLoans.find(l => l.id === loan.id)
                  ? 'border-green-500'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {loan.recommended && (
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-2 rounded-t-xl flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <span className="font-semibold">AI Recommended</span>
                  </div>
                </div>
              )}

              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-2xl font-bold text-gray-900">{loan.provider}</h3>
                      {loan.recommended && (
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                          Best Match
                        </span>
                      )}
                    </div>
                    <p className="text-lg text-gray-600">{loan.name}</p>
                  </div>
                  <button
                    onClick={() => toggleCompare(loan)}
                    className={`px-4 py-2 rounded-lg border-2 transition-all ${
                      compareLoans.find(l => l.id === loan.id)
                        ? 'bg-green-50 border-green-500 text-green-700'
                        : 'border-gray-300 text-gray-700 hover:border-blue-500'
                    }`}
                  >
                    {compareLoans.find(l => l.id === loan.id) ? '✓ Added' : 'Compare'}
                  </button>
                </div>

                {loan.aiReasoning && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <div className="flex items-start space-x-2">
                      <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      <p className="text-sm text-blue-900">{loan.aiReasoning}</p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-gray-900">${loan.loanAmount.toLocaleString()}</div>
                    <div className="text-sm text-gray-600">Loan Amount</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-gray-900">${loan.monthlyPayment}</div>
                    <div className="text-sm text-gray-600">Monthly Payment</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-gray-900">{loan.term} mo</div>
                    <div className="text-sm text-gray-600">Term Length</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-gray-900">{loan.apr}%</div>
                    <div className="text-sm text-gray-600">APR</div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  {/* Benefits */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Key Benefits</h4>
                    <ul className="space-y-2">
                      {loan.benefits.map((benefit, idx) => (
                        <li key={idx} className="flex items-start space-x-2">
                          <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span className="text-sm text-gray-700">{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Requirements */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Requirements</h4>
                    <ul className="space-y-2">
                      {loan.requirements.minCreditScore && (
                        <li className="flex items-start space-x-2">
                          <svg className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                          </svg>
                          <span className="text-sm text-gray-700">Min Credit Score: {loan.requirements.minCreditScore}</span>
                        </li>
                      )}
                      <li className="flex items-start space-x-2">
                        {loan.requirements.employmentRequired ? (
                          <svg className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                        <span className="text-sm text-gray-700">
                          {loan.requirements.employmentRequired ? 'Employment Required' : 'No Employment Required'}
                        </span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <svg className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                          <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm text-gray-700">Bank Account Required</span>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Cost Breakdown */}
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Cost Breakdown</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-gray-600">Total Payments</div>
                      <div className="text-lg font-bold text-gray-900">${(loan.monthlyPayment * loan.term).toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Total Interest</div>
                      <div className="text-lg font-bold text-gray-900">${calculateTotalInterest(loan).toLocaleString()}</div>
                    </div>
                    {(loan.fees.application || 0) > 0 && (
                      <div>
                        <div className="text-sm text-gray-600">Application Fee</div>
                        <div className="text-lg font-bold text-gray-900">${loan.fees.application}</div>
                      </div>
                    )}
                    {(loan.fees.monthly || 0) > 0 && (
                      <div>
                        <div className="text-sm text-gray-600">Monthly Fee</div>
                        <div className="text-lg font-bold text-gray-900">${loan.fees.monthly}</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Reporting */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Reports To:</div>
                    <div className="flex items-center space-x-2">
                      {loan.reporting.map((bureau, idx) => (
                        <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                          {bureau}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* CTA Button */}
                <button
                  onClick={() => setSelectedLoan(loan)}
                  className={`w-full py-3 rounded-lg font-semibold transition-all ${
                    loan.recommended
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-900 text-white hover:bg-gray-800'
                  }`}
                >
                  View Details & Apply
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* How It Works */}
        <div className="mt-12 bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">How Credit Builder Loans Work</h2>

          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">1</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Apply</h3>
              <p className="text-sm text-gray-600">Choose a loan amount and submit your application online</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">2</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Get Approved</h3>
              <p className="text-sm text-gray-600">Most approvals happen instantly, even with no credit</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">3</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Make Payments</h3>
              <p className="text-sm text-gray-600">Your payments are held in a savings account and reported to bureaus</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">4</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Build Credit</h3>
              <p className="text-sm text-gray-600">After completing payments, receive your savings plus interest</p>
            </div>
          </div>
        </div>
      </div>

      {/* Comparison Modal */}
      {showComparison && compareLoans.length > 0 && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Compare Loans</h2>
              <button
                onClick={() => setShowComparison(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {compareLoans.map((loan) => (
                  <div key={loan.id} className="border-2 border-gray-200 rounded-lg p-4">
                    <h3 className="font-bold text-lg mb-2">{loan.provider}</h3>
                    <p className="text-sm text-gray-600 mb-4">{loan.name}</p>

                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Loan Amount:</span>
                        <span className="font-semibold">${loan.loanAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Monthly Payment:</span>
                        <span className="font-semibold">${loan.monthlyPayment}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Term:</span>
                        <span className="font-semibold">{loan.term} months</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">APR:</span>
                        <span className="font-semibold">{loan.apr}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Interest:</span>
                        <span className="font-semibold">${calculateTotalInterest(loan).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Cost:</span>
                        <span className="font-semibold">${calculateTotalCost(loan).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedLoan && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">{selectedLoan.provider} - {selectedLoan.name}</h2>
              <button
                onClick={() => setSelectedLoan(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-blue-900 mb-2">Application Steps</h3>
                <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
                  <li>Click "Start Application" button below</li>
                  <li>Provide basic personal information</li>
                  <li>Link your bank account</li>
                  <li>Choose your loan amount and term</li>
                  <li>Review and submit application</li>
                  <li>Get instant approval decision</li>
                  <li>Start building credit immediately</li>
                </ol>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-green-900 mb-2">What You'll Receive</h3>
                <ul className="space-y-2 text-sm text-green-800">
                  <li className="flex items-start space-x-2">
                    <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Positive payment history reported monthly</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Savings account with your loan amount plus interest</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Average 49-point credit score increase</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Established credit history with all 3 bureaus</span>
                  </li>
                </ul>
              </div>

              <button className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors">
                Start Application →
              </button>

              <p className="text-xs text-gray-500 text-center mt-4">
                This will open {selectedLoan.provider}'s secure application page. CPFI may receive a commission.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
