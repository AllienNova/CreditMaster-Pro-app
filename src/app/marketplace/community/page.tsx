/**
 * Community.
 *
 * WHAT THIS PAGE PUBLISHED, WITH NO FETCH IN THE FILE.
 *
 * `mockStories` was three testimonials with credit-score outcomes attributed
 * to named members:
 *
 *   CreditWarrior   520 -> 720 in 8 months
 *   DebtFreeJourney 580 -> 750 in 12 months
 *   NewBeginnings   490 -> 680 in 6 months
 *
 * Those people do not exist and those results never happened. Fynvita is a
 * credit-education company; invented before-and-after score claims are the
 * single most consequential fabrication found in this sweep. Everything else
 * removed here misinforms a reader — this misrepresents what the product
 * achieves, to a prospective customer, in the form regulators care about most.
 * It is not a placeholder to swap for better copy later: no such testimonial
 * may be shown unless a real member said it and can be shown to have said it.
 *
 * `mockPosts` was the same in a smaller way — a forum with four threads, named
 * authors, and engagement counts (245 likes, 47 replies) presenting a busy
 * community to someone deciding whether to join one.
 *
 * THERE IS NO FORUM. No posts table, no comments table, no thread route, no
 * service. The "New Post" button had no onClick. The discussion board is not a
 * feature that exists in any form.
 *
 * WHAT IS REAL, AND WAS UNREACHABLE. `community_challenges` and
 * `user_challenge_participation` are real tables (20260120000000:116,131),
 * `CommunityChallengesService` is a complete implementation, and
 * GET /api/gamification/challenges has always returned live challenges with
 * participant counts and the reader's own progress. Nothing in the app called
 * it. That is the fifth built-but-unreachable feature this sweep — and here it
 * sat directly behind a page inventing a community.
 *
 * So this page now shows the community that exists: its challenges. Joining
 * works too — `joinChallenge` was equally complete and equally unreachable, so
 * this commit adds POST /api/gamification/challenges/[id]/join.
 *
 * Discussions and member stories are named as not open rather than quietly
 * dropped, because a reader who saw the old page should be able to tell what
 * happened to it.
 */

"use client";

import { useState, useEffect, useCallback } from "react";

/** Mirrors the projection built in api/gamification/challenges/route.ts:27. */
interface Challenge {
  id: string;
  name: string;
  description: string;
  type: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  goalValue: number | null;
  goalUnit: string | null;
  participants: number | null;
  xpReward: number | null;
  userJoined: boolean;
  userProgress?: number | null;
}

const TYPE_LABELS: Record<string, string> = {
  savings: "Savings",
  no_spend: "No-spend",
  debt_payoff: "Debt payoff",
  credit_improvement: "Credit improvement",
  investment: "Investment",
};

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      });
}

function goalText(challenge: Challenge): string {
  if (challenge.goalValue === null || challenge.goalValue === undefined) {
    return "";
  }
  const value = challenge.goalValue.toLocaleString();
  return challenge.goalUnit ? `${value} ${challenge.goalUnit}` : value;
}

export default function CommunityPage() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/gamification/challenges?status=active");
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setChallenges([]);
        setError(
          "We could not load community challenges. Nothing is shown in their place — try again in a moment.",
        );
      } else {
        setChallenges(
          Array.isArray(json?.challenges) ? (json.challenges as Challenge[]) : [],
        );
      }
    } catch {
      setChallenges([]);
      setError("We could not reach the community service.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const join = useCallback(
    async (challengeId: string) => {
      setJoining(challengeId);
      setJoinError(null);
      try {
        const res = await fetch(
          `/api/gamification/challenges/${encodeURIComponent(challengeId)}/join`,
          { method: "POST" },
        );
        const json = await res.json().catch(() => null);
        if (!res.ok) {
          // The route's messages are the member's own facts — already
          // joined, challenge closed, challenge full. Show what it said.
          setJoinError(
            typeof json?.error === "string"
              ? json.error
              : "We could not join you to that challenge.",
          );
        } else {
          await load();
        }
      } catch {
        setJoinError("We could not reach the community service.");
      }
      setJoining(null);
    },
    [load],
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Community
        </h1>
        <p className="text-gray-600 dark:text-slate-300">
          Challenges you can take on alongside other members
        </p>
      </div>

      {error && (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-amber-200 dark:border-amber-900/50">
          <p className="font-medium text-gray-900 dark:text-white mb-1">
            Challenges are unavailable
          </p>
          <p className="text-sm text-gray-600 dark:text-slate-300">{error}</p>
        </div>
      )}

      {joinError && (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-amber-200 dark:border-amber-900/50">
          <p className="text-sm text-gray-700 dark:text-slate-200">
            {joinError}
          </p>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-40 bg-gray-200 dark:bg-slate-700 rounded-xl"
            />
          ))}
        </div>
      ) : challenges.length === 0 ? (
        !error && (
          <div className="bg-white dark:bg-slate-800 rounded-xl p-8 border border-gray-200 dark:border-slate-700">
            <p className="font-medium text-gray-900 dark:text-white mb-1">
              No challenges are running right now
            </p>
            <p className="text-sm text-gray-600 dark:text-slate-300">
              When one opens it appears here.
            </p>
          </div>
        )
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {challenges.map((challenge) => (
            <article
              key={challenge.id}
              className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700 flex flex-col"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <h2 className="font-semibold text-gray-900 dark:text-white">
                  {challenge.name}
                </h2>
                <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 shrink-0">
                  {TYPE_LABELS[challenge.type] ?? challenge.type}
                </span>
              </div>

              <p className="text-sm text-gray-600 dark:text-slate-300">
                {challenge.description}
              </p>

              <dl className="grid grid-cols-2 gap-3 text-sm mt-4">
                {goalText(challenge) && (
                  <div>
                    <dt className="text-gray-500 dark:text-slate-400">Goal</dt>
                    <dd className="font-medium text-gray-900 dark:text-white">
                      {goalText(challenge)}
                    </dd>
                  </div>
                )}
                {typeof challenge.participants === "number" && (
                  <div>
                    <dt className="text-gray-500 dark:text-slate-400">
                      Taking part
                    </dt>
                    <dd className="font-medium text-gray-900 dark:text-white">
                      {challenge.participants}
                    </dd>
                  </div>
                )}
                {typeof challenge.xpReward === "number" &&
                  challenge.xpReward > 0 && (
                    <div>
                      <dt className="text-gray-500 dark:text-slate-400">XP</dt>
                      <dd className="font-medium text-gray-900 dark:text-white">
                        {challenge.xpReward}
                      </dd>
                    </div>
                  )}
                {formatDate(challenge.endDate) && (
                  <div>
                    <dt className="text-gray-500 dark:text-slate-400">Ends</dt>
                    <dd className="font-medium text-gray-900 dark:text-white">
                      {formatDate(challenge.endDate)}
                    </dd>
                  </div>
                )}
              </dl>

              <div className="mt-4">
                {challenge.userJoined ? (
                  <p className="text-sm text-emerald-600 dark:text-emerald-400">
                    You have joined
                    {typeof challenge.userProgress === "number" &&
                      ` — ${challenge.userProgress.toLocaleString()} so far`}
                  </p>
                ) : (
                  <button
                    onClick={() => join(challenge.id)}
                    disabled={joining === challenge.id}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-60"
                  >
                    {joining === challenge.id ? "Joining…" : "Join challenge"}
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      <section className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700">
        <h2 className="font-medium text-gray-900 dark:text-white mb-1">
          Discussions and member stories
        </h2>
        <p className="text-sm text-gray-600 dark:text-slate-300">
          There is no discussion board yet, and we publish no member success
          stories. When members share their own results, those will be their
          words — we will not write them.
        </p>
      </section>
    </div>
  );
}
