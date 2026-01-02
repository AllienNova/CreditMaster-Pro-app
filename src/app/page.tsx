/**
 * CPFI Landing Page - Apple-Inspired Design
 *
 * Clean, minimal, elegant design with:
 * - White/light backgrounds
 * - Large, bold typography
 * - Generous white space
 * - Sophisticated animations
 */

import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'CPFI - Financial Intelligence Platform',
  description:
    'Take control of your financial life. Credit, budgeting, investments, and loans — unified in one AI-powered platform.',
  openGraph: {
    title: 'CPFI - Financial Intelligence Platform',
    description: 'Your complete AI-powered financial command center.',
    type: 'website',
    url: 'https://cpfi.com',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
};

// Product cards for the main showcase
const products = [
  {
    title: 'Credit Intelligence',
    subtitle: 'Monitor. Repair. Optimize.',
    description: 'AI-powered credit management across all three bureaus.',
    gradient: 'from-blue-600 to-indigo-600',
    light: false,
    href: '/credit',
  },
  {
    title: 'Financial Hub',
    subtitle: 'Budget. Save. Thrive.',
    description: 'Complete control over your money with intelligent insights.',
    gradient: 'from-emerald-500 to-teal-500',
    light: false,
    href: '/financial-hub',
  },
  {
    title: 'Investments',
    subtitle: 'Analyze. Grow. Prosper.',
    description: 'Professional portfolio management powered by AI.',
    gradient: 'from-purple-600 to-violet-600',
    light: false,
    href: '/invest',
  },
  {
    title: 'Student Loans',
    subtitle: 'Navigate. Optimize. Forgive.',
    description: 'Smart strategies for federal loan repayment and forgiveness.',
    gradient: 'from-orange-500 to-amber-500',
    light: false,
    href: '/loans',
  },
];

// Features for each product section
const features = {
  credit: [
    { title: 'Real-time Monitoring', desc: 'Track changes across Experian, Equifax, and TransUnion' },
    { title: 'AI Dispute Letters', desc: 'Legally-crafted letters that get results' },
    { title: 'Score Simulator', desc: 'See the impact before you act' },
    { title: 'Credit Building', desc: 'Strategic plans to improve your score' },
  ],
  financial: [
    { title: 'Smart Budgets', desc: 'AI learns your spending patterns' },
    { title: 'Debt Strategies', desc: 'Avalanche or snowball — optimized for you' },
    { title: 'Savings Goals', desc: 'Automated tracking and recommendations' },
    { title: 'Cash Flow', desc: 'Predict and plan with confidence' },
  ],
  invest: [
    { title: 'Portfolio Analytics', desc: 'Deep insights into your holdings' },
    { title: 'Risk Assessment', desc: 'Understand your exposure' },
    { title: 'Rebalancing', desc: 'Keep your allocation on target' },
    { title: 'Market Intelligence', desc: 'AI-powered market analysis' },
  ],
  loans: [
    { title: 'PSLF Tracker', desc: 'Track qualifying payments automatically' },
    { title: 'IDR Optimizer', desc: 'Find the best repayment plan' },
    { title: 'Forgiveness Calculator', desc: 'See your potential savings' },
    { title: 'Federal Programs', desc: 'Never miss an opportunity' },
  ],
};

// Pricing
const pricing = [
  {
    name: 'Free',
    price: '$0',
    description: 'Get started with the basics',
    features: ['Credit score tracking', 'Basic budgeting', 'Limited AI chat', 'Mobile app access'],
    cta: 'Get Started',
    featured: false,
  },
  {
    name: 'Pro',
    price: '$29',
    description: 'Everything you need',
    features: [
      'All credit bureaus',
      'Unlimited AI disputes',
      'Full financial suite',
      'Investment tracking',
      'Student loan tools',
      'Priority support',
    ],
    cta: 'Start Free Trial',
    featured: true,
  },
  {
    name: 'Family',
    price: '$49',
    description: 'For the whole household',
    features: [
      'Everything in Pro',
      'Up to 5 users',
      'Family dashboard',
      'Shared goals',
      'Joint account tracking',
      'Dedicated advisor',
    ],
    cta: 'Start Free Trial',
    featured: false,
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#fbfbfd]">
      {/* Navigation - Apple Style */}
      <nav className="fixed top-0 w-full z-50 bg-[#fbfbfd]/80 backdrop-blur-xl border-b border-gray-200/50">
        <div className="max-w-[980px] mx-auto px-6">
          <div className="flex justify-between items-center h-12">
            <Link href="/" className="text-xl font-semibold text-gray-900 tracking-tight">
              CPFI
            </Link>
            <div className="hidden md:flex items-center gap-8">
              <Link href="/credit" className="text-xs text-gray-600 hover:text-gray-900 transition-colors">
                Credit
              </Link>
              <Link href="/financial-hub" className="text-xs text-gray-600 hover:text-gray-900 transition-colors">
                Financial
              </Link>
              <Link href="/invest" className="text-xs text-gray-600 hover:text-gray-900 transition-colors">
                Invest
              </Link>
              <Link href="/loans" className="text-xs text-gray-600 hover:text-gray-900 transition-colors">
                Loans
              </Link>
              <Link href="/pricing" className="text-xs text-gray-600 hover:text-gray-900 transition-colors">
                Pricing
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/login" className="text-xs text-gray-600 hover:text-gray-900 transition-colors">
                Sign In
              </Link>
              <Link
                href="/auth/signup"
                className="text-xs bg-gray-900 text-white px-4 py-1.5 rounded-full hover:bg-gray-800 transition-colors"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero - Cinematic Apple Style */}
      <section className="pt-32 pb-8 px-6">
        <div className="max-w-[980px] mx-auto text-center">
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-semibold text-gray-900 tracking-tight leading-[1.05]">
            Financial Intelligence.
            <br />
            <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              Brilliantly Simple.
            </span>
          </h1>
          <p className="mt-6 text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            One platform for credit, budgeting, investments, and loans. Powered by 300+ AI models.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/signup"
              className="inline-flex items-center justify-center px-7 py-3 rounded-full bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Start Free Trial
            </Link>
            <Link
              href="/credit"
              className="inline-flex items-center justify-center px-7 py-3 rounded-full bg-transparent text-blue-600 text-sm font-medium hover:bg-blue-50 transition-colors"
            >
              Learn more
            </Link>
          </div>
        </div>
      </section>

      {/* Product Grid - Apple Card Style */}
      <section className="py-4 px-6">
        <div className="max-w-[980px] mx-auto">
          <div className="grid md:grid-cols-2 gap-3">
            {products.map((product) => (
              <div
                key={product.title}
                className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${product.gradient} p-8 min-h-[400px] flex flex-col justify-between`}
              >
                <div>
                  <p className="text-white/80 text-sm font-medium">{product.subtitle}</p>
                  <h2 className="text-3xl font-semibold text-white mt-1">{product.title}</h2>
                  <p className="text-white/80 text-base mt-3 max-w-xs">{product.description}</p>
                </div>
                <div className="flex gap-3 mt-6">
                  <Link
                    href="/auth/signup"
                    className="text-sm font-medium text-white bg-white/20 backdrop-blur-sm px-5 py-2 rounded-full hover:bg-white/30 transition-colors"
                  >
                    Get Started
                  </Link>
                  <Link
                    href={product.href}
                    className="text-sm font-medium text-white hover:text-white/80 transition-colors flex items-center"
                  >
                    Learn more
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Credit Section */}
      <section id="credit" className="py-24 px-6 bg-white">
        <div className="max-w-[980px] mx-auto">
          <div className="text-center mb-16">
            <p className="text-blue-600 text-sm font-medium mb-2">Credit Intelligence</p>
            <h2 className="text-4xl sm:text-5xl font-semibold text-gray-900 tracking-tight">
              Your credit score,
              <br />
              elevated.
            </h2>
            <p className="mt-4 text-lg text-gray-600 max-w-xl mx-auto">
              Monitor all three bureaus, dispute errors with AI-generated letters, and watch your
              score climb.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.credit.map((feature) => (
              <div key={feature.title} className="text-center p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-600">{feature.desc}</p>
              </div>
            ))}
          </div>

          {/* Score Display Mock */}
          <div className="mt-16 bg-gradient-to-br from-gray-50 to-gray-100 rounded-3xl p-8 sm:p-12">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-8">
              <div>
                <p className="text-sm text-gray-500 mb-1">Your Credit Score</p>
                <p className="text-7xl font-semibold text-gray-900">742</p>
                <p className="text-green-600 text-sm font-medium mt-2">↑ 28 points this month</p>
              </div>
              <div className="flex gap-8">
                <div className="text-center">
                  <p className="text-3xl font-semibold text-gray-900">738</p>
                  <p className="text-xs text-gray-500 mt-1">Experian</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-semibold text-gray-900">745</p>
                  <p className="text-xs text-gray-500 mt-1">Equifax</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-semibold text-gray-900">743</p>
                  <p className="text-xs text-gray-500 mt-1">TransUnion</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Financial Section */}
      <section id="financial" className="py-24 px-6 bg-[#fbfbfd]">
        <div className="max-w-[980px] mx-auto">
          <div className="text-center mb-16">
            <p className="text-emerald-600 text-sm font-medium mb-2">Financial Hub</p>
            <h2 className="text-4xl sm:text-5xl font-semibold text-gray-900 tracking-tight">
              Every dollar,
              <br />
              accounted for.
            </h2>
            <p className="mt-4 text-lg text-gray-600 max-w-xl mx-auto">
              Intelligent budgeting that learns your habits. Debt strategies that actually work.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.financial.map((feature) => (
              <div key={feature.title} className="text-center p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-600">{feature.desc}</p>
              </div>
            ))}
          </div>

          {/* Budget Display Mock */}
          <div className="mt-16 bg-white rounded-3xl p-8 sm:p-12 shadow-sm border border-gray-100">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-8">
              <div>
                <p className="text-sm text-gray-500 mb-1">Net Worth</p>
                <p className="text-5xl font-semibold text-gray-900">$124,350</p>
                <p className="text-emerald-600 text-sm font-medium mt-2">↑ $3,240 this month</p>
              </div>
              <div className="flex gap-8">
                <div className="text-center">
                  <p className="text-2xl font-semibold text-gray-900">$8,420</p>
                  <p className="text-xs text-gray-500 mt-1">Income</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-semibold text-gray-900">$5,180</p>
                  <p className="text-xs text-gray-500 mt-1">Spending</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-semibold text-emerald-600">$3,240</p>
                  <p className="text-xs text-gray-500 mt-1">Saved</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Investments Section */}
      <section id="invest" className="py-24 px-6 bg-white">
        <div className="max-w-[980px] mx-auto">
          <div className="text-center mb-16">
            <p className="text-purple-600 text-sm font-medium mb-2">Investments</p>
            <h2 className="text-4xl sm:text-5xl font-semibold text-gray-900 tracking-tight">
              Your portfolio,
              <br />
              professional-grade.
            </h2>
            <p className="mt-4 text-lg text-gray-600 max-w-xl mx-auto">
              Track, analyze, and optimize your investments with institutional-level tools.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.invest.map((feature) => (
              <div key={feature.title} className="text-center p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-600">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Student Loans Section */}
      <section id="loans" className="py-24 px-6 bg-[#fbfbfd]">
        <div className="max-w-[980px] mx-auto">
          <div className="text-center mb-16">
            <p className="text-orange-600 text-sm font-medium mb-2">Student Loans</p>
            <h2 className="text-4xl sm:text-5xl font-semibold text-gray-900 tracking-tight">
              Student debt,
              <br />
              strategically managed.
            </h2>
            <p className="mt-4 text-lg text-gray-600 max-w-xl mx-auto">
              Navigate forgiveness programs, optimize repayment, and track every qualifying payment.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.loans.map((feature) => (
              <div key={feature.title} className="text-center p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-600">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Section */}
      <section className="py-24 px-6 bg-gray-900">
        <div className="max-w-[980px] mx-auto text-center">
          <p className="text-blue-400 text-sm font-medium mb-2">Powered by AI</p>
          <h2 className="text-4xl sm:text-5xl font-semibold text-white tracking-tight">
            300+ AI models.
            <br />
            One intelligent platform.
          </h2>
          <p className="mt-4 text-lg text-gray-400 max-w-xl mx-auto">
            Claude, GPT-4, Gemini, and more — automatically routed for the best results.
          </p>

          <div className="mt-16 grid sm:grid-cols-3 gap-8">
            <div>
              <p className="text-4xl font-semibold text-white">24/7</p>
              <p className="text-gray-400 text-sm mt-2">AI Financial Coach</p>
            </div>
            <div>
              <p className="text-4xl font-semibold text-white">300+</p>
              <p className="text-gray-400 text-sm mt-2">AI Models Available</p>
            </div>
            <div>
              <p className="text-4xl font-semibold text-white">&lt;1s</p>
              <p className="text-gray-400 text-sm mt-2">Average Response Time</p>
            </div>
          </div>
        </div>
      </section>

      {/* Mobile App Section */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-[980px] mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-gray-500 text-sm font-medium mb-2">Mobile App</p>
              <h2 className="text-4xl sm:text-5xl font-semibold text-gray-900 tracking-tight">
                CPFI in
                <br />
                your pocket.
              </h2>
              <p className="mt-4 text-lg text-gray-600">
                Full-featured iOS and Android apps. Real-time alerts, document scanning, and AI chat
                — wherever you are.
              </p>

              <div className="mt-8 flex gap-4">
                <button className="flex items-center gap-3 px-5 py-3 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 22 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.09997 22C7.78997 22.05 6.79997 20.68 5.95997 19.47C4.24997 17 2.93997 12.45 4.69997 9.39C5.56997 7.87 7.12997 6.91 8.81997 6.88C10.1 6.86 11.32 7.75 12.11 7.75C12.89 7.75 14.37 6.68 15.92 6.84C16.57 6.87 18.39 7.1 19.56 8.82C19.47 8.88 17.39 10.1 17.41 12.63C17.44 15.65 20.06 16.66 20.09 16.67C20.06 16.74 19.67 18.11 18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z" />
                  </svg>
                  <div className="text-left">
                    <p className="text-[10px] text-gray-400">Download on the</p>
                    <p className="text-sm font-medium">App Store</p>
                  </div>
                </button>
                <button className="flex items-center gap-3 px-5 py-3 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 20.5V3.5C3 2.91 3.34 2.39 3.84 2.15L13.69 12L3.84 21.85C3.34 21.6 3 21.09 3 20.5ZM16.81 15.12L6.05 21.34L14.54 12.85L16.81 15.12ZM20.16 10.81C20.5 11.08 20.75 11.5 20.75 12C20.75 12.5 20.53 12.9 20.18 13.18L17.89 14.5L15.39 12L17.89 9.5L20.16 10.81ZM6.05 2.66L16.81 8.88L14.54 11.15L6.05 2.66Z" />
                  </svg>
                  <div className="text-left">
                    <p className="text-[10px] text-gray-400">Get it on</p>
                    <p className="text-sm font-medium">Google Play</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Phone Mockup */}
            <div className="flex justify-center">
              <div className="relative w-64 h-[520px] bg-gray-900 rounded-[3rem] p-3 shadow-2xl">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-gray-900 rounded-b-2xl"></div>
                <div className="w-full h-full bg-gradient-to-b from-blue-600 to-purple-600 rounded-[2.25rem] overflow-hidden">
                  <div className="p-6 pt-10">
                    <p className="text-white/80 text-xs">Good morning</p>
                    <p className="text-white text-xl font-semibold mt-1">Your Score</p>
                    <p className="text-white text-6xl font-bold mt-4">742</p>
                    <p className="text-green-300 text-sm mt-2">↑ 12 pts this month</p>

                    <div className="mt-8 space-y-3">
                      <div className="bg-white/10 backdrop-blur rounded-xl p-4">
                        <div className="flex justify-between">
                          <span className="text-white/80 text-xs">Net Worth</span>
                          <span className="text-white text-sm font-medium">$124,350</span>
                        </div>
                      </div>
                      <div className="bg-white/10 backdrop-blur rounded-xl p-4">
                        <div className="flex justify-between">
                          <span className="text-white/80 text-xs">This Month</span>
                          <span className="text-green-300 text-sm font-medium">+$2,430</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-6 bg-[#fbfbfd]">
        <div className="max-w-[980px] mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-semibold text-gray-900 tracking-tight">
              Simple pricing.
              <br />
              No surprises.
            </h2>
            <p className="mt-4 text-lg text-gray-600">Start free. Upgrade when you&apos;re ready.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {pricing.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl p-8 ${
                  plan.featured
                    ? 'bg-gray-900 text-white ring-2 ring-gray-900'
                    : 'bg-white border border-gray-200'
                }`}
              >
                <h3 className={`text-lg font-semibold ${plan.featured ? 'text-white' : 'text-gray-900'}`}>
                  {plan.name}
                </h3>
                <div className="mt-4">
                  <span className={`text-4xl font-semibold ${plan.featured ? 'text-white' : 'text-gray-900'}`}>
                    {plan.price}
                  </span>
                  <span className={`text-sm ${plan.featured ? 'text-gray-400' : 'text-gray-500'}`}>/month</span>
                </div>
                <p className={`mt-2 text-sm ${plan.featured ? 'text-gray-400' : 'text-gray-600'}`}>
                  {plan.description}
                </p>

                <ul className="mt-8 space-y-3">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className={`flex items-center gap-2 text-sm ${
                        plan.featured ? 'text-gray-300' : 'text-gray-600'
                      }`}
                    >
                      <svg
                        className={`w-4 h-4 ${plan.featured ? 'text-blue-400' : 'text-blue-600'}`}
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
                  href="/auth/signup"
                  className={`mt-8 block w-full py-3 text-center text-sm font-medium rounded-full transition-colors ${
                    plan.featured
                      ? 'bg-white text-gray-900 hover:bg-gray-100'
                      : 'bg-gray-900 text-white hover:bg-gray-800'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-[980px] mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl font-semibold text-gray-900 tracking-tight">
            Ready to take control?
          </h2>
          <p className="mt-4 text-lg text-gray-600 max-w-xl mx-auto">
            Join thousands who&apos;ve transformed their financial lives with CPFI.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/signup"
              className="inline-flex items-center justify-center px-8 py-4 rounded-full bg-blue-600 text-white text-base font-medium hover:bg-blue-700 transition-colors"
            >
              Start Free Trial
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center px-8 py-4 rounded-full bg-transparent text-blue-600 text-base font-medium hover:bg-blue-50 transition-colors border border-blue-600"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </section>

      {/* Footer - Apple Style */}
      <footer className="py-8 px-6 bg-[#f5f5f7] border-t border-gray-200">
        <div className="max-w-[980px] mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 pb-8">
            <div>
              <p className="text-xs font-semibold text-gray-900 mb-3">Product</p>
              <ul className="space-y-2">
                <li>
                  <Link href="/credit" className="text-xs text-gray-600 hover:text-gray-900">
                    Credit
                  </Link>
                </li>
                <li>
                  <Link href="/financial-hub" className="text-xs text-gray-600 hover:text-gray-900">
                    Financial
                  </Link>
                </li>
                <li>
                  <Link href="/invest" className="text-xs text-gray-600 hover:text-gray-900">
                    Investments
                  </Link>
                </li>
                <li>
                  <Link href="/loans" className="text-xs text-gray-600 hover:text-gray-900">
                    Student Loans
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-900 mb-3">Resources</p>
              <ul className="space-y-2">
                <li>
                  <Link href="/help" className="text-xs text-gray-600 hover:text-gray-900">
                    Help Center
                  </Link>
                </li>
                <li>
                  <Link href="/pricing" className="text-xs text-gray-600 hover:text-gray-900">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link href="/faq" className="text-xs text-gray-600 hover:text-gray-900">
                    FAQ
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-900 mb-3">Company</p>
              <ul className="space-y-2">
                <li>
                  <Link href="/about" className="text-xs text-gray-600 hover:text-gray-900">
                    About
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="text-xs text-gray-600 hover:text-gray-900">
                    Contact
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-900 mb-3">Legal</p>
              <ul className="space-y-2">
                <li>
                  <Link href="/privacy" className="text-xs text-gray-600 hover:text-gray-900">
                    Privacy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="text-xs text-gray-600 hover:text-gray-900">
                    Terms
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-900 mb-3">Connect</p>
              <ul className="space-y-2">
                <li>
                  <a href="#" className="text-xs text-gray-600 hover:text-gray-900">
                    Twitter
                  </a>
                </li>
                <li>
                  <a href="#" className="text-xs text-gray-600 hover:text-gray-900">
                    LinkedIn
                  </a>
                </li>
                <li>
                  <a href="#" className="text-xs text-gray-600 hover:text-gray-900">
                    GitHub
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-6 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs text-gray-500">© 2025 CPFI. All rights reserved.</p>
            <div className="flex gap-6 text-xs text-gray-500">
              <span>256-bit Encryption</span>
              <span>SOC 2 Certified</span>
              <span>GDPR Compliant</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
