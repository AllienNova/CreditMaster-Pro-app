import Link from "next/link";
import type { Metadata } from "next";
import Header from "@/components/ui/Header";
import Footer from "@/components/ui/Footer";

export const metadata: Metadata = {
  title: "Features - Fynvita | Complete Financial Wellness Platform",
  description:
    "Explore Fynvita's comprehensive suite: AI-powered credit health, financial wellness, investment intelligence, tax optimization, and student loan management.",
  openGraph: {
    title: "Features - Fynvita",
    description:
      "Every tool you need for complete financial vitality — credit health, budgeting, investing, taxes, and loans.",
  },
};

const featureSections = [
  {
    id: "credit",
    title: "Credit Health",
    subtitle: "Monitor. Repair. Optimize.",
    description:
      "AI-powered credit management across all three bureaus. Real-time monitoring, intelligent dispute generation, and strategic score building — everything you need to take control of your credit.",
    href: "/credit",
    gradient: "from-emerald-600 to-emerald-800",
    iconColor: "text-emerald-500",
    features: [
      {
        title: "Tri-Bureau Monitoring",
        desc: "Track your score across Experian, Equifax, and TransUnion in real time.",
      },
      {
        title: "AI Dispute Letters",
        desc: "Legally-crafted dispute letters powered by 300+ AI models that get results.",
      },
      {
        title: "Score Simulator",
        desc: "See the impact of financial decisions on your score before you act.",
      },
      {
        title: "Credit Building Plans",
        desc: "Personalized roadmaps to systematically improve your credit score.",
      },
      {
        title: "Negative Item Detection",
        desc: "Automatic identification of errors, inaccuracies, and disputable items.",
      },
      {
        title: "Credit Factor Analysis",
        desc: "Understand exactly what's helping and hurting your score.",
      },
    ],
  },
  {
    id: "financial",
    title: "Financial Wellness",
    subtitle: "Budget. Save. Thrive.",
    description:
      "Complete financial wellness with intelligent budgeting, automated savings, debt management, and cash flow forecasting. Your AI-powered financial command center.",
    href: "/financial-hub",
    gradient: "from-blue-600 to-blue-800",
    iconColor: "text-blue-500",
    features: [
      {
        title: "Smart Budgets",
        desc: "AI learns your spending patterns and creates budgets that actually work.",
      },
      {
        title: "Debt Strategies",
        desc: "Avalanche or snowball — optimized payoff plans personalized for you.",
      },
      {
        title: "Savings Automation",
        desc: "Set rules, goals, and automated transfers to grow your savings effortlessly.",
      },
      {
        title: "Cash Flow Forecasting",
        desc: "Predict income and expenses to plan ahead with confidence.",
      },
      {
        title: "Bill Negotiation",
        desc: "AI-assisted negotiation to lower your recurring bills and subscriptions.",
      },
      {
        title: "Spending Insights",
        desc: "Anomaly detection, category breakdowns, and trends over time.",
      },
    ],
  },
  {
    id: "invest",
    title: "Investment Intelligence",
    subtitle: "Analyze. Grow. Prosper.",
    description:
      "Professional-grade investment tools powered by AI. Portfolio analytics, risk assessment, market intelligence, and automated trading — institutional quality for everyone.",
    href: "/invest",
    gradient: "from-emerald-600 to-blue-700",
    iconColor: "text-blue-500",
    features: [
      {
        title: "Portfolio Analytics",
        desc: "Deep insights into your holdings, allocation, and performance metrics.",
      },
      {
        title: "Risk Assessment",
        desc: "Understand your exposure across sectors, geographies, and asset classes.",
      },
      {
        title: "AI Market Intelligence",
        desc: "Real-time analysis and sentiment scoring powered by 300+ models.",
      },
      {
        title: "Paper Trading",
        desc: "Practice strategies risk-free with realistic market simulation.",
      },
      {
        title: "Fractional Investing",
        desc: "Build a diversified portfolio with any amount — no minimums required.",
      },
      {
        title: "Multi-Broker Support",
        desc: "Connect Alpaca, DriveWealth, and more from a single dashboard.",
      },
    ],
  },
  {
    id: "tax",
    title: "Tax Optimization",
    subtitle: "Plan. Save. Prosper.",
    description:
      "AI-powered tax strategies to maximize your savings legally. Bracket optimization, retirement account planning, tax-loss harvesting, and scenario modeling.",
    href: "/tax",
    gradient: "from-blue-700 to-blue-800",
    iconColor: "text-blue-500",
    features: [
      {
        title: "Tax Bracket Optimizer",
        desc: "Strategies to minimize your effective tax rate across income sources.",
      },
      {
        title: "Retirement Maximizer",
        desc: "401(k), IRA, and HSA optimization for maximum tax-advantaged growth.",
      },
      {
        title: "Tax-Loss Harvesting",
        desc: "Offset gains with strategic losses to reduce your tax burden.",
      },
      {
        title: "Scenario Modeler",
        desc: "What-if analysis for major financial decisions and their tax impact.",
      },
      {
        title: "Deduction Finder",
        desc: "AI scans your finances to identify deductions you may be missing.",
      },
      {
        title: "Quarterly Estimates",
        desc: "Accurate estimated tax calculations to avoid penalties.",
      },
    ],
  },
  {
    id: "loans",
    title: "Student Loans",
    subtitle: "Navigate. Optimize. Forgive.",
    description:
      "Smart strategies for federal and private student loan management. Repayment optimization, forgiveness tracking, and refinancing analysis.",
    href: "/loans",
    gradient: "from-emerald-700 to-emerald-900",
    iconColor: "text-emerald-500",
    features: [
      {
        title: "PSLF Tracker",
        desc: "Track qualifying payments and employer certification automatically.",
      },
      {
        title: "IDR Optimizer",
        desc: "Compare all income-driven repayment plans to find your best option.",
      },
      {
        title: "Forgiveness Calculator",
        desc: "See your potential savings under every federal forgiveness program.",
      },
      {
        title: "Refinance Analyzer",
        desc: "Compare private refinancing offers against federal benefits.",
      },
      {
        title: "Repayment Simulator",
        desc: "Model different payment strategies and their long-term impact.",
      },
      {
        title: "Federal Programs Guide",
        desc: "Stay informed about every federal aid and forgiveness opportunity.",
      },
    ],
  },
];

const platformFeatures = [
  {
    title: "300+ AI Models",
    desc: "Powered by AIML API with access to the latest language and analysis models.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
      </svg>
    ),
  },
  {
    title: "Bank-Level Security",
    desc: "256-bit encryption, SOC 2 certified, GDPR compliant, with zero-trust architecture.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
  },
  {
    title: "Real-Time Sync",
    desc: "Plaid-powered bank connections with instant transaction sync and webhook updates.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
      </svg>
    ),
  },
  {
    title: "Mobile Ready",
    desc: "Full-featured Expo/React Native mobile app for iOS and Android.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
      </svg>
    ),
  },
  {
    title: "Smart Notifications",
    desc: "Proactive alerts for credit changes, budget overruns, bill reminders, and opportunities.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
      </svg>
    ),
  },
  {
    title: "Gamification",
    desc: "Vitality scores, achievement badges, streaks, and leaderboards to keep you motivated.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0016.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.023 6.023 0 01-7.54 0" />
      </svg>
    ),
  },
];

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      <Header variant="landing" />

      {/* Hero */}
      <section className="pt-28 pb-16 px-6">
        <div className="max-w-[980px] mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-gray-100 dark:bg-slate-800/80 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium mb-6">
            <span className="bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent font-semibold">
              Everything You Need
            </span>
          </div>
          <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 dark:text-white tracking-tight">
            One platform for
            <br />
            <span className="bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
              complete financial health
            </span>
          </h1>
          <p className="mt-6 text-xl text-gray-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Credit monitoring, financial wellness, investment intelligence, tax
            optimization, and student loan management — all powered by 300+ AI
            models in one unified platform.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/signup"
              className="inline-flex items-center justify-center px-8 py-4 rounded-lg bg-gradient-to-r from-emerald-500 to-blue-500 text-white text-base font-semibold hover:from-emerald-600 hover:to-blue-600 transition-all"
            >
              Get Started Free
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center px-8 py-4 rounded-lg bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 text-base font-semibold hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors border border-gray-200 dark:border-slate-700"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </section>

      {/* Feature Sections */}
      {featureSections.map((section, index) => (
        <section
          key={section.id}
          id={section.id}
          className={`py-20 px-6 ${index % 2 === 0 ? "bg-gray-50 dark:bg-slate-800/30" : "bg-white dark:bg-slate-900"}`}
        >
          <div className="max-w-[980px] mx-auto">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-12">
              <div>
                <p className="text-sm font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-2">
                  {section.subtitle}
                </p>
                <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white tracking-tight">
                  {section.title}
                </h2>
                <p className="mt-3 text-lg text-gray-600 dark:text-slate-400 max-w-xl">
                  {section.description}
                </p>
              </div>
              <Link
                href={section.href}
                className="mt-6 md:mt-0 inline-flex items-center gap-1 text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors shrink-0"
              >
                Explore {section.title}
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {section.features.map((feature) => (
                <div
                  key={feature.title}
                  className="p-6 bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 hover:shadow-md transition-shadow"
                >
                  <div
                    className={`w-8 h-8 rounded-lg bg-gradient-to-br ${section.gradient} flex items-center justify-center mb-4`}
                  >
                    <svg
                      className="w-4 h-4 text-white"
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
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                    {feature.title}
                  </h3>
                  <p className="mt-1 text-sm text-gray-600 dark:text-slate-400 leading-relaxed">
                    {feature.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      ))}

      {/* Platform Features */}
      <section className="py-20 px-6 bg-gradient-to-br from-emerald-50 to-blue-50 dark:from-slate-800 dark:to-slate-900">
        <div className="max-w-[980px] mx-auto">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-2">
              Built for Everyone
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white tracking-tight">
              Platform Capabilities
            </h2>
            <p className="mt-3 text-lg text-gray-600 dark:text-slate-400 max-w-xl mx-auto">
              Enterprise-grade technology that powers every feature across the
              platform.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {platformFeatures.map((feature) => (
              <div
                key={feature.title}
                className="p-6 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl border border-gray-100 dark:border-slate-700"
              >
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-blue-500 text-white flex items-center justify-center mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                  {feature.title}
                </h3>
                <p className="mt-1 text-sm text-gray-600 dark:text-slate-400 leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-white dark:bg-slate-900">
        <div className="max-w-[980px] mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white tracking-tight">
            Ready to take control of your{" "}
            <span className="bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
              financial future
            </span>
            ?
          </h2>
          <p className="mt-4 text-lg text-gray-600 dark:text-slate-400 max-w-xl mx-auto">
            Start free, upgrade anytime. No credit card required.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/signup"
              className="inline-flex items-center justify-center px-8 py-4 rounded-lg bg-gradient-to-r from-emerald-500 to-blue-500 text-white text-base font-semibold hover:from-emerald-600 hover:to-blue-600 transition-all"
            >
              Get Started Free
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center px-8 py-4 rounded-lg bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 text-base font-semibold hover:bg-emerald-50 dark:hover:bg-slate-700 transition-colors border-2 border-emerald-500"
            >
              Compare Plans
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
