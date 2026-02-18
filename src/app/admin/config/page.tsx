"use client";

import { useState } from "react";

export default function AdminConfigPage() {
  const [config, setConfig] = useState({
    rateLimits: { api: 1000, disputes: 50, reports: 10 },
    emailSettings: {
      fromName: "Fynvita",
      fromEmail: "noreply@fynvita.com",
      replyTo: "support@fynvita.com",
    },
    security: { sessionTimeout: 30, maxLoginAttempts: 5, lockoutDuration: 15 },
    features: { maintenanceMode: false, signupEnabled: true, trialDays: 7 },
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setSaving(false);
    alert("Configuration saved!");
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          System Configuration
        </h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 transition"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      <div className="space-y-8">
        {/* Rate Limits */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Rate Limits
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">
                Fynvita Requests/min
              </label>
              <input
                type="number"
                value={config.rateLimits.api}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    rateLimits: {
                      ...config.rateLimits,
                      api: parseInt(e.target.value),
                    },
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">
                Disputes/day
              </label>
              <input
                type="number"
                value={config.rateLimits.disputes}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    rateLimits: {
                      ...config.rateLimits,
                      disputes: parseInt(e.target.value),
                    },
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">
                Reports/day
              </label>
              <input
                type="number"
                value={config.rateLimits.reports}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    rateLimits: {
                      ...config.rateLimits,
                      reports: parseInt(e.target.value),
                    },
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg"
              />
            </div>
          </div>
        </div>

        {/* Email Settings */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Email Settings
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">
                From Name
              </label>
              <input
                type="text"
                value={config.emailSettings.fromName}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    emailSettings: {
                      ...config.emailSettings,
                      fromName: e.target.value,
                    },
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">
                From Email
              </label>
              <input
                type="email"
                value={config.emailSettings.fromEmail}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    emailSettings: {
                      ...config.emailSettings,
                      fromEmail: e.target.value,
                    },
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">
                Reply-To
              </label>
              <input
                type="email"
                value={config.emailSettings.replyTo}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    emailSettings: {
                      ...config.emailSettings,
                      replyTo: e.target.value,
                    },
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg"
              />
            </div>
          </div>
        </div>

        {/* Security Settings */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Security Settings
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">
                Session Timeout (min)
              </label>
              <input
                type="number"
                value={config.security.sessionTimeout}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    security: {
                      ...config.security,
                      sessionTimeout: parseInt(e.target.value),
                    },
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">
                Max Login Attempts
              </label>
              <input
                type="number"
                value={config.security.maxLoginAttempts}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    security: {
                      ...config.security,
                      maxLoginAttempts: parseInt(e.target.value),
                    },
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">
                Lockout Duration (min)
              </label>
              <input
                type="number"
                value={config.security.lockoutDuration}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    security: {
                      ...config.security,
                      lockoutDuration: parseInt(e.target.value),
                    },
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg"
              />
            </div>
          </div>
        </div>

        {/* Feature Toggles */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Feature Toggles
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  Maintenance Mode
                </p>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  Disable access for non-admin users
                </p>
              </div>
              <button
                onClick={() =>
                  setConfig({
                    ...config,
                    features: {
                      ...config.features,
                      maintenanceMode: !config.features.maintenanceMode,
                    },
                  })
                }
                className={`w-12 h-6 rounded-full transition ${config.features.maintenanceMode ? "bg-red-500" : "bg-gray-300"}`}
              >
                <span
                  className={`block w-5 h-5 bg-white dark:bg-slate-800 rounded-full shadow transform transition ${config.features.maintenanceMode ? "translate-x-6" : "translate-x-0.5"}`}
                />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  Signup Enabled
                </p>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  Allow new user registrations
                </p>
              </div>
              <button
                onClick={() =>
                  setConfig({
                    ...config,
                    features: {
                      ...config.features,
                      signupEnabled: !config.features.signupEnabled,
                    },
                  })
                }
                className={`w-12 h-6 rounded-full transition ${config.features.signupEnabled ? "bg-emerald-500" : "bg-gray-300"}`}
              >
                <span
                  className={`block w-5 h-5 bg-white dark:bg-slate-800 rounded-full shadow transform transition ${config.features.signupEnabled ? "translate-x-6" : "translate-x-0.5"}`}
                />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  Free Trial Days
                </p>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  Number of days for free trial
                </p>
              </div>
              <input
                type="number"
                value={config.features.trialDays}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    features: {
                      ...config.features,
                      trialDays: parseInt(e.target.value),
                    },
                  })
                }
                className="w-20 px-3 py-1 border border-gray-300 dark:border-slate-600 rounded-lg text-center"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
