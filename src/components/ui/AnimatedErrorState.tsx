"use client";

import { useState } from "react";
import { FadeIn } from "@/components/ui/animations/FadeIn";
import { Button } from "@/components/ui/Button";

export interface AnimatedErrorStateProps {
  variant:
    | "network-error"
    | "server-error"
    | "not-found"
    | "timeout"
    | "generic";
  title: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

function NetworkErrorIllustration() {
  return (
    <svg
      width="120"
      height="120"
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <style>{`
        @keyframes disconnect {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.2; }
        }
        .line-1 { animation: disconnect 1.8s ease-in-out 0s infinite; }
        .line-2 { animation: disconnect 1.8s ease-in-out 0.3s infinite; }
        .line-3 { animation: disconnect 1.8s ease-in-out 0.6s infinite; }
        @media (prefers-reduced-motion: reduce) {
          .line-1, .line-2, .line-3 { animation: none; }
        }
      `}</style>
      <circle cx="60" cy="60" r="55" className="fill-blue-50 dark:fill-blue-900/20" />
      {/* Wi-Fi arcs */}
      <path
        d="M30 64 Q60 38 90 64"
        stroke="#3b82f6"
        strokeWidth="5"
        strokeLinecap="round"
        fill="none"
        className="line-3"
      />
      <path
        d="M40 74 Q60 58 80 74"
        stroke="#3b82f6"
        strokeWidth="5"
        strokeLinecap="round"
        fill="none"
        className="line-2"
      />
      <path
        d="M50 84 Q60 76 70 84"
        stroke="#3b82f6"
        strokeWidth="5"
        strokeLinecap="round"
        fill="none"
        className="line-1"
      />
      {/* Dot */}
      <circle cx="60" cy="90" r="4" fill="#3b82f6" />
      {/* X mark */}
      <line x1="76" y1="30" x2="92" y2="46" stroke="#ef4444" strokeWidth="4" strokeLinecap="round" />
      <line x1="92" y1="30" x2="76" y2="46" stroke="#ef4444" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

function ServerErrorIllustration() {
  return (
    <svg
      width="120"
      height="120"
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <style>{`
        @keyframes pulse-warning {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.08); }
        }
        .warning-pulse {
          transform-origin: 83px 35px;
          animation: pulse-warning 2s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .warning-pulse { animation: none; }
        }
      `}</style>
      <circle cx="60" cy="60" r="55" className="fill-red-50 dark:fill-red-900/20" />
      {/* Server body */}
      <rect x="30" y="38" width="52" height="14" rx="4" fill="#fca5a5" stroke="#ef4444" strokeWidth="2" className="dark:[fill:#7f1d1d] dark:[stroke:#ef4444]" />
      <rect x="30" y="58" width="52" height="14" rx="4" fill="#fca5a5" stroke="#ef4444" strokeWidth="2" className="dark:[fill:#7f1d1d] dark:[stroke:#ef4444]" />
      <rect x="30" y="78" width="52" height="14" rx="4" fill="#fca5a5" stroke="#ef4444" strokeWidth="2" className="dark:[fill:#7f1d1d] dark:[stroke:#ef4444]" />
      {/* Server lights */}
      <circle cx="40" cy="45" r="3" fill="#ef4444" />
      <circle cx="40" cy="65" r="3" fill="#f97316" />
      <circle cx="40" cy="85" r="3" fill="#22c55e" />
      {/* Warning triangle */}
      <g className="warning-pulse">
        <path d="M83 22 L96 43 L70 43 Z" fill="#fbbf24" stroke="#f59e0b" strokeWidth="2" />
        <path d="M83 29 L83 37" stroke="#92400e" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="83" cy="41" r="1.5" fill="#92400e" />
      </g>
    </svg>
  );
}

function NotFoundIllustration() {
  return (
    <svg
      width="120"
      height="120"
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <style>{`
        @keyframes sweep {
          0% { transform: rotate(-30deg); }
          50% { transform: rotate(30deg); }
          100% { transform: rotate(-30deg); }
        }
        .glass-handle {
          transform-origin: 52px 52px;
          animation: sweep 2.5s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .glass-handle { animation: none; }
        }
      `}</style>
      <circle cx="60" cy="60" r="55" className="fill-amber-50 dark:fill-amber-900/20" />
      <g className="glass-handle">
        {/* Magnifying glass circle */}
        <circle cx="52" cy="52" r="22" fill="#fef3c7" stroke="#f59e0b" strokeWidth="4" />
        {/* Inner detail */}
        <circle cx="52" cy="52" r="14" fill="none" stroke="#fcd34d" strokeWidth="2" strokeDasharray="4 3" />
        {/* Handle */}
        <line x1="69" y1="69" x2="84" y2="84" stroke="#f59e0b" strokeWidth="6" strokeLinecap="round" />
      </g>
      {/* Question mark inside */}
      <text x="47" y="57" fontSize="18" fontWeight="700" fill="#d97706" textAnchor="middle">?</text>
    </svg>
  );
}

function TimeoutIllustration() {
  return (
    <svg
      width="120"
      height="120"
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <style>{`
        @keyframes spin-hands {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .clock-minute {
          transform-origin: 60px 60px;
          animation: spin-hands 3s linear infinite;
        }
        .clock-hour {
          transform-origin: 60px 60px;
          animation: spin-hands 12s linear infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .clock-minute, .clock-hour { animation: none; }
        }
      `}</style>
      <circle cx="60" cy="60" r="55" className="fill-purple-50 dark:fill-purple-900/20" />
      {/* Clock face */}
      <circle cx="60" cy="60" r="36" fill="#ede9fe" stroke="#a855f7" strokeWidth="4" />
      {/* Tick marks */}
      <line x1="60" y1="28" x2="60" y2="34" stroke="#a855f7" strokeWidth="3" strokeLinecap="round" />
      <line x1="60" y1="86" x2="60" y2="92" stroke="#a855f7" strokeWidth="3" strokeLinecap="round" />
      <line x1="28" y1="60" x2="34" y2="60" stroke="#a855f7" strokeWidth="3" strokeLinecap="round" />
      <line x1="86" y1="60" x2="92" y2="60" stroke="#a855f7" strokeWidth="3" strokeLinecap="round" />
      {/* Hour hand */}
      <g className="clock-hour">
        <line x1="60" y1="60" x2="60" y2="44" stroke="#7c3aed" strokeWidth="4" strokeLinecap="round" />
      </g>
      {/* Minute hand */}
      <g className="clock-minute">
        <line x1="60" y1="60" x2="60" y2="38" stroke="#a855f7" strokeWidth="3" strokeLinecap="round" />
      </g>
      {/* Center dot */}
      <circle cx="60" cy="60" r="4" fill="#7c3aed" />
    </svg>
  );
}

function GenericErrorIllustration() {
  return (
    <svg
      width="120"
      height="120"
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <style>{`
        @keyframes gentle-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        .pulse-ring {
          animation: gentle-pulse 2s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .pulse-ring { animation: none; }
        }
      `}</style>
      <circle cx="60" cy="60" r="55" className="fill-red-50 dark:fill-red-900/20" />
      <circle cx="60" cy="60" r="44" fill="none" stroke="#fca5a5" strokeWidth="3" className="pulse-ring" />
      <circle cx="60" cy="60" r="32" fill="#fee2e2" stroke="#ef4444" strokeWidth="4" />
      {/* Exclamation */}
      <line x1="60" y1="42" x2="60" y2="64" stroke="#ef4444" strokeWidth="5" strokeLinecap="round" />
      <circle cx="60" cy="74" r="3.5" fill="#ef4444" />
    </svg>
  );
}

function getIllustration(variant: AnimatedErrorStateProps["variant"]) {
  switch (variant) {
    case "network-error":
      return <NetworkErrorIllustration />;
    case "server-error":
      return <ServerErrorIllustration />;
    case "not-found":
      return <NotFoundIllustration />;
    case "timeout":
      return <TimeoutIllustration />;
    case "generic":
      return <GenericErrorIllustration />;
  }
}

export function AnimatedErrorState({
  variant,
  title,
  description,
  onRetry,
  retryLabel = "Try again",
  className = "",
}: AnimatedErrorStateProps) {
  const [retrying, setRetrying] = useState(false);

  const handleRetry = async () => {
    if (!onRetry || retrying) return;
    setRetrying(true);
    try {
      await Promise.resolve(onRetry());
    } finally {
      setRetrying(false);
    }
  };

  return (
    <FadeIn className={`text-center py-12 px-4 ${className}`}>
      <div className="flex justify-center mb-6">{getIllustration(variant)}</div>

      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        {title}
      </h3>

      {description && (
        <p className="text-gray-500 dark:text-slate-400 mb-6 max-w-sm mx-auto">
          {description}
        </p>
      )}

      {onRetry && (
        <Button
          onClick={handleRetry}
          isLoading={retrying}
          variant="primary"
          size="md"
        >
          {retryLabel}
        </Button>
      )}
    </FadeIn>
  );
}

export default AnimatedErrorState;
