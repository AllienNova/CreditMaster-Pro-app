'use client';

/**
 * Credit Age Tracker
 *
 * Tracks and optimizes credit account age for score improvements.
 * Provides keep-alive strategies and closure impact calculations.
 */

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

interface Account {
  id: string;
  name: string;
  type: 'credit_card' | 'loan' | 'mortgage';
  openDate: string;
  ageYears: number;
  status: 'open' | 'closed';
  impactIfClosed: number;
}

export default function CreditAgePage() {
  const { user, loading: authLoading } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([
    { id: '1', name: 'Chase Freedom', type: 'credit_card', openDate: '2018-03-15', ageYears: 6.75, status: 'open', impactIfClosed: -25 },
    { id: '2', name: 'Capital One Quicksilver', type: 'credit_card', openDate: '2020-06-20', ageYears: 4.5, status: 'open', impactIfClosed: -12 },
    { id: '3', name: 'Discover it', type: 'credit_card', openDate: '2023-01-10', ageYears: 2, status: 'open', impactIfClosed: -5 },
    { id: '4', name: 'Personal Loan', type: 'loan', openDate: '2021-09-01', ageYears: 3.25, status: 'open', impactIfClosed: -8 },
  ]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const openAccounts = accounts.filter(acc => acc.status === 'open');
  const averageAge = openAccounts.length > 0
    ? openAccounts.reduce((sum, acc) => sum + acc.ageYears, 0) / openAccounts.length
    : 0;
  const oldestAccount = openAccounts.length > 0
    ? Math.max(...openAccounts.map(acc => acc.ageYears))
    : 0;
  const newestAccount = openAccounts.length > 0
    ? Math.min(...openAccounts.map(acc => acc.ageYears))
    : 0;

  const getAgeColor = (years: number) => {
    if (years >= 7) return 'text-green-600';
    if (years >= 3) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getAgeStatus = (years: number) => {
    if (years >= 7) return { label: 'Excellent', color: 'bg-green-100 text-green-700' };
    if (years >= 3) return { label: 'Good', color: 'bg-yellow-100 text-yellow-700' };
    return { label: 'Building', color: 'bg-red-100 text-red-700' };
  };

  const toggleAccountStatus = (id: string) => {
    setAccounts(accounts.map(acc =>
      acc.id === id
        ? { ...acc, status: acc.status === 'open' ? 'closed' : 'open' }
        : acc
    ));
  };

  const calculateProjectedAge = (monthsAhead: number) => {
    const yearsAhead = monthsAhead / 12;
    return averageAge + yearsAhead;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link href="/credit-builder" className="text-sm text-pink-600 hover:text-pink-700 mb-2 inline-block">
            ← Back to Credit Builder
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Credit Age Tracker</h1>
          <p className="mt-1 text-sm text-gray-600">
            Protect and grow your account age for long-term score benefits
          </p>
        </div>
      </div>

      {/* Summary Banner */}
      <div className="bg-gradient-to-r from-pink-500 to-rose-500 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">{averageAge.toFixed(1)} yrs</div>
              <div className="text-sm text-pink-100">Average Account Age</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">{oldestAccount.toFixed(1)} yrs</div>
              <div className="text-sm text-pink-100">Oldest Account</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">{newestAccount.toFixed(1)} yrs</div>
              <div className="text-sm text-pink-100">Newest Account</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Info Section */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-8 mb-8">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Why Credit Age Matters</h2>
              <p className="text-gray-700 mb-4">
                Credit age accounts for 15% of your FICO score. It includes your average account age,
                age of your oldest account, and how recently you opened accounts. Older accounts show
                stability and responsible long-term credit management.
              </p>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg p-4 border border-blue-200">
                  <h3 className="font-semibold text-gray-900 mb-1">Average Account Age</h3>
                  <p className="text-sm text-gray-700">Sum of all ages / number of accounts</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-blue-200">
                  <h3 className="font-semibold text-gray-900 mb-1">Oldest Account</h3>
                  <p className="text-sm text-gray-700">Age of your first credit account</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-blue-200">
                  <h3 className="font-semibold text-gray-900 mb-1">Recent Activity</h3>
                  <p className="text-sm text-gray-700">How recently you opened accounts</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Age Status */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Account Age Status</h2>
            <span className={`px-4 py-2 rounded-full font-semibold ${getAgeStatus(averageAge).color}`}>
              {getAgeStatus(averageAge).label}
            </span>
          </div>

          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">Average Age Progress</span>
              <span className="text-lg font-bold">{averageAge.toFixed(1)} years</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4 relative">
              <div
                className={`h-4 rounded-full transition-all duration-500 ${
                  averageAge >= 7 ? 'bg-green-500' : averageAge >= 3 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${Math.min(100, (averageAge / 10) * 100)}%` }}
              ></div>
              <div className="absolute top-0 left-[30%] w-0.5 h-4 bg-gray-400"></div>
              <div className="absolute top-0 left-[70%] w-0.5 h-4 bg-gray-400"></div>
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>0 yrs</span>
              <span className="text-yellow-600 font-semibold">3 yrs (Good)</span>
              <span className="text-green-600 font-semibold">7 yrs (Excellent)</span>
              <span>10+ yrs</span>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
              <div className="text-sm text-green-900 font-medium mb-1">Oldest Account</div>
              <div className={`text-3xl font-bold ${getAgeColor(oldestAccount)}`}>
                {oldestAccount.toFixed(1)} yrs
              </div>
              <div className="text-xs text-green-700 mt-1">Keep this account open!</div>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg p-4 border border-blue-200">
              <div className="text-sm text-blue-900 font-medium mb-1">Average Age</div>
              <div className={`text-3xl font-bold ${getAgeColor(averageAge)}`}>
                {averageAge.toFixed(1)} yrs
              </div>
              <div className="text-xs text-blue-700 mt-1">Main score factor</div>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200">
              <div className="text-sm text-purple-900 font-medium mb-1">Newest Account</div>
              <div className={`text-3xl font-bold ${getAgeColor(newestAccount)}`}>
                {newestAccount.toFixed(1)} yrs
              </div>
              <div className="text-xs text-purple-700 mt-1">Will age naturally</div>
            </div>
          </div>
        </div>

        {/* Account List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Accounts</h2>

          <div className="space-y-4">
            {accounts.map((account) => {
              const status = getAgeStatus(account.ageYears);
              return (
                <div
                  key={account.id}
                  className={`border-2 rounded-lg p-6 transition-all ${
                    account.status === 'open'
                      ? 'border-gray-200 bg-white'
                      : 'border-red-200 bg-red-50 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl ${
                        account.type === 'credit_card' ? 'bg-blue-100' :
                        account.type === 'loan' ? 'bg-purple-100' :
                        'bg-green-100'
                      }`}>
                        {account.type === 'credit_card' ? '💳' : account.type === 'loan' ? '💰' : '🏠'}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{account.name}</h3>
                        <p className="text-sm text-gray-600 capitalize">
                          {account.type.replace('_', ' ')} • Opened {account.openDate}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-3xl font-bold ${getAgeColor(account.ageYears)}`}>
                        {account.ageYears.toFixed(1)} yrs
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${status.color}`}>
                        {status.label}
                      </span>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs text-gray-600 mb-1">Account Age</div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              account.ageYears >= 7 ? 'bg-green-500' :
                              account.ageYears >= 3 ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`}
                            style={{ width: `${Math.min(100, (account.ageYears / 10) * 100)}%` }}
                          ></div>
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-600 mb-1">Impact if Closed</div>
                        <div className="text-lg font-bold text-red-600">{account.impactIfClosed} points</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      {account.status === 'open' ? (
                        <span className="flex items-center space-x-2">
                          <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span>Account Open</span>
                        </span>
                      ) : (
                        <span className="flex items-center space-x-2 text-red-600">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                          <span>Account Closed</span>
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => toggleAccountStatus(account.id)}
                      className={`px-4 py-2 rounded-lg font-medium text-sm ${
                        account.status === 'open'
                          ? 'bg-red-100 text-red-700 hover:bg-red-200'
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      {account.status === 'open' ? 'Simulate Closure' : 'Reopen'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Future Projection */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Age Projection</h2>

          <div className="space-y-4">
            {[6, 12, 24, 36, 60].map((months) => {
              const projected = calculateProjectedAge(months);
              const status = getAgeStatus(projected);
              return (
                <div key={months} className="flex items-center space-x-4">
                  <div className="w-32 text-sm font-medium text-gray-700">
                    In {months / 12} year{months > 12 ? 's' : ''}
                  </div>
                  <div className="flex-1">
                    <div className="w-full bg-gray-200 rounded-full h-6 relative overflow-hidden">
                      <div
                        className={`h-6 rounded-full transition-all duration-500 flex items-center justify-end pr-3 ${
                          projected >= 7 ? 'bg-green-500' :
                          projected >= 3 ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${Math.min(100, (projected / 10) * 100)}%` }}
                      >
                        <span className="text-xs font-semibold text-white">
                          {projected.toFixed(1)} years
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${status.color}`}>
                    {status.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Keep-Alive Strategies */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Keep-Alive Strategies</h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="border-2 border-green-200 rounded-lg p-6 bg-green-50">
              <h3 className="flex items-center text-lg font-semibold text-gray-900 mb-4">
                <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Do This
              </h3>
              <ul className="space-y-3 text-sm text-gray-700">
                <li className="flex items-start space-x-2">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span><strong>Keep oldest cards open</strong> - Even if you don't use them</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span><strong>Use old cards monthly</strong> - Small purchase + autopay</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span><strong>Become authorized user</strong> - Inherit old account age</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span><strong>Set up autopay</strong> - Prevents accidental closure</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span><strong>Monitor for inactivity fees</strong> - Some cards charge if unused</span>
                </li>
              </ul>
            </div>

            <div className="border-2 border-red-200 rounded-lg p-6 bg-red-50">
              <h3 className="flex items-center text-lg font-semibold text-gray-900 mb-4">
                <svg className="w-5 h-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                Avoid This
              </h3>
              <ul className="space-y-3 text-sm text-gray-700">
                <li className="flex items-start space-x-2">
                  <span className="text-red-600 mt-0.5">✗</span>
                  <span><strong>Closing old accounts</strong> - Hurts average age immediately</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-red-600 mt-0.5">✗</span>
                  <span><strong>Opening many new accounts</strong> - Lowers average age</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-red-600 mt-0.5">✗</span>
                  <span><strong>Letting cards go inactive</strong> - Issuer may close them</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-red-600 mt-0.5">✗</span>
                  <span><strong>Closing after product change</strong> - Keeps the same account age</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-red-600 mt-0.5">✗</span>
                  <span><strong>Ignoring annual fees</strong> - Sometimes worth keeping old cards</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div>
                <h4 className="font-semibold text-blue-900 mb-1">Pro Tip: Product Changes</h4>
                <p className="text-sm text-blue-800">
                  If your oldest card has an annual fee, ask to product change to a no-fee version.
                  This keeps the account open and preserves your credit age without the cost.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
