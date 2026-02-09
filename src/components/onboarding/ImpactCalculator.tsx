"use client";

import { useMemo } from "react";
import { SparklesIcon, HomeIcon, CreditCardIcon, BanknotesIcon } from "@heroicons/react/24/outline";

interface ImpactCalculatorProps {
  currentScore: string;
  targetScore: string;
  timeframe: string;
  selectedGoals: string[];
}

const scoreRangeValues: Record<string, number> = {
  "below_580": 550,
  "580_669": 625,
  "670_739": 705,
  "740_799": 770,
  "800_plus": 820,
};

const goalImpacts: Record<string, { icon: React.ReactNode; benefit: string; savings: string }> = {
  buy_home: {
    icon: <HomeIcon className="w-6 h-6" />,
    benefit: "Qualify for better mortgage rates",
    savings: "Save $50,000+ over 30 years"
  },
  buy_car: {
    icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" /></svg>,
    benefit: "Access to prime auto loans",
    savings: "Save $3,000+ on car financing"
  },
  credit_cards: {
    icon: <CreditCardIcon className="w-6 h-6" />,
    benefit: "Unlock premium rewards cards",
    savings: "Earn $500+ in rewards annually"
  },
  lower_rates: {
    icon: <BanknotesIcon className="w-6 h-6" />,
    benefit: "Refinance at lower rates",
    savings: "Save $200+ per month"
  },
  remove_negatives: {
    icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>,
    benefit: "Remove errors & negative items",
    savings: "Boost score by 50-100 points"
  },
  build_credit: {
    icon: <SparklesIcon className="w-6 h-6" />,
    benefit: "Build strong credit foundation",
    savings: "Unlock financial opportunities"
  },
};

export function ImpactCalculator({ currentScore, targetScore, timeframe, selectedGoals }: ImpactCalculatorProps) {
  const calculation = useMemo(() => {
    if (!currentScore || !targetScore || !timeframe) {
      return null;
    }

    const current = scoreRangeValues[currentScore];
    const target = scoreRangeValues[targetScore];
    const pointsToGain = target - current;

    if (pointsToGain <= 0) {
      return null;
    }

    // Calculate monthly improvement needed
    const months = timeframe === "3_months" ? 3 : timeframe === "6_months" ? 6 : 12;
    const monthlyImprovement = Math.round(pointsToGain / months);

    // Calculate feasibility
    const maxMonthlyGain = 15; // Realistic max points per month
    const isFeasible = monthlyImprovement <= maxMonthlyGain;
    const recommendedMonths = isFeasible ? months : Math.ceil(pointsToGain / maxMonthlyGain);

    // Calculate interest savings (rough estimate)
    const interestSavings = Math.round((pointsToGain / 10) * 1000);

    return {
      pointsToGain,
      monthlyImprovement,
      isFeasible,
      recommendedMonths,
      interestSavings,
      current,
      target,
    };
  }, [currentScore, targetScore, timeframe]);

  if (!calculation) {
    return null;
  }

  const { pointsToGain, monthlyImprovement, isFeasible, recommendedMonths, interestSavings } = calculation;

  return (
    <div className="bg-gradient-to-br from-emerald-50 to-blue-50 rounded-xl p-6 border-2 border-emerald-200">
      <div className="flex items-center gap-2 mb-4">
        <SparklesIcon className="w-6 h-6 text-emerald-600" />
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Your Impact Forecast</h3>
      </div>

      {/* Score Improvement */}
      <div className="bg-white dark:bg-slate-800 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600 dark:text-slate-300">Score Improvement Needed</span>
          <span className="text-3xl font-bold text-emerald-600">+{pointsToGain}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500 dark:text-slate-400">Monthly target:</span>
          <span className={`font-semibold ${isFeasible ? 'text-emerald-600' : 'text-orange-600'}`}>
            +{monthlyImprovement} points/month
          </span>
        </div>
      </div>

      {/* Feasibility Alert */}
      {!isFeasible && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-orange-800">
            <strong>Tip:</strong> Your goal is ambitious! We recommend {recommendedMonths} months for sustainable improvement.
          </p>
        </div>
      )}

      {/* Financial Impact */}
      <div className="bg-white dark:bg-slate-800 rounded-lg p-4 mb-4">
        <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Estimated Savings</h4>
        <div className="text-2xl font-bold text-emerald-600 mb-1">
          ${interestSavings.toLocaleString()}+
        </div>
        <p className="text-xs text-gray-600 dark:text-slate-300">in reduced interest over loan lifetime</p>
      </div>

      {/* Goal Benefits */}
      {selectedGoals.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-semibold text-gray-900 dark:text-white text-sm mb-2">What You'll Unlock:</h4>
          {selectedGoals.slice(0, 3).map((goalId) => {
            const impact = goalImpacts[goalId];
            if (!impact) return null;
            
            return (
              <div key={goalId} className="bg-white dark:bg-slate-800 rounded-lg p-3 flex items-start gap-3">
                <div className="text-emerald-600 flex-shrink-0 mt-0.5">
                  {impact.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{impact.benefit}</p>
                  <p className="text-xs text-emerald-600">{impact.savings}</p>
                </div>
              </div>
            );
          })}
          {selectedGoals.length > 3 && (
            <p className="text-xs text-gray-500 dark:text-slate-400 text-center">
              +{selectedGoals.length - 3} more benefits
            </p>
          )}
        </div>
      )}
    </div>
  );
}

