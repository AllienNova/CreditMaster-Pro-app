"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CreditCard,
  Plus,
  TrendingDown,
  DollarSign,
  AlertCircle,
  Sparkles,
  RefreshCw,
  CheckCircle,
  Clock,
  XCircle,
  Calendar,
} from "lucide-react";
import { Button, Modal, EmptyState } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/hooks/useAuth";
import { FadeIn } from "@/components/ui/animations";
import { SubscriptionCancellationWizard } from "@/components/financial/SubscriptionCancellationWizard";
import type {
  Subscription,
  SubscriptionStats,
  SubscriptionInsight,
  CancellationOutcome,
} from "@/lib/financial/subscription-cancellation-service";

// ============================================================================
// Types
// ============================================================================

type FilterTab = "all" | "active" | "pending_cancellation" | "cancelled";

// ============================================================================
// Constants
// ============================================================================

const FILTER_TABS: { value: FilterTab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "pending_cancellation", label: "Pending Cancellation" },
  { value: "cancelled", label: "Cancelled" },
];

const STATUS_CONFIG: Record<
  Subscription["status"],
  { label: string; className: string; icon: React.ComponentType<{ className?: string }> }
> = {
  active: {
    label: "Active",
    className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    icon: CheckCircle,
  },
  paused: {
    label: "Paused",
    className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    icon: Clock,
  },
  pending_cancellation: {
    label: "Pending",
    className: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    icon: AlertCircle,
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-slate-400",
    icon: XCircle,
  },
};

const PRIORITY_CONFIG = {
  high: "border-l-red-500",
  medium: "border-l-amber-500",
  low: "border-l-blue-500",
} as const;

// ============================================================================
// Helpers
// ============================================================================

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(
    new Date(date),
  );
}

// ============================================================================
// Sub-components
// ============================================================================

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  highlight,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">
            {label}
          </p>
          <p
            className={`text-2xl font-bold mt-1 ${
              highlight
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-gray-900 dark:text-white"
            }`}
          >
            {value}
          </p>
          {sub && <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{sub}</p>}
        </div>
        <div
          className={`p-2 rounded-lg ${
            highlight
              ? "bg-emerald-100 dark:bg-emerald-900/30"
              : "bg-gray-100 dark:bg-slate-700"
          }`}
        >
          <Icon
            className={`w-5 h-5 ${
              highlight
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-gray-500 dark:text-slate-400"
            }`}
          />
        </div>
      </div>
    </div>
  );
}

function SubscriptionCard({
  subscription,
  onCancel,
}: {
  subscription: Subscription;
  onCancel: (sub: Subscription) => void;
}) {
  const statusCfg = STATUS_CONFIG[subscription.status];
  const StatusIcon = statusCfg.icon;
  const isActive = subscription.status === "active";

  return (
    <div className="flex items-center gap-4 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 hover:border-gray-300 dark:hover:border-slate-600 transition-colors">
      {/* Logo placeholder */}
      <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gray-100 dark:bg-slate-700 flex items-center justify-center">
        <CreditCard className="w-5 h-5 text-gray-400 dark:text-slate-500" />
      </div>

      {/* Main info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
            {subscription.name}
          </p>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${statusCfg.className}`}>
            <StatusIcon className="w-3 h-3" />
            {statusCfg.label}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-xs text-gray-500 dark:text-slate-400 capitalize">
            {subscription.category}
          </span>
          {subscription.nextBillingDate && subscription.status !== "cancelled" && (
            <span className="inline-flex items-center gap-1 text-xs text-gray-400 dark:text-slate-500">
              <Calendar className="w-3 h-3" />
              {formatDate(subscription.nextBillingDate)}
            </span>
          )}
        </div>
      </div>

      {/* Amount */}
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-bold text-gray-900 dark:text-white">
          {formatCurrency(subscription.amount)}
        </p>
        <p className="text-xs text-gray-400 dark:text-slate-500 capitalize">
          /{subscription.frequency}
        </p>
      </div>

      {/* Cancel button */}
      {isActive && (
        <Button
          variant="destructive"
          size="sm"
          onClick={() => onCancel(subscription)}
          className="flex-shrink-0"
        >
          Cancel
        </Button>
      )}
    </div>
  );
}

function InsightCard({ insight }: { insight: SubscriptionInsight }) {
  return (
    <div
      className={`rounded-xl border-l-4 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 ${
        PRIORITY_CONFIG[insight.priority]
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">{insight.title}</p>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5 leading-relaxed">
            {insight.description}
          </p>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1.5">
            {insight.recommendation}
          </p>
        </div>
        {insight.potentialSavings > 0 && (
          <div className="flex-shrink-0 text-right">
            <p className="text-xs text-gray-400 dark:text-slate-500">Save up to</p>
            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(insight.potentialSavings)}/yr
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 animate-pulse">
      <div className="w-10 h-10 rounded-xl bg-gray-200 dark:bg-slate-700" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 bg-gray-200 dark:bg-slate-700 rounded w-40" />
        <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-24" />
      </div>
      <div className="space-y-1.5 text-right">
        <div className="h-3.5 bg-gray-200 dark:bg-slate-700 rounded w-16" />
        <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-12 ml-auto" />
      </div>
    </div>
  );
}

// ============================================================================
// Page
// ============================================================================

export default function SubscriptionsPage() {
  const { user, loading: authLoading } = useAuth();
  const toast = useToast();

  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [stats, setStats] = useState<SubscriptionStats | null>(null);
  const [insights, setInsights] = useState<SubscriptionInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [selectedSub, setSelectedSub] = useState<Subscription | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [subsRes, statsRes, insightsRes] = await Promise.all([
        fetch("/api/financial/subscriptions", { credentials: "include" }),
        fetch("/api/financial/subscriptions/stats", { credentials: "include" }),
        fetch("/api/financial/subscriptions/insights", { credentials: "include" }),
      ]);

      if (subsRes.ok) {
        const data = await subsRes.json();
        setSubscriptions(
          (data.subscriptions ?? []).map((s: Subscription) => ({
            ...s,
            nextBillingDate: new Date(s.nextBillingDate),
            createdAt: new Date(s.createdAt),
            updatedAt: new Date(s.updatedAt),
          })),
        );
      }
      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data.stats ?? null);
      }
      if (insightsRes.ok) {
        const data = await insightsRes.json();
        setInsights(data.insights ?? []);
      }
    } catch {
      toast.error("Failed to load subscriptions");
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (!authLoading) fetchData();
  }, [authLoading, fetchData]);

  const handleCancelClick = useCallback((sub: Subscription) => {
    setSelectedSub(sub);
    setShowWizard(true);
  }, []);

  const handleWizardComplete = useCallback(
    async (outcome: CancellationOutcome) => {
      if (!selectedSub) return;
      setShowWizard(false);
      setSelectedSub(null);

      if (outcome === "cancelled") {
        setSubscriptions((prev) =>
          prev.map((s) =>
            s.id === selectedSub.id ? { ...s, status: "pending_cancellation" as const } : s,
          ),
        );
        toast.success(`${selectedSub.name} cancellation recorded`);
      } else if (outcome === "retained") {
        toast.success("Discount negotiation recorded");
      } else if (outcome === "pending") {
        toast.info("Cancellation saved as in-progress");
      } else {
        toast.error("Cancellation attempt noted — try again when ready");
      }

      await fetchData();
    },
    [selectedSub, fetchData, toast],
  );

  const handleWizardClose = useCallback(() => {
    setShowWizard(false);
    setSelectedSub(null);
  }, []);

  const filteredSubscriptions =
    filter === "all"
      ? subscriptions
      : subscriptions.filter((s) => s.status === filter);

  const isReady = !authLoading && !loading;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">

        {/* Header */}
        <FadeIn direction="down">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Subscriptions
              </h1>
              <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                Track, manage, and cancel your recurring subscriptions
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchData}
                leftIcon={<RefreshCw className="w-4 h-4" />}
                aria-label="Refresh subscriptions"
              >
                Refresh
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowAddModal(true)}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Add Subscription
              </Button>
            </div>
          </div>
        </FadeIn>

        {/* Stats */}
        <FadeIn delay={0.05}>
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }, (_, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 animate-pulse h-24"
                />
              ))}
            </div>
          ) : stats ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                icon={DollarSign}
                label="Monthly spend"
                value={formatCurrency(stats.totalMonthlySpend)}
                sub={`${formatCurrency(stats.totalAnnualSpend)}/year`}
              />
              <StatCard
                icon={CheckCircle}
                label="Active"
                value={String(stats.activeCount)}
                sub="subscriptions"
              />
              <StatCard
                icon={AlertCircle}
                label="Pending"
                value={String(stats.pendingCancellationCount)}
                sub="cancellations"
              />
              <StatCard
                icon={TrendingDown}
                label="Potential savings"
                value={formatCurrency(stats.potentialMonthlySavings)}
                sub="per month"
                highlight
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { icon: DollarSign, label: "Monthly spend", value: "$0.00" },
                { icon: CheckCircle, label: "Active", value: "0" },
                { icon: AlertCircle, label: "Pending", value: "0" },
                { icon: TrendingDown, label: "Potential savings", value: "$0.00", highlight: true },
              ].map((s) => (
                <StatCard key={s.label} {...s} />
              ))}
            </div>
          )}
        </FadeIn>

        {/* Filters + List */}
        <FadeIn delay={0.1}>
          <div className="space-y-4">
            {/* Filter tabs */}
            <div className="flex gap-1 p-1 bg-gray-100 dark:bg-slate-800 rounded-xl w-fit">
              {FILTER_TABS.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setFilter(tab.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                    filter === tab.value
                      ? "bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm"
                      : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200"
                  }`}
                >
                  {tab.label}
                  {tab.value !== "all" && (
                    <span className="ml-1.5 text-xs opacity-70">
                      {subscriptions.filter((s) => s.status === tab.value).length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Subscription cards */}
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }, (_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : filteredSubscriptions.length === 0 ? (
              <EmptyState
                type="no-subscriptions"
                title={
                  filter === "all"
                    ? "No subscriptions yet"
                    : `No ${filter.replace(/_/g, " ")} subscriptions`
                }
                description={
                  filter === "all"
                    ? "Add your recurring subscriptions to track and manage them in one place."
                    : "No subscriptions match this filter."
                }
                primaryAction={
                  filter === "all"
                    ? {
                        label: "Add your first subscription",
                        onClick: () => setShowAddModal(true),
                      }
                    : undefined
                }
              />
            ) : (
              <div className="space-y-3">
                {filteredSubscriptions.map((sub) => (
                  <SubscriptionCard
                    key={sub.id}
                    subscription={sub}
                    onCancel={handleCancelClick}
                  />
                ))}
              </div>
            )}
          </div>
        </FadeIn>

        {/* Insights */}
        {isReady && insights.length > 0 && (
          <FadeIn delay={0.15}>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                  AI Insights
                </h2>
              </div>
              <div className="space-y-3">
                {insights.slice(0, 5).map((insight) => (
                  <InsightCard key={insight.subscriptionId} insight={insight} />
                ))}
              </div>
            </div>
          </FadeIn>
        )}
      </div>

      {/* Cancellation Wizard Modal */}
      {selectedSub && (
        <Modal
          isOpen={showWizard}
          onClose={handleWizardClose}
          title={`Cancel ${selectedSub.name}`}
          size="lg"
          closeOnOverlayClick={false}
        >
          <SubscriptionCancellationWizard
            subscription={selectedSub}
            onComplete={handleWizardComplete}
            onClose={handleWizardClose}
          />
        </Modal>
      )}

      {/* Add Subscription Modal (placeholder) */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Subscription"
        size="md"
        footer={
          <Button variant="primary" size="sm" onClick={() => setShowAddModal(false)}>
            Done
          </Button>
        }
      >
        <div className="py-4 text-center">
          <CreditCard className="w-10 h-10 text-gray-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Manual subscription entry coming soon. Connect your bank account to auto-detect
            subscriptions.
          </p>
        </div>
      </Modal>
    </div>
  );
}
