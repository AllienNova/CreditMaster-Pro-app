/**
 * Tax Tip Adapter (PARITY)
 *
 * "Tips" and "recommendations" are the same thing under two names. The mobile
 * optimizer screen calls them tips and used to fetch /tax/tips, a route that
 * has never existed; the server computes them in TaxOptimizationEngine and
 * serves them from /api/tax/recommendations. Building a second /tax/tips route
 * would have created a parallel catalogue over one engine — the kind of
 * duplicate that drifts. This maps the one real shape onto the screen's.
 *
 * Nothing is invented. Every field is copied or derived from the server's
 * TaxRecommendation, and the two the server cannot supply — category and
 * difficulty, which live on the joined strategy — are OPTIONAL here rather
 * than defaulted. A tip whose strategy did not come back shows no difficulty
 * chip instead of a confident "medium" that no one computed.
 *
 * Kept free of React Native / theme / icon dependencies so the mapping can be
 * unit-tested directly, matching the codebase's `*Adapter` convention.
 */

/** One step of a recommendation, as the engine returns it. */
export interface ApiActionStep {
  stepNumber?: number;
  title?: string;
  description?: string;
}

/** A recommendation as GET /api/tax/recommendations returns it. */
export interface ApiTaxRecommendation {
  id: string;
  title: string;
  description?: string;
  summary?: string;
  estimatedTaxSavings?: number;
  actionSteps?: ApiActionStep[];
  strategy?: {
    category?: string;
    complexity?: string;
  };
}

/** Difficulty as the optimizer screen renders it. */
export type TipDifficulty = "easy" | "medium" | "hard";

/** A tip, flattened for the optimizer screen. */
export interface TaxTipView {
  id: string;
  title: string;
  description: string;
  potentialSavings: number;
  /** Absent when the recommendation arrived without its strategy. */
  difficulty?: TipDifficulty;
  /** Absent when the recommendation arrived without its strategy. */
  category?: string;
  actionSteps: string[];
}

/**
 * StrategyComplexity has four levels (basic | intermediate | advanced |
 * expert); the screen's difficulty chip has three. Expert collapses onto hard
 * because it is at least as demanding as advanced — the only direction that
 * does not understate the work involved.
 */
const DIFFICULTY_BY_COMPLEXITY: Record<string, TipDifficulty> = {
  basic: "easy",
  intermediate: "medium",
  advanced: "hard",
  expert: "hard",
};

function toDifficulty(complexity?: string): TipDifficulty | undefined {
  if (!complexity) return undefined;
  return DIFFICULTY_BY_COMPLEXITY[complexity.toLowerCase()];
}

/**
 * Step titles, in the engine's order.
 *
 * Falls back to the step's description when it has no title, because a step
 * rendered as an empty bullet is worse than a verbose one.
 */
function toStepLines(steps?: ApiActionStep[]): string[] {
  if (!Array.isArray(steps)) return [];
  return steps
    .map((step) => (step?.title || step?.description || "").trim())
    .filter((line) => line.length > 0);
}

export function toTaxTipView(recommendation: ApiTaxRecommendation): TaxTipView {
  return {
    id: recommendation.id,
    title: recommendation.title,
    // summary is the engine's one-liner; description is the long form. Either
    // is real, so prefer the fuller one and fall back rather than show blank.
    description: recommendation.description ?? recommendation.summary ?? "",
    // A recommendation with no savings figure is worth 0 to the total, not
    // worth guessing at.
    potentialSavings: recommendation.estimatedTaxSavings ?? 0,
    difficulty: toDifficulty(recommendation.strategy?.complexity),
    category: recommendation.strategy?.category,
    actionSteps: toStepLines(recommendation.actionSteps),
  };
}

export function toTaxTipViews(
  recommendations: ApiTaxRecommendation[] | null | undefined,
): TaxTipView[] {
  if (!Array.isArray(recommendations)) return [];
  return recommendations.filter((r) => r && r.id).map(toTaxTipView);
}
