"use client";

/**
 * Auto Insurance Comparison Marketplace
 *
 * Compare mock insurance quotes from top providers with driving profile
 * inputs, coverage explainer, and premium-lowering tips.
 */

import { useState, useMemo } from "react";

// =============================================================================
// Types
// =============================================================================

type DrivingRecord = "clean" | "minor" | "major";
type CoverageLevel = "liability" | "standard" | "full";

interface InsuranceQuote {
  id: string;
  insurer: string;
  logoInitials: string;
  logoColor: string;
  monthlyPremium: number;
  annualPremium: number;
  deductible: number;
  coverage: string;
  discounts: string[];
  applyUrl: string;
  bestFor: string;
}

// =============================================================================
// Mock insurer data
// =============================================================================

function buildQuotes(
  age: number,
  record: DrivingRecord,
  annualMiles: number,
  vehicleYear: number,
  coverage: CoverageLevel,
): InsuranceQuote[] {
  const vehicleAge = new Date().getFullYear() - vehicleYear;
  const ageFactor = age < 25 ? 1.35 : age > 65 ? 1.1 : 1.0;
  const recordFactor = record === "major" ? 1.6 : record === "minor" ? 1.2 : 1.0;
  const milesFactor = annualMiles > 15000 ? 1.15 : annualMiles < 7500 ? 0.9 : 1.0;
  const vehicleFactor = vehicleAge < 3 ? 1.1 : vehicleAge > 10 ? 0.85 : 1.0;
  const coverageFactor = coverage === "full" ? 1.4 : coverage === "standard" ? 1.15 : 1.0;

  const composite = ageFactor * recordFactor * milesFactor * vehicleFactor * coverageFactor;

  const baseRates: Array<{
    id: string;
    insurer: string;
    initials: string;
    color: string;
    base: number;
    deductible: number;
    coverageDesc: string;
    discounts: string[];
    bestFor: string;
  }> = [
    { id: "state-farm", insurer: "State Farm", initials: "SF", color: "#cc0000", base: 94, deductible: 500, coverageDesc: "Comprehensive + collision + liability", discounts: ["Multi-car discount", "Good driver", "Steer Clear program"], bestFor: "Best overall value" },
    { id: "geico", insurer: "GEICO", initials: "GE", color: "#0056b3", base: 87, deductible: 500, coverageDesc: "Liability + collision + comprehensive", discounts: ["Federal employee", "Military", "Multi-vehicle"], bestFor: "Lowest base rate" },
    { id: "progressive", insurer: "Progressive", initials: "PR", color: "#0090c2", base: 98, deductible: 250, coverageDesc: "Comprehensive + collision + rideshare", discounts: ["Snapshot (usage-based)", "Homeowner bundle", "Paid-in-full"], bestFor: "Usage-based savings" },
    { id: "allstate", insurer: "Allstate", initials: "AL", color: "#0040a0", base: 108, deductible: 500, coverageDesc: "Full coverage + accident forgiveness", discounts: ["Safe driver bonus", "New car", "FullPay discount"], bestFor: "Accident forgiveness" },
    { id: "usaa", insurer: "USAA", initials: "UA", color: "#1a3a6b", base: 78, deductible: 500, coverageDesc: "Comprehensive + collision + military perks", discounts: ["Military member", "Safe driver", "Vehicle storage"], bestFor: "Military members only" },
  ];

  return baseRates.map(({ id, insurer, initials, color, base, deductible, coverageDesc, discounts, bestFor }) => {
    const monthlyPremium = Math.round(base * composite);
    return {
      id,
      insurer,
      logoInitials: initials,
      logoColor: color,
      monthlyPremium,
      annualPremium: monthlyPremium * 12,
      deductible,
      coverage: coverageDesc,
      discounts,
      applyUrl: `https://www.${insurer.toLowerCase().replace(/\s+/g, "")}.com`,
      bestFor,
    };
  });
}

// =============================================================================
// Formatters
// =============================================================================

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
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

function QuoteCard({ quote, rank }: { quote: InsuranceQuote; rank: number }) {
  return (
    <div className="relative rounded-2xl border border-gray-200 bg-white p-6 transition-shadow duration-150 hover:shadow-md dark:border-slate-700 dark:bg-slate-800">
      {rank === 1 && (
        <span className="absolute -top-3 left-5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:ring-emerald-700/50">
          Lowest Rate
        </span>
      )}

      {/* Header */}
      <div className="flex items-center gap-4">
        <div
          className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white"
          style={{ backgroundColor: quote.logoColor }}
          aria-label={quote.insurer + " logo"}
        >
          {quote.logoInitials}
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-white">{quote.insurer}</h3>
          <p className="text-xs text-gray-500 dark:text-slate-400">{quote.bestFor}</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(quote.monthlyPremium)}
          </p>
          <p className="text-xs text-gray-500 dark:text-slate-400">/month</p>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-gray-50 p-3 dark:bg-slate-700/40">
        <div>
          <p className="text-xs text-gray-500 dark:text-slate-400">Annual</p>
          <p className="mt-0.5 font-semibold text-gray-900 dark:text-white">
            {formatCurrency(quote.annualPremium)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-slate-400">Deductible</p>
          <p className="mt-0.5 font-semibold text-gray-900 dark:text-white">
            {formatCurrency(quote.deductible)}
          </p>
        </div>
      </div>

      {/* Coverage */}
      <p className="mt-3 text-sm text-gray-600 dark:text-slate-300">{quote.coverage}</p>

      {/* Discounts */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {quote.discounts.map((d) => (
          <span
            key={d}
            className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
          >
            {d}
          </span>
        ))}
      </div>

      {/* CTA */}
      <a
        href={quote.applyUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-5 flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        Get Quote
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
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

function CoverageExplainer() {
  const types = [
    {
      name: "Liability",
      required: true,
      description:
        "Covers damage and injuries you cause to others. Legally required in most states. Does not cover your own vehicle.",
    },
    {
      name: "Collision",
      required: false,
      description:
        "Pays to repair or replace your car after a crash, regardless of fault. Required by lenders if you finance your vehicle.",
    },
    {
      name: "Comprehensive",
      required: false,
      description:
        "Covers non-collision damage: theft, weather, fire, and vandalism. Often paired with collision for full coverage.",
    },
    {
      name: "Uninsured Motorist",
      required: false,
      description:
        "Protects you if you're hit by a driver with no insurance or insufficient coverage. Highly recommended.",
    },
  ];

  return (
    <SectionCard>
      <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">
        Understanding Your Coverage
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {types.map((t) => (
          <div key={t.name} className="flex gap-3">
            <div className="mt-0.5 flex-shrink-0">
              {t.required ? (
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400">
                  <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path
                      fillRule="evenodd"
                      d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
              ) : (
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400">
                  <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{t.name}</p>
                {t.required && (
                  <span className="rounded-full bg-red-50 px-1.5 py-0.5 text-xs text-red-600 dark:bg-red-900/30 dark:text-red-400">
                    Required
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-sm text-gray-500 dark:text-slate-400">{t.description}</p>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

function PremiumTips() {
  const tips = [
    { title: "Bundle home and auto", detail: "Save up to 20% by insuring your home and car with the same provider." },
    { title: "Raise your deductible", detail: "Increasing your deductible from $500 to $1,000 can cut premiums by 15–30%." },
    { title: "Drive fewer miles", detail: "Enrolling in a low-mileage or usage-based program can reduce rates significantly." },
    { title: "Maintain a clean record", detail: "Three years without incidents can cut your rate by 20% or more." },
    { title: "Improve your credit score", detail: "Most states allow insurers to use credit history as a rating factor." },
    { title: "Ask about discounts", detail: "Discounts exist for good students, military service, professional associations, and more." },
  ];

  return (
    <SectionCard>
      <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">
        Tips to Lower Your Premium
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tips.map((tip) => (
          <div key={tip.title} className="rounded-lg bg-gray-50 p-4 dark:bg-slate-700/40">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{tip.title}</p>
            <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">{tip.detail}</p>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

function Disclosure() {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 px-5 py-4 dark:border-slate-700/50 dark:bg-slate-800/50">
      <p className="text-xs leading-relaxed text-gray-500 dark:text-slate-400">
        <strong>Advertiser Disclosure:</strong> Fynvita may receive compensation when you click links to insurance
        providers. Quotes shown are illustrative estimates based on the profile inputs provided and do not constitute
        an actual insurance offer. Final premiums are determined by the insurer following a full underwriting review.
        USAA products are only available to military members, veterans, and their eligible family members.
      </p>
    </div>
  );
}

// =============================================================================
// Page
// =============================================================================

export default function AutoInsurancePage() {
  const [age, setAge] = useState(32);
  const [record, setRecord] = useState<DrivingRecord>("clean");
  const [annualMiles, setAnnualMiles] = useState(12000);
  const [vehicleYear, setVehicleYear] = useState(2021);
  const [coverage, setCoverage] = useState<CoverageLevel>("standard");

  const currentYear = new Date().getFullYear();

  const quotes = useMemo(
    () =>
      buildQuotes(age, record, annualMiles, vehicleYear, coverage).sort(
        (a, b) => a.monthlyPremium - b.monthlyPremium,
      ),
    [age, record, annualMiles, vehicleYear, coverage],
  );

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400">
          Marketplace
        </p>
        <h1 className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">
          Compare Auto Insurance Quotes
        </h1>
        <p className="mt-2 text-gray-500 dark:text-slate-400">
          See estimated rates from top insurers in seconds. No personal data shared until you apply.
        </p>
      </div>

      {/* Input form */}
      <SectionCard>
        <h2 className="mb-5 text-base font-semibold text-gray-900 dark:text-white">Your Driving Profile</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* Age */}
          <div>
            <label htmlFor="age" className="block text-sm font-medium text-gray-700 dark:text-slate-300">
              Age: {age}
            </label>
            <input
              id="age"
              type="range"
              min={16}
              max={80}
              value={age}
              onChange={(e) => setAge(Number(e.target.value))}
              className="mt-2 w-full accent-blue-600"
              aria-label="Age slider"
            />
            <div className="mt-1 flex justify-between text-xs text-gray-400 dark:text-slate-500">
              <span>16</span>
              <span>80</span>
            </div>
          </div>

          {/* Driving record */}
          <div>
            <label htmlFor="driving-record" className="block text-sm font-medium text-gray-700 dark:text-slate-300">
              Driving Record
            </label>
            <select
              id="driving-record"
              value={record}
              onChange={(e) => setRecord(e.target.value as DrivingRecord)}
              className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            >
              <option value="clean">Clean (no incidents)</option>
              <option value="minor">Minor (1 ticket or fender bender)</option>
              <option value="major">Major (DUI, at-fault accident)</option>
            </select>
          </div>

          {/* Annual miles */}
          <div>
            <label htmlFor="annual-miles" className="block text-sm font-medium text-gray-700 dark:text-slate-300">
              Annual Miles: {annualMiles.toLocaleString()}
            </label>
            <input
              id="annual-miles"
              type="range"
              min={1000}
              max={30000}
              step={1000}
              value={annualMiles}
              onChange={(e) => setAnnualMiles(Number(e.target.value))}
              className="mt-2 w-full accent-blue-600"
              aria-label="Annual miles slider"
            />
            <div className="mt-1 flex justify-between text-xs text-gray-400 dark:text-slate-500">
              <span>1K</span>
              <span>30K</span>
            </div>
          </div>

          {/* Vehicle year */}
          <div>
            <label htmlFor="vehicle-year" className="block text-sm font-medium text-gray-700 dark:text-slate-300">
              Vehicle Year: {vehicleYear}
            </label>
            <input
              id="vehicle-year"
              type="range"
              min={currentYear - 20}
              max={currentYear}
              value={vehicleYear}
              onChange={(e) => setVehicleYear(Number(e.target.value))}
              className="mt-2 w-full accent-blue-600"
              aria-label="Vehicle year slider"
            />
            <div className="mt-1 flex justify-between text-xs text-gray-400 dark:text-slate-500">
              <span>{currentYear - 20}</span>
              <span>{currentYear}</span>
            </div>
          </div>

          {/* Coverage level */}
          <div className="sm:col-span-2 lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">Coverage Level</label>
            <div className="mt-2 flex gap-3">
              {(["liability", "standard", "full"] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCoverage(c)}
                  className={[
                    "flex-1 rounded-lg border px-3 py-2.5 text-sm font-medium capitalize transition-colors duration-150",
                    coverage === c
                      ? "border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-900/30 dark:text-blue-300"
                      : "border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700",
                  ].join(" ")}
                >
                  {c === "liability" ? "Liability Only" : c === "standard" ? "Standard" : "Full Coverage"}
                </button>
              ))}
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Quote results */}
      <div>
        <h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">
          Estimated Quotes for Your Profile
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {quotes.map((q, i) => (
            <QuoteCard key={q.id} quote={q} rank={i + 1} />
          ))}
        </div>
      </div>

      {/* Coverage explainer */}
      <CoverageExplainer />

      {/* Tips */}
      <PremiumTips />

      {/* Disclosure */}
      <Disclosure />
    </div>
  );
}
