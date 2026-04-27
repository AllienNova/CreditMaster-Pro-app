"use client";

import { useState } from "react";
import { CREDIT_PACKS } from "@/lib/credits/credit-costs";
import type { CreditPackType } from "@/lib/credits/types";

interface CreditPurchaseModalProps {
  open: boolean;
  onClose: () => void;
  onPurchaseComplete?: (newBalance: number) => void;
}

export default function CreditPurchaseModal({
  open,
  onClose,
  onPurchaseComplete,
}: CreditPurchaseModalProps) {
  const [purchasing, setPurchasing] = useState<CreditPackType | null>(null);
  const [success, setSuccess] = useState<{
    pack: CreditPackType;
    newBalance: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handlePurchase = async (packType: CreditPackType) => {
    setPurchasing(packType);
    setError(null);

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

      setSuccess({ pack: packType, newBalance: data.newBalance });
      onPurchaseComplete?.(data.newBalance);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Purchase failed");
    } finally {
      setPurchasing(null);
    }
  };

  const handleClose = () => {
    setSuccess(null);
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />
      <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-lg w-full mx-4 p-6">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
          Buy Credit Packs
        </h2>
        <p className="text-sm text-gray-600 dark:text-slate-400 mb-6">
          Credits never expire. Use them for AI analysis, trading signals, and
          more.
        </p>

        {success && (
          <div className="mb-6 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4">
            <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
              Purchase successful! Your new balance is{" "}
              {success.newBalance.toLocaleString()} credits.
            </p>
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-sm font-medium text-red-800 dark:text-red-300">
              {error}
            </p>
          </div>
        )}

        <div className="space-y-3">
          {CREDIT_PACKS.map((pack) => {
            const isValue = pack.type === "value";
            const isLoading = purchasing === pack.type;

            return (
              <div
                key={pack.type}
                className={`relative rounded-xl border p-4 transition-all ${
                  isValue
                    ? "border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/20 ring-1 ring-emerald-200 dark:ring-emerald-800"
                    : "border-gray-200 dark:border-slate-700 hover:border-emerald-200 dark:hover:border-emerald-700"
                }`}
              >
                {isValue && (
                  <span className="absolute -top-2.5 left-4 bg-emerald-500 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">
                    Most Popular
                  </span>
                )}

                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-bold text-gray-900 dark:text-white capitalize">
                        {pack.type}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-slate-400">
                        {pack.credits.toLocaleString()} credits
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                      ${(pack.perCredit * 1000).toFixed(2)} per 1,000 credits
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xl font-bold text-gray-900 dark:text-white">
                      ${pack.priceUsd}
                    </span>
                    <button
                      onClick={() => handlePurchase(pack.type)}
                      disabled={!!purchasing}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                        isValue
                          ? "bg-emerald-500 text-white hover:bg-emerald-600 disabled:bg-emerald-300"
                          : "bg-gray-900 dark:bg-slate-600 text-white hover:bg-gray-800 dark:hover:bg-slate-500 disabled:bg-gray-400"
                      }`}
                    >
                      {isLoading ? (
                        <span className="flex items-center gap-1.5">
                          <svg
                            className="animate-spin w-4 h-4"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                            />
                          </svg>
                          ...
                        </span>
                      ) : (
                        "Buy"
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
