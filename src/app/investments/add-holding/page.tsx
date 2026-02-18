"use client";

/**
 * Add Holding Page
 * Form to add a new investment holding
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type AssetType =
  | "stock"
  | "etf"
  | "mutual_fund"
  | "bond"
  | "crypto"
  | "option"
  | "other";

const assetTypes: { value: AssetType; label: string }[] = [
  { value: "stock", label: "Stocks" },
  { value: "etf", label: "ETFs" },
  { value: "mutual_fund", label: "Mutual Funds" },
  { value: "bond", label: "Bonds" },
  { value: "crypto", label: "Cryptocurrency" },
  { value: "option", label: "Options" },
  { value: "other", label: "Other" },
];

export default function AddHoldingPage() {
  const router = useRouter();
  const [symbol, setSymbol] = useState("");
  const [name, setName] = useState("");
  const [shares, setShares] = useState("");
  const [costBasis, setCostBasis] = useState("");
  const [assetType, setAssetType] = useState<AssetType>("stock");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateForm = (): boolean => {
    if (!symbol.trim()) {
      setError("Please enter a stock symbol");
      return false;
    }
    if (!shares || parseFloat(shares) <= 0) {
      setError("Please enter a valid number of shares");
      return false;
    }
    if (!costBasis || parseFloat(costBasis) <= 0) {
      setError("Please enter a valid cost basis");
      return false;
    }
    setError(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/investments/holdings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: symbol.trim().toUpperCase(),
          name: name.trim() || symbol.trim().toUpperCase(),
          quantity: parseFloat(shares),
          purchase_price: parseFloat(costBasis),
          asset_type: assetType,
          purchase_date: purchaseDate || new Date().toISOString().split("T")[0],
          notes: notes.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to add holding");
      }

      router.push("/investments/holdings");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add holding");
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalInvestment =
    shares && costBasis
      ? (parseFloat(shares) * parseFloat(costBasis)).toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link
              href="/investments/holdings"
              className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-slate-200 dark:hover:text-gray-300 mb-2"
            >
              <svg
                className="w-4 h-4 mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back to Holdings
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Add New Holding
            </h1>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Investment Details */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Investment Details
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Symbol *
                </label>
                <input
                  type="text"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                  placeholder="e.g., AAPL"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Company/Asset Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Apple Inc."
                  className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Asset Type */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Asset Type
            </h2>
            <div className="flex flex-wrap gap-2">
              {assetTypes.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setAssetType(type.value)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${assetType === type.value ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600"}`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Purchase Details */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Purchase Details
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Number of Shares *
                </label>
                <input
                  type="number"
                  step="any"
                  value={shares}
                  onChange={(e) => setShares(e.target.value)}
                  placeholder="0"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Cost per Share *
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-slate-400">
                    $
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    value={costBasis}
                    onChange={(e) => setCostBasis(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-8 pr-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                Purchase Date
              </label>
              <input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>

            {/* Total Preview */}
            {totalInvestment && (
              <div className="mt-4 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-center">
                <p className="text-sm text-gray-600 dark:text-slate-400 mb-1">
                  Total Investment
                </p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  ${totalInvestment}
                </p>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Notes (Optional)
            </h2>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this investment..."
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Submit Button */}
          <div className="flex gap-4">
            <Link
              href="/investments/holdings"
              className="flex-1 px-6 py-3 text-center text-sm font-medium text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Adding..." : "Add Holding"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
