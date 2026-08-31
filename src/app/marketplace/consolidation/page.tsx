/**
 * Debt Consolidation Options.
 *
 * WHAT THIS PAGE USED TO SHOW, WITH NO FETCH IN THE FILE.
 *
 * `mockOptions` invented lender offers and named real institutions with
 * specific terms: "SoFi — personal, $5,000–$100,000, APR 8.99% – 25.81%, 2–7
 * years, No fees", "Marcus by Goldman Sachs — 6.99% – 28.99%", each with a
 * star rating nobody assigned. On a page whose next control is a comparison,
 * these read as offers the user could act on.
 *
 * WHY IT WAS THERE, and this is the part worth knowing. The real route exists:
 * GET /api/affiliate/offers?category=loan, backed by loanMatcher and a
 * compliance checker. It returns NOTHING — and it is honest about that. All
 * three affiliate matchers stub their catalogue:
 *
 *   loan-matcher.ts:412        getLoanProducts()       -> return []
 *   credit-card-matcher.ts:486 getCreditCardProducts() -> return []
 *   insurance-matcher.ts:370   getInsuranceProducts()  -> return []
 *
 * each with the same comment: "In production this would call
 * moneyLionClient.getProductCatalog(...)". `moneylion-client.ts:42` implements
 * that method, and nothing calls it. So the affiliate product catalogue never
 * reaches the matchers, and the hardcoded lenders were papering over a feature
 * that is not connected. Recorded in full as task #105.
 *
 * So this page now shows what is true: no offers, and a plain statement of
 * why. That is the point of removing the mock — the disconnection becomes
 * visible instead of being hidden behind SoFi.
 *
 * ON DISCLOSURE. Affiliate loan offers carry disclosure obligations, which is
 * why both the live stack and the stranded one have disclosure machinery. A
 * hardcoded lender card showed an APR range with no disclosure attached and no
 * click tracking. Real offers arrive with `clickUrl` and a commission record,
 * so when the catalogue is connected the compliance path comes with them.
 */

"use client";

import { useState, useEffect, useCallback } from "react";

/** Mirrors MoneyLionProductTerms in src/lib/affiliate/types.ts:37. */
interface ProductTerms {
  apr?: { min: number; max: number; type: "fixed" | "variable" };
  loanAmount?: { min: number; max: number };
  term?: { min: number; max: number; unit: "months" | "years" };
  annualFee?: number;
}

/** Mirrors MoneyLionProduct in src/lib/affiliate/types.ts:22. */
interface Product {
  productId: string;
  name: string;
  partner: string;
  description?: string;
  terms?: ProductTerms;
  clickUrl?: string;
  featured?: boolean;
}

/** Mirrors LoanRecommendation in src/lib/affiliate/loan-matcher.ts:22. */
interface LoanRecommendation {
  product: Product;
  loanType: string;
  eligible: boolean;
  highlights?: string[];
  estimatedMonthlyPayment?: number;
}

const LOAN_TYPES = [
  { value: "all", label: "All options" },
  { value: "personal", label: "Personal loan" },
  { value: "debt_consolidation", label: "Debt consolidation" },
] as const;

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);

function formatApr(terms?: ProductTerms): string {
  if (!terms?.apr) return "";
  const { min, max, type } = terms.apr;
  const range = min === max ? `${min}%` : `${min}% – ${max}%`;
  return type ? `${range} ${type}` : range;
}

function formatAmount(terms?: ProductTerms): string {
  if (!terms?.loanAmount) return "";
  return `${formatCurrency(terms.loanAmount.min)} – ${formatCurrency(terms.loanAmount.max)}`;
}

function formatTerm(terms?: ProductTerms): string {
  if (!terms?.term) return "";
  const { min, max, unit } = terms.term;
  return min === max ? `${min} ${unit}` : `${min}–${max} ${unit}`;
}

export default function ConsolidationPage() {
  const [offers, setOffers] = useState<LoanRecommendation[]>([]);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query =
        typeFilter === "all"
          ? "category=loan"
          : `category=loan&subType=${encodeURIComponent(typeFilter)}`;
      const res = await fetch(`/api/affiliate/offers?${query}`);
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setOffers([]);
        setError(
          "We could not load consolidation options. Nothing here is filled in for you — try again in a moment.",
        );
      } else {
        setOffers(
          Array.isArray(json?.data?.loans)
            ? (json.data.loans as LoanRecommendation[])
            : [],
        );
      }
    } catch {
      setOffers([]);
      setError("We could not reach the offers service.");
    }
    setLoading(false);
  }, [typeFilter]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Debt Consolidation
        </h1>
        <p className="text-gray-600 dark:text-slate-300">
          Compare options to consolidate and lower your debt payments
        </p>
      </div>

      {error && (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-amber-200 dark:border-amber-900/50">
          <p className="font-medium text-gray-900 dark:text-white mb-1">
            Consolidation options are unavailable
          </p>
          <p className="text-sm text-gray-600 dark:text-slate-300">{error}</p>
        </div>
      )}

      <div className="flex gap-2">
        {LOAN_TYPES.map((type) => (
          <button
            key={type.value}
            onClick={() => setTypeFilter(type.value)}
            className={`px-4 py-2 rounded-lg text-sm ${
              typeFilter === type.value
                ? "bg-blue-600 text-white"
                : "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-200"
            }`}
          >
            {type.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-44 bg-gray-200 dark:bg-slate-700 rounded-xl"
            />
          ))}
        </div>
      ) : offers.length === 0 ? (
        !error && (
          <div className="bg-white dark:bg-slate-800 rounded-xl p-8 border border-gray-200 dark:border-slate-700">
            <p className="font-medium text-gray-900 dark:text-white mb-1">
              No consolidation offers available
            </p>
            <p className="text-sm text-gray-600 dark:text-slate-300">
              We are not connected to a lending partner yet, so we have no rates
              to compare for you. We would rather show you nothing than a rate
              we made up.
            </p>
          </div>
        )
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {offers.map((offer) => (
            <div
              key={offer.product.productId}
              className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <h2 className="font-semibold text-gray-900 dark:text-white">
                    {offer.product.name}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    {offer.product.partner}
                  </p>
                </div>
                {offer.product.featured && (
                  <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                    Featured
                  </span>
                )}
              </div>

              <dl className="grid grid-cols-2 gap-3 text-sm mb-3">
                {formatApr(offer.product.terms) && (
                  <div>
                    <dt className="text-gray-500 dark:text-slate-400">APR</dt>
                    <dd className="font-medium text-gray-900 dark:text-white">
                      {formatApr(offer.product.terms)}
                    </dd>
                  </div>
                )}
                {formatAmount(offer.product.terms) && (
                  <div>
                    <dt className="text-gray-500 dark:text-slate-400">Amount</dt>
                    <dd className="font-medium text-gray-900 dark:text-white">
                      {formatAmount(offer.product.terms)}
                    </dd>
                  </div>
                )}
                {formatTerm(offer.product.terms) && (
                  <div>
                    <dt className="text-gray-500 dark:text-slate-400">Term</dt>
                    <dd className="font-medium text-gray-900 dark:text-white">
                      {formatTerm(offer.product.terms)}
                    </dd>
                  </div>
                )}
                {typeof offer.estimatedMonthlyPayment === "number" && (
                  <div>
                    <dt className="text-gray-500 dark:text-slate-400">
                      Est. monthly
                    </dt>
                    <dd className="font-medium text-gray-900 dark:text-white">
                      {formatCurrency(offer.estimatedMonthlyPayment)}
                    </dd>
                  </div>
                )}
              </dl>

              {(offer.highlights ?? []).length > 0 && (
                <ul className="text-sm text-gray-600 dark:text-slate-300 space-y-1">
                  {(offer.highlights ?? []).map((highlight) => (
                    <li key={highlight}>{highlight}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
