'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function PaymentSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    // Redirect to dashboard after 5 seconds
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push('/dashboard');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Success Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 text-center">
          {/* Success Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center">
              <svg
                className="w-12 h-12 text-green-600"
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
          </div>

          {/* Success Message */}
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Payment Successful!
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            Thank you for subscribing to CPFI. Your account has been activated and you now have full access to all features.
          </p>

          {/* What's Next */}
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 mb-8 text-left">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              What's Next?
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
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div>
                  <p className="font-medium text-gray-900">Upload Your Credit Report</p>
                  <p className="text-sm text-gray-600">
                    Start by uploading your credit report for AI analysis
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
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div>
                  <p className="font-medium text-gray-900">Generate Dispute Letters</p>
                  <p className="text-sm text-gray-600">
                    Use AI to create professional dispute letters
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
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div>
                  <p className="font-medium text-gray-900">Track Your Progress</p>
                  <p className="text-sm text-gray-600">
                    Monitor dispute status and credit score improvements
                  </p>
                </div>
              </li>
            </ul>
          </div>

          {/* Auto Redirect */}
          <p className="text-sm text-gray-500 mb-6">
            Redirecting to dashboard in <span className="font-bold text-indigo-600">{countdown}</span> seconds...
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/dashboard"
              className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
            >
              Go to Dashboard
            </Link>
            <Link
              href="/ai-tools"
              className="px-8 py-3 bg-white hover:bg-gray-50 text-indigo-600 font-semibold rounded-lg border-2 border-indigo-600 transition-all duration-200"
            >
              Explore AI Tools
            </Link>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-8 text-center text-sm text-gray-600">
          <p>
            Need help? Visit our{' '}
            <Link href="/support" className="text-indigo-600 hover:text-indigo-700 font-medium">
              Support Center
            </Link>{' '}
            or email us at{' '}
            <a href="mailto:support@CPFI-pro.com" className="text-indigo-600 hover:text-indigo-700 font-medium">
              support@CPFI-pro.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

// Wrap in Suspense to handle useSearchParams during static generation
export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  );
}
