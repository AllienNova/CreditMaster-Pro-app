"use client";

import { useState } from "react";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type LoanType = "all" | "personal" | "auto" | "student" | "mortgage";

interface LoanOffer {
  id: string;
  lender: string;
  type: Exclude<LoanType, "all">;
  rate: string;
  term: string;
  monthlyPayment: string;
  totalCost: string;
  amount: string;
  highlights: string[];
  matchScore: number;
}

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

const LOAN_OFFERS: LoanOffer[] = [
  {
    id: "ln-1",
    lender: "National Credit Union",
    type: "personal",
    rate: "7.49% - 12.99% APR",
    term: "36 - 60 months",
    monthlyPayment: "$312/mo",
    totalCost: "$11,232",
    amount: "$5,000 - $50,000",
    highlights: [
      "No origination fee",
      "Same-day funding",
      "Flexible terms",
    ],
    matchScore: 93,
  },
  {
    id: "ln-2",
    lender: "AutoRate Finance",
    type: "auto",
    rate: "4.99% - 9.49% APR",
    term: "36 - 72 months",
    monthlyPayment: "$425/mo",
    totalCost: "$30,600",
    amount: "$10,000 - $100,000",
    highlights: [
      "Pre-qualification available",
      "New and used vehicles",
      "Rate discount with autopay",
    ],
    matchScore: 87,
  },
  {
    id: "ln-3",
    lender: "EduFund Solutions",
    type: "student",
    rate: "3.99% - 8.99% APR",
    term: "60 - 240 months",
    monthlyPayment: "$185/mo",
    totalCost: "$22,200",
    amount: "$1,000 - $150,000",
    highlights: [
      "No application fee",
      "In-school deferment",
      "Rate reduction for on-time payments",
    ],
    matchScore: 81,
  },
  {
    id: "ln-4",
    lender: "Debt Consolidation Plus",
    type: "personal",
    rate: "6.99% - 15.49% APR",
    term: "24 - 84 months",
    monthlyPayment: "$248/mo",
    totalCost: "$17,856",
    amount: "$2,000 - $40,000",
    highlights: [
      "Direct creditor payment",
      "No prepayment penalty",
      "Credit score monitoring",
    ],
    matchScore: 90,
  },
  {
    id: "ln-5",
    lender: "HomeFirst Mortgage",
    type: "mortgage",
    rate: "6.25% - 7.125% APR",
    term: "15 - 30 years",
    monthlyPayment: "$1,847/mo",
    totalCost: "$665,000",
    amount: "$100,000 - $750,000",
    highlights: [
      "Low down payment options",
      "Rate lock for 60 days",
      "First-time buyer programs",
    ],
    matchScore: 75,
  },
  {
    id: "ln-6",
    lender: "QuickFund Personal",
    type: "personal",
    rate: "9.99% - 19.99% APR",
    term: "12 - 48 months",
    monthlyPayment: "$220/mo",
    totalCost: "$5,280",
    amount: "$1,000 - $25,000",
    highlights: [
      "Funds in 24 hours",
      "Accepts fair credit",
      "No collateral required",
    ],
    matchScore: 72,
  },
];

const LOAN_TYPE_CHIPS: { id: LoanType; label: string }[] = [
  { id: "all", label: "All Loans" },
  { id: "personal", label: "Personal" },
  { id: "auto", label: "Auto" },
  { id: "student", label: "Student" },
  { id: "mortgage", label: "Mortgage" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function matchScoreColor(score: number): string {
  if (score >= 90) return "text-green-600 dark:text-green-400";
  if (score >= 80) return "text-blue-600 dark:text-blue-400";
  return "text-gray-600 dark:text-slate-400";
}

function loanTypeBadge(type: LoanOffer["type"]): string {
  switch (type) {
    case "personal":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    case "auto":
      return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    case "student":
      return "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400";
    case "mortgage":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
    default:
      return "bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300";
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function LoansPage() {
  const [selectedType, setSelectedType] = useState<LoanType>("all");

  const filteredOffers =
    selectedType === "all"
      ? LOAN_OFFERS
      : LOAN_OFFERS.filter((l) => l.type === selectedType);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="flex mb-4" aria-label="Breadcrumb">
          <ol className="inline-flex items-center space-x-1 md:space-x-3">
            <li className="inline-flex items-center">
              <Link
                href="/recommendations"
                className="inline-flex items-center text-sm font-medium text-gray-700 hover:text-blue-600 dark:text-slate-400 dark:hover:text-white"
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                </svg>
                Recommendations
              </Link>
            </li>
            <li>
              <div className="flex items-center">
                <svg
                  className="w-6 h-6 text-gray-400 dark:text-slate-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="ml-1 text-sm font-medium text-gray-500 md:ml-2 dark:text-slate-400">
                  Loans
                </span>
              </div>
            </li>
          </ol>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Loan Recommendations
          </h1>
          <p className="mt-2 text-gray-600 dark:text-slate-400">
            Compare pre-qualified loan offers matched to your credit profile and
            financial needs.
          </p>
        </div>

        {/* Loan Type Filter */}
        <div className="flex flex-wrap gap-2 mb-6">
          {LOAN_TYPE_CHIPS.map((chip) => (
            <button
              key={chip.id}
              onClick={() => setSelectedType(chip.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedType === chip.id
                  ? "bg-blue-600 text-white"
                  : "bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700"
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* Results count */}
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {filteredOffers.length} Loan Offer
          {filteredOffers.length !== 1 ? "s" : ""}
        </h2>

        {/* Loan Comparison Table (cards on mobile, table-like on large screens) */}
        <div className="space-y-4">
          {filteredOffers.map((offer) => (
            <div
              key={offer.id}
              className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-5"
            >
              {/* Top row */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                      {offer.lender}
                    </h3>
                    <span
                      className={`text-xs font-medium uppercase px-2 py-0.5 rounded-full ${loanTypeBadge(offer.type)}`}
                    >
                      {offer.type}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-slate-500 mt-0.5">
                    Loan amount: {offer.amount}
                  </p>
                </div>
                <span
                  className={`text-sm font-bold ${matchScoreColor(offer.matchScore)}`}
                >
                  {offer.matchScore}% Match
                </span>
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-slate-500 uppercase tracking-wider">
                    Rate
                  </p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white mt-0.5">
                    {offer.rate}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-slate-500 uppercase tracking-wider">
                    Term
                  </p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white mt-0.5">
                    {offer.term}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-slate-500 uppercase tracking-wider">
                    Est. Monthly
                  </p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white mt-0.5">
                    {offer.monthlyPayment}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-slate-500 uppercase tracking-wider">
                    Est. Total Cost
                  </p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white mt-0.5">
                    {offer.totalCost}
                  </p>
                </div>
              </div>

              {/* Highlights */}
              <div className="flex flex-wrap gap-2 mb-4">
                {offer.highlights.map((h) => (
                  <span
                    key={h}
                    className="inline-flex items-center gap-1 text-xs bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 px-2 py-1 rounded"
                  >
                    <svg
                      className="w-3.5 h-3.5 text-green-500"
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
                    {h}
                  </span>
                ))}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3">
                <button className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors">
                  Check Rate
                </button>
                <button className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors">
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
