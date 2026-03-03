"use client";

/**
 * Tax Optimization Dashboard
 *
 * Main tax optimization page providing:
 * - Tax savings overview
 * - Personalized recommendations
 * - Retirement account optimization
 * - Scenario modeling
 *
 * COMPLIANCE: Includes required disclaimers for tax advice
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Footer from "@/components/ui/Footer";

// Types
interface TaxRecommendation {
  id: string;
  title: string;
  summary: string;
  estimatedTaxSavings: number;
  priority: "critical" | "high" | "medium" | "low";
  deadline?: string;
  status: string;
}

interface TaxAnalysisResult {
  currentProjection: {
    grossIncome: number;
    taxableIncome: number;
    totalTax: number;
    effectiveRate: number;
    federalMarginalRate: number;
    takeHomePay: number;
    monthlyTakeHome: number;
  };
  opportunities: {
    strategyName: string;
    potentialTaxSavings: number;
    priority: string;
    remainingCapacity: number;
  }[];
  topRecommendations: TaxRecommendation[];
  totalPotentialSavings: number;
  retirementContributionGap: number;
  suggestedMonthlyContribution: number;
  assetLocationScore: number;
}

// Priority badge colors
const priorityColors = {
  critical: "bg-red-100 text-red-800 border-red-200",
  high: "bg-orange-100 text-orange-800 border-orange-200",
  medium: "bg-blue-100 text-blue-800 border-blue-200",
  low: "bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-slate-100 border-gray-200 dark:border-slate-700",
};

export default function TaxOptimizationPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<TaxAnalysisResult | null>(null);
  const [showDisclaimer, setShowDisclaimer] = useState(true);

  // Fetch tax analysis on mount
  useEffect(() => {
    fetchTaxAnalysis();
  }, []);

  const fetchTaxAnalysis = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/tax/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taxYear: new Date().getFullYear(),
          grossIncome: 300000,
          filingStatus: "single",
          stateOfResidence: "CA",
          ytd401kContribution: 10000,
          ytdIraContribution: 0,
          ytdHsaContribution: 1000,
          hasHdhp: true,
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          router.push("/login?redirect=/tax");
          return;
        }
        throw new Error("Failed to fetch tax analysis");
      }

      const result = await response.json();
      setAnalysis(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercent = (rate: number) => {
    return `${(rate * 100).toFixed(1)}%`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800/80 backdrop-blur-xl border-b border-gray-200 dark:border-slate-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-2">
                <span className="text-2xl"></span>
                <span className="text-xl font-semibold text-gray-900 dark:text-white">
                  Fynvita
                </span>
              </Link>
              <span className="text-gray-300">|</span>
              <h1 className="text-lg font-semibold text-amber-600">
                Tax Optimization
              </h1>
            </div>
            <nav className="flex items-center gap-6">
              <Link
                href="/tax/documents"
                className="text-sm text-gray-600 dark:text-slate-300 hover:text-amber-600"
              >
                Documents
              </Link>
              <Link
                href="/tax/scenarios"
                className="text-sm text-gray-600 dark:text-slate-300 hover:text-amber-600"
              >
                Scenarios
              </Link>
              <Link
                href="/tax/calendar"
                className="text-sm text-gray-600 dark:text-slate-300 hover:text-amber-600"
              >
                Calendar
              </Link>
              <Link
                href="/dashboard"
                className="text-sm text-gray-600 hover:text-gray-900 dark:text-white dark:hover:text-white"
              >
                Dashboard
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Disclaimer Banner */}
      {showDisclaimer && (
        <div className="bg-amber-50 border-b border-amber-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-start gap-3">
              <span className="text-amber-600 text-lg"></span>
              <div className="flex-1">
                <p className="text-sm text-amber-800">
                  <strong>Important:</strong> Tax recommendations are for
                  informational purposes only and do not constitute tax, legal,
                  or financial advice. Consult a qualified tax professional
                  before making any tax-related decisions.
                </p>
              </div>
              <button
                onClick={() => setShowDisclaimer(false)}
                className="text-amber-600 hover:text-amber-800"
              >
                <svg
                  className="w-5 h-5"
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
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-slate-300">
                Analyzing your tax situation...
              </p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <p className="text-red-800 mb-4">{error}</p>
            <button
              onClick={fetchTaxAnalysis}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Retry Analysis
            </button>
          </div>
        )}

        {/* Main Content */}
        {analysis && !isLoading && (
          <>
            {/* Hero Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              {/* Potential Savings */}
              <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl p-6 text-white shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-amber-100 text-sm font-medium">
                    Potential Tax Savings
                  </span>
                  <span className="text-2xl"></span>
                </div>
                <p className="text-3xl font-bold">
                  {formatCurrency(analysis.totalPotentialSavings)}
                </p>
                <p className="text-amber-100 text-sm mt-1">
                  Available this year
                </p>
              </div>

              {/* Effective Tax Rate */}
              <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-500 dark:text-slate-400 text-sm font-medium">
                    Effective Tax Rate
                  </span>
                  <span className="text-xl"></span>
                </div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {formatPercent(analysis.currentProjection.effectiveRate)}
                </p>
                <p className="text-gray-500 dark:text-slate-400 text-sm mt-1">
                  Marginal:{" "}
                  {formatPercent(
                    analysis.currentProjection.federalMarginalRate,
                  )}
                </p>
              </div>

              {/* Monthly Take-Home */}
              <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-500 dark:text-slate-400 text-sm font-medium">
                    Monthly Take-Home
                  </span>
                  <span className="text-xl"></span>
                </div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(analysis.currentProjection.monthlyTakeHome)}
                </p>
                <p className="text-gray-500 dark:text-slate-400 text-sm mt-1">
                  After all taxes
                </p>
              </div>

              {/* Retirement Gap */}
              <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-500 dark:text-slate-400 text-sm font-medium">
                    Retirement Contribution Gap
                  </span>
                  <span className="text-xl"></span>
                </div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(analysis.retirementContributionGap)}
                </p>
                <p className="text-gray-500 dark:text-slate-400 text-sm mt-1">
                  +{formatCurrency(analysis.suggestedMonthlyContribution)}/mo
                  suggested
                </p>
              </div>
            </div>

            {/* Recommendations Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Top Recommendations */}
              <div className="lg:col-span-2">
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Tax-Saving Recommendations
                    </h2>
                    <span className="text-sm text-gray-500 dark:text-slate-400">
                      {analysis.topRecommendations.length} opportunities
                    </span>
                  </div>
                  <div className="divide-y divide-gray-100 dark:divide-slate-700">
                    {analysis.topRecommendations.map((rec, index) => (
                      <div
                        key={rec.id || index}
                        className="p-6 hover:bg-gray-50 dark:hover:bg-slate-700 dark:bg-slate-900 transition-colors"
                      >
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${priorityColors[rec.priority]}`}
                            >
                              {rec.priority}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
                              {rec.title}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-slate-300 mb-2">
                              {rec.summary}
                            </p>
                            <div className="flex items-center gap-4 text-sm">
                              <span className="text-green-600 font-medium">
                                Save {formatCurrency(rec.estimatedTaxSavings)}
                              </span>
                              {rec.deadline && (
                                <span className="text-gray-500 dark:text-slate-400">
                                  Deadline:{" "}
                                  {new Date(rec.deadline).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                          <button className="flex-shrink-0 px-4 py-2 bg-amber-100 text-amber-700 rounded-lg text-sm font-medium hover:bg-amber-200 transition-colors">
                            View Details
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Tax Breakdown */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-6">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
                    Tax Breakdown
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-slate-300">
                        Gross Income
                      </span>
                      <span className="font-medium">
                        {formatCurrency(analysis.currentProjection.grossIncome)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-slate-300">
                        Taxable Income
                      </span>
                      <span className="font-medium">
                        {formatCurrency(
                          analysis.currentProjection.taxableIncome,
                        )}
                      </span>
                    </div>
                    <hr className="my-2" />
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-slate-300">
                        Total Tax
                      </span>
                      <span className="font-semibold text-red-600">
                        -{formatCurrency(analysis.currentProjection.totalTax)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-slate-300">
                        Annual Take-Home
                      </span>
                      <span className="font-semibold text-green-600">
                        {formatCurrency(analysis.currentProjection.takeHomePay)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Asset Location Score */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-6">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
                    Asset Location Score
                  </h3>
                  <div className="relative pt-1">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-3xl font-bold text-gray-900 dark:text-white">
                        {analysis.assetLocationScore}
                      </span>
                      <span className="text-gray-500 dark:text-slate-400">
                        /100
                      </span>
                    </div>
                    <div className="overflow-hidden h-2 text-xs flex rounded-full bg-gray-200 dark:bg-slate-700">
                      <div
                        className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-500"
                        style={{ width: `${analysis.assetLocationScore}%` }}
                      />
                    </div>
                    <p className="text-sm text-gray-500 dark:text-slate-400 mt-2">
                      {analysis.assetLocationScore >= 80
                        ? "Excellent"
                        : analysis.assetLocationScore >= 60
                          ? "Good"
                          : "Needs Improvement"}
                    </p>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-6">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
                    Quick Actions
                  </h3>
                  <div className="space-y-3">
                    <Link
                      href="/tax/documents"
                      className="block w-full px-4 py-3 bg-green-50 text-green-700 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors text-center"
                    >
                      Upload Tax Documents
                    </Link>
                    <Link
                      href="/tax/scenarios"
                      className="block w-full px-4 py-3 bg-amber-50 text-amber-700 rounded-lg text-sm font-medium hover:bg-amber-100 transition-colors text-center"
                    >
                      Run What-If Scenario
                    </Link>
                    <Link
                      href="/tax/calendar"
                      className="block w-full px-4 py-3 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors text-center"
                    >
                      View Tax Calendar
                    </Link>
                    <button
                      onClick={fetchTaxAnalysis}
                      className="block w-full px-4 py-3 bg-gray-50 text-gray-700 dark:text-slate-200 rounded-lg text-sm font-medium hover:bg-gray-100 dark:hover:bg-slate-700 dark:bg-slate-800 transition-colors text-center"
                    >
                      Refresh Analysis
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
