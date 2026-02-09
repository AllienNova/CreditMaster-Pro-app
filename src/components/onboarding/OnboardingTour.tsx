'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

export interface TourStep {
  target: string; // CSS selector
  title: string;
  content: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  action?: () => void;
  disableBeacon?: boolean;
}

interface OnboardingTourProps {
  steps: TourStep[];
  isOpen: boolean;
  onComplete: () => void;
  onSkip: () => void;
  showProgress?: boolean;
  showSkipButton?: boolean;
}

export default function OnboardingTour({
  steps,
  isOpen,
  onComplete,
  onSkip,
  showProgress = true,
  showSkipButton = true,
}: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const calculatePosition = useCallback((element: HTMLElement, placement: string = 'bottom') => {
    const rect = element.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

    let top = 0;
    let left = 0;

    switch (placement) {
      case 'top':
        top = rect.top + scrollTop - 20;
        left = rect.left + scrollLeft + rect.width / 2;
        break;
      case 'bottom':
        top = rect.bottom + scrollTop + 20;
        left = rect.left + scrollLeft + rect.width / 2;
        break;
      case 'left':
        top = rect.top + scrollTop + rect.height / 2;
        left = rect.left + scrollLeft - 20;
        break;
      case 'right':
        top = rect.top + scrollTop + rect.height / 2;
        left = rect.right + scrollLeft + 20;
        break;
      default:
        top = rect.bottom + scrollTop + 20;
        left = rect.left + scrollLeft + rect.width / 2;
    }

    return { top, left };
  }, []);

  useEffect(() => {
    if (!isOpen || !mounted) return;

    const step = steps[currentStep];
    if (!step) return;

    // Find target element
    const element = document.querySelector(step.target) as HTMLElement;
    if (element) {
      setTargetElement(element);
      
      // Scroll element into view
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Calculate tooltip position
      setTimeout(() => {
        const position = calculatePosition(element, step.placement);
        setTooltipPosition(position);
      }, 300);

      // Execute step action if provided
      if (step.action) {
        step.action();
      }
    }
  }, [currentStep, isOpen, steps, calculatePosition, mounted]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    onSkip();
  };

  if (!isOpen || !mounted || !targetElement) return null;

  const step = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  return createPortal(
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-[9998]">
        {/* Dark overlay with hole for target element */}
        <div className="absolute inset-0 bg-black/50" />
        
        {/* Highlight target element */}
        {targetElement && (
          <div
            className="absolute border-4 border-blue-500 rounded-lg shadow-xl pointer-events-none animate-pulse"
            style={{
              top: targetElement.getBoundingClientRect().top + window.pageYOffset - 8,
              left: targetElement.getBoundingClientRect().left + window.pageXOffset - 8,
              width: targetElement.offsetWidth + 16,
              height: targetElement.offsetHeight + 16,
              boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
            }}
          />
        )}
      </div>

      {/* Tooltip */}
      <div
        className="fixed z-[9999] bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 max-w-md animate-in fade-in zoom-in duration-300"
        style={{
          top: tooltipPosition.top,
          left: tooltipPosition.left,
          transform: step.placement === 'left' || step.placement === 'right' 
            ? 'translateY(-50%)' 
            : 'translateX(-50%)',
        }}
      >
        {/* Progress bar */}
        {showProgress && (
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-medium text-gray-600 dark:text-slate-300">
                Step {currentStep + 1} of {steps.length}
              </span>
              <span className="text-xs text-gray-500 dark:text-slate-400">{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-blue-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Content */}
        <div className="mb-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{step.title}</h3>
          <p className="text-gray-600 dark:text-slate-300 leading-relaxed">{step.content}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex gap-2">
            {currentStep > 0 && (
              <button
                onClick={handlePrevious}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-slate-200 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-slate-700 transition-colors"
              >
                Previous
              </button>
            )}
          </div>

          <div className="flex gap-2">
            {showSkipButton && (
              <button
                onClick={handleSkip}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 dark:text-slate-100 transition-colors"
              >
                Skip Tour
              </button>
            )}
            <button
              onClick={handleNext}
              className="px-6 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-600 rounded-lg hover:from-blue-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl"
            >
              {currentStep < steps.length - 1 ? 'Next' : 'Finish'}
            </button>
          </div>
        </div>

        {/* Arrow indicator */}
        <div
          className={`absolute w-4 h-4 bg-white dark:bg-slate-800 transform rotate-45 ${
            step.placement === 'top' ? 'bottom-[-8px] left-1/2 -translate-x-1/2' :
            step.placement === 'bottom' ? 'top-[-8px] left-1/2 -translate-x-1/2' :
            step.placement === 'left' ? 'right-[-8px] top-1/2 -translate-y-1/2' :
            'left-[-8px] top-1/2 -translate-y-1/2'
          }`}
        />
      </div>
    </>,
    document.body
  );
}

