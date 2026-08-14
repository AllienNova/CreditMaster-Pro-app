"use client";

import React from "react";
import { useRouter, usePathname } from "next/navigation";

interface LayoutProps {
  children: React.ReactNode;
  showNavigation?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ children, showNavigation = true }) => {
  const router = useRouter();
  const pathname = usePathname();

  /**
   * The five product pillars, matching the landing page (src/app/page.tsx:40-85)
   * so the signed-in header and the marketing site name the same product.
   *
   * The previous list was Dashboard / Credit Builder / Marketplace / Student
   * Loans / Pricing — it advertised "Pricing" to users who had already paid,
   * and omitted Financial Wellness, Investment Intelligence and Tax entirely,
   * which is most of what the platform does.
   */
  const navigationItems = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/credit", label: "Credit Health" },
    { href: "/financial-hub", label: "Financial Wellness" },
    { href: "/invest", label: "Investing" },
    { href: "/tax", label: "Tax" },
    { href: "/marketplace", label: "Marketplace" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50 to-blue-50">
      {showNavigation && (
        <header className="bg-white dark:bg-slate-800/80 backdrop-blur-sm shadow-sm border-b border-white/20 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              {/* Logo */}
              <div className="flex items-center space-x-4">
                {/* The mark rendered as an empty blue square: the span had no
                    content. Now the brand initial, matching the wordmark. */}
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-600 to-blue-700 rounded-lg flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-lg">F</span>
                </div>
                <div>
                  {/* Was "Agentic Credit Repair" / "AI-Agent Powered Platform" —
                      pre-rebrand naming that also undersold the product as a
                      credit-repair tool. Matches src/app/page.tsx:26 now. */}
                  <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-blue-700 bg-clip-text text-transparent">
                    Fynvita
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    Your Financial Vitality Platform
                  </p>
                </div>
              </div>

              {/* Navigation */}
              <nav className="hidden md:flex items-center space-x-6">
                {navigationItems.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    className={`text-sm font-medium transition-colors ${
                      pathname === item.href
                        ? "text-blue-600 border-b-2 border-blue-600 pb-1"
                        : "text-gray-700 dark:text-slate-200 hover:text-blue-600"
                    }`}
                  >
                    {item.label}
                  </a>
                ))}
              </nav>

              {/* Mobile menu button */}
              <div className="md:hidden">
                <button className="text-gray-700 dark:text-slate-200 hover:text-blue-600">
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M4 6h16M4 12h16M4 18h16"
                    ></path>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </header>
      )}

      {children}
    </div>
  );
};

export default Layout;
