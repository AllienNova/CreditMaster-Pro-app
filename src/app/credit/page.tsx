import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Credit Intelligence | CPFI',
  description: 'AI-powered credit monitoring, dispute automation, and score optimization.',
};

export default function CreditPage() {
  return (
    <div className="min-h-screen bg-[#fbfbfd]">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-[#fbfbfd]/80 backdrop-blur-xl border-b border-gray-200/50">
        <div className="max-w-[980px] mx-auto px-6">
          <div className="flex justify-between items-center h-12">
            <Link href="/" className="text-xl font-semibold text-gray-900 tracking-tight">
              CPFI
            </Link>
            <div className="hidden md:flex items-center space-x-8">
              <Link href="/credit" className="text-xs text-blue-600 font-medium">Credit</Link>
              <Link href="/financial" className="text-xs text-gray-600 hover:text-gray-900 transition-colors">Financial</Link>
              <Link href="/invest" className="text-xs text-gray-600 hover:text-gray-900 transition-colors">Invest</Link>
              <Link href="/loans" className="text-xs text-gray-600 hover:text-gray-900 transition-colors">Student Loans</Link>
              <Link href="/pricing" className="text-xs text-gray-600 hover:text-gray-900 transition-colors">Pricing</Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/login" className="text-xs text-gray-600 hover:text-gray-900 transition-colors">Sign In</Link>
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
            Credit Intelligence
          </p>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-semibold text-gray-900 tracking-tight leading-[1.05] mb-6">
            Your credit score.
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
              Perfected by AI.
            </span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8 leading-relaxed">
            Monitor all three bureaus, automate disputes, and optimize your score with
            intelligent strategies that adapt to your unique situation.
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

      {/* Score Display */}
      <section className="py-16 bg-white">
        <div className="max-w-[980px] mx-auto px-6">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-12 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-cyan-500/20"></div>
            <div className="relative">
              <div className="inline-flex items-center justify-center w-48 h-48 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 mb-8">
                <div className="text-center">
                  <span className="text-6xl font-bold text-white">742</span>
                  <p className="text-blue-100 text-sm mt-1">Excellent</p>
                </div>
              </div>
              <h2 className="text-3xl font-semibold text-white mb-4">
                Track Your Progress in Real-Time
              </h2>
              <p className="text-gray-400 max-w-lg mx-auto">
                Watch your credit score improve as our AI identifies and resolves
                negative items on your report.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20">
        <div className="max-w-[980px] mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-semibold text-gray-900 tracking-tight mb-4">
              Everything you need to master your credit.
            </h2>
            <p className="text-xl text-gray-600">
              Powerful tools working together seamlessly.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Feature 1 */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Tri-Bureau Monitoring
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Monitor Experian, Equifax, and TransUnion in one unified dashboard.
                Get alerts for any changes instantly.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                AI Dispute Generator
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Generate legally compliant dispute letters in seconds. Our AI crafts
                compelling arguments based on FCRA regulations.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Score Simulator
              </h3>
              <p className="text-gray-600 leading-relaxed">
                See how different actions will affect your score before you take them.
                Plan your credit journey with confidence.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Progress Timeline
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Track your improvement journey with detailed timelines. See exactly
                what actions led to score changes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-white">
        <div className="max-w-[980px] mx-auto px-6">
          <div className="grid grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-5xl font-semibold text-gray-900 mb-2">70-95%</div>
              <p className="text-gray-600">Success Rate</p>
            </div>
            <div>
              <div className="text-5xl font-semibold text-gray-900 mb-2">30-90</div>
              <p className="text-gray-600">Days to Results</p>
            </div>
            <div>
              <div className="text-5xl font-semibold text-gray-900 mb-2">100+</div>
              <p className="text-gray-600">Point Increase</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20">
        <div className="max-w-[980px] mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-semibold text-gray-900 tracking-tight mb-4">
              How it works.
            </h2>
            <p className="text-xl text-gray-600">
              Three simple steps to better credit.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-white">1</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Connect</h3>
              <p className="text-gray-600">
                Securely connect your credit reports from all three bureaus.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-white">2</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Analyze</h3>
              <p className="text-gray-600">
                Our AI scans your report and identifies items to dispute.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-white">3</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Improve</h3>
              <p className="text-gray-600">
                Watch your score climb as we handle the dispute process.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gray-900">
        <div className="max-w-[980px] mx-auto px-6 text-center">
          <h2 className="text-4xl font-semibold text-white tracking-tight mb-4">
            Ready to transform your credit?
          </h2>
          <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
            Join thousands of users who have improved their credit scores with CPFI.
          </p>
          <Link
            href="/auth/signup"
            className="inline-block text-lg bg-white text-gray-900 px-8 py-4 rounded-full hover:bg-gray-100 transition-colors font-medium"
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
              <h4 className="text-xs font-semibold text-gray-900 mb-4">Product</h4>
              <ul className="space-y-3">
                <li><Link href="/credit" className="text-xs text-gray-600 hover:text-gray-900">Credit</Link></li>
                <li><Link href="/financial" className="text-xs text-gray-600 hover:text-gray-900">Financial</Link></li>
                <li><Link href="/invest" className="text-xs text-gray-600 hover:text-gray-900">Invest</Link></li>
                <li><Link href="/loans" className="text-xs text-gray-600 hover:text-gray-900">Student Loans</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-gray-900 mb-4">Features</h4>
              <ul className="space-y-3">
                <li><Link href="/credit-repair/disputes" className="text-xs text-gray-600 hover:text-gray-900">Disputes</Link></li>
                <li><Link href="/credit-builder/simulator" className="text-xs text-gray-600 hover:text-gray-900">Simulator</Link></li>
                <li><Link href="/credit-monitoring" className="text-xs text-gray-600 hover:text-gray-900">Monitoring</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-gray-900 mb-4">Company</h4>
              <ul className="space-y-3">
                <li><Link href="/about" className="text-xs text-gray-600 hover:text-gray-900">About</Link></li>
                <li><Link href="/pricing" className="text-xs text-gray-600 hover:text-gray-900">Pricing</Link></li>
                <li><Link href="/contact" className="text-xs text-gray-600 hover:text-gray-900">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-gray-900 mb-4">Legal</h4>
              <ul className="space-y-3">
                <li><Link href="/privacy" className="text-xs text-gray-600 hover:text-gray-900">Privacy</Link></li>
                <li><Link href="/terms" className="text-xs text-gray-600 hover:text-gray-900">Terms</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-gray-900 mb-4">Support</h4>
              <ul className="space-y-3">
                <li><Link href="/help" className="text-xs text-gray-600 hover:text-gray-900">Help Center</Link></li>
                <li><Link href="/faq" className="text-xs text-gray-600 hover:text-gray-900">FAQ</Link></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-gray-300">
            <p className="text-xs text-gray-600 text-center">
              Copyright &copy; {new Date().getFullYear()} CPFI. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
