'use client';

import Link from 'next/link';
import { pricingTiers } from '@/lib/pricing';
import CheckoutButton from '@/components/payment/CheckoutButton';

export default function PricingPage() {
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
              <Link href="/credit" className="text-xs text-gray-600 hover:text-gray-900 transition-colors">Credit</Link>
              <Link href="/financial-hub" className="text-xs text-gray-600 hover:text-gray-900 transition-colors">Financial</Link>
              <Link href="/invest" className="text-xs text-gray-600 hover:text-gray-900 transition-colors">Invest</Link>
              <Link href="/loans" className="text-xs text-gray-600 hover:text-gray-900 transition-colors">Student Loans</Link>
              <Link href="/pricing" className="text-xs text-gray-900 font-medium">Pricing</Link>
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
      <section className="pt-32 pb-16">
        <div className="max-w-[980px] mx-auto px-6 text-center">
          <h1 className="text-5xl sm:text-6xl font-semibold text-gray-900 tracking-tight leading-[1.05] mb-6">
            Simple, transparent pricing.
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Choose the plan that works best for your financial journey.
            All plans include a 14-day free trial.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-12">
        <div className="max-w-[980px] mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8">
            {pricingTiers.map((tier, index) => (
              <div
                key={tier.id}
                className={`relative rounded-2xl p-8 ${
                  index === 1
                    ? 'bg-gray-900 text-white scale-105 shadow-2xl'
                    : 'bg-white border border-gray-200 shadow-sm'
                }`}
              >
                {index === 1 && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-1.5 rounded-full text-xs font-medium">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="mb-8">
                  <h3 className={`text-lg font-medium mb-4 ${index === 1 ? 'text-gray-300' : 'text-gray-600'}`}>
                    {tier.name}
                  </h3>
                  <div className="flex items-baseline">
                    <span className={`text-5xl font-semibold tracking-tight ${index === 1 ? 'text-white' : 'text-gray-900'}`}>
                      ${tier.price}
                    </span>
                    <span className={`text-lg ml-2 ${index === 1 ? 'text-gray-400' : 'text-gray-500'}`}>
                      /month
                    </span>
                  </div>
                </div>

                <ul className="space-y-4 mb-8">
                  {tier.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start">
                      <svg
                        className={`w-5 h-5 mr-3 mt-0.5 flex-shrink-0 ${
                          index === 1 ? 'text-blue-400' : 'text-green-500'
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      <span className={`text-sm ${index === 1 ? 'text-gray-300' : 'text-gray-600'}`}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <CheckoutButton
                  priceId={tier.priceId}
                  planName={tier.name}
                  planPrice={tier.priceNumber}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Section */}
      <section className="py-20 bg-white">
        <div className="max-w-[980px] mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-semibold text-gray-900 tracking-tight mb-4">
              Compare plans.
            </h2>
            <p className="text-xl text-gray-600">
              Find the perfect fit for your needs.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-4 pr-4 font-medium text-gray-500 text-sm">Feature</th>
                  <th className="text-center py-4 px-4 font-medium text-gray-900">Basic</th>
                  <th className="text-center py-4 px-4 font-medium text-gray-900">Premium</th>
                  <th className="text-center py-4 px-4 font-medium text-gray-900">Enterprise</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="py-4 pr-4 text-sm text-gray-600">Credit Score Monitoring</td>
                  <td className="py-4 px-4 text-center"><Check /></td>
                  <td className="py-4 px-4 text-center"><Check /></td>
                  <td className="py-4 px-4 text-center"><Check /></td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-4 pr-4 text-sm text-gray-600">AI Credit Analysis</td>
                  <td className="py-4 px-4 text-center"><Check /></td>
                  <td className="py-4 px-4 text-center"><Check /></td>
                  <td className="py-4 px-4 text-center"><Check /></td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-4 pr-4 text-sm text-gray-600">Disputes per Month</td>
                  <td className="py-4 px-4 text-center text-sm text-gray-900">5</td>
                  <td className="py-4 px-4 text-center text-sm text-gray-900">Unlimited</td>
                  <td className="py-4 px-4 text-center text-sm text-gray-900">Unlimited</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-4 pr-4 text-sm text-gray-600">Student Loan Tools</td>
                  <td className="py-4 px-4 text-center"><Dash /></td>
                  <td className="py-4 px-4 text-center"><Check /></td>
                  <td className="py-4 px-4 text-center"><Check /></td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-4 pr-4 text-sm text-gray-600">Investment Analysis</td>
                  <td className="py-4 px-4 text-center"><Dash /></td>
                  <td className="py-4 px-4 text-center"><Check /></td>
                  <td className="py-4 px-4 text-center"><Check /></td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-4 pr-4 text-sm text-gray-600">Financial Hub</td>
                  <td className="py-4 px-4 text-center"><Dash /></td>
                  <td className="py-4 px-4 text-center"><Check /></td>
                  <td className="py-4 px-4 text-center"><Check /></td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-4 pr-4 text-sm text-gray-600">Multi-user Access</td>
                  <td className="py-4 px-4 text-center"><Dash /></td>
                  <td className="py-4 px-4 text-center"><Dash /></td>
                  <td className="py-4 px-4 text-center"><Check /></td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-4 pr-4 text-sm text-gray-600">API Access</td>
                  <td className="py-4 px-4 text-center"><Dash /></td>
                  <td className="py-4 px-4 text-center"><Dash /></td>
                  <td className="py-4 px-4 text-center"><Check /></td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-4 pr-4 text-sm text-gray-600">Dedicated Support</td>
                  <td className="py-4 px-4 text-center text-sm text-gray-500">Email</td>
                  <td className="py-4 px-4 text-center text-sm text-gray-900">Priority</td>
                  <td className="py-4 px-4 text-center text-sm text-gray-900">Dedicated Manager</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20">
        <div className="max-w-[680px] mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-semibold text-gray-900 tracking-tight mb-4">
              Frequently asked questions.
            </h2>
          </div>

          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Can I cancel my subscription anytime?
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Yes, you can cancel your subscription at any time. Your access will continue until the end of your current billing period.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                What happens after the free trial?
              </h3>
              <p className="text-gray-600 leading-relaxed">
                After your 14-day free trial, you&apos;ll be charged the regular subscription price. You can cancel anytime during the trial at no cost.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Can I upgrade or downgrade my plan?
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Absolutely! You can change your plan at any time. When upgrading, you&apos;ll get immediate access to new features. When downgrading, changes take effect at the next billing cycle.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Is my data secure?
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Yes, we use bank-level 256-bit encryption to protect your data. We&apos;re SOC 2 compliant and never sell your personal information.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Do you offer refunds?
              </h3>
              <p className="text-gray-600 leading-relaxed">
                We offer a 30-day money-back guarantee. If you&apos;re not satisfied with CPFI, contact our support team for a full refund.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gray-900">
        <div className="max-w-[980px] mx-auto px-6 text-center">
          <h2 className="text-4xl font-semibold text-white tracking-tight mb-4">
            Start your free trial today.
          </h2>
          <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
            No credit card required. Get full access for 14 days.
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
                <li><Link href="/financial-hub" className="text-xs text-gray-600 hover:text-gray-900">Financial</Link></li>
                <li><Link href="/invest" className="text-xs text-gray-600 hover:text-gray-900">Invest</Link></li>
                <li><Link href="/loans" className="text-xs text-gray-600 hover:text-gray-900">Student Loans</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-gray-900 mb-4">Plans</h4>
              <ul className="space-y-3">
                <li><Link href="/pricing" className="text-xs text-gray-600 hover:text-gray-900">Basic</Link></li>
                <li><Link href="/pricing" className="text-xs text-gray-600 hover:text-gray-900">Premium</Link></li>
                <li><Link href="/pricing" className="text-xs text-gray-600 hover:text-gray-900">Enterprise</Link></li>
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

function Check() {
  return (
    <svg className="w-5 h-5 text-green-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function Dash() {
  return (
    <svg className="w-5 h-5 text-gray-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" />
    </svg>
  );
}
