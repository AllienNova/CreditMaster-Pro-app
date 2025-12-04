"use client";

import Link from "next/link";

const features = [
  { icon: "📊", title: "AI-Powered Analysis", description: "Our AI analyzes your credit reports to find errors and opportunities" },
  { icon: "📝", title: "Automated Disputes", description: "Generate professional dispute letters with one click" },
  { icon: "📈", title: "Score Tracking", description: "Monitor your credit score progress across all bureaus" },
  { icon: "🎯", title: "Personalized Plan", description: "Get a customized roadmap to reach your credit goals" },
];

export default function OnboardingWelcomePage() {
  return (
    <div className="text-center">
      {/* Welcome Message */}
      <div className="mb-12">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-r from-emerald-500 to-blue-500 flex items-center justify-center">
          <span className="text-4xl">🎉</span>
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Welcome to CreditMaster Pro!
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          You&apos;re about to take control of your credit journey. Let&apos;s set up your account 
          and create a personalized plan to improve your credit score.
        </p>
      </div>

      {/* Features Grid */}
      <div className="grid md:grid-cols-2 gap-6 mb-12">
        {features.map((feature) => (
          <div key={feature.title} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 text-left">
            <span className="text-3xl mb-4 block">{feature.icon}</span>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
            <p className="text-gray-600">{feature.description}</p>
          </div>
        ))}
      </div>

      {/* What to Expect */}
      <div className="bg-emerald-50 rounded-xl p-8 mb-12">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">What to Expect</h2>
        <div className="flex flex-wrap justify-center gap-8 text-left">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-sm">1</span>
            <span className="text-gray-700">Complete your profile</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-sm">2</span>
            <span className="text-gray-700">Set your credit goals</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-sm">3</span>
            <span className="text-gray-700">Connect your accounts</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-sm">4</span>
            <span className="text-gray-700">Get your personalized plan</span>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="flex flex-col items-center gap-4">
        <Link
          href="/onboarding/profile"
          className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-blue-500 text-white text-lg font-semibold rounded-xl hover:shadow-lg transition"
        >
          Let&apos;s Get Started →
        </Link>
        <p className="text-sm text-gray-500">Takes about 5 minutes to complete</p>
      </div>
    </div>
  );
}

