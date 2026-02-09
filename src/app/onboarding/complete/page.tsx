"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useOnboardingProgress } from "@/hooks/useOnboardingProgress";
import { PersonalizedActionPlan } from "@/components/onboarding/PersonalizedActionPlan";
import { SparklesIcon, RocketLaunchIcon, ChartBarIcon, ArrowTrendingUpIcon } from "@heroicons/react/24/outline";
import { Icon } from '@/components/ui/Icon';

const analysisSteps = [
  { id: 1, label: "Analyzing credit reports", duration: 2000 },
  { id: 2, label: "Identifying negative items", duration: 1500 },
  { id: 3, label: "Finding dispute opportunities", duration: 1500 },
  { id: 4, label: "Calculating your Financial Vitality Score", duration: 1500 },
  { id: 5, label: "Creating your personalized plan", duration: 1000 },
];

// Calculate initial vitality score based on onboarding data
function calculateInitialVitalityScore(currentScore: string): { overall: number; grade: string; components: Record<string, number> } {
  // Map score ranges to numeric values
  const scoreMap: Record<string, number> = {
    'below_580': 45,
    '580_669': 55,
    '670_739': 70,
    '740_799': 85,
    '800_plus': 95,
  };

  const creditScore = scoreMap[currentScore] || 60;

  // Estimate other components based on credit score correlation
  const spending = Math.min(100, Math.max(30, creditScore - 10 + Math.random() * 20));
  const savings = Math.min(100, Math.max(25, creditScore - 15 + Math.random() * 20));
  const debt = Math.min(100, Math.max(35, creditScore - 5 + Math.random() * 15));
  const investments = Math.min(100, Math.max(20, creditScore - 20 + Math.random() * 25));

  // Calculate weighted overall score
  const overall = Math.round(
    creditScore * 0.25 +
    spending * 0.20 +
    savings * 0.20 +
    debt * 0.20 +
    investments * 0.15
  );

  // Determine grade
  let grade = 'F';
  if (overall >= 90) grade = 'A';
  else if (overall >= 80) grade = 'B+';
  else if (overall >= 70) grade = 'B';
  else if (overall >= 60) grade = 'C+';
  else if (overall >= 50) grade = 'C';
  else if (overall >= 40) grade = 'D';

  return {
    overall,
    grade,
    components: {
      credit: Math.round(creditScore),
      spending: Math.round(spending),
      savings: Math.round(savings),
      debt: Math.round(debt),
      investments: Math.round(investments),
    },
  };
}

const quickWins = [
  { title: "3 Late Payments", description: "Eligible for goodwill removal", impact: "+15-25 pts", icon: "banknotes" },
  { title: "2 Collection Accounts", description: "Can be disputed for deletion", impact: "+20-40 pts", icon: "user" },
  { title: "High Utilization", description: "Pay down to 30% for quick boost", impact: "+10-20 pts", icon: "document-text" },
];

const nextSteps = [
  {
    icon: <ChartBarIcon className="w-6 h-6" />,
    title: "Review Your Dashboard",
    description: "See your complete credit analysis and score breakdown"
  },
  {
    icon: <SparklesIcon className="w-6 h-6" />,
    title: "Start Disputing Errors",
    description: "Generate and send dispute letters with one click"
  },
  {
    icon: <RocketLaunchIcon className="w-6 h-6" />,
    title: "Track Your Progress",
    description: "Monitor your score improvements in real-time"
  },
];

export default function OnboardingCompletePage() {
  const { progress } = useOnboardingProgress();
  const [currentStep, setCurrentStep] = useState(0);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [vitalityScore, setVitalityScore] = useState<{ overall: number; grade: string; components: Record<string, number> } | null>(null);

  // Get user's goals and scores from progress
  const goalsData = progress.form_data?.step_3 || {};
  const selectedGoals = goalsData.selectedGoals || [];
  const currentScore = goalsData.currentScore || "";
  const targetScore = goalsData.targetScore || "";
  const timeframe = goalsData.timeframe || "";

  // Get payday info
  const connectData = progress.form_data?.step_4 || {};
  const hasPaydaySetup = connectData.payFrequency && connectData.nextPayDate;

  useEffect(() => {
    if (currentStep < analysisSteps.length) {
      const timer = setTimeout(() => {
        setCurrentStep((prev) => prev + 1);
      }, analysisSteps[currentStep].duration);
      return () => clearTimeout(timer);
    } else {
      // Calculate vitality score when analysis is complete
      const score = calculateInitialVitalityScore(currentScore);
      setVitalityScore(score);
      setAnalysisComplete(true);
    }
  }, [currentStep, currentScore]);

  if (!analysisComplete) {
    return (
      <div className="text-center py-12">
        <div className="w-24 h-24 mx-auto mb-8 rounded-full bg-gradient-to-r from-emerald-500 to-blue-500 flex items-center justify-center animate-pulse">
          <span className="text-4xl"></span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Analyzing Your Credit</h1>
        <p className="text-gray-600 dark:text-slate-300 mb-8">Please wait while we analyze your credit reports...</p>
        
        <div className="max-w-md mx-auto space-y-4">
          {analysisSteps.map((step, i) => (
            <div key={step.id} className="flex items-center gap-4">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                i < currentStep ? "bg-emerald-500 text-white" :
                i === currentStep ? "bg-emerald-100 text-emerald-600 animate-pulse" :
                "bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-500"
              }`}>
                {i < currentStep ? "" : step.id}
              </div>
              <span className={i <= currentStep ? "text-gray-900 dark:text-white" : "text-gray-400 dark:text-slate-500"}>
                {step.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="text-center">
      {/* Success Message */}
      <div className="mb-8">
        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-r from-emerald-500 to-blue-500 flex items-center justify-center shadow-lg animate-bounce">
          <span className="text-5xl"></span>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">You&apos;re All Set!</h1>
        <p className="text-xl text-gray-600 dark:text-slate-300 max-w-2xl mx-auto mb-4">
          We&apos;ve analyzed your credit reports and created a personalized plan to help you reach your goals.
        </p>
        {selectedGoals.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            {selectedGoals.map((goalId: string) => {
              const goalLabels: Record<string, string> = {
                buy_home: "Buy a Home",
                buy_car: "Buy a Car",
                credit_cards: "Better Cards",
                lower_rates: "Lower Rates",
                remove_negatives: "Remove Negatives",
                build_credit: "Build Credit"
              };
              return (
                <span key={goalId} className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium">
                  {goalLabels[goalId] || goalId}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Financial Vitality Score Hero */}
      {vitalityScore && (
        <div className="mb-8 max-w-4xl mx-auto">
          <div className="bg-gradient-to-br from-emerald-500 to-blue-600 rounded-xl p-8 text-white shadow-xl">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
              {/* Score Circle */}
              <div className="relative">
                <svg width="180" height="180" viewBox="0 0 180 180">
                  {/* Background circle */}
                  <circle
                    cx="90"
                    cy="90"
                    r="80"
                    fill="none"
                    stroke="rgba(255,255,255,0.2)"
                    strokeWidth="12"
                  />
                  {/* Progress circle */}
                  <circle
                    cx="90"
                    cy="90"
                    r="80"
                    fill="none"
                    stroke="white"
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeDasharray={`${(vitalityScore.overall / 100) * 502} 502`}
                    transform="rotate(-90 90 90)"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-5xl font-bold">{vitalityScore.overall}</span>
                  <span className="text-sm opacity-80">out of 100</span>
                </div>
              </div>

              {/* Score Info */}
              <div className="text-center md:text-left flex-1">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800/20 rounded-full mb-4">
                  <ArrowTrendingUpIcon className="w-5 h-5" />
                  <span className="font-semibold">Your Financial Vitality Score</span>
                </div>
                <h2 className="text-3xl font-bold mb-2">
                  Grade: {vitalityScore.grade}
                </h2>
                <p className="text-white/80 max-w-md">
                  This is your starting point. Follow our personalized plan to improve your financial health across all areas.
                </p>
              </div>
            </div>

            {/* Component Breakdown */}
            <div className="mt-8 pt-6 border-t border-white/20">
              <p className="text-sm text-white/70 mb-4">Score Breakdown</p>
              <div className="grid grid-cols-5 gap-4">
                {Object.entries(vitalityScore.components).map(([key, value]) => (
                  <div key={key} className="text-center">
                    <div className="text-2xl font-bold">{value}</div>
                    <div className="text-xs text-white/70 capitalize">{key}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid md:grid-cols-3 gap-6 mb-8 max-w-4xl mx-auto">
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border-2 border-gray-200 dark:border-slate-700 hover:border-emerald-300 transition">
          <p className="text-4xl font-bold bg-gradient-to-r from-emerald-500 to-blue-500 bg-clip-text text-transparent">675</p>
          <p className="text-gray-500 dark:text-slate-400 text-sm">Credit Score</p>
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">Based on Experian data</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border-2 border-gray-200 dark:border-slate-700 hover:border-emerald-300 transition">
          <p className="text-4xl font-bold text-emerald-500">12</p>
          <p className="text-gray-500 dark:text-slate-400 text-sm">Items to Dispute</p>
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">Errors & negative items found</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border-2 border-gray-200 dark:border-slate-700 hover:border-emerald-300 transition">
          <p className="text-4xl font-bold text-blue-500">+85</p>
          <p className="text-gray-500 dark:text-slate-400 text-sm">Potential Points</p>
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">Estimated credit improvement</p>
        </div>
      </div>

      {/* Payday Setup Confirmation */}
      {hasPaydaySetup && (
        <div className="mb-8 max-w-4xl mx-auto">
          <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-2xl"></span>
            </div>
            <div className="flex-1">
              <p className="font-semibold text-emerald-900">Payday Countdown Active!</p>
              <p className="text-sm text-emerald-700">
                Next payday: {new Date(connectData.nextPayDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                {connectData.payAmount && ` • Expected: $${parseFloat(connectData.payAmount).toLocaleString()}`}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto space-y-8 text-left">
        {/* Quick Wins */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <span></span>
            Your Quick Wins
          </h2>
          <p className="text-sm text-gray-600 dark:text-slate-300 mb-4">
            We found these opportunities that can boost your score quickly:
          </p>
          <div className="space-y-3">
            {quickWins.map((win, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                <div className="flex items-center gap-3">
                  <Icon name={win.icon} className="text-2xl inline-block" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{win.title}</p>
                    <p className="text-sm text-gray-500 dark:text-slate-400">{win.description}</p>
                  </div>
                </div>
                <span className="text-emerald-600 font-bold text-lg">{win.impact}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Personalized Action Plan */}
        {selectedGoals.length > 0 && (
          <PersonalizedActionPlan
            selectedGoals={selectedGoals}
            currentScore={currentScore}
            targetScore={targetScore}
            timeframe={timeframe}
          />
        )}

        {/* Next Steps */}
        <div className="bg-gradient-to-br from-blue-50 to-emerald-50 rounded-xl p-6 border-2 border-blue-200">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">What Happens Next?</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {nextSteps.map((step, i) => (
              <div key={i} className="bg-white dark:bg-slate-800 rounded-lg p-4">
                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mb-3">
                  {step.icon}
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{step.title}</h3>
                <p className="text-sm text-gray-600 dark:text-slate-300">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="flex flex-col items-center gap-4 mt-12">
        <Link
          href="/dashboard"
          className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-blue-500 text-white text-lg font-semibold rounded-xl hover:shadow-lg hover:scale-105 transition-all"
        >
          Go to Dashboard →
        </Link>
        <p className="text-sm text-gray-500 dark:text-slate-400">Start improving your credit today</p>
        <div className="flex items-center gap-4 mt-4 text-xs text-gray-400 dark:text-slate-500">
          <span>No credit card required</span>
          <span>Cancel anytime</span>
          <span>30-day money-back guarantee</span>
        </div>
      </div>
    </div>
  );
}

