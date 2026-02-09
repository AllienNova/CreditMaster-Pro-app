'use client';

/**
 * Header Component with Mobile Hamburger Menu
 *
 * A responsive header with navigation that collapses into
 * a hamburger menu on mobile/tablet devices.
 * Includes theme toggle for dark/light mode switching.
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ThemeToggle } from './ThemeToggle';

interface NavLink {
  href: string;
  label: string;
  color?: string;
}

interface HeaderProps {
  variant?: 'landing' | 'app';
  showAuth?: boolean;
}

const navLinks: NavLink[] = [
  { href: '/credit', label: 'Credit Health', color: 'hover:text-emerald-600 dark:hover:text-emerald-400' },
  {
    href: '/financial-hub',
    label: 'Financial Wellness',
    color: 'hover:text-blue-600 dark:hover:text-blue-400',
  },
  {
    href: '/invest',
    label: 'Investment Intelligence',
    color: 'hover:text-blue-600 dark:hover:text-blue-400',
  },
  { href: '/tax', label: 'Tax Optimization', color: 'hover:text-emerald-600 dark:hover:text-emerald-400' },
  { href: '/pricing', label: 'Pricing', color: 'hover:text-gray-900 dark:hover:text-white' },
];

export default function Header({
  variant = 'landing',
  showAuth = true,
}: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();

  // Close menu on route change
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMenuOpen]);

  return (
    <>
      <nav className="fixed top-0 w-full z-50 bg-white dark:bg-slate-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-slate-700/50">
        <div className="max-w-[980px] mx-auto px-6">
          <div className="flex justify-between items-center h-14">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center">
                <span className="text-white font-bold text-sm">F</span>
              </div>
              <span className="text-xl font-semibold text-gray-900 dark:text-white tracking-tight">
                Fynvita
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-sm text-gray-600 dark:text-slate-300 ${link.color} transition-colors`}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {/* Desktop Auth, Theme Toggle & Mobile Menu Button */}
            <div className="flex items-center gap-4">
              {/* Theme Toggle - visible on desktop */}
              <div className="hidden md:block">
                <ThemeToggle variant="icon" />
              </div>

              {showAuth && (
                <div className="hidden md:flex items-center gap-4">
                  <Link
                    href="/auth/login"
                    className="text-sm text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/auth/signup"
                    className="text-sm bg-gradient-to-r from-emerald-500 to-blue-500 text-white px-5 py-2 rounded-lg hover:from-emerald-600 hover:to-blue-600 transition-all"
                  >
                    Get Started
                  </Link>
                </div>
              )}

              {/* Mobile Menu Button (Hamburger) */}
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={isMenuOpen}
              >
                <svg
                  className="w-6 h-6 text-gray-700 dark:text-slate-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  {isMenuOpen ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      {/* Mobile Menu Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-80 max-w-[85vw] bg-white dark:bg-slate-900 shadow-xl z-50 transform transition-transform duration-300 ease-in-out md:hidden ${
          isMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="p-6 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-2"
              onClick={() => setIsMenuOpen(false)}
            >
              <div className="w-7 h-7 rounded-md bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center">
                <span className="text-white font-bold text-sm">F</span>
              </div>
              <span className="text-xl font-semibold text-gray-900 dark:text-white tracking-tight">
                Fynvita
              </span>
            </Link>
            <button
              onClick={() => setIsMenuOpen(false)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Close menu"
            >
              <svg
                className="w-6 h-6 text-gray-700 dark:text-slate-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6">
          <nav className="space-y-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`block py-3 text-lg font-medium text-gray-700 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors ${ pathname === link.href ? 'text-emerald-600 dark:text-emerald-400' : '' }`}
                onClick={() => setIsMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Theme Toggle - Mobile */}
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-slate-300">
                Appearance
              </span>
              <ThemeToggle variant="dropdown" />
            </div>
          </div>

          {showAuth && (
            <div className="mt-8 pt-8 border-t border-gray-200 dark:border-slate-700 space-y-4">
              <Link
                href="/auth/login"
                className="block w-full text-center py-3 text-gray-700 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 font-medium transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Sign In
              </Link>
              <Link
                href="/auth/signup"
                className="block w-full text-center py-3 bg-gradient-to-r from-emerald-500 to-blue-500 text-white rounded-lg hover:from-emerald-600 hover:to-blue-600 transition-all font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
