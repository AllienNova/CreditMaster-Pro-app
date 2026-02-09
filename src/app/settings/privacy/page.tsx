"use client";

import { useState } from "react";

export default function PrivacySettingsPage() {
  const [settings, setSettings] = useState({
    shareDataWithPartners: false,
    allowAnalytics: true,
    showProfilePublicly: false,
    allowPersonalizedAds: false,
    dataRetentionPeriod: "1year",
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setSaving(false);
    alert("Privacy settings saved!");
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Privacy Settings</h2>
      <p className="text-gray-600 dark:text-slate-300 mb-8">Control how your data is used and shared</p>

      {/* Data Sharing */}
      <div className="space-y-6">
        <div className="pb-6 border-b border-gray-200 dark:border-slate-700">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Data Sharing</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Share data with partners</p>
                <p className="text-sm text-gray-500 dark:text-slate-400">Allow sharing anonymized data with trusted partners</p>
              </div>
              <button
                onClick={() => setSettings({ ...settings, shareDataWithPartners: !settings.shareDataWithPartners })}
                className={`w-12 h-6 rounded-full transition ${settings.shareDataWithPartners ? "bg-emerald-500" : "bg-gray-300"}`}
              >
                <span className={`block w-5 h-5 bg-white dark:bg-slate-800 rounded-full shadow transform transition ${settings.shareDataWithPartners ? "translate-x-6" : "translate-x-0.5"}`} />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Analytics & improvements</p>
                <p className="text-sm text-gray-500 dark:text-slate-400">Help us improve by sharing usage analytics</p>
              </div>
              <button
                onClick={() => setSettings({ ...settings, allowAnalytics: !settings.allowAnalytics })}
                className={`w-12 h-6 rounded-full transition ${settings.allowAnalytics ? "bg-emerald-500" : "bg-gray-300"}`}
              >
                <span className={`block w-5 h-5 bg-white dark:bg-slate-800 rounded-full shadow transform transition ${settings.allowAnalytics ? "translate-x-6" : "translate-x-0.5"}`} />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Personalized advertising</p>
                <p className="text-sm text-gray-500 dark:text-slate-400">Show ads based on your interests</p>
              </div>
              <button
                onClick={() => setSettings({ ...settings, allowPersonalizedAds: !settings.allowPersonalizedAds })}
                className={`w-12 h-6 rounded-full transition ${settings.allowPersonalizedAds ? "bg-emerald-500" : "bg-gray-300"}`}
              >
                <span className={`block w-5 h-5 bg-white dark:bg-slate-800 rounded-full shadow transform transition ${settings.allowPersonalizedAds ? "translate-x-6" : "translate-x-0.5"}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Data Retention */}
        <div className="pb-6 border-b border-gray-200 dark:border-slate-700">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Data Retention</h3>
          <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">Choose how long we keep your historical data</p>
          <select
            value={settings.dataRetentionPeriod}
            onChange={(e) => setSettings({ ...settings, dataRetentionPeriod: e.target.value })}
            className="w-full md:w-64 px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500"
          >
            <option value="6months">6 months</option>
            <option value="1year">1 year</option>
            <option value="2years">2 years</option>
            <option value="forever">Keep forever</option>
          </select>
        </div>

        {/* Data Export & Deletion */}
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Your Data</h3>
          <div className="flex flex-wrap gap-3">
            <button className="px-4 py-2 bg-gray-100 text-gray-700 dark:text-slate-200 rounded-lg hover:bg-gray-200 dark:bg-slate-700 transition">
              Download My Data
            </button>
            <button className="px-4 py-2 bg-gray-100 text-gray-700 dark:text-slate-200 rounded-lg hover:bg-gray-200 dark:bg-slate-700 transition">
              View Data Usage
            </button>
            <button className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition">
              Request Data Deletion
            </button>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-6 mt-6 border-t border-gray-200 dark:border-slate-700">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 transition"
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </div>
  );
}

