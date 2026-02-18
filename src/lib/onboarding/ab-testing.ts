/**
 * A/B Testing Framework for Onboarding Flows
 *
 * Provides deterministic variant selection (hash-based), conversion tracking,
 * and experiment results with statistical significance analysis.
 */

import { supabaseAdmin } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ExperimentStatus = "active" | "paused" | "completed";

export interface Variant {
  /** Unique name for this variant (e.g. "control", "variant_a") */
  name: string;
  /** Relative weight (higher = more traffic). Must be > 0. */
  weight: number;
}

export interface Experiment {
  id: string;
  name: string;
  variants: Variant[];
  status: ExperimentStatus;
}

export interface ConversionEvent {
  userId: string;
  experimentId: string;
  variant: string;
  metric: string;
  timestamp: string;
}

export interface VariantResult {
  variant: string;
  impressions: number;
  conversions: number;
  conversionRate: number;
}

export interface ExperimentResults {
  experimentId: string;
  status: ExperimentStatus;
  variants: VariantResult[];
  /** Statistical significance (p-value) from z-test for proportions. null if < 2 variants with data. */
  significance: number | null;
  /** True when p < 0.05 */
  isSignificant: boolean;
  totalImpressions: number;
  totalConversions: number;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

/**
 * Simple non-cryptographic string hash (djb2 variant).
 * Returns unsigned 32-bit integer.
 */
function hashString(input: string): number {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    // hash * 33 + charCode
    hash = ((hash << 5) + hash + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/**
 * Compute the standard-normal cumulative distribution function (CDF)
 * using the Abramowitz & Stegun rational approximation.
 * Accurate to ~1e-7.
 */
function normalCdf(z: number): number {
  const absZ = Math.abs(z);
  const t = 1.0 / (1.0 + 0.2316419 * absZ);
  const d = 0.3989422804014327; // 1/sqrt(2*pi)
  const p =
    d *
    Math.exp(-0.5 * z * z) *
    (t *
      (0.31938153 +
        t *
          (-0.356563782 +
            t * (1.781477937 + t * (-1.821255978 + t * 1.330274429)))));
  return z >= 0 ? 1.0 - p : p;
}

/**
 * Two-proportion z-test.
 * Returns a two-tailed p-value comparing two proportions.
 */
function twoProportionZTest(
  conversions1: number,
  impressions1: number,
  conversions2: number,
  impressions2: number,
): number {
  if (impressions1 === 0 || impressions2 === 0) {
    return 1;
  }

  const p1 = conversions1 / impressions1;
  const p2 = conversions2 / impressions2;
  const pPooled = (conversions1 + conversions2) / (impressions1 + impressions2);

  if (pPooled === 0 || pPooled === 1) {
    return 1;
  }

  const se = Math.sqrt(
    pPooled * (1 - pPooled) * (1 / impressions1 + 1 / impressions2),
  );

  if (se === 0) {
    return 1;
  }

  const z = (p1 - p2) / se;
  const pValue = 2 * (1 - normalCdf(Math.abs(z)));
  return pValue;
}

// ---------------------------------------------------------------------------
// OnboardingABTest class
// ---------------------------------------------------------------------------

export class OnboardingABTest {
  private experiments: Map<string, Experiment> = new Map();
  private assignments: Map<string, string> = new Map(); // "userId:experimentId" -> variant
  private conversions: ConversionEvent[] = [];
  private impressionCounts: Map<string, Map<string, number>> = new Map(); // experimentId -> variant -> count

  // -----------------------------------------------------------------------
  // Experiment management
  // -----------------------------------------------------------------------

  /**
   * Register an experiment. Must be called before selecting variants.
   */
  registerExperiment(experiment: Experiment): void {
    if (experiment.variants.length === 0) {
      throw new Error(
        `Experiment "${experiment.id}" must have at least one variant`,
      );
    }

    const hasInvalidWeight = experiment.variants.some((v) => v.weight <= 0);
    if (hasInvalidWeight) {
      throw new Error(`All variant weights must be greater than 0`);
    }

    this.experiments.set(experiment.id, { ...experiment });
  }

  /**
   * Get a registered experiment by id.
   */
  getExperiment(experimentId: string): Experiment | undefined {
    return this.experiments.get(experimentId);
  }

  // -----------------------------------------------------------------------
  // Variant selection
  // -----------------------------------------------------------------------

  /**
   * Deterministically select a variant for the given user and experiment.
   * - Same (userId, experimentId) always returns the same variant.
   * - Respects variant weights.
   * - If experiment is paused or completed, still returns the assigned variant
   *   (assignment is sticky).
   */
  selectVariant(userId: string, experimentId: string): string {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) {
      throw new Error(`Experiment "${experimentId}" is not registered`);
    }

    // Check for existing (sticky) assignment
    const assignmentKey = `${userId}:${experimentId}`;
    const existing = this.assignments.get(assignmentKey);
    if (existing !== undefined) {
      return existing;
    }

    // Deterministic hash-based selection
    const hash = hashString(`${userId}:${experimentId}`);
    const totalWeight = experiment.variants.reduce(
      (sum, v) => sum + v.weight,
      0,
    );
    const bucket = hash % totalWeight;

    let cumulative = 0;
    let selectedVariant = experiment.variants[0].name;
    for (const variant of experiment.variants) {
      cumulative += variant.weight;
      if (bucket < cumulative) {
        selectedVariant = variant.name;
        break;
      }
    }

    // Persist assignment
    this.assignments.set(assignmentKey, selectedVariant);

    // Track impression
    if (!this.impressionCounts.has(experimentId)) {
      this.impressionCounts.set(experimentId, new Map());
    }
    const expImpressions = this.impressionCounts.get(experimentId)!;
    expImpressions.set(
      selectedVariant,
      (expImpressions.get(selectedVariant) ?? 0) + 1,
    );

    return selectedVariant;
  }

  // -----------------------------------------------------------------------
  // Conversion tracking
  // -----------------------------------------------------------------------

  /**
   * Record a conversion event. Persists to Supabase.
   *
   * The variant is looked up from the user's assignment. If the user has not
   * been assigned a variant for this experiment, the conversion is ignored and
   * `null` is returned.
   */
  async trackConversion(
    userId: string,
    experimentId: string,
    metric: string,
  ): Promise<ConversionEvent | null> {
    const assignmentKey = `${userId}:${experimentId}`;
    const variant = this.assignments.get(assignmentKey);
    if (variant === undefined) {
      return null;
    }

    const event: ConversionEvent = {
      userId,
      experimentId,
      variant,
      metric,
      timestamp: new Date().toISOString(),
    };

    this.conversions.push(event);

    // Persist to Supabase (best-effort — do not throw on DB errors).
    // The ab_test_conversions table is not yet in the generated Database
    // types, so we use a generic from() call via type assertion.
    try {
      await (
        supabaseAdmin as unknown as {
          from: (table: string) => {
            insert: (
              row: Record<string, unknown>,
            ) => Promise<{ error: unknown }>;
          };
        }
      )
        .from("ab_test_conversions")
        .insert({
          user_id: userId,
          experiment_id: experimentId,
          variant,
          metric,
          created_at: event.timestamp,
        });
    } catch {
      // Persistence failure should not break the application
    }

    return event;
  }

  // -----------------------------------------------------------------------
  // Results & statistical significance
  // -----------------------------------------------------------------------

  /**
   * Compute experiment results including per-variant stats and significance.
   *
   * Statistical significance is computed via a two-proportion z-test
   * comparing the first two variants that have at least one impression.
   * A p-value < 0.05 is considered significant.
   */
  getResults(experimentId: string): ExperimentResults {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) {
      throw new Error(`Experiment "${experimentId}" is not registered`);
    }

    const expImpressions =
      this.impressionCounts.get(experimentId) ?? new Map<string, number>();
    const expConversions = this.conversions.filter(
      (c) => c.experimentId === experimentId,
    );

    // Build per-variant results
    const variantResults: VariantResult[] = experiment.variants.map((v) => {
      const impressions = expImpressions.get(v.name) ?? 0;
      const conversions = expConversions.filter(
        (c) => c.variant === v.name,
      ).length;
      const conversionRate = impressions > 0 ? conversions / impressions : 0;

      return {
        variant: v.name,
        impressions,
        conversions,
        conversionRate,
      };
    });

    const totalImpressions = variantResults.reduce(
      (sum, vr) => sum + vr.impressions,
      0,
    );
    const totalConversions = variantResults.reduce(
      (sum, vr) => sum + vr.conversions,
      0,
    );

    // Statistical significance — z-test between first two variants with data
    let significance: number | null = null;
    const withData = variantResults.filter((vr) => vr.impressions > 0);

    if (withData.length >= 2) {
      significance = twoProportionZTest(
        withData[0].conversions,
        withData[0].impressions,
        withData[1].conversions,
        withData[1].impressions,
      );
    }

    return {
      experimentId,
      status: experiment.status,
      variants: variantResults,
      significance,
      isSignificant: significance !== null && significance < 0.05,
      totalImpressions,
      totalConversions,
    };
  }

  // -----------------------------------------------------------------------
  // Utilities (primarily for testing)
  // -----------------------------------------------------------------------

  /** Clear all in-memory state (experiments, assignments, conversions). */
  reset(): void {
    this.experiments.clear();
    this.assignments.clear();
    this.conversions = [];
    this.impressionCounts.clear();
  }
}

// ---------------------------------------------------------------------------
// Singleton export
// ---------------------------------------------------------------------------

export const onboardingABTest = new OnboardingABTest();
export default onboardingABTest;
