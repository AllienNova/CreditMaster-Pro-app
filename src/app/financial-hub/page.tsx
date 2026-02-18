import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Financial Hub | Fynvita",
  description:
    "Complete financial management with budgeting, expense tracking, and goal planning.",
};

export default function FinancialHubPage() {
  return (
    <div className="min-h-screen bg-[#fbfbfd]">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-[#fbfbfd]/80 backdrop-blur-xl border-b border-gray-200 dark:border-slate-700/50">
        <div className="max-w-[980px] mx-auto px-6">
          <div className="flex justify-between items-center h-12">
            <Link
              href="/"
              className="text-xl font-semibold text-gray-900 dark:text-white tracking-tight"
            >
              Fynvita
            </Link>
            <div className="hidden md:flex items-center space-x-8">
              <Link
                href="/credit"
                className="text-xs text-gray-600 hover:text-gray-900 dark:text-white dark:hover:text-white transition-colors"
              >
                Credit
              </Link>
              <Link
                href="/financial-hub"
                className="text-xs text-green-600 font-medium"
              >
                Financial
              </Link>
              <Link
                href="/invest"
                className="text-xs text-gray-600 hover:text-gray-900 dark:text-white dark:hover:text-white transition-colors"
              >
                Invest
              </Link>
              <Link
                href="/loans"
                className="text-xs text-gray-600 hover:text-gray-900 dark:text-white dark:hover:text-white transition-colors"
              >
                Student Loans
              </Link>
              <Link
                href="/pricing"
                className="text-xs text-gray-600 hover:text-gray-900 dark:text-white dark:hover:text-white transition-colors"
              >
                Pricing
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/auth/login"
                className="text-xs text-gray-600 hover:text-gray-900 dark:text-white dark:hover:text-white transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/auth/signup"
                className="text-xs bg-gray-900 text-white px-4 py-2 rounded-full hover:bg-gray-800 transition-colors"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20">
        <div className="max-w-[980px] mx-auto px-6 text-center">
          <p className="text-green-600 font-medium text-sm tracking-wide uppercase mb-4">
            Financial Hub
          </p>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-semibold text-gray-900 dark:text-white tracking-tight leading-[1.05] mb-6">
            Take control of
            <br />
            <span className="bg-gradient-to-r from-green-600 to-emerald-500 bg-clip-text text-transparent">
              your money.
            </span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-slate-300 max-w-2xl mx-auto mb-8 leading-relaxed">
            Track spending, create budgets, set goals, and build the financial
            future you deserve with intelligent automation.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/auth/signup"
              className="text-lg bg-green-600 text-white px-8 py-4 rounded-full hover:bg-green-700 transition-colors font-medium"
            >
              Start Free Trial
            </Link>
            <Link
              href="#features"
              className="text-lg text-green-600 px-8 py-4 rounded-full hover:bg-green-50 transition-colors font-medium"
            >
              Learn more
            </Link>
          </div>
        </div>
      </section>

      {/* Dashboard Preview */}
      <section className="py-16 bg-white dark:bg-slate-800">
        <div className="max-w-[980px] mx-auto px-6">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-8 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-green-600/20 to-emerald-500/20"></div>
            <div className="relative grid md:grid-cols-3 gap-6">
              {/* Net Worth Card */}
              <div className="bg-white dark:bg-slate-800/10 backdrop-blur rounded-xl p-6">
                <p className="text-green-400 text-sm mb-2">Net Worth</p>
                <p className="text-3xl font-bold text-white">$124,500</p>
                <p className="text-green-400 text-sm mt-2">+12.3% this year</p>
              </div>
              {/* Monthly Savings Card */}
              <div className="bg-white dark:bg-slate-800/10 backdrop-blur rounded-xl p-6">
                <p className="text-emerald-400 text-sm mb-2">Monthly Savings</p>
                <p className="text-3xl font-bold text-white">$2,840</p>
                <p className="text-emerald-400 text-sm mt-2">32% of income</p>
              </div>
              {/* Goals Progress Card */}
              <div className="bg-white dark:bg-slate-800/10 backdrop-blur rounded-xl p-6">
                <p className="text-teal-400 text-sm mb-2">Goals Progress</p>
                <p className="text-3xl font-bold text-white">78%</p>
                <p className="text-teal-400 text-sm mt-2">On track</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20">
        <div className="max-w-[980px] mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-semibold text-gray-900 dark:text-white tracking-tight mb-4">
              Everything for your financial life.
            </h2>
            <p className="text-xl text-gray-600 dark:text-slate-300">
              Powerful tools that make managing money effortless.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-8 shadow-sm border border-gray-100 dark:border-slate-700">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-6">
                <svg
                  className="w-6 h-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                Smart Budgeting
              </h3>
              <p className="text-gray-600 dark:text-slate-300 leading-relaxed">
                AI-powered budgets that adapt to your spending patterns and help
                you save more.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-8 shadow-sm border border-gray-100 dark:border-slate-700">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-6">
                <svg
                  className="w-6 h-6 text-emerald-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                Expense Tracking
              </h3>
              <p className="text-gray-600 dark:text-slate-300 leading-relaxed">
                Automatic categorization of transactions with insights into
                spending habits.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-8 shadow-sm border border-gray-100 dark:border-slate-700">
              <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center mb-6">
                <svg
                  className="w-6 h-6 text-teal-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                Goal Planning
              </h3>
              <p className="text-gray-600 dark:text-slate-300 leading-relaxed">
                Set savings goals and track progress with smart projections and
                milestones.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-8 shadow-sm border border-gray-100 dark:border-slate-700">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-6">
                <svg
                  className="w-6 h-6 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                Bill Management
              </h3>
              <p className="text-gray-600 dark:text-slate-300 leading-relaxed">
                Never miss a payment with automated reminders and bill tracking.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-8 shadow-sm border border-gray-100 dark:border-slate-700">
              <div className="w-12 h-12 bg-lime-100 rounded-xl flex items-center justify-center mb-6">
                <svg
                  className="w-6 h-6 text-lime-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                Cash Flow Analysis
              </h3>
              <p className="text-gray-600 dark:text-slate-300 leading-relaxed">
                Visualize your money flow and identify opportunities to
                optimize.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-8 shadow-sm border border-gray-100 dark:border-slate-700">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-6">
                <svg
                  className="w-6 h-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                Debt Optimizer
              </h3>
              <p className="text-gray-600 dark:text-slate-300 leading-relaxed">
                AI strategies to pay off debt faster using avalanche or snowball
                methods.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Account Connection */}
      <section className="py-20 bg-white dark:bg-slate-800">
        <div className="max-w-[980px] mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-semibold text-gray-900 dark:text-white tracking-tight mb-6">
                All your accounts.
                <br />
                One place.
              </h2>
              <p className="text-xl text-gray-600 dark:text-slate-300 mb-8 leading-relaxed">
                Connect your bank accounts, credit cards, loans, and investments
                for a complete picture of your finances.
              </p>
              <ul className="space-y-4">
                <li className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <span className="text-gray-700 dark:text-slate-200">
                    Bank-level security (256-bit encryption)
                  </span>
                </li>
                <li className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <span className="text-gray-700 dark:text-slate-200">
                    12,000+ financial institutions
                  </span>
                </li>
                <li className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <span className="text-gray-700 dark:text-slate-200">
                    Real-time balance updates
                  </span>
                </li>
              </ul>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-8">
              <div className="space-y-4">
                <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm flex items-center space-x-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <span className="text-xl"></span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white">
                      Chase Checking
                    </p>
                    <p className="text-sm text-gray-600 dark:text-slate-300">
                      $8,234.56
                    </p>
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm flex items-center space-x-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <span className="text-xl"></span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white">
                      Amex Platinum
                    </p>
                    <p className="text-sm text-gray-600 dark:text-slate-300">
                      -$2,150.00
                    </p>
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm flex items-center space-x-4">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <span className="text-xl"></span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white">
                      Fidelity 401(k)
                    </p>
                    <p className="text-sm text-gray-600 dark:text-slate-300">
                      $45,678.90
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gray-900">
        <div className="max-w-[980px] mx-auto px-6 text-center">
          <h2 className="text-4xl font-semibold text-white tracking-tight mb-4">
            Start building your wealth today.
          </h2>
          <p className="text-xl text-gray-400 dark:text-slate-500 mb-8 max-w-2xl mx-auto">
            Join thousands of users who have transformed their financial lives
            with Fynvita.
          </p>
          <Link
            href="/auth/signup"
            className="inline-block text-lg bg-white text-gray-900 dark:text-white px-8 py-4 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 dark:bg-slate-800 transition-colors font-medium"
          >
            Get Started Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#f5f5f7] py-12">
        <div className="max-w-[980px] mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-8">
            <div>
              <h4 className="text-xs font-semibold text-gray-900 dark:text-white mb-4">
                Product
              </h4>
              <ul className="space-y-3">
                <li>
                  <Link
                    href="/credit"
                    className="text-xs text-gray-600 hover:text-gray-900 dark:text-white dark:hover:text-white"
                  >
                    Credit
                  </Link>
                </li>
                <li>
                  <Link
                    href="/financial-hub"
                    className="text-xs text-gray-600 hover:text-gray-900 dark:text-white dark:hover:text-white"
                  >
                    Financial
                  </Link>
                </li>
                <li>
                  <Link
                    href="/invest"
                    className="text-xs text-gray-600 hover:text-gray-900 dark:text-white dark:hover:text-white"
                  >
                    Invest
                  </Link>
                </li>
                <li>
                  <Link
                    href="/loans"
                    className="text-xs text-gray-600 hover:text-gray-900 dark:text-white dark:hover:text-white"
                  >
                    Student Loans
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-gray-900 dark:text-white mb-4">
                Features
              </h4>
              <ul className="space-y-3">
                <li>
                  <Link
                    href="/financial/accounts"
                    className="text-xs text-gray-600 hover:text-gray-900 dark:text-white dark:hover:text-white"
                  >
                    Accounts
                  </Link>
                </li>
                <li>
                  <Link
                    href="/financial/goals"
                    className="text-xs text-gray-600 hover:text-gray-900 dark:text-white dark:hover:text-white"
                  >
                    Goals
                  </Link>
                </li>
                <li>
                  <Link
                    href="/financial/cash-flow"
                    className="text-xs text-gray-600 hover:text-gray-900 dark:text-white dark:hover:text-white"
                  >
                    Cash Flow
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-gray-900 dark:text-white mb-4">
                Company
              </h4>
              <ul className="space-y-3">
                <li>
                  <Link
                    href="/about"
                    className="text-xs text-gray-600 hover:text-gray-900 dark:text-white dark:hover:text-white"
                  >
                    About
                  </Link>
                </li>
                <li>
                  <Link
                    href="/pricing"
                    className="text-xs text-gray-600 hover:text-gray-900 dark:text-white dark:hover:text-white"
                  >
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link
                    href="/contact"
                    className="text-xs text-gray-600 hover:text-gray-900 dark:text-white dark:hover:text-white"
                  >
                    Contact
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-gray-900 dark:text-white mb-4">
                Legal
              </h4>
              <ul className="space-y-3">
                <li>
                  <Link
                    href="/privacy"
                    className="text-xs text-gray-600 hover:text-gray-900 dark:text-white dark:hover:text-white"
                  >
                    Privacy
                  </Link>
                </li>
                <li>
                  <Link
                    href="/terms"
                    className="text-xs text-gray-600 hover:text-gray-900 dark:text-white dark:hover:text-white"
                  >
                    Terms
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-gray-900 dark:text-white mb-4">
                Support
              </h4>
              <ul className="space-y-3">
                <li>
                  <Link
                    href="/help"
                    className="text-xs text-gray-600 hover:text-gray-900 dark:text-white dark:hover:text-white"
                  >
                    Help Center
                  </Link>
                </li>
                <li>
                  <Link
                    href="/faq"
                    className="text-xs text-gray-600 hover:text-gray-900 dark:text-white dark:hover:text-white"
                  >
                    FAQ
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-gray-300 dark:border-slate-600">
            <p className="text-xs text-gray-600 dark:text-slate-300 text-center">
              Copyright &copy; {new Date().getFullYear()} Fynvita. All rights
              reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
