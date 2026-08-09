"use client";

import { useState, useEffect, useCallback } from "react";
import CreditBalance from "@/components/credits/CreditBalance";
import CreditUsageHistory from "@/components/credits/CreditUsageHistory";
import { CREDIT_PACKS, ADDON_BUNDLES } from "@/lib/credits/credit-costs";
import type { CreditPackType, CreditAction } from "@/lib/credits/types";

interface UsageByAction {
  action: CreditAction;
  count: number;
  totalCredits: number;
}

const ACTION_LABELS: Record<string, string> = {
  signal_analysis: "Signal Analysis",
  trade_execution: "Trade Execution",
  backtest_standard: "Standard Backtest",
  backtest_ai: "AI Backtest",
  chat_message: "AI Chat",
  dispute_letter_single: "Dispute Letter",
  dispute_letter_all: "Dispute (All Bureaus)",
  credit_analysis: "Credit Analysis",
};

const ACTION_COLORS: Record<string, string> = {
  signal_analysis: "bg-blue-500",
  trade_execution: "bg-indigo-500",
  backtest_standard: "bg-purple-500",
  backtest_ai: "bg-violet-500",
  chat_message: "bg-emerald-500",
  dispute_letter_single: "bg-amber-500",
  dispute_letter_all: "bg-orange-500",
  credit_analysis: "bg-cyan-500",
};

export default function CreditsSettingsPage() {
  const [purchasing, setPurchasing] = useState<CreditPackType | null>(null);
  const [purchaseResult, setPurchaseResult] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [usageBreakdown, setUsageBreakdown] = useState<UsageByAction[]>([]);

  const fetchUsageBreakdown = useCallback(async () => {
    try {
      const res = await fetch("/api/credits/history?limit=200&offset=0");
      if (!res.ok) return;
      const data = await res.json();
      const transactions = data.transactions ?? [];

      // Aggregate usage by action type (only debits)
      const usageMap = new Map<string, { count: number; totalCredits: number }>();
      for (const tx of transactions) {
        if (tx.creditsConsumed > 0) {
          const existing = usageMap.get(tx.actionType) ?? {
            count: 0,
            totalCredits: 0,
          };
          existing.count += 1;
          existing.totalCredits += tx.creditsConsumed;
          usageMap.set(tx.actionType, existing);
        }
      }

      const breakdown: UsageByAction[] = Array.from(usageMap.entries())
        .map(([action, stats]) => ({
          action: action as CreditAction,
          count: stats.count,
          totalCredits: stats.totalCredits,
        }))
        .sort((a, b) => b.totalCredits - a.totalCredits);

      setUsageBreakdown(breakdown);
    } catch {
      // Non-critical
    }
  }, []);

  useEffect(() => {
    fetchUsageBreakdown();
  }, [fetchUsageBreakdown]);

  const handlePurchase = async (packType: CreditPackType) => {
    setPurchasing(packType);
    setPurchaseResult(null);

    try {
      const res = await fetch("/api/credits/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packType }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Purchase failed");
      }

      const data = await res.json();

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }

      setPurchaseResult({
        type: "success",
        message: `Added ${CREDIT_PACKS.find((p) => p.type === packType)?.credits.toLocaleString()} credits. New balance: ${data.newBalance?.toLocaleString()}.`,
      });
    } catch (err) {
      setPurchaseResult({
        type: "error",
        message: err instanceof Error ? err.message : "Purchase failed",
      });
    } finally {
      setPurchasing(null);
    }
  };

  const totalUsed = usageBreakdown.reduce(
    (sum, item) => sum + item.totalCredits,
    0,
  );

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        Credits
      </h2>
      <p className="text-gray-600 dark:text-slate-300 mb-8">
        Manage your credit balance, purchase packs, and review usage.
      </p>

      {/* Balance */}
      <section className="mb-8">
        <CreditBalance compact={false} />
      </section>

      {/* Usage breakdown */}
      {usageBreakdown.length > 0 && (
        <section className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Usage this period
          </h3>
          <div className="bg-gray-50 dark:bg-slate-900 rounded-xl p-4 border border-gray-200 dark:border-slate-700">
            {/* Stacked bar */}
            <div className="w-full h-4 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden flex mb-4">
              {usageBreakdown.map((item) => (
                <div
                  key={item.action}
                  className={`h-full ${ACTION_COLORS[item.action] ?? "bg-gray-400"}`}
                  style={{
                    width: `${totalUsed > 0 ? (item.totalCredits / totalUsed) * 100 : 0}%`,
                  }}
                />
              ))}
            </div>
            {/* Legend */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {usageBreakdown.map((item) => (
                <div key={item.action} className="flex items-center gap-2">
                  <div
                    className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${ACTION_COLORS[item.action] ?? "bg-gray-400"}`}
                  />
                  <span className="text-xs text-gray-600 dark:text-slate-400 truncate">
                    {ACTION_LABELS[item.action] ?? item.action}
                  </span>
                  <span className="text-xs font-medium text-gray-900 dark:text-white ml-auto">
                    {item.totalCredits.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Purchase packs */}
      <section className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Buy credit packs
        </h3>

        {purchaseResult && (
          <div
            className={`mb-4 rounded-lg p-4 border ${
              purchaseResult.type === "success"
                ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800"
                : "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800"
            }`}
          >
            <p
              className={`text-sm font-medium ${
                purchaseResult.type === "success"
                  ? "text-emerald-800 dark:text-emerald-300"
                  : "text-red-800 dark:text-red-300"
              }`}
            >
              {purchaseResult.message}
            </p>
          </div>
        )}

        <div className="grid sm:grid-cols-3 gap-4">
          {CREDIT_PACKS.map((pack) => {
            const isValue = pack.type === "value";
            const isLoading = purchasing === pack.type;

            return (
              <div
                key={pack.type}
                className={`relative rounded-xl border p-5 transition-all ${
                  isValue
                    ? "border-emerald-300 dark:border-emerald-700 ring-1 ring-emerald-200 dark:ring-emerald-800"
                    : "border-gray-200 dark:border-slate-700 hover:border-emerald-200 dark:hover:border-emerald-700"
                }`}
              >
                {isValue && (
                  <span className="absolute -top-2.5 left-4 bg-emerald-500 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">
                    Best Value
                  </span>
                )}
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {pack.credits.toLocaleString()}
                </p>
                <p className="text-sm text-gray-500 dark:text-slate-400 mb-1">
                  credits
                </p>
                <p className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                  ${pack.priceUsd}
                </p>
                <p className="text-xs text-gray-500 dark:text-slate-400 mb-4">
                  ${(pack.perCredit * 1000).toFixed(2)} per 1,000
                </p>
                <button
                  onClick={() => handlePurchase(pack.type)}
                  disabled={!!purchasing}
                  className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    isValue
                      ? "bg-emerald-500 text-white hover:bg-emerald-600 disabled:bg-emerald-300"
                      : "bg-gray-900 dark:bg-slate-600 text-white hover:bg-gray-800 dark:hover:bg-slate-500 disabled:bg-gray-400"
                  }`}
                >
                  {isLoading ? "Processing..." : "Buy Now"}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Add-on bundles */}
      <section className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Add-on bundles
        </h3>
        <div className="grid sm:grid-cols-3 gap-4">
          {ADDON_BUNDLES.map((bundle) => (
            <div
              key={bundle.type}
              className="rounded-xl border border-gray-200 dark:border-slate-700 p-5 hover:border-emerald-200 dark:hover:border-emerald-700 transition-all"
            >
              <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                {bundle.name}
              </h4>
              <p className="text-sm text-gray-500 dark:text-slate-400 mb-3">
                {bundle.description}
              </p>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-xl font-bold text-gray-900 dark:text-white">
                  ${bundle.priceUsd}
                </span>
                <span className="text-sm text-gray-500 dark:text-slate-400">
                  /mo
                </span>
              </div>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mb-4">
                +{bundle.creditsPerPeriod.toLocaleString()} credits/month
              </p>
              <button className="w-full py-2 rounded-lg text-sm font-medium border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all">
                Subscribe
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Transaction history */}
      <section>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Transaction history
        </h3>
        <CreditUsageHistory />
      </section>
    </div>
  );
}
