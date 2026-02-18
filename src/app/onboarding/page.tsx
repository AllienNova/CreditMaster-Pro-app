"use client";

import Link from "next/link";
import {
  StarIcon,
  ShieldCheckIcon,
  ClockIcon,
  UserGroupIcon,
} from "@heroicons/react/24/solid";
import { Icon } from "@/components/ui/Icon";

const features = [
  {
    icon: "sparkles",
    title: "AI-Powered Analysis",
    description:
      "Our AI analyzes your credit reports to find errors and opportunities",
    benefit: "Find up to 30% more errors than manual review",
  },
  {
    icon: "document-text",
    title: "Automated Disputes",
    description: "Generate professional dispute letters with one click",
    benefit: "Save 10+ hours per month on paperwork",
  },
  {
    icon: "chart-bar",
    title: "Score Tracking",
    description: "Monitor your credit score progress across all bureaus",
    benefit: "See improvements in as little as 30 days",
  },
  {
    icon: "target",
    title: "Personalized Plan",
    description: "Get a customized roadmap to reach your credit goals",
    benefit: "Achieve your target score 2x faster",
  },
];

const socialProof = [
  { metric: "50,000+", label: "Active Users" },
  { metric: "4.8/5", label: "Average Rating" },
  { metric: "127 pts", label: "Avg. Score Increase" },
  { metric: "94%", label: "Success Rate" },
];

const testimonials = [
  {
    name: "Sarah M.",
    score: "+142 points",
    quote:
      "Went from 580 to 722 in 6 months. Finally qualified for my dream home!",
    timeframe: "6 months",
  },
  {
    name: "James T.",
    score: "+98 points",
    quote: "The AI found errors I never would have spotted. Highly recommend!",
    timeframe: "4 months",
  },
  {
    name: "Maria L.",
    score: "+156 points",
    quote:
      "Best investment I've made. Saved thousands on my car loan interest.",
    timeframe: "8 months",
  },
];

export default function OnboardingWelcomePage() {
  return (
    <div className="text-center">
      {/* Welcome Message */}
      <div className="mb-8">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-r from-emerald-500 to-blue-500 flex items-center justify-center shadow-lg">
          <span className="text-4xl"></span>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
          Welcome to Fynvita!
        </h1>
        <p className="text-xl text-gray-600 dark:text-slate-300 max-w-2xl mx-auto mb-6">
          Join thousands who&apos;ve improved their credit scores by an average
          of <span className="font-bold text-emerald-600">127 points</span>
        </p>

        {/* Social Proof Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto mb-8">
          {socialProof.map((item) => (
            <div
              key={item.label}
              className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-slate-700"
            >
              <div className="text-2xl md:text-3xl font-bold text-emerald-600">
                {item.metric}
              </div>
              <div className="text-xs md:text-sm text-gray-600 dark:text-slate-300 mt-1">
                {item.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Trust Indicators */}
      <div className="flex flex-wrap justify-center gap-6 mb-12 text-sm text-gray-600 dark:text-slate-300">
        <div className="flex items-center gap-2">
          <ShieldCheckIcon className="w-5 h-5 text-emerald-500" />
          <span>Bank-Level Security</span>
        </div>
        <div className="flex items-center gap-2">
          <ClockIcon className="w-5 h-5 text-emerald-500" />
          <span>5-Minute Setup</span>
        </div>
        <div className="flex items-center gap-2">
          <UserGroupIcon className="w-5 h-5 text-emerald-500" />
          <span>50,000+ Happy Users</span>
        </div>
        <div className="flex items-center gap-2">
          <StarIcon className="w-5 h-5 text-emerald-500" />
          <span>4.8/5 Rating</span>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid md:grid-cols-2 gap-6 mb-12">
        {features.map((feature) => (
          <div
            key={feature.title}
            className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700 text-left hover:shadow-md transition-shadow"
          >
            <Icon name={feature.icon} className="text-3xl mb-4 inline-block" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {feature.title}
            </h3>
            <p className="text-gray-600 dark:text-slate-300 mb-3">
              {feature.description}
            </p>
            <p className="text-sm text-emerald-600 font-medium">
              {feature.benefit}
            </p>
          </div>
        ))}
      </div>

      {/* Success Stories */}
      <div className="bg-gradient-to-br from-emerald-50 to-blue-50 rounded-xl p-8 mb-12">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Real Results from Real People
        </h2>
        <p className="text-gray-600 dark:text-slate-300 mb-6">
          See what our users have achieved
        </p>
        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((testimonial) => (
            <div
              key={testimonial.name}
              className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm text-left"
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="flex text-yellow-400">
                  {[...Array(5)].map((_, i) => (
                    <StarIcon key={i} className="w-4 h-4" />
                  ))}
                </div>
              </div>
              <p className="text-gray-700 dark:text-slate-200 mb-4 italic">
                &quot;{testimonial.quote}&quot;
              </p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {testimonial.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    {testimonial.timeframe}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-emerald-600">
                    {testimonial.score}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* What to Expect */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-8 mb-12 shadow-sm border border-gray-200 dark:border-slate-700">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
          Your Journey in 4 Simple Steps
        </h2>
        <div className="grid md:grid-cols-4 gap-6 text-left">
          <div className="relative">
            <div className="flex items-start gap-3">
              <span className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center text-lg font-bold flex-shrink-0">
                1
              </span>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                  Complete Profile
                </h3>
                <p className="text-sm text-gray-600 dark:text-slate-300">
                  Basic info to verify your identity
                </p>
                <p className="text-xs text-emerald-600 mt-1">~2 minutes</p>
              </div>
            </div>
          </div>
          <div className="relative">
            <div className="flex items-start gap-3">
              <span className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center text-lg font-bold flex-shrink-0">
                2
              </span>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                  Set Goals
                </h3>
                <p className="text-sm text-gray-600 dark:text-slate-300">
                  Tell us what you want to achieve
                </p>
                <p className="text-xs text-emerald-600 mt-1">~1 minute</p>
              </div>
            </div>
          </div>
          <div className="relative">
            <div className="flex items-start gap-3">
              <span className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center text-lg font-bold flex-shrink-0">
                3
              </span>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                  Connect Accounts
                </h3>
                <p className="text-sm text-gray-600 dark:text-slate-300">
                  Securely link credit bureaus
                </p>
                <p className="text-xs text-emerald-600 mt-1">~1 minute</p>
              </div>
            </div>
          </div>
          <div className="relative">
            <div className="flex items-start gap-3">
              <span className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center text-lg font-bold flex-shrink-0">
                4
              </span>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                  Get Your Plan
                </h3>
                <p className="text-sm text-gray-600 dark:text-slate-300">
                  Receive personalized action steps
                </p>
                <p className="text-xs text-emerald-600 mt-1">~30 seconds</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="flex flex-col items-center gap-4">
        <Link
          href="/onboarding/profile"
          className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-blue-500 text-white text-lg font-semibold rounded-xl hover:shadow-lg hover:scale-105 transition-all"
        >
          Start Your Credit Journey →
        </Link>
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400">
          <ClockIcon className="w-4 h-4" />
          <span>Only 5 minutes • No credit card required</span>
        </div>
        <p className="text-xs text-gray-400 dark:text-slate-500 mt-2">
          Your data is encrypted and secure. We never sell your information.
        </p>
      </div>
    </div>
  );
}
