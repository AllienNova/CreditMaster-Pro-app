"use client";

import { useState, useEffect, useCallback } from "react";
import type { CreditAction } from "@/lib/credits/types";

interface HistoryEntry {
  id: string;
  actionType: CreditAction;
  creditsConsumed: number;
  creditsAdded: number;
  balanceAfter: number;
  createdAt: string;
  metadata: Record<string, unknown>;
}

const ACTION_LABELS: Record<CreditAction, string> = {
  signal_analysis: "Signal Analysis",
  trade_execution: "Trade Execution",
  backtest_standard: "Standard Backtest",
  backtest_ai: "AI Backtest",
  chat_message: "AI Chat",
  dispute_letter_single: "Dispute Letter",
  dispute_letter_all: "Dispute (All Bureaus)",
  credit_analysis: "Credit Analysis",
  monthly_reset: "Monthly Reset",
  credit_purchase: "Credit Purchase",
  addon_credit: "Add-on Credit",
};

const ACTION_ICONS: Partial<Record<CreditAction, string>> = {
  signal_analysis: "M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z",
  trade_execution: "M3 7.5 7.5 3m0 0L12 7.5M7.5 3v13.5m13.5-7.5L16.5 3m0 0L12 7.5m4.5-4.5v13.5",
  chat_message: "M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z",
  credit_purchase: "M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  credit_analysis: "M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m5.231 13.481L15 17.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v16.5c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Zm3.75 11.625a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z",
};

export default function CreditUsageHistory() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 20;

  const fetchHistory = useCallback(
    async (offset: number) => {
      try {
        const res = await fetch(
          `/api/credits/history?limit=${PAGE_SIZE}&offset=${offset}`,
        );
        if (!res.ok) return;
        const data = await res.json();
        const items: HistoryEntry[] = data.transactions ?? [];

        if (offset === 0) {
          setEntries(items);
        } else {
          setEntries((prev) => [...prev, ...items]);
        }

        setHasMore(items.length === PAGE_SIZE);
      } catch {
        // Non-critical
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [],
  );

  useEffect(() => {
    fetchHistory(0);
  }, [fetchHistory]);

  const handleLoadMore = () => {
    setLoadingMore(true);
    fetchHistory(entries.length);
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="animate-pulse flex items-center gap-3 py-3">
            <div className="w-8 h-8 bg-gray-200 dark:bg-slate-700 rounded-lg" />
            <div className="flex-1 space-y-1">
              <div className="w-32 h-3 bg-gray-200 dark:bg-slate-700 rounded" />
              <div className="w-20 h-3 bg-gray-200 dark:bg-slate-700 rounded" />
            </div>
            <div className="w-16 h-4 bg-gray-200 dark:bg-slate-700 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-12">
        <svg
          className="w-12 h-12 text-gray-300 dark:text-slate-600 mx-auto mb-4"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
          />
        </svg>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
          No credit activity yet
        </h3>
        <p className="text-sm text-gray-500 dark:text-slate-400">
          Your credit transactions will appear here as you use AI features.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-slate-700">
              <th className="text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider py-3 pr-4">
                Action
              </th>
              <th className="text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider py-3 pr-4">
                Date
              </th>
              <th className="text-right text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider py-3 pr-4">
                Credits
              </th>
              <th className="text-right text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider py-3">
                Balance
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
            {entries.map((entry) => {
              const isDebit = entry.creditsConsumed > 0;
              const amount = isDebit
                ? entry.creditsConsumed
                : entry.creditsAdded;
              const iconPath =
                ACTION_ICONS[entry.actionType] ?? ACTION_ICONS.credit_analysis;

              return (
                <tr key={entry.id} className="group">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          isDebit
                            ? "bg-gray-100 dark:bg-slate-700"
                            : "bg-emerald-100 dark:bg-emerald-950/30"
                        }`}
                      >
                        <svg
                          className={`w-4 h-4 ${
                            isDebit
                              ? "text-gray-500 dark:text-slate-400"
                              : "text-emerald-500"
                          }`}
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1.5}
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d={iconPath}
                          />
                        </svg>
                      </div>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {ACTION_LABELS[entry.actionType] ?? entry.actionType}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    <span className="text-sm text-gray-500 dark:text-slate-400">
                      {new Date(entry.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-right">
                    <span
                      className={`text-sm font-medium ${
                        isDebit
                          ? "text-red-600 dark:text-red-400"
                          : "text-emerald-600 dark:text-emerald-400"
                      }`}
                    >
                      {isDebit ? "-" : "+"}
                      {amount.toLocaleString()}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <span className="text-sm text-gray-700 dark:text-slate-300">
                      {entry.balanceAfter.toLocaleString()}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {hasMore && (
        <div className="mt-4 text-center">
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 disabled:opacity-50"
          >
            {loadingMore ? "Loading..." : "Load more"}
          </button>
        </div>
      )}
    </div>
  );
}
