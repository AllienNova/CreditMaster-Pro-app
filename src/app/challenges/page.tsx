"use client";

import { useState, useEffect, useCallback } from "react";
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
  Loader2,
  AlertCircle,
} from "lucide-react";

type ChallengeType =
  | "savings"
  | "no_spend"
  | "budget"
  | "debt_payoff"
  | "investment"
  | "streak"
  | "credit_improvement"
  | "custom";
type ChallengeStatus = "upcoming" | "active" | "completed";

interface Challenge {
  id: string;
  name: string;
  description: string;
  type: ChallengeType;
  status: ChallengeStatus;
  startDate: string;
  endDate: string;
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
    case "credit_improvement":
      return Star;
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
    case "credit_improvement":
      return "from-purple-500 to-purple-600";
    default:
      return "from-gray-500 to-gray-600";
  }
};

const formatTimeRemaining = (endDate: string) => {
  const now = new Date();
  const end = new Date(endDate);
  const diff = end.getTime() - now.getTime();
  if (diff <= 0) return "Ended";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days > 0) return `${days} days left`;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours > 0) return `${hours} hours left`;
  return "Ending soon";
};

export default function ChallengesPage() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "active" | "upcoming" | "completed"
  >("active");

  const fetchChallenges = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [activeRes, upcomingRes, leaderboardRes] = await Promise.all([
        fetch("/api/gamification/challenges?status=active"),
        fetch("/api/gamification/challenges?status=upcoming"),
        fetch("/api/gamification/leaderboard?type=challenge"),
      ]);

      if (!activeRes.ok && !upcomingRes.ok) {
        throw new Error("Failed to fetch challenges");
      }

      const activeData = activeRes.ok ? await activeRes.json() : { challenges: [] };
      const upcomingData = upcomingRes.ok ? await upcomingRes.json() : { challenges: [] };

      const active = (activeData.challenges ?? []).map((c: Challenge) => ({
        ...c,
        status: "active" as ChallengeStatus,
      }));
      const upcoming = (upcomingData.challenges ?? []).map((c: Challenge) => ({
        ...c,
        status: "upcoming" as ChallengeStatus,
      }));

      setChallenges([...active, ...upcoming]);

      if (leaderboardRes.ok) {
        const lbData = await leaderboardRes.json();
        const entries = (lbData.entries ?? []).map(
          (e: { rank: number; displayName: string; value: number; isCurrentUser?: boolean }) => ({
            rank: e.rank,
            displayName: e.displayName,
            progress: e.value,
            isCurrentUser: e.isCurrentUser ?? false,
          }),
        );
        setLeaderboard(entries);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load challenges",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChallenges();
  }, [fetchChallenges]);

  const filteredChallenges = challenges.filter((c) => c.status === activeTab);
  const userChallenges = challenges.filter((c) => c.userJoined);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
            <span className="ml-3 text-gray-600 dark:text-slate-400">
              Loading challenges...
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <AlertCircle className="w-12 h-12 text-red-500" />
            <p className="text-gray-600 dark:text-slate-400">{error}</p>
            <button
              onClick={fetchChallenges}
              className="px-4 py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

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
                          {challenge.userProgress ?? 0} / {challenge.goalValue}{" "}
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
                              ? `Starts ${new Date(challenge.startDate).toLocaleDateString()}`
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
                <div className="text-center py-12">
                  <Trophy className="w-12 h-12 text-gray-300 dark:text-slate-600 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-slate-400 font-medium">
                    No {activeTab} challenges at the moment
                  </p>
                  <p className="text-sm text-gray-400 dark:text-slate-500 mt-1">
                    Check back soon for new community challenges
                  </p>
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
            {leaderboard.length > 0 ? (
              <div className="space-y-3">
                {leaderboard.map((entry) => (
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
                          style={{ width: `${Math.min(entry.progress, 100)}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-sm font-medium text-gray-500 dark:text-slate-400">
                      {entry.progress}%
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-slate-400 text-center py-4">
                No leaderboard data available yet
              </p>
            )}
            <button className="w-full mt-4 text-center text-amber-600 dark:text-amber-400 text-sm font-medium hover:underline">
              View Full Leaderboard
            </button>
          </div>
        </div>

        {/* Stats -- populated from challenges data */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Active Challenges
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {challenges.filter((c) => c.status === "active").length}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Joined
            </p>
            <p className="text-2xl font-bold text-amber-600">
              {userChallenges.length}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Available XP
            </p>
            <p className="text-2xl font-bold text-orange-600">
              {challenges.reduce((sum, c) => sum + c.xpReward, 0).toLocaleString()}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Upcoming
            </p>
            <p className="text-2xl font-bold text-blue-600">
              {challenges.filter((c) => c.status === "upcoming").length}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
