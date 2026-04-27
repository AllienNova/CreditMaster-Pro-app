"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

const DISMISS_KEY = "fynvita_low_credit_dismissed";
const DISMISS_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

export default function LowCreditBanner() {
  const [visible, setVisible] = useState(false);
  const [remaining, setRemaining] = useState(0);

  const checkCredits = useCallback(async () => {
    // Check if dismissed recently
    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (dismissed) {
      const dismissedAt = parseInt(dismissed, 10);
      if (Date.now() - dismissedAt < DISMISS_DURATION_MS) return;
    }

    try {
      const res = await fetch("/api/credits/balance");
      if (!res.ok) return;
      const data = await res.json();

      const totalAllowance =
        data.subscriptionAllowance + data.purchasedCredits;
      const remainingCredits = data.creditBalance;
      const remainingPercent =
        totalAllowance > 0 ? (remainingCredits / totalAllowance) * 100 : 100;

      if (remainingPercent < 20) {
        setRemaining(remainingCredits);
        setVisible(true);
      }
    } catch {
      // Non-critical — fail silently
    }
  }, []);

  useEffect(() => {
    checkCredits();
  }, [checkCredits]);

  const handleDismiss = () => {
    setVisible(false);
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
  };

  if (!visible) return null;

  return (
    <div className="bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <svg
            className="w-5 h-5 text-amber-500 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
            />
          </svg>
          <p className="text-sm text-amber-800 dark:text-amber-200 truncate">
            You&apos;re running low on credits ({remaining.toLocaleString()}{" "}
            remaining).{" "}
            <Link
              href="/settings/credits"
              className="font-semibold underline hover:no-underline"
            >
              Buy more
            </Link>
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 flex-shrink-0"
          aria-label="Dismiss low credit warning"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
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
  );
}
