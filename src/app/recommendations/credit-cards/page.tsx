"use client";

import Link from "next/link";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CreditCardOffer {
  id: string;
  name: string;
  issuer: string;
  rewardsRate: string;
  apr: string;
  annualFee: string;
  signupBonus: string;
  category: string;
  highlights: string[];
  matchScore: number;
}

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

const CREDIT_CARD_OFFERS: CreditCardOffer[] = [
  {
    id: "cc-1",
    name: "Fynvita Cash Rewards",
    issuer: "National Bank",
    rewardsRate: "3% cash back on groceries, 2% on gas, 1% on everything else",
    apr: "18.49% - 26.49% Variable",
    annualFee: "$0",
    signupBonus: "$200 after spending $1,000 in 3 months",
    category: "Cash Back",
    highlights: [
      "No annual fee",
      "0% intro APR for 15 months",
      "Cell phone protection",
    ],
    matchScore: 95,
  },
  {
    id: "cc-2",
    name: "Premium Travel Elite",
    issuer: "World Finance Group",
    rewardsRate: "5x points on travel, 3x on dining, 1x on everything else",
    apr: "20.99% - 28.99% Variable",
    annualFee: "$95",
    signupBonus: "60,000 points after spending $4,000 in 3 months",
    category: "Travel",
    highlights: [
      "Airport lounge access",
      "No foreign transaction fees",
      "Travel insurance",
    ],
    matchScore: 88,
  },
  {
    id: "cc-3",
    name: "Secured Builder Card",
    issuer: "Community Credit Union",
    rewardsRate: "1.5% cash back on all purchases",
    apr: "22.99% Variable",
    annualFee: "$0",
    signupBonus: "No bonus - designed for credit building",
    category: "Credit Building",
    highlights: [
      "$200 minimum deposit",
      "Reports to all 3 bureaus",
      "Automatic credit line reviews",
    ],
    matchScore: 92,
  },
  {
    id: "cc-4",
    name: "Balance Transfer Advantage",
    issuer: "Metro Financial",
    rewardsRate: "1% cash back on all purchases",
    apr: "16.49% - 24.49% Variable",
    annualFee: "$0",
    signupBonus: "0% intro APR on balance transfers for 21 months",
    category: "Balance Transfer",
    highlights: [
      "3% balance transfer fee",
      "0% intro APR for 21 months",
      "Free FICO score",
    ],
    matchScore: 85,
  },
  {
    id: "cc-5",
    name: "Dining Rewards Platinum",
    issuer: "Gourmet Bank",
    rewardsRate: "4% on dining, 3% on entertainment, 1% on everything else",
    apr: "19.99% - 27.99% Variable",
    annualFee: "$0 first year, then $59",
    signupBonus: "$150 after spending $500 in 3 months",
    category: "Dining",
    highlights: [
      "DoorDash DashPass included",
      "No foreign transaction fees",
      "Extended warranty protection",
    ],
    matchScore: 78,
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function matchScoreColor(score: number): string {
  if (score >= 90) return "text-green-600 dark:text-green-400";
  if (score >= 80) return "text-blue-600 dark:text-blue-400";
  return "text-gray-600 dark:text-slate-400";
}

function matchScoreBg(score: number): string {
  if (score >= 90) return "bg-green-50 dark:bg-green-900/20";
  if (score >= 80) return "bg-blue-50 dark:bg-blue-900/20";
  return "bg-gray-50 dark:bg-slate-800";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CreditCardsPage() {
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
                  Credit Cards
                </span>
              </div>
            </li>
          </ol>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Credit Card Recommendations
          </h1>
          <p className="mt-2 text-gray-600 dark:text-slate-400">
            Personalized credit card matches based on your credit profile,
            spending habits, and financial goals.
          </p>
        </div>

        {/* Info Banner */}
        <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start">
            <svg
              className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-3 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-1">
                Match Score Explained
              </h3>
              <p className="text-sm text-blue-800 dark:text-blue-400">
                Each card is scored from 0-100 based on how well it fits your
                profile. Higher scores mean a better match for your current
                credit situation and spending patterns.
              </p>
            </div>
          </div>
        </div>

        {/* Card Comparison Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {CREDIT_CARD_OFFERS.map((card) => (
            <div
              key={card.id}
              className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden"
            >
              {/* Card Header */}
              <div className="p-5 border-b border-gray-100 dark:border-slate-700">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                      {card.name}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-slate-500 mt-0.5">
                      {card.issuer}
                    </p>
                  </div>
                  <div
                    className={`${matchScoreBg(card.matchScore)} px-3 py-1 rounded-full`}
                  >
                    <span
                      className={`text-sm font-bold ${matchScoreColor(card.matchScore)}`}
                    >
                      {card.matchScore}% Match
                    </span>
                  </div>
                </div>
                <span className="inline-block mt-2 text-xs font-medium bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 px-2 py-0.5 rounded">
                  {card.category}
                </span>
              </div>

              {/* Card Details */}
              <div className="p-5 space-y-3">
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-slate-500 uppercase tracking-wider">
                    Rewards
                  </p>
                  <p className="text-sm text-gray-900 dark:text-white mt-0.5">
                    {card.rewardsRate}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-slate-500 uppercase tracking-wider">
                      APR
                    </p>
                    <p className="text-sm text-gray-900 dark:text-white mt-0.5">
                      {card.apr}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-slate-500 uppercase tracking-wider">
                      Annual Fee
                    </p>
                    <p className="text-sm text-gray-900 dark:text-white mt-0.5">
                      {card.annualFee}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-slate-500 uppercase tracking-wider">
                    Sign-Up Bonus
                  </p>
                  <p className="text-sm text-gray-900 dark:text-white mt-0.5">
                    {card.signupBonus}
                  </p>
                </div>

                {/* Highlights */}
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                    Highlights
                  </p>
                  <ul className="space-y-1">
                    {card.highlights.map((h) => (
                      <li key={h} className="flex items-center gap-2 text-sm">
                        <svg
                          className="w-4 h-4 text-green-500 flex-shrink-0"
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
                        <span className="text-gray-700 dark:text-slate-300">
                          {h}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Action */}
              <div className="px-5 pb-5">
                <button className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2.5 rounded-lg transition-colors">
                  Apply Now
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
