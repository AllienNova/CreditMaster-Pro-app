/**
 * Push Notification Banner Component
 *
 * Displays a dismissable banner prompting users to enable push notifications.
 * Shows at the top of the page when notifications are not enabled.
 */

"use client";

import { useState, useEffect } from "react";
import { useWebPushNotifications } from "@/hooks/useWebPushNotifications";
import { Bell, X, Check, AlertCircle } from "lucide-react";

interface PushNotificationBannerProps {
  userId?: string;
  onDismiss?: () => void;
  className?: string;
}

const DISMISSED_KEY = "fynvita_push_banner_dismissed";

export function PushNotificationBanner({
  userId,
  onDismiss,
  className = "",
}: PushNotificationBannerProps) {
  const [isDismissed, setIsDismissed] = useState(true); // Start hidden
  const [showSuccess, setShowSuccess] = useState(false);

  const { isSupported, permission, isSubscribed, isLoading, error, subscribe } =
    useWebPushNotifications(userId);

  // Check if banner was previously dismissed
  useEffect(() => {
    if (typeof window !== "undefined") {
      const dismissed = localStorage.getItem(DISMISSED_KEY);
      const dismissedDate = dismissed ? new Date(dismissed) : null;
      const daysSinceDismissed = dismissedDate
        ? (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24)
        : Infinity;

      // Show banner if not dismissed in the last 7 days
      setIsDismissed(daysSinceDismissed < 7);
    }
  }, []);

  // Don't show if not supported, already subscribed, or dismissed
  if (!isSupported || isSubscribed || isDismissed || permission === "denied") {
    return null;
  }

  const handleEnable = async () => {
    const success = await subscribe();
    if (success) {
      setShowSuccess(true);
      setTimeout(() => {
        setIsDismissed(true);
      }, 2000);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, new Date().toISOString());
    setIsDismissed(true);
    onDismiss?.();
  };

  if (showSuccess) {
    return (
      <div
        className={`bg-emerald-50 border-b border-emerald-200 px-4 py-3 ${className}`}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 text-emerald-700">
          <Check className="w-5 h-5" />
          <span className="font-medium">Push notifications enabled!</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-blue-50 border-b border-blue-200 px-4 py-3 ${className}`}
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 p-2 bg-blue-100 rounded-full">
            <Bell className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-blue-900">
              Stay updated with push notifications
            </p>
            <p className="text-xs text-blue-700">
              Get instant alerts for credit score changes, dispute updates, and
              more.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {error && (
            <div className="flex items-center gap-1 text-red-600 text-sm">
              <AlertCircle className="w-4 h-4" />
              <span className="hidden sm:inline">{error}</span>
            </div>
          )}

          <button
            onClick={handleEnable}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? "Enabling..." : "Enable Notifications"}
          </button>

          <button
            onClick={handleDismiss}
            className="p-2 text-blue-600 hover:bg-blue-100 rounded-full transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default PushNotificationBanner;
