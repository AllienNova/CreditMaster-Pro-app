"use client";

/**
 * Empty State Component
 *
 * A reusable empty state component with illustration and call-to-action
 */

import React from "react";

type IllustrationType =
  | "no-data"
  | "no-subscriptions"
  | "no-rules"
  | "no-transactions"
  | "no-spending"
  | "search-empty"
  | "error";

interface EmptyStateProps {
  type?: IllustrationType;
  title: string;
  description: string;
  primaryAction?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  className?: string;
}

function Illustration({ type }: { type: IllustrationType }) {
  const baseClasses = "w-24 h-24 mx-auto mb-6";

  switch (type) {
    case "no-subscriptions":
      return (
        <div className={baseClasses}>
          <svg
            viewBox="0 0 96 96"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle
              cx="48"
              cy="48"
              r="44"
              className="fill-emerald-50 dark:fill-emerald-900/20"
            />
            <rect
              x="24"
              y="32"
              width="48"
              height="32"
              rx="4"
              className="fill-emerald-100 dark:fill-emerald-800/40 stroke-emerald-500"
              strokeWidth="2"
            />
            <line
              x1="24"
              y1="44"
              x2="72"
              y2="44"
              className="stroke-emerald-500"
              strokeWidth="2"
            />
            <circle cx="32" cy="52" r="4" className="fill-emerald-500" />
            <rect
              x="40"
              y="50"
              width="24"
              height="4"
              rx="2"
              className="fill-emerald-300 dark:fill-emerald-600"
            />
          </svg>
        </div>
      );

    case "no-rules":
      return (
        <div className={baseClasses}>
          <svg
            viewBox="0 0 96 96"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle
              cx="48"
              cy="48"
              r="44"
              className="fill-blue-50 dark:fill-blue-900/20"
            />
            <path
              d="M30 36h36M30 48h24M30 60h28"
              className="stroke-blue-500"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <circle
              cx="64"
              cy="60"
              r="8"
              className="fill-blue-100 dark:fill-blue-800/40 stroke-blue-500"
              strokeWidth="2"
            />
            <path
              d="M62 60l2 2 4-4"
              className="stroke-blue-500"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      );

    case "no-transactions":
    case "no-spending":
      return (
        <div className={baseClasses}>
          <svg
            viewBox="0 0 96 96"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle
              cx="48"
              cy="48"
              r="44"
              className="fill-purple-50 dark:fill-purple-900/20"
            />
            <rect
              x="28"
              y="28"
              width="40"
              height="40"
              rx="4"
              className="fill-purple-100 dark:fill-purple-800/40 stroke-purple-500"
              strokeWidth="2"
            />
            <path
              d="M38 48l6 6 14-14"
              className="stroke-purple-500"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      );

    case "search-empty":
      return (
        <div className={baseClasses}>
          <svg
            viewBox="0 0 96 96"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle
              cx="48"
              cy="48"
              r="44"
              className="fill-amber-50 dark:fill-amber-900/20"
            />
            <circle
              cx="42"
              cy="42"
              r="16"
              className="fill-amber-100 dark:fill-amber-800/40 stroke-amber-500"
              strokeWidth="2"
            />
            <line
              x1="54"
              y1="54"
              x2="66"
              y2="66"
              className="stroke-amber-500"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <path
              d="M38 42h8M42 38v8"
              className="stroke-amber-400"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>
      );

    case "error":
      return (
        <div className={baseClasses}>
          <svg
            viewBox="0 0 96 96"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle
              cx="48"
              cy="48"
              r="44"
              className="fill-red-50 dark:fill-red-900/20"
            />
            <circle
              cx="48"
              cy="48"
              r="20"
              className="fill-red-100 dark:fill-red-800/40 stroke-red-500"
              strokeWidth="2"
            />
            <path
              d="M48 40v12M48 56h.01"
              className="stroke-red-500"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
        </div>
      );

    default:
      return (
        <div className={baseClasses}>
          <svg
            viewBox="0 0 96 96"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle
              cx="48"
              cy="48"
              r="44"
              className="fill-gray-100 dark:fill-gray-800"
            />
            <rect
              x="28"
              y="36"
              width="40"
              height="24"
              rx="4"
              className="fill-gray-200 dark:fill-gray-700"
            />
            <circle
              cx="48"
              cy="48"
              r="8"
              className="fill-gray-300 dark:fill-gray-600"
            />
          </svg>
        </div>
      );
  }
}

export function EmptyState({
  type = "no-data",
  title,
  description,
  primaryAction,
  secondaryAction,
  className = "",
}: EmptyStateProps) {
  return (
    <div className={`text-center py-12 px-4 ${className}`}>
      <Illustration type={type} />

      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        {title}
      </h3>

      <p className="text-gray-500 dark:text-slate-400 mb-6 max-w-sm mx-auto">
        {description}
      </p>

      {(primaryAction || secondaryAction) && (
        <div className="flex justify-center gap-3 flex-wrap">
          {primaryAction && (
            <button
              onClick={primaryAction.onClick}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              {primaryAction.icon && (
                <span aria-hidden="true">{primaryAction.icon}</span>
              )}
              {primaryAction.label}
            </button>
          )}
          {secondaryAction && (
            <button
              onClick={secondaryAction.onClick}
              className="px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-2"
            >
              {secondaryAction.icon && (
                <span aria-hidden="true">{secondaryAction.icon}</span>
              )}
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default EmptyState;
