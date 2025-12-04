"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const helpNavItems = [
  { href: "/help", label: "Help Center", icon: "🏠" },
  { href: "/help/faq", label: "FAQ", icon: "❓" },
  { href: "/help/guides", label: "Guides", icon: "📚" },
  { href: "/help/contact", label: "Contact Us", icon: "📧" },
];

export default function HelpLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-emerald-500 to-blue-500 text-white">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <Link href="/dashboard" className="text-emerald-100 hover:text-white text-sm mb-4 inline-block">
            ← Back to Dashboard
          </Link>
          <h1 className="text-4xl font-bold mb-2">Help Center</h1>
          <p className="text-emerald-100">Find answers, guides, and support for CreditMaster Pro</p>
          
          {/* Search */}
          <div className="mt-6 max-w-xl">
            <input
              type="text"
              placeholder="Search for help..."
              className="w-full px-4 py-3 rounded-lg text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-white"
            />
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto">
            {helpNavItems.map((item) => {
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
      <main className="max-w-6xl mx-auto px-4 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex flex-wrap justify-between items-center gap-4">
            <p className="text-gray-500 text-sm">
              Can&apos;t find what you&apos;re looking for?{" "}
              <Link href="/help/contact" className="text-emerald-500 hover:text-emerald-600">Contact our support team</Link>
            </p>
            <div className="flex gap-4">
              <Link href="/terms" className="text-sm text-gray-500 hover:text-gray-700">Terms</Link>
              <Link href="/privacy" className="text-sm text-gray-500 hover:text-gray-700">Privacy</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

