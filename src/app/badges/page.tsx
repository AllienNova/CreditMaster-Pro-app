"use client";

import { Icon } from "@/components/ui/Icon";
/**
 * Badges & Achievements Page
 * Full view of all badges, earned and locked
 */

import React, { useEffect, useState } from "react";
import { BadgeCard } from "@/components/gamification";
import type { BadgeDefinition, BadgeCategory } from "@/lib/gamification";

interface BadgeData {
  earned: { badge: BadgeDefinition; earnedAt: string }[];
  inProgress: { badge: BadgeDefinition; progress: number }[];
  locked: BadgeDefinition[];
}

const categoryLabels: Record<BadgeCategory, { label: string; icon: string }> = {
  savings: { label: "Savings", icon: "wallet" },
  debt: { label: "Debt Freedom", icon: "scissors" },
  budget: { label: "Budget Master", icon: "calculator" },
  credit: { label: "Credit Building", icon: "credit-card" },
  investing: { label: "Investing", icon: "trending-up" },
  trading: { label: "Trading", icon: "chart-bar" },
  streak: { label: "Streaks", icon: "fire" },
  community: { label: "Community", icon: "users" },
  special: { label: "Special", icon: "star" },
  tax: { label: "Tax Optimization", icon: "document-chart" },
};

export default function BadgesPage() {
  const [badges, setBadges] = useState<BadgeData>({
    earned: [],
    inProgress: [],
    locked: [],
  });
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<
    BadgeCategory | "all"
  >("all");
  const [selectedBadge, setSelectedBadge] = useState<BadgeDefinition | null>(
    null,
  );

  useEffect(() => {
    fetchBadges();
  }, []);

  const fetchBadges = async () => {
    try {
      const res = await fetch("/api/gamification/badges");
      if (res.ok) {
        const data = await res.json();
        setBadges({
          earned: data.earned ?? [],
          inProgress: data.inProgress ?? [],
          locked: data.locked ?? [],
        });
      }
    } catch (err) {
      console.error("Failed to fetch badges:", err);
    } finally {
      setLoading(false);
    }
  };

  const filterByCategory = (items: BadgeDefinition[]) => {
    if (selectedCategory === "all") return items;
    return items.filter((b) => b.category === selectedCategory);
  };

  const allCategories = Object.keys(categoryLabels) as BadgeCategory[];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50 to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-slate-300">Loading badges...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50 to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800/80 backdrop-blur-sm shadow-sm border-b border-white/20 dark:border-slate-700/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <a
              href="/rewards"
              className="text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-gray-200"
            >
              ← Back to Rewards
            </a>
            <div className="flex items-center space-x-2">
              <span className="text-2xl"></span>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                All Badges
              </h1>
            </div>
            <div className="text-sm text-gray-500 dark:text-slate-400">
              {badges.earned.length} /{" "}
              {badges.earned.length +
                badges.inProgress.length +
                badges.locked.length}{" "}
              earned
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Category Filter */}
        <div className="mb-8 overflow-x-auto">
          <div className="flex gap-2 min-w-max pb-2">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === "all"
                  ? "bg-blue-600 text-white"
                  : "bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700"
              }`}
            >
              All Badges
            </button>
            {allCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-1 ${
                  selectedCategory === cat
                    ? "bg-blue-600 text-white"
                    : "bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                }`}
              >
                <Icon
                  name={categoryLabels[cat].icon}
                  className="w-4 h-4 inline-block"
                />
                {categoryLabels[cat].label}
              </button>
            ))}
          </div>
        </div>

        {/* Earned Badges */}
        {badges.earned.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <span className="text-green-500"></span> Earned Badges
            </h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
              {filterByCategory(badges.earned.map((e) => e.badge)).map(
                (badge) => (
                  <BadgeCard
                    key={badge.id}
                    badge={badge}
                    isEarned
                    earnedDate={
                      badges.earned.find((e) => e.badge.id === badge.id)
                        ?.earnedAt
                    }
                    onClick={() => setSelectedBadge(badge)}
                    size="sm"
                  />
                ),
              )}
            </div>
          </section>
        )}

        {/* In Progress Badges */}
        {badges.inProgress.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <span className="text-blue-500">⏳</span> In Progress
            </h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
              {filterByCategory(badges.inProgress.map((e) => e.badge)).map(
                (badge) => {
                  const prog = badges.inProgress.find(
                    (e) => e.badge.id === badge.id,
                  );
                  return (
                    <BadgeCard
                      key={badge.id}
                      badge={badge}
                      isEarned={false}
                      progress={prog?.progress ?? 0}
                      onClick={() => setSelectedBadge(badge)}
                      size="sm"
                    />
                  );
                },
              )}
            </div>
          </section>
        )}

        {/* Locked Badges */}
        {badges.locked.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <span className="text-gray-400 dark:text-slate-500"></span> Locked
            </h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
              {filterByCategory(badges.locked).map((badge) => (
                <BadgeCard
                  key={badge.id}
                  badge={badge}
                  isEarned={false}
                  onClick={() => setSelectedBadge(badge)}
                  size="sm"
                />
              ))}
            </div>
          </section>
        )}

        {/* Empty State */}
        {badges.earned.length === 0 &&
          badges.inProgress.length === 0 &&
          badges.locked.length === 0 && (
            <div className="text-center py-16">
              <span className="text-6xl mb-4 block"></span>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                No Badges Yet
              </h3>
              <p className="text-gray-500 dark:text-slate-400 mb-4">
                Complete quests and reach milestones to earn badges!
              </p>
              <a
                href="/rewards"
                className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                View Daily Quests
              </a>
            </div>
          )}
      </main>

      {/* Badge Detail Modal */}
      {selectedBadge && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedBadge(null)}
        >
          <div
            className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-sm w-full shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <Icon
                name={selectedBadge.icon}
                className="text-6xl block mb-4 inline-block"
              />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                {selectedBadge.name}
              </h3>
              <p
                className={`text-sm capitalize mb-2 ${
                  selectedBadge.rarity === "legendary"
                    ? "text-yellow-600"
                    : selectedBadge.rarity === "epic"
                      ? "text-blue-600"
                      : selectedBadge.rarity === "rare"
                        ? "text-blue-600"
                        : selectedBadge.rarity === "uncommon"
                          ? "text-green-600"
                          : "text-gray-500 dark:text-slate-400"
                }`}
              >
                {selectedBadge.rarity}
              </p>
              <p className="text-gray-600 dark:text-slate-300 mb-4">
                {selectedBadge.description}
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-slate-400 mb-4">
                <Icon
                  name={categoryLabels[selectedBadge.category].icon}
                  className="w-4 h-4 inline-block"
                />
                <span>{categoryLabels[selectedBadge.category].label}</span>
              </div>
              <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                +{selectedBadge.xpReward} XP
              </p>
            </div>
            <button
              onClick={() => setSelectedBadge(null)}
              className="mt-6 w-full py-2 bg-gray-100 text-gray-700 dark:text-slate-300 rounded-lg hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
