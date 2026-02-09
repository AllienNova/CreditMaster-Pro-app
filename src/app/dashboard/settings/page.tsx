'use client';

import React, { useState } from 'react';
import Link from 'next/link';

interface UserSettings {
  fullName: string;
  email: string;
  phone: string;
  notifications: {
    email: boolean;
    sms: boolean;
    disputeUpdates: boolean;
    weeklyReport: boolean;
    marketingEmails: boolean;
  };
}

export default function UserSettingsPage() {
  const [settings, setSettings] = useState<UserSettings>({
    fullName: 'John Doe',
    email: 'john@example.com',
    phone: '+1 (555) 123-4567',
    notifications: {
      email: true,
      sms: false,
      disputeUpdates: true,
      weeklyReport: true,
      marketingEmails: false,
    },
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');

  const handleSave = async () => {
    setSaving(true);
    // Simulate save
    setTimeout(() => {
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }, 1000);
  };

  const updateNotification = (key: keyof UserSettings['notifications']) => {
    setSettings(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [key]: !prev.notifications[key],
      },
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50 to-blue-50">
      <header className="bg-white dark:bg-slate-800/80 backdrop-blur-sm shadow-sm border-b border-white/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="text-gray-600 hover:text-gray-900 dark:text-white dark:hover:text-white">← Back</Link>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Settings</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="flex space-x-4 mb-6">
          {['profile', 'notifications', 'security', 'billing'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg font-medium capitalize transition-colors ${ activeTab === tab ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 dark:bg-slate-900' }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 space-y-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Profile Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">Full Name</label>
                <input
                  type="text"
                  value={settings.fullName}
                  onChange={(e) => setSettings({ ...settings, fullName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">Email</label>
                <input
                  type="email"
                  value={settings.email}
                  onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">Phone</label>
                <input
                  type="tel"
                  value={settings.phone}
                  onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Notification Preferences</h2>
            {[
              { key: 'email', label: 'Email Notifications', desc: 'Receive updates via email' },
              { key: 'sms', label: 'SMS Notifications', desc: 'Receive text message alerts' },
              { key: 'disputeUpdates', label: 'Dispute Updates', desc: 'Get notified when dispute status changes' },
              { key: 'weeklyReport', label: 'Weekly Report', desc: 'Receive weekly credit progress summary' },
              { key: 'marketingEmails', label: 'Marketing Emails', desc: 'Receive promotional offers and tips' },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-slate-700 last:border-0">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{item.label}</p>
                  <p className="text-sm text-gray-500 dark:text-slate-400">{item.desc}</p>
                </div>
                <button
                  onClick={() => updateNotification(item.key as keyof UserSettings['notifications'])}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.notifications[item.key as keyof UserSettings['notifications']] ? 'bg-blue-600' : 'bg-gray-200 dark:bg-slate-700'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-slate-800 transition-transform ${
                    settings.notifications[item.key as keyof UserSettings['notifications']] ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 space-y-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Security Settings</h2>
            <div>
              <button className="px-4 py-2 bg-gray-100 text-gray-700 dark:text-slate-200 rounded-lg hover:bg-gray-200 dark:bg-slate-700 transition-colors">
                Change Password
              </button>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">Two-Factor Authentication</h3>
              <p className="text-sm text-gray-500 dark:text-slate-400 mb-3">Add an extra layer of security to your account</p>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Enable 2FA
              </button>
            </div>
          </div>
        )}

        {/* Billing Tab */}
        {activeTab === 'billing' && (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 space-y-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Billing & Subscription</h2>
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="font-medium text-blue-900">Current Plan: Premium</p>
              <p className="text-sm text-blue-700">$79/month • Renews Dec 15, 2024</p>
            </div>
            <div className="flex space-x-4">
              <Link href="/pricing" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Upgrade Plan
              </Link>
              <button className="px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-200 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 dark:bg-slate-900">
                Manage Payment Method
              </button>
            </div>
          </div>
        )}

        {/* Save Button */}
        <div className="mt-6 flex items-center gap-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          {saved && <span className="text-green-600">Changes saved</span>}
        </div>
      </main>
    </div>
  );
}

