"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Layout from "@/components/Layout";

const settingsNavItems = [
  { href: "/settings", label: "Overview", icon: "⚙️" },
  { href: "/settings/profile", label: "Profile", icon: "👤" },
  { href: "/settings/notifications", label: "Notifications", icon: "🔔" },
  { href: "/settings/privacy", label: "Privacy", icon: "🔒" },
  { href: "/settings/billing", label: "Billing", icon: "💳" },
  { href: "/settings/connected-accounts", label: "Connected Accounts", icon: "🔗" },
  { href: "/settings/security", label: "Security", icon: "🛡️" },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Settings</h1>
        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar Navigation */}
          <nav className="w-full md:w-64 flex-shrink-0">
            <ul className="space-y-1">
              {settingsNavItems.map((item) => {
                const isActive = pathname === item.href || 
                  (item.href !== "/settings" && pathname?.startsWith(item.href));
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                        isActive
                          ? "bg-emerald-50 text-emerald-700 font-medium"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      }`}
                    >
                      <span>{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          {/* Main Content */}
          <main className="flex-1 min-w-0">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </Layout>
  );
}

