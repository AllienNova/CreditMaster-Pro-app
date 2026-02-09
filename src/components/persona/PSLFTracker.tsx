'use client';

import { useState } from 'react';
import { CircularProgress, InfoTooltip, ContextualHelp } from '@/components/ui';

interface PSLFData {
  qualifyingPayments: number;
  totalPaymentsMade: number;
  employerQualifies: boolean;
  loanType: 'direct' | 'ffel' | 'perkins' | 'consolidation';
  repaymentPlan: string;
  estimatedForgiveness: number;
}

export default function PSLFTracker() {
  const [pslfData] = useState<PSLFData>({
    qualifyingPayments: 45,
    totalPaymentsMade: 52,
    employerQualifies: true,
    loanType: 'direct',
    repaymentPlan: 'PAYE',
    estimatedForgiveness: 85000,
  });

  const requiredPayments = 120;
  const remainingPayments = requiredPayments - pslfData.qualifyingPayments;
  const progress = (pslfData.qualifyingPayments / requiredPayments) * 100;
  const monthsRemaining = remainingPayments;
  const yearsRemaining = Math.floor(monthsRemaining / 12);
  const monthsRemainingInYear = monthsRemaining % 12;

  const estimatedCompletionDate = new Date();
  estimatedCompletionDate.setMonth(estimatedCompletionDate.getMonth() + monthsRemaining);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">PSLF Tracker</h2>
        <InfoTooltip content="Track your progress toward Public Service Loan Forgiveness" />
      </div>

      <ContextualHelp
        title="What is PSLF?"
        content="Public Service Loan Forgiveness (PSLF) forgives the remaining balance on your Direct Loans after you make 120 qualifying monthly payments while working full-time for a qualifying employer."
        learnMoreUrl="https://studentaid.gov/manage-loans/forgiveness-cancellation/public-service"
      />

      {/* Progress Circle */}
      <div className="flex flex-col items-center mb-8">
        <CircularProgress
          progress={progress}
          size={200}
          label={`${pslfData.qualifyingPayments} / ${requiredPayments} payments`}
        />
        <div className="mt-6 text-center">
          <div className="text-3xl font-bold text-blue-600">
            {remainingPayments} payments left
          </div>
          <div className="text-gray-600 dark:text-slate-300 mt-2">
            Estimated completion:{' '}
            {estimatedCompletionDate.toLocaleDateString('en-US', {
              month: 'long',
              year: 'numeric',
            })}
          </div>
          <div className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            ({yearsRemaining} years, {monthsRemainingInYear} months)
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-sm text-green-700 font-medium mb-1">
            Qualifying Payments
          </div>
          <div className="text-2xl font-bold text-green-900">
            {pslfData.qualifyingPayments}
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-sm text-blue-700 font-medium mb-1">
            Total Payments Made
          </div>
          <div className="text-2xl font-bold text-blue-900">
            {pslfData.totalPaymentsMade}
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-sm text-blue-700 font-medium mb-1">
            Estimated Forgiveness
          </div>
          <div className="text-2xl font-bold text-blue-900">
            ${pslfData.estimatedForgiveness.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Eligibility Status */}
      <div className="space-y-4 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Eligibility Status</h3>

        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-900 rounded-lg">
          <div className="flex items-center space-x-3">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center ${
                pslfData.employerQualifies ? 'bg-green-500' : 'bg-red-500'
              }`}
            >
              {pslfData.employerQualifies ? (
                <svg
                  className="w-4 h-4 text-white"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg
                  className="w-4 h-4 text-white"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </div>
            <div>
              <div className="font-medium text-gray-900 dark:text-white">Qualifying Employer</div>
              <div className="text-sm text-gray-600 dark:text-slate-300">
                {pslfData.employerQualifies
                  ? 'Your employer qualifies for PSLF'
                  : 'Your employer does not qualify for PSLF'}
              </div>
            </div>
          </div>
          <button
            type="button"
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            Verify
          </button>
        </div>

        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-900 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 rounded-full flex items-center justify-center bg-green-500">
              <svg
                className="w-4 h-4 text-white"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <div className="font-medium text-gray-900 dark:text-white">Loan Type</div>
              <div className="text-sm text-gray-600 dark:text-slate-300">
                {pslfData.loanType === 'direct'
                  ? 'Direct Loans (Eligible)'
                  : 'Non-Direct Loans (May need consolidation)'}
              </div>
            </div>
          </div>
          <button
            type="button"
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            Check
          </button>
        </div>

        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-900 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 rounded-full flex items-center justify-center bg-green-500">
              <svg
                className="w-4 h-4 text-white"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <div className="font-medium text-gray-900 dark:text-white">Repayment Plan</div>
              <div className="text-sm text-gray-600 dark:text-slate-300">
                {pslfData.repaymentPlan} (Qualifying)
              </div>
            </div>
          </div>
          <button
            type="button"
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            Change
          </button>
        </div>
      </div>

      {/* Action Items */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-3">Next Steps</h4>
        <ul className="space-y-2">
          <li className="flex items-start space-x-2">
            <span className="text-blue-600 mt-1">•</span>
            <span className="text-sm text-blue-800">
              Submit your Employment Certification Form annually
            </span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="text-blue-600 mt-1">•</span>
            <span className="text-sm text-blue-800">
              Make on-time payments every month
            </span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="text-blue-600 mt-1">•</span>
            <span className="text-sm text-blue-800">
              Keep records of all payments and employment
            </span>
          </li>
        </ul>
        <button
          type="button"
          className="w-full mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          Download ECF Form
        </button>
      </div>
    </div>
  );
}
