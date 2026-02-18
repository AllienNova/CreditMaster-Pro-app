"use client";

/**
 * Alerts Panel Component
 *
 * UI for managing price alerts:
 * - Create new alerts
 * - View active alerts
 * - Alert notifications
 * - Alert history
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  PriceAlert,
  AlertType,
  AlertPriority,
  AlertNotification,
  AlertStats,
  getPriceAlertService,
} from "@/lib/investments/services/PriceAlertService";

// ============================================================================
// TYPES
// ============================================================================

interface AlertsPanelProps {
  symbol?: string;
  userId: string;
  currentPrice?: number;
  isOpen: boolean;
  onClose: () => void;
  className?: string;
  embedded?: boolean; // For embedding in dashboard without sidebar styling
}

type TabType = "active" | "create" | "notifications" | "history";

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function AlertsPanel({
  symbol,
  userId,
  currentPrice,
  isOpen,
  onClose,
  className = "",
  embedded = false,
}: AlertsPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>("active");
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [notifications, setNotifications] = useState<AlertNotification[]>([]);
  const [stats, setStats] = useState<AlertStats | null>(null);

  const alertService = getPriceAlertService();

  // Load data
  useEffect(() => {
    if (!isOpen && !embedded) return;

    const userAlerts = alertService.getAlertsByUser(userId);
    setAlerts(
      symbol ? userAlerts.filter((a) => a.symbol === symbol) : userAlerts,
    );
    setNotifications(alertService.getNotifications());
    setStats(alertService.getAlertStats(userId));
  }, [isOpen, embedded, userId, symbol, alertService]);

  const handleDeleteAlert = useCallback(
    (id: string) => {
      alertService.deleteAlert(id);
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    },
    [alertService],
  );

  const handleToggleAlert = useCallback(
    (id: string) => {
      const alert = alertService.getAlert(id);
      if (alert) {
        const newStatus = alert.status === "active" ? "disabled" : "active";
        alertService.updateAlert(id, { status: newStatus });
        setAlerts((prev) =>
          prev.map((a) => (a.id === id ? { ...a, status: newStatus } : a)),
        );
      }
    },
    [alertService],
  );

  const handleMarkRead = useCallback(
    (id: string) => {
      alertService.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
    },
    [alertService],
  );

  if (!isOpen && !embedded) return null;

  // Embedded mode - no sidebar styling
  if (embedded) {
    return (
      <div className={`bg-gray-800 rounded-lg ${className}`}>
        {/* Tabs */}
        <div className="flex border-b border-gray-700">
          {(["active", "create", "notifications", "history"] as TabType[]).map(
            (tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 px-4 py-3 text-sm font-medium capitalize transition-colors ${
                  activeTab === tab
                    ? "text-blue-400 border-b-2 border-blue-400"
                    : "text-gray-400 dark:text-slate-500 hover:text-white"
                }`}
              >
                {tab}
              </button>
            ),
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          {activeTab === "active" && (
            <ActiveAlertsList
              alerts={alerts}
              onDelete={handleDeleteAlert}
              onToggle={handleToggleAlert}
            />
          )}
          {activeTab === "create" && symbol && (
            <CreateAlertForm
              symbol={symbol}
              userId={userId}
              currentPrice={currentPrice}
              onCreated={(alert) => setAlerts((prev) => [alert, ...prev])}
            />
          )}
          {activeTab === "create" && !symbol && (
            <div className="p-4 text-center text-gray-500 dark:text-slate-400">
              Please select a symbol to create an alert.
            </div>
          )}
          {activeTab === "notifications" && (
            <NotificationsList
              notifications={notifications}
              onMarkRead={handleMarkRead}
            />
          )}
          {activeTab === "history" && (
            <AlertHistory
              alerts={alerts.filter((a) => a.status !== "active")}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`fixed right-0 top-0 h-full w-96 bg-gray-900 border-l border-gray-700 shadow-xl z-50 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700">
        <h2 className="text-lg font-semibold text-white">
          Price Alerts
          {symbol && (
            <span className="text-gray-400 dark:text-slate-500 ml-2 text-sm">
              ({symbol})
            </span>
          )}
        </h2>
        <button
          onClick={onClose}
          className="text-gray-400 dark:text-slate-500 hover:text-white transition-colors"
        ></button>
      </div>

      {/* Stats Bar */}
      {stats && (
        <div className="flex items-center gap-4 px-4 py-2 bg-gray-800/50 border-b border-gray-700 text-sm">
          <span className="text-green-400">● {stats.activeAlerts} Active</span>
          <span className="text-yellow-400">{stats.triggeredToday} Today</span>
          <span className="text-gray-400 dark:text-slate-500">
            {stats.totalAlerts} Total
          </span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-700">
        {(["active", "create", "notifications", "history"] as TabType[]).map(
          (tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? "text-blue-400 border-b-2 border-blue-400"
                  : "text-gray-400 dark:text-slate-500 hover:text-white"
              }`}
            >
              {tab === "active" && ""}
              {tab === "create" && ""}
              {tab === "notifications" &&
                `(${notifications.filter((n) => !n.read).length})`}
              {tab === "history" && ""}
              <span className="ml-1 capitalize">{tab}</span>
            </button>
          ),
        )}
      </div>

      {/* Content */}
      <div
        className="flex-1 overflow-y-auto p-4"
        style={{ height: "calc(100% - 140px)" }}
      >
        {activeTab === "active" && (
          <ActiveAlertsList
            alerts={alerts.filter((a) => a.status === "active")}
            onDelete={handleDeleteAlert}
            onToggle={handleToggleAlert}
          />
        )}
        {activeTab === "create" && (
          <CreateAlertForm
            symbol={symbol || ""}
            userId={userId}
            currentPrice={currentPrice}
            onCreated={(alert) => setAlerts((prev) => [alert, ...prev])}
          />
        )}
        {activeTab === "notifications" && (
          <NotificationsList
            notifications={notifications}
            onMarkRead={(id) => {
              alertService.markNotificationRead(id);
              setNotifications((prev) =>
                prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
              );
            }}
          />
        )}
        {activeTab === "history" && (
          <AlertHistory alerts={alerts.filter((a) => a.status !== "active")} />
        )}
      </div>
    </div>
  );
}

// ============================================================================
// ACTIVE ALERTS LIST
// ============================================================================

interface ActiveAlertsListProps {
  alerts: PriceAlert[];
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
}

function ActiveAlertsList({
  alerts,
  onDelete,
  onToggle,
}: ActiveAlertsListProps) {
  if (alerts.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400 dark:text-slate-500">
        <div className="text-4xl mb-2"></div>
        <p>No active alerts</p>
        <p className="text-sm mt-1">Create an alert to get notified</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {alerts.map((alert) => (
        <AlertCard
          key={alert.id}
          alert={alert}
          onDelete={() => onDelete(alert.id)}
          onToggle={() => onToggle(alert.id)}
        />
      ))}
    </div>
  );
}

// ============================================================================
// ALERT CARD
// ============================================================================

interface AlertCardProps {
  alert: PriceAlert;
  onDelete: () => void;
  onToggle: () => void;
}

function AlertCard({ alert, onDelete, onToggle }: AlertCardProps) {
  const getAlertIcon = (type: AlertType) => {
    const icons: Record<AlertType, string> = {
      price_above: "⬆️",
      price_below: "⬇️",
      percent_change: "",
      volume_spike: "",
      indicator_crossover: "",
      pattern_detected: "",
    };
    return icons[type];
  };

  const getPriorityColor = (priority: AlertPriority) => {
    const colors: Record<AlertPriority, string> = {
      low: "text-gray-400 dark:text-slate-500",
      medium: "text-blue-400",
      high: "text-yellow-400",
      critical: "text-red-400",
    };
    return colors[priority];
  };

  return (
    <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{getAlertIcon(alert.type)}</span>
          <div>
            <div className="font-medium text-white">{alert.symbol}</div>
            <div className="text-sm text-gray-400 dark:text-slate-500">
              {alert.type === "price_above" &&
                `Above $${alert.condition.targetPrice?.toFixed(2)}`}
              {alert.type === "price_below" &&
                `Below $${alert.condition.targetPrice?.toFixed(2)}`}
              {alert.type === "percent_change" &&
                `±${alert.condition.percentChange}%`}
              {alert.type === "volume_spike" &&
                `${alert.condition.volumeMultiplier}x Volume`}
              {alert.type === "indicator_crossover" &&
                `${alert.condition.indicatorType} ${alert.condition.crossoverType}`}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`text-xs ${getPriorityColor(alert.priority)}`}>
            {alert.priority.toUpperCase()}
          </span>
          <button
            onClick={onToggle}
            className="text-gray-400 dark:text-slate-500 hover:text-yellow-400 transition-colors"
            title="Pause alert"
          >
            ⏸️
          </button>
          <button
            onClick={onDelete}
            className="text-gray-400 dark:text-slate-500 hover:text-red-400 transition-colors"
            title="Delete alert"
          ></button>
        </div>
      </div>

      {alert.message && (
        <div className="mt-2 text-sm text-gray-500 dark:text-slate-400 italic">
          "{alert.message}"
        </div>
      )}

      <div className="mt-2 flex items-center gap-3 text-xs text-gray-500 dark:text-slate-400">
        <span>Created: {new Date(alert.createdAt).toLocaleDateString()}</span>
        {alert.repeatEnabled && <span>Repeating</span>}
        {alert.expiresAt && (
          <span>Expires: {new Date(alert.expiresAt).toLocaleDateString()}</span>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// CREATE ALERT FORM
// ============================================================================

interface CreateAlertFormProps {
  symbol: string;
  userId: string;
  currentPrice?: number;
  onCreated: (alert: PriceAlert) => void;
}

function CreateAlertForm({
  symbol,
  userId,
  currentPrice,
  onCreated,
}: CreateAlertFormProps) {
  const [alertType, setAlertType] = useState<AlertType>("price_above");
  const [targetPrice, setTargetPrice] = useState(
    currentPrice?.toString() || "",
  );
  const [percentChange, setPercentChange] = useState("5");
  const [priority, setPriority] = useState<AlertPriority>("medium");
  const [message, setMessage] = useState("");
  const [repeatEnabled, setRepeatEnabled] = useState(false);
  const [symbolInput, setSymbolInput] = useState(symbol);

  const alertService = getPriceAlertService();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const alert = alertService.createAlert({
      userId,
      symbol: symbolInput.toUpperCase(),
      type: alertType,
      priority,
      condition: {
        targetPrice: alertType.includes("price")
          ? parseFloat(targetPrice)
          : undefined,
        direction:
          alertType === "price_above"
            ? "above"
            : alertType === "price_below"
              ? "below"
              : undefined,
        percentChange:
          alertType === "percent_change"
            ? parseFloat(percentChange)
            : undefined,
        volumeMultiplier: alertType === "volume_spike" ? 2 : undefined,
      },
      message: message || undefined,
      repeatEnabled,
      cooldownMinutes: repeatEnabled ? 60 : 0,
    });

    onCreated(alert);

    // Reset form
    setTargetPrice(currentPrice?.toString() || "");
    setMessage("");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Symbol */}
      <div>
        <label className="block text-sm text-gray-400 dark:text-slate-500 mb-1">
          Symbol
        </label>
        <input
          type="text"
          value={symbolInput}
          onChange={(e) => setSymbolInput(e.target.value)}
          className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white"
          placeholder="AAPL"
          required
        />
      </div>

      {/* Alert Type */}
      <div>
        <label className="block text-sm text-gray-400 dark:text-slate-500 mb-1">
          Alert Type
        </label>
        <select
          value={alertType}
          onChange={(e) => setAlertType(e.target.value as AlertType)}
          className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white"
        >
          <option value="price_above">Price Above</option>
          <option value="price_below">Price Below</option>
          <option value="percent_change">Percentage Change</option>
          <option value="volume_spike">Volume Spike</option>
          <option value="indicator_crossover">Indicator Crossover</option>
        </select>
      </div>

      {/* Price Target (for price alerts) */}
      {(alertType === "price_above" || alertType === "price_below") && (
        <div>
          <label className="block text-sm text-gray-400 dark:text-slate-500 mb-1">
            Target Price
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-gray-400 dark:text-slate-500">
              $
            </span>
            <input
              type="number"
              step="0.01"
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
              className="w-full bg-gray-800 border border-gray-600 rounded pl-8 pr-3 py-2 text-white"
              placeholder="0.00"
              required
            />
          </div>
          {currentPrice && (
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
              Current: ${currentPrice.toFixed(2)}
            </p>
          )}
        </div>
      )}

      {/* Percent Change */}
      {alertType === "percent_change" && (
        <div>
          <label className="block text-sm text-gray-400 dark:text-slate-500 mb-1">
            Percent Change
          </label>
          <div className="relative">
            <input
              type="number"
              step="0.1"
              value={percentChange}
              onChange={(e) => setPercentChange(e.target.value)}
              className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white"
              placeholder="5"
              required
            />
            <span className="absolute right-3 top-2 text-gray-400 dark:text-slate-500">
              %
            </span>
          </div>
        </div>
      )}

      {/* Priority */}
      <div>
        <label className="block text-sm text-gray-400 dark:text-slate-500 mb-1">
          Priority
        </label>
        <div className="flex gap-2">
          {(["low", "medium", "high", "critical"] as AlertPriority[]).map(
            (p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPriority(p)}
                className={`flex-1 py-2 text-sm rounded capitalize transition-colors ${
                  priority === p
                    ? p === "critical"
                      ? "bg-red-600 text-white"
                      : p === "high"
                        ? "bg-yellow-600 text-white"
                        : p === "medium"
                          ? "bg-blue-600 text-white"
                          : "bg-gray-600 text-white"
                    : "bg-gray-700 text-gray-400 dark:text-slate-500 hover:bg-gray-600"
                }`}
              >
                {p}
              </button>
            ),
          )}
        </div>
      </div>

      {/* Message */}
      <div>
        <label className="block text-sm text-gray-400 dark:text-slate-500 mb-1">
          Note (optional)
        </label>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white"
          placeholder="Reminder message..."
        />
      </div>

      {/* Repeat Toggle */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="repeat"
          checked={repeatEnabled}
          onChange={(e) => setRepeatEnabled(e.target.checked)}
          className="w-4 h-4"
        />
        <label
          htmlFor="repeat"
          className="text-sm text-gray-400 dark:text-slate-500"
        >
          Repeat alert (with 1 hour cooldown)
        </label>
      </div>

      {/* Submit */}
      <button
        type="submit"
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded transition-colors"
      >
        Create Alert
      </button>
    </form>
  );
}

// ============================================================================
// NOTIFICATIONS LIST
// ============================================================================

interface NotificationsListProps {
  notifications: AlertNotification[];
  onMarkRead: (id: string) => void;
}

function NotificationsList({
  notifications,
  onMarkRead,
}: NotificationsListProps) {
  if (notifications.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400 dark:text-slate-500">
        <div className="text-4xl mb-2"></div>
        <p>No notifications</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {notifications.map((notif) => (
        <div
          key={notif.id}
          onClick={() => onMarkRead(notif.id)}
          className={`p-3 rounded-lg border cursor-pointer transition-colors ${
            notif.read
              ? "bg-gray-800/50 border-gray-700"
              : "bg-gray-800 border-blue-500/30 hover:border-blue-500/50"
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              {!notif.read && (
                <span className="w-2 h-2 bg-blue-500 rounded-full" />
              )}
              <span className="font-medium text-white">{notif.title}</span>
            </div>
            <span className="text-xs text-gray-500 dark:text-slate-400">
              {formatTimeAgo(notif.timestamp)}
            </span>
          </div>
          <p className="text-sm text-gray-400 dark:text-slate-500 mt-1">
            {notif.message}
          </p>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// ALERT HISTORY
// ============================================================================

interface AlertHistoryProps {
  alerts: PriceAlert[];
}

function AlertHistory({ alerts }: AlertHistoryProps) {
  if (alerts.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400 dark:text-slate-500">
        <div className="text-4xl mb-2"></div>
        <p>No alert history</p>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; label: string }> = {
      triggered: { color: "bg-green-600", label: "Triggered" },
      expired: { color: "bg-gray-600", label: "Expired" },
      disabled: { color: "bg-yellow-600", label: "Disabled" },
    };
    return badges[status] || { color: "bg-gray-600", label: status };
  };

  return (
    <div className="space-y-2">
      {alerts.map((alert) => {
        const badge = getStatusBadge(alert.status);
        return (
          <div
            key={alert.id}
            className="p-3 rounded-lg bg-gray-800/50 border border-gray-700"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="font-medium text-white">{alert.symbol}</span>
                <span className="text-sm text-gray-400 dark:text-slate-500 ml-2">
                  {alert.type === "price_above" &&
                    `Above $${alert.condition.targetPrice?.toFixed(2)}`}
                  {alert.type === "price_below" &&
                    `Below $${alert.condition.targetPrice?.toFixed(2)}`}
                </span>
              </div>
              <span
                className={`text-xs px-2 py-1 rounded ${badge.color} text-white`}
              >
                {badge.label}
              </span>
            </div>
            {alert.triggeredAt && (
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                Triggered: {new Date(alert.triggeredAt).toLocaleString()}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// UTILITY
// ============================================================================

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export default AlertsPanel;
