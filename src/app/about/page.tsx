/**
 * Fynvita About Page
 *
 * Professional company information page covering:
 * - Mission and vision
 * - Platform overview and key features
 * - Technology differentiators
 * - Company values
 * - Security and compliance commitment
 *
 * Design: Apple-inspired clean aesthetic with Fynvita brand colors
 * - Vital Green (#10B981) and Trust Blue (#3B82F6)
 */

import Link from 'next/link';
import type { Metadata } from 'next';
import Header from '@/components/ui/Header';

export const metadata: Metadata = {
  title: 'About Fynvita | Your Financial Vitality Platform',
  description:
    'Learn about Fynvita, the industry-leading financial wellness platform combining AI-powered credit health, financial wellness, and investment intelligence. Trusted by 50,000+ users.',
  keywords: [
    'about fynvita',
    'financial wellness platform',
    'credit repair company',
    'ai financial advisor',
    'investment intelligence',
    'fintech company',
  ],
  openGraph: {
    title: 'About Fynvita | Your Financial Vitality Platform',
    description:
      'Discover how Fynvita is revolutionizing personal finance with AI-powered credit health, financial wellness, and investment intelligence.',
    type: 'website',
    url: 'https://fynvita.com/about',
    images: [{ url: '/og-about.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'About Fynvita | Your Financial Vitality Platform',
    description:
      'Discover how Fynvita is revolutionizing personal finance with AI-powered technology.',
  },
};

// Company values
const values = [
  {
    icon: (
      <svg
        className="w-8 h-8"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
        />
      </svg>
    ),
    title: 'Trust & Transparency',
    description:
      'We believe in complete transparency with our users. Your data is yours, and we never sell it to third parties.',
  },
  {
    icon: (
      <svg
        className="w-8 h-8"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M13 10V3L4 14h7v7l9-11h-7z"
        />
      </svg>
    ),
    title: 'Innovation First',
    description:
      'We leverage cutting-edge AI technology to deliver personalized financial guidance that adapts to your unique situation.',
  },
  {
    icon: (
      <svg
        className="w-8 h-8"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
        />
      </svg>
    ),
    title: 'User Empowerment',
    description:
      'Our mission is to empower everyone to take control of their financial future with accessible, actionable insights.',
  },
  {
    icon: (
      <svg
        className="w-8 h-8"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
        />
      </svg>
    ),
    title: 'Continuous Learning',
    description:
      'Our AI systems learn and improve continuously, ensuring you always receive the most relevant and effective guidance.',
  },
];

// Key platform features
const platformFeatures = [
  {
    title: 'Credit Health',
    subtitle: 'Monitor. Repair. Optimize.',
    description:
      'Real-time monitoring across all three bureaus, AI-powered dispute letters, and strategic credit building plans.',
    gradient: 'from-emerald-500 to-teal-600',
    icon: (
      <svg
        className="w-12 h-12"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
    ),
  },
  {
    title: 'Financial Wellness',
    subtitle: 'Budget. Save. Thrive.',
    description:
      'Smart budgeting that learns your patterns, automated savings goals, and personalized debt payoff strategies.',
    gradient: 'from-blue-500 to-blue-600',
    icon: (
      <svg
        className="w-12 h-12"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
  {
    title: 'Investment Intelligence',
    subtitle: 'Analyze. Grow. Prosper.',
    description:
      'Portfolio analytics with institutional-grade insights, risk assessment, and AI-powered market intelligence.',
    gradient: 'from-blue-600 to-blue-600',
    icon: (
      <svg
        className="w-12 h-12"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
        />
      </svg>
    ),
  },
];

// Security and compliance features
const securityFeatures = [
  { title: 'Bank-Level Encryption', description: '256-bit AES encryption' },
  { title: 'SOC 2 Type II Compliant', description: 'Audited annually' },
  { title: 'GDPR & CCPA Compliant', description: 'Your data, your rights' },
  { title: 'Zero Data Selling', description: 'We never sell your information' },
];

// Statistics
const stats = [
  { value: '50K+', label: 'Active Users' },
  { value: '300+', label: 'AI Models' },
  { value: '$2.1B+', label: 'Debt Analyzed' },
  { value: '98%', label: 'User Satisfaction' },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#fbfbfd] dark:bg-slate-900">
      <Header />

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-[980px] mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-900/30 dark:to-blue-900/30 text-gray-700 dark:text-slate-200 px-5 py-2.5 rounded-full text-sm font-semibold mb-8 shadow-sm border border-emerald-100 dark:border-emerald-800">
            <span>About Us</span>
          </div>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 dark:text-white tracking-tight leading-[1.05] mb-6">
            Your partner in
            <br />
            <span className="bg-gradient-to-r from-emerald-600 via-blue-600 to-blue-600 bg-clip-text text-transparent">
              financial vitality.
            </span>
          </h1>
          <p className="text-xl sm:text-2xl text-gray-600 dark:text-slate-300 max-w-3xl mx-auto leading-relaxed">
            Fynvita is revolutionizing personal finance by combining AI-powered
            credit health, financial wellness, and investment intelligence into
            one seamless platform.
          </p>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-20 px-6 bg-white dark:bg-slate-800/50">
        <div className="max-w-[980px] mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-6">
                Our Mission
              </h2>
              <p className="text-lg text-gray-600 dark:text-slate-300 leading-relaxed mb-6">
                At Fynvita, we believe everyone deserves access to sophisticated
                financial tools that were once reserved for the wealthy. Our
                mission is to democratize financial wellness by making
                powerful, AI-driven insights accessible to everyone.
              </p>
              <p className="text-lg text-gray-600 dark:text-slate-300 leading-relaxed">
                We are building a future where financial stress is a thing of
                the past, replaced by clarity, confidence, and control over your
                financial destiny.
              </p>
            </div>
            <div className="bg-gradient-to-br from-emerald-500 to-blue-600 rounded-xl p-8 text-white">
              <h3 className="text-2xl font-bold mb-4">Our Vision</h3>
              <p className="text-lg leading-relaxed opacity-95">
                To become the world&apos;s most trusted financial wellness
                platform, empowering 100 million people to achieve complete
                financial vitality by 2030.
              </p>
              <div className="mt-8 pt-8 border-t border-white/20">
                <p className="text-sm font-medium opacity-80">Founded in 2024</p>
                <p className="text-2xl font-bold mt-1">San Francisco, CA</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Statistics Section */}
      <section className="py-16 px-6 bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-900/20 dark:to-blue-900/20">
        <div className="max-w-[980px] mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
                  {stat.value}
                </div>
                <div className="text-gray-600 dark:text-slate-400 mt-2 font-medium">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Platform Features Section */}
      <section className="py-20 px-6">
        <div className="max-w-[980px] mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              What We Do
            </h2>
            <p className="text-lg text-gray-600 dark:text-slate-300 max-w-2xl mx-auto">
              Three pillars of financial vitality, powered by artificial
              intelligence and designed for real results.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {platformFeatures.map((feature, index) => (
              <div
                key={index}
                className="bg-white dark:bg-slate-800 rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow border border-gray-100 dark:border-slate-700"
              >
                <div
                  className={`w-16 h-16 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center text-white mb-6`}
                >
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                  {feature.title}
                </h3>
                <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400 mb-3">
                  {feature.subtitle}
                </p>
                <p className="text-gray-600 dark:text-slate-300">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Technology Section */}
      <section className="py-20 px-6 bg-gray-900 text-white">
        <div className="max-w-[980px] mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Powered by Advanced AI
            </h2>
            <p className="text-lg text-gray-400 dark:text-slate-500 max-w-2xl mx-auto">
              Access to 300+ AI models including Claude, GPT, DeepSeek, and
              Gemini, intelligently routed for optimal results.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-gray-800/50 rounded-xl p-8 border border-gray-700">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-emerald-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-bold">Intelligent Model Routing</h3>
              </div>
              <p className="text-gray-400 dark:text-slate-500 leading-relaxed">
                Our proprietary routing system automatically selects the best AI
                model for each task, balancing speed, cost, and quality to
                deliver optimal results every time.
              </p>
            </div>

            <div className="bg-gray-800/50 rounded-xl p-8 border border-gray-700">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-blue-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-bold">Multi-Model Consensus</h3>
              </div>
              <p className="text-gray-400 dark:text-slate-500 leading-relaxed">
                For critical financial decisions, we use multiple AI models to
                cross-validate recommendations, ensuring you receive the most
                accurate and reliable guidance.
              </p>
            </div>

            <div className="bg-gray-800/50 rounded-xl p-8 border border-gray-700">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-blue-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-bold">Continuous Learning</h3>
              </div>
              <p className="text-gray-400 dark:text-slate-500 leading-relaxed">
                Our AI systems continuously learn from anonymized patterns to
                improve recommendations, adapting to changing regulations and
                market conditions.
              </p>
            </div>

            <div className="bg-gray-800/50 rounded-xl p-8 border border-gray-700">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-amber-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-bold">Personalized Insights</h3>
              </div>
              <p className="text-gray-400 dark:text-slate-500 leading-relaxed">
                Every recommendation is tailored to your unique financial
                situation, goals, and risk tolerance. No generic advice - just
                actionable, personalized guidance.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 px-6">
        <div className="max-w-[980px] mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Our Values
            </h2>
            <p className="text-lg text-gray-600 dark:text-slate-300 max-w-2xl mx-auto">
              The principles that guide everything we do at Fynvita.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {values.map((value, index) => (
              <div
                key={index}
                className="flex gap-6 bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-slate-700"
              >
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-100 to-blue-100 dark:from-emerald-900/50 dark:to-blue-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                  {value.icon}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                    {value.title}
                  </h3>
                  <p className="text-gray-600 dark:text-slate-300">
                    {value.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section className="py-20 px-6 bg-gradient-to-br from-emerald-50 to-blue-50 dark:from-emerald-900/20 dark:to-blue-900/20">
        <div className="max-w-[980px] mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 mb-6">
              <svg
                className="w-8 h-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Security & Compliance
            </h2>
            <p className="text-lg text-gray-600 dark:text-slate-300 max-w-2xl mx-auto">
              Your trust is our foundation. We employ enterprise-grade security
              measures to protect your most sensitive information.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6">
            {securityFeatures.map((feature, index) => (
              <div
                key={index}
                className="bg-white dark:bg-slate-800 rounded-xl p-6 text-center shadow-sm border border-gray-100 dark:border-slate-700"
              >
                <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-6 h-6 text-emerald-600 dark:text-emerald-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-1">
                  {feature.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-slate-400">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6">
        <div className="max-w-[980px] mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-6">
            Ready to achieve financial vitality?
          </h2>
          <p className="text-lg text-gray-600 dark:text-slate-300 max-w-2xl mx-auto mb-10">
            Join over 50,000 users who are already transforming their financial
            lives with Fynvita. Start your free trial today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/signup"
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full hover:from-emerald-600 hover:to-blue-600 transition-all shadow-lg hover:shadow-xl"
            >
              Start Free Trial
              <svg
                className="w-5 h-5 ml-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-gray-700 dark:text-slate-200 bg-white dark:bg-slate-800 rounded-full hover:bg-gray-50 dark:hover:bg-slate-700 transition-all border border-gray-200 dark:border-slate-600"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-gray-200 dark:border-slate-700">
        <div className="max-w-[980px] mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-2xl"></span>
              <span className="text-xl font-semibold text-gray-900 dark:text-white">
                Fynvita
              </span>
            </div>
            <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-600 dark:text-slate-400">
              <Link href="/privacy" className="hover:text-emerald-600 transition-colors">
                Privacy Policy
              </Link>
              <Link href="/terms" className="hover:text-emerald-600 transition-colors">
                Terms of Service
              </Link>
              <Link href="/help" className="hover:text-emerald-600 transition-colors">
                Help Center
              </Link>
              <Link href="/help/contact" className="hover:text-emerald-600 transition-colors">
                Contact Us
              </Link>
            </div>
            <p className="text-sm text-gray-500 dark:text-slate-500">
              &copy; {new Date().getFullYear()} Fynvita. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
