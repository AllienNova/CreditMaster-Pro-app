'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function PaymentCancelPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Cancel Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 text-center">
          {/* Cancel Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center">
              <svg
                className="w-12 h-12 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
          </div>

          {/* Cancel Message */}
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Payment Canceled
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            Your payment was canceled and no charges were made to your account.
          </p>

          {/* Why Subscribe Section */}
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 mb-8 text-left">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Why Choose CreditMaster Pro?
            </h2>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <svg
                  className="w-6 h-6 text-indigo-600 flex-shrink-0 mt-0.5"
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
                <div>
                  <p className="font-medium text-gray-900">AI-Powered Analysis</p>
                  <p className="text-sm text-gray-600">
                    Access to 300+ AI models for credit analysis and dispute generation
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <svg
                  className="w-6 h-6 text-indigo-600 flex-shrink-0 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
                <div>
                  <p className="font-medium text-gray-900">Professional Results</p>
                  <p className="text-sm text-gray-600">
                    Generate professional dispute letters that get results
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <svg
                  className="w-6 h-6 text-indigo-600 flex-shrink-0 mt-0.5"
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
                <div>
                  <p className="font-medium text-gray-900">Save Time & Money</p>
                  <p className="text-sm text-gray-600">
                    No expensive credit repair companies - do it yourself with AI
                  </p>
                </div>
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
            <Link
              href="/pricing"
              className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
            >
              View Plans Again
            </Link>
            <Link
              href="/dashboard"
              className="px-8 py-3 bg-white hover:bg-gray-50 text-gray-700 font-semibold rounded-lg border-2 border-gray-300 transition-all duration-200"
            >
              Back to Dashboard
            </Link>
          </div>

          {/* Free Trial CTA */}
          <div className="pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-600 mb-3">
              Not ready to commit? Try our free tier with limited features.
            </p>
            <Link
              href="/dashboard"
              className="inline-block text-indigo-600 hover:text-indigo-700 font-medium text-sm underline"
            >
              Explore Free Features
            </Link>
          </div>
        </div>

        {/* Questions */}
        <div className="mt-8 text-center text-sm text-gray-600">
          <p>
            Have questions?{' '}
            <Link href="/support" className="text-indigo-600 hover:text-indigo-700 font-medium">
              Contact Support
            </Link>{' '}
            or email{' '}
            <a href="mailto:support@creditmaster-pro.com" className="text-indigo-600 hover:text-indigo-700 font-medium">
              support@creditmaster-pro.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
