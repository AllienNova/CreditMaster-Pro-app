'use client';


import { Icon } from '@/components/ui/Icon';
import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Map,
  Trophy,
  Star,
  Lock,
  CheckCircle,
  ChevronRight,
  Sparkles,
  Target,
  TrendingUp,
  Calendar,
} from 'lucide-react';

type JourneyPhase =
  | 'foundation'
  | 'stability'
  | 'growth'
  | 'wealth_building'
  | 'financial_freedom';
type WaypointStatus = 'locked' | 'current' | 'completed';

interface Waypoint {
  id: string;
  order: number;
  status: WaypointStatus;
  title: string;
  description: string;
  icon: string;
  phase: JourneyPhase;
  xpReward: number;
  progressPercent: number;
  requirements: {
    description: string;
    currentValue: number;
    targetValue: number;
  }[];
}

interface Journey {
  journeyName: string;
  currentPhase: JourneyPhase;
  overallProgress: number;
  totalWaypoints: number;
  completedWaypoints: number;
  waypoints: Waypoint[];
  daysOnJourney: number;
  totalXpEarned: number;
}

const MOCK_JOURNEY: Journey = {
  journeyName: 'Debt-Free Journey',
  currentPhase: 'stability',
  overallProgress: 35,
  totalWaypoints: 8,
  completedWaypoints: 3,
  daysOnJourney: 127,
  totalXpEarned: 1550,
  waypoints: [
    {
      id: '1',
      order: 0,
      status: 'completed',
      title: 'Starter Emergency Fund',
      description: 'Save your first $1,000 for emergencies',
      icon: "wallet",
      phase: 'foundation',
      xpReward: 500,
      progressPercent: 100,
      requirements: [
        { description: 'Save $1,000', currentValue: 1000, targetValue: 1000 },
      ],
    },
    {
      id: '2',
      order: 1,
      status: 'completed',
      title: 'Budget Master',
      description: 'Stick to your budget for 30 days',
      icon: "calculator",
      phase: 'foundation',
      xpReward: 300,
      progressPercent: 100,
      requirements: [
        {
          description: '30-day budget streak',
          currentValue: 30,
          targetValue: 30,
        },
      ],
    },
    {
      id: '3',
      order: 2,
      status: 'completed',
      title: 'First Debt Paid',
      description: 'Pay off your first debt completely',
      icon: "scale",
      phase: 'stability',
      xpReward: 750,
      progressPercent: 100,
      requirements: [
        { description: 'Pay off 1 debt', currentValue: 1, targetValue: 1 },
      ],
    },
    {
      id: '4',
      order: 3,
      status: 'current',
      title: 'Halfway There',
      description: 'Pay off 50% of your total debt',
      icon: "scale",
      phase: 'stability',
      xpReward: 1000,
      progressPercent: 68,
      requirements: [
        { description: '50% debt paid', currentValue: 34, targetValue: 50 },
      ],
    },
    {
      id: '5',
      order: 4,
      status: 'locked',
      title: 'Debt Free!',
      description: 'Eliminate all consumer debt',
      icon: "scale",
      phase: 'stability',
      xpReward: 2000,
      progressPercent: 0,
      requirements: [
        { description: '100% debt paid', currentValue: 0, targetValue: 100 },
      ],
    },
    {
      id: '6',
      order: 5,
      status: 'locked',
      title: '3-Month Fund',
      description: 'Save 3 months of expenses',
      icon: "wallet",
      phase: 'growth',
      xpReward: 1500,
      progressPercent: 0,
      requirements: [
        {
          description: '3 months expenses',
          currentValue: 0,
          targetValue: 10000,
        },
      ],
    },
    {
      id: '7',
      order: 6,
      status: 'locked',
      title: 'First Investment',
      description: 'Start investing for retirement',
      icon: "trending-up",
      phase: 'wealth_building',
      xpReward: 1000,
      progressPercent: 0,
      requirements: [
        { description: 'Invest $1,000', currentValue: 0, targetValue: 1000 },
      ],
    },
    {
      id: '8',
      order: 7,
      status: 'locked',
      title: 'Financial Freedom',
      description: 'Achieve financial independence',
      icon: "sparkles",
      phase: 'financial_freedom',
      xpReward: 5000,
      progressPercent: 0,
      requirements: [
        {
          description: 'Net worth goal achieved',
          currentValue: 0,
          targetValue: 1,
        },
      ],
    },
  ],
};

const PHASE_COLORS: Record<JourneyPhase, string> = {
  foundation: 'from-blue-500 to-blue-600',
  stability: 'from-green-500 to-emerald-600',
  growth: 'from-blue-500 to-blue-600',
  wealth_building: 'from-amber-500 to-orange-600',
  financial_freedom: 'from-yellow-400 to-yellow-500',
};

const PHASE_LABELS: Record<JourneyPhase, string> = {
  foundation: 'Foundation',
  stability: 'Stability',
  growth: 'Growth',
  wealth_building: 'Wealth Building',
  financial_freedom: 'Financial Freedom',
};

export default function JourneyPage() {
  const [journey] = useState<Journey>(MOCK_JOURNEY);
  const [selectedWaypoint, setSelectedWaypoint] = useState<Waypoint | null>(
    null
  );

  const currentWaypoint = journey.waypoints.find((w) => w.status === 'current');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Map className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Financial Journey
            </h1>
          </div>
          <p className="text-gray-600 dark:text-slate-400">
            {journey.journeyName} - Your path to financial freedom
          </p>
        </div>

        {/* Progress Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`bg-gradient-to-r ${PHASE_COLORS[journey.currentPhase]} rounded-xl p-6 mb-8 text-white`}
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-5 h-5" />
                <span className="text-white/80">Current Phase</span>
              </div>
              <h2 className="text-2xl font-bold mb-4">
                {PHASE_LABELS[journey.currentPhase]}
              </h2>

              <div className="flex items-center gap-6">
                <div>
                  <p className="text-white/70 text-sm">Progress</p>
                  <p className="text-xl font-bold">
                    {journey.overallProgress.toFixed(0)}%
                  </p>
                </div>
                <div>
                  <p className="text-white/70 text-sm">Waypoints</p>
                  <p className="text-xl font-bold">
                    {journey.completedWaypoints}/{journey.totalWaypoints}
                  </p>
                </div>
                <div>
                  <p className="text-white/70 text-sm">XP Earned</p>
                  <p className="text-xl font-bold">
                    {journey.totalXpEarned.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-white/70 text-sm">Days</p>
                  <p className="text-xl font-bold">{journey.daysOnJourney}</p>
                </div>
              </div>
            </div>

            {currentWaypoint && (
              <div className="bg-white dark:bg-slate-800/20 rounded-xl p-4 min-w-[280px]">
                <p className="text-white/80 text-sm mb-2">Current Goal</p>
                <div className="flex items-center gap-3">
                  <Icon name={currentWaypoint.icon} className="text-3xl inline-block" />
                  <div>
                    <p className="font-semibold">{currentWaypoint.title}</p>
                    <p className="text-sm text-white/70">
                      {currentWaypoint.progressPercent}% complete
                    </p>
                  </div>
                </div>
                <div className="mt-3 h-2 bg-white dark:bg-slate-800/30 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white dark:bg-slate-800 rounded-full transition-all"
                    style={{ width: `${currentWaypoint.progressPercent}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Journey Map */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-500" />
            Your Journey Map
          </h2>

          <div className="relative">
            {/* Connection Line */}
            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-slate-700" />

            {/* Waypoints */}
            <div className="space-y-6">
              {journey.waypoints.map((waypoint, index) => {
                const isCompleted = waypoint.status === 'completed';
                const isCurrent = waypoint.status === 'current';
                const isLocked = waypoint.status === 'locked';

                return (
                  <motion.div
                    key={waypoint.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`relative flex items-start gap-4 p-4 rounded-xl cursor-pointer transition-all ${ isCurrent ? 'bg-blue-50 border-2 border-blue-300' : isCompleted ? 'bg-green-50 border border-green-200' : 'bg-gray-50 dark:bg-slate-700/30 border border-gray-200 dark:border-slate-700 opacity-60' }`}
                    onClick={() => setSelectedWaypoint(waypoint)}
                  >
                    {/* Status Icon */}
                    <div
                      className={`relative z-10 flex items-center justify-center w-12 h-12 rounded-full ${
                        isCompleted
                          ? 'bg-green-500 text-white'
                          : isCurrent
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-300 dark:bg-slate-600 text-gray-500 dark:text-slate-400'
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle className="w-6 h-6" />
                      ) : isLocked ? (
                        <Lock className="w-5 h-5" />
                      ) : (
                        <span className="text-xl">{waypoint.icon}</span>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3
                          className={`font-semibold ${ isLocked ? 'text-gray-400' : 'text-gray-900 dark:text-white' }`}
                        >
                          {waypoint.title}
                        </h3>
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium ${ isCompleted ? 'bg-green-100 text-green-700' : isCurrent ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-slate-400' }`}
                        >
                          {PHASE_LABELS[waypoint.phase]}
                        </span>
                      </div>
                      <p
                        className={`text-sm ${isLocked ? 'text-gray-400' : 'text-gray-600 dark:text-slate-400'}`}
                      >
                        {waypoint.description}
                      </p>

                      {!isLocked && (
                        <div className="mt-2">
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-gray-500 dark:text-slate-400">
                              {waypoint.requirements[0]?.description}
                            </span>
                            <span className="font-medium text-gray-900 dark:text-white">
                              {waypoint.progressPercent}%
                            </span>
                          </div>
                          <div className="h-1.5 bg-gray-200 dark:bg-slate-600 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                isCompleted ? 'bg-green-500' : 'bg-blue-500'
                              }`}
                              style={{ width: `${waypoint.progressPercent}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* XP Reward */}
                    <div className="flex items-center gap-1 text-amber-500">
                      <Star className="w-4 h-4 fill-amber-500" />
                      <span className="font-semibold">{waypoint.xpReward}</span>
                    </div>

                    <ChevronRight className="w-5 h-5 text-gray-400 dark:text-slate-500" />
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              <span className="text-sm text-gray-500 dark:text-slate-400">
                Milestones
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {journey.completedWaypoints}
            </p>
            <p className="text-sm text-gray-500 dark:text-slate-400">Completed</p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
              <span className="text-sm text-gray-500 dark:text-slate-400">
                Total XP
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {journey.totalXpEarned.toLocaleString()}
            </p>
            <p className="text-sm text-gray-500 dark:text-slate-400">Earned</p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-5 h-5 text-blue-500" />
              <span className="text-sm text-gray-500 dark:text-slate-400">
                Journey
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {journey.daysOnJourney}
            </p>
            <p className="text-sm text-gray-500 dark:text-slate-400">Days</p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              <span className="text-sm text-gray-500 dark:text-slate-400">
                Progress
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {journey.overallProgress.toFixed(0)}%
            </p>
            <p className="text-sm text-gray-500 dark:text-slate-400">Complete</p>
          </div>
        </div>
      </div>
    </div>
  );
}
