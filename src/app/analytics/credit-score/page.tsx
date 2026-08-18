"use client";

/**
 * Credit Score Analytics.
 *
 * WHAT THIS PAGE USED TO ASSERT, WITH NO FETCH IN THE FILE.
 *
 *   scoreFactors: "Payment History — impact 35, score 92, On-time payments for
 *   24 months"; "Credit Utilization — impact 30, score 68, Using 32% of
 *   available credit"; and three more of the same shape.
 *   scoreHistory: a hardcoded climb.
 *   recommendations: what to do next, keyed to the invented factors.
 *
 * This is the SF-16 shape on the web side: five factors that read as a reading
 * of the caller's own file. "On-time payments for 24 months" is a statement
 * about a stranger's payment record, and "Using 32% of available credit" is a
 * number nobody measured.
 *
 * WHAT IT READS NOW.
 *   GET /api/credit-monitoring/scores           -> { success, data: { experian?, ... } }
 *   GET /api/credit-monitoring/history?bureau=   -> { success, data: CreditScore[] }
 *
 * THE FACTORS ARE REAL AND COME FROM THE SCORE ROW. `CreditScore.factors` is
 * mapped straight off `credit_scores.factors` (credit-monitoring-service.ts:568,
 * `row.factors ?? []`), so what renders is whatever the bureau import recorded
 * — and nothing renders when it recorded none.
 *
 * TWO FIELDS ARE GONE BECAUSE THE REAL TYPE DOES NOT HAVE THEM. A ScoreFactor
 * is `{ factor, impact: "positive" | "negative" | "neutral", description }`.
 * The page's version had `impact` as a NUMBER (35, meaning "35% of your score")
 * and a per-factor `score` out of 100. Neither exists in the data: the weights
 * were invented, and `impact` was not even the same type — a number where the
 * real field is an enum.
 *
 * /api/credit/factors WAS NOT USED. That route has no data access at all and
 * returns five hardcoded factors telling every caller they have "98% on-time
 * payments" — the original SF-16 finding. Reading it would have swapped one
 * fabrication for another and passed the audit while doing so.
 *
 * recommendations are gone: they were derived from the invented factors, and
 * nothing generates advice from a real score row.
 */

import { useState, useEffect, useCallback } from "react";

type BureauKey = "experian" | "equifax" | "transunion";

const BUREAU_LABELS: Record<BureauKey, string> = {
  experian: "Experian",
  equifax: "Equifax",
  transunion: "TransUnion",
};

const HISTORY_DAYS = 365;
const MAX_SCORE = 850;

/** Mirrors ScoreFactor in credit-monitoring-service.ts:38. */
interface ScoreFactor {
  factor: string;
  impact: "positive" | "negative" | "neutral";
  description: string;
}

interface BureauScore {
  score: number;
  scoreDate?: string;
  factors?: ScoreFactor[];
}

interface HistoryPoint {
  score: number;
  scoreDate: string;
}

const IMPACT_CLASSES: Record<ScoreFactor["impact"], string> = {
  positive:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  negative: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  neutral: "bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300",
};

function formatDate(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      });
}

export default function CreditScoreAnalyticsPage() {
  const [scores, setScores] = useState<Partial<Record<BureauKey, BureauScore>>>(
    {},
  );
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [bureau, setBureau] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/credit-monitoring/scores");
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.data) {
        setScores({});
        setError(
          "We could not load your credit score. Nothing here is filled in for you — try again in a moment.",
        );
        setLoading(false);
        return;
      }

      const next = json.data as Partial<Record<BureauKey, BureauScore>>;
      setScores(next);

      const key = (Object.keys(BUREAU_LABELS) as BureauKey[]).find(
        (k) => typeof next[k]?.score === "number",
      );
      if (key) {
        setBureau(BUREAU_LABELS[key]);
        const hRes = await fetch(
          `/api/credit-monitoring/history?bureau=${key}&days=${HISTORY_DAYS}`,
        );
        const hJson = await hRes.json().catch(() => null);
        setHistory(
          Array.isArray(hJson?.data) ? (hJson.data as HistoryPoint[]) : [],
        );
      }
    } catch {
      setScores({});
      setError("We could not reach the credit score service.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const bureaus = (Object.keys(BUREAU_LABELS) as BureauKey[]).filter(
    (key) => typeof scores[key]?.score === "number",
  );
  const primary = bureaus.length > 0 ? scores[bureaus[0]] : undefined;
  const factors = primary?.factors ?? [];
  const chart = [...history]
    .sort(
      (a, b) =>
        new Date(b.scoreDate).getTime() - new Date(a.scoreDate).getTime(),
    )
    .slice(0, 8)
    .reverse();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Credit Score Analytics
      </h1>

      {error && (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 mb-6 border border-amber-200 dark:border-amber-900/50">
          <p className="font-medium text-gray-900 dark:text-white mb-1">
            Your score is unavailable
          </p>
          <p className="text-sm text-gray-600 dark:text-slate-300">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="h-28 bg-gray-200 dark:bg-slate-700 rounded-xl mb-8 animate-pulse" />
      ) : bureaus.length === 0 ? (
        !error && (
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 mb-8 border border-gray-200 dark:border-slate-700">
            <p className="font-medium text-gray-900 dark:text-white mb-1">
              No bureau has reported a score for you yet
            </p>
            <p className="text-sm text-gray-600 dark:text-slate-400">
              Once a score is on your account, its history and the factors
              behind it appear here.
            </p>
          </div>
        )
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {bureaus.map((key) => (
            <div
              key={key}
              className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700 text-center"
            >
              <p className="text-sm text-gray-500 dark:text-slate-400">
                {BUREAU_LABELS[key]}
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                {scores[key]?.score}
              </p>
              {scores[key]?.scoreDate && (
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                  {formatDate(scores[key]?.scoreDate)}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">
            Score history{bureau ? ` — ${bureau}` : ""}
          </h2>
          {chart.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-slate-400">
              We have no score history for you yet.
            </p>
          ) : (
            <div className="space-y-2">
              {chart.map((point) => (
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

        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">
            What is affecting your score
          </h2>
          {factors.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Your report did not come with score factors. We will show them
              here when a bureau provides them — we are not going to guess what
              is on your file.
            </p>
          ) : (
            <ul className="space-y-3">
              {factors.map((factor) => (
                <li key={factor.factor}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {factor.factor}
                    </span>
                    <span
                      className={`px-2 py-0.5 text-xs rounded-full capitalize ${
                        IMPACT_CLASSES[factor.impact] ?? IMPACT_CLASSES.neutral
                      }`}
                    >
                      {factor.impact}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-slate-300">
                    {factor.description}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
