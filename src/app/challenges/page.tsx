"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Trophy,
  Users,
  Target,
  Calendar,
  TrendingUp,
  Clock,
  Star,
  ChevronRight,
  Flame,
  Medal,
  Zap,
} from "lucide-react";

type ChallengeType =
  | "savings"
  | "no_spend"
  | "budget"
  | "debt_payoff"
  | "investment"
  | "streak";
type ChallengeStatus = "upcoming" | "active" | "completed";

interface Challenge {
  id: string;
  name: string;
  description: string;
  type: ChallengeType;
  status: ChallengeStatus;
  startDate: Date;
  endDate: Date;
  goalValue: number;
  goalUnit: string;
  participants: number;
  xpReward: number;
  userProgress?: number;
  userJoined?: boolean;
}

interface LeaderboardEntry {
  rank: number;
  displayName: string;
  progress: number;
  isCurrentUser: boolean;
}

const MOCK_CHALLENGES: Challenge[] = [
  {
    id: "1",
    name: "No-Spend Week",
    description: "Go 7 days without any non-essential spending",
    type: "no_spend",
    status: "active",
    startDate: new Date("2026-01-18"),
    endDate: new Date("2026-01-25"),
    goalValue: 7,
    goalUnit: "days",
    participants: 1247,
    xpReward: 500,
    userProgress: 4,
    userJoined: true,
  },
  {
    id: "2",
    name: "Save $500 Challenge",
    description: "Save $500 in one month",
    type: "savings",
    status: "active",
    startDate: new Date("2026-01-01"),
    endDate: new Date("2026-01-31"),
    goalValue: 500,
    goalUnit: "dollars",
    participants: 3892,
    xpReward: 750,
    userProgress: 320,
    userJoined: true,
  },
  {
    id: "3",
    name: "21-Day Budget Streak",
    description: "Stay within budget for 21 consecutive days",
    type: "streak",
    status: "active",
    startDate: new Date("2026-01-10"),
    endDate: new Date("2026-01-31"),
    goalValue: 21,
    goalUnit: "days",
    participants: 2156,
    xpReward: 600,
    userJoined: false,
  },
  {
    id: "4",
    name: "30-Day Debt Blitz",
    description: "Pay off as much debt as possible in 30 days",
    type: "debt_payoff",
    status: "upcoming",
    startDate: new Date("2026-02-01"),
    endDate: new Date("2026-03-01"),
    goalValue: 1000,
    goalUnit: "dollars",
    participants: 892,
    xpReward: 1000,
    userJoined: false,
  },
  {
    id: "5",
    name: "First Investment Challenge",
    description: "Make your first investment of at least $100",
    type: "investment",
    status: "upcoming",
    startDate: new Date("2026-02-01"),
    endDate: new Date("2026-02-28"),
    goalValue: 100,
    goalUnit: "dollars",
    participants: 567,
    xpReward: 800,
    userJoined: false,
  },
];

const MOCK_LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, displayName: "SavingsChamp", progress: 100, isCurrentUser: false },
  { rank: 2, displayName: "BudgetBoss", progress: 95, isCurrentUser: false },
  { rank: 3, displayName: "DebtSlayer", progress: 88, isCurrentUser: false },
  { rank: 4, displayName: "You", progress: 64, isCurrentUser: true },
  { rank: 5, displayName: "MoneyMaven", progress: 60, isCurrentUser: false },
];

const getChallengeIcon = (type: ChallengeType) => {
  switch (type) {
    case "savings":
      return Target;
    case "no_spend":
      return Zap;
    case "budget":
      return TrendingUp;
    case "debt_payoff":
      return Flame;
    case "investment":
      return TrendingUp;
    case "streak":
      return Flame;
    default:
      return Trophy;
  }
};

const getChallengeColor = (type: ChallengeType) => {
  switch (type) {
    case "savings":
      return "from-emerald-500 to-green-600";
    case "no_spend":
      return "from-blue-500 to-blue-600";
    case "budget":
      return "from-blue-500 to-blue-600";
    case "debt_payoff":
      return "from-orange-500 to-red-600";
    case "investment":
      return "from-blue-500 to-blue-600";
    case "streak":
      return "from-amber-500 to-orange-600";
    default:
      return "from-gray-500 to-gray-600";
  }
};

const formatTimeRemaining = (endDate: Date) => {
  const now = new Date();
  const diff = endDate.getTime() - now.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days > 0) return `${days} days left`;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours > 0) return `${hours} hours left`;
  return "Ending soon";
};

export default function ChallengesPage() {
  const [challenges] = useState<Challenge[]>(MOCK_CHALLENGES);
  const [activeTab, setActiveTab] = useState<
    "active" | "upcoming" | "completed"
  >("active");

  const filteredChallenges = challenges.filter((c) => c.status === activeTab);
  const userChallenges = challenges.filter((c) => c.userJoined);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-100 dark:bg-amber-900 rounded-lg">
              <Trophy className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Community Challenges
            </h1>
          </div>
          <p className="text-gray-600 dark:text-slate-400">
            Join challenges, compete with the community, and earn rewards
          </p>
        </div>

        {/* Your Active Challenges */}
        {userChallenges.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Flame className="w-5 h-5 text-orange-500" />
              Your Active Challenges
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {userChallenges.map((challenge) => {
                const Icon = getChallengeIcon(challenge.type);
                const progress = challenge.userProgress
                  ? (challenge.userProgress / challenge.goalValue) * 100
                  : 0;
                return (
                  <motion.div
                    key={challenge.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`bg-gradient-to-r ${getChallengeColor(challenge.type)} rounded-xl p-5 text-white`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white dark:bg-slate-800/20 rounded-lg">
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{challenge.name}</h3>
                          <p className="text-sm text-white/80">
                            {challenge.description}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 bg-white dark:bg-slate-800/20 px-2 py-1 rounded-full text-sm">
                        <Clock className="w-3 h-3" />
                        {formatTimeRemaining(challenge.endDate)}
                      </div>
                    </div>

                    <div className="mb-2">
                      <div className="flex justify-between text-sm mb-1">
                        <span>
                          {challenge.userProgress} / {challenge.goalValue}{" "}
                          {challenge.goalUnit}
                        </span>
                        <span>{progress.toFixed(0)}%</span>
                      </div>
                      <div className="h-2 bg-white dark:bg-slate-800/30 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-white dark:bg-slate-800 rounded-full transition-all"
                          style={{ width: `${Math.min(100, progress)}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {challenge.participants.toLocaleString()} participants
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-white" />
                        {challenge.xpReward} XP
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* Leaderboard */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            {/* Tabs */}
            <div className="flex gap-2 mb-4">
              {(["active", "upcoming", "completed"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === tab
                      ? "bg-amber-600 text-white"
                      : "bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {/* Challenge List */}
            <div className="space-y-4">
              {filteredChallenges.map((challenge) => {
                const Icon = getChallengeIcon(challenge.type);
                return (
                  <div
                    key={challenge.id}
                    className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`p-3 rounded-lg bg-gradient-to-r ${getChallengeColor(challenge.type)} text-white`}
                      >
                        <Icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white">
                              {challenge.name}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                              {challenge.description}
                            </p>
                          </div>
                          {challenge.userJoined ? (
                            <span className="px-3 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 rounded-full text-sm font-medium">
                              Joined
                            </span>
                          ) : (
                            <button className="px-4 py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition-colors text-sm">
                              Join
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-6 mt-4 text-sm text-gray-500 dark:text-slate-400">
                          <div className="flex items-center gap-1">
                            <Target className="w-4 h-4" />
                            {challenge.goalValue} {challenge.goalUnit}
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            {challenge.participants.toLocaleString()}
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {challenge.status === "upcoming"
                              ? `Starts ${challenge.startDate.toLocaleDateString()}`
                              : formatTimeRemaining(challenge.endDate)}
                          </div>
                          <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                            <Star className="w-4 h-4 fill-amber-500" />
                            {challenge.xpReward} XP
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 dark:text-slate-500" />
                    </div>
                  </div>
                );
              })}

              {filteredChallenges.length === 0 && (
                <div className="text-center py-12 text-gray-500 dark:text-slate-400">
                  No {activeTab} challenges at the moment
                </div>
              )}
            </div>
          </div>

          {/* Leaderboard Sidebar */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-5 h-fit">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Medal className="w-5 h-5 text-amber-500" />
              Leaderboard
            </h3>
            <div className="space-y-3">
              {MOCK_LEADERBOARD.map((entry) => (
                <div
                  key={entry.rank}
                  className={`flex items-center gap-3 p-2 rounded-lg ${
                    entry.isCurrentUser
                      ? "bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800"
                      : ""
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${entry.rank === 1 ? "bg-amber-400 text-white" : entry.rank === 2 ? "bg-gray-300 text-gray-700" : entry.rank === 3 ? "bg-amber-600 text-white" : "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300"}`}
                  >
                    {entry.rank}
                  </div>
                  <div className="flex-1">
                    <p
                      className={`font-medium ${entry.isCurrentUser ? "text-amber-700" : "text-gray-900 dark:text-white"}`}
                    >
                      {entry.displayName}
                    </p>
                    <div className="h-1.5 bg-gray-100 dark:bg-slate-700 rounded-full mt-1">
                      <div
                        className={`h-full rounded-full ${entry.isCurrentUser ? "bg-amber-500" : "bg-gray-400 dark:bg-slate-500"}`}
                        style={{ width: `${entry.progress}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-medium text-gray-500 dark:text-slate-400">
                    {entry.progress}%
                  </span>
                </div>
              ))}
            </div>
            <button className="w-full mt-4 text-center text-amber-600 dark:text-amber-400 text-sm font-medium hover:underline">
              View Full Leaderboard
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Challenges Completed
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              12
            </p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Total XP Earned
            </p>
            <p className="text-2xl font-bold text-amber-600">8,450</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Current Streak
            </p>
            <p className="text-2xl font-bold text-orange-600">14 days</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Best Ranking
            </p>
            <p className="text-2xl font-bold text-blue-600">#4</p>
          </div>
        </div>
      </div>
    </div>
  );
}
