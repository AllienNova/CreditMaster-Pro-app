/**
 * Pre-Approval Odds Calculator
 *
 * Estimates approval likelihood for financial products based on credit profile.
 * All output is informational only — not a credit decision or guarantee.
 */

// =============================================================================
// Types
// =============================================================================

export interface PreApprovalInput {
  creditScore: number;
  dtiRatio: number;
  accountAgeYears: number;
  recentInquiries: number;
  paymentHistory: "excellent" | "good" | "fair" | "poor";
  productMinScore?: number;
  productMaxDTI?: number;
}

export interface PreApprovalOdds {
  likelihood: "excellent" | "good" | "fair" | "poor";
  probability: number; // 0-100
  factors: PreApprovalFactor[];
  creditImpact: {
    hardInquiry: boolean;
    estimatedScoreDrop: number;
  };
  disclaimer: string;
}

export interface PreApprovalFactor {
  name: string;
  impact: "positive" | "neutral" | "negative";
  weight: number;
  score: number;
  detail: string;
}

// =============================================================================
// Constants
// =============================================================================

const DISCLAIMER =
  "This estimate is based on your credit profile and does not constitute a loan offer or guarantee of approval. Actual approval decisions are made by the lender.";

// =============================================================================
// Calculator
// =============================================================================

export function calculatePreApprovalOdds(
  input: PreApprovalInput,
): PreApprovalOdds {
  const factors = buildFactors(input);
  const rawProbability = factors.reduce((sum, f) => sum + f.score, 0);

  let probability = Math.min(100, Math.max(0, rawProbability));
  let likelihood = getLikelihood(probability);

  // Product-specific caps
  if (input.productMinScore !== undefined) {
    if (input.creditScore < input.productMinScore) {
      if (likelihoodRank(likelihood) > likelihoodRank("fair")) {
        likelihood = "fair";
        probability = Math.min(probability, 54);
      }
    }
  }

  if (input.productMaxDTI !== undefined) {
    if (input.dtiRatio > input.productMaxDTI) {
      likelihood = "poor";
      probability = Math.min(probability, 34);
    }
  }

  return {
    likelihood,
    probability,
    factors,
    creditImpact: {
      hardInquiry: true,
      estimatedScoreDrop: 5,
    },
    disclaimer: DISCLAIMER,
  };
}

// =============================================================================
// Factor Builders
// =============================================================================

function buildFactors(input: PreApprovalInput): PreApprovalFactor[] {
  return [
    buildCreditScoreFactor(input.creditScore),
    buildDtiFactor(input.dtiRatio),
    buildAccountAgeFactor(input.accountAgeYears),
    buildInquiriesFactor(input.recentInquiries),
    buildPaymentHistoryFactor(input.paymentHistory),
  ];
}

function buildCreditScoreFactor(score: number): PreApprovalFactor {
  let points: number;
  let impact: PreApprovalFactor["impact"];
  let detail: string;

  if (score >= 750) {
    points = 40;
    impact = "positive";
    detail = "Excellent credit score — qualifies for most products.";
  } else if (score >= 700) {
    points = 30;
    impact = "positive";
    detail = "Good credit score — qualifies for the majority of products.";
  } else if (score >= 650) {
    points = 20;
    impact = "neutral";
    detail = "Fair credit score — some products may have stricter requirements.";
  } else if (score >= 600) {
    points = 10;
    impact = "negative";
    detail =
      "Below-average credit score — may limit available products and rates.";
  } else {
    points = 0;
    impact = "negative";
    detail =
      "Low credit score — most standard products will require improvement.";
  }

  return {
    name: "Credit Score",
    impact,
    weight: 40,
    score: points,
    detail,
  };
}

function buildDtiFactor(dtiRatio: number): PreApprovalFactor {
  const dtiPercent = dtiRatio * 100;
  let points: number;
  let impact: PreApprovalFactor["impact"];
  let detail: string;

  if (dtiPercent < 20) {
    points = 25;
    impact = "positive";
    detail = "Very low debt-to-income ratio — strong capacity for new debt.";
  } else if (dtiPercent < 35) {
    points = 20;
    impact = "positive";
    detail = "Healthy debt-to-income ratio — good capacity for new debt.";
  } else if (dtiPercent < 43) {
    points = 10;
    impact = "neutral";
    detail =
      "Moderate debt-to-income ratio — some lenders may require explanation.";
  } else {
    points = 0;
    impact = "negative";
    detail =
      "High debt-to-income ratio — may disqualify from some products. Consider reducing existing debt.";
  }

  return {
    name: "Debt-to-Income Ratio",
    impact,
    weight: 25,
    score: points,
    detail,
  };
}

function buildAccountAgeFactor(ageYears: number): PreApprovalFactor {
  let points: number;
  let impact: PreApprovalFactor["impact"];
  let detail: string;

  if (ageYears > 7) {
    points = 15;
    impact = "positive";
    detail =
      "Long credit history — demonstrates sustained financial responsibility.";
  } else if (ageYears >= 4) {
    points = 12;
    impact = "positive";
    detail = "Established credit history — meets most lender requirements.";
  } else if (ageYears >= 2) {
    points = 8;
    impact = "neutral";
    detail =
      "Moderate credit history — sufficient for most products but not optimal.";
  } else {
    points = 4;
    impact = "negative";
    detail =
      "Short credit history — some lenders prefer longer established histories.";
  }

  return {
    name: "Credit History Length",
    impact,
    weight: 15,
    score: points,
    detail,
  };
}

function buildInquiriesFactor(inquiries: number): PreApprovalFactor {
  let points: number;
  let impact: PreApprovalFactor["impact"];
  let detail: string;

  if (inquiries === 0) {
    points = 10;
    impact = "positive";
    detail = "No recent inquiries — no sign of credit-seeking behavior.";
  } else if (inquiries <= 2) {
    points = 8;
    impact = "positive";
    detail = "Few recent inquiries — minimal credit-seeking impact.";
  } else if (inquiries <= 4) {
    points = 4;
    impact = "neutral";
    detail =
      "Moderate number of recent inquiries — may signal increased credit-seeking.";
  } else {
    points = 0;
    impact = "negative";
    detail =
      "Many recent inquiries — lenders may view this as a sign of financial stress.";
  }

  return {
    name: "Recent Credit Inquiries",
    impact,
    weight: 10,
    score: points,
    detail,
  };
}

function buildPaymentHistoryFactor(
  history: PreApprovalInput["paymentHistory"],
): PreApprovalFactor {
  const configs: Record<
    PreApprovalInput["paymentHistory"],
    { points: number; impact: PreApprovalFactor["impact"]; detail: string }
  > = {
    excellent: {
      points: 10,
      impact: "positive",
      detail: "Perfect payment history — strongest possible signal to lenders.",
    },
    good: {
      points: 7,
      impact: "positive",
      detail:
        "Good payment history — occasional minor late payments, acceptable to most lenders.",
    },
    fair: {
      points: 4,
      impact: "neutral",
      detail:
        "Fair payment history — some delinquencies that may concern stricter lenders.",
    },
    poor: {
      points: 0,
      impact: "negative",
      detail:
        "Poor payment history — significant delinquencies that negatively affect approval odds.",
    },
  };

  const config = configs[history];

  return {
    name: "Payment History",
    impact: config.impact,
    weight: 10,
    score: config.points,
    detail: config.detail,
  };
}

// =============================================================================
// Helpers
// =============================================================================

function getLikelihood(
  probability: number,
): PreApprovalOdds["likelihood"] {
  if (probability > 75) return "excellent";
  if (probability >= 55) return "good";
  if (probability >= 35) return "fair";
  return "poor";
}

/** Higher rank = better likelihood (used for cap comparisons) */
function likelihoodRank(likelihood: PreApprovalOdds["likelihood"]): number {
  const ranks: Record<PreApprovalOdds["likelihood"], number> = {
    excellent: 3,
    good: 2,
    fair: 1,
    poor: 0,
  };
  return ranks[likelihood];
}
