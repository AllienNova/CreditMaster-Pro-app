'use client';

/**
 * Calendar Component
 *
 * A date picker calendar with support for date ranges, events,
 * and bill due date highlighting.
 */

import { useState, useMemo } from 'react';

export interface CalendarEvent {
  date: Date;
  title: string;
  color?: string;
  type?: 'bill' | 'income' | 'reminder' | 'custom';
}

export interface CalendarProps {
  selectedDate?: Date;
  onDateSelect?: (date: Date) => void;
  events?: CalendarEvent[];
  minDate?: Date;
  maxDate?: Date;
  highlightToday?: boolean;
  showEventDots?: boolean;
  className?: string;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const eventColors: Record<string, string> = {
  bill: 'bg-red-500',
  income: 'bg-green-500',
  reminder: 'bg-yellow-500',
  custom: 'bg-blue-500',
};

export default function Calendar({
  selectedDate,
  onDateSelect,
  events = [],
  minDate,
  maxDate,
  highlightToday = true,
  showEventDots = true,
  className = '',
}: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const date = selectedDate || new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1);
  });

  const today = useMemo(() => new Date(), []);

  // Get days in month
  const daysInMonth = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: (Date | null)[] = [];

    // Add empty slots for days before the first day of the month
    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  }, [currentMonth]);

  // Create event map for quick lookup
  const eventMap = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    events.forEach((event) => {
      const key = event.date.toDateString();
      const existing = map.get(key) || [];
      map.set(key, [...existing, event]);
    });
    return map;
  }, [events]);

  const goToPreviousMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
    );
  };

  const goToNextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    );
  };

  const goToToday = () => {
    setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    onDateSelect?.(today);
  };

  const isDateDisabled = (date: Date): boolean => {
    if (minDate && date < minDate) return true;
    if (maxDate && date > maxDate) return true;
    return false;
  };

  const isToday = (date: Date): boolean => {
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (date: Date): boolean => {
    return selectedDate?.toDateString() === date.toDateString();
  };

  const getEventsForDate = (date: Date): CalendarEvent[] => {
    return eventMap.get(date.toDateString()) || [];
  };

  return (
    <div
      className={`bg-white dark:bg-slate-800 rounded-lg shadow p-4 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={goToPreviousMonth}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-400"
          aria-label="Previous month"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>

        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </h2>
          <button
            type="button"
            onClick={goToToday}
            className="text-xs px-2 py-1 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50"
          >
            Today
          </button>
        </div>

        <button
          type="button"
          onClick={goToNextMonth}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-400"
          aria-label="Next month"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {DAYS.map((day) => (
          <div
            key={day}
            className="text-center text-xs font-medium text-gray-500 dark:text-slate-400 py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {daysInMonth.map((date, index) => {
          if (!date) {
            return <div key={`empty-${index}`} className="aspect-square" />;
          }

          const disabled = isDateDisabled(date);
          const todayDate = highlightToday && isToday(date);
          const selected = isSelected(date);
          const dateEvents = getEventsForDate(date);

          return (
            <button
              key={date.toISOString()}
              type="button"
              onClick={() => !disabled && onDateSelect?.(date)}
              disabled={disabled}
              className={`aspect-square p-1 rounded-lg text-sm font-medium relative transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${disabled ? 'text-gray-300 cursor-not-allowed' : 'hover:bg-gray-100 dark:hover:bg-slate-700'} ${todayDate && !selected ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600' : ''} ${selected ? 'bg-blue-600 text-white hover:bg-blue-700' : 'text-gray-900 dark:text-white'}`}
            >
              <span>{date.getDate()}</span>
              {/* Event dots */}
              {showEventDots && dateEvents.length > 0 && (
                <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 flex gap-0.5">
                  {dateEvents.slice(0, 3).map((event, i) => (
                    <span
                      key={i}
                      className={`w-1 h-1 rounded-full ${event.color || eventColors[event.type || 'custom']}`}
                      title={event.title}
                    />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Event legend */}
      {events.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700">
          <div className="flex flex-wrap gap-3 text-xs">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-gray-600 dark:text-slate-400">Bills</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-gray-600 dark:text-slate-400">Income</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-yellow-500" />
              <span className="text-gray-600 dark:text-slate-400">
                Reminders
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
