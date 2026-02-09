import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Student Loans | Fynvita',
  description:
    'Navigate student loan repayment with AI-powered strategies and federal program guidance.',
};

export default function LoansPage() {
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
                className="text-xs text-gray-600 hover:text-gray-900 dark:text-white dark:hover:text-white transition-colors"
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
                className="text-xs text-orange-600 font-medium"
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
          <p className="text-orange-600 font-medium text-sm tracking-wide uppercase mb-4">
            Student Loans
          </p>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-semibold text-gray-900 dark:text-white tracking-tight leading-[1.05] mb-6">
            Conquer your
            <br />
            <span className="bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
              student debt.
            </span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-slate-300 max-w-2xl mx-auto mb-8 leading-relaxed">
            Navigate federal programs, optimize repayment strategies, and work
            toward forgiveness with AI-powered guidance.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/auth/signup"
              className="text-lg bg-orange-500 text-white px-8 py-4 rounded-full hover:bg-orange-600 transition-colors font-medium"
            >
              Start Free Trial
            </Link>
            <Link
              href="#features"
              className="text-lg text-orange-600 px-8 py-4 rounded-full hover:bg-orange-50 transition-colors font-medium"
            >
              Learn more
            </Link>
          </div>
        </div>
      </section>

      {/* Loan Overview */}
      <section className="py-16 bg-white dark:bg-slate-800">
        <div className="max-w-[980px] mx-auto px-6">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-8 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 to-amber-500/20"></div>
            <div className="relative">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div>
                  <h2 className="text-3xl font-semibold text-white mb-4">
                    See Your Full Picture
                  </h2>
                  <p className="text-gray-400 dark:text-slate-500 mb-6">
                    Import all your student loans and get a complete view of
                    your debt, interest rates, and repayment timeline.
                  </p>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-orange-500/20 rounded-lg flex items-center justify-center">
                        <svg
                          className="w-5 h-5 text-orange-400"
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
                      <span className="text-gray-300">
                        Federal & private loans
                      </span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-orange-500/20 rounded-lg flex items-center justify-center">
                        <svg
                          className="w-5 h-5 text-orange-400"
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
                      <span className="text-gray-300">
                        Automatic sync with servicers
                      </span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-orange-500/20 rounded-lg flex items-center justify-center">
                        <svg
                          className="w-5 h-5 text-orange-400"
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
                      <span className="text-gray-300">
                        Real-time interest tracking
                      </span>
                    </div>
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-800/10 backdrop-blur rounded-xl p-6">
                  <div className="text-center mb-6">
                    <p className="text-gray-400 dark:text-slate-500 text-sm mb-2">Total Balance</p>
                    <p className="text-4xl font-bold text-white">$67,840</p>
                    <p className="text-orange-400 text-sm mt-2">
                      4.5% weighted avg rate
                    </p>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300 text-sm">
                        Federal Direct
                      </span>
                      <span className="text-white font-medium">$52,340</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300 text-sm">
                        Federal Grad PLUS
                      </span>
                      <span className="text-white font-medium">$12,500</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300 text-sm">
                        Private Loan
                      </span>
                      <span className="text-white font-medium">$3,000</span>
                    </div>
                  </div>
                </div>
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
              Everything for student loans.
            </h2>
            <p className="text-xl text-gray-600 dark:text-slate-300">
              AI-powered tools to help you become debt-free faster.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-8 shadow-sm border border-gray-100 dark:border-slate-700">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-6">
                <svg
                  className="w-6 h-6 text-orange-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                Federal Program Navigator
              </h3>
              <p className="text-gray-600 dark:text-slate-300 leading-relaxed">
                Find the best federal repayment plan for your situation with AI
                recommendations.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-8 shadow-sm border border-gray-100 dark:border-slate-700">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mb-6">
                <svg
                  className="w-6 h-6 text-amber-600"
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
                PSLF Tracker
              </h3>
              <p className="text-gray-600 dark:text-slate-300 leading-relaxed">
                Track your progress toward Public Service Loan Forgiveness with
                qualifying payment monitoring.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-8 shadow-sm border border-gray-100 dark:border-slate-700">
              <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center mb-6">
                <svg
                  className="w-6 h-6 text-yellow-600"
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
                Repayment Calculator
              </h3>
              <p className="text-gray-600 dark:text-slate-300 leading-relaxed">
                Compare different repayment strategies and see exactly how much
                you&apos;ll pay.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-8 shadow-sm border border-gray-100 dark:border-slate-700">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mb-6">
                <svg
                  className="w-6 h-6 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                IDR Optimizer
              </h3>
              <p className="text-gray-600 dark:text-slate-300 leading-relaxed">
                Optimize Income-Driven Repayment plans to minimize total
                payments over time.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-8 shadow-sm border border-gray-100 dark:border-slate-700">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-6">
                <svg
                  className="w-6 h-6 text-orange-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                Payment Scheduler
              </h3>
              <p className="text-gray-600 dark:text-slate-300 leading-relaxed">
                Never miss a payment with automated reminders and payment
                scheduling.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-8 shadow-sm border border-gray-100 dark:border-slate-700">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mb-6">
                <svg
                  className="w-6 h-6 text-amber-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                Recertification Reminders
              </h3>
              <p className="text-gray-600 dark:text-slate-300 leading-relaxed">
                Get reminded when it&apos;s time to recertify your income for
                IDR plans.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Federal Programs */}
      <section className="py-20 bg-white dark:bg-slate-800">
        <div className="max-w-[980px] mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-semibold text-gray-900 dark:text-white tracking-tight mb-4">
              Navigate federal programs.
            </h2>
            <p className="text-xl text-gray-600 dark:text-slate-300">
              We help you find and qualify for the best repayment options.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-8">
              <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                Income-Driven Plans
              </h3>
              <ul className="space-y-3">
                <li className="flex items-start space-x-3">
                  <div className="w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center mt-0.5">
                    <svg
                      className="w-3 h-3 text-white"
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
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">SAVE Plan</p>
                    <p className="text-sm text-gray-600 dark:text-slate-300">
                      Lowest payments for most borrowers
                    </p>
                  </div>
                </li>
                <li className="flex items-start space-x-3">
                  <div className="w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center mt-0.5">
                    <svg
                      className="w-3 h-3 text-white"
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
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">PAYE</p>
                    <p className="text-sm text-gray-600 dark:text-slate-300">
                      Pay as you earn program
                    </p>
                  </div>
                </li>
                <li className="flex items-start space-x-3">
                  <div className="w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center mt-0.5">
                    <svg
                      className="w-3 h-3 text-white"
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
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">IBR</p>
                    <p className="text-sm text-gray-600 dark:text-slate-300">
                      Income-based repayment
                    </p>
                  </div>
                </li>
              </ul>
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl p-8">
              <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                Forgiveness Programs
              </h3>
              <ul className="space-y-3">
                <li className="flex items-start space-x-3">
                  <div className="w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center mt-0.5">
                    <svg
                      className="w-3 h-3 text-white"
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
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">PSLF</p>
                    <p className="text-sm text-gray-600 dark:text-slate-300">
                      Public Service Loan Forgiveness
                    </p>
                  </div>
                </li>
                <li className="flex items-start space-x-3">
                  <div className="w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center mt-0.5">
                    <svg
                      className="w-3 h-3 text-white"
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
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      Teacher Loan Forgiveness
                    </p>
                    <p className="text-sm text-gray-600 dark:text-slate-300">
                      Up to $17,500 forgiven
                    </p>
                  </div>
                </li>
                <li className="flex items-start space-x-3">
                  <div className="w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center mt-0.5">
                    <svg
                      className="w-3 h-3 text-white"
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
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">IDR Forgiveness</p>
                    <p className="text-sm text-gray-600 dark:text-slate-300">
                      After 20-25 years of payments
                    </p>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 bg-[#fbfbfd]">
        <div className="max-w-[980px] mx-auto px-6">
          <div className="grid grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-5xl font-semibold text-gray-900 dark:text-white mb-2">
                $1.7T
              </div>
              <p className="text-gray-600 dark:text-slate-300">Total US Student Debt</p>
            </div>
            <div>
              <div className="text-5xl font-semibold text-gray-900 dark:text-white mb-2">
                43M+
              </div>
              <p className="text-gray-600 dark:text-slate-300">Borrowers Nationwide</p>
            </div>
            <div>
              <div className="text-5xl font-semibold text-gray-900 dark:text-white mb-2">
                $28K
              </div>
              <p className="text-gray-600 dark:text-slate-300">Average Debt Per Borrower</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gray-900">
        <div className="max-w-[980px] mx-auto px-6 text-center">
          <h2 className="text-4xl font-semibold text-white tracking-tight mb-4">
            Take control of your student loans.
          </h2>
          <p className="text-xl text-gray-400 dark:text-slate-500 mb-8 max-w-2xl mx-auto">
            Join thousands of borrowers who are on the path to becoming
            debt-free.
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
                    href="/student-loan-agent"
                    className="text-xs text-gray-600 hover:text-gray-900 dark:text-white dark:hover:text-white"
                  >
                    AI Agent
                  </Link>
                </li>
                <li>
                  <Link
                    href="/student-loans"
                    className="text-xs text-gray-600 hover:text-gray-900 dark:text-white dark:hover:text-white"
                  >
                    Calculator
                  </Link>
                </li>
                <li>
                  <Link
                    href="/student-loans"
                    className="text-xs text-gray-600 hover:text-gray-900 dark:text-white dark:hover:text-white"
                  >
                    Programs
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
