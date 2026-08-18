/**
 * Education Library.
 *
 * WHAT THIS PAGE USED TO TELL EVERY READER ABOUT THEIR OWN LEARNING.
 *
 * `mockCourses` carried a `progress` field: 75, 30, 0, 100, 50. Everyone who
 * opened this page was told they were 75% through "Credit Score Fundamentals"
 * and had FINISHED "Credit Report Deep Dive" — complete with a progress bar and
 * a button reading "Continue" or "Review". Nobody had finished anything. There
 * is no enrolment table, no lesson store, no progress column anywhere in the
 * schema, and the button had no onClick: it was painted, not wired.
 *
 * `mockArticles` was the same shape one level down — five titles with excerpts,
 * read times and dates, none of which exist as content.
 *
 * WHAT WAS ACTUALLY THERE. `marketplace_products` has an `education` category
 * and a seeded row (migration 20251218000000:416):
 *
 *   Credit Mastery Course — Credit Academy — $199 one-time — 4.9 (287)
 *   features: {"modules": 12, "hours": 24, "certificate": true,
 *              "lifetime_access": true}
 *
 * GET /api/marketplace/products?category=education has served that all along.
 * So this is the fourth built-but-unreachable feature this sweep has turned up:
 * a real catalogue sitting behind five invented courses.
 *
 * WHAT IS GONE AND NOT REPLACED. The course/article surface — durations, lesson
 * counts, levels, thumbnails, progress — has no backing store, so none of it is
 * rendered from a substitute. Fynvita publishes no written guides today, and
 * the page says that plainly rather than keeping an Articles tab that could
 * only ever be empty.
 *
 * ON THE PROVIDER. `getProducts` is `select("*")` with no join
 * (marketplace-service.ts:56) and `mapToProduct` never sets `provider`, so the
 * seller's name is not available on this route. Rather than print an empty
 * byline, this page shows none — a course whose seller is blank invites the
 * reader to assume Fynvita wrote it.
 */

"use client";

import { useState, useEffect, useCallback } from "react";

import {
  PRICE_CADENCE,
  listFeatures,
} from "@/lib/marketplace/product-features";

/** Mirrors MarketplaceProduct in marketplace-service.ts:13. */
interface EducationProduct {
  id: string;
  name: string;
  description: string | null;
  price: number;
  priceType: string;
  rating: number;
  reviewCount: number;
  included: string[];
}

function mapProduct(product: Record<string, unknown>): EducationProduct {
  return {
    id: String(product.id ?? product.name ?? ""),
    name: String(product.name ?? ""),
    description:
      typeof product.description === "string" ? product.description : null,
    price: Number(product.price ?? 0),
    priceType: String(product.priceType ?? ""),
    rating: Number(product.rating ?? 0),
    reviewCount: Number(product.reviewCount ?? 0),
    included: listFeatures(product.features),
  };
}

export default function EducationPage() {
  const [courses, setCourses] = useState<EducationProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/marketplace/products?category=education");
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setCourses([]);
        setError(
          "We could not load the education catalogue. Nothing here is stood in for it — try again in a moment.",
        );
      } else {
        setCourses(
          Array.isArray(json?.data)
            ? (json.data as Record<string, unknown>[]).map(mapProduct)
            : [],
        );
      }
    } catch {
      setCourses([]);
      setError("We could not reach the education catalogue.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Education Library
        </h1>
        <p className="text-gray-600 dark:text-slate-300">
          Credit and financial-literacy courses offered through the marketplace
        </p>
      </div>

      {error && (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-amber-200 dark:border-amber-900/50">
          <p className="font-medium text-gray-900 dark:text-white mb-1">
            The catalogue is unavailable
          </p>
          <p className="text-sm text-gray-600 dark:text-slate-300">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-52 bg-gray-200 dark:bg-slate-700 rounded-xl"
            />
          ))}
        </div>
      ) : courses.length === 0 ? (
        !error && (
          <div className="bg-white dark:bg-slate-800 rounded-xl p-8 border border-gray-200 dark:border-slate-700">
            <p className="font-medium text-gray-900 dark:text-white mb-1">
              No courses in the catalogue yet
            </p>
            <p className="text-sm text-gray-600 dark:text-slate-300">
              When a provider lists a course it appears here.
            </p>
          </div>
        )
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <article
              key={course.id}
              className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700 flex flex-col"
            >
              <h2 className="font-semibold text-gray-900 dark:text-white">
                {course.name}
              </h2>
              {course.description && (
                <p className="text-sm text-gray-600 dark:text-slate-300 mt-1">
                  {course.description}
                </p>
              )}

              <div className="flex items-baseline gap-2 mt-4">
                <span className="text-xl font-bold text-gray-900 dark:text-white">
                  ${course.price.toFixed(2)}
                </span>
                {PRICE_CADENCE[course.priceType] && (
                  <span className="text-xs text-gray-500 dark:text-slate-400">
                    {PRICE_CADENCE[course.priceType]}
                  </span>
                )}
              </div>

              <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                {course.reviewCount > 0
                  ? `${course.rating.toFixed(1)} from ${course.reviewCount} reviews`
                  : "No ratings yet"}
              </p>

              {course.included.length > 0 && (
                <ul className="text-sm text-gray-600 dark:text-slate-300 space-y-1 mt-4">
                  {course.included.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              )}
            </article>
          ))}
        </div>
      )}

      <section className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700">
        <h2 className="font-medium text-gray-900 dark:text-white mb-1">
          Fynvita guides
        </h2>
        <p className="text-sm text-gray-600 dark:text-slate-300">
          We have not published our own written guides yet. This page lists what
          marketplace providers offer; when we write our own, they will appear
          here too.
        </p>
      </section>
    </div>
  );
}
