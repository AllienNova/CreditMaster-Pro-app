'use client';

/**
 * Tax Calendar Page
 *
 * Visual calendar showing tax deadlines, reminders, and recommended actions.
 * Helps users stay on track with their tax obligations and optimization opportunities.
 */

import { useState, useMemo } from 'react';
import Link from 'next/link';

interface TaxEvent {
  id: string;
  title: string;
  description: string;
  date: Date;
  type: 'deadline' | 'reminder' | 'recommendation' | 'payment';
  priority: 'critical' | 'high' | 'medium' | 'low';
  isCompleted: boolean;
  category: string;
}

const TAX_EVENTS_2024: TaxEvent[] = [
  // Q1 Deadlines
  {
    id: '1',
    title: 'Q4 Estimated Tax Payment Due',
    description: 'Final quarterly estimated tax payment for the prior year',
    date: new Date(2024, 0, 16),
    type: 'payment',
    priority: 'critical',
    isCompleted: true,
    category: 'Estimated Taxes',
  },
  {
    id: '2',
    title: 'Tax Filing Deadline',
    description: 'Federal and state income tax returns due (or extension)',
    date: new Date(2024, 3, 15),
    type: 'deadline',
    priority: 'critical',
    isCompleted: true,
    category: 'Filing',
  },
  {
    id: '3',
    title: 'Q1 Estimated Tax Payment Due',
    description: 'First quarterly estimated tax payment for current year',
    date: new Date(2024, 3, 15),
    type: 'payment',
    priority: 'critical',
    isCompleted: true,
    category: 'Estimated Taxes',
  },
  // Q2 Deadlines
  {
    id: '4',
    title: 'Q2 Estimated Tax Payment Due',
    description: 'Second quarterly estimated tax payment',
    date: new Date(2024, 5, 17),
    type: 'payment',
    priority: 'critical',
    isCompleted: true,
    category: 'Estimated Taxes',
  },
  // Q3 Deadlines
  {
    id: '5',
    title: 'Q3 Estimated Tax Payment Due',
    description: 'Third quarterly estimated tax payment',
    date: new Date(2024, 8, 16),
    type: 'payment',
    priority: 'critical',
    isCompleted: true,
    category: 'Estimated Taxes',
  },
  // Q4 Deadlines & Year-End
  {
    id: '6',
    title: 'Extended Tax Return Deadline',
    description: 'Final deadline for extended returns',
    date: new Date(2024, 9, 15),
    type: 'deadline',
    priority: 'critical',
    isCompleted: true,
    category: 'Filing',
  },
  {
    id: '7',
    title: 'Review 401(k) Contributions',
    description: "Ensure you're on track to max out 401(k) by year-end",
    date: new Date(2024, 10, 1),
    type: 'reminder',
    priority: 'high',
    isCompleted: false,
    category: 'Retirement',
  },
  {
    id: '8',
    title: 'Tax-Loss Harvesting Review',
    description: 'Review portfolio for tax-loss harvesting opportunities',
    date: new Date(2024, 10, 15),
    type: 'recommendation',
    priority: 'high',
    isCompleted: false,
    category: 'Investment',
  },
  {
    id: '9',
    title: 'Charitable Giving Deadline',
    description: 'Make charitable donations for current year deduction',
    date: new Date(2024, 11, 31),
    type: 'deadline',
    priority: 'medium',
    isCompleted: false,
    category: 'Deductions',
  },
  {
    id: '10',
    title: '401(k) Contribution Deadline',
    description: 'Last day to make 401(k) contributions for the year',
    date: new Date(2024, 11, 31),
    type: 'deadline',
    priority: 'critical',
    isCompleted: false,
    category: 'Retirement',
  },
  // 2025
  {
    id: '11',
    title: 'IRA Contribution Deadline',
    description: 'Last day to contribute to IRA for 2024 tax year',
    date: new Date(2025, 3, 15),
    type: 'deadline',
    priority: 'high',
    isCompleted: false,
    category: 'Retirement',
  },
  {
    id: '12',
    title: 'HSA Contribution Deadline',
    description: 'Last day to contribute to HSA for 2024 tax year',
    date: new Date(2025, 3, 15),
    type: 'deadline',
    priority: 'high',
    isCompleted: false,
    category: 'Healthcare',
  },
];

const eventTypeColors = {
  deadline: {
    bg: 'bg-red-100',
    text: 'text-red-800',
    border: 'border-red-200',
  },
  payment: {
    bg: 'bg-blue-100',
    text: 'text-blue-800',
    border: 'border-blue-200',
  },
  reminder: {
    bg: 'bg-blue-100',
    text: 'text-blue-800',
    border: 'border-blue-200',
  },
  recommendation: {
    bg: 'bg-amber-100',
    text: 'text-amber-800',
    border: 'border-amber-200',
  },
};

const priorityColors = {
  critical: 'border-l-red-500',
  high: 'border-l-orange-500',
  medium: 'border-l-blue-500',
  low: 'border-l-gray-400',
};

export default function TaxCalendarPage() {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'completed'>(
    'upcoming'
  );
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const filteredEvents = useMemo(() => {
    const now = new Date();

    return TAX_EVENTS_2024.filter((event) => {
      // Filter by completion status
      if (filter === 'upcoming' && event.isCompleted) return false;
      if (filter === 'completed' && !event.isCompleted) return false;

      // Filter by category
      if (categoryFilter !== 'all' && event.category !== categoryFilter)
        return false;

      return true;
    }).sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [filter, categoryFilter]);

  const upcomingEvents = useMemo(() => {
    const now = new Date();
    return TAX_EVENTS_2024.filter((e) => !e.isCompleted && e.date >= now)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 5);
  }, []);

  const categories = useMemo(() => {
    const cats = new Set(TAX_EVENTS_2024.map((e) => e.category));
    return ['all', ...Array.from(cats)];
  }, []);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getDaysUntil = (date: Date) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const target = new Date(date);
    target.setHours(0, 0, 0, 0);
    const diff = Math.ceil(
      (target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diff < 0) return 'Past';
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    if (diff <= 7) return `${diff} days`;
    if (diff <= 30) return `${Math.ceil(diff / 7)} weeks`;
    return `${Math.ceil(diff / 30)} months`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800/80 backdrop-blur-xl border-b border-gray-200 dark:border-slate-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link href="/tax" className="flex items-center gap-2">
                <span className="text-gray-400 dark:text-slate-500">←</span>
                <span className="text-gray-600 dark:text-slate-300">Back to Tax</span>
              </Link>
              <span className="text-gray-300">|</span>
              <h1 className="text-lg font-semibold text-amber-600">
                Tax Calendar
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Upcoming Deadlines Alert */}
            {upcomingEvents.length > 0 &&
              upcomingEvents[0].priority === 'critical' && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-red-500 text-xl"></span>
                    <div>
                      <h3 className="font-semibold text-red-800">
                        Upcoming Critical Deadline
                      </h3>
                      <p className="text-red-700 text-sm mt-1">
                        {upcomingEvents[0].title} —{' '}
                        {formatDate(upcomingEvents[0].date)} (
                        {getDaysUntil(upcomingEvents[0].date)})
                      </p>
                    </div>
                  </div>
                </div>
              )}

            {/* Filters */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-4">
              <div className="flex flex-wrap gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">
                    Status
                  </label>
                  <div className="flex gap-2">
                    {(['all', 'upcoming', 'completed'] as const).map((f) => (
                      <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${ filter === f ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:bg-slate-700' }`}
                      >
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">
                    Category
                  </label>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="px-3 py-1.5 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat === 'all' ? 'All Categories' : cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Events List */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Tax Events & Deadlines
                </h2>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-slate-700">
                {filteredEvents.length === 0 ? (
                  <div className="p-8 text-center text-gray-500 dark:text-slate-400">
                    No events match your filters.
                  </div>
                ) : (
                  filteredEvents.map((event) => (
                    <div
                      key={event.id}
                      className={`p-4 border-l-4 ${priorityColors[event.priority]} ${
                        event.isCompleted ? 'opacity-60' : ''
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0">
                          <input
                            type="checkbox"
                            checked={event.isCompleted}
                            readOnly
                            className="w-5 h-5 rounded border-gray-300 dark:border-slate-600 text-amber-500 focus:ring-amber-500"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${eventTypeColors[event.type].bg} ${eventTypeColors[event.type].text}`}
                            >
                              {event.type}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-slate-400">
                              {event.category}
                            </span>
                          </div>
                          <h3
                            className={`font-medium ${event.isCompleted ? 'line-through text-gray-400' : 'text-gray-900 dark:text-white'}`}
                          >
                            {event.title}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
                            {event.description}
                          </p>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {formatDate(event.date)}
                          </div>
                          <div
                            className={`text-xs ${ getDaysUntil(event.date) === 'Past' ? 'text-gray-400' : getDaysUntil(event.date) === 'Today' ? 'text-red-600 font-bold' : 'text-gray-500 dark:text-slate-400' }`}
                          >
                            {getDaysUntil(event.date)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Next Up */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-6">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
                Coming Up Next
              </h3>
              <div className="space-y-4">
                {upcomingEvents.map((event) => (
                  <div key={event.id} className="flex items-center gap-3">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        event.priority === 'critical'
                          ? 'bg-red-500'
                          : event.priority === 'high'
                            ? 'bg-orange-500'
                            : 'bg-blue-500'
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {event.title}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-slate-400">
                        {getDaysUntil(event.date)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-6">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
                Event Types
              </h3>
              <div className="space-y-3">
                {Object.entries(eventTypeColors).map(([type, colors]) => (
                  <div key={type} className="flex items-center gap-2">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${colors.bg} ${colors.text}`}
                    >
                      {type}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Priority Legend */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-6">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
                Priority Levels
              </h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span className="text-sm text-gray-600 dark:text-slate-300">Critical</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-orange-500" />
                  <span className="text-sm text-gray-600 dark:text-slate-300">High</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-sm text-gray-600 dark:text-slate-300">Medium</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-gray-400" />
                  <span className="text-sm text-gray-600 dark:text-slate-300">Low</span>
                </div>
              </div>
            </div>

            {/* Add Reminder */}
            <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl p-6 text-white">
              <h3 className="text-base font-semibold mb-2">
                Never Miss a Deadline
              </h3>
              <p className="text-sm text-amber-100 mb-4">
                Get reminders via email or push notification before important
                tax dates.
              </p>
              <button className="w-full px-4 py-2 bg-white hover:bg-white dark:bg-slate-800/30 rounded-lg text-sm font-medium transition-colors">
                Set Up Reminders
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
