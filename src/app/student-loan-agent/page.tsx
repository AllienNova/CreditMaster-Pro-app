"use client";

import React from 'react';
import { StudentLoanOnboarding } from '@/components/student-loan-agent/StudentLoanOnboarding';
import { StrategyDashboard } from '@/components/student-loan-agent/StrategyDashboard';
import { FederalRegulationEngine } from '@/lib/student-loan-agent/FederalRegulationEngine';
import { StrategyEngine } from '@/lib/student-loan-agent/StrategyEngine';
import type { OnboardingAnalysis, StrategySummary } from '@/types/student-loan-agent';

const StudentLoanAgentPage = () => {
  const [onboardingComplete, setOnboardingComplete] = React.useState(false);
  const [strategies, setStrategies] = React.useState<StrategySummary[]>([]);

  const summarizeRegulation = (
    regulation?: ReturnType<FederalRegulationEngine['getRegulation']>
  ): StrategySummary['regulation'] => {
    if (!regulation) {
      return {
        name: 'General Guidance',
        summary: 'No specific regulation reference provided.',
      };
    }

    return {
      name: regulation.name,
      summary: regulation.description,
      key_provisions: regulation.key_provisions,
      eligibility: regulation.eligibility,
      requirements: regulation.requirements,
      protections: regulation.protections,
    };
  };

  const handleOnboardingComplete = (analysis: OnboardingAnalysis) => {
    const regulationEngine = new FederalRegulationEngine();
    const strategyEngine = new StrategyEngine(regulationEngine);
    const generatedStrategies = strategyEngine.generateStrategies(analysis).map<StrategySummary>((strategy) => ({
      name: strategy.name,
      description: strategy.description,
      regulation: summarizeRegulation(strategy.regulation),
      priority: strategy.priority,
      complexity: strategy.complexity,
    }));
    setStrategies(generatedStrategies);
    setOnboardingComplete(true);
  };

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
              <a href="/student-loan-agent" className="text-sm font-medium text-blue-600 border-b-2 border-blue-600 pb-1">Student Loans</a>
              <a href="/pricing" className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors">Pricing</a>
            </nav>

            <div className="flex items-center space-x-4">
              <a 
                href="/dashboard"
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                Back to Dashboard
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <span className="text-4xl mr-3">🎓</span>
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-600 bg-clip-text text-transparent">
              Student Loan AI Agent
            </h1>
          </div>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Specialized AI-powered assistance for student loan credit repair with federal system integration
          </p>
        </div>

        {/* Content */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden">
          {!onboardingComplete ? (
            <div className="p-6 sm:p-8">
              <StudentLoanOnboarding onOnboardingComplete={handleOnboardingComplete} />
            </div>
          ) : (
            <div className="p-6 sm:p-8">
              <StrategyDashboard strategies={strategies} />
            </div>
          )}
        </div>

        {/* Features Section */}
        {!onboardingComplete && (
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 text-center shadow-lg">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-xl">🔍</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Federal Integration</h3>
              <p className="text-gray-600 text-sm">
                Direct integration with NSLDS and FSA systems for comprehensive loan analysis
              </p>
            </div>
            
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 text-center shadow-lg">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-xl">⚖️</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Regulation Engine</h3>
              <p className="text-gray-600 text-sm">
                Advanced knowledge of FCRA, HEA, and CFPB regulations for maximum compliance
              </p>
            </div>
            
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 text-center shadow-lg">
              <div className="w-12 h-12 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-xl">🎯</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Smart Strategies</h3>
              <p className="text-gray-600 text-sm">
                AI-generated personalized strategies based on your specific loan portfolio
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default StudentLoanAgentPage;
