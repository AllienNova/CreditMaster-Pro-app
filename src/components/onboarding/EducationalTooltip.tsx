/**
 * Educational Tooltip Component (Web)
 *
 * Displays contextual help and educational content with portal-based rendering
 */

"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { InformationCircleIcon } from "@heroicons/react/24/outline";

export interface EducationalTooltipProps {
  title: string;
  content: string;
  learnMoreUrl?: string;
  position?: "top" | "bottom" | "left" | "right";
  children?: React.ReactNode;
  className?: string;
}

export function EducationalTooltip({
  title,
  content,
  learnMoreUrl,
  position = "top",
  children,
  className = "",
}: EducationalTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Calculate tooltip position
  useEffect(() => {
    if (isOpen && triggerRef.current && tooltipRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();

      let top = 0;
      let left = 0;

      switch (position) {
        case "top":
          top = triggerRect.top - tooltipRect.height - 8;
          left =
            triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
          break;
        case "bottom":
          top = triggerRect.bottom + 8;
          left =
            triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
          break;
        case "left":
          top =
            triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
          left = triggerRect.left - tooltipRect.width - 8;
          break;
        case "right":
          top =
            triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
          left = triggerRect.right + 8;
          break;
      }

      // Keep tooltip within viewport
      const padding = 16;
      top = Math.max(
        padding,
        Math.min(top, window.innerHeight - tooltipRect.height - padding),
      );
      left = Math.max(
        padding,
        Math.min(left, window.innerWidth - tooltipRect.width - padding),
      );

      setTooltipPosition({ top, left });
    }
  }, [isOpen, position]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen]);

  const tooltipContent = (
    <div
      ref={tooltipRef}
      className="fixed z-50 w-80 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-gray-200 dark:border-slate-700 p-4"
      style={{
        top: `${tooltipPosition.top}px`,
        left: `${tooltipPosition.left}px`,
        opacity: tooltipPosition.top === 0 ? 0 : 1,
      }}
      role="tooltip"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <InformationCircleIcon className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
            {title}
          </h4>
          <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
            {content}
          </p>
          {learnMoreUrl && (
            <a
              href={learnMoreUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center mt-3 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Learn more
              <svg
                className="w-4 h-4 ml-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </a>
          )}
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="text-gray-400 hover:text-gray-600 dark:text-slate-300 dark:hover:text-gray-200"
          aria-label="Close tooltip"
        >
          <svg
            className="w-5 h-5"
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
  );

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center justify-center text-gray-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors ${className}`}
        aria-label={`Help: ${title}`}
        aria-expanded={isOpen}
      >
        {children || <InformationCircleIcon className="w-5 h-5" />}
      </button>

      {isOpen &&
        typeof window !== "undefined" &&
        createPortal(
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
              aria-hidden="true"
            />
            {/* Tooltip */}
            {tooltipContent}
          </>,
          document.body,
        )}
    </>
  );
}
