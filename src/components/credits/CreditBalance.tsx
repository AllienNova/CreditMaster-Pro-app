"use client";

import { useState, useEffect, useCallback } from "react";

interface CreditBalanceData {
  creditBalance: number;
  subscriptionAllowance: number;
  purchasedCredits: number;
  usedThisPeriod: number;
  periodEnd: string;
}

/**
 * Parse GET /api/credits/balance.
 *
 * This component crashed /settings/credits outright — "Application error: a
 * client-side exception has occurred" — because `setData(json)` was an
 * UNCHECKED CAST and the shapes had never matched. The route answers
 * `{ balance: CreditBalance, usage: { thisMonth, total } }`
 * (src/app/api/credits/balance/route.ts), while this file declared five
 * top-level fields; not one of them existed on the response, so
 * `data.creditBalance.toLocaleString()` threw on undefined.
 *
 * Nothing caught it. The route has its own auth and db-was-called tests, tsc
 * believes a cast, and audit:links only proves the page exists. It took a
 * browser.
 *
 * So this validates rather than asserts: an unrecognised payload returns null
 * and the caller shows a message, which is a bad render instead of a dead page.
 */
export function parseBalance(json: unknown): CreditBalanceData | null {
  if (typeof json !== "object" || json === null) return null;
  const balance = (json as { balance?: unknown }).balance;
  if (typeof balance !== "object" || balance === null) return null;

  const b = balance as Record<string, unknown>;
  const num = (v: unknown): number | null =>
    typeof v === "number" && Number.isFinite(v) ? v : null;

  const creditBalance = num(b.creditBalance);
  const subscriptionAllowance = num(b.subscriptionAllowance);
  const purchasedCredits = num(b.purchasedCredits);
  const usedThisPeriod = num(b.usedThisPeriod);
  if (
    creditBalance === null ||
    subscriptionAllowance === null ||
    purchasedCredits === null ||
    usedThisPeriod === null
  ) {
    return null;
  }

  // periodEnd is a Date on the server; NextResponse.json makes it an ISO
  // string. It is not rendered today, so a missing one is not fatal.
  return {
    creditBalance,
    subscriptionAllowance,
    purchasedCredits,
    usedThisPeriod,
    periodEnd: typeof b.periodEnd === "string" ? b.periodEnd : "",
  };
}

interface CreditBalanceProps {
  compact?: boolean;
}

export default function CreditBalance({ compact = true }: CreditBalanceProps) {
  const [data, setData] = useState<CreditBalanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTooltip, setShowTooltip] = useState(false);

  const fetchBalance = useCallback(async () => {
    try {
      const res = await fetch("/api/credits/balance");
      if (!res.ok) return;
      setData(parseBalance(await res.json()));
    } catch {
      // Silently fail — balance display is non-critical
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  if (loading) {
    return (
      <div className="animate-pulse flex items-center gap-2">
        <div className="w-5 h-5 bg-gray-200 dark:bg-slate-700 rounded" />
        <div className="w-16 h-4 bg-gray-200 dark:bg-slate-700 rounded" />
      </div>
    );
  }

  if (!data) {
    // Compact mode is an inline badge in the chrome; an empty slot there is
    // the right amount of noise. The expanded card IS the point of
    // /settings/credits, so silence would read as "you have no credits".
    if (compact) return null;
    return (
      <div className="rounded-xl border border-gray-200 dark:border-slate-700 p-6">
        <p className="text-sm text-gray-600 dark:text-slate-300">
          We couldn&apos;t load your credit balance. Your credits are unaffected
          — refresh to try again.
        </p>
      </div>
    );
  }

  const totalAllowance = data.subscriptionAllowance + data.purchasedCredits;
  const usedPercent =
    totalAllowance > 0
      ? Math.min(100, Math.round((data.usedThisPeriod / totalAllowance) * 100))
      : 0;
  const remainingPercent = 100 - usedPercent;

  const barColor =
    remainingPercent > 50
      ? "bg-emerald-500"
      : remainingPercent > 20
        ? "bg-amber-500"
        : "bg-red-500";

  const textColor =
    remainingPercent > 50
      ? "text-emerald-600 dark:text-emerald-400"
      : remainingPercent > 20
        ? "text-amber-600 dark:text-amber-400"
        : "text-red-600 dark:text-red-400";

  const formattedBalance = data.creditBalance.toLocaleString();

  if (compact) {
    return (
      <div
        className="relative inline-flex items-center gap-2 cursor-default"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <CreditIcon className="w-4 h-4 text-emerald-500" />
        <span className={`text-sm font-semibold ${textColor}`}>
          {formattedBalance}
        </span>

        {showTooltip && (
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 p-4 z-50">
            <p className="text-xs text-gray-500 dark:text-slate-400 mb-2">
              Credit breakdown
            </p>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-slate-300">
                  Monthly
                </span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {data.subscriptionAllowance.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-slate-300">
                  Purchased
                </span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {data.purchasedCredits.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-slate-300">Used</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {data.usedThisPeriod.toLocaleString()}
                </span>
              </div>
            </div>
            <div className="mt-3">
              <div className="flex justify-between text-xs text-gray-500 dark:text-slate-400 mb-1">
                <span>
                  {data.usedThisPeriod.toLocaleString()} /{" "}
                  {totalAllowance.toLocaleString()}
                </span>
                <span>{usedPercent}% used</span>
              </div>
              <div className="w-full h-1.5 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${barColor}`}
                  style={{ width: `${Math.max(remainingPercent, 2)}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Expanded mode for settings page
  return (
    <div className="bg-gradient-to-r from-emerald-500 to-blue-600 rounded-xl p-6 text-white">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm text-white/80">Available Credits</p>
          <p className="text-3xl font-bold">{formattedBalance}</p>
        </div>
        <CreditIcon className="w-10 h-10 text-white/60" />
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div>
          <p className="text-xs text-white/60">Monthly</p>
          <p className="text-lg font-semibold">
            {data.subscriptionAllowance.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-xs text-white/60">Purchased</p>
          <p className="text-lg font-semibold">
            {data.purchasedCredits.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-xs text-white/60">Used this period</p>
          <p className="text-lg font-semibold">
            {data.usedThisPeriod.toLocaleString()}
          </p>
        </div>
      </div>

      <div>
        <div className="flex justify-between text-xs text-white/70 mb-1">
          <span>
            {data.usedThisPeriod.toLocaleString()} /{" "}
            {totalAllowance.toLocaleString()} used
          </span>
          <span>{remainingPercent}% remaining</span>
        </div>
        <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-white rounded-full transition-all"
            style={{ width: `${Math.max(remainingPercent, 2)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function CreditIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125"
      />
    </svg>
  );
}
