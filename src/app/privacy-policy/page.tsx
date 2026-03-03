/**
 * Privacy Policy Page
 *
 * Comprehensive privacy policy covering:
 * - Information collection and usage
 * - Data security measures
 * - User rights (GDPR, CCPA)
 * - Third-party services
 * - Cookie policy
 */

import type { Metadata } from "next";
import Link from "next/link";
import Footer from "@/components/ui/Footer";

export const metadata: Metadata = {
  title: "Privacy Policy | Fynvita",
  description:
    "Fynvita Privacy Policy - Learn how we collect, use, and protect your personal information. GDPR and CCPA compliant.",
  openGraph: {
    title: "Privacy Policy | Fynvita",
    description:
      "Learn how Fynvita collects, uses, and protects your personal information.",
    type: "website",
  },
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 bg-white dark:bg-slate-800/80 backdrop-blur-xl border-b border-gray-200 dark:border-slate-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14">
            <Link
              href="/"
              className="text-xl font-bold text-emerald-600 dark:text-emerald-400"
            >
              Fynvita
            </Link>
            <nav className="flex gap-4">
              <Link
                href="/terms"
                className="text-sm text-gray-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
              >
                Terms of Service
              </Link>
              <Link
                href="/help"
                className="text-sm text-gray-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
              >
                Help Center
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8 md:p-12">
          {/* Header */}
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Privacy Policy
          </h1>
          <p className="text-sm text-gray-600 dark:text-slate-400 mb-8">
            Last Updated: February 2026
          </p>

          {/* Introduction */}
          <div className="bg-emerald-50 dark:bg-emerald-900/20 border-l-4 border-emerald-500 p-6 mb-8">
            <p className="text-emerald-800 dark:text-emerald-200 leading-relaxed">
              At Fynvita, we take your privacy seriously. This Privacy Policy
              explains how we collect, use, disclose, and safeguard your
              information when you use our financial wellness platform. Please
              read this policy carefully to understand our practices regarding
              your personal data.
            </p>
          </div>

          {/* Table of Contents */}
          <div className="mb-8 p-6 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
            <h3 className="font-bold text-gray-900 dark:text-white mb-3">
              Table of Contents
            </h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700 dark:text-slate-300">
              <li>
                <a
                  href="#information-collected"
                  className="hover:text-emerald-600 dark:hover:text-emerald-400"
                >
                  Information We Collect
                </a>
              </li>
              <li>
                <a
                  href="#how-we-use"
                  className="hover:text-emerald-600 dark:hover:text-emerald-400"
                >
                  How We Use Your Information
                </a>
              </li>
              <li>
                <a
                  href="#information-sharing"
                  className="hover:text-emerald-600 dark:hover:text-emerald-400"
                >
                  Information Sharing and Disclosure
                </a>
              </li>
              <li>
                <a
                  href="#data-security"
                  className="hover:text-emerald-600 dark:hover:text-emerald-400"
                >
                  Data Security
                </a>
              </li>
              <li>
                <a
                  href="#your-rights"
                  className="hover:text-emerald-600 dark:hover:text-emerald-400"
                >
                  Your Rights (GDPR & CCPA)
                </a>
              </li>
              <li>
                <a
                  href="#cookies"
                  className="hover:text-emerald-600 dark:hover:text-emerald-400"
                >
                  Cookies and Tracking Technologies
                </a>
              </li>
              <li>
                <a
                  href="#third-party"
                  className="hover:text-emerald-600 dark:hover:text-emerald-400"
                >
                  Third-Party Services
                </a>
              </li>
              <li>
                <a
                  href="#data-retention"
                  className="hover:text-emerald-600 dark:hover:text-emerald-400"
                >
                  Data Retention
                </a>
              </li>
              <li>
                <a
                  href="#international-transfers"
                  className="hover:text-emerald-600 dark:hover:text-emerald-400"
                >
                  International Data Transfers
                </a>
              </li>
              <li>
                <a
                  href="#children"
                  className="hover:text-emerald-600 dark:hover:text-emerald-400"
                >
                  Children&apos;s Privacy
                </a>
              </li>
              <li>
                <a
                  href="#changes"
                  className="hover:text-emerald-600 dark:hover:text-emerald-400"
                >
                  Changes to This Policy
                </a>
              </li>
              <li>
                <a
                  href="#contact"
                  className="hover:text-emerald-600 dark:hover:text-emerald-400"
                >
                  Contact Information
                </a>
              </li>
            </ol>
          </div>

          {/* Section 1: Information We Collect */}
          <section id="information-collected" className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              1. Information We Collect
            </h2>
            <p className="text-gray-700 dark:text-slate-300 leading-relaxed mb-4">
              We collect information that you provide directly to us, as well as
              information collected automatically when you use our platform.
            </p>

            <h3 className="text-lg font-semibold text-gray-800 dark:text-slate-200 mb-3">
              1.1 Personal Information
            </h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-slate-300 ml-4 mb-4">
              <li>
                <strong>Account Information:</strong> Name, email address,
                password, phone number
              </li>
              <li>
                <strong>Profile Information:</strong> Date of birth, address,
                employment status
              </li>
              <li>
                <strong>Identity Verification:</strong> Social Security Number
                (last 4 digits), government ID for verification purposes
              </li>
              <li>
                <strong>Payment Information:</strong> Credit/debit card details,
                billing address (processed securely by Stripe)
              </li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-800 dark:text-slate-200 mb-3">
              1.2 Financial Information
            </h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-slate-300 ml-4 mb-4">
              <li>
                <strong>Credit Information:</strong> Credit reports, credit
                scores, credit history from Experian, Equifax, and TransUnion
              </li>
              <li>
                <strong>Financial Accounts:</strong> Bank account information,
                investment accounts (when you connect via Plaid)
              </li>
              <li>
                <strong>Debt Information:</strong> Student loans, mortgages,
                credit card balances
              </li>
              <li>
                <strong>Income Information:</strong> Salary, employment details,
                income sources
              </li>
              <li>
                <strong>Transaction Data:</strong> Spending patterns, bill
                payments, transfers
              </li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-800 dark:text-slate-200 mb-3">
              1.3 Usage Data
            </h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-slate-300 ml-4 mb-4">
              <li>
                Device information (browser type, operating system, device ID)
              </li>
              <li>IP address and approximate location</li>
              <li>Pages visited, features used, and actions taken</li>
              <li>Time and date of visits</li>
              <li>Referring websites and search terms</li>
              <li>AI chat interactions and queries</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-800 dark:text-slate-200 mb-3">
              1.4 Documents and Communications
            </h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-slate-300 ml-4">
              <li>
                Uploaded documents (credit reports, ID documents, financial
                statements)
              </li>
              <li>Dispute letters and correspondence</li>
              <li>Customer support communications</li>
              <li>Feedback and survey responses</li>
            </ul>
          </section>

          {/* Section 2: How We Use Your Information */}
          <section id="how-we-use" className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              2. How We Use Your Information
            </h2>
            <p className="text-gray-700 dark:text-slate-300 leading-relaxed mb-4">
              We use the information we collect for the following purposes:
            </p>

            <h3 className="text-lg font-semibold text-gray-800 dark:text-slate-200 mb-3">
              2.1 Providing Our Services
            </h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-slate-300 ml-4 mb-4">
              <li>Create and manage your account</li>
              <li>Analyze your credit reports and provide insights</li>
              <li>Generate AI-powered dispute letters and recommendations</li>
              <li>Track your financial goals and progress</li>
              <li>Provide investment analysis and portfolio insights</li>
              <li>Process payments and manage subscriptions</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-800 dark:text-slate-200 mb-3">
              2.2 Improving Our Platform
            </h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-slate-300 ml-4 mb-4">
              <li>Analyze usage patterns to improve features</li>
              <li>Train and improve our AI models (using anonymized data)</li>
              <li>Conduct research and development</li>
              <li>Fix bugs and technical issues</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-800 dark:text-slate-200 mb-3">
              2.3 Communications
            </h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-slate-300 ml-4 mb-4">
              <li>Send transactional emails (account updates, receipts)</li>
              <li>Provide credit monitoring alerts</li>
              <li>Send marketing communications (with your consent)</li>
              <li>Respond to customer support inquiries</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-800 dark:text-slate-200 mb-3">
              2.4 Security and Compliance
            </h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-slate-300 ml-4">
              <li>Detect and prevent fraud and unauthorized access</li>
              <li>Comply with legal obligations</li>
              <li>Enforce our Terms of Service</li>
              <li>Protect our rights and the rights of others</li>
            </ul>
          </section>

          {/* Section 3: Information Sharing */}
          <section id="information-sharing" className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              3. Information Sharing and Disclosure
            </h2>

            <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-4 mb-4">
              <p className="text-blue-800 dark:text-blue-200 font-semibold">
                We do NOT sell your personal information to third parties.
              </p>
            </div>

            <p className="text-gray-700 dark:text-slate-300 leading-relaxed mb-4">
              We may share your information in the following circumstances:
            </p>

            <h3 className="text-lg font-semibold text-gray-800 dark:text-slate-200 mb-3">
              3.1 Service Providers
            </h3>
            <p className="text-gray-700 dark:text-slate-300 mb-4">
              We share information with trusted third-party service providers
              who assist us in operating our platform:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-slate-300 ml-4 mb-4">
              <li>
                <strong>Stripe:</strong> Payment processing and subscription
                management
              </li>
              <li>
                <strong>Supabase:</strong> Database hosting and authentication
              </li>
              <li>
                <strong>AWS:</strong> Cloud infrastructure and document storage
              </li>
              <li>
                <strong>AIML API:</strong> AI model access for analysis and
                recommendations
              </li>
              <li>
                <strong>Resend:</strong> Email delivery services
              </li>
              <li>
                <strong>Plaid:</strong> Financial account connections
              </li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-800 dark:text-slate-200 mb-3">
              3.2 Legal Requirements
            </h3>
            <p className="text-gray-700 dark:text-slate-300 mb-4">
              We may disclose information when required by law or to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-slate-300 ml-4 mb-4">
              <li>Comply with legal process or government requests</li>
              <li>Protect and defend our rights or property</li>
              <li>Prevent fraud or illegal activities</li>
              <li>Protect the safety of users or the public</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-800 dark:text-slate-200 mb-3">
              3.3 Business Transfers
            </h3>
            <p className="text-gray-700 dark:text-slate-300">
              In the event of a merger, acquisition, or sale of assets, your
              information may be transferred. We will notify you before your
              information becomes subject to a different privacy policy.
            </p>
          </section>

          {/* Section 4: Data Security */}
          <section id="data-security" className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              4. Data Security
            </h2>

            <div className="bg-emerald-50 dark:bg-emerald-900/20 border-l-4 border-emerald-500 p-4 mb-4">
              <p className="text-emerald-800 dark:text-emerald-200 font-semibold">
                Your security is our top priority. We implement industry-leading
                security measures to protect your data.
              </p>
            </div>

            <h3 className="text-lg font-semibold text-gray-800 dark:text-slate-200 mb-3">
              4.1 Technical Safeguards
            </h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-slate-300 ml-4 mb-4">
              <li>
                <strong>Encryption:</strong> 256-bit TLS encryption for data in
                transit; AES-256 encryption for data at rest
              </li>
              <li>
                <strong>Authentication:</strong> Secure password hashing
                (bcrypt/argon2), multi-factor authentication (MFA)
              </li>
              <li>
                <strong>Access Controls:</strong> Role-based access control
                (RBAC), principle of least privilege
              </li>
              <li>
                <strong>Monitoring:</strong> Real-time threat detection, audit
                logging, intrusion detection systems
              </li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-800 dark:text-slate-200 mb-3">
              4.2 Organizational Measures
            </h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-slate-300 ml-4 mb-4">
              <li>Regular security audits and penetration testing</li>
              <li>Employee security training and background checks</li>
              <li>Incident response procedures</li>
              <li>Data minimization practices</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-800 dark:text-slate-200 mb-3">
              4.3 Compliance Certifications
            </h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-slate-300 ml-4">
              <li>SOC 2 Type II certified</li>
              <li>GDPR compliant</li>
              <li>CCPA compliant</li>
              <li>PCI DSS compliant (for payment processing)</li>
            </ul>
          </section>

          {/* Section 5: Your Rights */}
          <section id="your-rights" className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              5. Your Rights (GDPR & CCPA)
            </h2>
            <p className="text-gray-700 dark:text-slate-300 leading-relaxed mb-4">
              Depending on your location, you have specific rights regarding
              your personal data.
            </p>

            <h3 className="text-lg font-semibold text-gray-800 dark:text-slate-200 mb-3">
              5.1 Rights Under GDPR (European Users)
            </h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-slate-300 ml-4 mb-4">
              <li>
                <strong>Right to Access:</strong> Request a copy of your
                personal data
              </li>
              <li>
                <strong>Right to Rectification:</strong> Correct inaccurate or
                incomplete data
              </li>
              <li>
                <strong>Right to Erasure:</strong> Request deletion of your data
                (&quot;right to be forgotten&quot;)
              </li>
              <li>
                <strong>Right to Restrict Processing:</strong> Limit how we use
                your data
              </li>
              <li>
                <strong>Right to Data Portability:</strong> Receive your data in
                a machine-readable format
              </li>
              <li>
                <strong>Right to Object:</strong> Object to processing based on
                legitimate interests
              </li>
              <li>
                <strong>Right to Withdraw Consent:</strong> Withdraw consent at
                any time
              </li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-800 dark:text-slate-200 mb-3">
              5.2 Rights Under CCPA (California Residents)
            </h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-slate-300 ml-4 mb-4">
              <li>
                <strong>Right to Know:</strong> Know what personal information
                is collected and how it is used
              </li>
              <li>
                <strong>Right to Delete:</strong> Request deletion of personal
                information
              </li>
              <li>
                <strong>Right to Opt-Out:</strong> Opt-out of the sale of
                personal information (we do not sell your data)
              </li>
              <li>
                <strong>Right to Non-Discrimination:</strong> Not be
                discriminated against for exercising your rights
              </li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-800 dark:text-slate-200 mb-3">
              5.3 How to Exercise Your Rights
            </h3>
            <div className="bg-gray-100 dark:bg-slate-700 p-4 rounded-lg">
              <p className="text-gray-700 dark:text-slate-300 mb-2">
                To exercise any of these rights, please contact us at:
              </p>
              <p className="text-gray-700 dark:text-slate-300">
                <strong>Email:</strong> privacy@fynvita.com
              </p>
              <p className="text-gray-700 dark:text-slate-300">
                <strong>Response Time:</strong> Within 30 days (45 days for
                complex requests)
              </p>
            </div>
          </section>

          {/* Section 6: Cookies */}
          <section id="cookies" className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              6. Cookies and Tracking Technologies
            </h2>
            <p className="text-gray-700 dark:text-slate-300 leading-relaxed mb-4">
              We use cookies and similar tracking technologies to improve your
              experience.
            </p>

            <h3 className="text-lg font-semibold text-gray-800 dark:text-slate-200 mb-3">
              6.1 Types of Cookies We Use
            </h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-slate-300 ml-4 mb-4">
              <li>
                <strong>Essential Cookies:</strong> Required for platform
                functionality (authentication, security)
              </li>
              <li>
                <strong>Performance Cookies:</strong> Help us understand how
                users interact with our platform
              </li>
              <li>
                <strong>Functional Cookies:</strong> Remember your preferences
                and settings
              </li>
              <li>
                <strong>Analytics Cookies:</strong> Measure platform performance
                and usage patterns
              </li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-800 dark:text-slate-200 mb-3">
              6.2 Managing Cookies
            </h3>
            <p className="text-gray-700 dark:text-slate-300 mb-4">
              You can control cookies through:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-slate-300 ml-4">
              <li>Browser settings (disable or delete cookies)</li>
              <li>
                Our cookie consent banner (when you first visit our platform)
              </li>
              <li>Account settings (manage analytics preferences)</li>
            </ul>
          </section>

          {/* Section 7: Third-Party Services */}
          <section id="third-party" className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              7. Third-Party Services
            </h2>
            <p className="text-gray-700 dark:text-slate-300 leading-relaxed mb-4">
              We use trusted third-party services to operate our platform. Each
              has their own privacy policy:
            </p>

            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-slate-700/50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-800 dark:text-slate-200 mb-2">
                  Stripe (Payment Processing)
                </h4>
                <p className="text-sm text-gray-600 dark:text-slate-400 mb-2">
                  Handles all payment and subscription processing. We never
                  store your full credit card number.
                </p>
                <a
                  href="https://stripe.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  Stripe Privacy Policy
                </a>
              </div>

              <div className="bg-gray-50 dark:bg-slate-700/50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-800 dark:text-slate-200 mb-2">
                  Supabase (Database & Authentication)
                </h4>
                <p className="text-sm text-gray-600 dark:text-slate-400 mb-2">
                  Provides secure database hosting and user authentication
                  services.
                </p>
                <a
                  href="https://supabase.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  Supabase Privacy Policy
                </a>
              </div>

              <div className="bg-gray-50 dark:bg-slate-700/50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-800 dark:text-slate-200 mb-2">
                  Amazon Web Services (Cloud Infrastructure)
                </h4>
                <p className="text-sm text-gray-600 dark:text-slate-400 mb-2">
                  Provides secure cloud storage for documents and files.
                </p>
                <a
                  href="https://aws.amazon.com/privacy/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  AWS Privacy Policy
                </a>
              </div>

              <div className="bg-gray-50 dark:bg-slate-700/50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-800 dark:text-slate-200 mb-2">
                  AIML API (AI Model Access)
                </h4>
                <p className="text-sm text-gray-600 dark:text-slate-400 mb-2">
                  Provides access to AI models for credit analysis and
                  recommendations. Queries are processed but not stored by the
                  AI provider.
                </p>
                <a
                  href="https://aimlapi.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  AIML API Privacy Policy
                </a>
              </div>

              <div className="bg-gray-50 dark:bg-slate-700/50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-800 dark:text-slate-200 mb-2">
                  Plaid (Financial Account Connections)
                </h4>
                <p className="text-sm text-gray-600 dark:text-slate-400 mb-2">
                  Enables secure connections to your financial accounts. Your
                  bank credentials are never shared with us.
                </p>
                <a
                  href="https://plaid.com/legal/#end-user-privacy-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  Plaid Privacy Policy
                </a>
              </div>
            </div>
          </section>

          {/* Section 8: Data Retention */}
          <section id="data-retention" className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              8. Data Retention
            </h2>
            <p className="text-gray-700 dark:text-slate-300 leading-relaxed mb-4">
              We retain your data only as long as necessary for the purposes
              described in this policy:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-slate-300 ml-4">
              <li>
                <strong>Account Data:</strong> Retained while your account is
                active; deleted within 30 days of account closure
              </li>
              <li>
                <strong>Financial Data:</strong> Retained for 7 years for tax
                and regulatory compliance
              </li>
              <li>
                <strong>Usage Data:</strong> Retained for 2 years for analytics
                purposes
              </li>
              <li>
                <strong>Dispute Records:</strong> Retained for 7 years per FCRA
                requirements
              </li>
              <li>
                <strong>Audit Logs:</strong> Retained for 3 years for security
                purposes
              </li>
            </ul>
          </section>

          {/* Section 9: International Transfers */}
          <section id="international-transfers" className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              9. International Data Transfers
            </h2>
            <p className="text-gray-700 dark:text-slate-300 leading-relaxed mb-4">
              Your information may be transferred to and processed in countries
              other than your country of residence. These countries may have
              different data protection laws.
            </p>
            <p className="text-gray-700 dark:text-slate-300 leading-relaxed mb-4">
              When we transfer data internationally, we use appropriate
              safeguards:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-slate-300 ml-4">
              <li>
                Standard Contractual Clauses (SCCs) approved by the European
                Commission
              </li>
              <li>Data Processing Agreements with all third-party providers</li>
              <li>Ensuring recipients provide adequate protection levels</li>
            </ul>
          </section>

          {/* Section 10: Children's Privacy */}
          <section id="children" className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              10. Children&apos;s Privacy
            </h2>
            <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 mb-4">
              <p className="text-red-800 dark:text-red-200 font-semibold">
                Fynvita is not intended for children under 18 years of age.
              </p>
            </div>
            <p className="text-gray-700 dark:text-slate-300 leading-relaxed mb-4">
              We do not knowingly collect personal information from children
              under 18. If we discover that we have collected personal
              information from a child under 18, we will delete it immediately.
            </p>
            <p className="text-gray-700 dark:text-slate-300 leading-relaxed">
              If you believe a child has provided us with personal information,
              please contact us at{" "}
              <a
                href="mailto:privacy@fynvita.com"
                className="text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                privacy@fynvita.com
              </a>
              .
            </p>
          </section>

          {/* Section 11: Changes to Policy */}
          <section id="changes" className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              11. Changes to This Privacy Policy
            </h2>
            <p className="text-gray-700 dark:text-slate-300 leading-relaxed mb-4">
              We may update this Privacy Policy from time to time. When we make
              changes:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-slate-300 ml-4 mb-4">
              <li>
                We will update the &quot;Last Updated&quot; date at the top of
                this page
              </li>
              <li>
                For significant changes, we will notify you via email or a
                prominent notice on our platform
              </li>
              <li>
                We encourage you to review this policy periodically for any
                changes
              </li>
            </ul>
            <p className="text-gray-700 dark:text-slate-300 leading-relaxed">
              Your continued use of Fynvita after any changes indicates your
              acceptance of the updated policy.
            </p>
          </section>

          {/* Section 12: Contact Information */}
          <section id="contact" className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              12. Contact Information
            </h2>
            <p className="text-gray-700 dark:text-slate-300 leading-relaxed mb-4">
              If you have questions about this Privacy Policy or our data
              practices, please contact us:
            </p>
            <div className="bg-gray-50 dark:bg-slate-700 p-6 rounded-lg space-y-3">
              <p className="text-gray-700 dark:text-slate-300">
                <strong>Data Protection Officer:</strong>
              </p>
              <p className="text-gray-700 dark:text-slate-300">
                <strong>Email:</strong>{" "}
                <a
                  href="mailto:privacy@fynvita.com"
                  className="text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  privacy@fynvita.com
                </a>
              </p>
              <p className="text-gray-700 dark:text-slate-300">
                <strong>General Inquiries:</strong>{" "}
                <a
                  href="mailto:support@fynvita.com"
                  className="text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  support@fynvita.com
                </a>
              </p>
              <p className="text-gray-700 dark:text-slate-300">
                <strong>Address:</strong> Fynvita Privacy Team
              </p>
            </div>
          </section>

          {/* GDPR Representative (for EU users) */}
          <section className="mb-8 bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg">
            <h2 className="text-xl font-bold text-blue-900 dark:text-blue-200 mb-4">
              EU Representative (GDPR)
            </h2>
            <p className="text-blue-700 dark:text-blue-300 text-sm leading-relaxed">
              If you are located in the European Union, you may contact our EU
              representative for privacy matters at{" "}
              <a
                href="mailto:eu-privacy@fynvita.com"
                className="underline hover:text-blue-900 dark:hover:text-blue-100"
              >
                eu-privacy@fynvita.com
              </a>
              . You also have the right to lodge a complaint with your local
              data protection authority.
            </p>
          </section>

          {/* Acceptance Notice */}
          <div className="border-t-2 border-gray-200 dark:border-slate-600 pt-6">
            <p className="text-sm text-gray-600 dark:text-slate-400 italic">
              By using Fynvita, you acknowledge that you have read and
              understood this Privacy Policy. If you do not agree with our
              practices, please do not use our platform.
            </p>
          </div>

          {/* Related Links */}
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/terms"
              className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 dark:text-slate-300 rounded-lg hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 transition-colors text-sm"
            >
              Terms of Service
            </Link>
            <Link
              href="/help/contact"
              className="inline-flex items-center px-4 py-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-lg hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors text-sm"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
