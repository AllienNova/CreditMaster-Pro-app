"use client";

import Link from "next/link";
import { useState } from "react";
import Footer from "@/components/ui/Footer";
import {
  pricingTiers,
  addOns,
  comparisonFeatures,
  competitorComparison,
} from "@/lib/pricing";

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">(
    "annual",
  );
  const [showComparison, setShowComparison] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-gray-50 to-emerald-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white dark:bg-slate-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-slate-700/50">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="flex justify-between items-center h-14">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center">
                <span className="text-white font-bold text-sm">F</span>
              </div>
              <span className="text-xl font-semibold text-gray-900 dark:text-white tracking-tight">
                Fynvita
              </span>
            </Link>
            <div className="hidden md:flex items-center gap-8">
              <Link
                href="/credit"
                className="text-sm text-gray-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
              >
                Credit Health
              </Link>
              <Link
                href="/financial-hub"
                className="text-sm text-gray-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                Financial Wellness
              </Link>
              <Link
                href="/invest"
                className="text-sm text-gray-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                Investment Intelligence
              </Link>
              <Link
                href="/pricing"
                className="text-sm text-gray-900 dark:text-white font-semibold"
              >
                Pricing
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/auth/login"
                className="text-sm text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/auth/signup"
                className="text-sm bg-gradient-to-r from-emerald-500 to-blue-500 text-white px-5 py-2 rounded-lg hover:from-emerald-600 hover:to-blue-600 transition-all"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-12">
        <div className="max-w-[1200px] mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-950/40 dark:to-blue-950/40 text-gray-700 dark:text-slate-200 px-5 py-2.5 rounded-full text-sm font-semibold mb-8 border border-emerald-100 dark:border-emerald-800">
            <span>Simple, Transparent Pricing</span>
          </div>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 dark:text-white tracking-tight leading-[1.05] mb-6">
            Invest in your
            <br />
            <span className="bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
              financial vitality.
            </span>
          </h1>
          <p className="text-xl sm:text-2xl text-gray-600 dark:text-slate-300 max-w-3xl mx-auto leading-relaxed mb-4">
            The only platform combining credit health, financial wellness, and
            investment intelligence.
          </p>
          <p className="text-lg text-emerald-600 dark:text-emerald-400 font-semibold mb-8">
            Start free, upgrade when you&apos;re ready. All paid plans include a
            14-day free trial.
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4 mb-4">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${billingCycle === "monthly" ? "bg-gray-900 text-white" : "bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-600"}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle("annual")}
              className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                billingCycle === "annual"
                  ? "bg-gradient-to-r from-emerald-500 to-blue-500 text-white"
                  : "bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-600"
              }`}
            >
              Annual
              <span className="ml-2 text-xs bg-white dark:bg-slate-800/20 px-2 py-0.5 rounded-full">
                Save 20%
              </span>
            </button>
          </div>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            <strong className="text-emerald-600 dark:text-emerald-400">
              30-day money-back guarantee
            </strong>{" "}
            — Not satisfied? Get a full refund.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-12">
        <div className="max-w-[1600px] mx-auto px-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 xl:gap-3">
            {pricingTiers.map((tier) => {
              const displayPrice =
                billingCycle === "monthly"
                  ? tier.priceNumber
                  : Math.round((tier.annualPrice / 12) * 100) / 100;
              const isPopular = tier.popular;
              const isFree = tier.id === "free";

              return (
                <div
                  key={tier.id}
                  className={`relative rounded-xl p-6 xl:p-5 2xl:p-8 flex flex-col min-w-0 overflow-hidden ${
                    isPopular
                      ? "bg-gradient-to-br from-gray-900 to-slate-800 text-white scale-[1.02] shadow-xl ring-2 ring-emerald-500/30 lg:-mt-4 lg:mb-4"
                      : "bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all hover:border-emerald-200 dark:hover:border-emerald-700"
                  }`}
                >
                  {tier.badge && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <span
                        className={`px-4 py-1.5 rounded-full text-xs font-bold shadow-lg ${
                          isPopular
                            ? "bg-gradient-to-r from-emerald-500 to-blue-500 text-white"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {tier.badge}
                      </span>
                    </div>
                  )}

                  <div className="mb-6">
                    <h3
                      className={`text-2xl xl:text-xl 2xl:text-2xl font-bold mb-1 ${isPopular ? "text-white" : "text-gray-900 dark:text-white"}`}
                    >
                      {tier.name}
                    </h3>
                    <p
                      className={`text-sm ${isPopular ? "text-gray-300" : "text-gray-600 dark:text-slate-400"}`}
                    >
                      {tier.description}
                    </p>
                  </div>

                  <div className="mb-6">
                    <div className="flex items-baseline mb-1 min-w-0">
                      {isFree ? (
                        <span
                          className={`text-4xl xl:text-3xl 2xl:text-4xl font-bold tracking-tight ${isPopular ? "text-white" : "text-gray-900 dark:text-white"}`}
                        >
                          $0
                        </span>
                      ) : (
                        <>
                          <span
                            className={`text-4xl xl:text-3xl 2xl:text-4xl font-bold tracking-tight ${isPopular ? "text-white" : "text-gray-900 dark:text-white"}`}
                          >
                            $
                            {billingCycle === "monthly"
                              ? tier.price
                              : displayPrice.toFixed(0)}
                          </span>
                          <span
                            className={`text-lg ml-1 ${isPopular ? "text-gray-400" : "text-gray-500 dark:text-slate-400"}`}
                          >
                            /mo
                          </span>
                        </>
                      )}
                    </div>
                    {!isFree && billingCycle === "annual" && (
                      <p
                        className={`text-sm ${isPopular ? "text-emerald-300" : "text-emerald-600"}`}
                      >
                        ${tier.annualPrice.toFixed(0)} billed annually (save $
                        {(tier.priceNumber * 12 - tier.annualPrice).toFixed(0)})
                      </p>
                    )}
                  </div>

                  <ul className="space-y-3 mb-8 flex-grow">
                    {tier.features.slice(0, 8).map((feature, idx) => (
                      <li key={idx} className="flex items-start">
                        <svg
                          className={`w-5 h-5 mr-2 mt-0.5 flex-shrink-0 ${isPopular ? "text-emerald-400" : "text-emerald-500"}`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span
                          className={`text-sm ${isPopular ? "text-gray-200" : "text-gray-700 dark:text-slate-300"} ${feature.startsWith("Everything") ? "font-semibold" : ""}`}
                        >
                          {feature}
                        </span>
                      </li>
                    ))}
                    {tier.features.length > 8 && (
                      <li
                        className={`text-sm ${isPopular ? "text-gray-400" : "text-gray-500 dark:text-slate-400"} pl-7`}
                      >
                        +{tier.features.length - 8} more features
                      </li>
                    )}
                  </ul>

                  {/* Excluded features for Free tier */}
                  {tier.excludedFeatures &&
                    tier.excludedFeatures.length > 0 && (
                      <div className="mb-6 pt-4 border-t border-gray-200 dark:border-slate-600">
                        <p className="text-xs text-gray-500 dark:text-slate-400 mb-2">
                          Not included:
                        </p>
                        <ul className="space-y-1">
                          {tier.excludedFeatures
                            .slice(0, 3)
                            .map((feature, idx) => (
                              <li
                                key={idx}
                                className="flex items-center text-xs text-gray-400 dark:text-slate-500"
                              >
                                <svg
                                  className="w-4 h-4 mr-1.5 text-gray-300"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M6 18L18 6M6 6l12 12"
                                  />
                                </svg>
                                {feature}
                              </li>
                            ))}
                        </ul>
                      </div>
                    )}

                  <Link
                    href={
                      isFree ? "/auth/signup" : "/auth/signup?plan=" + tier.id
                    }
                    className={`block w-full py-3.5 px-6 rounded-lg font-bold text-center transition-all ${isPopular ? "bg-white text-gray-900 hover:bg-gray-100" : isFree ? "bg-gray-100 text-gray-900 dark:text-white hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600" : "bg-gradient-to-r from-emerald-500 to-blue-500 text-white hover:from-emerald-600 hover:to-blue-600"}`}
                  >
                    {tier.cta}
                  </Link>
                </div>
              );
            })}
          </div>

          {/* Trust Signals */}
          <div className="mt-12 text-center">
            <div className="flex flex-wrap justify-center items-center gap-8 text-sm text-gray-500 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-emerald-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>Bank-level 256-bit encryption</span>
              </div>
              <div className="flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-blue-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>SOC 2 Type II certified</span>
              </div>
              <div className="flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-blue-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                  <path
                    fillRule="evenodd"
                    d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>GDPR & CCPA compliant</span>
              </div>
              <div className="flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-amber-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span>50,000+ satisfied users</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Competitor Comparison Section */}
      <section className="py-20 bg-gradient-to-b from-gray-900 to-gray-800">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-white dark:bg-slate-800/10 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
              <span>Why Choose Fynvita?</span>
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold text-white tracking-tight mb-4">
              See how we compare.
            </h2>
            <p className="text-xl text-gray-400 dark:text-slate-500 max-w-2xl mx-auto">
              The only platform that combines credit repair, financial wellness,
              AND investment intelligence.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-4 pr-4 font-medium text-gray-400 dark:text-slate-500 text-sm">
                    Feature
                  </th>
                  <th className="text-center py-4 px-6">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-md bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center mb-1">
                        <span className="text-white font-bold text-sm">F</span>
                      </div>
                      <span className="font-bold text-white">Fynvita Pro</span>
                      <span className="text-emerald-400 text-sm font-semibold">
                        $99.99/mo
                      </span>
                    </div>
                  </th>
                  <th className="text-center py-4 px-6">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-md bg-green-600 flex items-center justify-center mb-1">
                        <span className="text-white font-bold text-sm">CK</span>
                      </div>
                      <span className="font-medium text-gray-300">
                        Credit Karma
                      </span>
                      <span className="text-gray-500 dark:text-slate-400 text-sm">
                        Free
                      </span>
                    </div>
                  </th>
                  <th className="text-center py-4 px-6">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-md bg-orange-500 flex items-center justify-center mb-1">
                        <span className="text-white font-bold text-sm">RM</span>
                      </div>
                      <span className="font-medium text-gray-300">
                        Rocket Money
                      </span>
                      <span className="text-gray-500 dark:text-slate-400 text-sm">
                        $6-14/mo
                      </span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="text-sm">
                <tr className="border-b border-gray-700/50">
                  <td className="py-4 pr-4 text-gray-300">
                    Credit Bureaus Monitored
                  </td>
                  <td className="py-4 px-6 text-center">
                    <span className="text-emerald-400 font-bold">All 3</span>
                  </td>
                  <td className="py-4 px-6 text-center text-gray-500 dark:text-slate-400">
                    2 of 3
                  </td>
                  <td className="py-4 px-6 text-center text-red-400">None</td>
                </tr>
                <tr className="border-b border-gray-700/50">
                  <td className="py-4 pr-4 text-gray-300">
                    AI Dispute Letters
                  </td>
                  <td className="py-4 px-6 text-center">
                    <span className="text-emerald-400 font-bold">
                      Unlimited
                    </span>
                  </td>
                  <td className="py-4 px-6 text-center text-red-400">None</td>
                  <td className="py-4 px-6 text-center text-red-400">None</td>
                </tr>
                <tr className="border-b border-gray-700/50">
                  <td className="py-4 pr-4 text-gray-300">Bill Negotiation</td>
                  <td className="py-4 px-6 text-center">
                    <span className="text-emerald-400 font-bold">
                      Included (no fees)
                    </span>
                  </td>
                  <td className="py-4 px-6 text-center text-red-400">None</td>
                  <td className="py-4 px-6 text-center text-amber-400">
                    35-60% of savings
                  </td>
                </tr>
                <tr className="border-b border-gray-700/50">
                  <td className="py-4 pr-4 text-gray-300">Subscription Cancellation</td>
                  <td className="py-4 px-6 text-center">
                    <span className="text-emerald-400 font-bold">
                      AI-Assisted
                    </span>
                  </td>
                  <td className="py-4 px-6 text-center text-red-400">None</td>
                  <td className="py-4 px-6 text-center text-amber-400">
                    Manual assist
                  </td>
                </tr>
                <tr className="border-b border-gray-700/50">
                  <td className="py-4 pr-4 text-gray-300">Auto Loan Comparison</td>
                  <td className="py-4 px-6 text-center">
                    <span className="text-emerald-400 font-bold">
                      Pre-Approval Odds
                    </span>
                  </td>
                  <td className="py-4 px-6 text-center text-emerald-400">Basic offers</td>
                  <td className="py-4 px-6 text-center text-red-400">None</td>
                </tr>
                <tr className="border-b border-gray-700/50">
                  <td className="py-4 pr-4 text-gray-300">Investment Tools</td>
                  <td className="py-4 px-6 text-center">
                    <span className="text-emerald-400 font-bold">
                      Full Suite
                    </span>
                  </td>
                  <td className="py-4 px-6 text-center text-red-400">None</td>
                  <td className="py-4 px-6 text-center text-red-400">None</td>
                </tr>
                <tr className="border-b border-gray-700/50">
                  <td className="py-4 pr-4 text-gray-300">
                    Student Loan Optimization
                  </td>
                  <td className="py-4 px-6 text-center">
                    <span className="text-emerald-400 font-bold">Complete</span>
                  </td>
                  <td className="py-4 px-6 text-center text-gray-500 dark:text-slate-400">
                    Basic
                  </td>
                  <td className="py-4 px-6 text-center text-red-400">None</td>
                </tr>
                <tr className="border-b border-gray-700/50">
                  <td className="py-4 pr-4 text-gray-300">
                    24/7 AI Financial Coach
                  </td>
                  <td className="py-4 px-6 text-center">
                    <CheckIcon className="text-emerald-400" />
                  </td>
                  <td className="py-4 px-6 text-center">
                    <XIcon className="text-red-400" />
                  </td>
                  <td className="py-4 px-6 text-center">
                    <XIcon className="text-red-400" />
                  </td>
                </tr>
                <tr className="border-b border-gray-700/50">
                  <td className="py-4 pr-4 text-gray-300">Hidden Fees</td>
                  <td className="py-4 px-6 text-center">
                    <span className="text-emerald-400 font-bold">None</span>
                  </td>
                  <td className="py-4 px-6 text-center text-amber-400">
                    Product ads
                  </td>
                  <td className="py-4 px-6 text-center text-amber-400">
                    Success fees
                  </td>
                </tr>
                <tr>
                  <td className="py-4 pr-4 text-gray-300">Your Data is...</td>
                  <td className="py-4 px-6 text-center">
                    <span className="text-emerald-400 font-bold">
                      Protected
                    </span>
                  </td>
                  <td className="py-4 px-6 text-center text-amber-400">
                    Monetized
                  </td>
                  <td className="py-4 px-6 text-center text-gray-500 dark:text-slate-400">
                    Protected
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-10 text-center">
            <p className="text-gray-400 dark:text-slate-500 mb-6 text-lg">
              Credit Karma shows you credit. Rocket Money helps you budget.
              <br />
              <strong className="text-white">
                Only Fynvita transforms your complete financial life.
              </strong>
            </p>
            <Link
              href="/auth/signup?plan=pro"
              className="inline-block bg-gradient-to-r from-emerald-500 to-blue-500 text-white px-8 py-4 rounded-lg font-bold hover:from-emerald-600 hover:to-blue-600 transition-all"
            >
              Start Your Free Trial
            </Link>
          </div>
        </div>
      </section>

      {/* Add-ons Section */}
      <section className="py-20 bg-white dark:bg-slate-900">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white tracking-tight mb-4">
              Enhance your plan with add-ons.
            </h2>
            <p className="text-xl text-gray-600 dark:text-slate-300">
              Customize your experience with powerful extras.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {addOns.map((addon) => (
              <div
                key={addon.id}
                className="bg-gray-50 dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all hover:shadow-md"
              >
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                  {addon.name}
                </h3>
                <p className="text-gray-600 dark:text-slate-400 text-sm mb-4">
                  {addon.description}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">
                    ${addon.price}
                    <span className="text-sm font-normal text-gray-500 dark:text-slate-400">
                      /mo
                    </span>
                  </span>
                  <span className="text-xs text-gray-500 dark:text-slate-400">
                    For:{" "}
                    {addon.availableFor
                      .map((t) => t.charAt(0).toUpperCase() + t.slice(1))
                      .join(", ")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Detailed Feature Comparison */}
      <section className="py-20 bg-gray-50 dark:bg-slate-800">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="text-center mb-12">
            <button
              onClick={() => setShowComparison(!showComparison)}
              className="inline-flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
            >
              {showComparison ? "Hide" : "Show"} detailed feature comparison
              <svg
                className={`w-5 h-5 transition-transform ${showComparison ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
          </div>

          {showComparison && (
            <div className="overflow-x-auto">
              <table className="w-full bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow-lg">
                <thead>
                  <tr className="bg-gray-100 dark:bg-slate-800">
                    <th className="text-left py-4 px-6 font-medium text-gray-600 dark:text-slate-300 text-sm">
                      Feature
                    </th>
                    <th className="text-center py-4 px-4 font-bold text-gray-900 dark:text-white">
                      Free
                    </th>
                    <th className="text-center py-4 px-4 font-bold text-gray-900 dark:text-white">
                      Standard
                    </th>
                    <th className="text-center py-4 px-4 font-bold text-emerald-600">
                      Pro
                    </th>
                    <th className="text-center py-4 px-4 font-bold text-gray-900 dark:text-white">
                      Family
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonFeatures.map((category, catIdx) => (
                    <>
                      <tr
                        key={`cat-${catIdx}`}
                        className="bg-gray-50 dark:bg-slate-900"
                      >
                        <td
                          colSpan={5}
                          className="py-3 px-6 font-bold text-gray-900 dark:text-white"
                        >
                          {category.category}
                        </td>
                      </tr>
                      {category.features.map((feature, featIdx) => (
                        <tr
                          key={`feat-${catIdx}-${featIdx}`}
                          className="border-b border-gray-100 dark:border-slate-700"
                        >
                          <td className="py-3 px-6 text-sm text-gray-700 dark:text-slate-200">
                            {feature.name}
                          </td>
                          <td className="py-3 px-4 text-center text-sm">
                            <FeatureValue value={feature.free} />
                          </td>
                          <td className="py-3 px-4 text-center text-sm">
                            <FeatureValue value={feature.standard} />
                          </td>
                          <td className="py-3 px-4 text-center text-sm bg-emerald-50/50">
                            <FeatureValue value={feature.pro} />
                          </td>
                          <td className="py-3 px-4 text-center text-sm">
                            <FeatureValue value={feature.family} />
                          </td>
                        </tr>
                      ))}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 dark:bg-slate-900">
        <div className="max-w-[800px] mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white tracking-tight mb-4">
              Frequently asked questions.
            </h2>
          </div>

          <div className="space-y-6">
            {[
              {
                q: "How is Fynvita different from Credit Karma?",
                a: "Credit Karma only monitors 2 of 3 credit bureaus and makes money by recommending financial products to you. Fynvita monitors ALL 3 bureaus, generates AI-powered dispute letters, includes investment tools, and has no hidden product recommendations. Your data stays private.",
              },
              {
                q: "Why should I pay when Rocket Money has a free tier?",
                a: "Rocket Money charges 35-60% of any money they save you through bill negotiation. With Fynvita Pro, bill negotiation assistance is INCLUDED at no extra cost. Plus, we offer credit repair, investment intelligence, and student loan optimization that Rocket Money doesn't have.",
              },
              {
                q: "What happens after my 14-day free trial?",
                a: "After your trial, you'll be charged the subscription price for your selected plan. You can cancel anytime during the trial at no cost, and we'll send you a reminder before the trial ends.",
              },
              {
                q: "Can I switch plans later?",
                a: "Absolutely! You can upgrade or downgrade at any time. Upgrades take effect immediately, while downgrades apply at the start of your next billing cycle.",
              },
              {
                q: "Is my financial data secure?",
                a: "Yes. We use bank-level 256-bit encryption, are SOC 2 Type II certified, and fully compliant with GDPR and CCPA. We never sell your personal data or use it for advertising.",
              },
              {
                q: "What makes the Family plan worth it?",
                a: "The Family plan covers up to 5 household members at a fraction of the cost of individual Pro subscriptions. Plus, you get exclusive features like a family dashboard, shared goals, kids' financial education, and a dedicated account manager.",
              },
            ].map((faq, idx) => (
              <div
                key={idx}
                className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-slate-700"
              >
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">
                  {faq.q}
                </h3>
                <p className="text-gray-600 dark:text-slate-400 leading-relaxed">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 bg-gradient-to-r from-emerald-600 to-blue-600">
        <div className="max-w-[800px] mx-auto px-6 text-center">
          <h2 className="text-4xl sm:text-5xl font-bold text-white tracking-tight mb-6">
            Ready for complete financial vitality?
          </h2>
          <p className="text-xl text-white/80 mb-8">
            Join 50,000+ users who&apos;ve transformed their financial lives
            with Fynvita.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/signup"
              className="inline-block bg-white text-gray-900 dark:text-white px-8 py-4 rounded-lg font-bold hover:bg-gray-100 dark:hover:bg-slate-700 dark:bg-slate-800 transition-all"
            >
              Start Free Trial
            </Link>
            <Link
              href="/demo"
              className="inline-block bg-white text-white border-2 border-white/30 px-8 py-4 rounded-lg font-bold hover:bg-white dark:bg-slate-800/20 transition-all"
            >
              Watch Demo
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={`w-5 h-5 mx-auto ${className}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      className={`w-5 h-5 mx-auto ${className}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}

function FeatureValue({ value }: { value: boolean | string }) {
  if (value === true) {
    return <CheckIcon className="text-emerald-500" />;
  }
  if (value === false) {
    return <XIcon className="text-gray-300" />;
  }
  return <span className="text-gray-700 dark:text-slate-200">{value}</span>;
}
