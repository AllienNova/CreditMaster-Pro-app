"use client";

/**
 * Smart Alerts — the user's real notifications.
 *
 * WHAT THIS PAGE USED TO SHOW, TO EVERY USER, HAVING ASKED NOTHING.
 *
 * `MOCK_ALERTS[0]` was a critical fraud alert: "Suspicious Activity Detected —
 * Unusual transaction pattern detected on your credit card ending in 4532",
 * $847.99, "Unknown Merchant", location "Foreign". `createdAt` was
 * `Date.now() - 30 * 60 * 1000`, so it was always thirty minutes old and never
 * looked stale. Below it sat an invented electricity bill of $142.50 "due
 * tomorrow". A red banner counted the criticals and told the user they
 * "Require Immediate Attention", pulsing.
 *
 * Fynvita has no fraud detection. `NotificationType` has eleven members —
 * dispute_update, payment_success, document_uploaded, tip, the four reminders,
 * subscription_expiring, welcome, system — and not one of them is a fraud or a
 * bill-due alert. The page was not unwired; it depicted a product that does not
 * exist, in the register most likely to frighten someone into calling their
 * bank.
 *
 * WHAT REPLACED IT. The user's actual notifications, from GET
 * /api/notifications (withAuth, returns `{ notifications, unreadCount }` at the
 * top level — no `data` envelope). Marking read goes to PATCH with
 * `{ action: "mark_read", notificationId }` or `{ action: "mark_all_read" }`;
 * dismissing goes to DELETE `?notificationId=`. All three already existed and
 * the page called none of them: the old handlers only called `setAlerts`, so
 * "Mark All Read" survived until the next refresh and no further.
 *
 * WHAT IS GONE, AND WHY IT IS NOT COMING BACK AS A DEFAULT.
 *   - `priority` (critical/high/medium/low), the priority filter and the
 *     critical banner. Nothing assigns a priority: it is absent from the
 *     `Notification` type, from `notification-service-db`, and from the
 *     `notifications` table (001_initial_schema.sql:52, widened by
 *     002_production_enhancements.sql:91, which adds no such column).
 *   - `actionUrl` / `actionLabel` per alert. Also absent everywhere. The
 *     `data` JSONB column is the documented deep-link mechanism
 *     ("Structured payload for deep-linking", 20260731000150), so per-type
 *     links can be built on real data later — but not invented now.
 */

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Bell,
  Check,
  Settings,
  X,
  FileText,
  CreditCard,
  Upload,
  Lightbulb,
  Clock,
  Info,
} from "lucide-react";

/** Mirrors NotificationType in src/lib/notifications/notification-service-db.ts:25. */
type NotificationType =
  | "dispute_update"
  | "payment_success"
  | "document_uploaded"
  | "tip"
  | "dispute_overdue"
  | "dispute_reminder"
  | "draft_reminder"
  | "score_reminder"
  | "subscription_expiring"
  | "welcome"
  | "system";

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  data?: Record<string, unknown>;
}

const TYPE_META: Record<
  NotificationType,
  { label: string; icon: React.ReactNode; color: string; bgColor: string }
> = {
  dispute_update: {
    label: "Dispute update",
    icon: <FileText className="w-5 h-5" />,
    color: "text-blue-600",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
  },
  dispute_overdue: {
    label: "Dispute overdue",
    icon: <Clock className="w-5 h-5" />,
    color: "text-amber-600",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
  },
  dispute_reminder: {
    label: "Dispute reminder",
    icon: <Clock className="w-5 h-5" />,
    color: "text-amber-600",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
  },
  draft_reminder: {
    label: "Draft reminder",
    icon: <Clock className="w-5 h-5" />,
    color: "text-amber-600",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
  },
  score_reminder: {
    label: "Score reminder",
    icon: <Clock className="w-5 h-5" />,
    color: "text-amber-600",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
  },
  payment_success: {
    label: "Payment",
    icon: <CreditCard className="w-5 h-5" />,
    color: "text-emerald-600",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
  },
  subscription_expiring: {
    label: "Subscription",
    icon: <CreditCard className="w-5 h-5" />,
    color: "text-violet-600",
    bgColor: "bg-violet-100 dark:bg-violet-900/30",
  },
  document_uploaded: {
    label: "Document",
    icon: <Upload className="w-5 h-5" />,
    color: "text-cyan-600",
    bgColor: "bg-cyan-100 dark:bg-cyan-900/30",
  },
  tip: {
    label: "Tip",
    icon: <Lightbulb className="w-5 h-5" />,
    color: "text-yellow-600",
    bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
  },
  welcome: {
    label: "Welcome",
    icon: <Info className="w-5 h-5" />,
    color: "text-blue-600",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
  },
  system: {
    label: "System",
    icon: <Info className="w-5 h-5" />,
    color: "text-gray-600",
    bgColor: "bg-gray-100 dark:bg-slate-700",
  },
};

const FALLBACK_META = TYPE_META.system;

function formatTimeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const seconds = Math.floor((Date.now() - then) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function ProactiveAlertsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/notifications");
      const json = await res.json().catch(() => null);
      if (!res.ok || !Array.isArray(json?.notifications)) {
        setNotifications([]);
        setError(
          "We could not load your alerts. Nothing here is filled in for you — try again in a moment.",
        );
      } else {
        setNotifications(json.notifications as Notification[]);
      }
    } catch {
      setNotifications([]);
      setError("We could not reach the alerts service.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const visible = notifications.filter((n) => {
    if (filter === "unread") return !n.read;
    if (filter === "read") return n.read;
    return true;
  });

  /* Each of these writes to the server and then re-reads, so what the screen
     shows is what the server holds. The previous handlers only set local
     state, which meant "Mark All Read" lasted until the next page load. */
  const markRead = async (id: string) => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark_read", notificationId: id }),
    });
    await load();
  };

  const markAllRead = async () => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark_all_read" }),
    });
    await load();
  };

  const dismiss = async (id: string) => {
    await fetch(`/api/notifications?notificationId=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    await load();
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
              {unreadCount > 0 && (
                <span className="px-2.5 py-1 text-sm font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            <p className="text-gray-600 dark:text-slate-400">
              Updates about your disputes, documents and account.
            </p>
          </div>

          <div className="flex items-center gap-3 mt-4 sm:mt-0">
            <button
              onClick={markAllRead}
              disabled={unreadCount === 0}
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

        {error && (
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 mb-6 border border-amber-200 dark:border-amber-900/50">
            <p className="font-medium text-gray-900 dark:text-white mb-1">
              Alerts are unavailable
            </p>
            <p className="text-sm text-gray-600 dark:text-slate-300">{error}</p>
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center gap-2 mb-6">
          {(["all", "unread", "read"] as const).map((value) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                filter === value
                  ? "bg-blue-600 text-white"
                  : "bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 border border-gray-200 dark:border-slate-700"
              }`}
            >
              {value}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-24 bg-gray-200 dark:bg-slate-700 rounded-xl"
              />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl p-10 text-center border border-gray-100 dark:border-slate-700">
            <Bell className="w-8 h-8 text-gray-400 dark:text-slate-500 mx-auto mb-3" />
            <p className="font-medium text-gray-900 dark:text-white">
              {filter === "all"
                ? "No alerts"
                : `No ${filter} alerts`}
            </p>
            <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">
              {filter === "all"
                ? "When something happens on your disputes, documents or account, it will show up here."
                : "Nothing in this filter right now."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {visible.map((n) => {
              const meta = TYPE_META[n.type] ?? FALLBACK_META;
              return (
                <div
                  key={n.id}
                  className={`bg-white dark:bg-slate-800 rounded-xl p-5 border transition-colors ${
                    n.read
                      ? "border-gray-100 dark:border-slate-700"
                      : "border-blue-200 dark:border-blue-900/50"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-lg ${meta.bgColor}`}>
                      <span className={meta.color}>{meta.icon}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {n.title}
                        </h3>
                        <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300">
                          {meta.label}
                        </span>
                        {!n.read && (
                          <span className="w-2 h-2 rounded-full bg-blue-600" />
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-slate-300">
                        {n.message}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-slate-500 mt-2">
                        {formatTimeAgo(n.createdAt)}
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      {!n.read && (
                        <button
                          onClick={() => markRead(n.id)}
                          aria-label="Mark as read"
                          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                        >
                          <Check className="w-4 h-4 text-gray-500 dark:text-slate-400" />
                        </button>
                      )}
                      <button
                        onClick={() => dismiss(n.id)}
                        aria-label="Dismiss"
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                      >
                        <X className="w-4 h-4 text-gray-500 dark:text-slate-400" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
