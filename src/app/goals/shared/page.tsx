"use client";

/**
 * Shared savings goals.
 *
 * WHAT THIS PAGE USED TO SHOW EVERY VISITOR AS THEIR OWN.
 *
 * `MOCK_GOALS` invented a "Dream Home Down Payment" — $42,500 saved of
 * $60,000 — with named members and their contributions, including "You,
 * contributed $24,000". Below it, hardcoded directly in the JSX rather than in
 * a constant: "You have 1 pending invitation — John invited you to 'Wedding
 * Fund 2026'", with Accept and Decline buttons.
 *
 * That inline invitation is worth noting: because it was JSX rather than a
 * module-level array, `audit:screen-data` could not see it at all. Same blind
 * spot as the hardcoded identity on /profile, tracked as task #100.
 *
 * FOURTH UNEXPOSED FEATURE OF THE SESSION.
 * `src/lib/gamification/shared-goals-service.ts` has 33 database calls and no
 * randomness, including `getUserGoals`. Nothing called it, so GET
 * /api/goals/shared was added.
 *
 * It also slipped past `audit:reachable-services`, which is why it was still
 * here after that gate was built: reachability there is module-level, and
 * routes import `@/lib/gamification` for two OTHER services, so the barrel's
 * whole subtree counted as reached. Documented in the audit header, tracked as
 * #104.
 *
 * `showContributionAmounts` IS HONOURED. Each SharedGoalMember carries that
 * flag, and a member who has not opted to show amounts now appears without
 * one. The mock displayed everybody's contributions unconditionally, which is
 * precisely the privacy choice the real model exists to record.
 *
 * FIELDS REMOVED, none of which the real SharedGoal has: `milestones`,
 * `weeklyTarget`, `lastWeekSaved` and `recentActivity`. `daysLeft` is now
 * derived from the real `targetDate` rather than stored.
 *
 * THE TEMPLATE BUTTONS ARE GONE. Four cards under "Start a New Shared Goal"
 * were `<button>` elements with hover styling and no onClick — clicking did
 * nothing. The service does have `createGoal`, so a real create flow is
 * buildable; it needs a POST route and a form, which is more than removing a
 * fabrication. Until then, a control that cannot do the thing is the defect.
 */

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Users, Target, TrendingUp, RefreshCw } from "lucide-react";

/** Mirrors SharedGoalMember in shared-goals-service.ts:42. */
interface SharedGoalMember {
  id: string;
  displayName: string;
  relationship?: string;
  role?: string;
  totalContributed: number;
  contributionCount?: number;
  showContributionAmounts: boolean;
  isActive?: boolean;
}

/** Mirrors SharedGoal in shared-goals-service.ts:23. */
interface SharedGoal {
  id: string;
  name: string;
  description?: string;
  emoji?: string;
  targetAmount: number;
  currentAmount: number;
  currency?: string;
  targetDate?: string;
  status?: string;
  members?: SharedGoalMember[];
  progressPercent?: number;
  totalContributions?: number;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const formatCurrency = (value: number, currency = "USD") =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);

/** Days until the target date, or null when there is no date to count to. */
function daysLeft(targetDate?: string): number | null {
  if (!targetDate) return null;
  const end = new Date(targetDate).getTime();
  if (Number.isNaN(end)) return null;
  return Math.max(0, Math.ceil((end - Date.now()) / MS_PER_DAY));
}

export default function SharedGoalsPage() {
  const [goals, setGoals] = useState<SharedGoal[]>([]);
  const [expandedGoal, setExpandedGoal] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/goals/shared");
      const json = await res.json().catch(() => null);
      if (!res.ok || !Array.isArray(json?.data?.goals)) {
        setGoals([]);
        setError(
          "We could not load your shared goals. Nothing here is filled in for you — try again in a moment.",
        );
      } else {
        setGoals(json.data.goals as SharedGoal[]);
      }
    } catch {
      setGoals([]);
      setError("We could not reach the shared goals service.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const totalSaved = goals.reduce((sum, g) => sum + (g.currentAmount ?? 0), 0);
  const totalTarget = goals.reduce((sum, g) => sum + (g.targetAmount ?? 0), 0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-violet-100 dark:bg-violet-900 rounded-lg">
            <Users className="w-6 h-6 text-violet-600 dark:text-violet-400" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Shared Goals
          </h1>
        </div>
        <p className="text-gray-600 dark:text-slate-400 mb-8">
          Goals you are saving towards with other people.
        </p>

        {error && (
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 mb-6 border border-amber-200 dark:border-amber-900/50">
            <p className="font-medium text-gray-900 dark:text-white mb-1">
              Shared goals are unavailable
            </p>
            <p className="text-sm text-gray-600 dark:text-slate-300">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="space-y-4 animate-pulse">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-36 bg-gray-200 dark:bg-slate-700 rounded-xl"
              />
            ))}
          </div>
        ) : goals.length === 0 ? (
          !error && (
            <div className="bg-white dark:bg-slate-800 rounded-xl p-10 text-center border border-gray-200 dark:border-slate-700">
              <Target className="w-8 h-8 text-gray-400 dark:text-slate-500 mx-auto mb-3" />
              <p className="font-medium text-gray-900 dark:text-white">
                You are not part of any shared goal
              </p>
              <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">
                Goals you create or are invited to will appear here.
              </p>
            </div>
          )
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-slate-700">
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  Goals
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {goals.length}
                </p>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-slate-700">
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  Saved together
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {formatCurrency(totalSaved)}
                </p>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-slate-700">
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  Combined target
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {formatCurrency(totalTarget)}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {goals.map((goal, index) => {
                const remaining = daysLeft(goal.targetDate);
                const percent =
                  typeof goal.progressPercent === "number"
                    ? goal.progressPercent
                    : goal.targetAmount > 0
                      ? (goal.currentAmount / goal.targetAmount) * 100
                      : 0;
                const isExpanded = expandedGoal === goal.id;
                return (
                  <motion.div
                    key={goal.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700"
                  >
                    <button
                      onClick={() => setExpandedGoal(isExpanded ? null : goal.id)}
                      className="w-full text-left"
                    >
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div>
                          <h2 className="font-semibold text-gray-900 dark:text-white">
                            {goal.emoji ? `${goal.emoji} ` : ""}
                            {goal.name}
                          </h2>
                          {goal.description && (
                            <p className="text-sm text-gray-600 dark:text-slate-300">
                              {goal.description}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {formatCurrency(goal.currentAmount, goal.currency)}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-slate-400">
                            of {formatCurrency(goal.targetAmount, goal.currency)}
                          </p>
                        </div>
                      </div>

                      <div className="h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden mb-2">
                        <div
                          className="h-full bg-violet-500 rounded-full"
                          style={{ width: `${Math.min(100, percent)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-slate-400">
                        <span>{percent.toFixed(0)}% there</span>
                        {remaining !== null && <span>{remaining} days left</span>}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700">
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                          Members
                        </h3>
                        {(goal.members ?? []).length === 0 ? (
                          <p className="text-sm text-gray-500 dark:text-slate-400">
                            Nobody else has joined yet.
                          </p>
                        ) : (
                          <ul className="space-y-2">
                            {(goal.members ?? []).map((member) => (
                              <li
                                key={member.id}
                                className="flex items-center justify-between text-sm"
                              >
                                <span className="text-gray-900 dark:text-white">
                                  {member.displayName}
                                  {member.relationship && (
                                    <span className="text-gray-500 dark:text-slate-400">
                                      {" "}
                                      · {member.relationship}
                                    </span>
                                  )}
                                </span>
                                {/*
                                  A member who has not opted to show amounts is
                                  shown without one. The mock displayed
                                  everybody's contributions unconditionally.
                                */}
                                {member.showContributionAmounts ? (
                                  <span className="flex items-center gap-1 text-gray-900 dark:text-white">
                                    <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                                    {formatCurrency(
                                      member.totalContributed,
                                      goal.currency,
                                    )}
                                  </span>
                                ) : (
                                  <span className="text-gray-400 dark:text-slate-500">
                                    Amount hidden
                                  </span>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </>
        )}

        <button
          onClick={load}
          disabled={loading}
          className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-sm font-medium text-gray-700 dark:text-slate-300 disabled:opacity-50"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>
    </div>
  );
}
