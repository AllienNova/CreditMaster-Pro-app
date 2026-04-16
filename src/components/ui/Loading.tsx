"use client";

/**
 * Loading Components
 *
 * Provides various loading state indicators including spinners,
 * skeletons, and full-page loaders.
 */

import { ReactNode } from "react";

interface SpinnerProps {
  size?: "sm" | "md" | "lg" | "xl";
  color?: "blue" | "white" | "gray";
  className?: string;
}

const sizeClasses = {
  sm: "w-4 h-4",
  md: "w-6 h-6",
  lg: "w-8 h-8",
  xl: "w-12 h-12",
};

const colorClasses = {
  blue: "text-blue-600",
  white: "text-white",
  gray: "text-gray-400 dark:text-slate-500",
};

export function Spinner({
  size = "md",
  color = "blue",
  className = "",
}: SpinnerProps) {
  return (
    <svg
      className={`animate-spin ${sizeClasses[size]} ${colorClasses[color]} ${className}`}
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

interface SkeletonProps {
  className?: string;
  animate?: boolean;
}

export function Skeleton({ className = "", animate = true }: SkeletonProps) {
  return (
    <div
      className={`bg-gray-200 dark:bg-slate-700 rounded ${animate ? "animate-pulse" : ""} ${className}`}
    />
  );
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-4 ${i === lines - 1 ? "w-3/4" : "w-full"}`}
        />
      ))}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6 space-y-4">
      <div className="flex items-center space-x-4">
        <Skeleton className="w-12 h-12 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-1/4" />
        </div>
      </div>
      <SkeletonText lines={3} />
      <div className="flex space-x-2">
        <Skeleton className="h-8 w-20 rounded-lg" />
        <Skeleton className="h-8 w-20 rounded-lg" />
      </div>
    </div>
  );
}

interface LoadingOverlayProps {
  message?: string;
  children?: ReactNode;
}

export function LoadingOverlay({
  message = "Loading...",
}: LoadingOverlayProps) {
  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
      role="alert"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="bg-white dark:bg-slate-800 rounded-xl p-8 shadow-xl flex flex-col items-center space-y-4">
        <Spinner size="xl" />
        <p className="text-gray-600 dark:text-slate-300 font-medium">
          {message}
        </p>
      </div>
    </div>
  );
}

export function LoadingPage({
  message = "Loading...",
  submessage,
}: {
  message?: string;
  submessage?: string;
}) {
  return (
    <div
      className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900"
      role="alert"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="text-center space-y-4">
        <Spinner size="xl" />
        <p className="text-gray-600 dark:text-slate-300 font-medium">
          {message}
        </p>
        {submessage ? (
          <p className="text-sm text-gray-500 dark:text-slate-400">
            {submessage}
          </p>
        ) : null}
      </div>
    </div>
  );
}

interface LoadingButtonProps {
  loading: boolean;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
  type?: "button" | "submit";
}

export function LoadingButton({
  loading,
  children,
  className = "",
  disabled,
  onClick,
  type = "button",
}: LoadingButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={loading || disabled}
      className={`
        relative inline-flex items-center justify-center
        disabled:opacity-60 disabled:cursor-not-allowed
        transition-all duration-200
        ${className}
      `}
    >
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <Spinner size="sm" color="white" />
        </span>
      )}
      <span className={loading ? "opacity-0" : "opacity-100"}>{children}</span>
    </button>
  );
}

export function ProgressBar({
  progress,
  className = "",
}: {
  progress: number;
  className?: string;
}) {
  return (
    <div
      className={`w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden ${className}`}
      role="progressbar"
      aria-valuenow={Math.round(progress)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full bg-blue-600 dark:bg-blue-500 rounded-full transition-all duration-500 ease-out"
        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
      />
    </div>
  );
}

export default {
  Spinner,
  Skeleton,
  SkeletonText,
  SkeletonCard,
  LoadingOverlay,
  LoadingPage,
  LoadingButton,
  ProgressBar,
};
