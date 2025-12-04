"use client";

import { useState } from "react";
import Link from "next/link";

const goals = [
  { id: "buy_home", icon: "🏠", title: "Buy a Home", description: "Get mortgage-ready with a 740+ score" },
  { id: "buy_car", icon: "🚗", title: "Buy a Car", description: "Qualify for the best auto loan rates" },
  { id: "credit_cards", icon: "💳", title: "Get Better Credit Cards", description: "Access premium rewards cards" },
  { id: "lower_rates", icon: "📉", title: "Lower Interest Rates", description: "Refinance existing debt at better rates" },
  { id: "remove_negatives", icon: "🧹", title: "Remove Negative Items", description: "Clean up errors and outdated info" },
  { id: "build_credit", icon: "📈", title: "Build Credit History", description: "Establish or rebuild your credit" },
];

const timeframes = [
  { id: "3_months", label: "3 months", description: "Aggressive improvement" },
  { id: "6_months", label: "6 months", description: "Steady progress" },
  { id: "12_months", label: "12 months", description: "Long-term building" },
];

const scoreRanges = [
  { id: "below_580", label: "Below 580", color: "red" },
  { id: "580_669", label: "580-669", color: "orange" },
  { id: "670_739", label: "670-739", color: "yellow" },
  { id: "740_799", label: "740-799", color: "emerald" },
  { id: "800_plus", label: "800+", color: "blue" },
];

export default function OnboardingGoalsPage() {
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [timeframe, setTimeframe] = useState("");
  const [currentScore, setCurrentScore] = useState("");
  const [targetScore, setTargetScore] = useState("");

  const toggleGoal = (id: string) => {
    setSelectedGoals((prev) => prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]);
  };

  return (
    <div>
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Set Your Credit Goals</h1>
        <p className="text-gray-600">Tell us what you want to achieve so we can create your personalized plan</p>
      </div>

      <div className="max-w-3xl mx-auto space-y-8">
        {/* Goals Selection */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">What are your credit goals? (Select all that apply)</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {goals.map((goal) => (
              <button
                key={goal.id}
                onClick={() => toggleGoal(goal.id)}
                className={`p-4 rounded-lg border-2 text-left transition ${
                  selectedGoals.includes(goal.id)
                    ? "border-emerald-500 bg-emerald-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <span className="text-2xl mb-2 block">{goal.icon}</span>
                <h3 className="font-medium text-gray-900">{goal.title}</h3>
                <p className="text-sm text-gray-500">{goal.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Current Score */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">What&apos;s your current credit score range?</h2>
          <div className="flex flex-wrap gap-3">
            {scoreRanges.map((range) => (
              <button
                key={range.id}
                onClick={() => setCurrentScore(range.id)}
                className={`px-4 py-2 rounded-lg border-2 transition ${
                  currentScore === range.id
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>

        {/* Target Score */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">What score do you want to reach?</h2>
          <div className="flex flex-wrap gap-3">
            {scoreRanges.slice(2).map((range) => (
              <button
                key={range.id}
                onClick={() => setTargetScore(range.id)}
                className={`px-4 py-2 rounded-lg border-2 transition ${
                  targetScore === range.id
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>

        {/* Timeframe */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">When do you want to achieve this?</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {timeframes.map((tf) => (
              <button
                key={tf.id}
                onClick={() => setTimeframe(tf.id)}
                className={`p-4 rounded-lg border-2 text-center transition ${
                  timeframe === tf.id
                    ? "border-emerald-500 bg-emerald-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <p className="text-xl font-bold text-gray-900">{tf.label}</p>
                <p className="text-sm text-gray-500">{tf.description}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between mt-8 max-w-3xl mx-auto">
        <Link href="/onboarding/profile" className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition">
          ← Back
        </Link>
        <Link href="/onboarding/connect" className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-blue-500 text-white rounded-lg hover:shadow-lg transition">
          Continue →
        </Link>
      </div>
    </div>
  );
}

