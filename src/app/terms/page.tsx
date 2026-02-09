/**
 * Terms of Service Page
 *
 * Legal terms with critical disclaimers about:
 * - Self-service tool platform (not credit repair service)
 * - User responsibility and control
 * - Educational nature of content
 * - No guarantees or warranties
 */

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8 md:p-12">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          Terms of Service
        </h1>
        <p className="text-sm text-gray-600 dark:text-slate-300 mb-8">Last Updated: January 2025</p>

        {/* Critical Disclaimer */}
        <div className="bg-blue-50 border-l-4 border-blue-500 p-6 mb-8">
          <h2 className="text-xl font-bold text-blue-900 mb-3">
            Important Notice
          </h2>
          <p className="text-blue-800 leading-relaxed">
            Fynvita is a <strong>self-service software platform</strong> that
            provides AI-powered tools, templates, calculators, and educational
            resources.{' '}
            <strong>We do not provide credit repair services.</strong> You
            maintain full control over all actions taken with your credit
            profile. We are a technology provider, not a credit repair
            organization as defined by the Credit Repair Organizations Act
            (CROA).
          </p>
        </div>

        {/* Table of Contents */}
        <div className="mb-8 p-6 bg-gray-50 dark:bg-slate-900 rounded-lg">
          <h3 className="font-bold text-gray-900 dark:text-white mb-3">Table of Contents</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700 dark:text-slate-200">
            <li>
              <a href="#acceptance" className="hover:text-blue-600">
                Acceptance of Terms
              </a>
            </li>
            <li>
              <a href="#description" className="hover:text-blue-600">
                Description of Service
              </a>
            </li>
            <li>
              <a href="#user-responsibility" className="hover:text-blue-600">
                User Responsibility and Control
              </a>
            </li>
            <li>
              <a href="#not-credit-repair" className="hover:text-blue-600">
                Not a Credit Repair Service
              </a>
            </li>
            <li>
              <a href="#educational" className="hover:text-blue-600">
                Educational Purpose
              </a>
            </li>
            <li>
              <a href="#no-guarantees" className="hover:text-blue-600">
                No Guarantees or Warranties
              </a>
            </li>
            <li>
              <a href="#user-obligations" className="hover:text-blue-600">
                User Obligations
              </a>
            </li>
            <li>
              <a href="#payment" className="hover:text-blue-600">
                Payment and Subscriptions
              </a>
            </li>
            <li>
              <a href="#intellectual-property" className="hover:text-blue-600">
                Intellectual Property
              </a>
            </li>
            <li>
              <a href="#limitation" className="hover:text-blue-600">
                Limitation of Liability
              </a>
            </li>
            <li>
              <a href="#termination" className="hover:text-blue-600">
                Termination
              </a>
            </li>
            <li>
              <a href="#governing-law" className="hover:text-blue-600">
                Governing Law
              </a>
            </li>
          </ol>
        </div>

        {/* Section 1 */}
        <section id="acceptance" className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            1. Acceptance of Terms
          </h2>
          <p className="text-gray-700 dark:text-slate-200 leading-relaxed mb-4">
            By accessing or using Fynvita ("the Platform," "we," "us," or
            "our"), you agree to be bound by these Terms of Service. If you do
            not agree to these terms, you may not use the Platform.
          </p>
          <p className="text-gray-700 dark:text-slate-200 leading-relaxed">
            We reserve the right to modify these terms at any time. Continued
            use of the Platform after changes constitutes acceptance of the
            modified terms.
          </p>
        </section>

        {/* Section 2 */}
        <section id="description" className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            2. Description of Service
          </h2>
          <p className="text-gray-700 dark:text-slate-200 leading-relaxed mb-4">
            Fynvita is a <strong>software-as-a-service (SaaS) platform</strong>{' '}
            that provides:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-slate-200 ml-4 mb-4">
            <li>
              AI-powered document generation tools (dispute letters, goodwill
              letters, etc.)
            </li>
            <li>Credit report analysis and insights</li>
            <li>Financial calculators and planning tools</li>
            <li>Educational content and strategy guides</li>
            <li>Templates and resources for credit-related correspondence</li>
            <li>Student loan planning and optimization tools</li>
          </ul>
          <p className="text-gray-700 dark:text-slate-200 leading-relaxed">
            The Platform is a <strong>self-service tool</strong> that empowers
            you to take action on your own behalf. We provide the technology;
            you maintain complete control over how you use it.
          </p>
        </section>

        {/* Section 3 */}
        <section id="user-responsibility" className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            3. User Responsibility and Control
          </h2>
          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-4">
            <p className="text-yellow-800 font-semibold">
              YOU ARE SOLELY RESPONSIBLE FOR ALL ACTIONS TAKEN USING THE
              PLATFORM.
            </p>
          </div>
          <p className="text-gray-700 dark:text-slate-200 leading-relaxed mb-4">
            You acknowledge and agree that:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-slate-200 ml-4">
            <li>
              You maintain full control over all documents generated and actions
              taken
            </li>
            <li>
              You are responsible for reviewing, editing, and approving all
              generated content
            </li>
            <li>
              You decide whether, when, and how to send any correspondence
            </li>
            <li>
              You are responsible for ensuring accuracy of all information you
              provide
            </li>
            <li>You must comply with all applicable laws and regulations</li>
            <li>
              We do not act on your behalf or represent you in any capacity
            </li>
            <li>
              We do not communicate with credit bureaus, creditors, or
              collectors on your behalf
            </li>
          </ul>
        </section>

        {/* Section 4 */}
        <section id="not-credit-repair" className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            4. Not a Credit Repair Service
          </h2>
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
            <p className="text-red-800 font-semibold mb-2">
              FYNVITA IS NOT A CREDIT REPAIR ORGANIZATION
            </p>
            <p className="text-red-700 text-sm">
              We do not provide credit repair services as defined by the Credit
              Repair Organizations Act (CROA) or similar state laws.
            </p>
          </div>
          <p className="text-gray-700 dark:text-slate-200 leading-relaxed mb-4">
            Specifically, we do NOT:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-slate-200 ml-4 mb-4">
            <li>Provide credit repair services</li>
            <li>Act as a credit repair organization</li>
            <li>Make promises or guarantees about credit score improvements</li>
            <li>Communicate with credit bureaus on your behalf</li>
            <li>Represent you in disputes or negotiations</li>
            <li>Provide legal, financial, or credit repair advice</li>
          </ul>
          <p className="text-gray-700 dark:text-slate-200 leading-relaxed">
            We are a <strong>technology platform</strong> that provides tools
            for your personal use, similar to how TurboTax provides tax software
            (but is not a tax preparation service) or LegalZoom provides legal
            document templates (but is not a law firm).
          </p>
        </section>

        {/* Section 5 */}
        <section id="educational" className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            5. Educational Purpose
          </h2>
          <p className="text-gray-700 dark:text-slate-200 leading-relaxed mb-4">
            All content, tools, and resources provided by the Platform are for{' '}
            <strong>educational and informational purposes only</strong>. They
            do not constitute:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-slate-200 ml-4 mb-4">
            <li>Financial advice</li>
            <li>Legal advice</li>
            <li>Credit repair services</li>
            <li>Professional consultation</li>
            <li>
              Personalized recommendations (AI-generated content is general in
              nature)
            </li>
          </ul>
          <p className="text-gray-700 dark:text-slate-200 leading-relaxed">
            You should consult with qualified professionals (attorneys,
            financial advisors, credit counselors) for advice specific to your
            situation.
          </p>
        </section>

        {/* Section 6 */}
        <section id="no-guarantees" className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            6. No Guarantees or Warranties
          </h2>
          <div className="bg-gray-100 dark:bg-slate-800 border-l-4 border-gray-500 p-4 mb-4">
            <p className="text-gray-800 dark:text-slate-100 font-semibold">
              WE MAKE NO GUARANTEES ABOUT RESULTS
            </p>
          </div>
          <p className="text-gray-700 dark:text-slate-200 leading-relaxed mb-4">
            We explicitly disclaim any warranties or guarantees regarding:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-slate-200 ml-4 mb-4">
            <li>Credit score improvements</li>
            <li>Dispute success rates</li>
            <li>Removal of negative items</li>
            <li>Loan approval or qualification</li>
            <li>Financial outcomes of any kind</li>
          </ul>
          <p className="text-gray-700 dark:text-slate-200 leading-relaxed mb-4">
            <strong>Results vary significantly</strong> based on individual
            circumstances, credit history, creditor policies, and many other
            factors beyond our control.
          </p>
          <p className="text-gray-700 dark:text-slate-200 leading-relaxed">
            THE PLATFORM IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND,
            EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF
            MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR
            NON-INFRINGEMENT.
          </p>
        </section>

        {/* Section 7 */}
        <section id="user-obligations" className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            7. User Obligations
          </h2>
          <p className="text-gray-700 dark:text-slate-200 leading-relaxed mb-4">You agree to:</p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-slate-200 ml-4 mb-4">
            <li>Provide accurate and truthful information</li>
            <li>Use the Platform only for lawful purposes</li>
            <li>Not misrepresent facts in any generated documents</li>
            <li>Comply with all applicable federal and state laws</li>
            <li>Not use the Platform to engage in fraudulent activity</li>
            <li>Maintain the confidentiality of your account credentials</li>
            <li>Review and verify all AI-generated content before use</li>
          </ul>
          <p className="text-gray-700 dark:text-slate-200 leading-relaxed">
            Violation of these obligations may result in immediate termination
            of your account.
          </p>
        </section>

        {/* Section 8 */}
        <section id="payment" className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            8. Payment and Subscriptions
          </h2>
          <p className="text-gray-700 dark:text-slate-200 leading-relaxed mb-4">
            Access to the Platform requires a paid subscription. By subscribing,
            you agree to:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-slate-200 ml-4 mb-4">
            <li>Pay all fees associated with your chosen plan</li>
            <li>Automatic renewal unless cancelled before the renewal date</li>
            <li>No refunds for partial months or unused services</li>
            <li>Price changes with 30 days notice</li>
          </ul>
          <p className="text-gray-700 dark:text-slate-200 leading-relaxed">
            You may cancel your subscription at any time. Cancellation takes
            effect at the end of the current billing period.
          </p>
        </section>

        {/* Section 9 */}
        <section id="intellectual-property" className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            9. Intellectual Property
          </h2>
          <p className="text-gray-700 dark:text-slate-200 leading-relaxed mb-4">
            The Platform, including all software, content, designs, and
            trademarks, is owned by Fynvita and protected by intellectual
            property laws.
          </p>
          <p className="text-gray-700 dark:text-slate-200 leading-relaxed mb-4">
            <strong>Your Content:</strong> You retain ownership of any
            information you input into the Platform. You grant us a limited
            license to process your data solely to provide the Platform
            services.
          </p>
          <p className="text-gray-700 dark:text-slate-200 leading-relaxed">
            <strong>Generated Content:</strong> Documents and content generated
            by the Platform using your input are yours to use. However, you may
            not resell, redistribute, or commercialize the Platform's tools or
            templates.
          </p>
        </section>

        {/* Section 10 */}
        <section id="limitation" className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            10. Limitation of Liability
          </h2>
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
            <p className="text-red-800 font-semibold">
              IMPORTANT LEGAL LIMITATION
            </p>
          </div>
          <p className="text-gray-700 dark:text-slate-200 leading-relaxed mb-4">
            TO THE MAXIMUM EXTENT PERMITTED BY LAW:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-slate-200 ml-4 mb-4">
            <li>
              We are not liable for any damages arising from your use of the
              Platform
            </li>
            <li>
              We are not responsible for the accuracy of AI-generated content
            </li>
            <li>
              We are not liable for any credit score changes (positive or
              negative)
            </li>
            <li>
              We are not responsible for actions taken by credit bureaus,
              creditors, or collectors
            </li>
            <li>
              Our total liability is limited to the amount you paid for the
              Platform in the past 12 months
            </li>
          </ul>
          <p className="text-gray-700 dark:text-slate-200 leading-relaxed">
            You use the Platform at your own risk. We provide tools; you are
            responsible for how you use them.
          </p>
        </section>

        {/* Section 11 */}
        <section id="termination" className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            11. Termination
          </h2>
          <p className="text-gray-700 dark:text-slate-200 leading-relaxed mb-4">
            We reserve the right to terminate or suspend your account at any
            time for:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-slate-200 ml-4 mb-4">
            <li>Violation of these Terms of Service</li>
            <li>Fraudulent or illegal activity</li>
            <li>Non-payment of fees</li>
            <li>Abuse of the Platform or its resources</li>
          </ul>
          <p className="text-gray-700 dark:text-slate-200 leading-relaxed">
            Upon termination, your access to the Platform will cease
            immediately. You remain responsible for any outstanding fees.
          </p>
        </section>

        {/* Section 12 */}
        <section id="governing-law" className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            12. Governing Law
          </h2>
          <p className="text-gray-700 dark:text-slate-200 leading-relaxed mb-4">
            These Terms of Service are governed by the laws of the United States
            and the state in which Fynvita is registered, without regard to
            conflict of law principles.
          </p>
          <p className="text-gray-700 dark:text-slate-200 leading-relaxed">
            Any disputes arising from these terms or your use of the Platform
            shall be resolved through binding arbitration in accordance with the
            rules of the American Arbitration Association.
          </p>
        </section>

        {/* Additional Disclosures */}
        <section className="mb-8 bg-blue-50 p-6 rounded-lg">
          <h2 className="text-2xl font-bold text-blue-900 mb-4">
            Additional Disclosures
          </h2>

          <h3 className="text-lg font-bold text-blue-800 mb-2">
            Consumer Rights
          </h3>
          <p className="text-blue-700 mb-4 text-sm leading-relaxed">
            You have the right to dispute inaccurate information on your credit
            report under the Fair Credit Reporting Act (FCRA). You can file
            disputes directly with credit bureaus at no cost. The Platform
            provides tools to help you exercise these rights, but you are not
            required to use our Platform to dispute credit report errors.
          </p>

          <h3 className="text-lg font-bold text-blue-800 mb-2">
            AI-Generated Content
          </h3>
          <p className="text-blue-700 mb-4 text-sm leading-relaxed">
            Content generated by our AI tools is based on patterns and
            templates. It may contain errors or inaccuracies. You must review,
            verify, and edit all AI-generated content before use. We are not
            responsible for any consequences arising from the use of
            AI-generated content.
          </p>

          <h3 className="text-lg font-bold text-blue-800 mb-2">Data Privacy</h3>
          <p className="text-blue-700 text-sm leading-relaxed">
            Your use of the Platform is also governed by our Privacy Policy. We
            take data security seriously and employ industry-standard measures
            to protect your information. However, no system is 100% secure.
          </p>
        </section>

        {/* Contact */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Contact Us</h2>
          <p className="text-gray-700 dark:text-slate-200 leading-relaxed mb-4">
            If you have questions about these Terms of Service, please contact
            us at:
          </p>
          <div className="bg-gray-50 dark:bg-slate-900 p-4 rounded-lg">
            <p className="text-gray-700 dark:text-slate-200">
              <strong>Email:</strong> legal@fynvita.com
            </p>
            <p className="text-gray-700 dark:text-slate-200">
              <strong>Address:</strong> Fynvita Legal Department
            </p>
          </div>
        </section>

        {/* Acceptance */}
        <div className="border-t-2 border-gray-200 dark:border-slate-700 pt-6">
          <p className="text-sm text-gray-600 dark:text-slate-300 italic">
            By using Fynvita, you acknowledge that you have read, understood,
            and agree to be bound by these Terms of Service. If you do not
            agree, you must discontinue use of the Platform immediately.
          </p>
        </div>
      </div>
    </div>
  );
}
