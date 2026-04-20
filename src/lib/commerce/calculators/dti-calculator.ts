/**
 * DTI Calculator
 *
 * Calculates Debt-to-Income ratio and provides rating bands and recommendations.
 */

// =============================================================================
// Types
// =============================================================================

export interface DTIResult {
  ratio: number; // 0-1 (e.g., 0.35 = 35%)
  rating: "excellent" | "good" | "fair" | "high" | "very_high";
  monthlyIncome: number;
  totalMonthlyDebt: number;
  breakdown: { category: string; amount: number }[];
  recommendation: string;
}

// =============================================================================
// Constants
// =============================================================================

const RECOMMENDATIONS: Record<DTIResult["rating"], string> = {
  excellent:
    "Your debt-to-income ratio is excellent. You are well-positioned for approval on most financial products and may qualify for the best rates available.",
  good: "Your debt-to-income ratio is healthy. Most lenders will view you favorably, and you should qualify for competitive rates on most products.",
  fair: "Your debt-to-income ratio is acceptable but may limit your options with some lenders. Consider paying down existing debt before taking on new obligations.",
  high: "Your debt-to-income ratio is high. Many lenders may decline your application or offer less favorable terms. Focus on reducing monthly debt payments before applying.",
  very_high:
    "Your debt-to-income ratio is very high. Most lenders will consider this a significant risk factor. Work on reducing debt balances to improve your approval odds.",
};

// =============================================================================
// Calculator
// =============================================================================

export function calculateDTI(
  monthlyIncome: number,
  monthlyDebts: { category: string; amount: number }[],
): DTIResult {
  if (monthlyIncome <= 0) {
    return {
      ratio: 1,
      rating: "very_high",
      monthlyIncome: 0,
      totalMonthlyDebt: 0,
      breakdown: monthlyDebts.filter((d) => d.amount > 0),
      recommendation: RECOMMENDATIONS.very_high,
    };
  }

  const breakdown = monthlyDebts.filter((d) => d.amount > 0);
  const totalMonthlyDebt = breakdown.reduce((sum, d) => sum + d.amount, 0);
  const ratio = totalMonthlyDebt / monthlyIncome;

  const rating = getRating(ratio);

  return {
    ratio,
    rating,
    monthlyIncome,
    totalMonthlyDebt,
    breakdown,
    recommendation: RECOMMENDATIONS[rating],
  };
}

// =============================================================================
// Helpers
// =============================================================================

function getRating(ratio: number): DTIResult["rating"] {
  if (ratio < 0.2) return "excellent";
  if (ratio < 0.35) return "good";
  if (ratio < 0.43) return "fair";
  if (ratio <= 0.5) return "high";
  return "very_high";
}
