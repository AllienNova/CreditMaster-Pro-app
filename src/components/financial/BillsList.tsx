"use client";

/**
 * Bills List Component
 *
 * Sortable/filterable list of recurring bills with negotiation potential scoring.
 */

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";

interface Bill {
  id: string;
  name: string;
  provider: string;
  category: "telecom" | "utilities" | "insurance" | "subscription" | "other";
  amount: number;
  frequency: "monthly" | "quarterly" | "yearly";
  dueDate: string;
  nextDueDate: string;
  status: "active" | "paused" | "cancelled";
  negotiable: boolean;
  negotiationPotential: number;
  estimatedSavings: number;
  lastNegotiated?: string;
  autoPayEnabled: boolean;
}

interface BillsListProps {
  onSelectBill: (bill: Bill) => void;
  onNegotiate: (billId: string) => void;
}

export default function BillsList({
  onSelectBill,
  onNegotiate,
}: BillsListProps) {
  const { user } = useAuth();
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<"amount" | "potential" | "dueDate">(
    "potential",
  );
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const fetchBills = useCallback(async () => {
    if (!user) return;

    try {
      const response = await fetch("/api/financial/bills");
      if (!response.ok) throw new Error("Failed to fetch bills");

      const data = await response.json();
      setBills(data.data || []);
    } catch (error) {
      console.error("Error fetching bills:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void fetchBills();
  }, [fetchBills]);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getCategoryIcon = (category: string): string => {
    switch (category) {
      case "telecom":
        return "";
      case "utilities":
        return "";
      case "insurance":
        return "";
      case "subscription":
        return "";
      default:
        return "";
    }
  };

  const getPotentialColor = (potential: number): string => {
    if (potential >= 80) return "text-green-600";
    if (potential >= 60) return "text-blue-600";
    if (potential >= 40) return "text-yellow-600";
    return "text-gray-600 dark:text-slate-300";
  };

  const getPotentialBadge = (potential: number): string => {
    if (potential >= 80) return "bg-green-100 text-green-700";
    if (potential >= 60) return "bg-blue-100 text-blue-700";
    if (potential >= 40) return "bg-yellow-100 text-yellow-700";
    return "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-200";
  };

  const sortedAndFilteredBills = bills
    .filter(
      (bill) => filterCategory === "all" || bill.category === filterCategory,
    )
    .sort((a, b) => {
      switch (sortBy) {
        case "amount":
          return b.amount - a.amount;
        case "potential":
          return b.negotiationPotential - a.negotiationPotential;
        case "dueDate":
          return (
            new Date(a.nextDueDate).getTime() -
            new Date(b.nextDueDate).getTime()
          );
        default:
          return 0;
      }
    });

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 animate-pulse">
        <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-20 bg-gray-200 dark:bg-slate-700 rounded"
            ></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Your Bills
        </h3>
        <div className="flex items-center gap-3">
          {/* Category Filter */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Categories</option>
            <option value="telecom">Telecom</option>
            <option value="utilities">Utilities</option>
            <option value="insurance">Insurance</option>
            <option value="subscription">Subscriptions</option>
            <option value="other">Other</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="potential">Negotiation Potential</option>
            <option value="amount">Amount</option>
            <option value="dueDate">Due Date</option>
          </select>
        </div>
      </div>

      {/* Bills List */}
      {sortedAndFilteredBills.length > 0 ? (
        <div className="space-y-3">
          {sortedAndFilteredBills.map((bill) => (
            <div
              key={bill.id}
              onClick={() => onSelectBill(bill)}
              className="p-4 border border-gray-200 dark:border-slate-700 rounded-lg hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <span className="text-3xl">
                    {getCategoryIcon(bill.category)}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        {bill.name}
                      </h4>
                      {bill.negotiable && (
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${getPotentialBadge(bill.negotiationPotential)}`}
                        >
                          {bill.negotiationPotential}% potential
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-slate-300 mb-2">
                      {bill.provider} • {bill.category}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-slate-400">
                      <span>
                        Next due:{" "}
                        {new Date(bill.nextDueDate).toLocaleDateString()}
                      </span>
                      {bill.autoPayEnabled && (
                        <span className="text-green-600">Auto-pay</span>
                      )}
                      {bill.lastNegotiated && (
                        <span>
                          Last negotiated:{" "}
                          {new Date(bill.lastNegotiated).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                    {formatCurrency(bill.amount)}
                    <span className="text-sm font-normal text-gray-500 dark:text-slate-400">
                      /
                      {bill.frequency === "monthly"
                        ? "mo"
                        : bill.frequency === "quarterly"
                          ? "qtr"
                          : "yr"}
                    </span>
                  </div>
                  {bill.negotiable && bill.estimatedSavings > 0 && (
                    <div className="text-sm text-green-600 mb-2">
                      Save up to {formatCurrency(bill.estimatedSavings)}
                    </div>
                  )}
                  {bill.negotiable && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onNegotiate(bill.id);
                      }}
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Negotiate
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-4xl mb-3"></div>
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No Bills Found
          </h4>
          <p className="text-gray-600 dark:text-slate-300 mb-4">
            Add your recurring bills to get started
          </p>
          <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Add Bill
          </button>
        </div>
      )}
    </div>
  );
}
