"use client";

import { useState } from "react";
import { PushNotificationToggle } from "@/components/notifications";
import { useAuth } from "@/hooks/useAuth";

interface NotificationSetting {
  id: string;
  label: string;
  description: string;
  email: boolean;
  push: boolean;
  sms: boolean;
}

const defaultSettings: NotificationSetting[] = [
  { id: "score_changes", label: "Credit Score Changes", description: "Get notified when your credit score changes", email: true, push: true, sms: false },
  { id: "new_accounts", label: "New Account Alerts", description: "Alert when new accounts appear on your report", email: true, push: true, sms: true },
  { id: "dispute_updates", label: "Dispute Updates", description: "Updates on your dispute status and results", email: true, push: true, sms: false },
  { id: "payment_reminders", label: "Payment Reminders", description: "Reminders for upcoming bill payments", email: true, push: false, sms: false },
  { id: "security_alerts", label: "Security Alerts", description: "Suspicious activity and login notifications", email: true, push: true, sms: true },
  { id: "marketing", label: "Marketing & Tips", description: "Credit tips, product updates, and offers", email: false, push: false, sms: false },
];

export default function NotificationsSettingsPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<NotificationSetting[]>(defaultSettings);
  const [saving, setSaving] = useState(false);
  const userId = user?.id ?? "guest";

  const toggleSetting = (id: string, channel: "email" | "push" | "sms") => {
    setSettings(settings.map((s) => s.id === id ? { ...s, [channel]: !s[channel] } : s));
  };

  const handleSave = async () => {
    setSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setSaving(false);
    alert("Notification preferences saved!");
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Notification Settings</h2>
      <p className="text-gray-600 dark:text-slate-300 mb-8">Choose how you want to be notified</p>

      {/* Push Notifications Section */}
      <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-blue-50 rounded-xl border border-blue-100">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Browser Push Notifications</h3>
        <p className="text-sm text-gray-600 dark:text-slate-300 mb-4">
          Get instant alerts in your browser even when you&apos;re not on the site.
        </p>
        <PushNotificationToggle
          userId={userId}
          showLabel={true}
          showDescription={true}
          className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm"
        />
      </div>

      {/* Channel Headers */}
      <div className="hidden md:grid grid-cols-[1fr,80px,80px,80px] gap-4 pb-4 border-b border-gray-200 dark:border-slate-700 text-sm font-medium text-gray-500 dark:text-slate-400">
        <div>Notification Type</div>
        <div className="text-center">Email</div>
        <div className="text-center">Push</div>
        <div className="text-center">SMS</div>
      </div>

      {/* Settings List */}
      <div className="divide-y divide-gray-100 dark:divide-slate-700">
        {settings.map((setting) => (
          <div key={setting.id} className="py-4 grid md:grid-cols-[1fr,80px,80px,80px] gap-4 items-center">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">{setting.label}</p>
              <p className="text-sm text-gray-500 dark:text-slate-400">{setting.description}</p>
            </div>
            <div className="flex md:justify-center items-center gap-2">
              <span className="md:hidden text-sm text-gray-500 dark:text-slate-400">Email:</span>
              <button
                onClick={() => toggleSetting(setting.id, "email")}
                className={`w-10 h-6 rounded-full transition ${setting.email ? "bg-emerald-500" : "bg-gray-300"}`}
              >
                <span className={`block w-4 h-4 bg-white dark:bg-slate-800 rounded-full shadow transform transition ${setting.email ? "translate-x-5" : "translate-x-1"}`} />
              </button>
            </div>
            <div className="flex md:justify-center items-center gap-2">
              <span className="md:hidden text-sm text-gray-500 dark:text-slate-400">Push:</span>
              <button
                onClick={() => toggleSetting(setting.id, "push")}
                className={`w-10 h-6 rounded-full transition ${setting.push ? "bg-emerald-500" : "bg-gray-300"}`}
              >
                <span className={`block w-4 h-4 bg-white dark:bg-slate-800 rounded-full shadow transform transition ${setting.push ? "translate-x-5" : "translate-x-1"}`} />
              </button>
            </div>
            <div className="flex md:justify-center items-center gap-2">
              <span className="md:hidden text-sm text-gray-500 dark:text-slate-400">SMS:</span>
              <button
                onClick={() => toggleSetting(setting.id, "sms")}
                className={`w-10 h-6 rounded-full transition ${setting.sms ? "bg-emerald-500" : "bg-gray-300"}`}
              >
                <span className={`block w-4 h-4 bg-white dark:bg-slate-800 rounded-full shadow transform transition ${setting.sms ? "translate-x-5" : "translate-x-1"}`} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Quiet Hours */}
      <div className="mt-8 pt-8 border-t border-gray-200 dark:border-slate-700">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Quiet Hours</h3>
        <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">Pause non-urgent notifications during specific hours</p>
        <div className="flex items-center gap-4">
          <input type="time" defaultValue="22:00" className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg" />
          <span className="text-gray-500 dark:text-slate-400">to</span>
          <input type="time" defaultValue="08:00" className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg" />
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-6 mt-6 border-t border-gray-200 dark:border-slate-700">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 transition"
        >
          {saving ? "Saving..." : "Save Preferences"}
        </button>
      </div>
    </div>
  );
}

