"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const adminNavItems = [
  { href: "/admin", label: "Dashboard", icon: "📊" },
  { href: "/admin/users", label: "Users", icon: "👥" },
  { href: "/admin/subscriptions", label: "Subscriptions", icon: "💳" },
  { href: "/admin/disputes", label: "Disputes", icon: "📝" },
  { href: "/admin/health", label: "System Health", icon: "🏥" },
  { href: "/admin/logs", label: "Error Logs", icon: "📋" },
  { href: "/admin/audit", label: "Audit Trail", icon: "🔍" },
  { href: "/admin/features", label: "Feature Flags", icon: "🚩" },
  { href: "/admin/config", label: "Configuration", icon: "⚙️" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Top Header */}
      <header className="bg-gray-900 text-white">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-xl font-bold">
              🛡️ Admin Panel
            </Link>
            <span className="text-xs bg-red-500 px-2 py-1 rounded">ADMIN</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm text-gray-300 hover:text-white">
              ← Back to App
            </Link>
            <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-sm font-bold">
              A
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-gray-800 min-h-[calc(100vh-64px)] text-white">
          <nav className="p-4">
            <ul className="space-y-1">
              {adminNavItems.map((item) => {
                const isActive = pathname === item.href || 
                  (item.href !== "/admin" && pathname?.startsWith(item.href));
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                        isActive
                          ? "bg-emerald-600 text-white"
                          : "text-gray-300 hover:bg-gray-700 hover:text-white"
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
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

