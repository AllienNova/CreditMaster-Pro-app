"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ImpactCalculator } from "@/components/onboarding/ImpactCalculator";
import { useFormValidation } from "@/hooks/useFormValidation";
import { useOnboardingProgress } from "@/hooks/useOnboardingProgress";
import { goalsValidationRules } from "@/lib/validation/onboarding-rules";
import { CheckCircleIcon } from "@heroicons/react/24/solid";
import { EducationalTooltip } from "@/components/onboarding/EducationalTooltip";
import { educationalContent } from "@/lib/onboarding/educational-content";
import { Icon } from '@/components/ui/Icon';

const goals = [
  // Credit Goals
  { id: "buy_home", icon: "home", title: "Buy a Home", description: "Get mortgage-ready with a 740+ score", popular: true, category: "credit" },
  { id: "buy_car", icon: "truck", title: "Buy a Car", description: "Qualify for the best auto loan rates", popular: true, category: "credit" },
  { id: "credit_cards", icon: "credit-card", title: "Get Better Credit Cards", description: "Access premium rewards cards", popular: true, category: "credit" },
  { id: "lower_rates", icon: "credit-card", title: "Lower Interest Rates", description: "Refinance existing debt at better rates", popular: false, category: "credit" },
  { id: "remove_negatives", icon: "trending-down", title: "Remove Negative Items", description: "Clean up errors and outdated info", popular: false, category: "credit" },
  { id: "build_credit", icon: "chart-bar", title: "Build Credit History", description: "Establish or rebuild your credit", popular: false, category: "credit" },
  // Financial Goals (NEW)
  { id: "emergency_fund", icon: "wallet", title: "Build Emergency Fund", description: "Save 3-6 months of expenses", popular: true, category: "savings" },
  { id: "reduce_subscriptions", icon: "scissors", title: "Reduce Subscriptions", description: "Cut unused subscriptions and save money", popular: true, category: "spending" },
  { id: "pay_off_debt", icon: "scissors", title: "Pay Off Debt Faster", description: "Accelerate debt payoff with smart strategies", popular: true, category: "debt" },
  { id: "budget_better", icon: "bolt", title: "Budget Better", description: "Track spending and stick to your budget", popular: false, category: "spending" },
  { id: "start_investing", icon: "trending-up", title: "Start Investing", description: "Build wealth with smart investments", popular: false, category: "investments" },
  { id: "save_for_retirement", icon: "chart-bar", title: "Save for Retirement", description: "Plan for your financial future", popular: false, category: "investments" },
];

const timeframes = [
  { id: "3_months", label: "3 months", description: "Aggressive improvement", recommended: false },
  { id: "6_months", label: "6 months", description: "Steady progress", recommended: true },
  { id: "12_months", label: "12 months", description: "Long-term building", recommended: false },
];

const scoreRanges = [
  { id: "below_580", label: "Below 580", color: "red", description: "Poor" },
  { id: "580_669", label: "580-669", color: "orange", description: "Fair" },
  { id: "670_739", label: "670-739", color: "yellow", description: "Good" },
  { id: "740_799", label: "740-799", color: "emerald", description: "Very Good" },
  { id: "800_plus", label: "800+", color: "blue", description: "Excellent" },
];

const goalCategories = [
  { id: "all", label: "All Goals", icon: "star" },
  { id: "credit", label: "Credit", icon: "chart-bar" },
  { id: "spending", label: "Spending", icon: "banknotes" },
  { id: "savings", label: "Savings", icon: "wallet" },
  { id: "debt", label: "Debt", icon: "credit-card" },
  { id: "investments", label: "Investments", icon: "banknotes" },
];

export default function OnboardingGoalsPage() {
  const router = useRouter();
  const { progress, updateFormData, completeStep, saving } = useOnboardingProgress();

  // Get saved form data
  const savedData = progress.form_data?.step_3 || {};

  const [selectedGoals, setSelectedGoals] = useState<string[]>(savedData.selectedGoals || []);
  const [timeframe, setTimeframe] = useState(savedData.timeframe || "");
  const [currentScore, setCurrentScore] = useState(savedData.currentScore || "");
  const [targetScore, setTargetScore] = useState(savedData.targetScore || "");
  const [activeCategory, setActiveCategory] = useState("all");

  // Form validation
  const { formState, handleChange, validateAll } = useFormValidation(
    goalsValidationRules,
    { selectedGoals, timeframe, currentScore, targetScore }
  );

  // Auto-save form data
  useEffect(() => {
    const formData = { selectedGoals, timeframe, currentScore, targetScore };
    updateFormData(formData);
  }, [selectedGoals, timeframe, currentScore, targetScore, updateFormData]);

  const toggleGoal = (id: string) => {
    const newGoals = selectedGoals.includes(id)
      ? selectedGoals.filter((g) => g !== id)
      : [...selectedGoals, id];
    setSelectedGoals(newGoals);
    handleChange('selectedGoals', newGoals);
  };

  const handleContinue = async () => {
    if (validateAll()) {
      await completeStep(3);
      router.push('/onboarding/connect');
    }
  };

  const showCalculator = currentScore && targetScore && timeframe;

  return (
    <div>
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Set Your Credit Goals</h1>
        <p className="text-gray-600 dark:text-slate-300">Tell us what you want to achieve so we can create your personalized plan</p>
      </div>

      <div className="max-w-4xl mx-auto">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Goals Selection */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">What are your financial goals?</h2>
                <span className="text-sm text-gray-500 dark:text-slate-400">Select all that apply</span>
              </div>

              {/* Category Filter */}
              <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b border-gray-100 dark:border-slate-700">
                {goalCategories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`px-3 py-1.5 text-sm rounded-full flex items-center gap-1.5 transition ${ activeCategory === cat.id ? "bg-emerald-100 text-emerald-700 font-medium" : "bg-gray-100 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:bg-slate-700" }`}
                  >
                    <span>{cat.icon}</span>
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Selected Goals Summary */}
              {selectedGoals.length > 0 && (
                <div className="mb-4 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                  <p className="text-sm text-emerald-700 font-medium mb-2">
                    {selectedGoals.length} goal{selectedGoals.length > 1 ? 's' : ''} selected
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedGoals.map((goalId) => {
                      const goal = goals.find(g => g.id === goalId);
                      return goal ? (
                        <span key={goalId} className="inline-flex items-center gap-1 px-2 py-1 bg-white dark:bg-slate-800 rounded text-xs text-gray-700 dark:text-slate-200">
                          {goal.icon} {goal.title}
                          <button
                            onClick={() => toggleGoal(goalId)}
                            className="ml-1 text-gray-400 dark:text-slate-500 hover:text-red-500"
                          >
                            ×
                          </button>
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-4">
                {goals.filter(g => activeCategory === "all" || g.category === activeCategory).map((goal) => (
                  <button
                    key={goal.id}
                    onClick={() => toggleGoal(goal.id)}
                    className={`relative p-4 rounded-lg border-2 text-left transition hover:shadow-md ${ selectedGoals.includes(goal.id) ? "border-emerald-500 bg-emerald-50" : "border-gray-200 hover:border-gray-300 dark:border-slate-600" }`}
                  >
                    {goal.popular && (
                      <span className="absolute top-2 right-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                        Popular
                      </span>
                    )}
                    <Icon name={goal.icon} className="text-2xl mb-2 inline-block" />
                    <h3 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                      {goal.title}
                      {selectedGoals.includes(goal.id) && (
                        <CheckCircleIcon className="w-5 h-5 text-emerald-500" />
                      )}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-slate-400">{goal.description}</p>
                  </button>
                ))}
              </div>
              {formState.selectedGoals?.error && (
                <p className="text-sm text-red-600 mt-2">{formState.selectedGoals.error}</p>
              )}
            </div>

            {/* Current Score */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">What&apos;s your current credit score range?</h2>
                <EducationalTooltip
                  title={educationalContent.creditScore.title}
                  content={educationalContent.creditScore.content}
                  learnMoreUrl={educationalContent.creditScore.learnMoreUrl}
                />
              </div>
              <div className="flex flex-wrap gap-3">
                {scoreRanges.map((range) => (
                  <button
                    key={range.id}
                    onClick={() => {
                      setCurrentScore(range.id);
                      handleChange('currentScore', range.id);
                    }}
                    className={`px-4 py-3 rounded-lg border-2 transition hover:shadow-md ${ currentScore === range.id ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-gray-200 hover:border-gray-300 dark:border-slate-600" }`}
                  >
                    <div className="font-semibold">{range.label}</div>
                    <div className="text-xs text-gray-500 dark:text-slate-400">{range.description}</div>
                  </button>
                ))}
              </div>
              {formState.currentScore?.error && (
                <p className="text-sm text-red-600 mt-2">{formState.currentScore.error}</p>
              )}
            </div>

            {/* Target Score */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">What score do you want to reach?</h2>
                <EducationalTooltip
                  title={educationalContent.scoreRanges.title}
                  content={educationalContent.scoreRanges.content}
                  learnMoreUrl={educationalContent.scoreRanges.learnMoreUrl}
                />
              </div>
              <div className="flex flex-wrap gap-3">
                {scoreRanges.slice(2).map((range) => (
                  <button
                    key={range.id}
                    onClick={() => {
                      setTargetScore(range.id);
                      handleChange('targetScore', range.id);
                    }}
                    className={`px-4 py-3 rounded-lg border-2 transition hover:shadow-md ${ targetScore === range.id ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-gray-200 hover:border-gray-300 dark:border-slate-600" }`}
                  >
                    <div className="font-semibold">{range.label}</div>
                    <div className="text-xs text-gray-500 dark:text-slate-400">{range.description}</div>
                  </button>
                ))}
              </div>
              {formState.targetScore?.error && (
                <p className="text-sm text-red-600 mt-2">{formState.targetScore.error}</p>
              )}
            </div>

            {/* Timeframe */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">When do you want to achieve this?</h2>
                <EducationalTooltip
                  title={educationalContent.timeframe.title}
                  content={educationalContent.timeframe.content}
                  learnMoreUrl={educationalContent.timeframe.learnMoreUrl}
                />
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                {timeframes.map((tf) => (
                  <button
                    key={tf.id}
                    onClick={() => {
                      setTimeframe(tf.id);
                      handleChange('timeframe', tf.id);
                    }}
                    className={`relative p-4 rounded-lg border-2 text-center transition hover:shadow-md ${ timeframe === tf.id ? "border-emerald-500 bg-emerald-50" : "border-gray-200 hover:border-gray-300 dark:border-slate-600" }`}
                  >
                    {tf.recommended && (
                      <span className="absolute top-2 right-2 text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                        Recommended
                      </span>
                    )}
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{tf.label}</p>
                    <p className="text-sm text-gray-500 dark:text-slate-400">{tf.description}</p>
                  </button>
                ))}
              </div>
              {formState.timeframe?.error && (
                <p className="text-sm text-red-600 mt-2">{formState.timeframe.error}</p>
              )}
            </div>
          </div>

          {/* Right Column - Impact Calculator */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              {showCalculator ? (
                <ImpactCalculator
                  currentScore={currentScore}
                  targetScore={targetScore}
                  timeframe={timeframe}
                  selectedGoals={selectedGoals}
                />
              ) : (
                <div className="bg-gray-50 dark:bg-slate-900 rounded-xl p-6 border-2 border-dashed border-gray-300 dark:border-slate-600 text-center">
                  <div className="text-4xl mb-3"></div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">See Your Impact</h3>
                  <p className="text-sm text-gray-600 dark:text-slate-300">
                    Fill out the form to see your personalized improvement forecast and potential savings
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between mt-8 max-w-4xl mx-auto">
        <Link href="/onboarding/profile" className="px-6 py-3 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-200 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 dark:bg-slate-900 transition">
          ← Back
        </Link>
        <button
          onClick={handleContinue}
          disabled={saving || selectedGoals.length === 0}
          className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-blue-500 text-white rounded-lg hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue to Connect →
        </button>
      </div>

      {saving && (
        <div className="mt-4 text-sm text-gray-500 dark:text-slate-400 flex items-center justify-center gap-2">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Saving your goals...
        </div>
      )}
    </div>
  );
}

