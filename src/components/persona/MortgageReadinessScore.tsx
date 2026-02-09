'use client';

import { useState } from 'react';
import { CircularProgress, InfoTooltip, ContextualHelp } from '@/components/ui';

interface MortgageReadinessData {
  creditScore: number;
  downPayment: number;
  debtToIncome: number;
  employmentHistory: number; // months
  savings: number;
  targetHomePrice: number;
}

interface ReadinessFactor {
  name: string;
  score: number;
  maxScore: number;
  status: 'excellent' | 'good' | 'fair' | 'poor';
  recommendation: string;
}

export default function MortgageReadinessScore() {
  const [data] = useState<MortgageReadinessData>({
    creditScore: 680,
    downPayment: 25000,
    debtToIncome: 35,
    employmentHistory: 18,
    savings: 30000,
    targetHomePrice: 350000,
  });

  const calculateReadinessFactors = (): ReadinessFactor[] => {
    const factors: ReadinessFactor[] = [];

    // Credit Score (30 points)
    let creditScorePoints = 0;
    let creditStatus: 'excellent' | 'good' | 'fair' | 'poor' = 'poor';
    let creditRec = '';

    if (data.creditScore >= 740) {
      creditScorePoints = 30;
      creditStatus = 'excellent';
      creditRec = 'Your credit score qualifies for the best rates!';
    } else if (data.creditScore >= 700) {
      creditScorePoints = 25;
      creditStatus = 'good';
      creditRec = 'Good score! Improve to 740+ for better rates.';
    } else if (data.creditScore >= 620) {
      creditScorePoints = 15;
      creditStatus = 'fair';
      creditRec = 'Work on improving to 700+ for better options.';
    } else {
      creditScorePoints = 5;
      creditStatus = 'poor';
      creditRec = 'Focus on improving your credit score to 620+.';
    }

    factors.push({
      name: 'Credit Score',
      score: creditScorePoints,
      maxScore: 30,
      status: creditStatus,
      recommendation: creditRec,
    });

    // Down Payment (25 points)
    const downPaymentPercent = (data.downPayment / data.targetHomePrice) * 100;
    let downPaymentPoints = 0;
    let downPaymentStatus: 'excellent' | 'good' | 'fair' | 'poor' = 'poor';
    let downPaymentRec = '';

    if (downPaymentPercent >= 20) {
      downPaymentPoints = 25;
      downPaymentStatus = 'excellent';
      downPaymentRec = 'Excellent! You can avoid PMI.';
    } else if (downPaymentPercent >= 10) {
      downPaymentPoints = 18;
      downPaymentStatus = 'good';
      downPaymentRec = 'Good start! Aim for 20% to avoid PMI.';
    } else if (downPaymentPercent >= 3.5) {
      downPaymentPoints = 10;
      downPaymentStatus = 'fair';
      downPaymentRec = 'Consider FHA loan with 3.5% down.';
    } else {
      downPaymentPoints = 3;
      downPaymentStatus = 'poor';
      downPaymentRec = 'Save more for down payment (aim for 3.5%+).';
    }

    factors.push({
      name: 'Down Payment',
      score: downPaymentPoints,
      maxScore: 25,
      status: downPaymentStatus,
      recommendation: downPaymentRec,
    });

    // Debt-to-Income Ratio (25 points)
    let dtiPoints = 0;
    let dtiStatus: 'excellent' | 'good' | 'fair' | 'poor' = 'poor';
    let dtiRec = '';

    if (data.debtToIncome <= 36) {
      dtiPoints = 25;
      dtiStatus = 'excellent';
      dtiRec = 'Excellent DTI ratio!';
    } else if (data.debtToIncome <= 43) {
      dtiPoints = 18;
      dtiStatus = 'good';
      dtiRec = 'Good DTI. Lower to 36% for better rates.';
    } else if (data.debtToIncome <= 50) {
      dtiPoints = 10;
      dtiStatus = 'fair';
      dtiRec = 'High DTI. Pay down debt to improve.';
    } else {
      dtiPoints = 3;
      dtiStatus = 'poor';
      dtiRec = 'DTI too high. Focus on reducing debt.';
    }

    factors.push({
      name: 'Debt-to-Income Ratio',
      score: dtiPoints,
      maxScore: 25,
      status: dtiStatus,
      recommendation: dtiRec,
    });

    // Employment History (10 points)
    let employmentPoints = 0;
    let employmentStatus: 'excellent' | 'good' | 'fair' | 'poor' = 'poor';
    let employmentRec = '';

    if (data.employmentHistory >= 24) {
      employmentPoints = 10;
      employmentStatus = 'excellent';
      employmentRec = 'Strong employment history!';
    } else if (data.employmentHistory >= 12) {
      employmentPoints = 7;
      employmentStatus = 'good';
      employmentRec = 'Good history. 2+ years is ideal.';
    } else if (data.employmentHistory >= 6) {
      employmentPoints = 4;
      employmentStatus = 'fair';
      employmentRec = 'Build more employment history.';
    } else {
      employmentPoints = 1;
      employmentStatus = 'poor';
      employmentRec = 'Need at least 6 months employment.';
    }

    factors.push({
      name: 'Employment History',
      score: employmentPoints,
      maxScore: 10,
      status: employmentStatus,
      recommendation: employmentRec,
    });

    // Savings/Reserves (10 points)
    const monthlyPayment = (data.targetHomePrice * 0.8 * 0.005); // Rough estimate
    const monthsOfReserves = data.savings / monthlyPayment;
    let savingsPoints = 0;
    let savingsStatus: 'excellent' | 'good' | 'fair' | 'poor' = 'poor';
    let savingsRec = '';

    if (monthsOfReserves >= 6) {
      savingsPoints = 10;
      savingsStatus = 'excellent';
      savingsRec = 'Excellent reserves!';
    } else if (monthsOfReserves >= 3) {
      savingsPoints = 7;
      savingsStatus = 'good';
      savingsRec = 'Good reserves. Aim for 6+ months.';
    } else if (monthsOfReserves >= 1) {
      savingsPoints = 4;
      savingsStatus = 'fair';
      savingsRec = 'Build more savings reserves.';
    } else {
      savingsPoints = 1;
      savingsStatus = 'poor';
      savingsRec = 'Need emergency fund (3-6 months).';
    }

    factors.push({
      name: 'Savings/Reserves',
      score: savingsPoints,
      maxScore: 10,
      status: savingsStatus,
      recommendation: savingsRec,
    });

    return factors;
  };

  const factors = calculateReadinessFactors();
  const totalScore = factors.reduce((sum, f) => sum + f.score, 0);
  const maxScore = factors.reduce((sum, f) => sum + f.maxScore, 0);
  const readinessPercent = (totalScore / maxScore) * 100;

  const getReadinessLevel = () => {
    if (readinessPercent >= 80) return { label: 'Excellent', color: 'text-green-600' };
    if (readinessPercent >= 60) return { label: 'Good', color: 'text-blue-600' };
    if (readinessPercent >= 40) return { label: 'Fair', color: 'text-yellow-600' };
    return { label: 'Needs Work', color: 'text-red-600' };
  };

  const readinessLevel = getReadinessLevel();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent':
        return 'bg-green-100 text-green-800';
      case 'good':
        return 'bg-blue-100 text-blue-800';
      case 'fair':
        return 'bg-yellow-100 text-yellow-800';
      case 'poor':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-slate-100';
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Mortgage Readiness Score</h2>
        <InfoTooltip content="Assess your readiness to apply for a mortgage" />
      </div>

      <ContextualHelp
        title="What is Mortgage Readiness?"
        content="Your mortgage readiness score evaluates key factors lenders consider when approving a home loan, including credit score, down payment, debt-to-income ratio, employment history, and savings."
      />

      {/* Overall Score */}
      <div className="flex flex-col items-center mb-8">
        <CircularProgress progress={readinessPercent} size={180} />
        <div className="mt-6 text-center">
          <div className={`text-4xl font-bold ${readinessLevel.color}`}>
            {Math.round(readinessPercent)}%
          </div>
          <div className="text-xl text-gray-600 dark:text-slate-300 mt-2">{readinessLevel.label}</div>
          <div className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            {totalScore} / {maxScore} points
          </div>
        </div>
      </div>

      {/* Readiness Factors */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Readiness Factors</h3>
        {factors.map((factor) => (
          <div key={factor.name} className="border border-gray-200 dark:border-slate-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-3">
                <h4 className="font-semibold text-gray-900 dark:text-white">{factor.name}</h4>
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(
                    factor.status
                  )}`}
                >
                  {factor.status.charAt(0).toUpperCase() + factor.status.slice(1)}
                </span>
              </div>
              <div className="text-sm font-medium text-gray-600 dark:text-slate-300">
                {factor.score} / {factor.maxScore}
              </div>
            </div>
            <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2 mb-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${(factor.score / factor.maxScore) * 100}%` }}
              />
            </div>
            <p className="text-sm text-gray-600 dark:text-slate-300">{factor.recommendation}</p>
          </div>
        ))}
      </div>

      {/* Action Button */}
      <button
        type="button"
        className="w-full mt-6 bg-blue-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
      >
        Get Personalized Action Plan
      </button>
    </div>
  );
}
