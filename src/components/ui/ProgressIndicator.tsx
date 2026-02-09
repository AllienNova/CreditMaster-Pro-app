'use client';

import { CheckIcon } from '@heroicons/react/24/solid';

export interface Step {
  id: string;
  name: string;
  description?: string;
  status: 'complete' | 'current' | 'upcoming';
}

interface ProgressIndicatorProps {
  steps: Step[];
  currentStep: number;
  variant?: 'default' | 'compact' | 'minimal';
  showLabels?: boolean;
  showDescription?: boolean;
}

export default function ProgressIndicator({
  steps,
  currentStep,
  variant = 'default',
  showLabels = true,
  showDescription = false,
}: ProgressIndicatorProps) {
  const progress = ((currentStep + 1) / steps.length) * 100;

  if (variant === 'minimal') {
    return (
      <div className="w-full">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-slate-200">
            Step {currentStep + 1} of {steps.length}
          </span>
          <span className="text-sm text-gray-500 dark:text-slate-400">{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-blue-500 to-blue-500 h-2 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className="w-full">
        <div className="flex items-center justify-between mb-4">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                    index < currentStep
                      ? 'bg-green-500 text-white'
                      : index === currentStep
                      ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                      : 'bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-slate-400'
                  }`}
                >
                  {index < currentStep ? (
                    <CheckIcon className="w-6 h-6" />
                  ) : (
                    index + 1
                  )}
                </div>
                {showLabels && (
                  <span
                    className={`mt-2 text-xs font-medium text-center ${ index <= currentStep ? 'text-gray-900' : 'text-gray-500 dark:text-slate-400' }`}
                  >
                    {step.name}
                  </span>
                )}
              </div>
              {index < steps.length - 1 && (
                <div className="flex-1 h-1 mx-2">
                  <div
                    className={`h-full rounded transition-all duration-500 ${
                      index < currentStep ? 'bg-green-500' : 'bg-gray-200 dark:bg-slate-700'
                    }`}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Default variant
  return (
    <nav aria-label="Progress">
      <ol role="list" className="space-y-4 md:flex md:space-x-8 md:space-y-0">
        {steps.map((step, index) => (
          <li key={step.id} className="md:flex-1">
            {index < currentStep ? (
              <div className="group flex flex-col border-l-4 border-green-600 py-2 pl-4 md:border-l-0 md:border-t-4 md:pb-0 md:pl-0 md:pt-4">
                <span className="text-sm font-medium text-green-600 transition-colors">
                  Step {index + 1}
                </span>
                <span className="text-sm font-semibold">{step.name}</span>
                {showDescription && step.description && (
                  <span className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                    {step.description}
                  </span>
                )}
              </div>
            ) : index === currentStep ? (
              <div
                className="flex flex-col border-l-4 border-blue-600 py-2 pl-4 md:border-l-0 md:border-t-4 md:pb-0 md:pl-0 md:pt-4"
                aria-current="step"
              >
                <span className="text-sm font-medium text-blue-600">
                  Step {index + 1}
                </span>
                <span className="text-sm font-semibold">{step.name}</span>
                {showDescription && step.description && (
                  <span className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                    {step.description}
                  </span>
                )}
              </div>
            ) : (
              <div className="group flex flex-col border-l-4 border-gray-200 dark:border-slate-700 py-2 pl-4 md:border-l-0 md:border-t-4 md:pb-0 md:pl-0 md:pt-4">
                <span className="text-sm font-medium text-gray-500 dark:text-slate-400 transition-colors">
                  Step {index + 1}
                </span>
                <span className="text-sm font-semibold text-gray-500 dark:text-slate-400">
                  {step.name}
                </span>
                {showDescription && step.description && (
                  <span className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                    {step.description}
                  </span>
                )}
              </div>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

// Circular progress indicator for loading states
export function CircularProgress({
  progress,
  size = 120,
  strokeWidth = 8,
  label,
}: {
  progress: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-gray-200"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#gradient)"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-out"
        />
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#8B5CF6" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-gray-900 dark:text-white">
          {Math.round(progress)}%
        </span>
        {label && <span className="text-xs text-gray-500 dark:text-slate-400 mt-1">{label}</span>}
      </div>
    </div>
  );
}

// Step-by-step wizard progress
export function WizardProgress({
  steps,
  currentStep,
  onStepClick,
}: {
  steps: string[];
  currentStep: number;
  onStepClick?: (step: number) => void;
}) {
  return (
    <div className="flex items-center justify-center space-x-2">
      {steps.map((step, index) => (
        <div key={index} className="flex items-center">
          <button
            type="button"
            onClick={() => onStepClick && index <= currentStep && onStepClick(index)}
            disabled={index > currentStep}
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
              index < currentStep
                ? 'bg-green-500 text-white hover:bg-green-600 cursor-pointer'
                : index === currentStep
                ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                : 'bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-slate-400 cursor-not-allowed'
            }`}
            title={step}
          >
            {index < currentStep ? <CheckIcon className="w-5 h-5" /> : index + 1}
          </button>
          {index < steps.length - 1 && (
            <div
              className={`w-12 h-1 mx-1 rounded transition-all duration-500 ${
                index < currentStep ? 'bg-green-500' : 'bg-gray-200 dark:bg-slate-700'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

