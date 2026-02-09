"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useOnboardingProgress } from "@/hooks/useOnboardingProgress";
import { ClockIcon, CheckCircleIcon } from "@heroicons/react/24/outline";

const steps = [
  { path: "/onboarding", label: "Welcome", step: 1, timeEstimate: "30 sec" },
  { path: "/onboarding/profile", label: "Profile", step: 2, timeEstimate: "2 min" },
  { path: "/onboarding/goals", label: "Goals", step: 3, timeEstimate: "1 min" },
  { path: "/onboarding/connect", label: "Connect", step: 4, timeEstimate: "1 min" },
  { path: "/onboarding/complete", label: "Complete", step: 5, timeEstimate: "30 sec" },
];

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { progress, saving } = useOnboardingProgress();
  const currentStep = steps.find((s) => s.path === pathname)?.step || 1;
  const currentStepInfo = steps.find((s) => s.step === currentStep);

  // Calculate progress percentage
  const progressPercentage = ((currentStep - 1) / (steps.length - 1)) * 100;

  // Calculate total time remaining
  const remainingSteps = steps.slice(currentStep);
  const totalMinutes = remainingSteps.reduce((acc, step) => {
    const minutes = step.timeEstimate.includes('min')
      ? parseInt(step.timeEstimate)
      : step.timeEstimate.includes('sec')
        ? 0.5
        : 0;
    return acc + minutes;
  }, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-slate-700">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 text-2xl font-bold">
              <span className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-blue-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">F</span>
              <span className="bg-gradient-to-r from-emerald-500 to-blue-500 bg-clip-text text-transparent">Fynvita</span>
            </Link>
            <div className="flex items-center gap-4">
              {saving && (
                <span className="text-xs text-gray-500 dark:text-slate-400 flex items-center gap-1">
                  <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Saving...
                </span>
              )}
              <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-slate-200 dark:text-slate-200">
                Skip for now →
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Enhanced Progress Bar */}
      <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
        <div className="max-w-4xl mx-auto px-4 py-6">
          {/* Progress Info */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                Step {currentStep} of {steps.length}: {currentStepInfo?.label}
              </h2>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                {currentStepInfo?.timeEstimate} to complete this step
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-300">
              <ClockIcon className="w-4 h-4" />
              <span className="text-xs">
                ~{Math.ceil(totalMinutes)} min remaining
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="relative h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden mb-4">
            <div
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-emerald-500 to-blue-500 transition-all duration-500 ease-out"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>

          {/* Step Indicators */}
          <div className="flex items-center justify-between mb-2">
            {steps.map((step, i) => (
              <div key={step.path} className="flex items-center">
                <div className="relative group">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                    step.step < currentStep ? "bg-emerald-500 text-white" :
                    step.step === currentStep ? "bg-emerald-500 text-white ring-4 ring-emerald-100 scale-110" :
                    "bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-slate-400"
                  }`}>
                    {step.step < currentStep ? (
                      <CheckCircleIcon className="w-5 h-5" />
                    ) : (
                      step.step
                    )}
                  </div>

                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    {step.label} ({step.timeEstimate})
                  </div>
                </div>
                {i < steps.length - 1 && (
                  <div className={`w-16 md:w-24 h-1 mx-2 transition-all ${
                    step.step < currentStep ? "bg-emerald-500" : "bg-gray-200 dark:bg-slate-700"
                  }`} />
                )}
              </div>
            ))}
          </div>

          {/* Step Labels */}
          <div className="flex justify-between text-xs text-gray-500 dark:text-slate-400">
            {steps.map((step) => (
              <span
                key={step.path}
                className={`transition-colors ${
                  step.step === currentStep ? "text-emerald-600 font-medium" :
                  step.step < currentStep ? "text-emerald-500" : ""
                }`}
              >
                {step.label}
              </span>
            ))}
          </div>

          {/* Completed Steps Counter */}
          {progress.completed_steps.length > 0 && (
            <div className="mt-4 flex items-center gap-2 text-xs text-emerald-600">
              <CheckCircleIcon className="w-4 h-4" />
              <span>
                {progress.completed_steps.length} of {steps.length} steps completed
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        {children}
      </main>
    </div>
  );
}

