"use client";

/**
 * Trends.
 *
 * WHAT THIS PAGE USED TO ASSERT, WITH NO FETCH IN THE FILE.
 *
 *   "Score Velocity +7.5 pts/month"
 *   a six-month table: Jul 620 / 2 disputes / 45% utilization, through to
 *   Dec 720 / 4 / 30%
 *   projections: 3 months -> 745 (confidence High), 6 months -> 770 (Medium)
 *   insights: "Your score has increased every month for 6 consecutive months",
 *   "Your dispute success rate is 13% above average"
 *
 * WHAT SURVIVES, AND WHY.
 *
 * The score series and the velocity are real now: GET
 * /api/credit-monitoring/history?bureau= returns the user's own recorded
 * scores, and velocity is the slope across that window — arithmetic over real
 * readings, with the window stated on screen rather than a bare number.
 * Disputes per month are counted from GET /api/disputes, grouped by createdAt.
 *
 * THE PROJECTIONS ARE GONE AND ARE NOT COMING BACK AS AN ESTIMATE. Forecasting
 * a credit score needs a model of how bureaus respond to future events, and
 * this codebase has none. The nearest thing, /api/ml/predict-timeline, predicts
 * dispute RESOLUTION TIME and its own comment records that it substitutes a
 * different model because the one it names was never built. A number labelled
 * "confidence: High" beside a forecast nothing computed is the most persuasive
 * fabrication on the page — it invites someone to plan a house purchase around
 * 770 in six months.
 *
 * THE INSIGHTS ARE GONE TOO. "13% above average" needs a population baseline
 * that does not exist anywhere in this system; there is no cohort data to
 * average. The narrative ones ("increased every month for 6 consecutive
 * months") are derivable in principle, but they were asserted, not computed,
 * and the chart below shows the same thing without claiming it.
 *
 * UTILIZATION IS GONE. There is no utilization route and no utilization field
 * in credit-monitoring-service.ts. The column was three invented percentages.
 */

import { useState, useEffect, useCallback } from "react";

type BureauKey = "experian" | "equifax" | "transunion";

const BUREAU_LABELS: Record<BureauKey, string> = {
  experian: "Experian",
  equifax: "Equifax",
  transunion: "TransUnion",
};

const HISTORY_DAYS = 365;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DAYS_PER_MONTH = 30.44;
const MAX_SCORE = 850;

interface HistoryPoint {
  score: number;
  scoreDate: string;
}

interface Dispute {
  id: string;
  createdAt: string;
}

/**
 * The month a timestamp falls in, bucketed in UTC.
 *
 * `timeZone: "UTC"` is load-bearing, not tidiness. These timestamps are stored
 * in UTC, and formatting them in the viewer's local zone pushes anything at
 * 00:00 on the 1st into the previous month for everyone west of UTC — a
 * dispute filed 2026-06-01T00:00:00Z displayed as May. Two users would see
 * different month counts for identical data, and one user would see them
 * change by travelling.
 */
function monthKey(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      });
}

/**
 * Points per month across the observed window.
 *
 * Returns null when there is only one reading — a single point has no slope,
 * and "0 pts/month" would be a claim that the score is flat.
 */
function scoreVelocity(
  history: HistoryPoint[],
): { perMonth: number; months: number } | null {
  if (history.length < 2) return null;
  const sorted = [...history].sort(
    (a, b) =>
      new Date(a.scoreDate).getTime() - new Date(b.scoreDate).getTime(),
  );
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const days =
    (new Date(last.scoreDate).getTime() - new Date(first.scoreDate).getTime()) /
    MS_PER_DAY;
  const months = days / DAYS_PER_MONTH;
  if (!Number.isFinite(months) || months <= 0) return null;
  return { perMonth: (last.score - first.score) / months, months };
}

export default function TrendsPage() {
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [bureau, setBureau] = useState<string | null>(null);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [scoresRes, disputesRes] = await Promise.allSettled([
        fetch("/api/credit-monitoring/scores"),
        fetch("/api/disputes?limit=100"),
      ]);

      const scoresJson =
        scoresRes.status === "fulfilled" && scoresRes.value.ok
          ? await scoresRes.value.json().catch(() => null)
          : null;
      const disputesJson =
        disputesRes.status === "fulfilled" && disputesRes.value.ok
          ? await disputesRes.value.json().catch(() => null)
          : null;

      setDisputes(
        Array.isArray(disputesJson?.data?.items)
          ? (disputesJson.data.items as Dispute[])
          : [],
      );

      const key = (Object.keys(BUREAU_LABELS) as BureauKey[]).find(
        (k) => typeof scoresJson?.data?.[k]?.score === "number",
      );
      if (!key) {
        setHistory([]);
        setLoading(false);
        return;
      }

      setBureau(BUREAU_LABELS[key]);
      const res = await fetch(
        `/api/credit-monitoring/history?bureau=${key}&days=${HISTORY_DAYS}`,
      );
      const json = await res.json().catch(() => null);
      setHistory(Array.isArray(json?.data) ? (json.data as HistoryPoint[]) : []);
    } catch {
      setHistory([]);
      setDisputes([]);
      setError("We could not reach the trends data.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const velocity = scoreVelocity(history);

  const disputesByMonth = [...disputes]
    .reduce<{ month: string; count: number }[]>((acc, dispute) => {
      const key = monthKey(dispute.createdAt);
      if (!key) return acc;
      const row = acc.find((r) => r.month === key);
      if (row) row.count += 1;
      else acc.push({ month: key, count: 1 });
      return acc;
    }, [])
    .slice(0, 6);

  const chart = [...history]
    .sort(
      (a, b) =>
        new Date(b.scoreDate).getTime() - new Date(a.scoreDate).getTime(),
    )
    .slice(0, 6)
    .reverse();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Trends
      </h1>

      {error && (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 mb-6 border border-amber-200 dark:border-amber-900/50">
          <p className="font-medium text-gray-900 dark:text-white mb-1">
            Trends are unavailable
          </p>
          <p className="text-sm text-gray-600 dark:text-slate-300">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="h-28 bg-gray-200 dark:bg-slate-700 rounded-xl mb-8 animate-pulse" />
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 mb-8 shadow-sm border border-gray-200 dark:border-slate-700">
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Score velocity
          </p>
          {velocity ? (
            <>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                {velocity.perMonth >= 0 ? "+" : ""}
                {velocity.perMonth.toFixed(1)}
                <span className="text-base font-medium text-gray-500 dark:text-slate-400">
                  {" "}
                  pts/month
                </span>
              </p>
              {/* The window is on screen, because a rate without one is not a
                  measurement anyone can check. */}
              <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">
                Measured across {velocity.months.toFixed(1)} months of{" "}
                {bureau} readings.
              </p>
            </>
          ) : (
            <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">
              We need at least two recorded scores before we can tell you a
              rate. One reading has no trend.
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">
            Score history{bureau ? ` — ${bureau}` : ""}
          </h2>
          {chart.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-slate-400">
              No score has been recorded for you yet.
            </p>
          ) : (
            <div className="space-y-2">
              {chart.map((point) => (
                <div key={point.scoreDate} className="flex items-center gap-3">
                  <span className="w-24 text-xs text-gray-500 dark:text-slate-400">
                    {monthKey(point.scoreDate)}
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

        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">
            Disputes filed
          </h2>
          {disputesByMonth.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-slate-400">
              You have not filed any disputes yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {disputesByMonth.map((row) => (
                <li
                  key={row.month}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-gray-600 dark:text-slate-300">
                    {row.month}
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {row.count}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
