"use client";

/**
 * Experts directory.
 *
 * WHAT THIS PAGE USED TO DO, and it is the worst of the fabrications found in
 * this tree.
 *
 * `MOCK_EXPERTS` invented CREDENTIALED PROFESSIONALS and presented them as
 * bookable advisers: "Dr. Sarah Mitchell — Certified Financial Planner |
 * Retirement Specialist, CFP and ChFC, 15 years' experience, $200/hour, rated
 * 4.9". Named people, with professional certifications, hourly rates and a
 * booking control. Inventing a number misleads; inventing a licensed adviser
 * someone might hire for financial advice is a different category of harm.
 *
 * THE FEATURE WAS BUILT AND UNREACHABLE, the third such case today.
 * `src/lib/services/expert-sessions-service.ts` has 46 database calls and no
 * randomness, and its `getExperts` reads the `experts` table filtered to
 * `status = "verified"`, ordered by rating. Nothing under src/app could reach
 * it, so GET /api/experts was added.
 *
 * THAT FILTER IS THE POINT. The service returns verified experts only, so a
 * pending or rejected application cannot appear in the directory. The mock
 * bypassed the safeguard entirely — every invented adviser was "verified" by
 * virtue of having been typed into the file.
 *
 * FOUR FIELDS ARE GONE BECAUSE THE REAL EXPERT HAS NO SUCH THING:
 *   - `ratingBreakdown` (knowledge / communication / helpfulness) — three
 *     sub-scores per adviser, none of which exists in the data;
 *   - `repeatClientRate` — a loyalty percentage nothing records;
 *   - `responseTime` as prose ("within 2 hours"). The real field is
 *     `responseRate`, a percentage, which is a different claim;
 *   - `topReview` — a pulled quote. Reviews are a separate entity
 *     (SessionReview) and are not loaded here.
 *
 * Names come from `firstName`/`lastName`, certifications and specialties are
 * objects rather than strings, and each certification carries its own
 * `isVerified` — so a credential the platform has not verified is labelled
 * unverified rather than borrowing the badge of one that was.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { Award, Star, Search, CheckCircle, Clock } from "lucide-react";

/** Mirrors ExpertCertification in expert-sessions-service.ts:83. */
interface ExpertCertification {
  type?: string;
  name: string;
  issuingBody?: string;
  isVerified?: boolean;
}

/** Mirrors Specialty in expert-sessions-service.ts:94. */
interface Specialty {
  id: string;
  name: string;
  category?: string;
}

/** Mirrors Expert in expert-sessions-service.ts:37. */
interface Expert {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  bio?: string;
  headline?: string;
  certifications?: ExpertCertification[];
  yearsExperience?: number;
  firmName?: string;
  specialties?: Specialty[];
  hourlyRate?: number;
  currency?: string;
  offersFreeConsult?: boolean;
  freeConsultMinutes?: number;
  totalSessions?: number;
  averageRating?: number;
  reviewCount?: number;
  responseRate?: number;
}

function fullName(expert: Expert): string {
  return [expert.firstName, expert.lastName].filter(Boolean).join(" ").trim();
}

function formatRate(expert: Expert): string {
  if (typeof expert.hourlyRate !== "number") return "";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: expert.currency || "USD",
    maximumFractionDigits: 0,
  }).format(expert.hourlyRate);
}

export default function ExpertsPage() {
  const [experts, setExperts] = useState<Expert[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState<string | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/experts");
      const json = await res.json().catch(() => null);
      if (!res.ok || !Array.isArray(json?.data?.experts)) {
        setExperts([]);
        setError(
          "We could not load the expert directory. Nothing here is filled in for you — try again in a moment.",
        );
      } else {
        setExperts(json.data.experts as Expert[]);
      }
    } catch {
      setExperts([]);
      setError("We could not reach the expert directory.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /* Specialty chips come from the experts actually returned, so the filter can
     never offer a category with nobody behind it. */
  const specialties = useMemo(() => {
    const names = new Set<string>();
    for (const expert of experts) {
      for (const specialty of expert.specialties ?? []) {
        if (specialty?.name) names.add(specialty.name);
      }
    }
    return [...names].sort();
  }, [experts]);

  const filtered = experts.filter((expert) => {
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !query ||
      fullName(expert).toLowerCase().includes(query) ||
      (expert.headline ?? "").toLowerCase().includes(query) ||
      (expert.specialties ?? []).some((s) =>
        (s.name ?? "").toLowerCase().includes(query),
      );
    const matchesSpecialty =
      !selectedSpecialty ||
      (expert.specialties ?? []).some((s) => s.name === selectedSpecialty);
    return matchesSearch && matchesSpecialty;
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Find an Expert
        </h1>
        <p className="text-gray-600 dark:text-slate-400 mb-8">
          Advisers whose credentials we have verified.
        </p>

        {error && (
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 mb-6 border border-amber-200 dark:border-amber-900/50">
            <p className="font-medium text-gray-900 dark:text-white mb-1">
              The directory is unavailable
            </p>
            <p className="text-sm text-gray-600 dark:text-slate-300">{error}</p>
          </div>
        )}

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="search"
            aria-label="Search experts"
            placeholder="Search by name, headline or specialty"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
          />
        </div>

        {specialties.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
            <button
              onClick={() => setSelectedSpecialty(null)}
              className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
                !selectedSpecialty
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 dark:text-slate-300 dark:bg-slate-700"
              }`}
            >
              All
            </button>
            {specialties.map((specialty) => (
              <button
                key={specialty}
                onClick={() =>
                  setSelectedSpecialty(
                    selectedSpecialty === specialty ? null : specialty,
                  )
                }
                className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
                  selectedSpecialty === specialty
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-600 dark:text-slate-300 dark:bg-slate-700"
                }`}
              >
                {specialty}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="space-y-4 animate-pulse">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-40 bg-gray-200 dark:bg-slate-700 rounded-xl"
              />
            ))}
          </div>
        ) : experts.length === 0 ? (
          !error && (
            <div className="bg-white dark:bg-slate-800 rounded-xl p-10 text-center border border-gray-200 dark:border-slate-700">
              <Award className="w-8 h-8 text-gray-400 dark:text-slate-500 mx-auto mb-3" />
              <p className="font-medium text-gray-900 dark:text-white">
                No experts are available yet
              </p>
              <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">
                Advisers appear here once their credentials have been verified.
              </p>
            </div>
          )
        ) : filtered.length === 0 ? (
          <p className="text-sm text-gray-600 dark:text-slate-400">
            No expert matches that search.
          </p>
        ) : (
          <div className="space-y-4">
            {filtered.map((expert, index) => (
              <motion.div
                key={expert.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <h2 className="font-semibold text-gray-900 dark:text-white">
                      {fullName(expert)}
                    </h2>
                    {expert.headline && (
                      <p className="text-sm text-gray-600 dark:text-slate-300">
                        {expert.headline}
                      </p>
                    )}
                    {expert.firmName && (
                      <p className="text-sm text-gray-500 dark:text-slate-400">
                        {expert.firmName}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    {formatRate(expert) && (
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {formatRate(expert)}
                        <span className="text-sm font-normal text-gray-500 dark:text-slate-400">
                          /hr
                        </span>
                      </p>
                    )}
                    {expert.offersFreeConsult && (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400">
                        Free {expert.freeConsultMinutes ?? 0}-min consult
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-slate-300 mb-3">
                  {typeof expert.averageRating === "number" &&
                    typeof expert.reviewCount === "number" &&
                    expert.reviewCount > 0 && (
                      <span className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-amber-500" />
                        {expert.averageRating.toFixed(1)}
                        <span className="text-gray-500 dark:text-slate-400">
                          ({expert.reviewCount})
                        </span>
                      </span>
                    )}
                  {typeof expert.yearsExperience === "number" && (
                    <span>{expert.yearsExperience} years&apos; experience</span>
                  )}
                  {typeof expert.totalSessions === "number" && (
                    <span>{expert.totalSessions} sessions</span>
                  )}
                  {typeof expert.responseRate === "number" && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4 text-gray-400" />
                      {Math.round(expert.responseRate)}% response rate
                    </span>
                  )}
                </div>

                {(expert.certifications ?? []).length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {(expert.certifications ?? []).map((cert) => (
                      <span
                        key={cert.name}
                        className={`px-2 py-0.5 text-xs rounded-full flex items-center gap-1 ${
                          cert.isVerified
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                            : "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300"
                        }`}
                      >
                        {cert.isVerified && <CheckCircle className="w-3 h-3" />}
                        {cert.name}
                        {/* An unverified credential says so rather than
                            borrowing the badge of a verified one. */}
                        {!cert.isVerified && " (unverified)"}
                      </span>
                    ))}
                  </div>
                )}

                {(expert.specialties ?? []).length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {(expert.specialties ?? []).map((specialty) => (
                      <span
                        key={specialty.id}
                        className="px-2 py-0.5 text-xs rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                      >
                        {specialty.name}
                      </span>
                    ))}
                  </div>
                )}

                {expert.bio && (
                  <p className="text-sm text-gray-600 dark:text-slate-300">
                    {expert.bio}
                  </p>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
