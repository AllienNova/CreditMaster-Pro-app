"use client";

/**
 * Alerts Panel Component
 *
 * UI for managing price alerts:
 * - Create new alerts
 * - View active alerts
 * - Alert history
 *
 * READS /api/investments/alerts (GET/POST/DELETE/PATCH), which is auth-guarded
 * and scoped to the caller by `user_id`. It previously called
 * getPriceAlertService(), which kept alerts in an in-memory Map persisted to
 * `localStorage` — so a user's alerts never left the browser they were created
 * in, and were lost when site data was cleared.
 *
 * NO userId PROP. The server decides whose alerts these are; a client-supplied
 * id would be a claim, not an identity.
 *
 * WHAT THIS PANEL DOES NOT CLAIM. Nothing evaluates these alerts: no cron in
 * vercel.json touches investment_alerts, and `investment_alerts` has no
 * triggered_at column. So there is no notifications tab, no "triggered today"
 * count and no trigger time — an alert is saved and listed, and the panel says
 * plainly that monitoring is not running yet.
 */

import React, { useState, useEffect, useCallback } from "react";

// ============================================================================
// TYPES
// ============================================================================

export type AlertType =
  | "price_above"
  | "price_below"
  | "percent_change"
  | "volume_spike"
  | "indicator_crossover"
  | "pattern_detected";

export type AlertPriority = "low" | "medium" | "high" | "critical";

export interface AlertCondition {
  targetPrice?: number;
  direction?: "above" | "below";
  percentChange?: number;
  volumeMultiplier?: number;
  indicatorType?: string;
  crossoverType?: string;
}

/** Mirrors the projection in api/investments/alerts/route.ts. */
export interface Alert {
  id: string;
  symbol: string;
  type: AlertType;
  status: string;
  priority: AlertPriority;
  condition: AlertCondition;
  message: string | null;
  repeatEnabled: boolean;
  expiresAt: string | null;
  createdAt: string;
}

interface AlertsPanelProps {
  symbol?: string;
  currentPrice?: number;
  isOpen: boolean;
  onClose: () => void;
  className?: string;
  embedded?: boolean; // For embedding in dashboard without sidebar styling
}

type TabType = "active" | "create" | "history";

const TABS: TabType[] = ["active", "create", "history"];

const MONITORING_NOTE =
  "Saved alerts are not monitored yet — nothing checks prices for you, so you will not be notified when one is met.";

/**
 * Rows requested per read. The route caps its result at `limit` and offers no
 * pagination, so the panel asks for a size it knows and can therefore tell
 * when the answer was truncated. Without this the count on screen would be a
 * page presented as a total.
 */
export const ALERTS_PAGE_SIZE = 100;

// ============================================================================
// MAPPING
// ============================================================================

function toAlert(row: Record<string, unknown>): Alert {
  return {
    id: String(row.id ?? ""),
    symbol: String(row.symbol ?? ""),
    type: (row.type as AlertType) ?? "price_above",
    status: String(row.status ?? "active"),
    priority: (row.priority as AlertPriority) ?? "medium",
    condition: (row.condition as AlertCondition) ?? {},
    message: typeof row.message === "string" ? row.message : null,
    repeatEnabled: row.repeat_enabled === true,
    expiresAt: typeof row.expires_at === "string" ? row.expires_at : null,
    createdAt: typeof row.created_at === "string" ? row.created_at : "",
  };
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function AlertsPanel({
  symbol,
  currentPrice,
  isOpen,
  onClose,
  className = "",
  embedded = false,
}: AlertsPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>("active");
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  /** The read failed — there is nothing trustworthy to show. */
  const [loadError, setLoadError] = useState<string | null>(null);
  /**
   * One write failed. Kept apart from loadError: showing it in place of the
   * list would make a failed delete read as "your alerts are gone".
   */
  const [actionError, setActionError] = useState<string | null>(null);
  const [truncated, setTruncated] = useState(false);

  const visible = isOpen || embedded;

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;

    (async () => {
      try {
        // The `?` precedes the interpolation so the path stays a literal —
        // readable, and resolvable by audit:web-api.
        const params = new URLSearchParams({
          limit: String(ALERTS_PAGE_SIZE),
        });
        if (symbol) params.set("symbol", symbol);
        const res = await fetch(`/api/investments/alerts?${params.toString()}`);
        const json = await res.json().catch(() => null);
        if (cancelled) return;
        if (!res.ok || !Array.isArray(json?.alerts)) {
          setAlerts([]);
          setLoadError("Your alerts could not be loaded");
        } else {
          const rows = (json.alerts as Record<string, unknown>[]).map(toAlert);
          setAlerts(rows);
          setTruncated(rows.length >= ALERTS_PAGE_SIZE);
          setLoadError(null);
        }
      } catch {
        if (!cancelled) {
          setAlerts([]);
          setLoadError("We could not reach the alerts service");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [visible, symbol]);

  const handleDeleteAlert = useCallback(async (id: string) => {
    setActionError(null);
    const res = await fetch(
      `/api/investments/alerts?id=${encodeURIComponent(id)}`,
      { method: "DELETE" },
    ).catch(() => null);

    if (!res || !res.ok) {
      setActionError("That alert could not be deleted. Nothing changed.");
      return;
    }
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const handleToggleAlert = useCallback(
    async (id: string) => {
      const current = alerts.find((a) => a.id === id);
      if (!current) return;
      const status = current.status === "active" ? "disabled" : "active";
      setActionError(null);

      const res = await fetch("/api/investments/alerts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      }).catch(() => null);

      if (!res || !res.ok) {
        setActionError("That alert could not be updated. Nothing changed.");
        return;
      }
      setAlerts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status } : a)),
      );
    },
    [alerts],
  );

  if (!visible) return null;

  const activeCount = alerts.filter((a) => a.status === "active").length;

  const content = (
    <>
      {actionError && (
        <p className="mb-3 text-sm text-red-400" role="alert">
          {actionError}
        </p>
      )}
      {activeTab === "active" && (
        <ActiveAlertsList
          alerts={alerts.filter((a) => a.status === "active")}
          loading={loading}
          error={loadError}
          onDelete={handleDeleteAlert}
          onToggle={handleToggleAlert}
        />
      )}
      {activeTab === "create" && (
        <CreateAlertForm
          symbol={symbol || ""}
          currentPrice={currentPrice}
          onCreated={(alert) => setAlerts((prev) => [alert, ...prev])}
        />
      )}
      {activeTab === "history" && (
        <AlertHistory
          alerts={alerts.filter((a) => a.status !== "active")}
          onDelete={handleDeleteAlert}
          onToggle={handleToggleAlert}
        />
      )}
    </>
  );

  const tabs = (
    <div className="flex border-b border-gray-700">
      {TABS.map((tab) => (
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
      ))}
    </div>
  );

  // Embedded mode - no sidebar styling
  if (embedded) {
    return (
      <div className={`bg-gray-800 rounded-lg ${className}`}>
        {tabs}
        <p className="px-4 pt-3 text-xs text-gray-400 dark:text-slate-500">
          {MONITORING_NOTE}
        </p>
        <div className="p-4">{content}</div>
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
          title="Close alerts"
          className="text-gray-400 dark:text-slate-500 hover:text-white transition-colors"
        ></button>
      </div>

      {/*
        Counted from the alerts the route returned — which is a page, not the
        account. "Total" would assert a number nobody counted.
      */}
      {!loading && !loadError && (
        <div className="flex items-center gap-4 px-4 py-2 bg-gray-800/50 border-b border-gray-700 text-sm">
          <span className="text-green-400">● {activeCount} Active</span>
          <span className="text-gray-400 dark:text-slate-500">
            {alerts.length} shown
          </span>
          {truncated && (
            <span className="text-yellow-400">more not shown</span>
          )}
        </div>
      )}

      {tabs}

      <p className="px-4 pt-3 text-xs text-gray-400 dark:text-slate-500">
        {MONITORING_NOTE}
      </p>

      {/* Content */}
      <div
        className="flex-1 overflow-y-auto p-4"
        style={{ height: "calc(100% - 180px)" }}
      >
        {content}
      </div>
    </div>
  );
}

// ============================================================================
// ACTIVE ALERTS LIST
// ============================================================================

interface ActiveAlertsListProps {
  alerts: Alert[];
  loading: boolean;
  error: string | null;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
}

function ActiveAlertsList({
  alerts,
  loading,
  error,
  onDelete,
  onToggle,
}: ActiveAlertsListProps) {
  if (loading) {
    return (
      <div className="text-center py-8 text-gray-400 dark:text-slate-500">
        <p>Loading your alerts…</p>
      </div>
    );
  }

  // An empty list is a fact about the account; a failed read is a fact about
  // the request. Saying "no alerts" after a failure would state the first
  // when only the second is known.
  if (error) {
    return (
      <div className="text-center py-8 text-red-400">
        <p>{error}</p>
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400 dark:text-slate-500">
        <div className="text-4xl mb-2"></div>
        <p>No active alerts</p>
        <p className="text-sm mt-1">Create an alert to keep it on record</p>
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
  alert: Alert;
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
          {/*
            aria-label, not title: the emoji is this button's only content, so
            without it the accessible name is "⏸️".
          */}
          <button
            onClick={onToggle}
            className="text-gray-400 dark:text-slate-500 hover:text-yellow-400 transition-colors"
            aria-label={
              alert.status === "active"
                ? `Pause alert for ${alert.symbol}`
                : `Resume alert for ${alert.symbol}`
            }
          >
            ⏸️
          </button>
          <button
            onClick={onDelete}
            className="text-gray-400 dark:text-slate-500 hover:text-red-400 transition-colors"
            aria-label={`Delete alert for ${alert.symbol}`}
          ></button>
        </div>
      </div>

      {alert.message && (
        <div className="mt-2 text-sm text-gray-500 dark:text-slate-400 italic">
          "{alert.message}"
        </div>
      )}

      <div className="mt-2 flex items-center gap-3 text-xs text-gray-500 dark:text-slate-400">
        {alert.createdAt && (
          <span>
            Created: {new Date(alert.createdAt).toLocaleDateString()}
          </span>
        )}
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
  currentPrice?: number;
  onCreated: (alert: Alert) => void;
}

function CreateAlertForm({
  symbol,
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
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);

    try {
      const res = await fetch("/api/investments/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
        }),
      });

      const json = await res.json().catch(() => null);

      // The list must only gain a row the server actually stored.
      if (!res.ok || !json?.alert) {
        setSaveError("Your alert could not be saved. Nothing was stored.");
        return;
      }

      onCreated(toAlert(json.alert as Record<string, unknown>));
      setTargetPrice(currentPrice?.toString() || "");
      setMessage("");
    } catch {
      setSaveError("We could not reach the alerts service. Nothing was saved.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {saveError && (
        <p className="text-sm text-red-400" role="alert">
          {saveError}
        </p>
      )}

      {/* Symbol */}
      <div>
        <label
          htmlFor="alert-symbol"
          className="block text-sm text-gray-400 dark:text-slate-500 mb-1"
        >
          Symbol
        </label>
        <input
          id="alert-symbol"
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
        <label
          htmlFor="alert-type"
          className="block text-sm text-gray-400 dark:text-slate-500 mb-1"
        >
          Alert Type
        </label>
        <select
          id="alert-type"
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
          <label
            htmlFor="alert-target-price"
            className="block text-sm text-gray-400 dark:text-slate-500 mb-1"
          >
            Target Price
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-gray-400 dark:text-slate-500">
              $
            </span>
            <input
              id="alert-target-price"
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
          <label
            htmlFor="alert-percent-change"
            className="block text-sm text-gray-400 dark:text-slate-500 mb-1"
          >
            Percent Change
          </label>
          <div className="relative">
            <input
              id="alert-percent-change"
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
        <label
          htmlFor="alert-note"
          className="block text-sm text-gray-400 dark:text-slate-500 mb-1"
        >
          Note (optional)
        </label>
        <input
          id="alert-note"
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
        disabled={saving}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium py-3 rounded transition-colors"
      >
        {saving ? "Saving…" : "Create Alert"}
      </button>
    </form>
  );
}

// ============================================================================
// ALERT HISTORY
// ============================================================================

interface AlertHistoryProps {
  alerts: Alert[];
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
}

/**
 * Pausing moves an alert out of the active list and into here. Without these
 * controls that is a one-way door: no screen could resume or remove it.
 * "Resume" is offered only for `disabled` — an expired or triggered alert is
 * not something the user switched off.
 */
function AlertHistory({ alerts, onDelete, onToggle }: AlertHistoryProps) {
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
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs px-2 py-1 rounded ${badge.color} text-white`}
                >
                  {badge.label}
                </span>
                {alert.status === "disabled" && (
                  <button
                    onClick={() => onToggle(alert.id)}
                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                    aria-label={`Resume alert for ${alert.symbol}`}
                  >
                    Resume
                  </button>
                )}
                <button
                  onClick={() => onDelete(alert.id)}
                  className="text-xs text-gray-400 dark:text-slate-500 hover:text-red-400 transition-colors"
                  aria-label={`Delete alert for ${alert.symbol}`}
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default AlertsPanel;
