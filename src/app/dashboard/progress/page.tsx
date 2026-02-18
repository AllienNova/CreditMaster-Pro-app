"use client";

import { Icon } from "@/components/ui/Icon";
import React, { useEffect, useState } from "react";
import Link from "next/link";

interface Milestone {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  date: string | null;
  points: number;
}

interface Achievement {
  id: string;
  title: string;
  icon: string;
  unlocked: boolean;
  description: string;
}

export default function ProgressPage() {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPoints, setTotalPoints] = useState(0);

  useEffect(() => {
    setTimeout(() => {
      const milestonesData = [
        {
          id: "1",
          title: "Upload First Credit Report",
          description: "Get started by uploading your credit report",
          completed: true,
          date: "2024-10-01",
          points: 50,
        },
        {
          id: "2",
          title: "Complete Credit Analysis",
          description: "Let AI analyze your credit report",
          completed: true,
          date: "2024-10-02",
          points: 100,
        },
        {
          id: "3",
          title: "Send First Dispute",
          description: "Submit your first dispute letter",
          completed: true,
          date: "2024-10-15",
          points: 150,
        },
        {
          id: "4",
          title: "First Successful Dispute",
          description: "Get a negative item removed",
          completed: true,
          date: "2024-11-01",
          points: 300,
        },
        {
          id: "5",
          title: "Reach 650 Credit Score",
          description: "Improve your score to 650+",
          completed: true,
          date: "2024-11-15",
          points: 500,
        },
        {
          id: "6",
          title: "Reach 700 Credit Score",
          description: "Achieve a good credit score",
          completed: false,
          date: null,
          points: 750,
        },
        {
          id: "7",
          title: "Remove 5 Negative Items",
          description: "Successfully dispute 5 items",
          completed: false,
          date: null,
          points: 1000,
        },
      ];
      setMilestones(milestonesData);
      setTotalPoints(
        milestonesData
          .filter((m) => m.completed)
          .reduce((sum, m) => sum + m.points, 0),
      );

      setAchievements([
        {
          id: "1",
          title: "First Steps",
          icon: "chart-bar",
          unlocked: true,
          description: "Started your credit repair journey",
        },
        {
          id: "2",
          title: "Dispute Master",
          icon: "chart-bar",
          unlocked: true,
          description: "Sent 3+ dispute letters",
        },
        {
          id: "3",
          title: "Score Climber",
          icon: "document-text",
          unlocked: true,
          description: "Increased score by 50+ points",
        },
        {
          id: "4",
          title: "Consistency King",
          icon: "chart-bar",
          unlocked: false,
          description: "Logged in 30 days in a row",
        },
        {
          id: "5",
          title: "Credit Expert",
          icon: "sparkles",
          unlocked: false,
          description: "Completed all education modules",
        },
        {
          id: "6",
          title: "Perfect Score",
          icon: "chart-bar",
          unlocked: false,
          description: "Reach 800+ credit score",
        },
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  const completedCount = milestones.filter((m) => m.completed).length;
  const progressPercent = (completedCount / milestones.length) * 100;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50 to-blue-50 p-8">
        <div className="animate-pulse space-y-4 max-w-4xl mx-auto">
          <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 dark:bg-slate-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50 to-blue-50">
      <header className="bg-white dark:bg-slate-800/80 backdrop-blur-sm shadow-sm border-b border-white/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link
                href="/dashboard"
                className="text-gray-600 hover:text-gray-900 dark:text-white dark:hover:text-white"
              >
                ← Back
              </Link>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                My Progress
              </h1>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500 dark:text-slate-400">
                Total Points
              </p>
              <p className="text-xl font-bold text-blue-600">
                {totalPoints.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Progress Bar */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
          <div className="flex justify-between items-center mb-2">
            <h2 className="font-semibold text-gray-900 dark:text-white">
              Journey Progress
            </h2>
            <span className="text-sm text-gray-600 dark:text-slate-300">
              {completedCount}/{milestones.length} milestones
            </span>
          </div>
          <div className="h-4 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-600 to-blue-600 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Milestones */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-4">
              Milestones
            </h2>
            <div className="space-y-4">
              {milestones.map((milestone, i) => (
                <div key={milestone.id} className="flex items-start space-x-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      milestone.completed
                        ? "bg-green-100 text-green-600"
                        : "bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-500"
                    }`}
                  >
                    {milestone.completed ? "" : i + 1}
                  </div>
                  <div className="flex-1">
                    <p
                      className={`font-medium ${milestone.completed ? "text-gray-900" : "text-gray-500 dark:text-slate-400"}`}
                    >
                      {milestone.title}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-slate-400">
                      {milestone.description}
                    </p>
                    {milestone.completed && milestone.date && (
                      <p className="text-xs text-green-600 mt-1">
                        Completed{" "}
                        {new Date(milestone.date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <span className="text-sm font-medium text-blue-600">
                    +{milestone.points}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Achievements */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-4">
              Achievements
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {achievements.map((achievement) => (
                <div
                  key={achievement.id}
                  className={`p-4 rounded-lg text-center ${
                    achievement.unlocked
                      ? "bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200"
                      : "bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 opacity-50"
                  }`}
                >
                  <Icon
                    name={achievement.icon}
                    className="text-3xl inline-block"
                  />
                  <p className="font-medium text-gray-900 dark:text-white mt-2">
                    {achievement.title}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                    {achievement.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
