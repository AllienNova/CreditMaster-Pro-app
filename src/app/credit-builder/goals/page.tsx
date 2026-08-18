"use client";

/**
 * Credit Goals.
 *
 * WHAT THIS PAGE USED TO SHOW.
 *
 * `MOCK_ACTIVE_GOALS` gave every visitor one goal already in flight — "Reach
 * Good Credit (670+)", started at 590, now at 635, 56% complete — with a
 * `targetDate` of 2025-06-01, which is over a year in the past, so it also
 * rendered as long overdue. Beside it sat `const currentScore = 635; // Mock
 * current score`, a credit score typed into the file.
 *
 * "Create goal" was theatre on two counts. It called
 * `goalTrackerService.createGoalFromTemplate("user_1", ...)` — a hardcoded user
 * id — and pushed the result into local state. `goal-tracker-service.ts`
 * contains no `supabase` reference and no `from(` call at all: it is pure
 * in-memory computation. Nothing was ever saved, so a goal the user "created"
 * vanished on the next page load.
 *
 * THE FEATURE IS NOT BUILT, and there is nowhere to put it. There is no
 * `credit_goals` table in any migration and no credit-goals route under
 * src/app/api. `financial_goals` cannot hold one either: its `target_amount` is
 * `DECIMAL NOT NULL CHECK (target_amount > 0)` and its type CHECK lists only
 * money goals (emergency_fund, debt_payoff, savings, investment, retirement,
 * home_purchase, education, custom). "Reach 670" is not an amount.
 *
 * WHAT IT SHOWS NOW. The user's real current score, read from GET
 * /api/credit-monitoring/scores (withAuth, `{ success, data: { experian?,
 * equifax?, transunion? } }`, backed by the `credit_scores` table). The goal
 * templates stay as guidance, because they are product content worth reading,
 * but nothing claims a goal can be saved — because it cannot.
 *
 * NOT USED, DELIBERATELY: /api/credit-builder/score returns a
 * `CreditBuilderScore` whose `overall` is 0-100, not a bureau score. Rendering
 * it where the UI reads "635" would be a units error of exactly the kind that
 * sent a $50 payout out as $0.50.
 */

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { GOAL_TEMPLATES } from "@/lib/credit-builder/goal-tracker-service";

interface BureauScore {
  score: number;
  bureau?: string;
  date?: string;
}

interface ScoresResponse {
  experian?: BureauScore;
  equifax?: BureauScore;
  transunion?: BureauScore;
}

const BUREAU_LABELS: Record<keyof ScoresResponse, string> = {
  experian: "Experian",
  equifax: "Equifax",
  transunion: "TransUnion",
};

const DIFFICULTY_CLASSES: Record<string, string> = {
  beginner:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  intermediate:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  advanced: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
};

export default function GoalsPage() {
  const [scores, setScores] = useState<ScoresResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/credit-monitoring/scores");
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.data) {
        setScores(null);
        setError(
          "We could not load your credit score. Nothing here is filled in for you — try again in a moment.",
        );
      } else {
        setScores(json.data as ScoresResponse);
      }
    } catch {
      setScores(null);
      setError("We could not reach the credit score service.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const bureaus = (
    Object.keys(BUREAU_LABELS) as (keyof ScoresResponse)[]
  ).filter((key) => typeof scores?.[key]?.score === "number");

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Credit Goals
          </h1>
          <p className="mt-2 text-gray-600 dark:text-slate-400">
            Where your score is now, and what people commonly aim for next.
          </p>
        </div>

        {error && (
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 mb-6 border border-amber-200 dark:border-amber-900/50">
            <p className="font-medium text-gray-900 dark:text-white mb-1">
              Your score is unavailable
            </p>
            <p className="text-sm text-gray-600 dark:text-slate-300">{error}</p>
          </div>
        )}

        {/* Real scores, per bureau, or an honest absence. */}
        {loading ? (
          <div className="h-28 bg-gray-200 dark:bg-slate-700 rounded-xl mb-8 animate-pulse" />
        ) : bureaus.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {bureaus.map((key) => (
              <div
                key={key}
                className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-5 text-center"
              >
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  {BUREAU_LABELS[key]}
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                  {scores?.[key]?.score}
                </p>
              </div>
            ))}
          </div>
        ) : (
          !error && (
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 mb-8 border border-gray-100 dark:border-slate-700">
              <p className="font-medium text-gray-900 dark:text-white mb-1">
                We do not have a score for you yet
              </p>
              <p className="text-sm text-gray-600 dark:text-slate-400">
                Once a bureau score is on your account it will show here.{" "}
                <Link
                  href="/dashboard/monitoring"
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Credit monitoring
                </Link>{" "}
                is where that starts.
              </p>
            </div>
          )
        )}

        {/*
          Replaces the invented in-flight goal and the "create goal" button.
          Saving a goal is not possible: no credit_goals table, no route, and
          goal-tracker-service.ts touches no database.
        */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 mb-8 border border-gray-100 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Saving a goal is not available yet
          </h2>
          <p className="text-sm text-gray-600 dark:text-slate-400">
            We cannot store a credit goal or track your progress against one
            yet, so we are not going to show you a goal you did not set. The
            targets below are here to read, not to save.
          </p>
        </div>

        {/* Goal templates — product guidance, no claim about this user. */}
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Goals people commonly set
        </h2>
        <div className="space-y-3">
          {GOAL_TEMPLATES.map((template) => (
            <div
              key={template.id}
              className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-5"
            >
              <div className="flex items-start justify-between gap-4 mb-2">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {template.title}
                </h3>
                <span
                  className={`px-2 py-0.5 text-xs font-medium rounded-full capitalize ${
                    DIFFICULTY_CLASSES[template.difficulty] ??
                    DIFFICULTY_CLASSES.beginner
                  }`}
                >
                  {template.difficulty}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-slate-300 mb-3">
                {template.description}
              </p>
              <div className="flex flex-wrap gap-4 text-xs text-gray-500 dark:text-slate-400">
                <span>
                  Typical target: +{template.targetScoreIncrease} points
                </span>
                <span>
                  Suggested timeframe: {template.suggestedTimeframeDays} days
                </span>
                <span>{template.milestones.length} milestones</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
