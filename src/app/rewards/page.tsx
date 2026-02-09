'use client';

/**
 * Rewards & Gamification Page
 * Main page for viewing XP, level, quests, and progress
 */

import React from 'react';
import { Metadata } from 'next';
import { GamifiedDashboard } from '@/components/gamification';

export default function RewardsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50 to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800/80 backdrop-blur-sm shadow-sm border-b border-white/20 dark:border-slate-700/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <a
                href="/dashboard"
                className="text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-gray-200"
              >
                ← Back to Dashboard
              </a>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-2xl"></span>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                Rewards & Progress
              </h1>
            </div>
            <div className="w-24" /> {/* Spacer for centering */}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <GamifiedDashboard />
      </main>
    </div>
  );
}
