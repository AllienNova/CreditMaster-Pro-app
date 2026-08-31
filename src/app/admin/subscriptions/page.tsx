/**
 * Admin — Subscription Management.
 *
 * WHAT THIS PAGE TOLD AN OPERATOR ABOUT THE BUSINESS, WITH NO FETCH IN THE FILE.
 *
 *   Monthly Recurring Revenue  $487,230  +15%
 *   Annual Recurring Revenue   $5.8M     +22%
 *   Average Revenue Per User   $59.12    +8%
 *   Churn Rate                 2.3%      -0.5%
 *
 * plus a plan breakdown (4,521 Basic / 3,012 Premium / 701 Enterprise), four
 * named subscribers with timestamps ("john@example.com upgraded 2 hours ago"),
 * and a churn panel of bare JSX numbers: 156 cancellations, $12,324 lost MRR,
 * "45% — Reason: Price".
 *
 * Fynvita has no live users. Every figure above was invented, and it was the
 * operator — the person deciding what to build and what to charge — reading
 * them. The plan names did not even match the product: Basic/Premium/
 * Enterprise against the real Free/Standard/Pro/Family tiers.
 *
 * WHAT IS SHOWN NOW, AND WHY IT IS LESS.
 *
 * GET /api/admin/subscriptions returns real rows and now labels each with the
 * plan its `stripe_price_id` names, resolved server-side from
 * SUBSCRIPTION_PLANS (the same catalogue the webhook resolves tiers from).
 * From those rows these are honest:
 *
 *   - counts, by status and by plan          — one row is one subscription
 *   - MRR AT LIST PRICE                      — sum of each active row's plan price
 *
 * "At list price" is not a hedge, it is the actual claim: the subscriptions
 * table stores no amount, so this sums what each plan costs, before discounts,
 * proration, tax, and failed payments. Stripe is the only source for money
 * actually collected. Labelling it "MRR" flat would be the same error as the
 * $487,230.
 *
 * WHAT IS GONE AND NOT REPLACED. Churn rate, ARPU, every "+15% from last
 * month", lost MRR, and the cancellation reason. Each needs something the row
 * does not carry — a prior-period snapshot, a cancellation timestamp distinct
 * from `updated_at`, a reason field. A trend needs two points in time and this
 * page has one.
 *
 * The Export Report button is gone too: it had no onClick.
 *
 * ON THE TABLE. `subscriptions` carries two meanings — Fynvita's own Stripe
 * billing (001_initial_schema.sql:63) and, since 20260110000002, the user's
 * third-party subscriptions for cancellation assistance, added as nullable
 * columns onto the same table. That migration's own comment calls the overload
 * out and defers the split. Nothing writes third-party rows today, so this
 * list is Fynvita billing; if that changes, this page will need a discriminator
 * or it will report someone's gym membership as a signup.
 */

"use client";

import { useState, useEffect, useCallback } from "react";

/** One row of GET /api/admin/subscriptions. */
interface AdminSubscription {
  id: string;
  user_email: string;
  status: string;
  created_at: string | null;
  cancel_at_period_end: boolean | null;
  current_period_end: string | null;
  stripe_price_id: string | null;
  tier: string | null;
  plan_name: string | null;
  monthly_list_price: number | null;
}

/** Statuses Stripe reports; anything else is shown under its own name. */
const ACTIVE_STATUSES = new Set(["active", "trialing"]);

const STATUS_CLASSES: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  trialing: "bg-blue-100 text-blue-700",
  past_due: "bg-amber-100 text-amber-700",
  canceled: "bg-red-100 text-red-700",
  cancelled: "bg-red-100 text-red-700",
  incomplete: "bg-gray-100 text-gray-700",
};

const currency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);

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

interface Summary {
  total: number;
  byStatus: { status: string; count: number }[];
  byPlan: { label: string; count: number; monthlyListTotal: number | null }[];
  mrrAtListPrice: number;
  activeCount: number;
  unpricedActiveCount: number;
}

function summarise(rows: AdminSubscription[]): Summary {
  const statusCounts = new Map<string, number>();
  const planCounts = new Map<
    string,
    { count: number; monthlyListTotal: number | null }
  >();

  let mrrAtListPrice = 0;
  let activeCount = 0;
  let unpricedActiveCount = 0;

  for (const row of rows) {
    const status = row.status || "unknown";
    statusCounts.set(status, (statusCounts.get(status) ?? 0) + 1);

    // An unrecognised price ID keeps its raw ID as the label rather than being
    // folded into a plan it might not be on.
    const label = row.plan_name ?? row.stripe_price_id ?? "Unknown plan";
    const existing = planCounts.get(label) ?? {
      count: 0,
      monthlyListTotal: row.monthly_list_price === null ? null : 0,
    };
    existing.count += 1;
    if (row.monthly_list_price !== null && existing.monthlyListTotal !== null) {
      existing.monthlyListTotal += row.monthly_list_price;
    }
    planCounts.set(label, existing);

    if (!ACTIVE_STATUSES.has(status)) continue;
    activeCount += 1;
    if (row.monthly_list_price === null) {
      unpricedActiveCount += 1;
      continue;
    }
    mrrAtListPrice += row.monthly_list_price;
  }

  return {
    total: rows.length,
    byStatus: [...statusCounts.entries()]
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count),
    byPlan: [...planCounts.entries()]
      .map(([label, value]) => ({ label, ...value }))
      .sort((a, b) => b.count - a.count),
    mrrAtListPrice: Number(mrrAtListPrice.toFixed(2)),
    activeCount,
    unpricedActiveCount,
  };
}

export default function AdminSubscriptionsPage() {
  const [rows, setRows] = useState<AdminSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/subscriptions");
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setRows([]);
        setError(
          "We could not load subscriptions. No figures are estimated in their place — try again in a moment.",
        );
      } else {
        setRows(
          Array.isArray(json?.subscriptions)
            ? (json.subscriptions as AdminSubscription[])
            : [],
        );
      }
    } catch {
      setRows([]);
      setError("We could not reach the subscriptions service.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const summary = summarise(rows);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Subscription Management
        </h1>
        <p className="text-gray-600 dark:text-slate-300 mt-1">
          Every subscription row on the platform, and what the plans list for
        </p>
      </div>

      {error && (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-amber-200 dark:border-amber-900/50 mb-8">
          <p className="font-medium text-gray-900 dark:text-white mb-1">
            Subscription data is unavailable
          </p>
          <p className="text-sm text-gray-600 dark:text-slate-300">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-28 bg-gray-200 dark:bg-slate-700 rounded-xl"
            />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
              <p className="text-sm text-gray-500 dark:text-slate-400">
                Subscriptions
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                {summary.total}
              </p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
              <p className="text-sm text-gray-500 dark:text-slate-400">
                Active or trialing
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                {summary.activeCount}
              </p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
              <p className="text-sm text-gray-500 dark:text-slate-400">
                MRR at list price
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                {currency(summary.mrrAtListPrice)}
              </p>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-2">
                Sum of each active plan&apos;s list price. Not money collected —
                before discounts, proration, tax and failed payments.
                {summary.unpricedActiveCount > 0 && (
                  <>
                    {" "}
                    {summary.unpricedActiveCount} active row
                    {summary.unpricedActiveCount === 1 ? "" : "s"} on an
                    unrecognised price ID {""}
                    {summary.unpricedActiveCount === 1 ? "is" : "are"} excluded.
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
              <div className="p-6 border-b border-gray-200 dark:border-slate-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  By plan
                </h2>
              </div>
              <div className="p-6">
                {summary.byPlan.length === 0 ? (
                  <p className="text-sm text-gray-600 dark:text-slate-300">
                    No subscriptions yet.
                  </p>
                ) : (
                  <ul className="space-y-4">
                    {summary.byPlan.map((plan) => (
                      <li key={plan.label}>
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-900 dark:text-white">
                            {plan.label}
                          </span>
                          <span className="text-sm text-gray-500 dark:text-slate-400">
                            {plan.count}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2 mt-2">
                          <div
                            className="bg-emerald-500 h-2 rounded-full"
                            style={{
                              width: `${summary.total > 0 ? (plan.count / summary.total) * 100 : 0}%`,
                            }}
                          />
                        </div>
                        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                          {plan.monthlyListTotal === null
                            ? "Price ID not in the plan catalogue"
                            : `${currency(plan.monthlyListTotal)}/month at list price`}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
              <div className="p-6 border-b border-gray-200 dark:border-slate-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  By status
                </h2>
              </div>
              <div className="p-6">
                {summary.byStatus.length === 0 ? (
                  <p className="text-sm text-gray-600 dark:text-slate-300">
                    No subscriptions yet.
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {summary.byStatus.map((entry) => (
                      <li
                        key={entry.status}
                        className="flex items-center justify-between"
                      >
                        <span
                          className={`px-2 py-1 text-xs rounded-full capitalize ${
                            STATUS_CLASSES[entry.status] ??
                            "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {entry.status.replace(/_/g, " ")}
                        </span>
                        <span className="text-gray-900 dark:text-white font-medium">
                          {entry.count}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          <div className="mt-8 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
            <div className="p-6 border-b border-gray-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Most recent subscriptions
              </h2>
            </div>
            {rows.length === 0 ? (
              <p className="p-6 text-sm text-gray-600 dark:text-slate-300">
                No subscriptions on the platform yet. Nothing is shown here in
                the meantime.
              </p>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-slate-700">
                {rows.slice(0, 10).map((row) => (
                  <div
                    key={row.id}
                    className="p-4 flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate">
                        {row.user_email}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-slate-400">
                        {row.plan_name ?? row.stripe_price_id ?? "Unknown plan"}
                        {formatDate(row.created_at) &&
                          ` • started ${formatDate(row.created_at)}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {row.cancel_at_period_end && (
                        <span className="px-2 py-1 text-xs rounded-full bg-amber-100 text-amber-700">
                          cancels at period end
                        </span>
                      )}
                      <span
                        className={`px-2 py-1 text-xs rounded-full capitalize ${
                          STATUS_CLASSES[row.status] ??
                          "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {(row.status || "unknown").replace(/_/g, " ")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <p className="mt-6 text-sm text-gray-500 dark:text-slate-400">
            Churn, ARPU and month-over-month movement are not shown: a
            subscription row carries no cancellation reason and no prior-period
            snapshot, and a trend needs two points in time. Money actually
            collected lives in Stripe.
          </p>
        </>
      )}
    </div>
  );
}
