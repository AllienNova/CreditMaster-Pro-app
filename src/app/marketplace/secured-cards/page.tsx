/**
 * Secured Card Comparison.
 *
 * WHAT THIS PAGE SHOWED, WITH NO FETCH IN THE FILE.
 *
 * `mockCards` was a catalogue of real, named products with terms attached —
 * "Discover it® Secured, Discover, $0 annual fee, $200-$2,500 deposit, 28.24%
 * APR, 2% cash back on gas/restaurants", "Capital One Platinum Secured" — each
 * carrying a `rating` (4.8) nobody assigned and a `recommended` flag nobody
 * set. Quoting an APR and a deposit range for a card the reader might apply
 * for is a claim about a product's terms; getting it wrong is not cosmetic.
 *
 * Above the grid sat a banner: "Based on your profile, we recommend the
 * Discover it® Secured for its cash back rewards and $0 annual fee." No
 * profile was read. That is a personalised product recommendation with nothing
 * behind the word "your".
 *
 * WHY THE GATE NEVER CAUGHT IT. audit:screen-data looks for the constant being
 * rendered, and this one reached the JSX through an alias:
 *
 *   const filteredCards = mockCards.filter(...).sort(...)
 *   ... filteredCards.map(...)
 *
 * so `mockCards` never appeared as `mockCards.map(`, and no run reported the
 * file — full, directory-scoped, or copied to an isolated probe. One
 * `.filter()` hid it permanently. Recorded as task #108; until the detector
 * follows aliases, a clean result means "no fabrication among the constants it
 * detects", which is not the same claim.
 *
 * WHAT IS SHOWN NOW. GET /api/credit-builder/secured-cards — the same route the
 * sibling screen at /credit/secured-cards already used, returning cards from
 * creditBuilderService for the signed-in caller. Its SecuredCard carries a real
 * `recommended` flag and `aiReasoning`, so the suggestion survives: it names
 * the card the service picked, gives the service's own reason, and does not
 * render at all when nothing is recommended.
 *
 * The "Highest Rated" sort went with the invented ratings — the real type has
 * no rating field, so sorting is by terms that exist. "Apply Now" and "Details"
 * are gone; neither had an onClick.
 */

"use client";

import { useState, useEffect, useCallback } from "react";

/** Mirrors the SecuredCard returned by /api/credit-builder/secured-cards. */
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

type SortKey = "fee" | "deposit" | "apr";

const SORT_LABELS: Record<SortKey, string> = {
  fee: "Lowest annual fee",
  deposit: "Lowest deposit",
  apr: "Lowest APR",
};

const currency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);

function CardRow({ card }: { card: SecuredCard }) {
  return (
    <article className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <h2 className="font-semibold text-gray-900 dark:text-white">
            {card.name}
          </h2>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            {card.provider}
          </p>
        </div>
        {card.recommended && (
          <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 shrink-0">
            Recommended
          </span>
        )}
      </div>

      <dl className="grid grid-cols-2 gap-3 text-sm mt-4">
        <div>
          <dt className="text-gray-500 dark:text-slate-400">Annual fee</dt>
          <dd className="font-medium text-gray-900 dark:text-white">
            {card.annualFee === 0 ? "None" : currency(card.annualFee)}
          </dd>
        </div>
        <div>
          <dt className="text-gray-500 dark:text-slate-400">Deposit</dt>
          <dd className="font-medium text-gray-900 dark:text-white">
            {currency(card.minDeposit)} – {currency(card.maxDeposit)}
          </dd>
        </div>
        <div>
          <dt className="text-gray-500 dark:text-slate-400">APR</dt>
          <dd className="font-medium text-gray-900 dark:text-white">
            {card.apr}%
          </dd>
        </div>
        {card.rewards && (
          <div>
            <dt className="text-gray-500 dark:text-slate-400">Rewards</dt>
            <dd className="font-medium text-gray-900 dark:text-white">
              {card.rewards}
            </dd>
          </div>
        )}
      </dl>

      {card.reporting.length > 0 && (
        <p className="text-sm text-gray-600 dark:text-slate-300 mt-3">
          Reports to {card.reporting.join(", ")}
        </p>
      )}

      {(card.graduationPath || card.creditLineIncrease) && (
        <ul className="text-sm text-gray-600 dark:text-slate-300 mt-2 space-y-1">
          {card.graduationPath && <li>Can graduate to an unsecured card</li>}
          {card.creditLineIncrease && <li>Credit line increases available</li>}
        </ul>
      )}

      {card.benefits.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {card.benefits.map((benefit) => (
            <span
              key={benefit}
              className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-200 rounded"
            >
              {benefit}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}

export default function SecuredCardsPage() {
  const [cards, setCards] = useState<SecuredCard[]>([]);
  const [sortBy, setSortBy] = useState<SortKey>("fee");
  const [showNoFeeOnly, setShowNoFeeOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/credit-builder/secured-cards");
      const json = await res.json().catch(() => null);
      if (!res.ok || !Array.isArray(json?.cards)) {
        setCards([]);
        setError(
          "We could not load card options right now. No cards or terms are filled in for you — try again in a moment.",
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

  const visible = cards
    .filter((card) => !showNoFeeOnly || card.annualFee === 0)
    .sort((a, b) => {
      if (sortBy === "fee") return a.annualFee - b.annualFee;
      if (sortBy === "apr") return a.apr - b.apr;
      return a.minDeposit - b.minDeposit;
    });

  const recommended = cards.find((card) => card.recommended);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Secured Credit Cards
        </h1>
        <p className="text-gray-600 dark:text-slate-300">
          Cards that report to the bureaus, so using one builds history
        </p>
      </div>

      {error && (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-amber-200 dark:border-amber-900/50">
          <p className="font-medium text-gray-900 dark:text-white mb-1">
            Card options are unavailable
          </p>
          <p className="text-sm text-gray-600 dark:text-slate-300">{error}</p>
        </div>
      )}

      {recommended && (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-blue-200 dark:border-blue-900/50">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-1">
            Suggested for you: {recommended.name}
          </h2>
          <p className="text-sm text-gray-600 dark:text-slate-300">
            {recommended.aiReasoning ??
              "Picked from the cards below on the terms shown."}
          </p>
        </div>
      )}

      {!loading && cards.length > 0 && (
        <div className="flex flex-wrap items-center gap-4 bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-slate-700">
          <label className="text-sm text-gray-700 dark:text-slate-200">
            Sort by{" "}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              className="ml-2 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm"
            >
              {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
                <option key={key} value={key}>
                  {SORT_LABELS[key]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-200">
            <input
              type="checkbox"
              checked={showNoFeeOnly}
              onChange={(e) => setShowNoFeeOnly(e.target.checked)}
              className="rounded"
            />
            No annual fee only
          </label>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-56 bg-gray-200 dark:bg-slate-700 rounded-xl"
            />
          ))}
        </div>
      ) : visible.length === 0 ? (
        !error && (
          <div className="bg-white dark:bg-slate-800 rounded-xl p-8 border border-gray-200 dark:border-slate-700">
            <p className="font-medium text-gray-900 dark:text-white mb-1">
              {cards.length === 0
                ? "No secured cards to compare yet"
                : "No cards match that filter"}
            </p>
            <p className="text-sm text-gray-600 dark:text-slate-300">
              {cards.length === 0
                ? "Card terms are not something to show you a sample of, so nothing is listed until we have real ones."
                : "Try turning off the no-annual-fee filter."}
            </p>
          </div>
        )
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {visible.map((card) => (
            <CardRow key={card.id} card={card} />
          ))}
        </div>
      )}
    </div>
  );
}
