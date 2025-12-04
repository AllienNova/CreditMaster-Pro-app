"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const analysisSteps = [
  { id: 1, label: "Analyzing credit reports", duration: 2000 },
  { id: 2, label: "Identifying negative items", duration: 1500 },
  { id: 3, label: "Finding dispute opportunities", duration: 1500 },
  { id: 4, label: "Creating your personalized plan", duration: 1000 },
];

const quickWins = [
  { title: "3 Late Payments", description: "Eligible for goodwill removal", impact: "+15-25 pts" },
  { title: "2 Collection Accounts", description: "Can be disputed for deletion", impact: "+20-40 pts" },
  { title: "High Utilization", description: "Pay down to 30% for quick boost", impact: "+10-20 pts" },
];

export default function OnboardingCompletePage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [analysisComplete, setAnalysisComplete] = useState(false);

  useEffect(() => {
    if (currentStep < analysisSteps.length) {
      const timer = setTimeout(() => {
        setCurrentStep((prev) => prev + 1);
      }, analysisSteps[currentStep].duration);
      return () => clearTimeout(timer);
    } else {
      setAnalysisComplete(true);
    }
  }, [currentStep]);

  if (!analysisComplete) {
    return (
      <div className="text-center py-12">
        <div className="w-24 h-24 mx-auto mb-8 rounded-full bg-gradient-to-r from-emerald-500 to-blue-500 flex items-center justify-center animate-pulse">
          <span className="text-4xl">🔍</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Analyzing Your Credit</h1>
        <p className="text-gray-600 mb-8">Please wait while we analyze your credit reports...</p>
        
        <div className="max-w-md mx-auto space-y-4">
          {analysisSteps.map((step, i) => (
            <div key={step.id} className="flex items-center gap-4">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                i < currentStep ? "bg-emerald-500 text-white" :
                i === currentStep ? "bg-emerald-100 text-emerald-600 animate-pulse" :
                "bg-gray-100 text-gray-400"
              }`}>
                {i < currentStep ? "✓" : step.id}
              </div>
              <span className={i <= currentStep ? "text-gray-900" : "text-gray-400"}>
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
      <div className="mb-12">
        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-r from-emerald-500 to-blue-500 flex items-center justify-center">
          <span className="text-5xl">🎉</span>
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">You&apos;re All Set!</h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          We&apos;ve analyzed your credit reports and created a personalized plan to help you reach your goals.
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid md:grid-cols-3 gap-6 mb-12 max-w-3xl mx-auto">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <p className="text-4xl font-bold bg-gradient-to-r from-emerald-500 to-blue-500 bg-clip-text text-transparent">675</p>
          <p className="text-gray-500">Current Score</p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <p className="text-4xl font-bold text-emerald-500">12</p>
          <p className="text-gray-500">Items to Dispute</p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <p className="text-4xl font-bold text-blue-500">+85</p>
          <p className="text-gray-500">Potential Points</p>
        </div>
      </div>

      {/* Quick Wins */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-12 max-w-3xl mx-auto text-left">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">🎯 Your Quick Wins</h2>
        <div className="space-y-4">
          {quickWins.map((win, i) => (
            <div key={i} className="flex items-center justify-between p-4 bg-emerald-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">{win.title}</p>
                <p className="text-sm text-gray-500">{win.description}</p>
              </div>
              <span className="text-emerald-600 font-bold">{win.impact}</span>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="flex flex-col items-center gap-4">
        <Link
          href="/dashboard"
          className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-blue-500 text-white text-lg font-semibold rounded-xl hover:shadow-lg transition"
        >
          Go to Dashboard →
        </Link>
        <p className="text-sm text-gray-500">Start improving your credit today</p>
      </div>
    </div>
  );
}

