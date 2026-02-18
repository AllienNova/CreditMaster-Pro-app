"use client";

/**
 * Gamified Dashboard Component
 * Main dashboard showing XP, level, badges, quests, and streaks
 */

import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { ProgressRing } from "./ProgressRing";
import { BadgeCard } from "./BadgeCard";
import { XpBar } from "./XpBar";
import { StreakDisplay } from "./StreakDisplay";
import { QuestCard } from "./QuestCard";
import type {
  GamificationProgressResponse,
  BadgeDefinition,
  DailyQuest,
} from "@/lib/gamification";

interface GamifiedDashboardProps {
  className?: string;
}

export function GamifiedDashboard({ className }: GamifiedDashboardProps) {
  const [progress, setProgress] = useState<GamificationProgressResponse | null>(
    null,
  );
  const [badges, setBadges] = useState<{
    earned: BadgeDefinition[];
    inProgress: BadgeDefinition[];
  }>({ earned: [], inProgress: [] });
  const [quests, setQuests] = useState<{
    quests: DailyQuest[];
    progress: Record<string, number>;
  }>({ quests: [], progress: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [progressRes, badgesRes, questsRes] = await Promise.all([
        fetch("/api/gamification/progress"),
        fetch("/api/gamification/badges"),
        fetch("/api/gamification/quests"),
      ]);

      if (progressRes.ok) {
        const progressData = await progressRes.json();
        setProgress(progressData);
      }

      if (badgesRes.ok) {
        const badgesData = await badgesRes.json();
        setBadges({
          earned:
            badgesData.earned?.map(
              (b: { badge: BadgeDefinition }) => b.badge,
            ) ?? [],
          inProgress:
            badgesData.inProgress?.map(
              (b: { badge: BadgeDefinition }) => b.badge,
            ) ?? [],
        });
      }

      if (questsRes.ok) {
        const questsData = await questsRes.json();
        setQuests({
          quests:
            questsData.today?.map((q: { quest: DailyQuest }) => q.quest) ?? [],
          progress:
            questsData.today?.reduce(
              (
                acc: Record<string, number>,
                q: { questId: string; isCompleted: boolean },
              ) => {
                acc[q.questId] = q.isCompleted ? 100 : 0;
                return acc;
              },
              {},
            ) ?? {},
        });
      }
    } catch (_err) {
      setError("Failed to load gamification data");
      // GamifiedDashboard error: Failed to load gamification data
      void _err;
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    try {
      const res = await fetch("/api/gamification/progress", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        if (data.levelUp) {
          alert(
            `Level Up! You're now Level ${data.newLevel}: ${data.newTitle}`,
          );
        }
        fetchData();
      }
    } catch (_err) {
      // GamifiedDashboard error: Check-in failed
      void _err;
    }
  };

  const handleCompleteQuest = async (questId: string) => {
    try {
      const res = await fetch("/api/gamification/quests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.xpEarned) {
          alert(`Quest completed! +${data.xpEarned} XP`);
        }
        fetchData();
      }
    } catch (_err) {
      // GamifiedDashboard error: Quest completion failed
      void _err;
    }
  };

  if (loading) {
    return (
      <div className={cn("p-6 animate-pulse", className)}>
        <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-1/3 mb-4" />
        <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-full mb-2" />
        <div className="h-32 bg-gray-200 dark:bg-slate-700 rounded mb-4" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("p-6 text-center", className)}>
        <p className="text-red-500">{error}</p>
        <button
          onClick={fetchData}
          className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header with Level and XP */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold">Your Progress</h2>
            <p className="text-blue-100">Keep up the great work!</p>
          </div>
          {progress && (
            <StreakDisplay
              streak={progress.streak.days}
              multiplier={progress.streak.multiplier}
              longestStreak={progress.streak.longestStreak}
              size="md"
            />
          )}
        </div>

        {progress && (
          <div className="bg-white dark:bg-slate-800/10 rounded-xl p-4">
            <XpBar
              currentXp={progress.xp.totalEarned - progress.xp.toNextLevel}
              xpToNextLevel={progress.xp.toNextLevel}
              currentLevel={progress.level.current}
              levelTitle={progress.level.title}
              showDetails
            />
          </div>
        )}

        {/* Daily Check-in Button */}
        <button
          onClick={handleCheckIn}
          className="mt-4 w-full py-3 bg-white hover:bg-white dark:bg-slate-800/30 rounded-lg font-semibold transition-colors"
        >
          Daily Check-In (+10 XP)
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total XP"
          value={progress?.xp.totalEarned.toLocaleString() ?? "0"}
          icon=""
        />
        <StatCard
          label="Level"
          value={progress?.level.current.toString() ?? "1"}
          icon=""
        />
        <StatCard
          label="Badges"
          value={badges.earned.length.toString()}
          icon=""
        />
        <StatCard
          label="Streak"
          value={`${progress?.streak.days ?? 0}d`}
          icon=""
        />
      </div>

      {/* Daily Quests */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Daily Quests
          </h3>
          <span className="text-sm text-gray-500 dark:text-slate-400">
            {Object.values(quests.progress).filter((p) => p === 100).length}/
            {quests.quests.length} completed
          </span>
        </div>

        <div className="space-y-3">
          {quests.quests.length === 0 ? (
            <p className="text-gray-500 dark:text-slate-400 text-center py-4">
              No quests available today
            </p>
          ) : (
            quests.quests.map((quest) => (
              <QuestCard
                key={quest.id}
                quest={quest}
                isCompleted={quests.progress[quest.id] === 100}
                onComplete={() => handleCompleteQuest(quest.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* Recent Badges */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Your Badges
          </h3>
          <a
            href="/badges"
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            View All
          </a>
        </div>

        {badges.earned.length === 0 ? (
          <p className="text-gray-500 dark:text-slate-400 text-center py-4">
            Complete quests and challenges to earn badges!
          </p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {badges.earned.slice(0, 6).map((badge) => (
              <BadgeCard key={badge.id} badge={badge} isEarned size="sm" />
            ))}
          </div>
        )}

        {/* In-progress badges */}
        {badges.inProgress.length > 0 && (
          <>
            <h4 className="text-sm font-medium text-gray-600 dark:text-slate-400 mt-4 mb-2">
              In Progress
            </h4>
            <div className="flex flex-wrap gap-3">
              {badges.inProgress.slice(0, 4).map((badge) => (
                <BadgeCard
                  key={badge.id}
                  badge={badge}
                  isEarned={false}
                  progress={50}
                  size="sm"
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Progress Rings */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Financial Health
        </h3>
        <div className="flex justify-around">
          <ProgressRing
            percentage={progress?.level.progress ?? 0}
            size="md"
            label="Level Progress"
            color="purple"
          />
          <ProgressRing
            percentage={75}
            size="md"
            label="Budget"
            color="green"
          />
          <ProgressRing
            percentage={60}
            size="md"
            label="Savings Goal"
            color="blue"
          />
        </div>
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: string;
}) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-slate-700">
      <div className="flex items-center gap-2">
        <span className="text-2xl">{icon}</span>
        <div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {value}
          </p>
          <p className="text-sm text-gray-500 dark:text-slate-400">{label}</p>
        </div>
      </div>
    </div>
  );
}

export default GamifiedDashboard;
