/**
 * Credit Building Component
 * 
 * Long-term credit building strategies (LAST RESORT):
 * - Use ONLY after cleaning up your report
 * - Secured cards, credit builder loans, authorized user
 * - 6-12 month timeline
 * - 20-40 point impact
 * 
 * NOTE: These are the strategies Credit Karma pushes, but they should
 * be used LAST, not first!
 */

'use client';

import { useState } from 'react';

interface BuildingStrategy {
  id: string;
  name: string;
  description: string;
  pros: string[];
  cons: string[];
  cost: string;
  timeline: string;
  impact: string;
  difficulty: 'easy' | 'medium' | 'hard';
  recommended: boolean;
}

export default function CreditBuilding() {
  const [selectedStrategy, setSelectedStrategy] = useState<string | null>(null);

  const strategies: BuildingStrategy[] = [
    {
      id: 'secured_card',
      name: 'Secured Credit Card',
      description: 'A credit card that requires a security deposit. Your deposit becomes your credit limit.',
      pros: [
        'Easiest to get approved',
        'Builds payment history',
        'Can graduate to unsecured card',
        'Reports to all 3 bureaus',
      ],
      cons: [
        'Requires deposit ($200-500)',
        'Often has annual fees',
        'Low credit limit',
        'Takes 6-12 months to see impact',
      ],
      cost: '$200-500 deposit + $25-50/year fee',
      timeline: '6-12 months',
      impact: '+20-40 points',
      difficulty: 'easy',
      recommended: true,
    },
    {
      id: 'credit_builder_loan',
      name: 'Credit Builder Loan',
      description: 'A small loan where the money is held in an account while you make payments.',
      pros: [
        'Builds payment history',
        'Adds installment loan to mix',
        'Get money back at end',
        'No credit check needed',
      ],
      cons: [
        'Expensive fees ($100-200)',
        'Money is locked up',
        'Takes 12-24 months',
        'Slow results',
      ],
      cost: '$100-200 in fees',
      timeline: '12-24 months',
      impact: '+15-30 points',
      difficulty: 'medium',
      recommended: false,
    },
    {
      id: 'authorized_user',
      name: 'Authorized User',
      description: 'Get added to someone else\'s credit card account to benefit from their good history.',
      pros: [
        'Instant credit history',
        'No cost (usually)',
        'Can boost score quickly',
        'No responsibility for payments',
      ],
      cons: [
        'Depends on primary cardholder',
        'Their bad behavior hurts you',
        'Can be removed anytime',
        'Some lenders ignore it',
      ],
      cost: 'Free (if family/friend)',
      timeline: '1-2 months',
      impact: '+30-60 points',
      difficulty: 'easy',
      recommended: true,
    },
    {
      id: 'rent_reporting',
      name: 'Rent Reporting',
      description: 'Services that report your rent payments to credit bureaus.',
      pros: [
        'Uses existing payments',
        'Builds payment history',
        'No new debt needed',
        'Relatively affordable',
      ],
      cons: [
        'Costs $50-100/year',
        'Not all bureaus accept',
        'Slow to show impact',
        'Landlord must cooperate',
      ],
      cost: '$50-100/year',
      timeline: '3-6 months',
      impact: '+10-30 points',
      difficulty: 'medium',
      recommended: true,
    },
    {
      id: 'self_lender',
      name: 'Self Lender / Credit Strong',
      description: 'Specialized credit builder accounts that report to all 3 bureaus.',
      pros: [
        'Reports to all 3 bureaus',
        'Flexible payment options',
        'Get money back',
        'No credit check',
      ],
      cons: [
        'High fees (15-20% APR)',
        'Money locked for 1-2 years',
        'Better alternatives exist',
        'Slow results',
      ],
      cost: '$500-1,000 + fees',
      timeline: '12-24 months',
      impact: '+20-40 points',
      difficulty: 'medium',
      recommended: false,
    },
  ];

  const selected = strategies.find(s => s.id === selectedStrategy);

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-700 to-gray-900 rounded-lg p-8 text-white mb-6">
        <h1 className="text-3xl font-bold mb-2">Credit Building (Last Resort)</h1>
        <p className="text-gray-300">
          Use these strategies ONLY after cleaning up your credit report
        </p>
      </div>

      {/* Warning */}
      <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-6 mb-6">
        <h3 className="font-bold text-yellow-900 mb-3 text-lg flex items-center gap-2">
          ⚠️ IMPORTANT: Do This LAST, Not First!
        </h3>
        <div className="space-y-2 text-sm text-yellow-800">
          <p className="font-semibold">
            Credit Karma pushes these strategies because they make money from them. But they're the SLOWEST and most EXPENSIVE way to improve your credit.
          </p>
          <div className="mt-3 p-3 bg-white rounded">
            <div className="font-semibold text-gray-800 mb-2">Do This First (30-90 days):</div>
            <ol className="list-decimal list-inside space-y-1 text-gray-700">
              <li>Dispute inaccurate items (50-150 points)</li>
              <li>Pay down high utilization (20-50 points)</li>
              <li>Remove collections via pay-for-delete (50-100 points)</li>
              <li>Send goodwill letters (10-30 points per late payment)</li>
              <li>Optimize payment timing (10-20 points)</li>
            </ol>
          </div>
          <div className="mt-3 p-3 bg-white rounded">
            <div className="font-semibold text-gray-800 mb-2">Then Do This (6-12 months):</div>
            <p className="text-gray-700">
              Once your report is clean, use these building strategies to maintain and slowly grow your score.
            </p>
          </div>
        </div>
      </div>

      {/* Strategies Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {strategies.map((strategy) => (
          <div
            key={strategy.id}
            onClick={() => setSelectedStrategy(strategy.id)}
            className={`cursor-pointer border-2 rounded-lg p-4 transition-all ${
              selectedStrategy === strategy.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            } ${!strategy.recommended ? 'opacity-75' : ''}`}
          >
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-bold text-gray-800">{strategy.name}</h3>
              {strategy.recommended && (
                <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                  Recommended
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600 mb-3">{strategy.description}</p>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Impact:</span>
                <span className="font-semibold text-green-600">{strategy.impact}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Timeline:</span>
                <span className="font-semibold text-gray-700">{strategy.timeline}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Cost:</span>
                <span className="font-semibold text-gray-700">{strategy.cost}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Selected Strategy Details */}
      {selected && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-start justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-800">{selected.name}</h2>
            <span className={`px-3 py-1 text-sm rounded-full ${
              selected.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
              selected.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              {selected.difficulty}
            </span>
          </div>

          <p className="text-gray-600 mb-6">{selected.description}</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Pros */}
            <div>
              <h3 className="font-semibold text-green-800 mb-3">✅ Pros</h3>
              <ul className="space-y-2">
                {selected.pros.map((pro, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-green-600 mt-0.5">•</span>
                    <span>{pro}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Cons */}
            <div>
              <h3 className="font-semibold text-red-800 mb-3">❌ Cons</h3>
              <ul className="space-y-2">
                {selected.cons.map((con, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-red-600 mt-0.5">•</span>
                    <span>{con}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="text-sm text-gray-600 mb-1">Expected Impact</div>
              <div className="text-xl font-bold text-green-600">{selected.impact}</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-600 mb-1">Timeline</div>
              <div className="text-xl font-bold text-gray-800">{selected.timeline}</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-600 mb-1">Total Cost</div>
              <div className="text-xl font-bold text-gray-800">{selected.cost}</div>
            </div>
          </div>

          {/* Recommendation */}
          {!selected.recommended && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">
                <strong>Not Recommended:</strong> This strategy is expensive and slow. Consider other options first.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Comparison */}
      <div className="mt-6 bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-4">Strategy Comparison</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-2 px-3">Strategy</th>
                <th className="text-center py-2 px-3">Impact</th>
                <th className="text-center py-2 px-3">Timeline</th>
                <th className="text-center py-2 px-3">Cost</th>
                <th className="text-center py-2 px-3">Difficulty</th>
              </tr>
            </thead>
            <tbody>
              {strategies.map((strategy) => (
                <tr key={strategy.id} className="border-b border-gray-100">
                  <td className="py-3 px-3 font-medium">{strategy.name}</td>
                  <td className="py-3 px-3 text-center text-green-600 font-semibold">{strategy.impact}</td>
                  <td className="py-3 px-3 text-center">{strategy.timeline}</td>
                  <td className="py-3 px-3 text-center">{strategy.cost}</td>
                  <td className="py-3 px-3 text-center">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      strategy.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                      strategy.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {strategy.difficulty}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Final Reminder */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-800 mb-2">💡 Remember:</h3>
        <p className="text-sm text-blue-700">
          These strategies are for <strong>building</strong> credit, not <strong>repairing</strong> it. 
          If you have negative items on your report, focus on removing those first. You'll see results 
          3-5x faster and save hundreds of dollars.
        </p>
      </div>
    </div>
  );
}

