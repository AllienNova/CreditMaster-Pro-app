"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowPathIcon,
  PlusIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ChevronRightIcon,
  CreditCardIcon,
  ClockIcon,
  SparklesIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { EmptyState } from "@/components/ui/EmptyState";
import { PullToRefresh } from "@/components/ui/PullToRefresh";

// ============================================================================
// Types
// ============================================================================

interface Subscription {
  id: string;
  name: string;
  merchantName: string;
  amount: number;
  frequency: "weekly" | "monthly" | "quarterly" | "yearly";
  category: string;
  status: "active" | "paused" | "pending_cancellation" | "cancelled";
  nextBillingDate: Date;
  logoUrl?: string;
  annualCost: number;
}

interface SubscriptionStats {
  totalMonthlySpend: number;
  totalAnnualSpend: number;
  activeCount: number;
  pendingCancellationCount: number;
  cancelledCount: number;
}

type FilterStatus = "all" | "active" | "pending_cancellation" | "cancelled";
type SortBy = "name" | "amount" | "nextBillingDate" | "category";

// ============================================================================
// Mock Data
// ============================================================================

/*
 * `mockSubscriptions` (eight invented subscriptions) and `mockStats`
 * (totals, counts and $563.15 of "potential annual savings") lived here.
 * Both are gone: the list comes from GET /api/financial/subscriptions and the
 * stats are computed from those same rows. See loadData below.
 */


// ============================================================================
// Helper Functions
// ============================================================================

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function getDaysUntil(date: Date): number {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function getFrequencyLabel(frequency: string): string {
  switch (frequency) {
    case "weekly":
      return "/week";
    case "monthly":
      return "/mo";
    case "quarterly":
      return "/qtr";
    case "yearly":
      return "/year";
    default:
      return "";
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case "active":
      return (
        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
          Active
        </span>
      );
    case "pending_cancellation":
      return (
        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
          Pending Cancel
        </span>
      );
    case "cancelled":
      return (
        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-400">
          Cancelled
        </span>
      );
    default:
      return null;
  }
}

function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    Entertainment: "#EC4899",
    Software: "#3B82F6",
    "Health & Fitness": "#22C55E",
    Shopping: "#F59E0B",
    Storage: "#8B5CF6",
    News: "#EF4444",
    Music: "#06B6D4",
  };
  return colors[category] || "#9CA3AF";
}

// ============================================================================
// Components
// ============================================================================

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor,
  trend,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ElementType;
  iconColor: string;
  trend?: { value: string; isPositive: boolean };
}) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-gray-200 dark:border-slate-700">
      <div className="flex items-center gap-3 mb-2">
        <div
          className={`p-2 rounded-lg`}
          style={{ backgroundColor: `${iconColor}20` }}
        >
          <Icon className="w-5 h-5" style={{ color: iconColor }} />
        </div>
        <span className="text-sm text-gray-500 dark:text-slate-400">
          {title}
        </span>
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">
        {value}
      </p>
      {(subtitle || trend) && (
        <div className="flex items-center gap-2 mt-1">
          {subtitle && (
            <span className="text-sm text-gray-500 dark:text-slate-400">
              {subtitle}
            </span>
          )}
          {trend && (
            <span
              className={`text-sm font-medium ${trend.isPositive ? "text-emerald-600" : "text-red-500"}`}
            >
              {trend.value}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function SubscriptionCard({
  subscription,
  onCancel,
  onViewDetails,
}: {
  subscription: Subscription;
  onCancel: () => void;
  onViewDetails: () => void;
}) {
  const daysUntil = getDaysUntil(subscription.nextBillingDate);
  const isUpcoming = daysUntil > 0 && daysUntil <= 7;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-4">
        {/* Logo */}
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg"
          style={{ backgroundColor: getCategoryColor(subscription.category) }}
        >
          {subscription.name.charAt(0)}
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-gray-900 dark:text-white truncate">
              {subscription.name}
            </h3>
            {getStatusBadge(subscription.status)}
          </div>

          <p className="text-sm text-gray-500 dark:text-slate-400 mb-2">
            {subscription.category}
          </p>

          <div className="flex items-center gap-4 text-sm">
            <span className="font-medium text-gray-900 dark:text-white">
              {formatCurrency(subscription.amount)}
              <span className="text-gray-500 dark:text-slate-400 font-normal">
                {getFrequencyLabel(subscription.frequency)}
              </span>
            </span>

            {subscription.status === "active" && (
              <span
                className={`flex items-center gap-1 ${isUpcoming ? "text-amber-600" : "text-gray-500 dark:text-slate-400"}`}
              >
                <ClockIcon className="w-4 h-4" />
                {isUpcoming
                  ? `${daysUntil}d`
                  : formatDate(subscription.nextBillingDate)}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {subscription.status === "active" && (
            <button
              onClick={onCancel}
              className="px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            onClick={onViewDetails}
            className="p-2 text-gray-400 hover:text-gray-600 dark:text-slate-300 dark:hover:text-gray-300 transition-colors"
          >
            <ChevronRightIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function SubscriptionsEmptyState() {
  return (
    <EmptyState
      type="no-subscriptions"
      title="No subscriptions found"
      description="Connect your bank account to automatically detect subscriptions, or add them manually."
      primaryAction={{
        label: "Add Subscription",
        onClick: () => {
          /* Add subscription action */
        },
        icon: <PlusIcon className="w-5 h-5" />,
      }}
      secondaryAction={{
        label: "Detect from Bank",
        onClick: () => {
          /* Detect from bank action */
        },
        icon: <SparklesIcon className="w-5 h-5" />,
      }}
    />
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [stats, setStats] = useState<SubscriptionStats>({
    totalMonthlySpend: 0,
    totalAnnualSpend: 0,
    activeCount: 0,
    pendingCancellationCount: 0,
    cancelledCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [sortBy, setSortBy] = useState<SortBy>("nextBillingDate");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubscription, setSelectedSubscription] =
    useState<Subscription | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);

  /*
   * WHAT THIS REPLACED. `mockSubscriptions` and `mockStats` seeded the page,
   * and loadData was `await new Promise(setTimeout 800)` followed by setting
   * both — eight hundred milliseconds of spinner over no request.
   *
   * The stats are now COMPUTED FROM THE SAME ROWS the list renders, so the
   * summary and the list cannot disagree — the failure mode that gave
   * financial/transactions a spending chart contradicting its own ledger.
   *
   * Potential Savings is GONE rather than estimated. Both the tile and the
   * banner ("We found $X in potential savings!") asserted the result of an
   * analysis that does not exist: nothing here decides which subscriptions a
   * user does not need. Claiming a finding no analysis produced is the same
   * shape as the dark-web breach card removed earlier today.
   */
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setLoadFailed(false);
    try {
      const res = await fetch("/api/financial/subscriptions");
      if (!res.ok) throw new Error(String(res.status));
      const json = await res.json();
      const rows: Subscription[] = Array.isArray(json.subscriptions)
        ? json.subscriptions
        : [];
      setSubscriptions(rows);

      const monthlyOf = (sub: Subscription) => {
        switch (sub.frequency) {
          case "weekly":
            return sub.amount * (52 / 12);
          case "quarterly":
            return sub.amount / 3;
          case "yearly":
            return sub.amount / 12;
          default:
            return sub.amount;
        }
      };
      const active = rows.filter((r) => r.status === "active");
      const monthly = active.reduce((sum, r) => sum + monthlyOf(r), 0);
      setStats({
        totalMonthlySpend: monthly,
        totalAnnualSpend: monthly * 12,
        activeCount: active.length,
        pendingCancellationCount: rows.filter(
          (r) => r.status === "pending_cancellation",
        ).length,
        cancelledCount: rows.filter((r) => r.status === "cancelled").length,
      });
    } catch {
      // A failed read is not "you have no subscriptions".
      setLoadFailed(true);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter and sort subscriptions
  const filteredSubscriptions = subscriptions
    .filter((s) => {
      if (filterStatus !== "all" && s.status !== filterStatus) return false;
      if (
        searchQuery &&
        !s.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
        return false;
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "amount":
          return b.amount - a.amount;
        case "nextBillingDate":
          return (
            new Date(a.nextBillingDate).getTime() -
            new Date(b.nextBillingDate).getTime()
          );
        case "category":
          return a.category.localeCompare(b.category);
        default:
          return 0;
      }
    });

  const handleCancel = (subscription: Subscription) => {
    setSelectedSubscription(subscription);
    setShowCancelModal(true);
  };

  const handleViewDetails = (_subscription: Subscription) => {
    // Navigate to subscription detail page
    // SubscriptionsPage: View subscription details
    void _subscription;
  };

  const handleRefresh = useCallback(async () => {
    await loadData();
  }, [loadData]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-48"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-32 bg-gray-200 dark:bg-slate-700 rounded-xl"
                ></div>
              ))}
            </div>
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-24 bg-gray-200 dark:bg-slate-700 rounded-xl"
                ></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <PullToRefresh
      onRefresh={handleRefresh}
      className="min-h-screen bg-gray-50 dark:bg-slate-900 p-6"
    >
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Subscriptions
            </h1>
            <p className="text-gray-500 dark:text-slate-400">
              Manage your recurring payments and save money
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => loadData()}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-gray-200 transition-colors"
              title="Refresh"
            >
              <ArrowPathIcon className="w-5 h-5" />
            </button>
            <button className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2">
              <PlusIcon className="w-5 h-5" />
              Add Subscription
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            title="Monthly Spend"
            value={formatCurrency(stats.totalMonthlySpend)}
            subtitle={`${stats.activeCount} active`}
            icon={CreditCardIcon}
            iconColor="#3B82F6"
          />
          <StatCard
            title="Annual Spend"
            value={formatCurrency(stats.totalAnnualSpend)}
            icon={ClockIcon}
            iconColor="#8B5CF6"
          />
          <StatCard
            title="Pending Cancellation"
            value={stats.pendingCancellationCount.toString()}
            subtitle="subscriptions"
            icon={ExclamationTriangleIcon}
            iconColor="#F59E0B"
          />
        </div>

        {/*
          An "AI Savings Banner" lived here: "We found $X in potential
          savings!" over a Review Suggestions button, gated on
          stats.potentialAnnualSavings > 100 — a threshold on an invented
          number. Nothing in this app decides which subscriptions a user does
          not need, so there was no analysis to have found anything, and the
          button led to no suggestions. Removed with the constant it read.
        */}

        {/* Filters */}
        <div className="flex flex-col gap-4 mb-6">
          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Search subscriptions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {/* Status Filter */}
            <div className="flex flex-wrap gap-2">
              {(
                [
                  "all",
                  "active",
                  "pending_cancellation",
                  "cancelled",
                ] as FilterStatus[]
              ).map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                    filterStatus === status
                      ? "bg-emerald-600 text-white"
                      : "bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-400 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700"
                  }`}
                >
                  {status === "all"
                    ? "All"
                    : status === "pending_cancellation"
                      ? "Pending"
                      : status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
              className="px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm flex-shrink-0"
            >
              <option value="nextBillingDate">Next Billing</option>
              <option value="amount">Amount</option>
              <option value="name">Name</option>
              <option value="category">Category</option>
            </select>
          </div>
        </div>

        {/* Subscription List */}
        {filteredSubscriptions.length === 0 ? (
          <SubscriptionsEmptyState />
        ) : (
          <div className="space-y-3">
            {filteredSubscriptions.map((subscription) => (
              <SubscriptionCard
                key={subscription.id}
                subscription={subscription}
                onCancel={() => handleCancel(subscription)}
                onViewDetails={() => handleViewDetails(subscription)}
              />
            ))}
          </div>
        )}

        {/* Category Breakdown */}
        <div className="mt-8 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Spending by Category
          </h2>
          <div className="space-y-4">
            {Array.from(
              new Set(
                subscriptions
                  .filter((s) => s.status === "active")
                  .map((s) => s.category),
              ),
            ).map((category) => {
              const categorySubs = subscriptions.filter(
                (s) => s.category === category && s.status === "active",
              );
              const categoryTotal = categorySubs.reduce((sum, s) => {
                const monthly =
                  s.frequency === "yearly" ? s.amount / 12 : s.amount;
                return sum + monthly;
              }, 0);
              const percentage =
                (categoryTotal / stats.totalMonthlySpend) * 100;

              return (
                <div key={category}>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700 dark:text-slate-300">
                      {category}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-slate-400">
                      {formatCurrency(categoryTotal)}/mo ({categorySubs.length})
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: getCategoryColor(category),
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Cancel Modal would go here */}
      {showCancelModal && selectedSubscription && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-lg w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Cancel {selectedSubscription.name}?
            </h2>
            <p className="text-gray-500 dark:text-slate-400 mb-6">
              We'll guide you through the cancellation process and provide
              helpful tips.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                Keep Subscription
              </button>
              <button
                onClick={() => {
                  // Navigate to cancellation flow
                  setShowCancelModal(false);
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Start Cancellation
              </button>
            </div>
          </div>
        </div>
      )}
    </PullToRefresh>
  );
}
