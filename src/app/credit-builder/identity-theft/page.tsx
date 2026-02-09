'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';

// Types
interface RecoveryStep {
  id: string;
  category: 'immediate' | 'short_term' | 'long_term' | 'ongoing';
  title: string;
  description: string;
  completed: boolean;
  priority: 'critical' | 'high' | 'medium' | 'low';
  estimatedTime: string;
  resources: string[];
  substeps?: string[];
}

interface FraudulentAccount {
  id: string;
  type: 'credit_card' | 'loan' | 'utility' | 'government' | 'medical' | 'other';
  creditor: string;
  accountNumber: string;
  dateOpened: Date;
  amountOwed: number;
  status: 'reported' | 'disputed' | 'investigating' | 'resolved' | 'closed';
  reportedTo: string[];
  disputeDate?: Date;
  resolutionDate?: Date;
  notes: string;
}

interface Document {
  id: string;
  name: string;
  type:
    | 'police_report'
    | 'ftc_report'
    | 'affidavit'
    | 'dispute_letter'
    | 'correspondence'
    | 'evidence';
  uploadDate: Date;
  url?: string;
}

interface Contact {
  organization: string;
  phone: string;
  website: string;
  purpose: string;
  hours: string;
}

export default function IdentityTheftRecovery() {
  const { user, loading: authLoading } = useAuth();

  const [currentPhase, setCurrentPhase] = useState<
    'assessment' | 'immediate' | 'recovery' | 'monitoring'
  >('assessment');
  const [recoverySteps, setRecoverySteps] = useState<RecoveryStep[]>([]);
  const [fraudulentAccounts, setFraudulentAccounts] = useState<
    FraudulentAccount[]
  >([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [selectedStep, setSelectedStep] = useState<RecoveryStep | null>(null);
  const [loading, setLoading] = useState(false);

  // Important contacts
  const importantContacts: Contact[] = [
    {
      organization: 'Federal Trade Commission (FTC)',
      phone: '1-877-438-4338',
      website: 'https://www.identitytheft.gov',
      purpose: 'Report identity theft & get recovery plan',
      hours: '24/7',
    },
    {
      organization: 'Experian Fraud Alert',
      phone: '1-888-397-3742',
      website: 'https://www.experian.com/fraud',
      purpose: 'Place fraud alert on credit report',
      hours: '24/7',
    },
    {
      organization: 'Equifax Fraud Alert',
      phone: '1-800-525-6285',
      website:
        'https://www.equifax.com/personal/credit-report-services/credit-fraud-alerts/',
      purpose: 'Place fraud alert on credit report',
      hours: '24/7',
    },
    {
      organization: 'TransUnion Fraud Alert',
      phone: '1-800-680-7289',
      website: 'https://www.transunion.com/fraud-victim-resource-center',
      purpose: 'Place fraud alert on credit report',
      hours: '24/7',
    },
    {
      organization: 'Local Police Department',
      phone: '911 (non-emergency line)',
      website: 'N/A',
      purpose: 'File identity theft report',
      hours: '24/7',
    },
    {
      organization: 'Social Security Administration',
      phone: '1-800-772-1213',
      website: 'https://www.ssa.gov/number-card/report-stolen-number',
      purpose: 'Report SSN misuse',
      hours: 'Mon-Fri 8am-7pm',
    },
    {
      organization: 'IRS Identity Protection',
      phone: '1-800-908-4490',
      website: 'https://www.irs.gov/identity-theft-fraud-scams',
      purpose: 'Report tax-related identity theft',
      hours: 'Mon-Fri 7am-7pm',
    },
  ];

  useEffect(() => {
    initializeRecoverySteps();
    fetchFraudulentAccounts();
    fetchDocuments();
  }, []);

  const initializeRecoverySteps = () => {
    const steps: RecoveryStep[] = [
      // Immediate Actions (within 24 hours)
      {
        id: 'place_fraud_alert',
        category: 'immediate',
        title: 'Place Fraud Alert on Credit Reports',
        description:
          'Contact one credit bureau to place a fraud alert. They will notify the other two.',
        completed: false,
        priority: 'critical',
        estimatedTime: '15 minutes',
        resources: [
          'Experian: 1-888-397-3742',
          'Equifax: 1-800-525-6285',
          'TransUnion: 1-800-680-7289',
        ],
        substeps: [
          'Call any ONE of the three bureaus',
          'Request a fraud alert be placed',
          'They will automatically notify the other two bureaus',
          'Alert lasts 1 year, can be extended to 7 years with police report',
        ],
      },
      {
        id: 'report_ftc',
        category: 'immediate',
        title: 'Report to FTC at IdentityTheft.gov',
        description:
          'File an official identity theft report with the Federal Trade Commission.',
        completed: false,
        priority: 'critical',
        estimatedTime: '30 minutes',
        resources: [
          'Website: https://www.identitytheft.gov',
          'Phone: 1-877-438-4338',
        ],
        substeps: [
          'Go to IdentityTheft.gov',
          'Answer questions about what happened',
          'Get your Identity Theft Report',
          "Print and save your report (you'll need it)",
        ],
      },
      {
        id: 'file_police_report',
        category: 'immediate',
        title: 'File Police Report',
        description:
          'Report the identity theft to your local police department.',
        completed: false,
        priority: 'critical',
        estimatedTime: '1-2 hours',
        resources: [
          'Local police non-emergency number',
          'FTC Identity Theft Report (bring with you)',
        ],
        substeps: [
          'Call your local police department',
          'Ask to file an identity theft report',
          'Bring your FTC report and proof of identity',
          'Get a copy of the police report',
        ],
      },
      {
        id: 'notify_creditors',
        category: 'immediate',
        title: 'Contact Fraud Departments',
        description:
          'Call fraud departments of affected companies immediately.',
        completed: false,
        priority: 'critical',
        estimatedTime: '2-4 hours',
        resources: [
          'List of fraudulent accounts',
          'Account numbers',
          'FTC report number',
        ],
        substeps: [
          'Make a list of all affected accounts',
          "Call each company's fraud department",
          'Request accounts be closed or frozen',
          'Get confirmation numbers',
        ],
      },

      // Short-term Actions (within 1 week)
      {
        id: 'freeze_credit',
        category: 'short_term',
        title: 'Freeze Credit at All Bureaus',
        description:
          'Place a security freeze at all three credit bureaus to prevent new accounts.',
        completed: false,
        priority: 'high',
        estimatedTime: '30 minutes',
        resources: ['Experian freeze', 'Equifax freeze', 'TransUnion freeze'],
        substeps: [
          "Visit each bureau's freeze page",
          'Create an account and verify identity',
          'Place the freeze',
          'Save your PIN/passwords',
        ],
      },
      {
        id: 'dispute_fraudulent',
        category: 'short_term',
        title: 'Dispute Fraudulent Accounts',
        description:
          'File disputes with credit bureaus for all fraudulent accounts.',
        completed: false,
        priority: 'high',
        estimatedTime: '2-3 hours',
        resources: [
          'FTC report',
          'Police report',
          'Dispute forms from each bureau',
        ],
        substeps: [
          'Get your credit reports from all three bureaus',
          'Identify all fraudulent accounts',
          'File online disputes with evidence',
          'Keep copies of all correspondence',
        ],
      },
      {
        id: 'change_credentials',
        category: 'short_term',
        title: 'Change All Passwords & PINs',
        description: 'Update security credentials for all online accounts.',
        completed: false,
        priority: 'high',
        estimatedTime: '3-5 hours',
        resources: ['Password manager', 'Two-factor authentication apps'],
        substeps: [
          'Change passwords for all financial accounts',
          'Enable two-factor authentication everywhere',
          'Change security questions',
          'Update email passwords first',
        ],
      },
      {
        id: 'request_reports',
        category: 'short_term',
        title: 'Request Extended Fraud Alert',
        description:
          'With police report, extend fraud alert from 1 year to 7 years.',
        completed: false,
        priority: 'medium',
        estimatedTime: '20 minutes',
        resources: ['Police report number', 'Credit bureau phone numbers'],
      },

      // Long-term Actions (within 1 month)
      {
        id: 'monitor_credit',
        category: 'long_term',
        title: 'Set Up Credit Monitoring',
        description:
          'Enroll in credit monitoring service to watch for new fraudulent activity.',
        completed: false,
        priority: 'high',
        estimatedTime: '30 minutes',
        resources: ['Fynvita monitoring', 'Free bureau monitoring services'],
      },
      {
        id: 'review_mail',
        category: 'long_term',
        title: 'Review All Mail & Statements',
        description:
          'Check all mail for signs of identity theft for next 6-12 months.',
        completed: false,
        priority: 'medium',
        estimatedTime: 'Ongoing',
        resources: [],
      },
      {
        id: 'close_unauthorized',
        category: 'long_term',
        title: 'Close Unauthorized Accounts',
        description: 'Work with creditors to close all fraudulent accounts.',
        completed: false,
        priority: 'high',
        estimatedTime: '2-4 weeks',
        resources: [
          'FTC report',
          'Police report',
          'Dispute confirmation numbers',
        ],
      },
      {
        id: 'check_public_records',
        category: 'long_term',
        title: 'Check Public Records',
        description:
          'Verify no fraudulent activity in court records, DMV, etc.',
        completed: false,
        priority: 'medium',
        estimatedTime: '2-3 hours',
        resources: ['Local courthouse', 'DMV', 'Secretary of State'],
      },

      // Ongoing Actions
      {
        id: 'monitor_ongoing',
        category: 'ongoing',
        title: 'Maintain Vigilant Monitoring',
        description:
          'Continue monitoring credit reports and accounts indefinitely.',
        completed: false,
        priority: 'high',
        estimatedTime: 'Ongoing',
        resources: ['Credit monitoring alerts', 'Bank alerts', 'Email alerts'],
      },
      {
        id: 'annual_review',
        category: 'ongoing',
        title: 'Annual Credit Report Review',
        description: 'Pull and review all three credit reports annually.',
        completed: false,
        priority: 'medium',
        estimatedTime: '1 hour/year',
        resources: ['AnnualCreditReport.com'],
      },
      {
        id: 'tax_pin',
        category: 'ongoing',
        title: 'Get IRS Identity Protection PIN',
        description: 'Request IP PIN from IRS to prevent tax fraud.',
        completed: false,
        priority: 'medium',
        estimatedTime: '15 minutes',
        resources: ['IRS.gov/IPPIN'],
      },
    ];

    setRecoverySteps(steps);
  };

  const fetchFraudulentAccounts = async () => {
    try {
      const response = await fetch(
        '/api/credit-builder/identity-theft/accounts'
      );
      if (response.ok) {
        const data = await response.json();
        setFraudulentAccounts(data.accounts || []);
      }
    } catch (err) {
      console.error('Failed to fetch accounts:', err);
    }
  };

  const fetchDocuments = async () => {
    try {
      const response = await fetch(
        '/api/credit-builder/identity-theft/documents'
      );
      if (response.ok) {
        const data = await response.json();
        setDocuments(data.documents || []);
      }
    } catch (err) {
      console.error('Failed to fetch documents:', err);
    }
  };

  const toggleStepCompletion = (stepId: string) => {
    setRecoverySteps((prev) =>
      prev.map((step) =>
        step.id === stepId ? { ...step, completed: !step.completed } : step
      )
    );
  };

  const getProgressByCategory = (category: string) => {
    const categorySteps = recoverySteps.filter((s) => s.category === category);
    const completed = categorySteps.filter((s) => s.completed).length;
    return {
      total: categorySteps.length,
      completed,
      percentage:
        categorySteps.length > 0
          ? Math.round((completed / categorySteps.length) * 100)
          : 0,
    };
  };

  const getOverallProgress = () => {
    const completed = recoverySteps.filter((s) => s.completed).length;
    return {
      total: recoverySteps.length,
      completed,
      percentage: Math.round((completed / recoverySteps.length) * 100),
    };
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-red-600 mx-auto"></div>
          <p className="mt-6 text-lg text-gray-700 dark:text-slate-200 font-medium">
            Loading Identity Theft Recovery Center...
          </p>
        </div>
      </div>
    );
  }

  const overallProgress = getOverallProgress();
  const immediateProgress = getProgressByCategory('immediate');
  const shortTermProgress = getProgressByCategory('short_term');
  const longTermProgress = getProgressByCategory('long_term');
  const ongoingProgress = getProgressByCategory('ongoing');

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Link
            href="/credit-builder"
            className="inline-flex items-center text-red-600 hover:text-red-700 mb-4"
          >
            ← Back to Credit Builder
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Identity Theft Recovery Center 
          </h1>
          <p className="text-lg text-gray-600 dark:text-slate-300 max-w-3xl mx-auto">
            Complete step-by-step recovery plan for identity theft victims.
            We'll guide you through every action needed to restore your identity
            and credit.
          </p>
        </div>

        {/* Emergency Alert */}
        <div className="bg-red-600 text-white rounded-xl p-6 mb-8 shadow-xl">
          <div className="flex items-start gap-4">
            <span className="text-4xl">🆘</span>
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-2">
                If You're a Victim of Identity Theft
              </h2>
              <p className="mb-4 opacity-90">
                Take immediate action! The first 24-48 hours are critical.
                Follow the steps below in order.
              </p>
              <div className="flex flex-wrap gap-3">
                <a
                  href="https://www.identitytheft.gov"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-white text-red-600 font-semibold rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 dark:bg-slate-800 transition-colors"
                >
                  Report to FTC Now →
                </a>
                <a
                  href="tel:1-877-438-4338"
                  className="px-4 py-2 bg-red-700 text-white font-semibold rounded-lg hover:bg-red-800 transition-colors"
                >
                  Call FTC: 1-877-438-4338
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Overall Progress */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Recovery Progress
              </h2>
              <p className="text-gray-600 dark:text-slate-300">
                {overallProgress.completed} of {overallProgress.total} steps
                completed
              </p>
            </div>
            <div className="text-right">
              <p className="text-4xl font-bold text-gray-900 dark:text-white">
                {overallProgress.percentage}%
              </p>
            </div>
          </div>
          <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-4">
            <div
              className="bg-gradient-to-r from-red-500 to-orange-500 h-4 rounded-full transition-all"
              style={{ width: `${overallProgress.percentage}%` }}
            ></div>
          </div>

          <div className="grid md:grid-cols-4 gap-4 mt-6">
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-slate-300 mb-1">Immediate</p>
              <p className="text-2xl font-bold text-red-600">
                {immediateProgress.percentage}%
              </p>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                {immediateProgress.completed}/{immediateProgress.total}
              </p>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-slate-300 mb-1">Short-term</p>
              <p className="text-2xl font-bold text-orange-600">
                {shortTermProgress.percentage}%
              </p>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                {shortTermProgress.completed}/{shortTermProgress.total}
              </p>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-slate-300 mb-1">Long-term</p>
              <p className="text-2xl font-bold text-yellow-600">
                {longTermProgress.percentage}%
              </p>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                {longTermProgress.completed}/{longTermProgress.total}
              </p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-slate-300 mb-1">Ongoing</p>
              <p className="text-2xl font-bold text-blue-600">
                {ongoingProgress.percentage}%
              </p>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                {ongoingProgress.completed}/{ongoingProgress.total}
              </p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column: Recovery Steps */}
          <div className="lg:col-span-2 space-y-6">
            {/* Immediate Actions */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-red-600 mb-4 flex items-center gap-2">
                <span></span> Immediate Actions (Within 24 Hours)
              </h3>
              <div className="space-y-3">
                {recoverySteps
                  .filter((step) => step.category === 'immediate')
                  .map((step) => (
                    <div
                      key={step.id}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        step.completed
                          ? 'bg-green-50 border-green-300'
                          : 'bg-white dark:bg-slate-800 border-red-300 hover:border-red-400'
                      }`}
                      onClick={() => setSelectedStep(step)}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleStepCompletion(step.id);
                          }}
                          className={`mt-1 w-6 h-6 rounded border-2 flex items-center justify-center ${
                            step.completed
                              ? 'bg-green-500 border-green-500'
                              : 'border-gray-300 dark:border-slate-600 hover:border-green-500'
                          }`}
                        >
                          {step.completed && (
                            <svg
                              className="w-4 h-4 text-white"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          )}
                        </button>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {step.title}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-slate-300">
                            {step.description}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                            Est. time: {step.estimatedTime}
                          </p>
                        </div>
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${
                            step.priority === 'critical'
                              ? 'bg-red-100 text-red-800'
                              : step.priority === 'high'
                                ? 'bg-orange-100 text-orange-800'
                                : step.priority === 'medium'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-slate-100'
                          }`}
                        >
                          {step.priority}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Short-term Actions */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-orange-600 mb-4 flex items-center gap-2">
                <span></span> Short-term Actions (Within 1 Week)
              </h3>
              <div className="space-y-3">
                {recoverySteps
                  .filter((step) => step.category === 'short_term')
                  .map((step) => (
                    <div
                      key={step.id}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        step.completed
                          ? 'bg-green-50 border-green-300'
                          : 'bg-white dark:bg-slate-800 border-orange-300 hover:border-orange-400'
                      }`}
                      onClick={() => setSelectedStep(step)}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleStepCompletion(step.id);
                          }}
                          className={`mt-1 w-6 h-6 rounded border-2 flex items-center justify-center ${
                            step.completed
                              ? 'bg-green-500 border-green-500'
                              : 'border-gray-300 dark:border-slate-600 hover:border-green-500'
                          }`}
                        >
                          {step.completed && (
                            <svg
                              className="w-4 h-4 text-white"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          )}
                        </button>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {step.title}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-slate-300">
                            {step.description}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                            Est. time: {step.estimatedTime}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Long-term Actions */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-yellow-600 mb-4 flex items-center gap-2">
                <span></span> Long-term Actions (Within 1 Month)
              </h3>
              <div className="space-y-3">
                {recoverySteps
                  .filter((step) => step.category === 'long_term')
                  .map((step) => (
                    <div
                      key={step.id}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        step.completed
                          ? 'bg-green-50 border-green-300'
                          : 'bg-white dark:bg-slate-800 border-yellow-300 hover:border-yellow-400'
                      }`}
                      onClick={() => setSelectedStep(step)}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleStepCompletion(step.id);
                          }}
                          className={`mt-1 w-6 h-6 rounded border-2 flex items-center justify-center ${
                            step.completed
                              ? 'bg-green-500 border-green-500'
                              : 'border-gray-300 dark:border-slate-600 hover:border-green-500'
                          }`}
                        >
                          {step.completed && (
                            <svg
                              className="w-4 h-4 text-white"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          )}
                        </button>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {step.title}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-slate-300">
                            {step.description}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                            Est. time: {step.estimatedTime}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Ongoing Actions */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-blue-600 mb-4 flex items-center gap-2">
                <span></span> Ongoing Actions
              </h3>
              <div className="space-y-3">
                {recoverySteps
                  .filter((step) => step.category === 'ongoing')
                  .map((step) => (
                    <div
                      key={step.id}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        step.completed
                          ? 'bg-green-50 border-green-300'
                          : 'bg-white dark:bg-slate-800 border-blue-300 hover:border-blue-400'
                      }`}
                      onClick={() => setSelectedStep(step)}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleStepCompletion(step.id);
                          }}
                          className={`mt-1 w-6 h-6 rounded border-2 flex items-center justify-center ${
                            step.completed
                              ? 'bg-green-500 border-green-500'
                              : 'border-gray-300 dark:border-slate-600 hover:border-green-500'
                          }`}
                        >
                          {step.completed && (
                            <svg
                              className="w-4 h-4 text-white"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          )}
                        </button>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {step.title}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-slate-300">
                            {step.description}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                            Est. time: {step.estimatedTime}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Right Column: Resources & Tracking */}
          <div className="space-y-6">
            {/* Important Contacts */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Important Contacts 
              </h3>
              <div className="space-y-4">
                {importantContacts.map((contact, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-gray-50 dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-700"
                  >
                    <p className="font-semibold text-gray-900 dark:text-white text-sm mb-1">
                      {contact.organization}
                    </p>
                    <a
                      href={`tel:${contact.phone}`}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium block"
                    >
                      {contact.phone}
                    </a>
                    {contact.website !== 'N/A' && (
                      <a
                        href={contact.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-700 text-xs block mt-1"
                      >
                        Visit website →
                      </a>
                    )}
                    <p className="text-xs text-gray-600 dark:text-slate-300 mt-1">
                      {contact.purpose}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">
                      Hours: {contact.hours}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Fraudulent Accounts Tracker */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  Fraudulent Accounts
                </h3>
                <button
                  onClick={() => setShowAddAccount(true)}
                  className="px-3 py-1 bg-red-600 text-white text-sm font-semibold rounded hover:bg-red-700"
                >
                  + Add
                </button>
              </div>
              {fraudulentAccounts.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-slate-400 text-center py-4">
                  No accounts tracked yet
                </p>
              ) : (
                <div className="space-y-3">
                  {fraudulentAccounts.map((account) => (
                    <div
                      key={account.id}
                      className="p-3 bg-gray-50 dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-700"
                    >
                      <p className="font-semibold text-gray-900 dark:text-white text-sm">
                        {account.creditor}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-slate-300">
                        {account.type.replace('_', ' ')} • $
                        {account.amountOwed.toLocaleString()}
                      </p>
                      <span
                        className={`inline-block mt-2 px-2 py-1 rounded text-xs font-semibold ${
                          account.status === 'resolved'
                            ? 'bg-green-100 text-green-800'
                            : account.status === 'investigating'
                              ? 'bg-yellow-100 text-yellow-800'
                              : account.status === 'disputed'
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {account.status.replace('_', ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Documents */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Documents 
              </h3>
              {documents.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-slate-400 text-center py-4">
                  No documents uploaded yet
                </p>
              ) : (
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-3 bg-gray-50 dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-700"
                    >
                      <p className="font-semibold text-gray-900 dark:text-white text-sm">
                        {doc.name}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-slate-300">
                        {doc.type.replace('_', ' ')} •{' '}
                        {new Date(doc.uploadDate).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
              <button className="w-full mt-4 py-2 bg-gray-100 text-gray-700 dark:text-slate-200 font-semibold rounded-lg hover:bg-gray-200 dark:bg-slate-700 transition-colors">
                Upload Document
              </button>
            </div>
          </div>
        </div>

        {/* Step Detail Modal */}
        {selectedStep && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {selectedStep.title}
                </h3>
                <button
                  onClick={() => setSelectedStep(null)}
                  className="text-gray-400 hover:text-gray-600 dark:text-slate-300"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <p className="text-gray-700 dark:text-slate-200 mb-4">{selectedStep.description}</p>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-3 bg-gray-50 dark:bg-slate-900 rounded-lg">
                  <p className="text-xs text-gray-600 dark:text-slate-300">Estimated Time</p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {selectedStep.estimatedTime}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-slate-900 rounded-lg">
                  <p className="text-xs text-gray-600 dark:text-slate-300">Priority</p>
                  <p className="font-semibold text-gray-900 dark:text-white capitalize">
                    {selectedStep.priority}
                  </p>
                </div>
              </div>

              {selectedStep.substeps && selectedStep.substeps.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                    Step-by-Step Instructions
                  </h4>
                  <ol className="space-y-2">
                    {selectedStep.substeps.map((substep, idx) => (
                      <li key={idx} className="flex gap-3">
                        <span className="font-semibold text-gray-600 dark:text-slate-300">
                          {idx + 1}.
                        </span>
                        <span className="text-gray-700 dark:text-slate-200">{substep}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {selectedStep.resources.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                    Resources
                  </h4>
                  <ul className="space-y-1">
                    {selectedStep.resources.map((resource, idx) => (
                      <li key={idx} className="text-sm text-gray-700 dark:text-slate-200">
                        • {resource}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <button
                onClick={() => {
                  toggleStepCompletion(selectedStep.id);
                  setSelectedStep(null);
                }}
                className="w-full py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"
              >
                Mark as {selectedStep.completed ? 'Incomplete' : 'Complete'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
