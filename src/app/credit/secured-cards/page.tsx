"use client";

/**
 * Secured Card Finder.
 *
 * WHAT THIS PAGE USED TO DO.
 *
 * `MOCK_RECOMMENDATIONS` was a hardcoded list and the file contained no fetch
 * at all. Each entry carried a `matchScore`, an `approvalLikelihood` of
 * high/medium/low, and a `projectedScoreImpact` — claims about THE USER ("you
 * are likely to be approved", "this will move your score by N points").
 * Nothing computed any of them. Same shape as the `priority` badge removed
 * from /insights/alerts: a number with no source, sitting beside real ones so
 * it reads as measured.
 *
 * It also kept its own copy of the card terms. The same products are described
 * in `credit-builder-service.ts:104` with different field names and different
 * numbers — the page said `rewardsRate: 2` and `graduationTimeMonths: 8`, the
 * service says `apr: 28.24` and `reporting: [...]`. Two sources of truth for
 * the terms of somebody else's financial products, free to drift apart and
 * away from reality.
 *
 * WHAT IT DOES NOW. Reads GET /api/credit-builder/secured-cards (withAuth,
 * returns `{ success, cards }`), which is fed by that service. One source
 * instead of two, and the invented personalisation is gone.
 *
 * ON `recommended` AND `aiReasoning`. Both come from the route and their
 * provenance is mixed, so the UI frames them as Fynvita's own view rather than
 * as analysis of the caller:
 *   - the first card's `recommended` is the literal `true`
 *     (credit-builder-service.ts:772);
 *   - the second's is `userScore.overall < 60` (:793), genuinely derived from
 *     the caller's credit-builder score;
 *   - `aiReasoning` is a fixed string per card despite the name. No model
 *     writes it, so it is not labelled as AI here.
 *
 * TWO DEAD CONTROLS ARE GONE. `selectedGoal` was read in exactly one place, to
 * colour the selected chip; `depositAmount` was a slider that displayed its own
 * value. Neither filtered, sorted, or was sent anywhere — picking "Rebuild
 * Credit" or dragging the deposit changed nothing at all. The route takes no
 * goal or deposit parameter and the cards carry no goal field, so making them
 * work would mean inventing which card suits which goal. Same call as the
 * "Paste Text" button on /marketplace/analysis: a control that cannot do the
 * thing is the defect, not a feature to preserve. They return when the route
 * accepts the parameters.
 *
 * STILL OPEN, and deliberately not papered over: those card terms are a
 * constant inside a service, with no source and no "rates as of" date. APRs on
 * real cards move. The right home is the Wave 6 affiliate feed
 * (/api/affiliate/offers) or a maintained table. Until then the page tells the
 * user to confirm terms with the issuer, which is true rather than reassuring.
 */

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  CreditCard,
  Shield,
  Star,
  CheckCircle,
  Info,
  TrendingUp,
} from "lucide-react";

/** Mirrors SecuredCard in src/lib/credit-builder/credit-builder-service.ts:104. */
interface SecuredCard {
  id: string;
  provider: string;
  name: string;
  minDeposit: number;
  maxDeposit: number;
  apr: number;
  annualFee: number;
  rewards?: string;
  graduationPath: boolean;
  creditLineIncrease: boolean;
  reporting: string[];
  benefits: string[];
  recommended: boolean;
  aiReasoning?: string;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function SecuredCardsPage() {
  const [cards, setCards] = useState<SecuredCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/credit-builder/secured-cards");
      const json = await res.json().catch(() => null);
      if (!res.ok || !Array.isArray(json?.cards)) {
        setCards([]);
        setError(
          "We could not load card options right now. Nothing here is filled in for you — try again in a moment.",
        );
      } else {
        setCards(json.cards as SecuredCard[]);
      }
    } catch {
      setCards([]);
      setError("We could not reach the card service.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <CreditCard className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Secured Card Finder
            </h1>
          </div>
          <p className="text-gray-600 dark:text-slate-400">
            Secured cards that report to the bureaus, so using one builds
            history.
          </p>
        </div>

        {error && (
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 mb-6 border border-amber-200 dark:border-amber-900/50">
            <p className="font-medium text-gray-900 dark:text-white mb-1">
              Card options are unavailable
            </p>
            <p className="text-sm text-gray-600 dark:text-slate-300">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="space-y-4 animate-pulse">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-56 bg-gray-200 dark:bg-slate-700 rounded-xl"
              />
            ))}
          </div>
        ) : cards.length === 0 && !error ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl p-10 text-center border border-gray-100 dark:border-slate-700">
            <CreditCard className="w-8 h-8 text-gray-400 dark:text-slate-500 mx-auto mb-3" />
            <p className="font-medium text-gray-900 dark:text-white">
              No card options yet
            </p>
            <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">
              We have nothing to show you here at the moment.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {cards.map((card, index) => (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm border p-6 ${
                  card.recommended
                    ? "border-blue-300 dark:border-blue-800"
                    : "border-gray-100 dark:border-slate-700"
                }`}
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {card.name}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-slate-400">
                      {card.provider}
                    </p>
                  </div>
                  {card.recommended && (
                    <span className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                      <Star className="w-3 h-3" />
                      Our pick
                    </span>
                  )}
                </div>

                {/* Terms exactly as held. No derived scores. */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-slate-400">
                      Deposit
                    </p>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(card.minDeposit)}–
                      {formatCurrency(card.maxDeposit)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-slate-400">
                      Annual fee
                    </p>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {card.annualFee === 0
                        ? "None"
                        : formatCurrency(card.annualFee)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-slate-400">
                      APR
                    </p>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {card.apr}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-slate-400">
                      Upgrade path
                    </p>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {card.graduationPath ? "Yes" : "No"}
                    </p>
                  </div>
                </div>

                {card.rewards && (
                  <p className="text-sm text-gray-600 dark:text-slate-300 mb-4">
                    <span className="font-medium text-gray-900 dark:text-white">
                      Rewards:{" "}
                    </span>
                    {card.rewards}
                  </p>
                )}

                {card.reporting.length > 0 && (
                  <div className="flex items-center gap-2 mb-4 flex-wrap">
                    <Shield className="w-4 h-4 text-gray-400 dark:text-slate-500" />
                    <span className="text-sm text-gray-600 dark:text-slate-300">
                      Reports to
                    </span>
                    {card.reporting.map((bureau) => (
                      <span
                        key={bureau}
                        className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300"
                      >
                        {bureau}
                      </span>
                    ))}
                  </div>
                )}

                {card.benefits.length > 0 && (
                  <ul className="space-y-1 mb-4">
                    {card.benefits.map((benefit) => (
                      <li
                        key={benefit}
                        className="flex items-start gap-2 text-sm text-gray-600 dark:text-slate-300"
                      >
                        <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-emerald-500" />
                        {benefit}
                      </li>
                    ))}
                  </ul>
                )}

                {card.creditLineIncrease && (
                  <p className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-300 mb-4">
                    <TrendingUp className="w-4 h-4 text-gray-400 dark:text-slate-500" />
                    Credit line increases available
                  </p>
                )}

                {/*
                  Labelled as our view, not as analysis of this user:
                  aiReasoning is a fixed string per card and no model writes it.
                */}
                {card.aiReasoning && (
                  <div className="rounded-lg bg-gray-50 dark:bg-slate-700/40 p-3">
                    <p className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">
                      Why we list it
                    </p>
                    <p className="text-sm text-gray-700 dark:text-slate-200">
                      {card.aiReasoning}
                    </p>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}

        {/*
          These terms are held by Fynvita, not fetched from the issuer, and
          carry no as-of date. Saying so is the honest handling until the
          affiliate feed supplies them.
        */}
        {cards.length > 0 && (
          <p className="mt-6 text-xs text-gray-500 dark:text-slate-400">
            Rates and terms are shown as we hold them and can change. Confirm
            the current terms with the card issuer before applying.
          </p>
        )}

        {/* Tips Section */}
        <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-4 flex items-center gap-2">
            <Info className="w-5 h-5" />
            Tips for Success
          </h3>
          <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              Keep your utilization below 30% of your credit limit
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              Set up autopay to never miss a payment
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              Use your card for at least one small purchase monthly
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              Pay your balance in full each month to avoid interest
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              Request credit limit increases after 6 months of good behavior
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
