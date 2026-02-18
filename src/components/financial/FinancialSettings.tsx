"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

interface Settings {
  notifications: {
    email: boolean;
    push: boolean;
    budgetAlerts: boolean;
    billReminders: boolean;
    goalMilestones: boolean;
    largeTransactions: boolean;
  };
  privacy: {
    shareData: boolean;
    analytics: boolean;
    marketing: boolean;
  };
  sync: {
    autoSync: boolean;
    syncFrequency: "daily" | "weekly" | "manual";
  };
  display: {
    currency: "USD" | "EUR" | "GBP";
    dateFormat: "MM/DD/YYYY" | "DD/MM/YYYY" | "YYYY-MM-DD";
    theme: "light" | "dark" | "auto";
  };
}

export default function FinancialSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<Settings>({
    notifications: {
      email: true,
      push: true,
      budgetAlerts: true,
      billReminders: true,
      goalMilestones: true,
      largeTransactions: true,
    },
    privacy: {
      shareData: false,
      analytics: true,
      marketing: false,
    },
    sync: {
      autoSync: true,
      syncFrequency: "daily",
    },
    display: {
      currency: "USD",
      dateFormat: "MM/DD/YYYY",
      theme: "light",
    },
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);

    try {
      const userId = user?.id ?? "user_123";

      // Simulate saving settings
      await new Promise((resolve) => setTimeout(resolve, 1000));
      // FinancialSettings: Settings saved for user

      alert("Settings saved successfully!");
    } catch (_error) {
      // FinancialSettings error: Failed to save financial settings
      void _error;
      alert("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const updateNotification = (
    key: keyof Settings["notifications"],
    value: boolean,
  ) => {
    setSettings({
      ...settings,
      notifications: { ...settings.notifications, [key]: value },
    });
  };

  const updatePrivacy = (key: keyof Settings["privacy"], value: boolean) => {
    setSettings({
      ...settings,
      privacy: { ...settings.privacy, [key]: value },
    });
  };

  if (!user) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
        <p className="text-gray-600 dark:text-slate-300">
          Please log in to manage your financial settings.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Notification Settings */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow">
        <div className="p-6 border-b border-gray-200 dark:border-slate-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span></span>
            Notification Preferences
          </h2>
          <p className="text-sm text-gray-600 dark:text-slate-300 mt-1">
            Manage how you receive notifications
          </p>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-900 rounded-lg">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Email Notifications
              </h3>
              <p className="text-sm text-gray-600 dark:text-slate-300">
                Receive notifications via email
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.notifications.email}
                onChange={(e) => updateNotification("email", e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:bg-slate-800 after:border-gray-300 dark:border-slate-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-900 rounded-lg">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Push Notifications
              </h3>
              <p className="text-sm text-gray-600 dark:text-slate-300">
                Receive push notifications in browser
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.notifications.push}
                onChange={(e) => updateNotification("push", e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:bg-slate-800 after:border-gray-300 dark:border-slate-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-900 rounded-lg">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Budget Alerts
              </h3>
              <p className="text-sm text-gray-600 dark:text-slate-300">
                Alert when approaching budget limits
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.notifications.budgetAlerts}
                onChange={(e) =>
                  updateNotification("budgetAlerts", e.target.checked)
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:bg-slate-800 after:border-gray-300 dark:border-slate-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-900 rounded-lg">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Bill Reminders
              </h3>
              <p className="text-sm text-gray-600 dark:text-slate-300">
                Remind me about upcoming bills
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.notifications.billReminders}
                onChange={(e) =>
                  updateNotification("billReminders", e.target.checked)
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:bg-slate-800 after:border-gray-300 dark:border-slate-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-900 rounded-lg">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Goal Milestones
              </h3>
              <p className="text-sm text-gray-600 dark:text-slate-300">
                Celebrate when reaching financial goals
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.notifications.goalMilestones}
                onChange={(e) =>
                  updateNotification("goalMilestones", e.target.checked)
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:bg-slate-800 after:border-gray-300 dark:border-slate-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-900 rounded-lg">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Large Transactions
              </h3>
              <p className="text-sm text-gray-600 dark:text-slate-300">
                Alert for transactions over $500
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.notifications.largeTransactions}
                onChange={(e) =>
                  updateNotification("largeTransactions", e.target.checked)
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:bg-slate-800 after:border-gray-300 dark:border-slate-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Sync Settings */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow">
        <div className="p-6 border-b border-gray-200 dark:border-slate-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span></span>
            Data Sync
          </h2>
          <p className="text-sm text-gray-600 dark:text-slate-300 mt-1">
            Manage how your data is synchronized
          </p>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-900 rounded-lg">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Auto Sync
              </h3>
              <p className="text-sm text-gray-600 dark:text-slate-300">
                Automatically sync account data
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.sync.autoSync}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    sync: { ...settings.sync, autoSync: e.target.checked },
                  })
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:bg-slate-800 after:border-gray-300 dark:border-slate-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="p-4 bg-gray-50 dark:bg-slate-900 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">
              Sync Frequency
            </label>
            <select
              value={settings.sync.syncFrequency}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  sync: {
                    ...settings.sync,
                    syncFrequency: e.target
                      .value as Settings["sync"]["syncFrequency"],
                  },
                })
              }
              disabled={!settings.sync.autoSync}
              className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-200 dark:bg-slate-700"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="manual">Manual Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Privacy Settings */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow">
        <div className="p-6 border-b border-gray-200 dark:border-slate-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span></span>
            Privacy & Data
          </h2>
          <p className="text-sm text-gray-600 dark:text-slate-300 mt-1">
            Control your data and privacy preferences
          </p>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-900 rounded-lg">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Share Anonymous Data
              </h3>
              <p className="text-sm text-gray-600 dark:text-slate-300">
                Help improve our service with anonymous usage data
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.privacy.shareData}
                onChange={(e) => updatePrivacy("shareData", e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:bg-slate-800 after:border-gray-300 dark:border-slate-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-900 rounded-lg">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Analytics
              </h3>
              <p className="text-sm text-gray-600 dark:text-slate-300">
                Allow analytics to improve your experience
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.privacy.analytics}
                onChange={(e) => updatePrivacy("analytics", e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:bg-slate-800 after:border-gray-300 dark:border-slate-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-900 rounded-lg">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Marketing Communications
              </h3>
              <p className="text-sm text-gray-600 dark:text-slate-300">
                Receive tips and product updates
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.privacy.marketing}
                onChange={(e) => updatePrivacy("marketing", e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:bg-slate-800 after:border-gray-300 dark:border-slate-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </div>
  );
}
