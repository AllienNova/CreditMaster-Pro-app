/**
 * Fynvita Landing Page - Industry Leader in Financial Wellness Technology
 *
 * Strategic positioning as the premier platform combining:
 * - AI-powered credit optimization with predictive modeling
 * - Real-time financial wellness monitoring
 * - Investment intelligence with institutional-grade analytics
 * - Enterprise-grade security and compliance
 *
 * Design: Apple-inspired clean aesthetic with Fynvita brand colors
 * - Vital Green (#10B981) and Trust Blue (#3B82F6)
 * - Large, bold typography with generous white space
 * - Conversion-focused with compelling CTAs
 */

import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import Header from "@/components/ui/Header";
import Footer from "@/components/ui/Footer";
import { FadeIn, StaggerList, ScrollReveal, AnimatedNumber } from "@/components/ui/animations";

export const metadata: Metadata = {
  title:
    "Fynvita - The Premier Financial Wellness Platform | AI-Powered Credit, Wealth & Investment Intelligence",
  description:
    "Industry-leading financial wellness technology. AI-powered credit optimization, real-time financial health monitoring, and institutional-grade investment intelligence. Trusted by 50,000+ users.",
  openGraph: {
    title: "Fynvita - Your Financial Vitality",
    description:
      "The only platform combining credit health, financial wellness, and investment intelligence with 300+ AI models.",
    type: "website",
    url: "https://fynvita.com",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
};

// Product cards — restricted to brand palette (green, blue, navy variants)
const products = [
  {
    title: "Credit Health",
    subtitle: "Monitor. Repair. Optimize.",
    description:
      "AI-powered credit health management across all three bureaus.",
    gradient: "from-emerald-600 to-emerald-800",
    light: false,
    href: "/credit",
  },
  {
    title: "Financial Wellness",
    subtitle: "Budget. Save. Thrive.",
    description:
      "Complete financial wellness with intelligent insights and guidance.",
    gradient: "from-blue-600 to-blue-800",
    light: false,
    href: "/financial-hub",
  },
  {
    title: "Investment Intelligence",
    subtitle: "Analyze. Grow. Prosper.",
    description: "Professional investment intelligence powered by AI.",
    gradient: "from-emerald-600 to-blue-700",
    light: false,
    href: "/invest",
  },
  {
    title: "Tax Optimization",
    subtitle: "Plan. Save. Prosper.",
    description: "AI-powered tax strategies to maximize your savings legally.",
    gradient: "from-blue-700 to-blue-800",
    light: false,
    href: "/tax",
  },
  {
    title: "Student Loans",
    subtitle: "Navigate. Optimize. Forgive.",
    description: "Smart strategies for federal loan repayment and forgiveness.",
    gradient: "from-emerald-700 to-emerald-900",
    light: false,
    href: "/loans",
  },
];

// Features for each product section
const features = {
  credit: [
    {
      title: "Real-time Monitoring",
      desc: "Track changes across Experian, Equifax, and TransUnion",
    },
    {
      title: "AI Dispute Letters",
      desc: "Legally-crafted letters that get results",
    },
    { title: "Score Simulator", desc: "See the impact before you act" },
    { title: "Credit Building", desc: "Strategic plans to improve your score" },
  ],
  financial: [
    { title: "Smart Budgets", desc: "AI learns your spending patterns" },
    {
      title: "Debt Strategies",
      desc: "Avalanche or snowball — optimized for you",
    },
    { title: "Savings Goals", desc: "Automated tracking and recommendations" },
    { title: "Cash Flow", desc: "Predict and plan with confidence" },
  ],
  invest: [
    { title: "Portfolio Analytics", desc: "Deep insights into your holdings" },
    { title: "Risk Assessment", desc: "Understand your exposure" },
    { title: "Rebalancing", desc: "Keep your allocation on target" },
    { title: "Market Intelligence", desc: "AI-powered market analysis" },
  ],
  loans: [
    { title: "PSLF Tracker", desc: "Track qualifying payments automatically" },
    { title: "IDR Optimizer", desc: "Find the best repayment plan" },
    { title: "Forgiveness Calculator", desc: "See your potential savings" },
    { title: "Federal Programs", desc: "Never miss an opportunity" },
  ],
  tax: [
    {
      title: "Tax Bracket Optimizer",
      desc: "Minimize your effective tax rate",
    },
    { title: "Retirement Maximizer", desc: "401(k), IRA, HSA optimization" },
    {
      title: "Tax-Loss Harvesting",
      desc: "Offset gains with strategic losses",
    },
    { title: "Scenario Modeler", desc: "What-if analysis for tax decisions" },
  ],
};

// Pricing - Updated pricing model with 6 tiers
// Annual discounts: Standard 3%, Pro 8%, Family tiers 18%
const pricing = [
  {
    name: "Free",
    price: "$0",
    description: "Get started with the basics",
    features: [
      "Credit score (1 bureau)",
      "Basic budgeting",
      "10 AI chat messages/mo",
    ],
    cta: "Get Started",
    featured: false,
    href: "/auth/signup",
  },
  {
    name: "Standard",
    price: "$29.99",
    description: "Credit health & wellness",
    features: [
      "All 3 credit bureaus",
      "10 AI disputes/month",
      "Smart budgeting",
    ],
    cta: "Start Free Trial",
    featured: false,
    href: "/auth/signup?plan=standard",
  },
  {
    name: "Pro",
    price: "$99.99",
    description: "Complete financial vitality",
    features: ["Unlimited disputes", "Bill negotiation", "24/7 AI coach"],
    cta: "Start Free Trial",
    featured: true,
    href: "/auth/signup?plan=pro",
  },
  {
    name: "Family Duo",
    price: "$159.99",
    description: "2 members",
    features: ["Everything in Pro", "For couples", "Shared dashboard"],
    cta: "Start Free Trial",
    featured: false,
    href: "/auth/signup?plan=family-duo",
  },
  {
    name: "Family",
    price: "$199.99",
    description: "3 members",
    features: ["Everything in Pro", "Kids education", "Family goals"],
    cta: "Start Free Trial",
    featured: false,
    href: "/auth/signup?plan=family",
  },
  {
    name: "Family Plus",
    price: "$399.99",
    description: "5 members",
    features: ["Dedicated manager", "Estate planning", "API access"],
    cta: "Start Free Trial",
    featured: false,
    badge: "Best Value",
    href: "/auth/signup?plan=family-plus",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 transition-colors duration-200">
      {/* Navigation - Fynvita Style with Mobile Hamburger Menu */}
      <Header variant="landing" showAuth={true} />

      {/* Hero - Industry Leader Positioning */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        {/* Subtle gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-white via-emerald-50/30 to-blue-50/20 dark:from-gray-950 dark:via-emerald-950/10 dark:to-blue-950/10" />

        <div className="relative max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Text content */}
            <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 backdrop-blur-sm bg-white/60 dark:bg-slate-800/60 text-gray-700 dark:text-slate-200 px-5 py-2.5 rounded-full text-sm font-semibold mb-8 shadow-sm border border-emerald-100 dark:border-emerald-800/50">
              <span className="text-lg"></span>
              <span>The Premier Financial Wellness Platform</span>
            </div>
            <FadeIn>
            <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 dark:text-white tracking-tight leading-[1.08] mb-6">
              The Only Platform That
              <br />
              <span className="bg-gradient-to-r from-emerald-500 to-blue-500 bg-clip-text text-transparent">
                Unifies Your Financial Life.
              </span>
            </h1>
            </FadeIn>
            <FadeIn delay={0.1}>
            <p className="mt-6 text-xl sm:text-2xl text-gray-600 dark:text-slate-300 max-w-3xl lg:max-w-none leading-relaxed">
              Industry-leading AI combines{" "}
              <strong className="text-emerald-600 dark:text-emerald-400">
                credit optimization
              </strong>
              ,{" "}
              <strong className="text-blue-600 dark:text-blue-400">
                financial wellness
              </strong>
              , and{" "}
              <strong className="text-blue-600 dark:text-blue-400">
                investment intelligence
              </strong>{" "}
              into one holistic platform that competitors can&apos;t match.
            </p>
            </FadeIn>
            <FadeIn delay={0.2}>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link
                href="/auth/signup"
                className="inline-flex items-center justify-center px-8 py-4 rounded-lg bg-gradient-to-r from-emerald-500 to-blue-500 text-white text-base font-semibold hover:from-emerald-600 hover:to-blue-600 transition-all duration-200 shadow-md hover:shadow-lg hover:shadow-emerald-500/25"
              >
                Start Free Trial
              </Link>
              <Link
                href="#features"
                className="inline-flex items-center justify-center px-8 py-4 rounded-lg bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-200 text-base font-semibold hover:border-emerald-500 hover:text-emerald-600 dark:hover:border-emerald-400 dark:hover:text-emerald-400 transition-all duration-200 shadow-sm"
              >
                See How It Works
              </Link>
            </div>
            </FadeIn>
            </div>

            {/* Right: Photorealistic device mockups */}
            <div className="relative hidden lg:block">
              <div className="relative w-full min-h-[500px] animate-float-slow">
                <Image
                  src="/mockups/hero-devices.png"
                  alt="Fynvita dashboard on MacBook Pro and iPhone"
                  width={1024}
                  height={576}
                  className="w-full h-auto drop-shadow-2xl"
                  priority
                />
              </div>
            </div>
          </div>

            {/* Trust Indicators - Enhanced */}
            <div className="mt-16 flex flex-wrap justify-center items-center gap-x-12 gap-y-6 text-sm">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-emerald-600 dark:text-emerald-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M13 7H7v6h6V7z" />
                    <path
                      fillRule="evenodd"
                      d="M7 2a1 1 0 012 0v1h2V2a1 1 0 112 0v1h2a2 2 0 012 2v2h1a1 1 0 110 2h-1v2h1a1 1 0 110 2h-1v2a2 2 0 01-2 2h-2v1a1 1 0 11-2 0v-1H9v1a1 1 0 11-2 0v-1H5a2 2 0 01-2-2v-2H2a1 1 0 110-2h1V9H2a1 1 0 010-2h1V5a2 2 0 012-2h2V2zM5 5h10v10H5V5z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="text-left">
                  <p className="font-bold text-gray-900 dark:text-white">
                    300+ AI Models
                  </p>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    Proprietary routing
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-blue-600 dark:text-blue-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="text-left">
                  <p className="font-bold text-gray-900 dark:text-white">
                    Bank-Level Security
                  </p>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    SOC 2 Type II Certified
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-blue-600 dark:text-blue-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                  </svg>
                </div>
                <div className="text-left">
                  <p className="font-bold text-gray-900 dark:text-white">
                    50,000+ Users
                  </p>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    Trusted worldwide
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-amber-600 dark:text-amber-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </div>
                <div className="text-left">
                  <p className="font-bold text-gray-900 dark:text-white">
                    4.9/5 Rating
                  </p>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    12,000+ reviews
                  </p>
                </div>
              </div>
            </div>

          {/* Performance Metrics Banner */}
          <ScrollReveal>
          <div className="mt-16 bg-gradient-to-br from-gray-900 to-slate-800 rounded-xl p-8 sm:p-12 shadow-lg">
            <div className="grid sm:grid-cols-4 gap-8 text-center">
              <div>
                <p className="text-4xl sm:text-5xl font-bold text-emerald-400">
                  <AnimatedNumber value={127} prefix="+" className="text-4xl sm:text-5xl font-bold text-emerald-400" />
                </p>
                <p className="text-gray-300 text-sm mt-2 font-medium">
                  Avg. Credit Score Increase
                </p>
                <p className="text-gray-500 dark:text-slate-400 text-xs mt-1">
                  In first 6 months
                </p>
              </div>
              <div>
                <p className="text-4xl sm:text-5xl font-bold text-blue-400">
                  $47K
                </p>
                <p className="text-gray-300 text-sm mt-2 font-medium">
                  Avg. Wealth Increase
                </p>
                <p className="text-gray-500 dark:text-slate-400 text-xs mt-1">
                  Per user annually
                </p>
              </div>
              <div>
                <p className="text-4xl sm:text-5xl font-bold text-emerald-400">
                  <AnimatedNumber value={94} suffix="%" className="text-4xl sm:text-5xl font-bold text-emerald-400" />
                </p>
                <p className="text-gray-300 text-sm mt-2 font-medium">
                  Success Rate
                </p>
                <p className="text-gray-500 dark:text-slate-400 text-xs mt-1">
                  Credit disputes won
                </p>
              </div>
              <div>
                <p className="text-4xl sm:text-5xl font-bold text-blue-400">
                  &lt;1s
                </p>
                <p className="text-gray-300 text-sm mt-2 font-medium">
                  AI Response Time
                </p>
                <p className="text-gray-500 dark:text-slate-400 text-xs mt-1">
                  Real-time insights
                </p>
              </div>
            </div>
          </div>
          </ScrollReveal>
        </div>
      </section>

      {/* See It In Action — Product Showcase */}
      <section className="py-24 bg-gray-50 dark:bg-gray-900/50 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <ScrollReveal>
          <h2 className="text-4xl lg:text-5xl font-bold tracking-tight text-gray-900 dark:text-white mb-4">
            Beautiful on every device.
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-16 max-w-2xl mx-auto">
            Access your complete financial picture from anywhere — web, mobile, or tablet.
          </p>
          </ScrollReveal>

          <div className="relative max-w-[900px] mx-auto">
            <Image
              src="/mockups/showcase-laptop.png"
              alt="Fynvita financial dashboard on MacBook Pro"
              width={1024}
              height={576}
              className="w-full h-auto drop-shadow-2xl rounded-lg"
            />
          </div>
        </div>
      </section>

      {/* Comprehensive Features Showcase */}
      <section id="features" className="py-24 px-6 bg-white dark:bg-slate-900">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-2 backdrop-blur-sm bg-white/60 dark:bg-slate-800/60 text-emerald-700 dark:text-emerald-300 px-4 py-2 rounded-full text-sm font-semibold mb-6 border border-emerald-100 dark:border-emerald-800/50">
              <span>Comprehensive Features</span>
            </div>
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white tracking-tight mb-6">
              Everything you need.
              <br />
              <span className="bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
                Nothing you don&apos;t.
              </span>
            </h2>
            <p className="text-xl text-gray-600 dark:text-slate-300 max-w-3xl mx-auto">
              The only platform that combines credit optimization, financial
              wellness, and investment intelligence with proprietary AI
              technology.
            </p>
          </div>

          {/* Feature Grid */}
          <StaggerList stagger={0.08} className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
            {/* Credit Optimization */}
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 rounded-xl p-8 border border-emerald-100 dark:border-emerald-800/40 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center mb-4">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                AI Credit Optimization
              </h3>
              <p className="text-gray-600 dark:text-slate-400 mb-4 leading-relaxed">
                Predictive modeling analyzes 1,000+ factors to optimize your
                credit score faster than any competitor.
              </p>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-slate-400">
                <li className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4 text-emerald-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Real-time monitoring across all 3 bureaus
                </li>
                <li className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4 text-emerald-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  AI-generated dispute letters (94% success rate)
                </li>
                <li className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4 text-emerald-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Predictive score simulator
                </li>
              </ul>
            </div>

            {/* Financial Wellness */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-50 dark:from-blue-950/30 dark:to-blue-950/30 rounded-xl p-8 border border-blue-100 dark:border-blue-800/40 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center mb-4">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                Financial Health Monitoring
              </h3>
              <p className="text-gray-600 dark:text-slate-400 mb-4 leading-relaxed">
                Real-time alerts and personalized coaching keep your finances on
                track 24/7.
              </p>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-slate-400">
                <li className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4 text-blue-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Smart budgeting with AI learning
                </li>
                <li className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4 text-blue-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Automated savings optimization
                </li>
                <li className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4 text-blue-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Cash flow forecasting
                </li>
              </ul>
            </div>

            {/* Investment Intelligence */}
            <div className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30 rounded-xl p-8 border border-emerald-100 dark:border-emerald-800/40 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center mb-4">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                Investment Intelligence
              </h3>
              <p className="text-gray-600 dark:text-slate-400 mb-4 leading-relaxed">
                Institutional-grade analytics and AI-powered insights for your
                portfolio.
              </p>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-slate-400">
                <li className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4 text-emerald-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Advanced risk assessment
                </li>
                <li className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4 text-emerald-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Portfolio rebalancing alerts
                </li>
                <li className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4 text-emerald-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  AI market analysis
                </li>
              </ul>
            </div>

            {/* Advanced Analytics */}
            <div className="bg-gradient-to-br from-blue-50 to-sky-50 dark:from-blue-950/30 dark:to-sky-950/30 rounded-xl p-8 border border-blue-100 dark:border-blue-800/40 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center mb-4">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                Advanced Analytics
              </h3>
              <p className="text-gray-600 dark:text-slate-400 mb-4 leading-relaxed">
                Comprehensive dashboards with actionable insights powered by
                300+ AI models.
              </p>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-slate-400">
                <li className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4 text-blue-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Custom reporting & exports
                </li>
                <li className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4 text-blue-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Trend analysis & forecasting
                </li>
                <li className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4 text-blue-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Goal tracking & milestones
                </li>
              </ul>
            </div>

            {/* Bank Integrations */}
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 rounded-xl p-8 border border-emerald-100 dark:border-emerald-800/40 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center mb-4">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                Bank Integrations
              </h3>
              <p className="text-gray-600 dark:text-slate-400 mb-4 leading-relaxed">
                Securely connect 12,000+ financial institutions for automatic
                data sync.
              </p>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-slate-400">
                <li className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4 text-emerald-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Plaid-powered connections
                </li>
                <li className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4 text-emerald-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Real-time transaction sync
                </li>
                <li className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4 text-emerald-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  256-bit encryption
                </li>
              </ul>
            </div>

            {/* 24/7 AI Coach */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-50 dark:from-blue-950/30 dark:to-blue-950/30 rounded-xl p-8 border border-blue-100 dark:border-blue-800/40 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center mb-4">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                24/7 AI Financial Coach
              </h3>
              <p className="text-gray-600 dark:text-slate-400 mb-4 leading-relaxed">
                Personalized guidance from AI trained on millions of financial
                scenarios.
              </p>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-slate-400">
                <li className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4 text-blue-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Instant answers to questions
                </li>
                <li className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4 text-blue-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Personalized recommendations
                </li>
                <li className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4 text-blue-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Proactive alerts & tips
                </li>
              </ul>
            </div>
          </StaggerList>
        </div>
      </section>

      {/* Product Grid - Apple Card Style */}
      <section className="py-24 px-6 bg-gradient-to-b from-white to-gray-50 dark:from-slate-900 dark:to-slate-800">
        <div className="max-w-[1200px] mx-auto">
          <div className="grid md:grid-cols-2 gap-4">
            {products.map((product) => (
              <div
                key={product.title}
                className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${product.gradient} p-10 min-h-[420px] flex flex-col justify-between shadow-lg hover:shadow-xl transition-shadow duration-150`}
              >
                <div>
                  <p className="text-white/90 text-sm font-semibold tracking-wide uppercase">
                    {product.subtitle}
                  </p>
                  <h2 className="text-4xl font-bold text-white mt-2">
                    {product.title}
                  </h2>
                  <p className="text-white/90 text-lg mt-4 max-w-sm leading-relaxed">
                    {product.description}
                  </p>
                </div>
                <div className="flex gap-4 mt-8">
                  <Link
                    href="/auth/signup"
                    className="text-sm font-semibold text-white bg-white backdrop-blur-sm px-6 py-3 rounded-lg hover:bg-white dark:bg-slate-800/35 transition-all"
                  >
                    Get Started
                  </Link>
                  <Link
                    href={product.href}
                    className="text-sm font-semibold text-white hover:text-white/80 transition-colors flex items-center gap-1"
                  >
                    Learn more →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Credit Health Section */}
      <section id="credit" className="py-24 px-6 bg-white dark:bg-slate-900">
        <div className="max-w-[980px] mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 backdrop-blur-sm bg-white/60 dark:bg-slate-800/60 text-emerald-700 dark:text-emerald-400 px-4 py-2 rounded-full text-sm font-medium mb-4 border border-emerald-100 dark:border-emerald-800/50">
              <span>Credit Health</span>
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white tracking-tight">
              Your credit health,
              <br />
              <span className="text-emerald-600 dark:text-emerald-400">
                optimized.
              </span>
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-slate-400 max-w-xl mx-auto">
              Monitor all three bureaus, repair errors with AI-powered
              strategies, and build lasting credit health.
            </p>
          </div>

          <StaggerList stagger={0.1} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.credit.map((feature) => (
              <div key={feature.title} className="text-center p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-slate-400">
                  {feature.desc}
                </p>
              </div>
            ))}
          </StaggerList>

          {/* Score Display Mock */}
          <div className="mt-16 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 rounded-xl p-8 sm:p-12 border border-emerald-100 dark:border-emerald-800/40">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-8">
              <div>
                <p className="text-sm text-emerald-700 dark:text-emerald-400 mb-1 font-medium">
                  Your Credit Health Score
                </p>
                <p className="text-7xl font-bold text-emerald-600 dark:text-emerald-400">
                  742
                </p>
                <p className="text-emerald-700 dark:text-emerald-400 text-sm font-medium mt-2 flex items-center gap-1">
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  28 points this month
                </p>
              </div>
              <div className="flex gap-8">
                <div className="text-center">
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    738
                  </p>
                  <p className="text-xs text-gray-600 dark:text-slate-400 mt-1 font-medium">
                    Experian
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    745
                  </p>
                  <p className="text-xs text-gray-600 dark:text-slate-400 mt-1 font-medium">
                    Equifax
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    743
                  </p>
                  <p className="text-xs text-gray-600 dark:text-slate-400 mt-1 font-medium">
                    TransUnion
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Financial Wellness Section */}
      <section
        id="financial"
        className="py-24 px-6 bg-gradient-to-b from-white to-blue-50/30 dark:from-slate-900 dark:to-slate-800"
      >
        <div className="max-w-[980px] mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 backdrop-blur-sm bg-white/60 dark:bg-slate-800/60 text-blue-700 dark:text-blue-400 px-4 py-2 rounded-full text-sm font-medium mb-4 border border-blue-100 dark:border-blue-800/50">
              <span>Financial Wellness</span>
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white tracking-tight">
              Every dollar,
              <br />
              <span className="text-blue-600 dark:text-blue-400">
                working for you.
              </span>
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-slate-400 max-w-xl mx-auto">
              Intelligent budgeting that learns your habits. Wellness strategies
              that create lasting financial health.
            </p>
          </div>

          <StaggerList stagger={0.1} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.financial.map((feature) => (
              <div key={feature.title} className="text-center p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-slate-400">
                  {feature.desc}
                </p>
              </div>
            ))}
          </StaggerList>

          {/* Budget Display Mock */}
          <div className="mt-16 bg-gradient-to-br from-blue-50 to-blue-50 dark:from-blue-950/30 dark:to-blue-950/30 rounded-xl p-8 sm:p-12 border border-blue-100 dark:border-blue-800/40">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-8">
              <div>
                <p className="text-sm text-blue-700 dark:text-blue-400 mb-1 font-medium">
                  Financial Wellness Score
                </p>
                <p className="text-5xl font-bold text-blue-600 dark:text-blue-400">
                  $124,350
                </p>
                <p className="text-blue-700 dark:text-blue-400 text-sm font-medium mt-2 flex items-center gap-1">
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  $3,240 this month
                </p>
              </div>
              <div className="flex gap-8">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    $8,420
                  </p>
                  <p className="text-xs text-gray-600 dark:text-slate-400 mt-1 font-medium">
                    Income
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    $5,180
                  </p>
                  <p className="text-xs text-gray-600 dark:text-slate-400 mt-1 font-medium">
                    Spending
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    $3,240
                  </p>
                  <p className="text-xs text-gray-600 dark:text-slate-400 mt-1 font-medium">
                    Saved
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Investment Intelligence Section */}
      <section id="invest" className="py-24 px-6 bg-white dark:bg-slate-900">
        <div className="max-w-[980px] mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 backdrop-blur-sm bg-white/60 dark:bg-slate-800/60 text-blue-700 dark:text-blue-400 px-4 py-2 rounded-full text-sm font-medium mb-4 border border-blue-100 dark:border-blue-800/50">
              <span>Investment Intelligence</span>
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white tracking-tight">
              Your portfolio,
              <br />
              <span className="text-blue-600 dark:text-blue-400">
                intelligently managed.
              </span>
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-slate-400 max-w-xl mx-auto">
              Track, analyze, and optimize your investments with AI-powered
              intelligence and institutional-level tools.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.invest.map((feature) => (
              <div key={feature.title} className="text-center p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-slate-400">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Student Loans Section */}
      <section id="loans" className="py-24 px-6 bg-gray-50 dark:bg-slate-800">
        <div className="max-w-[980px] mx-auto">
          <div className="text-center mb-16">
            <p className="text-emerald-600 dark:text-emerald-400 text-sm font-medium mb-2">
              Student Loans
            </p>
            <h2 className="text-4xl sm:text-5xl font-semibold text-gray-900 dark:text-white tracking-tight">
              Student debt,
              <br />
              strategically managed.
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-slate-400 max-w-xl mx-auto">
              Navigate forgiveness programs, optimize repayment, and track every
              qualifying payment.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.loans.map((feature) => (
              <div key={feature.title} className="text-center p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-slate-400">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Success Stories & Testimonials */}
      <section className="py-24 px-6 bg-gradient-to-b from-gray-50 to-white dark:from-slate-800 dark:to-slate-900">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-2 backdrop-blur-sm bg-white/60 dark:bg-slate-800/60 text-gray-700 dark:text-slate-300 px-4 py-2 rounded-full text-sm font-semibold mb-6 border border-emerald-100/50 dark:border-emerald-800/50">
              <span>Success Stories</span>
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white tracking-tight mb-6">
              Real results.
              <br />
              <span className="bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
                Real people.
              </span>
            </h2>
            <p className="text-xl text-gray-600 dark:text-slate-400 max-w-3xl mx-auto">
              Join 50,000+ users who&apos;ve transformed their financial lives
              with Fynvita.
            </p>
          </div>

          {/* Before/After Showcase */}
          <StaggerList stagger={0.1} className="grid md:grid-cols-3 gap-8 mb-16">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-8 shadow-lg border border-gray-100 dark:border-slate-700">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white font-bold text-2xl">
                  SJ
                </div>
                <div>
                  <p className="font-bold text-gray-900 dark:text-white">
                    Sarah
                  </p>
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    Small Business Owner
                  </p>
                </div>
              </div>
              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-center p-4 bg-red-50 rounded-xl border border-red-100">
                  <span className="text-sm font-medium text-gray-700 dark:text-slate-200">
                    Before
                  </span>
                  <span className="text-2xl font-bold text-red-600">587</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                  <span className="text-sm font-medium text-gray-700 dark:text-slate-200">
                    After 6 months
                  </span>
                  <span className="text-2xl font-bold text-emerald-600">
                    742
                  </span>
                </div>
              </div>
              <p className="text-gray-600 dark:text-slate-400 italic leading-relaxed">
                &quot;Fynvita&apos;s AI found errors I didn&apos;t even know
                existed. My score jumped 155 points in 6 months!&quot;
              </p>
              <div className="flex gap-1 mt-4">
                {[...Array(5)].map((_, i) => (
                  <svg
                    key={i}
                    className="w-5 h-5 text-amber-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl p-8 shadow-lg border border-gray-100 dark:border-slate-700">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-2xl">
                  MC
                </div>
                <div>
                  <p className="font-bold text-gray-900 dark:text-white">
                    Michael
                  </p>
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    Software Engineer
                  </p>
                </div>
              </div>
              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-center p-4 bg-red-50 rounded-xl border border-red-100">
                  <span className="text-sm font-medium text-gray-700 dark:text-slate-200">
                    Net Worth
                  </span>
                  <span className="text-2xl font-bold text-red-600">$45K</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                  <span className="text-sm font-medium text-gray-700 dark:text-slate-200">
                    After 1 year
                  </span>
                  <span className="text-2xl font-bold text-emerald-600">
                    $127K
                  </span>
                </div>
              </div>
              <p className="text-gray-600 dark:text-slate-400 italic leading-relaxed">
                &quot;The investment insights helped me rebalance my portfolio.
                I&apos;ve grown my wealth by $82K in one year.&quot;
              </p>
              <div className="flex gap-1 mt-4">
                {[...Array(5)].map((_, i) => (
                  <svg
                    key={i}
                    className="w-5 h-5 text-amber-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl p-8 shadow-lg border border-gray-100 dark:border-slate-700">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center text-white font-bold text-2xl">
                  ER
                </div>
                <div>
                  <p className="font-bold text-gray-900 dark:text-white">
                    Emily
                  </p>
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    Teacher
                  </p>
                </div>
              </div>
              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-center p-4 bg-red-50 rounded-xl border border-red-100">
                  <span className="text-sm font-medium text-gray-700 dark:text-slate-200">
                    Debt
                  </span>
                  <span className="text-2xl font-bold text-red-600">$67K</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                  <span className="text-sm font-medium text-gray-700 dark:text-slate-200">
                    After 18 months
                  </span>
                  <span className="text-2xl font-bold text-emerald-600">
                    $12K
                  </span>
                </div>
              </div>
              <p className="text-gray-600 dark:text-slate-400 italic leading-relaxed">
                &quot;The debt payoff strategy saved me $15K in interest.
                I&apos;m finally debt-free!&quot;
              </p>
              <div className="flex gap-1 mt-4">
                {[...Array(5)].map((_, i) => (
                  <svg
                    key={i}
                    className="w-5 h-5 text-amber-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
            </div>
          </StaggerList>

          {/* Testimonials Grid */}
          <ScrollReveal>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-emerald-50 to-blue-50 dark:from-emerald-950/30 dark:to-blue-950/30 rounded-xl p-8 border border-emerald-100 dark:border-emerald-800/40">
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg
                    key={i}
                    className="w-5 h-5 text-amber-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-gray-700 dark:text-slate-300 leading-relaxed mb-6 text-lg">
                &quot;I&apos;ve tried other credit repair services, but
                Fynvita&apos;s AI is on another level. It found patterns and
                opportunities I never would have discovered on my own.&quot;
              </p>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white font-bold">
                  DM
                </div>
                <div>
                  <p className="font-bold text-gray-900 dark:text-white">
                    David
                  </p>
                  <p className="text-sm text-gray-600 dark:text-slate-400">
                    Real Estate Investor
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-blue-50 dark:from-blue-950/30 dark:to-blue-950/30 rounded-xl p-8 border border-blue-100 dark:border-blue-800/40">
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg
                    key={i}
                    className="w-5 h-5 text-amber-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-gray-700 dark:text-slate-300 leading-relaxed mb-6 text-lg">
                &quot;The holistic approach is what sets Fynvita apart. Instead
                of juggling multiple apps, I have everything in one place. Game
                changer!&quot;
              </p>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold">
                  LT
                </div>
                <div>
                  <p className="font-bold text-gray-900 dark:text-white">
                    Lisa
                  </p>
                  <p className="text-sm text-gray-600 dark:text-slate-400">
                    Marketing Director
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 rounded-xl p-8 border border-emerald-100 dark:border-emerald-800/40">
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg
                    key={i}
                    className="w-5 h-5 text-amber-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-gray-700 dark:text-slate-300 leading-relaxed mb-6 text-lg">
                &quot;The investment analysis helped me identify underperforming
                assets and rebalance my portfolio. My returns have improved
                significantly.&quot;
              </p>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center text-white font-bold">
                  JK
                </div>
                <div>
                  <p className="font-bold text-gray-900 dark:text-white">
                    James
                  </p>
                  <p className="text-sm text-gray-600 dark:text-slate-400">
                    Financial Analyst
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-sky-50 dark:from-blue-950/30 dark:to-sky-950/30 rounded-xl p-8 border border-blue-100 dark:border-blue-800/40">
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg
                    key={i}
                    className="w-5 h-5 text-amber-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-gray-700 dark:text-slate-300 leading-relaxed mb-6 text-lg">
                &quot;As a financial advisor, I recommend Fynvita to all my
                clients. The AI insights are institutional-grade but accessible
                to everyone.&quot;
              </p>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold">
                  AP
                </div>
                <div>
                  <p className="font-bold text-gray-900 dark:text-white">
                    Amanda
                  </p>
                  <p className="text-sm text-gray-600 dark:text-slate-400">
                    CFP®, Financial Advisor
                  </p>
                </div>
              </div>
            </div>
          </div>
          </ScrollReveal>
        </div>
      </section>

      {/* AI Technology Section */}
      <section className="py-24 px-6 bg-gradient-to-br from-gray-900 to-slate-800 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-emerald-500 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-[1200px] mx-auto relative z-10">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-white dark:bg-slate-800/10 backdrop-blur-sm text-white px-5 py-2.5 rounded-full text-sm font-semibold mb-8 border border-white/20">
              <span className="text-lg"></span>
              <span>Proprietary AI Technology</span>
            </div>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 tracking-tight">
              300+ AI Models.
              <br />
              <span className="bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">
                One Intelligent Platform.
              </span>
            </h2>
            <p className="text-xl text-white/90 max-w-3xl mx-auto leading-relaxed">
              Our proprietary AI routing system intelligently selects the
              optimal model for each task—from Claude to GPT-4 to
              Gemini—ensuring you always receive the most accurate, actionable
              insights.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-8 border border-white/20 hover:bg-white/15 transition-all">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-400 to-blue-400 flex items-center justify-center mb-4">
                <svg
                  className="w-7 h-7 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <p className="text-5xl font-bold text-white mb-2">300+</p>
              <p className="text-white/80 font-medium">AI Models</p>
              <p className="text-white/60 text-sm mt-2">Intelligent routing</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-8 border border-white/20 hover:bg-white/15 transition-all">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center mb-4">
                <svg
                  className="w-7 h-7 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <p className="text-5xl font-bold text-white mb-2">24/7</p>
              <p className="text-white/80 font-medium">AI Coach</p>
              <p className="text-white/60 text-sm mt-2">Always available</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-8 border border-white/20 hover:bg-white/15 transition-all">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center mb-4">
                <svg
                  className="w-7 h-7 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <p className="text-5xl font-bold text-white mb-2">&lt;1s</p>
              <p className="text-white/80 font-medium">Response Time</p>
              <p className="text-white/60 text-sm mt-2">Real-time insights</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-8 border border-white/20 hover:bg-white/15 transition-all">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-400 to-emerald-400 flex items-center justify-center mb-4">
                <svg
                  className="w-7 h-7 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <p className="text-5xl font-bold text-white mb-2">99.9%</p>
              <p className="text-white/80 font-medium">Accuracy</p>
              <p className="text-white/60 text-sm mt-2">Verified insights</p>
            </div>
          </div>

          {/* AI Capabilities */}
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/10">
              <h3 className="text-lg font-bold text-white mb-3">
                Predictive Analytics
              </h3>
              <p className="text-white/70 text-sm leading-relaxed">
                Machine learning models analyze millions of data points to
                predict credit score changes, market trends, and financial
                outcomes with unprecedented accuracy.
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/10">
              <h3 className="text-lg font-bold text-white mb-3">
                Natural Language Processing
              </h3>
              <p className="text-white/70 text-sm leading-relaxed">
                Advanced NLP understands your questions and provides
                personalized, context-aware financial advice in plain English—no
                jargon required.
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/10">
              <h3 className="text-lg font-bold text-white mb-3">
                Continuous Learning
              </h3>
              <p className="text-white/70 text-sm leading-relaxed">
                Our AI improves with every interaction, learning from 50,000+
                users to provide increasingly personalized and effective
                recommendations.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Mobile App Section */}
      <section className="py-24 px-6 bg-white dark:bg-slate-900">
        <div className="max-w-[980px] mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 backdrop-blur-sm bg-white/60 dark:bg-slate-800/60 text-gray-700 dark:text-slate-200 px-4 py-2 rounded-full text-sm font-medium mb-4 border border-emerald-100 dark:border-emerald-800/50">
                <span></span>
                <span>Mobile App</span>
              </div>
              <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white tracking-tight">
                Fynvita in
                <br />
                <span className="bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
                  your pocket.
                </span>
              </h2>
              <p className="mt-4 text-lg text-gray-600 dark:text-slate-400">
                Full-featured iOS and Android apps. Real-time health alerts,
                document scanning, and AI wellness coach — wherever you are.
              </p>

              <div className="mt-8 flex gap-4">
                <button className="flex items-center gap-3 px-5 py-3 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors">
                  <svg
                    className="w-6 h-6"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 22 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.09997 22C7.78997 22.05 6.79997 20.68 5.95997 19.47C4.24997 17 2.93997 12.45 4.69997 9.39C5.56997 7.87 7.12997 6.91 8.81997 6.88C10.1 6.86 11.32 7.75 12.11 7.75C12.89 7.75 14.37 6.68 15.92 6.84C16.57 6.87 18.39 7.1 19.56 8.82C19.47 8.88 17.39 10.1 17.41 12.63C17.44 15.65 20.06 16.66 20.09 16.67C20.06 16.74 19.67 18.11 18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z" />
                  </svg>
                  <div className="text-left">
                    <p className="text-[10px] text-gray-400 dark:text-slate-500">
                      Download on the
                    </p>
                    <p className="text-sm font-medium">App Store</p>
                  </div>
                </button>
                <button className="flex items-center gap-3 px-5 py-3 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors">
                  <svg
                    className="w-6 h-6"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M3 20.5V3.5C3 2.91 3.34 2.39 3.84 2.15L13.69 12L3.84 21.85C3.34 21.6 3 21.09 3 20.5ZM16.81 15.12L6.05 21.34L14.54 12.85L16.81 15.12ZM20.16 10.81C20.5 11.08 20.75 11.5 20.75 12C20.75 12.5 20.53 12.9 20.18 13.18L17.89 14.5L15.39 12L17.89 9.5L20.16 10.81ZM6.05 2.66L16.81 8.88L14.54 11.15L6.05 2.66Z" />
                  </svg>
                  <div className="text-left">
                    <p className="text-[10px] text-gray-400 dark:text-slate-500">
                      Get it on
                    </p>
                    <p className="text-sm font-medium">Google Play</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Phone Mockup — photorealistic */}
            <div className="flex justify-center">
              <Image
                src="/mockups/mobile-phone.png"
                alt="Fynvita mobile app on iPhone"
                width={360}
                height={640}
                className="w-64 h-auto drop-shadow-2xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Competitive Advantages */}
      <section className="py-24 px-6 bg-white dark:bg-slate-900">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-2 backdrop-blur-sm bg-white/60 dark:bg-slate-800/60 text-gray-700 dark:text-slate-300 px-4 py-2 rounded-full text-sm font-semibold mb-6 border border-emerald-100/50 dark:border-emerald-800/50">
              <span>Why Fynvita Leads</span>
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white tracking-tight mb-6">
              What competitors can&apos;t match.
            </h2>
            <p className="text-xl text-gray-600 dark:text-slate-400 max-w-3xl mx-auto">
              The only platform that unifies credit health, financial wellness,
              and investment intelligence with enterprise-grade AI.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 rounded-xl p-10 border border-emerald-100 dark:border-emerald-800/40">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center flex-shrink-0">
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                    Holistic Integration
                  </h3>
                  <p className="text-gray-700 dark:text-slate-300 leading-relaxed mb-4">
                    While competitors offer fragmented solutions, Fynvita is the{" "}
                    <strong>only platform</strong> that seamlessly integrates
                    credit optimization, financial wellness, and investment
                    intelligence.
                  </p>
                  <ul className="space-y-2 text-sm text-gray-600 dark:text-slate-300">
                    <li className="flex items-center gap-2">
                      <svg
                        className="w-4 h-4 text-emerald-500"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Single dashboard for complete financial picture
                    </li>
                    <li className="flex items-center gap-2">
                      <svg
                        className="w-4 h-4 text-emerald-500"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Cross-functional insights
                    </li>
                    <li className="flex items-center gap-2">
                      <svg
                        className="w-4 h-4 text-emerald-500"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Unified data model
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-blue-50 dark:from-blue-950/30 dark:to-blue-950/30 rounded-xl p-10 border border-blue-100 dark:border-blue-800/40">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center flex-shrink-0">
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                    Enterprise Security
                  </h3>
                  <p className="text-gray-700 dark:text-slate-300 leading-relaxed mb-4">
                    Bank-level security with SOC 2 Type II certification,
                    256-bit encryption, and compliance with GDPR, CCPA, and
                    financial regulations.
                  </p>
                  <ul className="space-y-2 text-sm text-gray-600 dark:text-slate-300">
                    <li className="flex items-center gap-2">
                      <svg
                        className="w-4 h-4 text-blue-500"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      SOC 2 Type II certified
                    </li>
                    <li className="flex items-center gap-2">
                      <svg
                        className="w-4 h-4 text-blue-500"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Multi-factor authentication
                    </li>
                    <li className="flex items-center gap-2">
                      <svg
                        className="w-4 h-4 text-blue-500"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Regular security audits
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30 rounded-xl p-10 border border-emerald-100 dark:border-emerald-800/40">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center flex-shrink-0">
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                    Proprietary AI
                  </h3>
                  <p className="text-gray-700 dark:text-slate-300 leading-relaxed mb-4">
                    Our AI doesn&apos;t just use off-the-shelf models.
                    We&apos;ve developed proprietary algorithms trained on
                    millions of financial scenarios.
                  </p>
                  <ul className="space-y-2 text-sm text-gray-600 dark:text-slate-400">
                    <li className="flex items-center gap-2">
                      <svg
                        className="w-4 h-4 text-emerald-500"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Custom optimization algorithms
                    </li>
                    <li className="flex items-center gap-2">
                      <svg
                        className="w-4 h-4 text-emerald-500"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Predictive financial modeling
                    </li>
                    <li className="flex items-center gap-2">
                      <svg
                        className="w-4 h-4 text-emerald-500"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Intelligent model routing
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-sky-50 dark:from-blue-950/30 dark:to-sky-950/30 rounded-xl p-10 border border-blue-100 dark:border-blue-800/40">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center flex-shrink-0">
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                    Proven ROI
                  </h3>
                  <p className="text-gray-700 dark:text-slate-300 leading-relaxed mb-4">
                    Our users see measurable results: +127 point average credit
                    score increase, $47K average wealth growth, and 94% dispute
                    success rate.
                  </p>
                  <ul className="space-y-2 text-sm text-gray-600 dark:text-slate-400">
                    <li className="flex items-center gap-2">
                      <svg
                        className="w-4 h-4 text-blue-500"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      6-month payback period
                    </li>
                    <li className="flex items-center gap-2">
                      <svg
                        className="w-4 h-4 text-blue-500"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Thousands saved in fees
                    </li>
                    <li className="flex items-center gap-2">
                      <svg
                        className="w-4 h-4 text-blue-500"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Money-back guarantee
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section
        id="pricing"
        className="py-24 px-6 bg-gradient-to-b from-white to-emerald-50/30 dark:from-slate-900 dark:to-slate-800"
      >
        <div className="max-w-[980px] mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 backdrop-blur-sm bg-white/60 dark:bg-slate-800/60 text-emerald-700 dark:text-emerald-400 px-4 py-2 rounded-full text-sm font-medium mb-4 border border-emerald-100 dark:border-emerald-800/50">
              <span>Pricing</span>
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white tracking-tight">
              Invest in your
              <br />
              <span className="bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
                financial vitality.
              </span>
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-slate-400">
              Start free. Upgrade when you&apos;re ready for complete health.
            </p>
          </div>

          <StaggerList stagger={0.07} className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {pricing.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-xl p-5 flex flex-col ${
                  plan.featured
                    ? "bg-gradient-to-br from-gray-900 to-slate-800 text-white ring-2 ring-emerald-500 scale-[1.02] shadow-xl"
                    : "bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-sm hover:shadow-lg transition-shadow"
                }`}
              >
                {plan.featured && (
                  <span className="inline-block self-start bg-gradient-to-r from-emerald-500 to-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full mb-3">
                    Most Popular
                  </span>
                )}
                {"badge" in plan && plan.badge && !plan.featured && (
                  <span className="inline-block self-start bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full mb-3">
                    {plan.badge}
                  </span>
                )}
                <h3
                  className={`text-lg font-bold ${plan.featured ? "text-white" : "text-gray-900 dark:text-white"}`}
                >
                  {plan.name}
                </h3>
                <div className="mt-3">
                  <span
                    className={`text-3xl font-bold ${plan.featured ? "text-white" : "text-gray-900 dark:text-white"}`}
                  >
                    {plan.price}
                  </span>
                  {plan.price !== "$0" && (
                    <span
                      className={`text-sm ${plan.featured ? "text-gray-400" : "text-gray-500 dark:text-slate-400"}`}
                    >
                      /mo
                    </span>
                  )}
                </div>
                <p
                  className={`mt-2 text-sm ${plan.featured ? "text-gray-300" : "text-gray-600 dark:text-slate-400"}`}
                >
                  {plan.description}
                </p>

                <ul className="mt-6 space-y-2.5 flex-grow">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className={`flex items-start gap-2 text-sm ${
                        plan.featured
                          ? "text-gray-200"
                          : "text-gray-600 dark:text-slate-400"
                      }`}
                    >
                      <svg
                        className={`w-4 h-4 mt-0.5 flex-shrink-0 ${plan.featured ? "text-emerald-400" : "text-emerald-500"}`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>

                <Link
                  href={plan.href}
                  className={`mt-6 block w-full py-3 text-center text-sm font-semibold rounded-lg transition-all ${plan.featured ? "bg-white text-gray-900 hover:bg-gray-100" : plan.name === "Free" ? "bg-gray-100 text-gray-900 dark:text-white hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600" : "bg-gradient-to-r from-emerald-500 to-blue-500 text-white hover:from-emerald-600 hover:to-blue-600"}`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </StaggerList>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-6 bg-gradient-to-br from-emerald-50 to-blue-50 dark:from-slate-800 dark:to-slate-900">
        <div className="max-w-[980px] mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white dark:bg-slate-800/80 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium mb-6 shadow-sm">
            <span className="bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent font-semibold">
              Your Financial Vitality Awaits
            </span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white tracking-tight">
            Ready to achieve
            <br />
            <span className="bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
              complete financial health?
            </span>
          </h2>
          <p className="mt-4 text-lg text-gray-600 dark:text-slate-400 max-w-xl mx-auto">
            Join thousands who&apos;ve transformed their financial lives with
            Fynvita&apos;s holistic approach.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/signup"
              className="inline-flex items-center justify-center px-8 py-4 rounded-lg bg-gradient-to-r from-emerald-500 to-blue-500 text-white text-base font-semibold hover:from-emerald-600 hover:to-blue-600 transition-all duration-200 shadow-md hover:shadow-lg hover:shadow-emerald-500/25"
            >
              Start Your Journey
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center px-8 py-4 rounded-lg bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 text-base font-semibold hover:bg-emerald-50 dark:hover:bg-slate-700 transition-colors border-2 border-emerald-500"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
