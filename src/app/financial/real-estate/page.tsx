"use client";

/**
 * Real Estate.
 *
 * WHAT THIS PAGE USED TO SHOW EVERY VISITOR AS THEIR OWN PROPERTY.
 *
 * `MOCK_PROPERTIES` was a hardcoded portfolio — addresses, purchase prices,
 * current values, mortgages and rent — rendered with no fetch in the file.
 * Every figure was a claim that the reader owns real estate, and the summary
 * above them turned that into a net-worth statement.
 *
 * THE FEATURE WAS BUILT AND UNREACHABLE, exactly as the crypto wallets were.
 * `real_estate_tracking` has existed since migration
 * 20260731000081_real_estate_tracking, and real-estate-tracking-service.ts
 * queries it in earnest — 27 database calls, no `Math.random` — including
 * `getUserProperties` and `getPortfolioSummary`. Nothing imported that service
 * except a barrel file and its own test. GET /api/financial/real-estate was
 * added to close the gap; it is the missing link, not new functionality.
 *
 * Two adjacent migrations (…081 real estate, …082 crypto), two working
 * services, neither reachable, both screens filling the silence with a
 * constant. That is a pattern worth naming: nothing in CI asserts that a
 * service is reachable from a route, so a feature can land complete and stay
 * dark.
 *
 * FIELD NAMES FOLLOW THE SERVICE, not the old local type: the real Property
 * carries a structured `address` object, `currentValue` with a `valueSource`
 * and `lastValueUpdate`, a `mortgages` array rather than a single figure, and
 * a `PropertyType` union with `commercial`, `land` and `multi_family` that the
 * old four-value union did not have.
 *
 * `valueSource` IS SHOWN. A current value that came from `manual` entry is a
 * different claim from one that came from an appraisal, and the data records
 * which — so the screen says so rather than presenting both as measurements.
 */

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Home, Building2, TrendingUp, MapPin, RefreshCw } from "lucide-react";

/** Mirrors PropertyType in real-estate-tracking-service.ts:18. */
type PropertyType =
  | "primary_residence"
  | "rental"
  | "vacation"
  | "investment"
  | "commercial"
  | "land"
  | "multi_family";

interface PropertyAddress {
  street?: string;
  unit?: string;
  city?: string;
  state?: string;
  zipCode?: string;
}

interface Mortgage {
  id?: string;
  currentBalance?: number;
  monthlyPayment?: number;
}

/** Mirrors Property in real-estate-tracking-service.ts:30. */
interface Property {
  id: string;
  name: string;
  type: PropertyType;
  status?: string;
  address?: PropertyAddress;
  purchasePrice?: number;
  currentValue: number;
  lastValueUpdate?: string;
  valueSource?: "manual" | "zillow" | "redfin" | "appraisal";
  mortgages?: Mortgage[];
  details?: { bedrooms?: number; bathrooms?: number; squareFeet?: number };
}

/** Mirrors PortfolioSummary in real-estate-tracking-service.ts:157. */
interface PortfolioSummary {
  totalProperties: number;
  totalValue: number;
  totalEquity: number;
  totalDebt: number;
  netMonthlyCashFlow: number;
  totalAppreciation: number;
  appreciationPercent: number;
}

const TYPE_LABELS: Record<PropertyType, string> = {
  primary_residence: "Primary residence",
  rental: "Rental",
  vacation: "Vacation home",
  investment: "Investment",
  commercial: "Commercial",
  land: "Land",
  multi_family: "Multi-family",
};

const SOURCE_LABELS: Record<string, string> = {
  manual: "you entered this value",
  zillow: "estimate from Zillow",
  redfin: "estimate from Redfin",
  appraisal: "from an appraisal",
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);

function formatAddress(address?: PropertyAddress): string {
  if (!address) return "";
  return [address.street, address.unit, address.city, address.state]
    .filter(Boolean)
    .join(", ");
}

export default function RealEstatePage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/financial/real-estate");
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.data) {
        setProperties([]);
        setSummary(null);
        setError(
          "We could not load your properties. Nothing here is filled in for you — try again in a moment.",
        );
      } else {
        setProperties(
          Array.isArray(json.data.properties)
            ? (json.data.properties as Property[])
            : [],
        );
        setSummary((json.data.summary as PortfolioSummary | undefined) ?? null);
      }
    } catch {
      setProperties([]);
      setSummary(null);
      setError("We could not reach the property service.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-emerald-100 dark:bg-emerald-900 rounded-lg">
            <Home className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Real Estate
          </h1>
        </div>
        <p className="text-gray-600 dark:text-slate-400 mb-8">
          The properties you have added, and what they are worth.
        </p>

        {error && (
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 mb-6 border border-amber-200 dark:border-amber-900/50">
            <p className="font-medium text-gray-900 dark:text-white mb-1">
              Properties are unavailable
            </p>
            <p className="text-sm text-gray-600 dark:text-slate-300">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="space-y-4 animate-pulse">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-32 bg-gray-200 dark:bg-slate-700 rounded-xl"
              />
            ))}
          </div>
        ) : properties.length === 0 ? (
          !error && (
            <div className="bg-white dark:bg-slate-800 rounded-xl p-10 text-center border border-gray-200 dark:border-slate-700">
              <Building2 className="w-8 h-8 text-gray-400 dark:text-slate-500 mx-auto mb-3" />
              <p className="font-medium text-gray-900 dark:text-white">
                No properties added
              </p>
              <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">
                Once you add a property, its value and equity appear here.
              </p>
            </div>
          )
        ) : (
          <>
            {summary && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-slate-700">
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    Total value
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {formatCurrency(summary.totalValue)}
                  </p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-slate-700">
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    Equity
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {formatCurrency(summary.totalEquity)}
                  </p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-slate-700">
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    Mortgage debt
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {formatCurrency(summary.totalDebt)}
                  </p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-slate-700">
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    Monthly cash flow
                  </p>
                  <p
                    className={`text-2xl font-bold mt-1 ${
                      summary.netMonthlyCashFlow >= 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {formatCurrency(summary.netMonthlyCashFlow)}
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {properties.map((property, index) => {
                const debt = (property.mortgages ?? []).reduce(
                  (sum, m) => sum + (m.currentBalance ?? 0),
                  0,
                );
                return (
                  <motion.div
                    key={property.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700"
                  >
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div>
                        <h2 className="font-semibold text-gray-900 dark:text-white">
                          {property.name}
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-slate-400">
                          {TYPE_LABELS[property.type] ?? property.type}
                        </p>
                        {formatAddress(property.address) && (
                          <p className="text-sm text-gray-500 dark:text-slate-400 flex items-center gap-1 mt-1">
                            <MapPin className="w-3.5 h-3.5" />
                            {formatAddress(property.address)}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-gray-900 dark:text-white">
                          {formatCurrency(property.currentValue)}
                        </p>
                        {/* Provenance, because a self-entered value and an
                            appraisal are different claims. */}
                        {property.valueSource && (
                          <p className="text-xs text-gray-500 dark:text-slate-400">
                            {SOURCE_LABELS[property.valueSource] ??
                              property.valueSource}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                      {typeof property.purchasePrice === "number" && (
                        <div>
                          <p className="text-gray-500 dark:text-slate-400">
                            Purchase price
                          </p>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {formatCurrency(property.purchasePrice)}
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-gray-500 dark:text-slate-400">
                          Mortgage balance
                        </p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {formatCurrency(debt)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 dark:text-slate-400">
                          Equity
                        </p>
                        <p className="font-medium text-gray-900 dark:text-white flex items-center gap-1">
                          <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                          {formatCurrency(property.currentValue - debt)}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </>
        )}

        <button
          onClick={load}
          disabled={loading}
          className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-sm font-medium text-gray-700 dark:text-slate-300 disabled:opacity-50"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>
    </div>
  );
}
