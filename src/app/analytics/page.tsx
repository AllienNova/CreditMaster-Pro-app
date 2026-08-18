"use client";

/**
 * Analytics Overview.
 *
 * WHAT THIS PAGE USED TO ASSERT ABOUT EVERY VISITOR, WITH NO FETCH IN THE FILE.
 *
 *   "Current Credit Score 720, +45 from 675"
 *   "Active Disputes 5, 3 pending response"
 *   "Items Removed 12, +4 this month"
 *   "Success Rate 78%, +5% vs last month"
 *   Experian 725 +12, Equifax 718 +8, TransUnion 715 +5
 *   a six-month climb from 620 to 720
 *   "Credit score increased by 15 points — 2 hours ago"
 *
 * Every number was a claim about the reader's own credit, and the whole page
 * was four module-level arrays. It is the web twin of the mobile bureau
 * comparison, and of /analytics/credit-score's invented factors.
 *
 * ALL OF IT HAS A REAL SOURCE, and every one of these routes already existed:
 *   GET /api/credit-monitoring/scores          -> { success, data: { experian?, equifax?, transunion? } }
 *   GET /api/disputes/stats                    -> { success, data: { total, active, resolved, successRate, avgResolutionDays } }
 *   GET /api/activity                          -> { activities: [{ id, type, title, message, createdAt, read }] }
 *   GET /api/credit-monitoring/history?bureau=  -> { success, data: CreditScore[] }
 *
 * TWO LABELS CHANGED BECAUSE THE DATA MEANS SOMETHING ELSE.
 *   - "Items Removed" is now "Disputes Resolved". The stats route counts
 *     resolved disputes; a resolved dispute is not the same thing as an item
 *     removed from a report, and calling it one would be the same overclaim in
 *     new clothing.
 *   - The per-tile deltas ("+45 from 675", "+4 this month", "+5% vs last
 *     month") are gone. Nothing computes a month-over-month change for
 *     disputes or success rate. The score delta IS computable, so it is
 *     derived from the score history rather than typed in.
 */

import { useState, useEffect, useCallback } from "react";
import { Icon } from "@/components/ui/Icon";
import { FadeIn, StaggerList, ScrollReveal } from "@/components/ui/animations";

const MAX_SCORE = 850;
const HISTORY_DAYS = 365;

type BureauKey = "experian" | "equifax" | "transunion";

const BUREAU_LABELS: Record<BureauKey, string> = {
  experian: "Experian",
  equifax: "Equifax",
  transunion: "TransUnion",
};

interface BureauScore {
  score: number;
  scoreDate?: string;
}

interface DisputeStats {
  total: number;
  active: number;
  resolved: number;
  successRate: number;
}

interface Activity {
  id: string;
  type: string;
  title: string;
  message: string;
  createdAt: string;
}

interface HistoryPoint {
  score: number;
  scoreDate: string;
}

function formatDate(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
}

function formatTimeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const minutes = Math.floor((Date.now() - then) / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function AnalyticsOverviewPage() {
  const [scores, setScores] = useState<Partial<Record<BureauKey, BureauScore>>>(
    {},
  );
  const [stats, setStats] = useState<DisputeStats | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [historyBureau, setHistoryBureau] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const body = async (r: PromiseSettledResult<Response>) =>
      r.status === "fulfilled" && r.value.ok
        ? await r.value.json().catch(() => null)
        : null;

    const [scoresRes, statsRes, activityRes] = await Promise.allSettled([
      fetch("/api/credit-monitoring/scores"),
      fetch("/api/disputes/stats"),
      fetch("/api/activity"),
    ]);

    const [scoresJson, statsJson, activityJson] = await Promise.all([
      body(scoresRes),
      body(statsRes),
      body(activityRes),
    ]);

    const nextScores = (scoresJson?.data ?? {}) as Partial<
      Record<BureauKey, BureauScore>
    >;
    setScores(nextScores);
    setStats((statsJson?.data as DisputeStats | undefined) ?? null);
    setActivities(
      Array.isArray(activityJson?.activities)
        ? (activityJson.activities as Activity[])
        : [],
    );

    /*
     * The history route needs a bureau, so it can only be asked for one the
     * user actually has. No score, no chart — rather than a chart of nothing.
     */
    const firstBureau = (Object.keys(BUREAU_LABELS) as BureauKey[]).find(
      (key) => typeof nextScores[key]?.score === "number",
    );
    if (firstBureau) {
      setHistoryBureau(BUREAU_LABELS[firstBureau]);
      try {
        const res = await fetch(
          `/api/credit-monitoring/history?bureau=${firstBureau}&days=${HISTORY_DAYS}`,
        );
        const json = await res.json().catch(() => null);
        setHistory(Array.isArray(json?.data) ? (json.data as HistoryPoint[]) : []);
      } catch {
        setHistory([]);
      }
    }

    if (!scoresJson && !statsJson && !activityJson) {
      setError(
        "We could not load your analytics. Nothing on this page is estimated in its place — try again in a moment.",
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const bureaus = (Object.keys(BUREAU_LABELS) as BureauKey[]).filter(
    (key) => typeof scores[key]?.score === "number",
  );

  const latestScore = bureaus.length > 0 ? scores[bureaus[0]]!.score : null;

  /* Derived from the real history, not typed in. Null when there is no earlier
     reading to compare against — an unknown change is not a change of zero. */
  const scoreChange =
    history.length >= 2 && latestScore !== null
      ? latestScore - history[history.length - 1].score
      : null;

  const chartPoints = history.slice(-6);

  return (
    <div>
      <FadeIn>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Analytics Overview
        </h1>
      </FadeIn>

      {error && (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 mb-6 border border-amber-200 dark:border-amber-900/50">
          <p className="font-medium text-gray-900 dark:text-white mb-1">
            Analytics are unavailable
          </p>
          <p className="text-sm text-gray-600 dark:text-slate-300">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-28 bg-gray-200 dark:bg-slate-700 rounded-xl"
            />
          ))}
        </div>
      ) : (
        <StaggerList className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Current Credit Score
            </p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
              {latestScore ?? "—"}
            </p>
            {scoreChange !== null && (
              <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-1">
                {scoreChange >= 0 ? "+" : ""}
                {scoreChange} over the last year
              </p>
            )}
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Active Disputes
            </p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
              {stats?.active ?? "—"}
            </p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
            {/* Not "Items Removed": the stats route counts resolved disputes,
                which is a different claim. */}
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Disputes Resolved
            </p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
              {stats?.resolved ?? "—"}
            </p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Success Rate
            </p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
              {typeof stats?.successRate === "number"
                ? `${Math.round(stats.successRate)}%`
                : "—"}
            </p>
          </div>
        </StaggerList>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Score history */}
        <ScrollReveal>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700 h-full">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-4">
              Score history{historyBureau ? ` — ${historyBureau}` : ""}
            </h2>
            {chartPoints.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-slate-400">
                We have no score history for you yet. It appears once a bureau
                score has been recorded more than once.
              </p>
            ) : (
              <div className="space-y-2">
                {chartPoints.map((point) => (
                  <div key={point.scoreDate} className="flex items-center gap-3">
                    <span className="w-24 text-xs text-gray-500 dark:text-slate-400">
                      {formatDate(point.scoreDate)}
                    </span>
                    <div className="flex-1 h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{
                          width: `${Math.min(100, (point.score / MAX_SCORE) * 100)}%`,
                        }}
                      />
                    </div>
                    <span className="w-10 text-sm font-medium text-gray-900 dark:text-white text-right">
                      {point.score}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollReveal>

        {/* Bureau scores */}
        <ScrollReveal>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700 h-full">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-4">
              Bureau scores
            </h2>
            {bureaus.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-slate-400">
                No bureau has reported a score for you yet.
              </p>
            ) : (
              <div className="space-y-4">
                {bureaus.map((key) => (
                  <div
                    key={key}
                    className="flex items-center justify-between gap-4"
                  >
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {BUREAU_LABELS[key]}
                      </p>
                      {scores[key]?.scoreDate && (
                        <p className="text-xs text-gray-500 dark:text-slate-400">
                          Updated {formatDate(scores[key]?.scoreDate)}
                        </p>
                      )}
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {scores[key]?.score}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollReveal>
      </div>

      {/* Recent activity */}
      <ScrollReveal>
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">
            Recent activity
          </h2>
          {activities.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Nothing has happened on your account yet.
            </p>
          ) : (
            <ul className="space-y-3">
              {activities.slice(0, 8).map((activity) => (
                <li key={activity.id} className="flex items-start gap-3">
                  <Icon name="bell" className="w-4 h-4 mt-1 text-gray-400" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {activity.title}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-slate-300">
                      {activity.message}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400 dark:text-slate-500 whitespace-nowrap">
                    {formatTimeAgo(activity.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </ScrollReveal>
    </div>
  );
}
