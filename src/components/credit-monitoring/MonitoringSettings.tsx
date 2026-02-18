"use client";

import { useState, useEffect } from "react";
import { MonitoringSettings as Settings } from "@/lib/credit-monitoring/credit-monitoring-service";
import { useAuth } from "@/hooks/useAuth";

interface MonitoringSettingsProps {
  onClose: () => void;
  onSave: () => void;
}

export default function MonitoringSettings({
  onClose,
  onSave,
}: MonitoringSettingsProps) {
  const { user, loading: authLoading } = useAuth();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && user) {
      fetchSettings();
    }
  }, [authLoading, user]);

  const fetchSettings = async () => {
    if (!user) {
      setError("You must be logged in to view settings");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(
        `/api/credit-monitoring/settings?userId=${user.id}`,
      );

      if (!response.ok) {
        throw new Error("Failed to fetch settings");
      }

      const data = await response.json();
      setSettings(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/credit-monitoring/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        throw new Error("Failed to save settings");
      }

      onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-slate-800 rounded-lg p-8 max-w-2xl w-full mx-4">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-2/3"></div>
            <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!settings) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Monitoring Settings
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:text-slate-300 text-2xl"
            >
              ×
            </button>
          </div>
          <p className="text-gray-600 dark:text-slate-300 mt-2">
            Configure your credit monitoring preferences
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {/* Bureau Monitoring */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Bureau Monitoring
            </h3>
            <div className="space-y-3">
              <label className="flex items-center gap-3 p-3 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 dark:bg-slate-900 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.experianEnabled}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      experianEnabled: e.target.checked,
                    })
                  }
                  className="w-5 h-5 text-blue-600 rounded"
                />
                <div className="flex-1">
                  <div className="font-semibold text-gray-900 dark:text-white">
                    Experian
                  </div>
                  <div className="text-sm text-gray-600 dark:text-slate-300">
                    Monitor Experian credit reports
                  </div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 dark:bg-slate-900 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.equifaxEnabled}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      equifaxEnabled: e.target.checked,
                    })
                  }
                  className="w-5 h-5 text-blue-600 rounded"
                />
                <div className="flex-1">
                  <div className="font-semibold text-gray-900 dark:text-white">
                    Equifax
                  </div>
                  <div className="text-sm text-gray-600 dark:text-slate-300">
                    Monitor Equifax credit reports
                  </div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 dark:bg-slate-900 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.transunionEnabled}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      transunionEnabled: e.target.checked,
                    })
                  }
                  className="w-5 h-5 text-blue-600 rounded"
                />
                <div className="flex-1">
                  <div className="font-semibold text-gray-900 dark:text-white">
                    TransUnion
                  </div>
                  <div className="text-sm text-gray-600 dark:text-slate-300">
                    Monitor TransUnion credit reports
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Alert Preferences */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Alert Preferences
            </h3>
            <div className="space-y-3">
              <label className="flex items-center gap-3 p-3 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 dark:bg-slate-900 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.alertPreferences.scoreChanges}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      alertPreferences: {
                        ...settings.alertPreferences,
                        scoreChanges: e.target.checked,
                      },
                    })
                  }
                  className="w-5 h-5 text-blue-600 rounded"
                />
                <div className="flex-1">
                  <div className="font-semibold text-gray-900 dark:text-white">
                    Score Changes
                  </div>
                  <div className="text-sm text-gray-600 dark:text-slate-300">
                    Get notified when your credit score changes
                  </div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 dark:bg-slate-900 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.alertPreferences.newAccounts}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      alertPreferences: {
                        ...settings.alertPreferences,
                        newAccounts: e.target.checked,
                      },
                    })
                  }
                  className="w-5 h-5 text-blue-600 rounded"
                />
                <div className="flex-1">
                  <div className="font-semibold text-gray-900 dark:text-white">
                    New Accounts
                  </div>
                  <div className="text-sm text-gray-600 dark:text-slate-300">
                    Alert when new accounts are opened
                  </div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 dark:bg-slate-900 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.alertPreferences.inquiries}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      alertPreferences: {
                        ...settings.alertPreferences,
                        inquiries: e.target.checked,
                      },
                    })
                  }
                  className="w-5 h-5 text-blue-600 rounded"
                />
                <div className="flex-1">
                  <div className="font-semibold text-gray-900 dark:text-white">
                    Credit Inquiries
                  </div>
                  <div className="text-sm text-gray-600 dark:text-slate-300">
                    Alert when new inquiries appear
                  </div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 dark:bg-slate-900 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.alertPreferences.addressChanges}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      alertPreferences: {
                        ...settings.alertPreferences,
                        addressChanges: e.target.checked,
                      },
                    })
                  }
                  className="w-5 h-5 text-blue-600 rounded"
                />
                <div className="flex-1">
                  <div className="font-semibold text-gray-900 dark:text-white">
                    Address Changes
                  </div>
                  <div className="text-sm text-gray-600 dark:text-slate-300">
                    Alert when address changes are detected
                  </div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 dark:bg-slate-900 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.alertPreferences.fraudAlerts}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      alertPreferences: {
                        ...settings.alertPreferences,
                        fraudAlerts: e.target.checked,
                      },
                    })
                  }
                  className="w-5 h-5 text-blue-600 rounded"
                />
                <div className="flex-1">
                  <div className="font-semibold text-gray-900 dark:text-white">
                    Fraud Alerts
                  </div>
                  <div className="text-sm text-gray-600 dark:text-slate-300">
                    Alert for potential fraud activity
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Notification Methods */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Notification Methods
            </h3>
            <div className="space-y-3">
              <label className="flex items-center gap-3 p-3 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 dark:bg-slate-900 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.alertPreferences.emailNotifications}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      alertPreferences: {
                        ...settings.alertPreferences,
                        emailNotifications: e.target.checked,
                      },
                    })
                  }
                  className="w-5 h-5 text-blue-600 rounded"
                />
                <div className="flex-1">
                  <div className="font-semibold text-gray-900 dark:text-white">
                    Email Notifications
                  </div>
                  <div className="text-sm text-gray-600 dark:text-slate-300">
                    Receive alerts via email
                  </div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 dark:bg-slate-900 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.alertPreferences.smsNotifications}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      alertPreferences: {
                        ...settings.alertPreferences,
                        smsNotifications: e.target.checked,
                      },
                    })
                  }
                  className="w-5 h-5 text-blue-600 rounded"
                />
                <div className="flex-1">
                  <div className="font-semibold text-gray-900 dark:text-white">
                    SMS Notifications
                  </div>
                  <div className="text-sm text-gray-600 dark:text-slate-300">
                    Receive alerts via text message
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Score Change Threshold */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Score Change Threshold
            </h3>
            <div className="p-4 border border-gray-200 dark:border-slate-700 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">
                Minimum points to trigger alert: {settings.scoreChangeThreshold}
              </label>
              <input
                type="range"
                min="1"
                max="50"
                value={settings.scoreChangeThreshold}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    scoreChangeThreshold: parseInt(e.target.value),
                  })
                }
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 dark:text-slate-400 mt-1">
                <span>1 point</span>
                <span>50 points</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-slate-700 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-200 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 dark:bg-slate-900 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}
