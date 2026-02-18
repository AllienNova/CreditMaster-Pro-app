"use client";

import { Icon } from "@/components/ui/Icon";
/**
 * Goal Tracker Page
 *
 * Set and track credit improvement goals with milestones and achievements.
 */

import { useState } from "react";
import Link from "next/link";
import {
  GOAL_TEMPLATES,
  CreditGoal,
  GoalTemplate,
  goalTrackerService,
} from "@/lib/credit-builder/goal-tracker-service";

// Mock active goals - in production, this comes from the database
const MOCK_ACTIVE_GOALS: CreditGoal[] = [
  {
    id: "goal_1",
    userId: "user_1",
    title: "Reach Good Credit (670+)",
    description: "Achieve Good credit standing",
    targetScore: 670,
    startScore: 590,
    currentScore: 635,
    category: "score",
    status: "active",
    targetDate: new Date("2025-06-01"),
    createdAt: new Date("2025-01-01"),
    progress: 56,
    milestones: [
      {
        id: "m1",
        title: "Foundation",
        description: "Establish payment history",
        targetValue: 6,
        currentValue: 6,
        completed: true,
        completedAt: new Date("2025-02-15"),
        icon: "building",
      },
      {
        id: "m2",
        title: "Low Utilization",
        description: "Under 30%",
        targetValue: 30,
        currentValue: 28,
        completed: true,
        completedAt: new Date("2025-03-01"),
        icon: "trending-down",
      },
      {
        id: "m3",
        title: "Clean Up",
        description: "Dispute errors",
        targetValue: 1,
        currentValue: 0,
        completed: false,
        icon: "sparkles",
      },
      {
        id: "m4",
        title: "Diversify",
        description: "Credit mix",
        targetValue: 3,
        currentValue: 2,
        completed: false,
        icon: "puzzle-piece",
      },
      {
        id: "m5",
        title: "Goal Achieved!",
        description: "Reach 670+",
        targetValue: 670,
        currentValue: 635,
        completed: false,
        icon: "target",
      },
    ],
  },
];

export default function GoalsPage() {
  const [activeGoals, setActiveGoals] =
    useState<CreditGoal[]>(MOCK_ACTIVE_GOALS);
  const [showTemplates, setShowTemplates] = useState(false);
  const currentScore = 635; // Mock current score

  const createGoal = (template: GoalTemplate) => {
    const newGoal = goalTrackerService.createGoalFromTemplate(
      "user_1",
      template.id,
      currentScore,
    );
    setActiveGoals((prev) => [...prev, newGoal]);
    setShowTemplates(false);
  };

  const getDaysRemaining = (targetDate: Date) => {
    const now = new Date();
    const diff = targetDate.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 75) return "bg-green-500";
    if (progress >= 50) return "bg-blue-500";
    if (progress >= 25) return "bg-yellow-500";
    return "bg-gray-400";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Goal Tracker
              </h1>
              <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">
                Set goals and track your credit improvement journey
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowTemplates(!showTemplates)}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                + New Goal
              </button>
              <Link
                href="/credit-builder"
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-slate-200 bg-white border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 dark:bg-slate-900"
              >
                Back
              </Link>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              label: "Active Goals",
              value: activeGoals.filter((g) => g.status === "active").length,
              icon: "sparkles",
            },
            {
              label: "Completed",
              value: activeGoals.filter((g) => g.status === "completed").length,
              icon: "sparkles",
            },
            { label: "Points Gained", value: "+45", icon: "sparkles" },
            { label: "Current Streak", value: "12 days", icon: "sparkles" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-4 text-center"
            >
              <Icon name={stat.icon} className="text-2xl inline-block" />
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                {stat.value}
              </p>
              <p className="text-sm text-gray-500 dark:text-slate-400">
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        {/* Goal Templates Modal */}
        {showTemplates && (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Choose a Goal
              </h2>
              <button
                type="button"
                onClick={() => setShowTemplates(false)}
                className="text-gray-400 hover:text-gray-600 dark:text-slate-300"
              ></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {GOAL_TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => createGoal(template)}
                  className="p-4 border-2 border-gray-200 dark:border-slate-700 rounded-lg text-left hover:border-blue-500 hover:bg-blue-50 transition-all"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Icon
                      name={template.icon}
                      className="text-3xl inline-block"
                    />
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {template.title}
                      </h3>
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${
                          template.difficulty === "beginner"
                            ? "bg-green-100 text-green-700"
                            : template.difficulty === "intermediate"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-red-100 text-red-700"
                        }`}
                      >
                        {template.difficulty}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-slate-400 mb-2">
                    {template.description}
                  </p>
                  <div className="flex justify-between text-xs text-gray-400 dark:text-slate-500">
                    <span>+{template.targetScoreIncrease} pts</span>
                    <span>{template.suggestedTimeframeDays} days</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Active Goals */}
        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Your Goals
          </h2>
          {activeGoals.map((goal) => (
            <div
              key={goal.id}
              className="bg-white dark:bg-slate-800 rounded-xl shadow-lg overflow-hidden"
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                      {goal.title}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-slate-400">
                      {goal.description}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-600">
                      {goal.currentScore}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">
                      / {goal.targetScore} target
                    </p>
                  </div>
                </div>
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600 dark:text-slate-300">
                      Progress
                    </span>
                    <span className="font-medium">{goal.progress}%</span>
                  </div>
                  <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${getProgressColor(goal.progress)} transition-all`}
                      style={{ width: `${goal.progress}%` }}
                    />
                  </div>
                </div>
                <div className="flex justify-between text-sm text-gray-500 dark:text-slate-400">
                  <span>Started: {goal.createdAt.toLocaleDateString()}</span>
                  <span>
                    {getDaysRemaining(goal.targetDate)} days remaining
                  </span>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-slate-900 px-6 py-4">
                <h4 className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-3">
                  Milestones
                </h4>
                <div className="flex items-center gap-2 overflow-x-auto pb-2">
                  {goal.milestones.map((milestone, i) => (
                    <div
                      key={milestone.id}
                      className={`flex-shrink-0 w-20 text-center p-2 rounded-lg ${
                        milestone.completed
                          ? "bg-green-100"
                          : "bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700"
                      }`}
                    >
                      <span className="text-xl">{milestone.icon}</span>
                      <p
                        className="text-xs mt-1 truncate"
                        title={milestone.title}
                      >
                        {milestone.title}
                      </p>
                      {milestone.completed && (
                        <span className="text-xs text-green-600"></span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
