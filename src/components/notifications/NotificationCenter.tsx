"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Notification,
  NotificationType,
} from "@/lib/notifications/notification-service";
import NotificationItem from "./NotificationItem";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuth } from "@/hooks/useAuth";

type FilterType = "all" | "unread" | NotificationType;

export default function NotificationCenter() {
  const { user, loading: authLoading } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<
    Notification[]
  >([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");

  const fetchNotifications = useCallback(async () => {
    if (!user) return;

    try {
      const response = await fetch(`/api/notifications`);

      if (!response.ok) {
        throw new Error("Failed to fetch notifications");
      }

      const data = await response.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load notifications",
      );
    } finally {
      setLoading(false);
    }
  }, [user]);

  const filterNotifications = useCallback(() => {
    let filtered = [...notifications];

    if (filter === "unread") {
      filtered = filtered.filter((n) => !n.read);
    } else if (filter !== "all") {
      filtered = filtered.filter((n) => n.type === filter);
    }

    setFilteredNotifications(filtered);
  }, [notifications, filter]);

  useEffect(() => {
    if (!authLoading && user) {
      void fetchNotifications();
      // Poll for new notifications every 30 seconds
      const interval = setInterval(() => {
        void fetchNotifications();
      }, 30000);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [authLoading, user, fetchNotifications]);

  useEffect(() => {
    filterNotifications();
  }, [filterNotifications]);

  const handleMarkAsRead = async (notificationId: string) => {
    if (!user) return;

    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notificationId,
          action: "mark_read",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to mark as read");
      }

      // Update local state
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (_err) {
      // NotificationCenter error: Failed to mark as read
      void _err;
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user) return;

    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "mark_all_read",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to mark all as read");
      }

      // Update local state
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (_err) {
      // NotificationCenter error: Failed to mark all as read
      void _err;
    }
  };

  const handleDelete = async (notificationId: string) => {
    if (!user) return;

    try {
      const response = await fetch(
        `/api/notifications?notificationId=${notificationId}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        throw new Error("Failed to delete notification");
      }

      // Update local state
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    } catch (_err) {
      // NotificationCenter error: Failed to delete notification
      void _err;
    }
  };

  const filterOptions: { value: FilterType; label: string }[] = [
    { value: "all", label: "All Notifications" },
    { value: "unread", label: "Unread" },
    { value: "dispute_created", label: "Disputes" },
    { value: "credit_score_changed", label: "Credit Score" },
    { value: "payment_successful", label: "Payments" },
    { value: "document_uploaded", label: "Documents" },
  ];

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow animate-pulse">
        <div className="p-6 border-b border-gray-200 dark:border-slate-700">
          <div className="h-10 bg-gray-200 dark:bg-slate-700 rounded w-1/3"></div>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-slate-700">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="p-6">
              <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
        <div className="text-center py-12">
          <div className="text-red-600 text-xl mb-4"></div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Error Loading Notifications
          </h3>
          <p className="text-gray-600 dark:text-slate-300 mb-4">{error}</p>
          <button
            type="button"
            onClick={fetchNotifications}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-slate-700">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Filter */}
          <div className="flex items-center gap-3">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as FilterType)}
              className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {filterOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            {unreadCount > 0 && (
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
                {unreadCount} unread
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                className="px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                Mark all as read
              </button>
            )}
            <button
              type="button"
              onClick={fetchNotifications}
              className="px-4 py-2 text-sm border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-200 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 dark:bg-slate-900 transition-colors"
              title="Refresh"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div>
        {filteredNotifications.length === 0 ? (
          <EmptyState
            type="no-alerts"
            title={
              filter === "unread"
                ? "No unread notifications"
                : "No notifications yet"
            }
            description={
              filter === "unread"
                ? "You're all caught up!"
                : "We'll notify you when something important happens"
            }
          />
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-slate-700">
            {filteredNotifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={handleMarkAsRead}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {filteredNotifications.length > 0 && (
        <div className="p-4 bg-gray-50 dark:bg-slate-900 border-t border-gray-200 dark:border-slate-700 text-center text-sm text-gray-600 dark:text-slate-300">
          Showing {filteredNotifications.length} of {notifications.length}{" "}
          notifications
        </div>
      )}
    </div>
  );
}
