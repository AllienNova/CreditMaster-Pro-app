'use client'

import React from 'react';
import { usePathname } from 'next/navigation';

interface LayoutProps {
  children: React.ReactNode;
  showNavigation?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ children, showNavigation = true }) => {
  const pathname = usePathname();

  const navigationItems = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/student-loan-agent', label: 'Student Loans' },
    { href: '/pricing', label: 'Pricing' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-cyan-50">
      {showNavigation && (
        <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-white/20 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              {/* Logo */}
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-600 rounded-lg flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-lg">🤖</span>
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-600 bg-clip-text text-transparent">
                    Agentic Credit Repair
                  </h1>
                  <p className="text-sm text-gray-500">AI-Agent Powered Platform</p>
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
                        ? 'text-blue-600 border-b-2 border-blue-600 pb-1'
                        : 'text-gray-700 hover:text-blue-600'
                    }`}
                  >
                    {item.label}
                  </a>
                ))}
              </nav>

              {/* Mobile menu button */}
              <div className="md:hidden">
                <button className="text-gray-700 hover:text-blue-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
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
