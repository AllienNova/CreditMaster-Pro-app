"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

const steps = [
  { path: "/onboarding", label: "Welcome", step: 1 },
  { path: "/onboarding/profile", label: "Profile", step: 2 },
  { path: "/onboarding/goals", label: "Goals", step: 3 },
  { path: "/onboarding/connect", label: "Connect", step: 4 },
  { path: "/onboarding/complete", label: "Complete", step: 5 },
];

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const currentStep = steps.find((s) => s.path === pathname)?.step || 1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-emerald-500 to-blue-500 bg-clip-text text-transparent">
              CreditMaster Pro
            </Link>
            <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">
              Skip for now →
            </Link>
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-2">
            {steps.map((step, i) => (
              <div key={step.path} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step.step < currentStep ? "bg-emerald-500 text-white" :
                  step.step === currentStep ? "bg-emerald-500 text-white ring-4 ring-emerald-100" :
                  "bg-gray-200 text-gray-500"
                }`}>
                  {step.step < currentStep ? "✓" : step.step}
                </div>
                {i < steps.length - 1 && (
                  <div className={`w-16 md:w-24 h-1 mx-2 ${step.step < currentStep ? "bg-emerald-500" : "bg-gray-200"}`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            {steps.map((step) => (
              <span key={step.path} className={step.step === currentStep ? "text-emerald-600 font-medium" : ""}>
                {step.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        {children}
      </main>
    </div>
  );
}

