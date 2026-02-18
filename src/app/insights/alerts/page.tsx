"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Wallet,
  Calendar,
  Lightbulb,
  Shield,
  Settings,
  Check,
  X,
  ChevronRight,
  Filter,
  Clock,
} from "lucide-react";
import Link from "next/link";

type AlertType =
  | "unusual_spending"
  | "low_balance"
  | "large_transaction"
  | "bill_due"
  | "subscription_change"
  | "savings_opportunity"
  | "credit_change"
  | "budget_exceeded"
  | "fraud_suspected";

type AlertPriority = "low" | "medium" | "high" | "critical";
type AlertStatus = "pending" | "read" | "dismissed" | "acted_upon";

interface Alert {
  id: string;
  type: AlertType;
  priority: AlertPriority;
  title: string;
  message: string;
  actionUrl: string;
  actionLabel: string;
  data: Record<string, unknown>;
  status: AlertStatus;
  createdAt: Date;
}

const MOCK_ALERTS: Alert[] = [
  {
    id: "1",
    type: "fraud_suspected",
    priority: "critical",
    title: "Suspicious Activity Detected",
    message:
      "Unusual transaction pattern detected on your credit card ending in 4532",
    actionUrl: "/settings/security",
    actionLabel: "Review Activity",
    data: { amount: 847.99, merchant: "Unknown Merchant", location: "Foreign" },
    status: "pending",
    createdAt: new Date(Date.now() - 30 * 60 * 1000),
  },
  {
    id: "2",
    type: "bill_due",
    priority: "high",
    title: "Bill Due Tomorrow",
    message: "Your electricity bill of $142.50 is due tomorrow",
    actionUrl: "/budgeting/bills",
    actionLabel: "Pay Now",
    data: {
      billName: "Electric Company",
      amount: 142.5,
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
    status: "pending",
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
  },
  {
    id: "3",
    type: "budget_exceeded",
    priority: "high",
    title: "Budget Exceeded",
    message: "Your Dining Out budget has exceeded the limit by $45.00",
    actionUrl: "/budgeting",
    actionLabel: "Adjust Budget",
    data: { category: "Dining Out", spent: 345, budget: 300, overage: 45 },
    status: "pending",
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
  },
  {
    id: "4",
    type: "unusual_spending",
    priority: "medium",
    title: "Unusual Spending Pattern",
    message: "Your shopping spending is 85% higher than your monthly average",
    actionUrl: "/insights/spending",
    actionLabel: "View Details",
    data: {
      category: "Shopping",
      currentSpending: 650,
      average: 350,
      percentIncrease: 85,
    },
    status: "read",
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
  },
  {
    id: "5",
    type: "credit_change",
    priority: "medium",
    title: "Credit Score Update",
    message: "Your credit score increased by 15 points to 742",
    actionUrl: "/credit",
    actionLabel: "View Score",
    data: { currentScore: 742, previousScore: 727, change: 15 },
    status: "read",
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  },
  {
    id: "6",
    type: "savings_opportunity",
    priority: "low",
    title: "Savings Opportunity",
    message: "You could save $35/month by switching your streaming services",
    actionUrl: "/budgeting/subscriptions",
    actionLabel: "Review",
    data: {
      potentialSavings: 35,
      subscriptions: ["Netflix", "Hulu", "Disney+"],
    },
    status: "pending",
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
  },
  {
    id: "7",
    type: "subscription_change",
    priority: "medium",
    title: "Subscription Price Increase",
    message: "Netflix increased their price from $15.99 to $17.99/month",
    actionUrl: "/budgeting/subscriptions",
    actionLabel: "Review",
    data: {
      subscription: "Netflix",
      oldPrice: 15.99,
      newPrice: 17.99,
      increase: 2,
    },
    status: "dismissed",
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
  },
];

const ALERT_TYPE_CONFIG: Record<
  AlertType,
  { icon: React.ReactNode; color: string; bgColor: string }
> = {
  unusual_spending: {
    icon: <TrendingUp className="w-5 h-5" />,
    color: "text-orange-600",
    bgColor: "bg-orange-100 dark:bg-orange-900/30",
  },
  low_balance: {
    icon: <Wallet className="w-5 h-5" />,
    color: "text-red-600",
    bgColor: "bg-red-100 dark:bg-red-900/30",
  },
  large_transaction: {
    icon: <CreditCard className="w-5 h-5" />,
    color: "text-blue-600",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
  },
  bill_due: {
    icon: <Calendar className="w-5 h-5" />,
    color: "text-blue-600",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
  },
  subscription_change: {
    icon: <TrendingUp className="w-5 h-5" />,
    color: "text-blue-600",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
  },
  savings_opportunity: {
    icon: <Lightbulb className="w-5 h-5" />,
    color: "text-green-600",
    bgColor: "bg-green-100 dark:bg-green-900/30",
  },
  credit_change: {
    icon: <TrendingUp className="w-5 h-5" />,
    color: "text-emerald-600",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
  },
  budget_exceeded: {
    icon: <AlertTriangle className="w-5 h-5" />,
    color: "text-red-600",
    bgColor: "bg-red-100 dark:bg-red-900/30",
  },
  fraud_suspected: {
    icon: <Shield className="w-5 h-5" />,
    color: "text-red-600",
    bgColor: "bg-red-100 dark:bg-red-900/30",
  },
};

export default function ProactiveAlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>(MOCK_ALERTS);
  const [filter, setFilter] = useState<"all" | "pending" | "read">("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | AlertPriority>(
    "all",
  );

  const filteredAlerts = alerts.filter((alert) => {
    if (filter !== "all" && alert.status !== filter) return false;
    if (priorityFilter !== "all" && alert.priority !== priorityFilter)
      return false;
    return true;
  });

  const pendingCount = alerts.filter((a) => a.status === "pending").length;
  const criticalCount = alerts.filter(
    (a) => a.priority === "critical" && a.status === "pending",
  ).length;

  const handleDismiss = (alertId: string) => {
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === alertId ? { ...a, status: "dismissed" as AlertStatus } : a,
      ),
    );
  };

  const handleMarkRead = (alertId: string) => {
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === alertId ? { ...a, status: "read" as AlertStatus } : a,
      ),
    );
  };

  const handleMarkAllRead = () => {
    setAlerts((prev) =>
      prev.map((a) =>
        a.status === "pending" ? { ...a, status: "read" as AlertStatus } : a,
      ),
    );
  };

  const getPriorityBadgeColor = (priority: AlertPriority) => {
    switch (priority) {
      case "critical":
        return "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 animate-pulse";
      case "high":
        return "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300";
      case "medium":
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300";
      case "low":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300";
    }
  };

  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return "Just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Bell className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Smart Alerts
              </h1>
              {pendingCount > 0 && (
                <span className="px-2.5 py-1 text-sm font-semibold bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 rounded-full">
                  {pendingCount} new
                </span>
              )}
            </div>
            <p className="text-gray-600 dark:text-slate-400">
              AI-powered alerts to keep your finances on track
            </p>
          </div>

          <div className="flex items-center gap-3 mt-4 sm:mt-0">
            <button
              onClick={handleMarkAllRead}
              disabled={pendingCount === 0}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              Mark All Read
            </button>
            <Link
              href="/settings/notifications"
              className="p-2 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
              aria-label="Alert settings"
            >
              <Settings className="w-5 h-5 text-gray-600 dark:text-slate-400" />
            </Link>
          </div>
        </div>

        {/* Critical Alert Banner */}
        {criticalCount > 0 && (
          <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-xl p-4 mb-6 animate-pulse">
            <div className="flex items-center gap-3">
              <Shield className="w-6 h-6 text-red-600 dark:text-red-400" />
              <div>
                <h2 className="font-semibold text-red-800 dark:text-red-200">
                  {criticalCount} Critical Alert{criticalCount > 1 ? "s" : ""}{" "}
                  Require Immediate Attention
                </h2>
                <p className="text-sm text-red-700 dark:text-red-300">
                  Please review and take action on these alerts as soon as
                  possible.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500 dark:text-slate-400" />
              <span className="text-sm text-gray-500 dark:text-slate-400">
                Filter:
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {(["all", "pending", "read"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === f ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600 dark:text-slate-400 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600"}`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
            <div className="sm:ml-auto flex flex-wrap gap-2">
              {(["all", "critical", "high", "medium", "low"] as const).map(
                (p) => (
                  <button
                    key={p}
                    onClick={() => setPriorityFilter(p)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${priorityFilter === p ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600 dark:text-slate-400 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600"}`}
                  >
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                ),
              )}
            </div>
          </div>
        </div>

        {/* Alerts List */}
        <div className="space-y-4">
          <AnimatePresence>
            {filteredAlerts.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-12 text-center">
                <Bell className="w-12 h-12 text-gray-400 dark:text-slate-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No Alerts
                </h3>
                <p className="text-gray-500 dark:text-slate-400">
                  You're all caught up! No alerts match your current filters.
                </p>
              </div>
            ) : (
              filteredAlerts.map((alert) => {
                const config = ALERT_TYPE_CONFIG[alert.type];
                return (
                  <motion.div
                    key={alert.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm overflow-hidden ${
                      alert.status === "pending"
                        ? "ring-2 ring-blue-500/20"
                        : ""
                    }`}
                  >
                    <div className="p-4 sm:p-6">
                      <div className="flex items-start gap-4">
                        <div
                          className={`p-3 rounded-xl ${config.bgColor} ${config.color}`}
                        >
                          {config.icon}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-gray-900 dark:text-white">
                                  {alert.title}
                                </h3>
                                <span
                                  className={`px-2 py-0.5 rounded text-xs font-medium ${getPriorityBadgeColor(alert.priority)}`}
                                >
                                  {alert.priority}
                                </span>
                                {alert.status === "pending" && (
                                  <span className="w-2 h-2 bg-blue-500 rounded-full" />
                                )}
                              </div>
                              <p className="text-gray-600 dark:text-slate-400 mb-3">
                                {alert.message}
                              </p>
                              <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-slate-400">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5" />
                                  {formatTimeAgo(alert.createdAt)}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {alert.status === "pending" && (
                                <button
                                  onClick={() => handleDismiss(alert.id)}
                                  className="p-2 text-gray-400 hover:text-gray-600 dark:text-slate-300 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                  aria-label="Dismiss alert"
                                  title="Dismiss"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-3 mt-4">
                            <Link
                              href={alert.actionUrl}
                              onClick={() => handleMarkRead(alert.id)}
                              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                            >
                              {alert.actionLabel}
                              <ChevronRight className="w-4 h-4" />
                            </Link>
                            {alert.status === "pending" && (
                              <button
                                onClick={() => handleMarkRead(alert.id)}
                                className="text-sm text-gray-500 hover:text-gray-700 dark:text-slate-200 dark:hover:text-gray-300"
                              >
                                Mark as read
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>

        {/* Alert Stats */}
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Total Alerts
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {alerts.length}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
            <p className="text-sm text-gray-500 dark:text-slate-400">Pending</p>
            <p className="text-2xl font-bold text-blue-600">
              {alerts.filter((a) => a.status === "pending").length}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Critical
            </p>
            <p className="text-2xl font-bold text-red-600">
              {alerts.filter((a) => a.priority === "critical").length}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Acted On
            </p>
            <p className="text-2xl font-bold text-green-600">
              {alerts.filter((a) => a.status === "acted_upon").length}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
