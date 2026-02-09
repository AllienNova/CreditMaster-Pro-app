'use client';

import { useState, useRef, useEffect, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { InformationCircleIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline';

interface TooltipProps {
  content: string | ReactNode;
  children: ReactNode;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  maxWidth?: string;
}

export default function Tooltip({
  content,
  children,
  placement = 'top',
  delay = 200,
  maxWidth = '300px',
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    setMounted(true);
  }, []);

  const calculatePosition = () => {
    if (!triggerRef.current) return;

    const rect = triggerRef.current.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

    let top = 0;
    let left = 0;

    switch (placement) {
      case 'top':
        top = rect.top + scrollTop - 10;
        left = rect.left + scrollLeft + rect.width / 2;
        break;
      case 'bottom':
        top = rect.bottom + scrollTop + 10;
        left = rect.left + scrollLeft + rect.width / 2;
        break;
      case 'left':
        top = rect.top + scrollTop + rect.height / 2;
        left = rect.left + scrollLeft - 10;
        break;
      case 'right':
        top = rect.top + scrollTop + rect.height / 2;
        left = rect.right + scrollLeft + 10;
        break;
    }

    setPosition({ top, left });
  };

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      calculatePosition();
      setIsVisible(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="inline-block"
      >
        {children}
      </div>

      {mounted &&
        isVisible &&
        createPortal(
          <div
            className="fixed z-[10000] animate-in fade-in zoom-in duration-200"
            style={{
              top: position.top,
              left: position.left,
              transform:
                placement === 'left' || placement === 'right'
                  ? 'translateY(-50%)'
                  : 'translateX(-50%)',
              maxWidth,
            }}
          >
            <div className="bg-gray-900 text-white text-sm rounded-lg px-3 py-2 shadow-xl">
              {content}
              {/* Arrow */}
              <div
                className={`absolute w-2 h-2 bg-gray-900 transform rotate-45 ${
                  placement === 'top'
                    ? 'bottom-[-4px] left-1/2 -translate-x-1/2'
                    : placement === 'bottom'
                    ? 'top-[-4px] left-1/2 -translate-x-1/2'
                    : placement === 'left'
                    ? 'right-[-4px] top-1/2 -translate-y-1/2'
                    : 'left-[-4px] top-1/2 -translate-y-1/2'
                }`}
              />
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

// Info tooltip with icon
export function InfoTooltip({
  content,
  placement = 'top',
}: {
  content: string | ReactNode;
  placement?: 'top' | 'bottom' | 'left' | 'right';
}) {
  return (
    <Tooltip content={content} placement={placement}>
      <InformationCircleIcon className="w-5 h-5 text-blue-500 hover:text-blue-600 cursor-help inline-block" />
    </Tooltip>
  );
}

// Help tooltip with icon
export function HelpTooltip({
  content,
  placement = 'top',
}: {
  content: string | ReactNode;
  placement?: 'top' | 'bottom' | 'left' | 'right';
}) {
  return (
    <Tooltip content={content} placement={placement}>
      <QuestionMarkCircleIcon className="w-5 h-5 text-gray-400 hover:text-gray-600 dark:text-slate-300 cursor-help inline-block" />
    </Tooltip>
  );
}

// Contextual help component
export function ContextualHelp({
  title,
  content,
  learnMoreUrl,
}: {
  title: string;
  content: string;
  learnMoreUrl?: string;
}) {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
      <div className="flex items-start space-x-3">
        <InformationCircleIcon className="w-6 h-6 text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-blue-900 mb-1">{title}</h4>
          <p className="text-sm text-blue-800 leading-relaxed">{content}</p>
          {learnMoreUrl && (
            <a
              href={learnMoreUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-blue-600 hover:text-blue-700 mt-2 inline-block"
            >
              Learn more →
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// Inline help text
export function InlineHelp({ children }: { children: ReactNode }) {
  return (
    <p className="text-sm text-gray-500 dark:text-slate-400 mt-1 flex items-start space-x-1">
      <InformationCircleIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
      <span>{children}</span>
    </p>
  );
}

// Field label with tooltip
export function LabelWithTooltip({
  label,
  tooltip,
  required,
}: {
  label: string;
  tooltip: string;
  required?: boolean;
}) {
  return (
    <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">
      {label}
      {required && <span className="text-red-500 ml-1">*</span>}
      <Tooltip content={tooltip} placement="right">
        <InformationCircleIcon className="w-4 h-4 text-gray-400 hover:text-gray-600 dark:text-slate-300 cursor-help inline-block ml-1" />
      </Tooltip>
    </label>
  );
}
