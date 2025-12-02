'use client';

/**
 * Authorized User Strategy Page
 *
 * Helps users leverage authorized user strategies to build credit quickly.
 * Compares family, friend, and professional tradeline options.
 */

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

interface Strategy {
  id: string;
  type: 'family' | 'friend' | 'professional';
  title: string;
  description: string;
  pros: string[];
  cons: string[];
  requirements: string[];
  expectedImpact: number;
  timeline: string;
  riskLevel: 'low' | 'medium' | 'high';
  cost: string;
  steps: string[];
}

export default function AuthorizedUserPage() {
  const { user, loading: authLoading } = useAuth();
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const strategies: Strategy[] = [
    {
      id: 'family',
      type: 'family',
      title: 'Family Member Strategy',
      description: 'Get added to a family member\'s credit card as an authorized user',
      pros: [
        'Easiest to arrange',
        'Inherit full account history',
        'No credit check required',
        'Can boost score quickly (30-60 days)',
        'Free - no cost',
        'Builds long-term relationship',
      ],
      cons: [
        'Depends on their credit behavior',
        'May strain relationship if misused',
        'Account age must be significant (2+ years)',
        'Their late payments will hurt you',
        'Limited control over account',
      ],
      requirements: [
        'Trustworthy family member with excellent credit (720+)',
        'Account must be at least 2 years old',
        'Low utilization (< 30%)',
        'Perfect payment history (no late payments)',
        'Reports to all 3 credit bureaus',
      ],
      expectedImpact: 40,
      timeline: '1-2 months to see impact',
      riskLevel: 'low',
      cost: 'Free',
      steps: [
        'Identify family member with excellent credit (parent, spouse, sibling)',
        'Have conversation about becoming authorized user',
        'Verify their account age (check statement or call issuer)',
        'Confirm perfect payment history',
        'Verify card reports to all 3 bureaus',
        'Provide your information to primary cardholder',
        'Primary cardholder calls bank to add you',
        'Wait 30-45 days for account to appear on your report',
        'Monitor credit report for changes',
        'Thank them and maintain trust',
      ],
    },
    {
      id: 'friend',
      type: 'friend',
      title: 'Trusted Friend Strategy',
      description: 'Get added to a friend\'s credit card account',
      pros: [
        'Still relatively easy to arrange',
        'No financial obligation',
        'Inherit account history',
        'Can negotiate terms',
        'Free or low cost',
      ],
      cons: [
        'May strain friendship',
        'Less stable than family',
        'Friend may close account',
        'Requires high trust level',
        'Their behavior affects your credit',
      ],
      requirements: [
        'Friend with excellent credit (700+)',
        'Account at least 1 year old',
        'Low utilization',
        'Good payment history',
        'Mutual trust and clear agreement',
      ],
      expectedImpact: 35,
      timeline: '1-2 months to see impact',
      riskLevel: 'medium',
      cost: 'Free - $100 (optional gift)',
      steps: [
        'Choose friend with excellent credit history',
        'Have honest conversation about expectations',
        'Set clear boundaries and agreements',
        'Verify account quality',
        'Get added as authorized user',
        'Monitor account regularly',
        'Maintain open communication',
        'Show appreciation',
      ],
    },
    {
      id: 'professional',
      type: 'professional',
      title: 'Professional Tradeline',
      description: 'Purchase authorized user access from a tradeline company',
      pros: [
        'Guaranteed account quality',
        'Predictable results',
        'No personal relationship risk',
        'Quick setup (1-2 weeks)',
        'Choose specific account characteristics',
        'Professional and reliable',
      ],
      cons: [
        'Costs $200-$800 per tradeline',
        'Temporary boost (typically 60-90 days)',
        'Not recognized by all lenders',
        'Gray area for some scoring models',
        'Multiple tradelines needed for best results',
        'Potential fraud concerns if using wrong company',
      ],
      requirements: [
        'Budget for tradeline purchase ($200-800)',
        'Reputable tradeline company (research reviews)',
        'Clean credit report (no recent defaults)',
        'Specific credit goal (mortgage, auto loan)',
        'Time-sensitive need',
      ],
      expectedImpact: 30,
      timeline: '2-3 weeks to see impact',
      riskLevel: 'medium',
      cost: '$200 - $800 per tradeline',
      steps: [
        'Research reputable tradeline companies (Google reviews)',
        'Compare pricing and account options',
        'Select tradeline matching your needs (age, limit, history)',
        'Purchase and provide required information',
        'Company adds you to cardholder\'s account',
        'Wait 2-3 weeks for reporting cycle',
        'Monitor credit report for account appearance',
        'Use boost for specific credit application',
        'Account typically removed after 60-90 days',
      ],
    },
  ];

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'high': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link href="/credit-builder" className="text-sm text-green-600 hover:text-green-700 mb-2 inline-block">
            ← Back to Credit Builder
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Authorized User Strategy</h1>
          <p className="mt-1 text-sm text-gray-600">
            Leverage others' credit history to build your score faster
          </p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-gradient-to-r from-green-500 to-teal-500 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">⚡</span>
              </div>
              <div>
                <h3 className="font-semibold mb-1">Fast Results</h3>
                <p className="text-sm text-green-100">See score improvements in 1-2 months</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">📈</span>
              </div>
              <div>
                <h3 className="font-semibold mb-1">High Impact</h3>
                <p className="text-sm text-green-100">Average 30-40 point increase</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">🎯</span>
              </div>
              <div>
                <h3 className="font-semibold mb-1">Inherit History</h3>
                <p className="text-sm text-green-100">Get full account history instantly</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* How It Works */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-8 mb-8">
          <div className="flex items-start space-x-4 mb-6">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">How Authorized User Works</h2>
              <p className="text-gray-700 mb-4">
                When you're added as an authorized user on someone's credit card, the entire history of that account
                can appear on your credit report - including the account age, payment history, and credit limit.
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-white rounded-lg p-4 border border-blue-200">
                  <h3 className="font-semibold text-gray-900 mb-2">✅ What You Get</h3>
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li>• Full account history (even before you were added)</li>
                    <li>• Increased total credit limit</li>
                    <li>• Lower overall utilization</li>
                    <li>• Older average account age</li>
                    <li>• Positive payment history</li>
                  </ul>
                </div>
                <div className="bg-white rounded-lg p-4 border border-blue-200">
                  <h3 className="font-semibold text-gray-900 mb-2">⚠️ Important Notes</h3>
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li>• You don't need physical card access</li>
                    <li>• You're not financially responsible</li>
                    <li>• Their behavior affects your credit</li>
                    <li>• Account can be removed anytime</li>
                    <li>• Not all issuers report to all bureaus</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Strategy Comparison */}
        <div className="space-y-6 mb-8">
          {strategies.map((strategy, index) => (
            <div
              key={strategy.id}
              className={`bg-white rounded-xl shadow-sm border-2 transition-all ${
                index === 0 ? 'border-green-500 shadow-lg' : 'border-gray-200'
              }`}
            >
              {index === 0 && (
                <div className="bg-gradient-to-r from-green-500 to-teal-500 text-white px-6 py-2 rounded-t-xl">
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <span className="font-semibold">Recommended</span>
                  </div>
                </div>
              )}

              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-1">{strategy.title}</h3>
                    <p className="text-gray-600">{strategy.description}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-green-600">+{strategy.expectedImpact}</div>
                    <div className="text-sm text-gray-600">points</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-600">Timeline</div>
                    <div className="text-sm font-bold text-gray-900">{strategy.timeline}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-600">Cost</div>
                    <div className="text-sm font-bold text-gray-900">{strategy.cost}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-600">Risk Level</div>
                    <div className={`text-sm font-bold ${getRiskColor(strategy.riskLevel)} px-2 py-1 rounded capitalize inline-block`}>
                      {strategy.riskLevel}
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-600">Impact</div>
                    <div className="text-sm font-bold text-green-600">+{strategy.expectedImpact} pts</div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  {/* Pros */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                      <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Pros
                    </h4>
                    <ul className="space-y-2">
                      {strategy.pros.map((pro, idx) => (
                        <li key={idx} className="flex items-start space-x-2">
                          <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          <span className="text-sm text-gray-700">{pro}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Cons */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                      <svg className="w-5 h-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      Cons
                    </h4>
                    <ul className="space-y-2">
                      {strategy.cons.map((con, idx) => (
                        <li key={idx} className="flex items-start space-x-2">
                          <svg className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                          <span className="text-sm text-gray-700">{con}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Requirements */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <h4 className="font-semibold text-blue-900 mb-3">Requirements</h4>
                  <ul className="space-y-2">
                    {strategy.requirements.map((req, idx) => (
                      <li key={idx} className="flex items-start space-x-2">
                        <svg className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm text-blue-900">{req}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={() => setSelectedStrategy(strategy)}
                  className={`w-full py-3 rounded-lg font-semibold transition-all ${
                    index === 0
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-gray-900 text-white hover:bg-gray-800'
                  }`}
                >
                  View Step-by-Step Guide
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Verification Checklist */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Account Verification Checklist</h2>
          <p className="text-gray-700 mb-6">
            Before being added as an authorized user, verify the account meets these criteria:
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <input type="checkbox" className="mt-1 w-5 h-5 text-green-600" />
                <label className="text-sm text-gray-700">
                  <span className="font-semibold">Account Age:</span> At least 2 years old (older is better)
                </label>
              </div>
              <div className="flex items-start space-x-3">
                <input type="checkbox" className="mt-1 w-5 h-5 text-green-600" />
                <label className="text-sm text-gray-700">
                  <span className="font-semibold">Payment History:</span> Zero late payments ever
                </label>
              </div>
              <div className="flex items-start space-x-3">
                <input type="checkbox" className="mt-1 w-5 h-5 text-green-600" />
                <label className="text-sm text-gray-700">
                  <span className="font-semibold">Credit Utilization:</span> Below 30% (below 10% is ideal)
                </label>
              </div>
              <div className="flex items-start space-x-3">
                <input type="checkbox" className="mt-1 w-5 h-5 text-green-600" />
                <label className="text-sm text-gray-700">
                  <span className="font-semibold">Credit Limit:</span> Higher is better (impacts utilization)
                </label>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <input type="checkbox" className="mt-1 w-5 h-5 text-green-600" />
                <label className="text-sm text-gray-700">
                  <span className="font-semibold">Bureau Reporting:</span> Reports to all 3 bureaus
                </label>
              </div>
              <div className="flex items-start space-x-3">
                <input type="checkbox" className="mt-1 w-5 h-5 text-green-600" />
                <label className="text-sm text-gray-700">
                  <span className="font-semibold">Primary Score:</span> Primary holder has 700+ score
                </label>
              </div>
              <div className="flex items-start space-x-3">
                <input type="checkbox" className="mt-1 w-5 h-5 text-green-600" />
                <label className="text-sm text-gray-700">
                  <span className="font-semibold">Account Status:</span> Active and in good standing
                </label>
              </div>
              <div className="flex items-start space-x-3">
                <input type="checkbox" className="mt-1 w-5 h-5 text-green-600" />
                <label className="text-sm text-gray-700">
                  <span className="font-semibold">Trust Level:</span> Reliable person who pays on time
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Warning Section */}
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6">
          <div className="flex items-start space-x-3">
            <svg className="w-6 h-6 text-red-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <h3 className="font-semibold text-red-900 mb-2">Important Warnings</h3>
              <ul className="space-y-2 text-sm text-red-800">
                <li>• Their late payments will hurt your score just as much as their on-time payments help</li>
                <li>• If they max out the card, your utilization increases</li>
                <li>• They can remove you at any time, potentially hurting your score</li>
                <li>• Some mortgage lenders may not count authorized user accounts</li>
                <li>• Tradeline companies are in a regulatory gray area</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Step-by-Step Modal */}
      {selectedStrategy && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">{selectedStrategy.title}</h2>
              <button
                onClick={() => setSelectedStrategy(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-green-900 mb-2">Step-by-Step Implementation</h3>
                <p className="text-sm text-green-800 mb-4">Follow these steps carefully for best results:</p>

                <ol className="space-y-3">
                  {selectedStrategy.steps.map((step, idx) => (
                    <li key={idx} className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold">
                        {idx + 1}
                      </div>
                      <span className="text-sm text-green-900 pt-0.5">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">Expected Results</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-blue-700 font-medium">Timeline</div>
                    <div className="text-blue-900">{selectedStrategy.timeline}</div>
                  </div>
                  <div>
                    <div className="text-blue-700 font-medium">Score Impact</div>
                    <div className="text-blue-900">+{selectedStrategy.expectedImpact} points</div>
                  </div>
                  <div>
                    <div className="text-blue-700 font-medium">Cost</div>
                    <div className="text-blue-900">{selectedStrategy.cost}</div>
                  </div>
                  <div>
                    <div className="text-blue-700 font-medium">Risk Level</div>
                    <div className={`${getRiskColor(selectedStrategy.riskLevel)} px-2 py-1 rounded capitalize inline-block`}>
                      {selectedStrategy.riskLevel}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
