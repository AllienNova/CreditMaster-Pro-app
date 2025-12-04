"use client";

import Link from "next/link";

const settingsSections = [
  {
    title: "Profile",
    description: "Manage your personal information, display name, and avatar",
    href: "/settings/profile",
    icon: "👤",
    status: "Complete your profile",
  },
  {
    title: "Notifications",
    description: "Configure email, push, and SMS notification preferences",
    href: "/settings/notifications",
    icon: "🔔",
    status: "3 alerts enabled",
  },
  {
    title: "Privacy",
    description: "Control your data sharing and visibility settings",
    href: "/settings/privacy",
    icon: "🔒",
    status: "Data protected",
  },
  {
    title: "Billing",
    description: "Manage your subscription, payment methods, and invoices",
    href: "/settings/billing",
    icon: "💳",
    status: "Premium Plan",
  },
  {
    title: "Connected Accounts",
    description: "Link and manage your bank accounts and credit bureaus",
    href: "/settings/connected-accounts",
    icon: "🔗",
    status: "2 accounts linked",
  },
  {
    title: "Security",
    description: "Two-factor authentication, sessions, and password settings",
    href: "/settings/security",
    icon: "🛡️",
    status: "2FA enabled",
  },
];

export default function SettingsPage() {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Settings Overview</h2>
      <p className="text-gray-600 mb-8">Manage your account settings and preferences</p>

      <div className="grid gap-4">
        {settingsSections.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="flex items-center gap-4 p-4 rounded-lg border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/50 transition group"
          >
            <div className="w-12 h-12 rounded-full bg-gray-100 group-hover:bg-emerald-100 flex items-center justify-center text-2xl transition">
              {section.icon}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 group-hover:text-emerald-700 transition">
                {section.title}
              </h3>
              <p className="text-sm text-gray-500">{section.description}</p>
            </div>
            <div className="text-right">
              <span className="text-xs text-gray-400">{section.status}</span>
              <span className="ml-2 text-gray-400 group-hover:text-emerald-500 transition">→</span>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mt-8 pt-8 border-t border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          <button className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition">
            Export My Data
          </button>
          <button className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition">
            Download Reports
          </button>
          <button className="px-4 py-2 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition">
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );
}

