"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const analyticsNavItems = [
  { href: "/analytics", label: "Overview", icon: "📊" },
  { href: "/analytics/credit-score", label: "Credit Score", icon: "📈" },
  { href: "/analytics/disputes", label: "Disputes", icon: "📝" },
  { href: "/analytics/reports", label: "Reports", icon: "📋" },
  { href: "/analytics/trends", label: "Trends", icon: "📉" },
];

export default function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="text-gray-500 hover:text-gray-700">
                ← Back to Dashboard
              </Link>
              <span className="text-gray-300">|</span>
              <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-500 to-blue-500 bg-clip-text text-transparent">
                Analytics
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <select className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm">
                <option>Last 30 days</option>
                <option>Last 90 days</option>
                <option>Last 12 months</option>
                <option>All time</option>
              </select>
              <button className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition text-sm">
                Export Report
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1 overflow-x-auto">
            {analyticsNavItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                    isActive
                      ? "border-emerald-500 text-emerald-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <span>{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}

