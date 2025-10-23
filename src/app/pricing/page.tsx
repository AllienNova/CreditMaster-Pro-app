'use client'

import React from 'react';
import { pricingTiers } from '@/lib/pricing';

const PricingPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-cyan-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-white/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-600 rounded-lg flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-lg">🤖</span>
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-600 bg-clip-text text-transparent">
                  Agentic Credit Repair
                </h1>
                <p className="text-sm text-gray-500">AI-Agent Powered Platform</p>
              </div>
            </div>
            
            {/* Navigation */}
            <nav className="hidden md:flex items-center space-x-6">
              <a href="/dashboard" className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors">Dashboard</a>
              <a href="/student-loan-agent" className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors">Student Loans</a>
              <a href="/pricing" className="text-sm font-medium text-blue-600 border-b-2 border-blue-600 pb-1">Pricing</a>
            </nav>

            <div className="flex items-center space-x-4">
              <a 
                href="/dashboard"
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-md text-sm font-medium hover:from-blue-700 hover:to-purple-700 transition-all"
              >
                Dashboard
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-600 bg-clip-text text-transparent mb-4">
            Choose Your AI Credit Repair Plan
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Get personalized AI-powered credit repair strategies with transparent pricing and no hidden fees
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {pricingTiers.map((tier, index) => (
            <div 
              key={tier.name} 
              className={`relative bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 transition-all hover:shadow-2xl hover:scale-105 ${
                index === 1 ? 'border-2 border-purple-500 transform scale-105' : 'border border-gray-200'
              }`}
            >
              {index === 1 && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium">
                    Most Popular
                  </span>
                </div>
              )}
              
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{tier.name}</h2>
                <div className="flex items-baseline justify-center">
                  <span className="text-4xl font-bold text-gray-900">${tier.price}</span>
                  <span className="text-lg text-gray-500 ml-1">{tier.priceSuffix}</span>
                </div>
              </div>

              <ul className="space-y-4 mb-8">
                {tier.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    <span className="text-gray-700 text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              <button 
                className={`w-full py-3 px-6 rounded-lg font-medium transition-all ${
                  index === 1 
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 shadow-lg' 
                    : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                }`}
              >
                Get Started
              </button>
            </div>
          ))}
        </div>

        {/* Features Comparison */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-bold text-center mb-8 bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-600 bg-clip-text text-transparent">
            Why Choose Agentic Credit Repair?
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-2xl">🤖</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">AI-Powered Intelligence</h3>
              <p className="text-gray-600 text-sm">
                Advanced machine learning algorithms analyze your credit profile and create personalized repair strategies
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-2xl">🎓</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Student Loan Expertise</h3>
              <p className="text-gray-600 text-sm">
                Specialized AI agents for student loan credit repair with federal system integration
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-2xl">⚡</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">24/7 Automation</h3>
              <p className="text-gray-600 text-sm">
                AI agents work around the clock to monitor, analyze, and improve your credit score
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center mt-16">
          <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-600 rounded-2xl p-8 text-white">
            <h2 className="text-2xl font-bold mb-4">Ready to Transform Your Credit?</h2>
            <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
              Join thousands of users who have improved their credit scores with our AI-powered platform
            </p>
            <a 
              href="/dashboard"
              className="inline-block bg-white text-blue-600 px-8 py-3 rounded-lg font-medium hover:bg-blue-50 transition-colors"
            >
              Start Your Free Trial
            </a>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PricingPage;
