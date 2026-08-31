/**
 * Credit Repair Dashboard Component
 *
 * Main hub showing:
 * - Credit Repair Score (0-100)
 * - Quick Wins (30-day actions)
 * - Medium-Term Wins (60-90 days)
 * - Long-Term Strategy (6+ months)
 * - AI-powered prioritized action list
 * - Progress tracking
 */

"use client";

import { useState, useEffect } from "react";
import type { CreditRepairScore, QuickWin } from "@/lib/credit-repair";
import { parseScoreFactors, type DisplayFactor } from "./score-factors";

interface CreditRepairDashboardProps {
  userId?: string;
}

export default function CreditRepairDashboard({
  userId,
}: CreditRepairDashboardProps) {
  const [score, setScore] = useState<CreditRepairScore | null>(null);
  const [factors, setFactors] = useState<DisplayFactor[]>([]);
  const [quickWins, setQuickWins] = useState<QuickWin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"quick" | "medium" | "long">(
    "quick",
  );

  useEffect(() => {
    fetchData();
  }, [userId]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch credit repair score
      const scoreResponse = await fetch("/api/credit-repair/score");
      if (!scoreResponse.ok) throw new Error("Failed to fetch score");
      const scoreData = await scoreResponse.json();
      setScore(scoreData.data);
      // The route persists factors as a RECORD and returns the saved row, so
      // what arrives here is not the ScoreFactor[] this component's type
      // claims. Parsed rather than cast — see score-factors.ts.
      setFactors(parseScoreFactors(scoreData.data?.factors));

      // Fetch quick wins
      const quickWinsResponse = await fetch("/api/credit-repair/quick-wins");
      if (!quickWinsResponse.ok) throw new Error("Failed to fetch quick wins");
      const quickWinsData = await quickWinsResponse.json();
      setQuickWins(quickWinsData.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-slate-300">
            Analyzing your credit repair opportunities...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-semibold">Error</h3>
          <p className="text-red-600">{error}</p>
          <button
            onClick={fetchData}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!score) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">No credit repair data available.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-600 rounded-lg p-8 text-white">
        <h1 className="text-3xl font-bold mb-2">Credit Repair Accelerator</h1>
        <p className="text-blue-100">
          Real strategies that actually work - 3-5x faster than traditional
          methods
        </p>
      </div>

      {/* Credit Repair Score */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-4">Your Credit Repair Score</h2>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="relative pt-1">
              <div className="flex mb-2 items-center justify-between">
                <div>
                  <span className="text-5xl font-bold text-blue-600">
                    {score.score}
                  </span>
                  <span className="text-2xl text-gray-500 dark:text-slate-400">
                    /100
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600 dark:text-slate-300">
                    Estimated Impact
                  </div>
                  <div className="text-3xl font-bold text-green-600">
                    +{score.estimatedImpact}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-slate-400">
                    points possible
                  </div>
                </div>
              </div>
              <div className="overflow-hidden h-4 mb-4 text-xs flex rounded bg-gray-200 dark:bg-slate-700">
                <div
                  style={{ width: `${score.score}%` }}
                  className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-gradient-to-r from-blue-500 to-blue-500"
                ></div>
              </div>
            </div>
            <p className="text-gray-600 dark:text-slate-300">
              Timeline to reach your goal:{" "}
              <span className="font-semibold">{score.timeline}</span>
            </p>
          </div>
        </div>

        {/* Score Factors */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {factors.map((factor) => (
            <div
              key={factor.category}
              className="bg-gray-50 dark:bg-slate-900 rounded-lg p-4"
            >
              <div className="text-sm text-gray-600 dark:text-slate-300 capitalize mb-1">
                {factor.category.replace("_", " ")}
              </div>
              <div className="text-2xl font-bold text-gray-800 dark:text-slate-100">
                {Math.round(factor.currentScore)}
              </div>
              {/*
                "+N points possible" used to render here from factor.impact.
                That field is computed by the service but DISCARDED before the
                row is written — the persisted factors are category -> score
                and nothing else — so the number shown was never going to be
                real once the value came back from the database. Removed rather
                than replaced with a guess.
              */}
              <div className="mt-2 h-2 bg-gray-200 dark:bg-slate-700 rounded">
                <div
                  style={{ width: `${factor.currentScore}%` }}
                  className="h-2 bg-blue-500 rounded"
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Tabs */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg">
        <div className="border-b border-gray-200 dark:border-slate-700">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab("quick")}
              className={`px-6 py-4 text-sm font-medium border-b-2 ${activeTab === "quick" ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-slate-200 dark:text-slate-200 hover:border-gray-300 dark:border-slate-600"}`}
            >
              Quick Wins (30 days)
              <span className="ml-2 px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                {quickWins.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab("medium")}
              className={`px-6 py-4 text-sm font-medium border-b-2 ${activeTab === "medium" ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-slate-200 dark:text-slate-200 hover:border-gray-300 dark:border-slate-600"}`}
            >
              Medium-Term (60-90 days)
              <span className="ml-2 px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                {
                  score.opportunities.filter(
                    (o) =>
                      o.timeline.includes("60") || o.timeline.includes("90"),
                  ).length
                }
              </span>
            </button>
            <button
              onClick={() => setActiveTab("long")}
              className={`px-6 py-4 text-sm font-medium border-b-2 ${activeTab === "long" ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-slate-200 dark:text-slate-200 hover:border-gray-300 dark:border-slate-600"}`}
            >
              Long-Term (6+ months)
              <span className="ml-2 px-2 py-1 text-xs bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-slate-100 rounded-full">
                {
                  score.opportunities.filter((o) =>
                    o.timeline.includes("month"),
                  ).length
                }
              </span>
            </button>
          </nav>
        </div>

        {/* Quick Wins Tab */}
        {activeTab === "quick" && (
          <div className="p-6 space-y-4">
            <div className="mb-4">
              <h3 className="text-xl font-bold text-gray-800 dark:text-slate-100">
                Quick Wins - Start Here!
              </h3>
              <p className="text-gray-600 dark:text-slate-300">
                These actions can improve your score in 30 days or less
              </p>
            </div>
            {quickWins.map((win) => (
              <div
                key={win.id}
                className="border border-gray-200 dark:border-slate-700 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="text-lg font-semibold text-gray-800 dark:text-slate-100">
                        {win.title}
                      </h4>
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          win.difficulty === "easy"
                            ? "bg-green-100 text-green-800"
                            : win.difficulty === "medium"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                        }`}
                      >
                        {win.difficulty}
                      </span>
                    </div>
                    <p className="text-gray-600 dark:text-slate-300 mb-3">
                      {win.description}
                    </p>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <span className="text-green-600 font-semibold">
                          +{win.impact} points
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500 dark:text-slate-400">
                          ⏱️ {win.timeline}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500 dark:text-slate-400">
                          ${win.cost}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-blue-600">
                          {win.successRate}% success rate
                        </span>
                      </div>
                    </div>
                    <div className="mt-3">
                      <details className="text-sm">
                        <summary className="cursor-pointer text-blue-600 hover:text-blue-700 font-medium">
                          View Steps
                        </summary>
                        <ol className="mt-2 ml-4 space-y-1 list-decimal text-gray-600 dark:text-slate-300">
                          {win.steps.map((step, idx) => (
                            <li key={idx}>{step}</li>
                          ))}
                        </ol>
                      </details>
                    </div>
                  </div>
                  <button className="ml-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 whitespace-nowrap">
                    Start Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Medium-Term Tab */}
        {activeTab === "medium" && (
          <div className="p-6 space-y-4">
            <div className="mb-4">
              <h3 className="text-xl font-bold text-gray-800 dark:text-slate-100">
                Medium-Term Strategy
              </h3>
              <p className="text-gray-600 dark:text-slate-300">
                Actions that take 60-90 days but have high impact
              </p>
            </div>
            {score.opportunities
              .filter(
                (o) => o.timeline.includes("60") || o.timeline.includes("90"),
              )
              .map((opp) => (
                <div
                  key={opp.id}
                  className="border border-gray-200 dark:border-slate-700 rounded-lg p-4"
                >
                  <h4 className="text-lg font-semibold text-gray-800 dark:text-slate-100 mb-2">
                    {opp.title}
                  </h4>
                  <p className="text-gray-600 dark:text-slate-300 mb-3">
                    {opp.description}
                  </p>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-green-600 font-semibold">
                      +{opp.impact} points
                    </span>
                    <span className="text-gray-500 dark:text-slate-400">
                      ⏱️ {opp.timeline}
                    </span>
                    <span className="text-blue-600">
                      {opp.successRate}% success
                    </span>
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* Long-Term Tab */}
        {activeTab === "long" && (
          <div className="p-6 space-y-4">
            <div className="mb-4">
              <h3 className="text-xl font-bold text-gray-800 dark:text-slate-100">
                Long-Term Building
              </h3>
              <p className="text-gray-600 dark:text-slate-300">
                Use these only after cleaning up your report
              </p>
            </div>
            {score.opportunities
              .filter((o) => o.timeline.includes("month"))
              .map((opp) => (
                <div
                  key={opp.id}
                  className="border border-gray-200 dark:border-slate-700 rounded-lg p-4"
                >
                  <h4 className="text-lg font-semibold text-gray-800 dark:text-slate-100 mb-2">
                    {opp.title}
                  </h4>
                  <p className="text-gray-600 dark:text-slate-300 mb-3">
                    {opp.description}
                  </p>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-green-600 font-semibold">
                      +{opp.impact} points
                    </span>
                    <span className="text-gray-500 dark:text-slate-400">
                      ⏱️ {opp.timeline}
                    </span>
                    <span className="text-gray-500 dark:text-slate-400">
                      ${opp.cost}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
