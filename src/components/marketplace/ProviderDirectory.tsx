/**
 * A marketplace provider directory, for one category.
 *
 * Shared by /marketplace/attorneys (category "legal") and
 * /marketplace/coaching (category "coaching"), which each previously carried a
 * hardcoded list of INVENTED PEOPLE — "Sarah Mitchell, Mitchell Consumer Law,
 * Los Angeles, CA, FCRA Violations, 4.9 from 127 reviews, 15 years, free
 * consultation". Somebody looking for help with a credit-report error could
 * have gone looking for her.
 *
 * They read GET /api/marketplace/providers?category=… instead, whose
 * MarketplaceProvider (marketplace-service.ts:28) is the real shape. It
 * describes a FIRM, not a person: name, description, website, rating,
 * reviewCount, bbbRating, yearsInBusiness, verified. There is no field for a
 * named individual, a location, a specialty list, or a consultation fee — the
 * mocks invented all four, and none is rendered here in their place.
 *
 * ON `verified`. The column exists and the seeded rows set it. It is the one
 * piece of standing this directory can honestly show, and the mock overwrote
 * that idea with star ratings nobody assigned. It is rendered plainly, and its
 * absence is rendered as absence rather than as a quiet pass.
 *
 * One component rather than two so the pages cannot come to disagree about
 * what "verified" means or how a missing rating is shown.
 */

"use client";

import { useState, useEffect, useCallback } from "react";

/** Mirrors MarketplaceProvider in marketplace-service.ts:28. */
export interface MarketplaceProvider {
  id: string;
  name: string;
  description: string | null;
  website: string | null;
  rating: number;
  reviewCount: number;
  bbbRating: string | null;
  yearsInBusiness: number | null;
  verified: boolean;
  category: string;
}

interface ProviderDirectoryProps {
  /** A value of marketplace_providers.category — "legal", "coaching", … */
  category: string;
  title: string;
  subtitle: string;
  /** Shown when the directory is empty. Names what is missing, in its terms. */
  emptyTitle: string;
  emptyBody: string;
  /**
   * Standing editorial copy — e.g. when it is worth consulting a lawyer at
   * all. Written by us about the category, not a claim about any listing, so
   * it survives whether or not anyone is listed.
   */
  note?: React.ReactNode;
}

export default function ProviderDirectory({
  category,
  title,
  subtitle,
  emptyTitle,
  emptyBody,
  note,
}: ProviderDirectoryProps) {
  const [providers, setProviders] = useState<MarketplaceProvider[]>([]);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/marketplace/providers?category=${encodeURIComponent(category)}`,
      );
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setProviders([]);
        setError(
          "We could not load this directory. Nobody is listed in the meantime — try again in a moment.",
        );
      } else {
        setProviders(
          Array.isArray(json?.data)
            ? (json.data as MarketplaceProvider[])
            : [],
        );
      }
    } catch {
      setProviders([]);
      setError("We could not reach the marketplace service.");
    }
    setLoading(false);
  }, [category]);

  useEffect(() => {
    load();
  }, [load]);

  const visible = verifiedOnly
    ? providers.filter((provider) => provider.verified)
    : providers;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {title}
        </h1>
        <p className="text-gray-600 dark:text-slate-300">{subtitle}</p>
      </div>

      {note}

      {error && (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-amber-200 dark:border-amber-900/50">
          <p className="font-medium text-gray-900 dark:text-white mb-1">
            This directory is unavailable
          </p>
          <p className="text-sm text-gray-600 dark:text-slate-300">{error}</p>
        </div>
      )}

      {!loading && providers.length > 0 && (
        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-200">
          <input
            type="checkbox"
            checked={verifiedOnly}
            onChange={(e) => setVerifiedOnly(e.target.checked)}
            className="rounded"
          />
          Verified only
        </label>
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
      ) : visible.length === 0 ? (
        !error && (
          <div className="bg-white dark:bg-slate-800 rounded-xl p-8 border border-gray-200 dark:border-slate-700">
            <p className="font-medium text-gray-900 dark:text-white mb-1">
              {providers.length === 0 ? emptyTitle : "None are verified yet"}
            </p>
            <p className="text-sm text-gray-600 dark:text-slate-300">
              {providers.length === 0
                ? emptyBody
                : "Turn off the verified filter to see everyone listed."}
            </p>
          </div>
        )
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {visible.map((provider) => (
            <article
              key={provider.id}
              className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <h2 className="font-semibold text-gray-900 dark:text-white">
                  {provider.name}
                </h2>
                {provider.verified && (
                  <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 shrink-0">
                    Verified
                  </span>
                )}
              </div>

              {provider.description && (
                <p className="text-sm text-gray-600 dark:text-slate-300">
                  {provider.description}
                </p>
              )}

              <dl className="grid grid-cols-2 gap-3 text-sm mt-4">
                <div>
                  <dt className="text-gray-500 dark:text-slate-400">Rating</dt>
                  <dd className="font-medium text-gray-900 dark:text-white">
                    {provider.reviewCount > 0
                      ? `${provider.rating.toFixed(1)} from ${provider.reviewCount} reviews`
                      : "No ratings yet"}
                  </dd>
                </div>
                {provider.bbbRating && (
                  <div>
                    <dt className="text-gray-500 dark:text-slate-400">BBB</dt>
                    <dd className="font-medium text-gray-900 dark:text-white">
                      {provider.bbbRating}
                    </dd>
                  </div>
                )}
                {typeof provider.yearsInBusiness === "number" && (
                  <div>
                    <dt className="text-gray-500 dark:text-slate-400">
                      In business
                    </dt>
                    <dd className="font-medium text-gray-900 dark:text-white">
                      {provider.yearsInBusiness}{" "}
                      {provider.yearsInBusiness === 1 ? "year" : "years"}
                    </dd>
                  </div>
                )}
              </dl>

              {provider.website && (
                <a
                  href={provider.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                >
                  Visit their site
                </a>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
