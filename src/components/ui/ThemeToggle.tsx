'use client';

/**
 * Theme Toggle Component
 * 
 * A beautiful toggle button for switching between light/dark/system themes.
 * Features smooth animations and accessible design.
 */

import React from 'react';
import { useTheme, Theme } from '@/contexts/ThemeContext';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
  variant?: 'icon' | 'button' | 'dropdown';
}

// Icons
const SunIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
      d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const MoonIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
      d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
  </svg>
);

const SystemIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
      d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

export function ThemeToggle({ className = '', showLabel = false, variant = 'icon' }: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();
  const [isOpen, setIsOpen] = React.useState(false);

  const getIcon = () => {
    if (theme === 'system') return <SystemIcon />;
    return resolvedTheme === 'dark' ? <MoonIcon /> : <SunIcon />;
  };

  const getLabel = () => {
    if (theme === 'system') return 'System';
    return resolvedTheme === 'dark' ? 'Dark' : 'Light';
  };

  if (variant === 'icon') {
    return (
      <button
        onClick={toggleTheme}
        className={`p-2 rounded-lg transition-colors duration-200
          text-gray-600 hover:text-gray-900 hover:bg-gray-100
          dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-800
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          dark:focus:ring-offset-gray-900 ${className}`}
        aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
      >
        <div className="relative w-5 h-5">
          <div className={`absolute inset-0 transition-transform duration-300 ${resolvedTheme === 'dark' ? 'rotate-0 opacity-100' : 'rotate-90 opacity-0'}`}>
            <MoonIcon />
          </div>
          <div className={`absolute inset-0 transition-transform duration-300 ${resolvedTheme === 'light' ? 'rotate-0 opacity-100' : '-rotate-90 opacity-0'}`}>
            <SunIcon />
          </div>
        </div>
      </button>
    );
  }

  if (variant === 'button') {
    return (
      <button
        onClick={toggleTheme}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors duration-200
          bg-gray-100 hover:bg-gray-200 text-gray-700
          dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-300
          focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
        aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
      >
        {getIcon()}
        {showLabel && <span className="text-sm font-medium">{getLabel()}</span>}
      </button>
    );
  }

  // Dropdown variant
  const themes: { value: Theme; label: string; icon: React.ReactNode }[] = [
    { value: 'light', label: 'Light', icon: <SunIcon /> },
    { value: 'dark', label: 'Dark', icon: <MoonIcon /> },
    { value: 'system', label: 'System', icon: <SystemIcon /> },
  ];

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors duration-200
          bg-gray-100 hover:bg-gray-200 text-gray-700
          dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-300
          focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        {getIcon()}
        <span className="text-sm font-medium">{getLabel()}</span>
        <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-40 py-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20">
            {themes.map(({ value, label, icon }) => (
              <button
                key={value}
                onClick={() => { setTheme(value); setIsOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors
                  ${theme === value 
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' 
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'}`}
              >
                {icon}
                <span>{label}</span>
                {theme === value && (
                  <svg className="w-4 h-4 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default ThemeToggle;

