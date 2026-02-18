"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Users,
  Plus,
  Target,
  TrendingUp,
  MessageCircle,
  Heart,
  Home,
  Plane,
  Gift,
  DollarSign,
  ChevronRight,
  Bell,
  Flame,
  Calendar,
  ArrowUp,
  ArrowDown,
  CheckCircle,
  Clock,
  Zap,
  Trophy,
  AlertTriangle,
} from "lucide-react";

interface Member {
  name: string;
  contributed: number;
  lastContribution: Date;
  streak: number;
  color: string;
}

interface Milestone {
  percent: number;
  label: string;
  reached: boolean;
}

interface SharedGoal {
  id: string;
  name: string;
  emoji: string;
  targetAmount: number;
  currentAmount: number;
  members: Member[];
  daysLeft: number;
  totalDays: number;
  recentActivity?: string;
  milestones: Milestone[];
  weeklyTarget: number;
  lastWeekSaved: number;
}

const MEMBER_COLORS = [
  "from-blue-400 to-blue-500",
  "from-blue-400 to-blue-500",
  "from-green-400 to-emerald-500",
  "from-orange-400 to-amber-500",
  "from-emerald-400 to-rose-500",
  "from-blue-400 to-blue-500",
];

const MOCK_GOALS: SharedGoal[] = [
  {
    id: "1",
    name: "Dream Home Down Payment",
    emoji: "",
    targetAmount: 60000,
    currentAmount: 42500,
    members: [
      {
        name: "You",
        contributed: 24000,
        lastContribution: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        streak: 12,
        color: MEMBER_COLORS[0],
      },
      {
        name: "Sarah",
        contributed: 18500,
        lastContribution: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        streak: 8,
        color: MEMBER_COLORS[1],
      },
    ],
    daysLeft: 180,
    totalDays: 365,
    recentActivity: "Sarah contributed $500 yesterday",
    milestones: [
      { percent: 25, label: "Quarter Way", reached: true },
      { percent: 50, label: "Halfway!", reached: true },
      { percent: 75, label: "Almost There", reached: false },
      { percent: 100, label: "Goal!", reached: false },
    ],
    weeklyTarget: 1200,
    lastWeekSaved: 1450,
  },
  {
    id: "2",
    name: "Family Vacation to Hawaii",
    emoji: "",
    targetAmount: 8000,
    currentAmount: 5200,
    members: [
      {
        name: "You",
        contributed: 1800,
        lastContribution: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        streak: 4,
        color: MEMBER_COLORS[0],
      },
      {
        name: "Mom",
        contributed: 1500,
        lastContribution: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        streak: 6,
        color: MEMBER_COLORS[2],
      },
      {
        name: "Dad",
        contributed: 1500,
        lastContribution: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        streak: 6,
        color: MEMBER_COLORS[3],
      },
      {
        name: "Sis",
        contributed: 400,
        lastContribution: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        streak: 0,
        color: MEMBER_COLORS[4],
      },
    ],
    daysLeft: 120,
    totalDays: 240,
    recentActivity: "Mom sent a nudge!",
    milestones: [
      { percent: 25, label: "Started", reached: true },
      { percent: 50, label: "Halfway", reached: true },
      { percent: 75, label: "3/4 Done", reached: false },
      { percent: 100, label: "Hawaii!", reached: false },
    ],
    weeklyTarget: 350,
    lastWeekSaved: 200,
  },
  {
    id: "3",
    name: "Parents' 50th Anniversary",
    emoji: "",
    targetAmount: 2500,
    currentAmount: 1875,
    members: [
      {
        name: "You",
        contributed: 625,
        lastContribution: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        streak: 3,
        color: MEMBER_COLORS[0],
      },
      {
        name: "Mike",
        contributed: 625,
        lastContribution: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        streak: 5,
        color: MEMBER_COLORS[1],
      },
      {
        name: "Lisa",
        contributed: 625,
        lastContribution: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        streak: 7,
        color: MEMBER_COLORS[2],
      },
    ],
    daysLeft: 45,
    totalDays: 90,
    recentActivity: "Lisa joined the goal",
    milestones: [
      { percent: 25, label: "Started", reached: true },
      { percent: 50, label: "Halfway", reached: true },
      { percent: 75, label: "Almost", reached: true },
      { percent: 100, label: "Party!", reached: false },
    ],
    weeklyTarget: 180,
    lastWeekSaved: 250,
  },
];

const TEMPLATES = [
  { id: "home", name: "House Down Payment", emoji: "", icon: Home },
  { id: "vacation", name: "Group Vacation", emoji: "", icon: Plane },
  { id: "gift", name: "Special Gift", emoji: "", icon: Gift },
  { id: "emergency", name: "Family Emergency Fund", emoji: "", icon: Heart },
];

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);

const getDaysSince = (date: Date) =>
  Math.floor((Date.now() - date.getTime()) / (24 * 60 * 60 * 1000));

// Visual donut chart for contribution breakdown
function ContributionDonut({
  members,
  size = 120,
}: {
  members: Member[];
  size?: number;
}) {
  const total = members.reduce((s, m) => s + m.contributed, 0);
  let cumulative = 0;
  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {members.map((member, i) => {
          const percent = total > 0 ? member.contributed / total : 0;
          const offset = cumulative * circumference;
          cumulative += percent;
          return (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={`url(#gradient-${i})`}
              strokeWidth="16"
              strokeDasharray={`${percent * circumference} ${circumference}`}
              strokeDashoffset={-offset}
              className="transition-all duration-700"
            />
          );
        })}
        <defs>
          {members.map((member, i) => (
            <linearGradient
              key={i}
              id={`gradient-${i}`}
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              <stop
                offset="0%"
                stopColor={
                  member.color.includes("purple")
                    ? "#a855f7"
                    : member.color.includes("blue")
                      ? "#3b82f6"
                      : member.color.includes("green")
                        ? "#22c55e"
                        : member.color.includes("orange")
                          ? "#f97316"
                          : member.color.includes("pink")
                            ? "#ec4899"
                            : "#6366f1"
                }
              />
              <stop
                offset="100%"
                stopColor={
                  member.color.includes("purple")
                    ? "#8b5cf6"
                    : member.color.includes("blue")
                      ? "#06b6d4"
                      : member.color.includes("green")
                        ? "#10b981"
                        : member.color.includes("orange")
                          ? "#f59e0b"
                          : member.color.includes("pink")
                            ? "#f43f5e"
                            : "#3b82f6"
                }
              />
            </linearGradient>
          ))}
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xs text-gray-500 dark:text-slate-400">Total</span>
        <span className="text-sm font-bold text-gray-900 dark:text-white">
          {formatCurrency(total)}
        </span>
      </div>
    </div>
  );
}

// Progress thermometer with milestones
function ProgressThermometer({
  current,
  target,
  milestones,
}: {
  current: number;
  target: number;
  milestones: Milestone[];
}) {
  const progress = Math.min((current / target) * 100, 100);

  return (
    <div className="relative">
      {/* Milestone markers */}
      <div className="absolute w-full flex justify-between px-1 -top-6">
        {milestones.map((m, i) => (
          <div
            key={i}
            className="flex flex-col items-center"
            style={{
              left: `${m.percent}%`,
              position: "absolute",
              transform: "translateX(-50%)",
            }}
          >
            <span
              className={`text-xs font-medium ${m.reached ? "text-green-600" : "text-gray-400 dark:text-slate-500"}`}
            >
              {m.label}
            </span>
            {m.reached && (
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
            )}
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden relative mt-2">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="h-full bg-gradient-to-r from-blue-500 via-violet-500 to-fuchsia-500 rounded-full"
        />
        {/* Milestone ticks */}
        {milestones.map((m, i) => (
          <div
            key={i}
            className={`absolute top-0 h-full w-0.5 ${m.reached ? "bg-green-400" : "bg-gray-400"}`}
            style={{ left: `${m.percent}%` }}
          />
        ))}
      </div>

      {/* Labels */}
      <div className="flex justify-between mt-1">
        <span className="text-lg font-bold text-gray-900 dark:text-white">
          {formatCurrency(current)}
        </span>
        <span className="text-sm text-gray-500 dark:text-slate-400">
          {formatCurrency(target)}
        </span>
      </div>
    </div>
  );
}

// Pace indicator - are we on track?
function PaceIndicator({
  weeklyTarget,
  lastWeekSaved,
  daysLeft,
  totalDays,
}: {
  weeklyTarget: number;
  lastWeekSaved: number;
  daysLeft: number;
  totalDays: number;
}) {
  const timeProgress = ((totalDays - daysLeft) / totalDays) * 100;
  const isAhead = lastWeekSaved >= weeklyTarget;
  const diff = lastWeekSaved - weeklyTarget;

  return (
    <div
      className={`p-3 rounded-lg ${isAhead ? "bg-green-50 border border-green-200" : "bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800"}`}
    >
      <div className="flex items-center gap-2 mb-2">
        {isAhead ? (
          <>
            <div className="p-1 bg-green-100 dark:bg-green-900 rounded">
              <TrendingUp className="w-4 h-4 text-green-600" />
            </div>
            <span className="text-sm font-medium text-green-700 dark:text-green-400">
              On Track!
            </span>
          </>
        ) : (
          <>
            <div className="p-1 bg-amber-100 dark:bg-amber-900 rounded">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
            <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
              Falling Behind
            </span>
          </>
        )}
      </div>

      <div className="flex items-baseline gap-1">
        <span
          className={`text-xl font-bold ${isAhead ? "text-green-600" : "text-amber-600"}`}
        >
          {isAhead ? "+" : ""}
          {formatCurrency(diff)}
        </span>
        <span className="text-xs text-gray-500 dark:text-slate-400">
          vs weekly target
        </span>
      </div>

      <div className="mt-2 text-xs text-gray-600 dark:text-slate-400">
        Need{" "}
        <span className="font-semibold">
          {formatCurrency(weeklyTarget)}/week
        </span>{" "}
        to reach goal
      </div>
    </div>
  );
}

// Member contribution bars with streaks
function MemberContributions({
  members,
  total,
}: {
  members: Member[];
  total: number;
}) {
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-gray-700 dark:text-slate-300">
        Who&apos;s Contributing
      </h4>
      {members.map((member, i) => {
        const percent = total > 0 ? (member.contributed / total) * 100 : 0;
        const daysSince = getDaysSince(member.lastContribution);
        const needsNudge = daysSince > 7;

        return (
          <div key={i} className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full bg-gradient-to-br ${member.color} flex items-center justify-center text-white text-xs font-medium`}
                >
                  {member.name.charAt(0)}
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {member.name}
                  </span>
                  {member.streak > 0 && (
                    <span className="ml-2 inline-flex items-center gap-0.5 text-xs text-orange-500">
                      <Flame className="w-3 h-3" />
                      {member.streak} weeks
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {formatCurrency(member.contributed)}
                </span>
                <span className="text-xs text-gray-500 dark:text-slate-400 ml-1">
                  ({percent.toFixed(0)}%)
                </span>
              </div>
            </div>

            {/* Visual bar */}
            <div className="h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${percent}%` }}
                transition={{ duration: 0.8, delay: i * 0.1 }}
                className={`h-full bg-gradient-to-r ${member.color} rounded-full`}
              />
            </div>

            {/* Last contribution info */}
            <div className="flex items-center justify-between text-xs">
              <span
                className={`${needsNudge ? "text-amber-600" : "text-gray-500 dark:text-slate-400"}`}
              >
                {daysSince === 0
                  ? "Today"
                  : daysSince === 1
                    ? "Yesterday"
                    : `${daysSince} days ago`}
              </span>
              {needsNudge && (
                <button className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  Send Nudge
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function SharedGoalsPage() {
  const [goals] = useState<SharedGoal[]>(MOCK_GOALS);
  const [expandedGoal, setExpandedGoal] = useState<string | null>("1");

  const totalSaved = goals.reduce((sum, g) => sum + g.currentAmount, 0);
  const totalTarget = goals.reduce((sum, g) => sum + g.targetAmount, 0);
  const goalsOnTrack = goals.filter(
    (g) => g.lastWeekSaved >= g.weeklyTarget,
  ).length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Shared Goals
              </h1>
            </div>
            <p className="text-gray-600 dark:text-slate-400">
              Save together with family and friends
            </p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <Plus className="w-4 h-4" />
            New Goal
          </button>
        </div>

        {/* Visual Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white"
          >
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-5 h-5" />
              <span className="text-blue-100">Active Goals</span>
            </div>
            <p className="text-4xl font-bold">{goals.length}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-5 text-white"
          >
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-5 h-5" />
              <span className="text-green-100">Total Saved</span>
            </div>
            <p className="text-3xl font-bold">{formatCurrency(totalSaved)}</p>
            <div className="mt-2 h-2 bg-green-400/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white dark:bg-slate-800/80 rounded-full"
                style={{ width: `${(totalSaved / totalTarget) * 100}%` }}
              />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white"
          >
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5" />
              <span className="text-blue-100">Overall Progress</span>
            </div>
            <p className="text-4xl font-bold">
              {((totalSaved / totalTarget) * 100).toFixed(0)}%
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className={`rounded-xl p-5 text-white ${goalsOnTrack === goals.length ? "bg-gradient-to-br from-emerald-500 to-teal-600" : "bg-gradient-to-br from-amber-500 to-orange-600"}`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="w-5 h-5" />
              <span className="opacity-80">On Track</span>
            </div>
            <p className="text-4xl font-bold">
              {goalsOnTrack}/{goals.length}
            </p>
            <p className="text-sm opacity-80 mt-1">
              {goalsOnTrack === goals.length
                ? "All goals on pace!"
                : "Some need attention"}
            </p>
          </motion.div>
        </div>

        {/* Goals with Rich Visualizations */}
        <div className="space-y-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Your Shared Goals
          </h2>

          {goals.map((goal, index) => {
            const isExpanded = expandedGoal === goal.id;
            const progress = (goal.currentAmount / goal.targetAmount) * 100;

            return (
              <motion.div
                key={goal.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white dark:bg-slate-800 rounded-xl shadow-sm overflow-hidden"
              >
                {/* Collapsed View */}
                <div
                  className="p-5 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-750 transition-colors"
                  onClick={() => setExpandedGoal(isExpanded ? null : goal.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="text-4xl">{goal.emoji}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white text-lg truncate">
                          {goal.name}
                        </h3>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500 dark:text-slate-400 flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {goal.daysLeft} days left
                          </span>
                          {goal.lastWeekSaved >= goal.weeklyTarget ? (
                            <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                              On Track
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
                              Behind
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Quick progress */}
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-blue-500 to-blue-500 rounded-full transition-all"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-lg font-bold text-gray-900 dark:text-white">
                          {progress.toFixed(0)}%
                        </span>
                      </div>

                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-2">
                          <div className="flex -space-x-2">
                            {goal.members.slice(0, 4).map((member, i) => (
                              <div
                                key={i}
                                className={`w-7 h-7 rounded-full bg-gradient-to-br ${member.color} border-2 border-white dark:border-slate-800 flex items-center justify-center text-white text-xs font-medium`}
                              >
                                {member.name.charAt(0)}
                              </div>
                            ))}
                          </div>
                          <span className="text-sm text-gray-500 dark:text-slate-400">
                            {goal.members.length} members
                          </span>
                        </div>
                        <ChevronRight
                          className={`w-5 h-5 text-gray-400 dark:text-slate-500 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded Detailed View */}
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-gray-100 dark:border-slate-700 p-5 bg-gray-50 dark:bg-slate-800/50"
                  >
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Left: Progress with Milestones */}
                      <div className="lg:col-span-2 space-y-6">
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-4">
                            Progress Journey
                          </h4>
                          <ProgressThermometer
                            current={goal.currentAmount}
                            target={goal.targetAmount}
                            milestones={goal.milestones}
                          />
                        </div>

                        {/* Member Contributions */}
                        <MemberContributions
                          members={goal.members}
                          total={goal.currentAmount}
                        />
                      </div>

                      {/* Right: Donut + Pace */}
                      <div className="space-y-4">
                        {/* Contribution Donut */}
                        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700">
                          <h4 className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-3 text-center">
                            Contribution Split
                          </h4>
                          <div className="flex justify-center">
                            <ContributionDonut
                              members={goal.members}
                              size={140}
                            />
                          </div>
                          {/* Legend */}
                          <div className="mt-3 space-y-1">
                            {goal.members.map((m, i) => (
                              <div
                                key={i}
                                className="flex items-center justify-between text-xs"
                              >
                                <div className="flex items-center gap-2">
                                  <div
                                    className={`w-3 h-3 rounded-full bg-gradient-to-r ${m.color}`}
                                  />
                                  <span className="text-gray-600 dark:text-slate-400">
                                    {m.name}
                                  </span>
                                </div>
                                <span className="font-medium text-gray-900 dark:text-white">
                                  {(
                                    (m.contributed / goal.currentAmount) *
                                    100
                                  ).toFixed(0)}
                                  %
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Pace Indicator */}
                        <PaceIndicator
                          weeklyTarget={goal.weeklyTarget}
                          lastWeekSaved={goal.lastWeekSaved}
                          daysLeft={goal.daysLeft}
                          totalDays={goal.totalDays}
                        />

                        {/* Quick Actions */}
                        <div className="flex gap-2">
                          <button className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                            + Add Money
                          </button>
                          <button className="px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                            <MessageCircle className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Quick Start Templates */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Start a New Shared Goal
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {TEMPLATES.map((template) => (
              <button
                key={template.id}
                className="p-4 border border-gray-200 dark:border-slate-700 rounded-xl hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors text-center group"
              >
                <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">
                  {template.emoji}
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {template.name}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Pending Invitations */}
        <div className="mt-8 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-900 rounded-lg">
              <Bell className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                You have 1 pending invitation
              </h3>
              <p className="text-sm text-gray-600 dark:text-slate-400">
                John invited you to &quot;Wedding Fund 2026&quot;
              </p>
            </div>
            <div className="flex gap-2">
              <button className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-white dark:hover:text-white transition-colors">
                Decline
              </button>
              <button className="px-4 py-2 text-sm font-medium bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors">
                Accept
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
