/**
 * Credit Monitoring Hub.
 *
 * WHAT THIS PAGE USED TO ASSERT ABOUT THE READER'S OWN CREDIT.
 *
 * `mockScores` gave everyone the same three bureau readings — Experian 720
 * (+15), Equifax 715 (+8), TransUnion 718 (+12) — and `mockAlerts` told them
 * "New Hard Inquiry: Capital One Bank checked your credit". A hard inquiry is
 * something a person acts on: they call the bank, or they file a dispute.
 *
 * Both have had real routes all along:
 *   GET /api/credit-monitoring/scores  -> { success, data: { experian?, ... } }
 *   GET /api/credit-monitoring/alerts  -> { success, data: CreditAlert[] }
 *
 * THE SERVICE TABLE WAS A MOCK FALLBACK, not a missing fetch. The page already
 * called /api/marketplace/products?category=monitoring and, when that returned
 * nothing, quietly swapped in `mockMonitoringServices` — a comparison putting
 * Fynvita at $29.99 against competitor products. It did at least say "Showing
 * sample data", which is more honesty than most of the fabrications here had,
 * but a pricing comparison is not something to sample: it is either the real
 * catalogue or it is nothing.
 *
 * THE `change` FIGURES ARE GONE. A CreditScore carries a score and a date, not
 * a delta. Deriving one needs the history route, which is a third request this
 * page does not otherwise need; "+15" beside a score nobody differenced is
 * exactly the shape removed from /analytics earlier today.
 *
 * CORRECTION (second pass). The first version of this rewrite mapped products
 * with `features?.includes("alerts")` and `product.bureauCount`. Neither is
 * real: MarketplaceProduct.features is `Record<string, unknown>`
 * (marketplace-service.ts:23) holding a per-product jsonb object, and there is
 * no bureauCount field at all. On a real row `{}.includes` is not a function,
 * so the page threw; on any row it claimed "1 bureau" out of nothing. The
 * fixture was an array, which is why the tests went green over a crash — a
 * mock built from an assumption instead of the type it stands in for.
 *
 * What replaced it: every column maps to a field that exists, `bureaus` is
 * read as the array of bureau NAMES the seed actually stores, and each product
 * lists the features it declares. Absent means "Not stated", never "No".
 */

"use client";

import { useState, useEffect, useCallback } from "react";

type BureauKey = "experian" | "equifax" | "transunion";

const BUREAU_LABELS: Record<BureauKey, string> = {
  experian: "Experian",
  equifax: "Equifax",
  transunion: "TransUnion",
};

const MAX_SCORE = 850;

interface BureauScore {
  score: number;
  scoreDate?: string;
}

/** Mirrors CreditAlert in credit-monitoring-service.ts:44. */
interface CreditAlert {
  id: string;
  type: string;
  bureau?: string;
  title: string;
  message: string;
  severity: "low" | "medium" | "high" | "critical";
  read: boolean;
  createdAt: string;
}

/**
 * Mirrors MarketplaceProduct in marketplace-service.ts:13, reduced to what
 * this table shows. `features` is jsonb with NO fixed schema — the seeded rows
 * declare `disputes_per_month`, `bureaus`, `support`, `specialist`,
 * `ai_letters`, `templates` (migration 20251218000000:366-395). So there is
 * nothing to build a fixed Alerts/Identity/Score matrix out of: each product
 * gets whatever it actually declares, and "Not stated" where it declares
 * nothing.
 */
interface MonitoringService {
  id: string;
  name: string;
  description: string | null;
  price: number;
  priceType: string;
  rating: number;
  reviewCount: number;
  bureaus: string[] | null;
  included: string[];
}

const SEVERITY_CLASSES: Record<string, string> = {
  critical: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  high: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  medium: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  low: "bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300",
};

const PRICE_CADENCE: Record<string, string> = {
  monthly: "/ month",
  yearly: "/ year",
  one_time: "one-time",
};

/** `disputes_per_month` -> `Disputes per month`. */
function humanizeKey(key: string): string {
  const spaced = key.replace(/[_-]+/g, " ").trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/**
 * Turns one feature entry into a line, or null when it says nothing. A `false`
 * boolean is dropped rather than rendered as "No" — the product declined the
 * feature, and listing it under "Included" would read as the opposite.
 */
function describeFeature(key: string, value: unknown): string | null {
  if (typeof value === "boolean") return value ? humanizeKey(key) : null;
  if (typeof value === "number" || typeof value === "string") {
    return `${humanizeKey(key)}: ${value}`;
  }
  if (Array.isArray(value) && value.length > 0) {
    return `${humanizeKey(key)}: ${value.join(", ")}`;
  }
  return null;
}

function mapProductToService(
  product: Record<string, unknown>,
): MonitoringService {
  const raw = product.features;
  const features =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};

  const bureaus = features.bureaus;

  return {
    id: String(product.id ?? product.name ?? ""),
    name: String(product.name ?? ""),
    description:
      typeof product.description === "string" ? product.description : null,
    price: Number(product.price ?? 0),
    priceType: String(product.priceType ?? ""),
    rating: Number(product.rating ?? 0),
    reviewCount: Number(product.reviewCount ?? 0),
    bureaus: Array.isArray(bureaus) ? bureaus.map(String) : null,
    included: Object.entries(features)
      .filter(([key]) => key !== "bureaus")
      .map(([key, value]) => describeFeature(key, value))
      .filter((line): line is string => line !== null),
  };
}

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

export default function CreditMonitoringPage() {
  const [scores, setScores] = useState<Partial<Record<BureauKey, BureauScore>>>(
    {},
  );
  const [alerts, setAlerts] = useState<CreditAlert[]>([]);
  const [services, setServices] = useState<MonitoringService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const body = async (r: PromiseSettledResult<Response>) =>
      r.status === "fulfilled" && r.value.ok
        ? await r.value.json().catch(() => null)
        : null;

    const [scoresRes, alertsRes, productsRes] = await Promise.allSettled([
      fetch("/api/credit-monitoring/scores"),
      fetch("/api/credit-monitoring/alerts"),
      fetch("/api/marketplace/products?category=monitoring"),
    ]);
    const [scoresJson, alertsJson, productsJson] = await Promise.all([
      body(scoresRes),
      body(alertsRes),
      body(productsRes),
    ]);

    setScores(
      (scoresJson?.data as Partial<Record<BureauKey, BureauScore>>) ?? {},
    );
    setAlerts(
      Array.isArray(alertsJson?.data) ? (alertsJson.data as CreditAlert[]) : [],
    );
    /* No fallback. An empty catalogue shows as empty; it does not become a
       price comparison we invented. */
    setServices(
      Array.isArray(productsJson?.data)
        ? (productsJson.data as Record<string, unknown>[]).map(
            mapProductToService,
          )
        : [],
    );

    if (!scoresJson && !alertsJson && !productsJson) {
      setError(
        "We could not load your monitoring data. Nothing here is estimated in its place — try again in a moment.",
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const bureaus = (Object.keys(BUREAU_LABELS) as BureauKey[]).filter(
    (key) => typeof scores[key]?.score === "number",
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Credit Monitoring
        </h1>
        <p className="text-gray-600 dark:text-slate-300">
          Your scores across the bureaus, and what has changed
        </p>
      </div>

      {error && (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-amber-200 dark:border-amber-900/50">
          <p className="font-medium text-gray-900 dark:text-white mb-1">
            Monitoring data is unavailable
          </p>
          <p className="text-sm text-gray-600 dark:text-slate-300">{error}</p>
        </div>
      )}

      {/* Scores */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Your scores
        </h2>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-28 bg-gray-200 dark:bg-slate-700 rounded-xl"
              />
            ))}
          </div>
        ) : bureaus.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700">
            <p className="font-medium text-gray-900 dark:text-white mb-1">
              No bureau has reported a score for you yet
            </p>
            <p className="text-sm text-gray-600 dark:text-slate-300">
              Once a score is recorded on your account it appears here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {bureaus.map((key) => (
              <div
                key={key}
                className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700 text-center"
              >
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  {BUREAU_LABELS[key]}
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                  {scores[key]?.score}
                </p>
                <div className="h-1.5 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden mt-3">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{
                      width: `${Math.min(100, ((scores[key]?.score ?? 0) / MAX_SCORE) * 100)}%`,
                    }}
                  />
                </div>
                {scores[key]?.scoreDate && (
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-2">
                    Updated {formatDate(scores[key]?.scoreDate)}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Alerts */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Alerts
        </h2>
        {alerts.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700">
            <p className="text-sm text-gray-600 dark:text-slate-300">
              No alerts on your account. We will tell you here when a bureau
              reports a change.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {alerts.map((alert) => (
              <li
                key={alert.id}
                className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-slate-700"
              >
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-medium text-gray-900 dark:text-white">
                    {alert.title}
                  </span>
                  <span
                    className={`px-2 py-0.5 text-xs rounded-full capitalize ${
                      SEVERITY_CLASSES[alert.severity] ?? SEVERITY_CLASSES.low
                    }`}
                  >
                    {alert.severity}
                  </span>
                  {alert.bureau && (
                    <span className="text-xs text-gray-500 dark:text-slate-400 capitalize">
                      {alert.bureau}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 dark:text-slate-300">
                  {alert.message}
                </p>
                {alert.createdAt && (
                  <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                    {formatDate(alert.createdAt)}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Service comparison */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Monitoring services
        </h2>
        {services.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700">
            <p className="text-sm text-gray-600 dark:text-slate-300">
              We have no monitoring products to compare right now. Prices and
              coverage are not something to show you a sample of.
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 dark:text-slate-400 border-b border-gray-100 dark:border-slate-700">
                  <th className="p-4 font-medium">Service</th>
                  <th className="p-4 font-medium">Price</th>
                  <th className="p-4 font-medium">Rating</th>
                  <th className="p-4 font-medium">Bureaus</th>
                  <th className="p-4 font-medium">Included</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                {services.map((service) => (
                  <tr key={service.id} className="align-top">
                    <td className="p-4 text-gray-900 dark:text-white">
                      <span className="font-medium">{service.name}</span>
                      {service.description && (
                        <span className="block text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                          {service.description}
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-gray-900 dark:text-white whitespace-nowrap">
                      ${service.price.toFixed(2)}
                      {PRICE_CADENCE[service.priceType] && (
                        <span className="text-xs text-gray-500 dark:text-slate-400">
                          {" "}
                          {PRICE_CADENCE[service.priceType]}
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-gray-900 dark:text-white whitespace-nowrap">
                      {service.reviewCount > 0 ? (
                        <>
                          {service.rating.toFixed(1)}
                          <span className="text-xs text-gray-500 dark:text-slate-400">
                            {" "}
                            ({service.reviewCount})
                          </span>
                        </>
                      ) : (
                        <span className="text-gray-500 dark:text-slate-400">
                          No ratings yet
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-gray-900 dark:text-white">
                      {service.bureaus?.length ? (
                        service.bureaus.join(", ")
                      ) : (
                        <span className="text-gray-500 dark:text-slate-400">
                          Not stated
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-gray-900 dark:text-white">
                      {service.included.length > 0 ? (
                        <ul className="space-y-0.5">
                          {service.included.map((line) => (
                            <li key={line}>{line}</li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-gray-500 dark:text-slate-400">
                          Not stated
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
