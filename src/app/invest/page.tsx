import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Investments | Fynvita",
  description:
    "AI-powered portfolio analysis, stock research, and investment insights.",
};

export default function InvestPage() {
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
                className="text-xs text-blue-600 font-medium"
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
          <p className="text-blue-600 font-medium text-sm tracking-wide uppercase mb-4">
            Investments
          </p>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-semibold text-gray-900 dark:text-white tracking-tight leading-[1.05] mb-6">
            Invest smarter.
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-emerald-500 bg-clip-text text-transparent">
              Powered by AI.
            </span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-slate-300 max-w-2xl mx-auto mb-8 leading-relaxed">
            Research stocks, analyze portfolios, and get AI-powered insights to
            make better investment decisions.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/auth/signup"
              className="text-lg bg-blue-600 text-white px-8 py-4 rounded-full hover:bg-blue-700 transition-colors font-medium"
            >
              Start Free Trial
            </Link>
            <Link
              href="#features"
              className="text-lg text-blue-600 px-8 py-4 rounded-full hover:bg-blue-50 transition-colors font-medium"
            >
              Learn more
            </Link>
          </div>
        </div>
      </section>

      {/* Portfolio Preview */}
      <section className="py-16 bg-white dark:bg-slate-800">
        <div className="max-w-[980px] mx-auto px-6">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-8 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-emerald-500/20"></div>
            <div className="relative">
              {/* Chart Placeholder */}
              <div className="bg-white dark:bg-slate-800/5 backdrop-blur rounded-xl p-6 mb-6">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <p className="text-gray-400 dark:text-slate-500 text-sm">
                      Portfolio Value
                    </p>
                    <p className="text-4xl font-bold text-white">$248,567.89</p>
                  </div>
                  <div className="text-right">
                    <p className="text-green-400 text-lg font-medium">
                      +$12,456.78
                    </p>
                    <p className="text-green-400 text-sm">+5.27% today</p>
                  </div>
                </div>
                {/* Simulated Chart */}
                <div className="h-32 flex items-end space-x-1">
                  {[40, 55, 45, 60, 70, 65, 80, 75, 85, 90, 88, 95].map(
                    (height, i) => (
                      <div
                        key={i}
                        className="flex-1 bg-gradient-to-t from-blue-500 to-emerald-400 rounded-t"
                        style={{ height: `${height}%` }}
                      ></div>
                    ),
                  )}
                </div>
              </div>

              {/* Holdings */}
              <div className="grid md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-800/10 backdrop-blur rounded-xl p-4">
                  <p className="text-gray-400 dark:text-slate-500 text-xs mb-1">
                    AAPL
                  </p>
                  <p className="text-white font-semibold">$189.45</p>
                  <p className="text-green-400 text-xs">+2.3%</p>
                </div>
                <div className="bg-white dark:bg-slate-800/10 backdrop-blur rounded-xl p-4">
                  <p className="text-gray-400 dark:text-slate-500 text-xs mb-1">
                    GOOGL
                  </p>
                  <p className="text-white font-semibold">$142.78</p>
                  <p className="text-green-400 text-xs">+1.8%</p>
                </div>
                <div className="bg-white dark:bg-slate-800/10 backdrop-blur rounded-xl p-4">
                  <p className="text-gray-400 dark:text-slate-500 text-xs mb-1">
                    MSFT
                  </p>
                  <p className="text-white font-semibold">$378.92</p>
                  <p className="text-red-400 text-xs">-0.5%</p>
                </div>
                <div className="bg-white dark:bg-slate-800/10 backdrop-blur rounded-xl p-4">
                  <p className="text-gray-400 dark:text-slate-500 text-xs mb-1">
                    NVDA
                  </p>
                  <p className="text-white font-semibold">$495.67</p>
                  <p className="text-green-400 text-xs">+4.2%</p>
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
              Professional-grade tools.
            </h2>
            <p className="text-xl text-gray-600 dark:text-slate-300">
              Everything you need to invest with confidence.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
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
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                Portfolio Analysis
              </h3>
              <p className="text-gray-600 dark:text-slate-300 leading-relaxed">
                Deep analysis of your portfolio&apos;s risk, diversification,
                and performance metrics.
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
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                Stock Research
              </h3>
              <p className="text-gray-600 dark:text-slate-300 leading-relaxed">
                AI-powered stock screener with fundamental and technical
                analysis tools.
              </p>
            </div>

            {/* Feature 3 */}
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
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                AI Insights
              </h3>
              <p className="text-gray-600 dark:text-slate-300 leading-relaxed">
                Get personalized investment recommendations based on your goals
                and risk tolerance.
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
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                Sector Analysis
              </h3>
              <p className="text-gray-600 dark:text-slate-300 leading-relaxed">
                Track sector performance and identify emerging trends before
                they mainstream.
              </p>
            </div>

            {/* Feature 5 */}
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
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                Price Alerts
              </h3>
              <p className="text-gray-600 dark:text-slate-300 leading-relaxed">
                Set custom alerts for price movements, volume changes, and
                technical signals.
              </p>
            </div>

            {/* Feature 6 */}
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
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                News & Sentiment
              </h3>
              <p className="text-gray-600 dark:text-slate-300 leading-relaxed">
                AI analyzes news sentiment to help you understand market
                movements.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* AI Analysis Section */}
      <section className="py-20 bg-white dark:bg-slate-800">
        <div className="max-w-[980px] mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-semibold text-gray-900 dark:text-white tracking-tight mb-6">
                AI that understands
                <br />
                the market.
              </h2>
              <p className="text-xl text-gray-600 dark:text-slate-300 mb-8 leading-relaxed">
                Our AI analyzes thousands of data points including financials,
                news sentiment, technical indicators, and market trends.
              </p>
              <ul className="space-y-4">
                <li className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-blue-600"
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
                    Fundamental analysis automation
                  </span>
                </li>
                <li className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-blue-600"
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
                    Real-time sentiment tracking
                  </span>
                </li>
                <li className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-blue-600"
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
                    Risk-adjusted recommendations
                  </span>
                </li>
              </ul>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-emerald-50 rounded-xl p-8">
              <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm mb-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <span className="text-lg"></span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        AI Analysis
                      </p>
                      <p className="text-xs text-gray-500 dark:text-slate-400">
                        AAPL - Apple Inc.
                      </p>
                    </div>
                  </div>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                    Buy
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
                  Strong fundamentals with 15% YoY revenue growth. Technical
                  indicators show bullish momentum. Sentiment analysis positive
                  across 89% of recent news.
                </p>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <span className="text-lg"></span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        Risk Score
                      </p>
                      <p className="text-xs text-gray-500 dark:text-slate-400">
                        Based on volatility
                      </p>
                    </div>
                  </div>
                  <span className="text-2xl font-bold text-blue-600">72</span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-slate-800 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-emerald-500 h-2 rounded-full"
                    style={{ width: "72%" }}
                  ></div>
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
            Start investing smarter today.
          </h2>
          <p className="text-xl text-gray-400 dark:text-slate-500 mb-8 max-w-2xl mx-auto">
            Join thousands of investors using AI to make better decisions.
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
                    href="/investments/holdings"
                    className="text-xs text-gray-600 hover:text-gray-900 dark:text-white dark:hover:text-white"
                  >
                    Holdings
                  </Link>
                </li>
                <li>
                  <Link
                    href="/investments"
                    className="text-xs text-gray-600 hover:text-gray-900 dark:text-white dark:hover:text-white"
                  >
                    Research
                  </Link>
                </li>
                <li>
                  <Link
                    href="/investments"
                    className="text-xs text-gray-600 hover:text-gray-900 dark:text-white dark:hover:text-white"
                  >
                    Analysis
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
              reserved. Investment advice is for informational purposes only.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
