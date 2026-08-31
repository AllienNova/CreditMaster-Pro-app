"use client";

/**
 * Dispute Analytics.
 *
 * WHAT THIS PAGE USED TO ASSERT, WITH NO FETCH IN THE FILE.
 *
 *   "Total Disputes 24, +8 this month" · "Successful 12, 50% success rate"
 *   "Pending 5, Avg 18 days wait" · "In Progress 4"
 *   a per-type table: Late Payments 8 (5 successful), Collections 6, Inquiries
 *   5, Account Errors 3, Identity Issues 2
 *   a per-bureau table: Experian 10 disputes, 28 days average; Equifax 8, 32
 *   days; TransUnion 6
 *
 * Four module-level arrays, every figure a claim about the reader's own dispute
 * history.
 *
 * WHAT IT READS NOW.
 *   GET /api/disputes/stats -> { success, data: { total, active, resolved,
 *     successRate, avgResolutionDays } }
 *   GET /api/disputes?limit= -> { success, data: { items: Dispute[], total } }
 *
 * Both are genuinely backed: dispute-service-db.ts queries the disputes table.
 *
 * THE BREAKDOWNS ARE DERIVED, NOT INVENTED. The real Dispute carries `bureau`,
 * `itemType`, `status` and `outcome`, so grouping the user's own disputes by
 * bureau and by item type is arithmetic over real rows — not a second source of
 * truth. "Successful" means `outcome === "removed" || outcome === "updated"`,
 * stated here because it is a judgement: a dispute the bureau "verified" closed
 * without changing anything, so counting it as a success would flatter the
 * number.
 *
 * /api/analytics WAS DELIBERATELY NOT USED, even though it exists and looks
 * like the obvious fit. AnalyticsEngine.getDisputeAnalytics returns a hardcoded
 * all-zeros object and ignores its userId and date arguments; the whole of
 * analytics-engine.ts contains no supabase reference and no `.from(` call.
 * Wiring this page to it would replace invented numbers with stub zeros
 * presented as measurements, which is worse, because a zero reads as an honest
 * empty account. Recorded as task #99.
 */

import { useState, useEffect, useCallback } from "react";

type Bureau = "experian" | "equifax" | "transunion";
type DisputeOutcome = "removed" | "updated" | "verified";

interface Dispute {
  id: string;
  bureau: Bureau;
  itemType: string;
  itemDescription: string;
  status: "draft" | "sent" | "under_review" | "resolved" | "rejected";
  outcome?: DisputeOutcome;
  createdAt: string;
  resolvedAt?: string;
}

interface DisputeStats {
  total: number;
  active: number;
  resolved: number;
  successRate: number;
  avgResolutionDays: number;
}

const BUREAU_LABELS: Record<Bureau, string> = {
  experian: "Experian",
  equifax: "Equifax",
  transunion: "TransUnion",
};

const DISPUTE_PAGE_SIZE = 100;

/**
 * A dispute counts as successful when the bureau removed or updated the item.
 * "verified" means the bureau closed it without changing anything, so it is
 * not a success — counting it as one is how a success rate gets flattered.
 */
function isSuccessful(dispute: Dispute): boolean {
  return dispute.outcome === "removed" || dispute.outcome === "updated";
}

function isPending(dispute: Dispute): boolean {
  return dispute.status === "sent" || dispute.status === "under_review";
}

interface Group {
  key: string;
  label: string;
  total: number;
  successful: number;
  pending: number;
}

function groupBy(
  disputes: Dispute[],
  keyOf: (d: Dispute) => string,
  labelOf: (key: string) => string,
): Group[] {
  const groups = new Map<string, Group>();
  for (const dispute of disputes) {
    const key = keyOf(dispute);
    const group = groups.get(key) ?? {
      key,
      label: labelOf(key),
      total: 0,
      successful: 0,
      pending: 0,
    };
    group.total += 1;
    if (isSuccessful(dispute)) group.successful += 1;
    if (isPending(dispute)) group.pending += 1;
    groups.set(key, group);
  }
  return [...groups.values()].sort((a, b) => b.total - a.total);
}

function titleCase(value: string): string {
  return value
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

export default function DisputeAnalyticsPage() {
  const [stats, setStats] = useState<DisputeStats | null>(null);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const body = async (r: PromiseSettledResult<Response>) =>
      r.status === "fulfilled" && r.value.ok
        ? await r.value.json().catch(() => null)
        : null;

    const [statsRes, listRes] = await Promise.allSettled([
      fetch("/api/disputes/stats"),
      fetch(`/api/disputes?limit=${DISPUTE_PAGE_SIZE}`),
    ]);
    const [statsJson, listJson] = await Promise.all([
      body(statsRes),
      body(listRes),
    ]);

    setStats((statsJson?.data as DisputeStats | undefined) ?? null);
    setDisputes(
      Array.isArray(listJson?.data?.items)
        ? (listJson.data.items as Dispute[])
        : [],
    );

    if (!statsJson && !listJson) {
      setError(
        "We could not load your dispute analytics. Nothing here is estimated in its place — try again in a moment.",
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const byBureau = groupBy(
    disputes,
    (d) => d.bureau,
    (key) => BUREAU_LABELS[key as Bureau] ?? titleCase(key),
  );
  const byType = groupBy(
    disputes,
    (d) => d.itemType,
    (key) => titleCase(key),
  );

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Dispute Analytics
      </h1>

      {error && (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 mb-6 border border-amber-200 dark:border-amber-900/50">
          <p className="font-medium text-gray-900 dark:text-white mb-1">
            Dispute analytics are unavailable
          </p>
          <p className="text-sm text-gray-600 dark:text-slate-300">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-28 bg-gray-200 dark:bg-slate-700 rounded-xl"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            { label: "Total Disputes", value: stats?.total },
            { label: "Resolved", value: stats?.resolved },
            { label: "Active", value: stats?.active },
            {
              label: "Success Rate",
              value:
                typeof stats?.successRate === "number"
                  ? `${Math.round(stats.successRate)}%`
                  : undefined,
            },
          ].map((tile) => (
            <div
              key={tile.label}
              className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700"
            >
              <p className="text-sm text-gray-500 dark:text-slate-400">
                {tile.label}
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                {tile.value ?? "—"}
              </p>
            </div>
          ))}
        </div>
      )}

      {typeof stats?.avgResolutionDays === "number" &&
        stats.avgResolutionDays > 0 && (
          <p className="text-sm text-gray-600 dark:text-slate-300 mb-8">
            Resolved disputes took {Math.round(stats.avgResolutionDays)} days on
            average.
          </p>
        )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[
          { title: "By bureau", groups: byBureau },
          { title: "By item type", groups: byType },
        ].map((section) => (
          <div
            key={section.title}
            className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700"
          >
            <h2 className="font-semibold text-gray-900 dark:text-white mb-4">
              {section.title}
            </h2>
            {section.groups.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-slate-400">
                You have not filed any disputes yet.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 dark:text-slate-400">
                    <th className="pb-2 font-medium">Name</th>
                    <th className="pb-2 font-medium text-right">Total</th>
                    <th className="pb-2 font-medium text-right">Successful</th>
                    <th className="pb-2 font-medium text-right">Pending</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                  {section.groups.map((group) => (
                    <tr key={group.key}>
                      <td className="py-2 text-gray-900 dark:text-white">
                        {group.label}
                      </td>
                      <td className="py-2 text-right text-gray-900 dark:text-white">
                        {group.total}
                      </td>
                      <td className="py-2 text-right text-gray-900 dark:text-white">
                        {group.successful}
                      </td>
                      <td className="py-2 text-right text-gray-900 dark:text-white">
                        {group.pending}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
