'use client';

/**
 * Secured Credit Card Page
 *
 * Helps users find the best secured credit cards to build credit.
 * Features include graduation paths, rewards comparison, and AI matching.
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import type { SecuredCard } from '@/lib/credit-builder/credit-builder-service';

export default function SecuredCardPage() {
  const { user, loading: authLoading } = useAuth();
  const [cards, setCards] = useState<SecuredCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState<SecuredCard | null>(null);
  const [depositAmount, setDepositAmount] = useState(200);

  useEffect(() => {
    fetchCards();
  }, []);

  const fetchCards = async () => {
    try {
      const response = await fetch('/api/credit-builder/secured-cards');
      const data = await response.json();
      setCards(data.cards || getMockCards());
    } catch (error) {
      console.error('Error fetching cards:', error);
      setCards(getMockCards());
    } finally {
      setLoading(false);
    }
  };

  const getMockCards = (): SecuredCard[] => [
    {
      id: 'sc-1',
      provider: 'Discover',
      name: 'Discover it® Secured',
      minDeposit: 200,
      maxDeposit: 2500,
      apr: 28.24,
      annualFee: 0,
      rewards: '2% cash back at gas stations and restaurants, 1% on all other purchases',
      graduationPath: true,
      creditLineIncrease: true,
      reporting: ['Experian', 'Equifax', 'TransUnion'],
      benefits: [
        'Cash back rewards',
        'No annual fee',
        'Automatic reviews for upgrade',
        'Free FICO® Score',
      ],
      recommended: true,
      aiReasoning: 'Best overall secured card with rewards and graduation path',
    },
    {
      id: 'sc-2',
      provider: 'Capital One',
      name: 'Secured Mastercard',
      minDeposit: 49,
      maxDeposit: 1000,
      apr: 30.74,
      annualFee: 0,
      graduationPath: true,
      creditLineIncrease: true,
      reporting: ['Experian', 'Equifax', 'TransUnion'],
      benefits: [
        'Low minimum deposit',
        'Potential upgrade to unsecured',
        'CreditWise® monitoring',
        'No annual fee',
      ],
      recommended: true,
      aiReasoning: 'Lowest deposit requirement, ideal for beginners',
    },
  ];

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading secured credit cards...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link href="/credit-builder" className="text-sm text-purple-600 hover:text-purple-700 mb-2 inline-block">
            ← Back to Credit Builder
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Secured Credit Cards</h1>
          <p className="mt-1 text-sm text-gray-600">
            Build credit with minimal deposit - earn rewards while you build
          </p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">💳</span>
              </div>
              <div>
                <h3 className="font-semibold mb-1">Graduation Path</h3>
                <p className="text-sm text-purple-100">Upgrade to unsecured card and get your deposit back</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">🎁</span>
              </div>
              <div>
                <h3 className="font-semibold mb-1">Earn Rewards</h3>
                <p className="text-sm text-purple-100">Get cash back while building your credit score</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">📈</span>
              </div>
              <div>
                <h3 className="font-semibold mb-1">Build Credit Fast</h3>
                <p className="text-sm text-purple-100">See score improvements in as little as 6 months</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Deposit Calculator */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Deposit Calculator</h2>
          <p className="text-gray-600 mb-6">Your deposit becomes your credit limit. Choose an amount you're comfortable with.</p>

          <div className="max-w-2xl">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-gray-700">Security Deposit Amount</span>
              <span className="text-2xl font-bold text-purple-600">${depositAmount}</span>
            </div>
            <input
              type="range"
              min="49"
              max="2500"
              step="50"
              value={depositAmount}
              onChange={(e) => setDepositAmount(parseInt(e.target.value))}
              className="w-full h-2 bg-purple-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span>$49</span>
              <span>$2,500</span>
            </div>
          </div>

          <div className="mt-6 bg-purple-50 rounded-lg p-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-purple-900 font-medium mb-1">Your Credit Limit</div>
                <div className="text-2xl font-bold text-purple-600">${depositAmount}</div>
              </div>
              <div>
                <div className="text-sm text-purple-900 font-medium mb-1">Recommended Usage</div>
                <div className="text-2xl font-bold text-purple-600">${Math.floor(depositAmount * 0.3)}</div>
                <div className="text-xs text-purple-700">Keep below 30% for best score impact</div>
              </div>
            </div>
          </div>
        </div>

        {/* Card Comparison */}
        <div className="space-y-6">
          {cards.map((card) => (
            <div
              key={card.id}
              className={`bg-white rounded-xl shadow-sm border-2 transition-all ${
                card.recommended ? 'border-purple-500 shadow-lg' : 'border-gray-200'
              }`}
            >
              {card.recommended && (
                <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-6 py-2 rounded-t-xl flex items-center space-x-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span className="font-semibold">AI Recommended</span>
                </div>
              )}

              <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-1">{card.provider}</h3>
                    <p className="text-lg text-gray-600">{card.name}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-purple-600">${card.minDeposit}</div>
                    <div className="text-sm text-gray-600">min deposit</div>
                  </div>
                </div>

                {card.aiReasoning && (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
                    <p className="text-sm text-purple-900">{card.aiReasoning}</p>
                  </div>
                )}

                <div className="grid md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-gray-900">${card.minDeposit} - ${card.maxDeposit}</div>
                    <div className="text-sm text-gray-600">Deposit Range</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-gray-900">{card.apr}%</div>
                    <div className="text-sm text-gray-600">APR</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-gray-900">${card.annualFee}</div>
                    <div className="text-sm text-gray-600">Annual Fee</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    {card.graduationPath ? (
                      <div className="text-2xl font-bold text-green-600">✓</div>
                    ) : (
                      <div className="text-2xl font-bold text-gray-400">✗</div>
                    )}
                    <div className="text-sm text-gray-600">Graduation Path</div>
                  </div>
                </div>

                {card.rewards && (
                  <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-4 mb-6">
                    <div className="flex items-start space-x-3">
                      <span className="text-2xl">🎁</span>
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-1">Rewards Program</h4>
                        <p className="text-sm text-gray-700">{card.rewards}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Benefits</h4>
                    <ul className="space-y-2">
                      {card.benefits.map((benefit, idx) => (
                        <li key={idx} className="flex items-start space-x-2">
                          <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span className="text-sm text-gray-700">{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Credit Reporting</h4>
                    <div className="space-y-2">
                      {card.reporting.map((bureau, idx) => (
                        <div key={idx} className="flex items-center space-x-2">
                          <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span className="text-sm text-gray-700">{bureau}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedCard(card)}
                  className={`w-full py-3 rounded-lg font-semibold transition-all ${
                    card.recommended
                      ? 'bg-purple-600 text-white hover:bg-purple-700'
                      : 'bg-gray-900 text-white hover:bg-gray-800'
                  }`}
                >
                  View Details & Apply
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Tips Section */}
        <div className="mt-12 bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Pro Tips for Secured Cards</h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Use It Regularly</h3>
                <p className="text-sm text-gray-600">Make small purchases each month and pay in full to build positive history</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Keep Utilization Low</h3>
                <p className="text-sm text-gray-600">Stay below 30% of your credit limit for maximum score impact</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Pay On Time, Always</h3>
                <p className="text-sm text-gray-600">Set up autopay to never miss a payment and protect your score</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Monitor for Graduation</h3>
                <p className="text-sm text-gray-600">After 6-12 months, you may qualify for an upgrade to unsecured</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedCard && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">{selectedCard.provider} - {selectedCard.name}</h2>
              <button
                onClick={() => setSelectedCard(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6">
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-purple-900 mb-2">How to Apply</h3>
                <ol className="list-decimal list-inside space-y-2 text-sm text-purple-800">
                  <li>Click "Start Application" below</li>
                  <li>Provide personal information</li>
                  <li>Choose your security deposit amount</li>
                  <li>Link your bank account for deposit</li>
                  <li>Submit and wait for approval</li>
                  <li>Fund your account and start building credit</li>
                </ol>
              </div>

              <button className="w-full py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors mb-4">
                Start Application →
              </button>

              <p className="text-xs text-gray-500 text-center">
                This will open {selectedCard.provider}'s secure application page.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
