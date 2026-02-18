import {
  CreditScoreSimulator,
  PSLFTracker,
  MortgageReadinessScore,
} from "@/components/persona";

export const metadata = {
  title: "Persona Features - Fynvita",
  description: "Specialized features for different user personas",
};

export default function PersonaFeaturesPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Persona-Specific Features
          </h1>
          <p className="text-xl text-gray-600 dark:text-slate-300 max-w-3xl mx-auto">
            Specialized tools designed for your unique financial journey
          </p>
        </div>

        {/* Feature Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200 dark:border-slate-700">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              <a
                href="#credit-simulator"
                className="border-blue-500 text-blue-600 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm"
              >
                Credit Score Simulator
              </a>
              <a
                href="#pslf-tracker"
                className="border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-slate-200 dark:text-slate-200 hover:border-gray-300 dark:border-slate-600 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm"
              >
                PSLF Tracker
              </a>
              <a
                href="#mortgage-readiness"
                className="border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-slate-200 dark:text-slate-200 hover:border-gray-300 dark:border-slate-600 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm"
              >
                Mortgage Readiness
              </a>
            </nav>
          </div>
        </div>

        {/* Features Grid */}
        <div className="space-y-12">
          {/* Credit Score Simulator */}
          <section id="credit-simulator">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Credit Score Simulator
              </h2>
              <p className="text-gray-600 dark:text-slate-300">
                For{" "}
                <span className="font-semibold text-blue-600">
                  Sarah Martinez
                </span>{" "}
                - The Credit Rebuilder
              </p>
              <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                See how different actions could impact your credit score
              </p>
            </div>
            <CreditScoreSimulator />
          </section>

          {/* PSLF Tracker */}
          <section id="pslf-tracker">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                PSLF Tracker
              </h2>
              <p className="text-gray-600 dark:text-slate-300">
                For{" "}
                <span className="font-semibold text-blue-600">James Chen</span>{" "}
                - The Student Loan Strategist
              </p>
              <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                Track your progress toward Public Service Loan Forgiveness
              </p>
            </div>
            <PSLFTracker />
          </section>

          {/* Mortgage Readiness Score */}
          <section id="mortgage-readiness">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Mortgage Readiness Score
              </h2>
              <p className="text-gray-600 dark:text-slate-300">
                For{" "}
                <span className="font-semibold text-blue-600">
                  Emily Parker
                </span>{" "}
                - The Mortgage Applicant
              </p>
              <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                Assess your readiness to apply for a mortgage
              </p>
            </div>
            <MortgageReadinessScore />
          </section>
        </div>

        {/* Call to Action */}
        <div className="mt-16 bg-gradient-to-r from-blue-600 to-blue-600 rounded-xl shadow-xl p-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Transform Your Financial Future?
          </h2>
          <p className="text-xl text-blue-100 mb-6 max-w-2xl mx-auto">
            Get personalized recommendations and AI-powered tools to achieve
            your financial goals
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/dashboard"
              className="inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-lg text-blue-600 bg-white hover:bg-gray-50 dark:hover:bg-slate-700 dark:bg-slate-900 transition-colors"
            >
              Go to Dashboard
            </a>
            <a
              href="/ai-tools"
              className="inline-flex items-center justify-center px-8 py-3 border-2 border-white text-base font-medium rounded-lg text-white hover:bg-white dark:bg-slate-800 hover:text-blue-600 transition-colors"
            >
              Explore AI Tools
            </a>
          </div>
        </div>

        {/* Feature Comparison */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8 text-center">
            Which Features Are Right for You?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Credit Rebuilder */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 border-t-4 border-green-500">
              <div className="text-4xl mb-4"></div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Credit Rebuilder
              </h3>
              <p className="text-gray-600 dark:text-slate-300 mb-4">
                Focus on improving your credit score
              </p>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-slate-300">
                <li className="flex items-start">
                  <span className="text-green-500 mr-2"></span>
                  Credit Score Simulator
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2"></span>
                  Dispute Generator
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2"></span>
                  Credit Analyzer
                </li>
              </ul>
            </div>

            {/* Student Loan Strategist */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 border-t-4 border-blue-500">
              <div className="text-4xl mb-4"></div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Student Loan Strategist
              </h3>
              <p className="text-gray-600 dark:text-slate-300 mb-4">
                Optimize your student loan repayment
              </p>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-slate-300">
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2"></span>
                  PSLF Tracker
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2"></span>
                  Loan Strategy Calculator
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2"></span>
                  Federal Programs Guide
                </li>
              </ul>
            </div>

            {/* Mortgage Applicant */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 border-t-4 border-blue-500">
              <div className="text-4xl mb-4"></div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Mortgage Applicant
              </h3>
              <p className="text-gray-600 dark:text-slate-300 mb-4">
                Prepare for homeownership
              </p>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-slate-300">
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2"></span>
                  Mortgage Readiness Score
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2"></span>
                  Credit Score Simulator
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2"></span>
                  Dispute Accelerator
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
