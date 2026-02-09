"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

interface NotificationPreview {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
}

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationPreview[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await fetch("/api/notifications?limit=5");
        if (response.ok) {
          const data = await response.json();
          setNotifications(data.notifications || []);
          setUnreadCount(data.unreadCount || 0);
        }
      } catch (error) {
        console.error("Failed to fetch notifications:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "dispute_created": return "";
      case "dispute_resolved": return "";
      case "credit_score_changed": return "";
      case "payment_successful": return "";
      case "document_uploaded": return "";
      case "alert": return "";
      default: return "";
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 dark:text-white dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700 dark:bg-slate-800 rounded-full transition"
        aria-label="Notifications"
      >
        <span className="text-xl"></span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 z-50 overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3>
            {unreadCount > 0 && (
              <span className="text-xs text-emerald-600 font-medium">{unreadCount} new</span>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500 dark:text-slate-400">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <span className="text-4xl mb-2 block"></span>
                <p className="text-gray-500 dark:text-slate-400 text-sm">No notifications yet</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 border-b border-gray-50 hover:bg-gray-50 dark:hover:bg-slate-700 dark:bg-slate-900 transition ${
                    !notification.read ? "bg-emerald-50/50" : ""
                  }`}
                >
                  <div className="flex gap-3">
                    <span className="text-xl">{getTypeIcon(notification.type)}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${!notification.read ? "font-semibold" : ""} text-gray-900 dark:text-white truncate`}>
                        {notification.title}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-slate-400 truncate">{notification.message}</p>
                      <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">{formatTime(notification.created_at)}</p>
                    </div>
                    {!notification.read && (
                      <span className="w-2 h-2 bg-emerald-500 rounded-full flex-shrink-0 mt-2" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <Link
            href="/notifications"
            className="block p-3 text-center text-sm text-emerald-600 hover:bg-gray-50 dark:hover:bg-slate-700 dark:bg-slate-900 font-medium transition"
            onClick={() => setIsOpen(false)}
          >
            View All Notifications →
          </Link>
        </div>
      )}
    </div>
  );
}

