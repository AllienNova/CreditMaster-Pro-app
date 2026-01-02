/**
 * Credit Builder Dashboard
 *
 * Main hub for all credit building tools and recommendations.
 * Shows credit building score, AI-powered recommendations, progress tracking,
 * and quick access to all credit building tools.
 */

import Link from 'next/link';
import { getSupabase } from '@/lib/supabase/client';
import { redirect } from 'next/navigation';
import AICreditRoadmap from '@/components/credit-builder/AICreditRoadmap';

// Force dynamic rendering to prevent build-time prerendering (requires auth)
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Credit Builder | CPFI',
  description: 'Build your credit with AI-powered tools and recommendations',
};

export default async function CreditBuilderDashboard() {
  const supabase = getSupabase();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Credit Builder</h1>
              <p className="mt-1 text-sm text-gray-600">
                Build your credit with AI-powered strategies
              </p>
            </div>
            <Link
              href="/dashboard"
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* AI Credit Building Roadmap */}
        <AICreditRoadmap />
        {/* Credit Builder Score Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Credit Builder Score</h2>
            <span className="text-sm text-gray-500">Updated today</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Score Gauge */}
            <div className="flex flex-col items-center justify-center">
              <div className="relative w-48 h-48">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="96"
                    cy="96"
                    r="88"
                    stroke="#e5e7eb"
                    strokeWidth="12"
                    fill="none"
                  />
                  <circle
                    cx="96"
                    cy="96"
                    r="88"
                    stroke="#3b82f6"
                    strokeWidth="12"
                    fill="none"
                    strokeDasharray={`${(72 / 100) * 553} 553`}
                    strokeLinecap="round"
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-5xl font-bold text-gray-900">72</span>
                  <span className="text-sm text-gray-600">out of 100</span>
                </div>
              </div>
              <div className="mt-4 flex items-center space-x-2">
                <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-medium text-green-600">Trending Up</span>
              </div>
            </div>

            {/* Category Breakdown */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Category Breakdown</h3>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Payment History</span>
                  <span className="text-sm font-bold text-gray-900">85/100</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: '85%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Credit Utilization</span>
                  <span className="text-sm font-bold text-gray-900">65/100</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '65%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Credit Age</span>
                  <span className="text-sm font-bold text-gray-900">60/100</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '60%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Credit Mix</span>
                  <span className="text-sm font-bold text-gray-900">70/100</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '70%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">New Credit</span>
                  <span className="text-sm font-bold text-gray-900">80/100</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: '80%' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Wins Section */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl shadow-sm p-8 mb-8 text-white">
          <h2 className="text-2xl font-bold mb-4">Quick Wins</h2>
          <p className="text-blue-100 mb-6">Easy actions that can boost your score this week</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                    <span className="text-lg">⚡</span>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">Set Up Autopay</h3>
                  <p className="text-sm text-blue-100">Enable automatic payments to never miss a due date</p>
                  <div className="mt-2 flex items-center space-x-2">
                    <span className="text-xs bg-white/20 px-2 py-1 rounded">+15 points</span>
                    <span className="text-xs">1 day</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                    <span className="text-lg">💳</span>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">Pay Down High Balance Card</h3>
                  <p className="text-sm text-blue-100">Reduce your highest utilization card below 30%</p>
                  <div className="mt-2 flex items-center space-x-2">
                    <span className="text-xs bg-white/20 px-2 py-1 rounded">+20 points</span>
                    <span className="text-xs">1 week</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Progress</h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">580</div>
              <div className="text-sm text-gray-600">Starting Score</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">650</div>
              <div className="text-sm text-gray-600">Current Score</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">+70</div>
              <div className="text-sm text-gray-600">Points Gained</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">90</div>
              <div className="text-sm text-gray-600">Days Active</div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Actions Completed</h3>
              <span className="text-sm text-gray-600">8 of 12</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
              <div className="bg-blue-600 h-3 rounded-full" style={{ width: '67%' }}></div>
            </div>
            <p className="text-sm text-gray-600">You're 67% of the way to your target score of 720!</p>
          </div>
        </div>

        {/* Credit Building Tools Grid */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Credit Building Tools</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Credit Builder Loan */}
            <Link
              href="/credit-builder/loan"
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow group"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                  <span className="text-2xl">💰</span>
                </div>
                <svg className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Credit Builder Loan</h3>
              <p className="text-sm text-gray-600 mb-4">Build credit and savings simultaneously</p>
              <div className="flex items-center space-x-2">
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">+25 points</span>
                <span className="text-xs text-gray-500">1 month</span>
              </div>
            </Link>

            {/* Secured Credit Card */}
            <Link
              href="/credit-builder/secured-card"
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow group"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                  <span className="text-2xl">💳</span>
                </div>
                <svg className="w-5 h-5 text-gray-400 group-hover:text-purple-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Secured Credit Card</h3>
              <p className="text-sm text-gray-600 mb-4">Get a credit card with low deposit</p>
              <div className="flex items-center space-x-2">
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">+30 points</span>
                <span className="text-xs text-gray-500">2 weeks</span>
              </div>
            </Link>

            {/* Authorized User */}
            <Link
              href="/credit-builder/authorized-user"
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow group"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
                  <span className="text-2xl">👥</span>
                </div>
                <svg className="w-5 h-5 text-gray-400 group-hover:text-green-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Authorized User</h3>
              <p className="text-sm text-gray-600 mb-4">Inherit credit history from others</p>
              <div className="flex items-center space-x-2">
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">+40 points</span>
                <span className="text-xs text-gray-500">3-6 months</span>
              </div>
            </Link>

            {/* Credit Utilization */}
            <Link
              href="/credit-builder/utilization"
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow group"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center group-hover:bg-yellow-200 transition-colors">
                  <span className="text-2xl">📊</span>
                </div>
                <svg className="w-5 h-5 text-gray-400 group-hover:text-yellow-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Utilization Optimizer</h3>
              <p className="text-sm text-gray-600 mb-4">Optimize credit card balances</p>
              <div className="flex items-center space-x-2">
                <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">High Impact</span>
                <span className="text-xs text-gray-500">Immediate</span>
              </div>
            </Link>

            {/* Payment Optimizer */}
            <Link
              href="/credit-builder/payments"
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow group"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center group-hover:bg-red-200 transition-colors">
                  <span className="text-2xl">💸</span>
                </div>
                <svg className="w-5 h-5 text-gray-400 group-hover:text-red-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Payment Optimizer</h3>
              <p className="text-sm text-gray-600 mb-4">Strategic debt payoff planner</p>
              <div className="flex items-center space-x-2">
                <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">Save Interest</span>
                <span className="text-xs text-gray-500">Ongoing</span>
              </div>
            </Link>

            {/* Credit Mix */}
            <Link
              href="/credit-builder/mix"
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow group"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center group-hover:bg-indigo-200 transition-colors">
                  <span className="text-2xl">🎯</span>
                </div>
                <svg className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Credit Mix Analyzer</h3>
              <p className="text-sm text-gray-600 mb-4">Diversify your credit portfolio</p>
              <div className="flex items-center space-x-2">
                <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded">+15 points</span>
                <span className="text-xs text-gray-500">2-3 months</span>
              </div>
            </Link>

            {/* Credit Age */}
            <Link
              href="/credit-builder/age"
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow group"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center group-hover:bg-pink-200 transition-colors">
                  <span className="text-2xl">⏳</span>
                </div>
                <svg className="w-5 h-5 text-gray-400 group-hover:text-pink-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Credit Age Tracker</h3>
              <p className="text-sm text-gray-600 mb-4">Protect and grow account age</p>
              <div className="flex items-center space-x-2">
                <span className="text-xs bg-pink-100 text-pink-700 px-2 py-1 rounded">Long-term</span>
                <span className="text-xs text-gray-500">Ongoing</span>
              </div>
            </Link>

            {/* Score Simulator */}
            <Link
              href="/credit-builder/score-simulator"
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow group"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center group-hover:bg-cyan-200 transition-colors">
                  <span className="text-2xl">🎮</span>
                </div>
                <svg className="w-5 h-5 text-gray-400 group-hover:text-cyan-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Score Simulator</h3>
              <p className="text-sm text-gray-600 mb-4">See how actions affect your score</p>
              <div className="flex items-center space-x-2">
                <span className="text-xs bg-cyan-100 text-cyan-700 px-2 py-1 rounded">What-If</span>
                <span className="text-xs text-gray-500">Interactive</span>
              </div>
            </Link>

            {/* Goal Tracker */}
            <Link
              href="/credit-builder/goals"
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow group"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center group-hover:bg-orange-200 transition-colors">
                  <span className="text-2xl">🎯</span>
                </div>
                <svg className="w-5 h-5 text-gray-400 group-hover:text-orange-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Goal Tracker</h3>
              <p className="text-sm text-gray-600 mb-4">Set and track credit goals</p>
              <div className="flex items-center space-x-2">
                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">Milestones</span>
                <span className="text-xs text-gray-500">Track Progress</span>
              </div>
            </Link>
          </div>
        </div>

        {/* Success Stories */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Success Timeline</h2>

          <div className="space-y-6">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">Fair Credit Achieved</h3>
                  <span className="text-sm text-gray-500">Oct 15, 2025</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">Reached 600+ credit score</p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">Good Credit (In Progress)</h3>
                  <span className="text-sm text-gray-500">Target: 670+</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">20 points away from good credit</p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-500">Excellent Credit</h3>
                  <span className="text-sm text-gray-500">Target: 740+</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">Future milestone</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
