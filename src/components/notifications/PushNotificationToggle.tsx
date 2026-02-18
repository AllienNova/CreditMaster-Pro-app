/**
 * Push Notification Toggle Component
 *
 * Toggle switch for enabling/disabling push notifications in settings.
 */

"use client";

import { useState } from "react";
import { useWebPushNotifications } from "@/hooks/useWebPushNotifications";
import {
  Bell,
  BellOff,
  Loader2,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";

interface PushNotificationToggleProps {
  userId?: string;
  className?: string;
  showLabel?: boolean;
  showDescription?: boolean;
}

export function PushNotificationToggle({
  userId,
  className = "",
  showLabel = true,
  showDescription = true,
}: PushNotificationToggleProps) {
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    error,
    subscribe,
    unsubscribe,
  } = useWebPushNotifications(userId);

  const handleToggle = async () => {
    setFeedback(null);

    if (isSubscribed) {
      const success = await unsubscribe();
      if (success) {
        setFeedback({ type: "success", message: "Notifications disabled" });
      } else {
        setFeedback({
          type: "error",
          message: error || "Failed to disable notifications",
        });
      }
    } else {
      const success = await subscribe();
      if (success) {
        setFeedback({ type: "success", message: "Notifications enabled!" });
      } else {
        setFeedback({
          type: "error",
          message: error || "Failed to enable notifications",
        });
      }
    }

    // Clear feedback after 3 seconds
    setTimeout(() => setFeedback(null), 3000);
  };

  // Not supported message
  if (!isSupported) {
    return (
      <div
        className={`flex items-center gap-3 p-4 bg-gray-50 dark:bg-slate-900 rounded-lg ${className}`}
      >
        <BellOff className="w-5 h-5 text-gray-400 dark:text-slate-500" />
        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-slate-200">
            Push notifications not supported
          </p>
          <p className="text-xs text-gray-500 dark:text-slate-400">
            Your browser doesn&apos;t support push notifications.
          </p>
        </div>
      </div>
    );
  }

  // Permission denied message
  if (permission === "denied") {
    return (
      <div
        className={`flex items-center gap-3 p-4 bg-yellow-50 rounded-lg ${className}`}
      >
        <AlertTriangle className="w-5 h-5 text-yellow-600" />
        <div>
          <p className="text-sm font-medium text-yellow-800">
            Notifications blocked
          </p>
          <p className="text-xs text-yellow-700">
            Please enable notifications in your browser settings to receive
            alerts.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isSubscribed ? (
            <Bell className="w-5 h-5 text-emerald-600" />
          ) : (
            <BellOff className="w-5 h-5 text-gray-400 dark:text-slate-500" />
          )}
          {showLabel && (
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Push Notifications
              </p>
              {showDescription && (
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  Receive instant alerts on this device
                </p>
              )}
            </div>
          )}
        </div>

        <button
          onClick={handleToggle}
          disabled={isLoading}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
            isSubscribed ? "bg-emerald-500" : "bg-gray-300"
          }`}
          role="switch"
          aria-checked={isSubscribed}
          aria-label="Toggle push notifications"
        >
          {isLoading ? (
            <span className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            </span>
          ) : (
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-slate-800 shadow-md transition-transform ${
                isSubscribed ? "translate-x-6" : "translate-x-1"
              }`}
            />
          )}
        </button>
      </div>

      {/* Feedback message */}
      {feedback && (
        <div
          className={`mt-2 flex items-center gap-2 text-sm ${
            feedback.type === "success" ? "text-emerald-600" : "text-red-600"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <AlertTriangle className="w-4 h-4" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}
    </div>
  );
}

export default PushNotificationToggle;
