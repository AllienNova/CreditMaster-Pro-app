'use client';

import Link from 'next/link';
import { ThemeToggle } from '@/components/ui';
import { useTheme } from '@/contexts/ThemeContext';
import { Icon } from '@/components/ui/Icon';

const settingsSections = [
  {
    title: 'Profile',
    description: 'Manage your personal information, display name, and avatar',
    href: '/settings/profile',
    icon: "user",
    status: 'Complete your profile',
  },
  {
    title: 'Notifications',
    description: 'Configure email, push, and SMS notification preferences',
    href: '/settings/notifications',
    icon: "bell",
    status: '3 alerts enabled',
  },
  {
    title: 'Privacy',
    description: 'Control your data sharing and visibility settings',
    href: '/settings/privacy',
    icon: "shield",
    status: 'Data protected',
  },
  {
    title: 'Billing',
    description: 'Manage your subscription, payment methods, and invoices',
    href: '/settings/billing',
    icon: "credit-card",
    status: 'Premium Plan',
  },
  {
    title: 'Connected Accounts',
    description: 'Link and manage your bank accounts and credit bureaus',
    href: '/settings/connected-accounts',
    icon: "link",
    status: '2 accounts linked',
  },
  {
    title: 'Security',
    description: 'Two-factor authentication, sessions, and password settings',
    href: '/settings/security',
    icon: "lock",
    status: '2FA enabled',
  },
];

export default function SettingsPage() {
  const { theme, resolvedTheme } = useTheme();

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        Settings Overview
      </h2>
      <p className="text-gray-600 dark:text-slate-400 mb-8">
        Manage your account settings and preferences
      </p>

      {/* Appearance Section */}
      <div className="mb-8 p-4 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center text-2xl">
                          </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Appearance
              </h3>
              <p className="text-sm text-gray-500 dark:text-slate-400">
                Current:{' '}
                {theme === 'system'
                  ? `System (${resolvedTheme})`
                  : resolvedTheme}
              </p>
            </div>
          </div>
          <ThemeToggle variant="dropdown" />
        </div>
      </div>

      <div className="grid gap-4">
        {settingsSections.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="flex items-center gap-4 p-4 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-emerald-300 dark:hover:border-emerald-600 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/20 transition group"
          >
            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-slate-700 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/50 flex items-center justify-center text-2xl transition">
              {section.icon}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition">
                {section.title}
              </h3>
              <p className="text-sm text-gray-500 dark:text-slate-400">
                {section.description}
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-gray-400 dark:text-slate-500">
                {section.status}
              </span>
              <span className="ml-2 text-gray-400 dark:text-slate-500 group-hover:text-emerald-500 transition">
                →
              </span>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mt-8 pt-8 border-t border-gray-200 dark:border-slate-700">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
          Quick Actions
        </h3>
        <div className="flex flex-wrap gap-3">
          <button className="px-4 py-2 text-sm bg-gray-100 text-gray-700 dark:text-slate-300 rounded-lg hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 transition">
            Export My Data
          </button>
          <button className="px-4 py-2 text-sm bg-gray-100 text-gray-700 dark:text-slate-300 rounded-lg hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 transition">
            Download Reports
          </button>
          <button className="px-4 py-2 text-sm bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 transition">
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );
}
