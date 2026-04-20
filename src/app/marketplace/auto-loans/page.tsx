"use client";

/**
 * Auto Loans Marketplace
 *
 * Personalized auto loan rate comparison with affordability analysis,
 * lender recommendations, and term comparison table.
 */

import { useState, useMemo } from "react";
import PreApprovalBadge from "@/components/marketplace/PreApprovalBadge";
import autoLoanMatcher, {
  type AutoLoanMatcherInput,
  type AutoLoanRecommendation,
} from "@/lib/commerce/matching/auto-loan-matcher";
import {
  calculateAffordability,
  compareTerms,
  type AutoLoanCalculation,
} from "@/lib/commerce/calculators/auto-loan-calculator";

// =============================================================================
// Types
// =============================================================================

type CreditScoreTier = "excellent" | "good" | "fair" | "poor";

const SCORE_TIERS: Record<CreditScoreTier, { label: string; score: number; color: string }> = {
  excellent: { label: "Excellent (750+)", score: 780, color: "text-emerald-600 dark:text-emerald-400" },
  good: { label: "Good (700–749)", score: 720, color: "text-blue-600 dark:text-blue-400" },
  fair: { label: "Fair (640–699)", score: 670, color: "text-amber-600 dark:text-amber-400" },
  poor: { label: "Poor (500–639)", score: 580, color: "text-red-600 dark:text-red-400" },
};

const AVAILABLE_TERMS = [36, 48, 60, 72, 84] as const;

// =============================================================================
// Formatters
// =============================================================================

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

function formatAPR(decimal: number): string {
  return `${(decimal * 100).toFixed(2)}%`;
}

// =============================================================================
// Sub-components
// =============================================================================

function SectionCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-gray-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800 ${className}`}>
      {children}
    </div>
  );
}

function AffordabilitySummary({
  monthlyIncome,
  currentMonthlyDebt,
}: {
  monthlyIncome: number;
  currentMonthlyDebt: number;
}) {
  const result = useMemo(
    () => calculateAffordability(monthlyIncome, currentMonthlyDebt),
    [monthlyIncome, currentMonthlyDebt],
  );

  return (
    <SectionCard>
      <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">
        Your Affordability Range
      </h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-slate-400">
            Max Monthly Payment
          </p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(result.maxMonthlyPayment)}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-slate-400">
            Max Loan Amount
          </p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(result.maxLoanAmount)}
          </p>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-slate-400">
            Recommended Budget
          </p>
          <p className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(result.recommendedMaxPrice)}
          </p>
          <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
            With 20% down
          </p>
        </div>
      </div>
      <div className="mt-4 rounded-lg bg-blue-50 px-4 py-2.5 dark:bg-blue-900/20">
        <p className="text-xs text-blue-700 dark:text-blue-300">
          Based on a maximum DTI of 36%. Your current DTI is{" "}
          {(((currentMonthlyDebt / Math.max(monthlyIncome, 1))) * 100).toFixed(0)}%.
        </p>
      </div>
    </SectionCard>
  );
}

function LenderCard({ rec }: { rec: AutoLoanRecommendation }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 transition-shadow duration-150 hover:shadow-md dark:border-slate-700 dark:bg-slate-800">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-gray-900 dark:text-white">
            {rec.lenderName}
          </h3>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-slate-400">
            {rec.termMonths}-month term
          </p>
        </div>
        <div className="flex-shrink-0 text-right">
          <p className="text-xs text-gray-500 dark:text-slate-400">Est. APR</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            {formatAPR(rec.estimatedAPR.min)}–{formatAPR(rec.estimatedAPR.max)}
          </p>
        </div>
      </div>

      {/* Key figures */}
      <div className="mt-4 grid grid-cols-3 gap-3 rounded-lg bg-gray-50 p-3 dark:bg-slate-700/40">
        <div className="text-center">
          <p className="text-xs text-gray-500 dark:text-slate-400">Monthly</p>
          <p className="mt-0.5 text-base font-bold text-gray-900 dark:text-white">
            {formatCurrency(rec.monthlyPayment)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500 dark:text-slate-400">Total Cost</p>
          <p className="mt-0.5 text-base font-bold text-gray-900 dark:text-white">
            {formatCurrency(rec.totalCost)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500 dark:text-slate-400">Total Interest</p>
          <p className="mt-0.5 text-base font-bold text-red-600 dark:text-red-400">
            {formatCurrency(rec.totalInterest)}
          </p>
        </div>
      </div>

      {/* Pre-approval badge */}
      <div className="mt-4">
        <PreApprovalBadge odds={rec.preApprovalOdds} />
      </div>

      {/* Highlights */}
      <ul className="mt-3 space-y-1.5">
        {rec.highlights.map((h) => (
          <li key={h} className="flex items-start gap-2 text-sm text-gray-600 dark:text-slate-300">
            <svg
              className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                clipRule="evenodd"
              />
            </svg>
            {h}
          </li>
        ))}
      </ul>

      {/* CTA */}
      <a
        href={`https://www.google.com/search?q=${encodeURIComponent(rec.lenderName + " auto loan")}`}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-5 flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        Apply Now
        <svg className="ml-1.5 h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path
            fillRule="evenodd"
            d="M5.22 14.78a.75.75 0 001.06 0l7.22-7.22v5.69a.75.75 0 001.5 0v-7.5a.75.75 0 00-.75-.75h-7.5a.75.75 0 000 1.5h5.69l-7.22 7.22a.75.75 0 000 1.06z"
            clipRule="evenodd"
          />
        </svg>
      </a>
    </div>
  );
}

function TermComparisonTable({
  vehiclePrice,
  downPayment,
  apr,
}: {
  vehiclePrice: number;
  downPayment: number;
  apr: number;
}) {
  const terms = useMemo(
    () => compareTerms(vehiclePrice, downPayment, apr, [...AVAILABLE_TERMS]),
    [vehiclePrice, downPayment, apr],
  );

  return (
    <SectionCard>
      <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">
        Term Comparison at {formatAPR(apr)} APR
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-slate-700">
              <th className="pb-2 pr-4 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-slate-400">
                Term
              </th>
              <th className="pb-2 pr-4 text-right text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-slate-400">
                Monthly
              </th>
              <th className="pb-2 pr-4 text-right text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-slate-400">
                Total Cost
              </th>
              <th className="pb-2 text-right text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-slate-400">
                Total Interest
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
            {terms.map((t: AutoLoanCalculation) => (
              <tr key={t.termMonths} className="hover:bg-gray-50 dark:hover:bg-slate-700/20">
                <td className="py-2.5 pr-4 font-medium text-gray-900 dark:text-white">
                  {t.termMonths} mo
                </td>
                <td className="py-2.5 pr-4 text-right text-gray-900 dark:text-white">
                  {formatCurrency(t.monthlyPayment)}
                </td>
                <td className="py-2.5 pr-4 text-right text-gray-900 dark:text-white">
                  {formatCurrency(t.totalCost)}
                </td>
                <td className="py-2.5 text-right text-red-600 dark:text-red-400">
                  {formatCurrency(t.totalInterest)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-gray-400 dark:text-slate-500">
        Shorter terms save more in interest. Longer terms reduce monthly payment pressure.
      </p>
    </SectionCard>
  );
}

function Disclosure() {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 px-5 py-4 dark:border-slate-700/50 dark:bg-slate-800/50">
      <p className="text-xs leading-relaxed text-gray-500 dark:text-slate-400">
        <strong>Advertiser Disclosure:</strong> Fynvita may receive compensation from lenders featured on this page.
        Compensation may influence how and where products appear. Rates shown are estimates based on your credit profile
        and do not constitute a loan offer. Actual rates, terms, and conditions are determined by the lender upon
        application. All applications are subject to credit approval.{" "}
        <strong>Rate Disclosure:</strong> APRs and monthly payment figures are for illustrative purposes only.
        Please review all terms carefully before applying.
      </p>
    </div>
  );
}

// =============================================================================
// Page
// =============================================================================

export default function AutoLoansPage() {
  const [vehiclePrice, setVehiclePrice] = useState(30000);
  const [downPayment, setDownPayment] = useState(5000);
  const [creditTier, setCreditTier] = useState<CreditScoreTier>("good");
  const [term, setTerm] = useState<number>(60);
  const [isNew, setIsNew] = useState(true);
  const [monthlyIncome, setMonthlyIncome] = useState(6000);
  const [currentDebt, setCurrentDebt] = useState(400);
  const [formOpen, setFormOpen] = useState(true);

  const creditScore = SCORE_TIERS[creditTier].score;

  const matcherInput: AutoLoanMatcherInput = useMemo(
    () => ({
      creditScore,
      monthlyIncome,
      currentMonthlyDebt: currentDebt,
      vehiclePrice,
      downPayment,
      preferredTerm: term,
      isNewVehicle: isNew,
      vehicleYear: isNew ? new Date().getFullYear() : new Date().getFullYear() - 4,
    }),
    [creditScore, monthlyIncome, currentDebt, vehiclePrice, downPayment, term, isNew],
  );

  const recommendations = useMemo(
    () => autoLoanMatcher.getRecommendations(matcherInput),
    [matcherInput],
  );

  const benchmarkAPR = recommendations.length > 0
    ? recommendations[0].estimatedAPR.likely
    : 0.07;

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400">
          Marketplace
        </p>
        <h1 className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">
          Find Your Best Auto Loan Rate
        </h1>
        <p className="mt-2 text-gray-500 dark:text-slate-400">
          Compare rates from {recommendations.length > 0 ? recommendations.length : "top"} lenders. No hard inquiry to check your options.
        </p>
      </div>

      {/* Input form */}
      <SectionCard>
        <button
          type="button"
          onClick={() => setFormOpen((v) => !v)}
          className="flex w-full items-center justify-between text-left"
          aria-expanded={formOpen}
        >
          <span className="text-base font-semibold text-gray-900 dark:text-white">
            Your Loan Details
          </span>
          <svg
            className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${formOpen ? "rotate-180" : ""}`}
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        {formOpen && (
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* Vehicle type */}
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">
                Vehicle Type
              </label>
              <div className="mt-2 flex gap-3">
                {[true, false].map((v) => (
                  <button
                    key={String(v)}
                    type="button"
                    onClick={() => setIsNew(v)}
                    className={[
                      "flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors duration-150",
                      isNew === v
                        ? "border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-900/30 dark:text-blue-300"
                        : "border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700",
                    ].join(" ")}
                  >
                    {v ? "New Vehicle" : "Used Vehicle"}
                  </button>
                ))}
              </div>
            </div>

            {/* Vehicle price */}
            <div>
              <label
                htmlFor="vehicle-price"
                className="block text-sm font-medium text-gray-700 dark:text-slate-300"
              >
                Vehicle Price: {formatCurrency(vehiclePrice)}
              </label>
              <input
                id="vehicle-price"
                type="range"
                min={5000}
                max={100000}
                step={500}
                value={vehiclePrice}
                onChange={(e) => setVehiclePrice(Number(e.target.value))}
                className="mt-2 w-full accent-blue-600"
                aria-label="Vehicle price slider"
              />
              <div className="mt-1 flex justify-between text-xs text-gray-400 dark:text-slate-500">
                <span>$5K</span>
                <span>$100K</span>
              </div>
            </div>

            {/* Down payment */}
            <div>
              <label
                htmlFor="down-payment"
                className="block text-sm font-medium text-gray-700 dark:text-slate-300"
              >
                Down Payment: {formatCurrency(downPayment)}
              </label>
              <input
                id="down-payment"
                type="range"
                min={0}
                max={Math.min(vehiclePrice, 30000)}
                step={500}
                value={downPayment}
                onChange={(e) => setDownPayment(Number(e.target.value))}
                className="mt-2 w-full accent-blue-600"
                aria-label="Down payment slider"
              />
              <div className="mt-1 flex justify-between text-xs text-gray-400 dark:text-slate-500">
                <span>$0</span>
                <span>{formatCurrency(Math.min(vehiclePrice, 30000))}</span>
              </div>
            </div>

            {/* Loan term */}
            <div>
              <label
                htmlFor="loan-term"
                className="block text-sm font-medium text-gray-700 dark:text-slate-300"
              >
                Preferred Term
              </label>
              <select
                id="loan-term"
                value={term}
                onChange={(e) => setTerm(Number(e.target.value))}
                className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
              >
                {AVAILABLE_TERMS.map((t) => (
                  <option key={t} value={t}>
                    {t} months
                  </option>
                ))}
              </select>
            </div>

            {/* Credit score */}
            <div>
              <label
                htmlFor="credit-tier"
                className="block text-sm font-medium text-gray-700 dark:text-slate-300"
              >
                Credit Score
              </label>
              <select
                id="credit-tier"
                value={creditTier}
                onChange={(e) => setCreditTier(e.target.value as CreditScoreTier)}
                className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
              >
                {(Object.entries(SCORE_TIERS) as [CreditScoreTier, (typeof SCORE_TIERS)[CreditScoreTier]][]).map(
                  ([key, val]) => (
                    <option key={key} value={key}>
                      {val.label}
                    </option>
                  ),
                )}
              </select>
            </div>

            {/* Monthly income */}
            <div>
              <label
                htmlFor="monthly-income"
                className="block text-sm font-medium text-gray-700 dark:text-slate-300"
              >
                Monthly Income: {formatCurrency(monthlyIncome)}
              </label>
              <input
                id="monthly-income"
                type="range"
                min={1000}
                max={30000}
                step={500}
                value={monthlyIncome}
                onChange={(e) => setMonthlyIncome(Number(e.target.value))}
                className="mt-2 w-full accent-blue-600"
                aria-label="Monthly income slider"
              />
            </div>

            {/* Current monthly debt */}
            <div>
              <label
                htmlFor="current-debt"
                className="block text-sm font-medium text-gray-700 dark:text-slate-300"
              >
                Existing Monthly Debt: {formatCurrency(currentDebt)}
              </label>
              <input
                id="current-debt"
                type="range"
                min={0}
                max={5000}
                step={50}
                value={currentDebt}
                onChange={(e) => setCurrentDebt(Number(e.target.value))}
                className="mt-2 w-full accent-blue-600"
                aria-label="Existing monthly debt slider"
              />
            </div>
          </div>
        )}
      </SectionCard>

      {/* Affordability summary */}
      <AffordabilitySummary
        monthlyIncome={monthlyIncome}
        currentMonthlyDebt={currentDebt}
      />

      {/* Lender results */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {recommendations.length > 0
              ? `${recommendations.length} Lenders Match Your Profile`
              : "No Lenders Found"}
          </h2>
          {recommendations.length > 0 && (
            <span className={`text-sm font-medium ${SCORE_TIERS[creditTier].color}`}>
              {SCORE_TIERS[creditTier].label}
            </span>
          )}
        </div>

        {recommendations.length === 0 ? (
          <SectionCard>
            <div className="py-8 text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-300 dark:text-slate-600"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                />
              </svg>
              <p className="mt-3 text-base font-medium text-gray-700 dark:text-slate-300">
                No lenders match your current profile
              </p>
              <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                Consider working on your credit score or adjusting your vehicle budget.
              </p>
            </div>
          </SectionCard>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {recommendations.map((rec) => (
              <LenderCard key={rec.offerId} rec={rec} />
            ))}
          </div>
        )}
      </div>

      {/* Term comparison table */}
      <TermComparisonTable
        vehiclePrice={vehiclePrice}
        downPayment={downPayment}
        apr={benchmarkAPR}
      />

      {/* Disclosure */}
      <Disclosure />
    </div>
  );
}
