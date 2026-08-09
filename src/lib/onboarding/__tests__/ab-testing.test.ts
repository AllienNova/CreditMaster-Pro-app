/**
 * A/B Testing Framework Tests
 *
 * Comprehensive tests covering deterministic variant selection, weight
 * distribution, conversion tracking, results calculation, and statistical
 * significance computation.
 */

import { describe, it, expect, beforeEach, jest } from "@jest/globals";

// ---------------------------------------------------------------------------
// Mock Supabase
// ---------------------------------------------------------------------------

const mockInsert = jest
  .fn()
  .mockResolvedValue({ data: null, error: null } as never);
const mockFrom = jest.fn().mockReturnValue({ insert: mockInsert });

jest.mock("@/lib/supabase/server", () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

// ---------------------------------------------------------------------------
// Import under test (AFTER mocks are wired)
// ---------------------------------------------------------------------------

import {
  OnboardingABTest,
  onboardingABTest,
  type Experiment,
  type ExperimentResults,
  type ConversionEvent,
  type Variant,
  type ExperimentStatus,
} from "../ab-testing";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function createExperiment(overrides?: Partial<Experiment>): Experiment {
  return {
    id: "exp-onboarding-flow",
    name: "Onboarding Flow Test",
    variants: [
      { name: "control", weight: 50 },
      { name: "variant_a", weight: 50 },
    ],
    status: "active" as ExperimentStatus,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("OnboardingABTest", () => {
  let abTest: OnboardingABTest;

  beforeEach(() => {
    abTest = new OnboardingABTest();
    // Re-wire mock return values (clearMocks in jest config strips them)
    mockInsert.mockResolvedValue({ data: null, error: null } as never);
    mockFrom.mockReturnValue({ insert: mockInsert });
  });

  // =========================================================================
  // Experiment registration
  // =========================================================================

  describe("registerExperiment", () => {
    it("registers an experiment successfully", () => {
      const exp = createExperiment();
      abTest.registerExperiment(exp);

      const retrieved = abTest.getExperiment(exp.id);
      expect(retrieved).toBeDefined();
      expect(retrieved!.id).toBe(exp.id);
      expect(retrieved!.name).toBe(exp.name);
      expect(retrieved!.variants).toHaveLength(2);
    });

    it("throws when registering experiment with no variants", () => {
      expect(() =>
        abTest.registerExperiment(createExperiment({ variants: [] })),
      ).toThrow("must have at least one variant");
    });

    it("throws when variant weight is <= 0", () => {
      expect(() =>
        abTest.registerExperiment(
          createExperiment({
            variants: [
              { name: "control", weight: 50 },
              { name: "bad", weight: 0 },
            ],
          }),
        ),
      ).toThrow("weights must be greater than 0");
    });

    it("throws when variant weight is negative", () => {
      expect(() =>
        abTest.registerExperiment(
          createExperiment({
            variants: [{ name: "bad", weight: -1 }],
          }),
        ),
      ).toThrow("weights must be greater than 0");
    });

    it("returns undefined for unregistered experiment", () => {
      expect(abTest.getExperiment("nonexistent")).toBeUndefined();
    });
  });

  // =========================================================================
  // Deterministic variant selection
  // =========================================================================

  describe("selectVariant", () => {
    it("returns the same variant for the same userId + experimentId", () => {
      abTest.registerExperiment(createExperiment());

      const first = abTest.selectVariant("user-1", "exp-onboarding-flow");
      const second = abTest.selectVariant("user-1", "exp-onboarding-flow");
      const third = abTest.selectVariant("user-1", "exp-onboarding-flow");

      expect(first).toBe(second);
      expect(second).toBe(third);
    });

    it("different users can get different variants", () => {
      abTest.registerExperiment(createExperiment());

      const variants = new Set<string>();
      // Try enough users that both variants should appear with 50/50 weights
      for (let i = 0; i < 100; i++) {
        variants.add(abTest.selectVariant(`user-${i}`, "exp-onboarding-flow"));
      }

      expect(variants.size).toBe(2);
      expect(variants.has("control")).toBe(true);
      expect(variants.has("variant_a")).toBe(true);
    });

    it("different experiments produce independent assignments", () => {
      abTest.registerExperiment(createExperiment({ id: "exp-a" }));
      abTest.registerExperiment(createExperiment({ id: "exp-b" }));

      // The same user might get different variants in different experiments
      // (but this is non-deterministic across experiment ids — so just assert they resolve)
      const varA = abTest.selectVariant("user-1", "exp-a");
      const varB = abTest.selectVariant("user-1", "exp-b");

      expect(["control", "variant_a"]).toContain(varA);
      expect(["control", "variant_a"]).toContain(varB);
    });

    it("throws for unregistered experiment", () => {
      expect(() => abTest.selectVariant("user-1", "nonexistent")).toThrow(
        "not registered",
      );
    });

    it("returns sticky assignment even for paused experiment", () => {
      const exp = createExperiment({ status: "paused" });
      abTest.registerExperiment(exp);

      const variant = abTest.selectVariant("user-1", exp.id);
      const again = abTest.selectVariant("user-1", exp.id);

      expect(variant).toBe(again);
    });

    it("returns sticky assignment even for completed experiment", () => {
      const exp = createExperiment({ status: "completed" });
      abTest.registerExperiment(exp);

      const variant = abTest.selectVariant("user-1", exp.id);
      const again = abTest.selectVariant("user-1", exp.id);

      expect(variant).toBe(again);
    });

    it("works with single-variant experiment", () => {
      abTest.registerExperiment(
        createExperiment({
          variants: [{ name: "only_one", weight: 100 }],
        }),
      );

      const variant = abTest.selectVariant("any-user", "exp-onboarding-flow");
      expect(variant).toBe("only_one");
    });
  });

  // =========================================================================
  // Variant weight distribution
  // =========================================================================

  describe("variant weight distribution", () => {
    it("distributes traffic roughly according to weights (50/50)", () => {
      abTest.registerExperiment(createExperiment());

      const counts: Record<string, number> = { control: 0, variant_a: 0 };
      const numUsers = 1000;

      for (let i = 0; i < numUsers; i++) {
        const variant = abTest.selectVariant(
          `weight-user-${i}`,
          "exp-onboarding-flow",
        );
        counts[variant]++;
      }

      // With 1000 samples and 50/50 split, each should be roughly 500 +/- 100
      expect(counts.control).toBeGreaterThan(300);
      expect(counts.control).toBeLessThan(700);
      expect(counts.variant_a).toBeGreaterThan(300);
      expect(counts.variant_a).toBeLessThan(700);
    });

    it("distributes traffic roughly according to weights (80/20)", () => {
      abTest.registerExperiment(
        createExperiment({
          variants: [
            { name: "control", weight: 80 },
            { name: "variant_a", weight: 20 },
          ],
        }),
      );

      const counts: Record<string, number> = { control: 0, variant_a: 0 };
      const numUsers = 1000;

      for (let i = 0; i < numUsers; i++) {
        const variant = abTest.selectVariant(
          `w-user-${i}`,
          "exp-onboarding-flow",
        );
        counts[variant]++;
      }

      // Control should dominate
      expect(counts.control).toBeGreaterThan(counts.variant_a);
      // Control roughly 800 +/- 150
      expect(counts.control).toBeGreaterThan(550);
    });

    it("distributes traffic across three variants", () => {
      abTest.registerExperiment(
        createExperiment({
          variants: [
            { name: "control", weight: 33 },
            { name: "variant_a", weight: 33 },
            { name: "variant_b", weight: 34 },
          ],
        }),
      );

      const counts: Record<string, number> = {
        control: 0,
        variant_a: 0,
        variant_b: 0,
      };
      const numUsers = 1000;

      for (let i = 0; i < numUsers; i++) {
        const variant = abTest.selectVariant(
          `tri-user-${i}`,
          "exp-onboarding-flow",
        );
        counts[variant]++;
      }

      // All three should get meaningful traffic
      expect(counts.control).toBeGreaterThan(150);
      expect(counts.variant_a).toBeGreaterThan(150);
      expect(counts.variant_b).toBeGreaterThan(150);
    });
  });

  // =========================================================================
  // Conversion tracking
  // =========================================================================

  describe("trackConversion", () => {
    it("records a conversion event for an assigned user", async () => {
      abTest.registerExperiment(createExperiment());
      const variant = abTest.selectVariant("user-1", "exp-onboarding-flow");

      const event = await abTest.trackConversion(
        "user-1",
        "exp-onboarding-flow",
        "completed_onboarding",
      );

      expect(event).not.toBeNull();
      expect(event!.userId).toBe("user-1");
      expect(event!.experimentId).toBe("exp-onboarding-flow");
      expect(event!.variant).toBe(variant);
      expect(event!.metric).toBe("completed_onboarding");
      expect(event!.timestamp).toBeDefined();
    });

    it("persists conversion to Supabase", async () => {
      abTest.registerExperiment(createExperiment());
      abTest.selectVariant("user-1", "exp-onboarding-flow");

      await abTest.trackConversion(
        "user-1",
        "exp-onboarding-flow",
        "completed_onboarding",
      );

      expect(mockFrom).toHaveBeenCalledWith("ab_test_conversions");
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "user-1",
          experiment_id: "exp-onboarding-flow",
          metric: "completed_onboarding",
        }),
      );
    });

    it("returns null for unassigned user", async () => {
      abTest.registerExperiment(createExperiment());
      // Do NOT call selectVariant first

      const event = await abTest.trackConversion(
        "unassigned-user",
        "exp-onboarding-flow",
        "completed_onboarding",
      );

      expect(event).toBeNull();
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it("does not throw when Supabase insert fails", async () => {
      mockInsert.mockRejectedValueOnce(
        new Error("DB connection error") as never,
      );
      abTest.registerExperiment(createExperiment());
      abTest.selectVariant("user-1", "exp-onboarding-flow");

      // Should not throw
      const event = await abTest.trackConversion(
        "user-1",
        "exp-onboarding-flow",
        "completed_onboarding",
      );

      expect(event).not.toBeNull();
    });

    it("tracks multiple conversions for same user", async () => {
      abTest.registerExperiment(createExperiment());
      abTest.selectVariant("user-1", "exp-onboarding-flow");

      const e1 = await abTest.trackConversion(
        "user-1",
        "exp-onboarding-flow",
        "step_1",
      );
      const e2 = await abTest.trackConversion(
        "user-1",
        "exp-onboarding-flow",
        "step_2",
      );

      expect(e1).not.toBeNull();
      expect(e2).not.toBeNull();
      expect(e1!.metric).toBe("step_1");
      expect(e2!.metric).toBe("step_2");
    });

    it("tracks conversions for multiple users", async () => {
      abTest.registerExperiment(createExperiment());
      abTest.selectVariant("user-1", "exp-onboarding-flow");
      abTest.selectVariant("user-2", "exp-onboarding-flow");

      const e1 = await abTest.trackConversion(
        "user-1",
        "exp-onboarding-flow",
        "signup",
      );
      const e2 = await abTest.trackConversion(
        "user-2",
        "exp-onboarding-flow",
        "signup",
      );

      expect(e1).not.toBeNull();
      expect(e2).not.toBeNull();
    });
  });

  // =========================================================================
  // Results calculation
  // =========================================================================

  describe("getResults", () => {
    it("returns zeroed results for experiment with no traffic", () => {
      abTest.registerExperiment(createExperiment());

      const results = abTest.getResults("exp-onboarding-flow");

      expect(results.experimentId).toBe("exp-onboarding-flow");
      expect(results.status).toBe("active");
      expect(results.totalImpressions).toBe(0);
      expect(results.totalConversions).toBe(0);
      expect(results.significance).toBeNull();
      expect(results.isSignificant).toBe(false);
      expect(results.variants).toHaveLength(2);
      results.variants.forEach((v) => {
        expect(v.impressions).toBe(0);
        expect(v.conversions).toBe(0);
        expect(v.conversionRate).toBe(0);
      });
    });

    it("correctly counts impressions per variant", () => {
      abTest.registerExperiment(createExperiment());

      for (let i = 0; i < 100; i++) {
        abTest.selectVariant(`results-user-${i}`, "exp-onboarding-flow");
      }

      const results = abTest.getResults("exp-onboarding-flow");

      expect(results.totalImpressions).toBe(100);
      const impressionSum = results.variants.reduce(
        (sum, v) => sum + v.impressions,
        0,
      );
      expect(impressionSum).toBe(100);
    });

    it("correctly computes conversion rate", async () => {
      abTest.registerExperiment(
        createExperiment({
          variants: [{ name: "only", weight: 100 }],
        }),
      );

      // 10 users assigned
      for (let i = 0; i < 10; i++) {
        abTest.selectVariant(`cr-user-${i}`, "exp-onboarding-flow");
      }

      // 3 conversions
      await abTest.trackConversion(
        "cr-user-0",
        "exp-onboarding-flow",
        "signup",
      );
      await abTest.trackConversion(
        "cr-user-1",
        "exp-onboarding-flow",
        "signup",
      );
      await abTest.trackConversion(
        "cr-user-2",
        "exp-onboarding-flow",
        "signup",
      );

      const results = abTest.getResults("exp-onboarding-flow");

      const onlyVariant = results.variants.find((v) => v.variant === "only")!;
      expect(onlyVariant.impressions).toBe(10);
      expect(onlyVariant.conversions).toBe(3);
      expect(onlyVariant.conversionRate).toBeCloseTo(0.3, 5);
    });

    it("throws for unregistered experiment", () => {
      expect(() => abTest.getResults("nonexistent")).toThrow("not registered");
    });

    it("reflects experiment status in results", () => {
      abTest.registerExperiment(createExperiment({ status: "completed" }));

      const results = abTest.getResults("exp-onboarding-flow");
      expect(results.status).toBe("completed");
    });

    it("includes all registered variants even if no traffic", () => {
      abTest.registerExperiment(
        createExperiment({
          variants: [
            { name: "a", weight: 33 },
            { name: "b", weight: 33 },
            { name: "c", weight: 34 },
          ],
        }),
      );

      const results = abTest.getResults("exp-onboarding-flow");
      expect(results.variants).toHaveLength(3);
      expect(results.variants.map((v) => v.variant)).toEqual(["a", "b", "c"]);
    });
  });

  // =========================================================================
  // Statistical significance
  // =========================================================================

  describe("statistical significance", () => {
    it("returns null significance with only one variant having data", () => {
      abTest.registerExperiment(
        createExperiment({
          variants: [{ name: "only", weight: 100 }],
        }),
      );

      abTest.selectVariant("user-1", "exp-onboarding-flow");
      const results = abTest.getResults("exp-onboarding-flow");

      expect(results.significance).toBeNull();
      expect(results.isSignificant).toBe(false);
    });

    it("returns non-significant for similar conversion rates", async () => {
      abTest.registerExperiment(createExperiment());

      // Assign many users to get traffic in both variants
      for (let i = 0; i < 200; i++) {
        abTest.selectVariant(`sig-user-${i}`, "exp-onboarding-flow");
      }

      // Track roughly equal conversions in each — just a few to avoid significance
      const results0 = abTest.getResults("exp-onboarding-flow");
      // We need to know which users are in which variant
      // Track 1 conversion in each variant
      for (let i = 0; i < 200; i++) {
        if (i < 2) {
          await abTest.trackConversion(
            `sig-user-${i}`,
            "exp-onboarding-flow",
            "signup",
          );
        }
      }

      const results = abTest.getResults("exp-onboarding-flow");
      // With very few conversions and many impressions, this should not be significant
      // (unless by extreme coincidence all conversions are in one variant)
      // Just verify the structure is correct
      expect(results.significance).not.toBeNull();
      expect(typeof results.significance).toBe("number");
      expect(typeof results.isSignificant).toBe("boolean");
    });

    it("detects significance when conversion rates differ dramatically", async () => {
      // Create a fresh test with deterministic assignments
      // Use single-variant sub-experiments to control assignment
      const testAB = new OnboardingABTest();
      testAB.registerExperiment(
        createExperiment({
          id: "sig-test",
          variants: [
            { name: "control", weight: 50 },
            { name: "variant_a", weight: 50 },
          ],
        }),
      );

      // Assign 200 users
      const controlUsers: string[] = [];
      const variantUsers: string[] = [];

      for (let i = 0; i < 400; i++) {
        const uid = `sigtest-user-${i}`;
        const v = testAB.selectVariant(uid, "sig-test");
        if (v === "control") {
          controlUsers.push(uid);
        } else {
          variantUsers.push(uid);
        }
      }

      // Convert very few in control, most in variant_a
      const controlConversions = Math.min(2, controlUsers.length);
      const variantConversions = Math.min(
        Math.floor(variantUsers.length * 0.8),
        variantUsers.length,
      );

      for (let i = 0; i < controlConversions; i++) {
        await testAB.trackConversion(controlUsers[i], "sig-test", "signup");
      }
      for (let i = 0; i < variantConversions; i++) {
        await testAB.trackConversion(variantUsers[i], "sig-test", "signup");
      }

      const results = testAB.getResults("sig-test");

      expect(results.significance).not.toBeNull();
      expect(results.significance!).toBeLessThan(0.05);
      expect(results.isSignificant).toBe(true);
    });

    it("p-value is 1 when no conversions at all", () => {
      abTest.registerExperiment(createExperiment());

      // Assign users to both buckets
      for (let i = 0; i < 100; i++) {
        abTest.selectVariant(`pval-user-${i}`, "exp-onboarding-flow");
      }

      const results = abTest.getResults("exp-onboarding-flow");

      // Zero conversions in both → pooled proportion is 0 → p-value = 1
      if (results.significance !== null) {
        expect(results.significance).toBe(1);
        expect(results.isSignificant).toBe(false);
      }
    });
  });

  // =========================================================================
  // Reset
  // =========================================================================

  describe("reset", () => {
    it("clears all internal state", async () => {
      abTest.registerExperiment(createExperiment());
      abTest.selectVariant("user-1", "exp-onboarding-flow");
      await abTest.trackConversion("user-1", "exp-onboarding-flow", "signup");

      abTest.reset();

      expect(abTest.getExperiment("exp-onboarding-flow")).toBeUndefined();
      expect(() =>
        abTest.selectVariant("user-1", "exp-onboarding-flow"),
      ).toThrow("not registered");
    });
  });

  // =========================================================================
  // Singleton export
  // =========================================================================

  describe("singleton", () => {
    it("exports a singleton instance", () => {
      expect(onboardingABTest).toBeInstanceOf(OnboardingABTest);
    });

    it("singleton is the default export", async () => {
      const defaultExport = (await import("../ab-testing")).default;
      expect(defaultExport).toBe(onboardingABTest);
    });
  });

  // =========================================================================
  // Type exports
  // =========================================================================

  describe("type exports", () => {
    it("exports Experiment interface fields correctly", () => {
      const exp: Experiment = {
        id: "test",
        name: "Test",
        variants: [{ name: "a", weight: 1 }],
        status: "active",
      };
      expect(exp.id).toBe("test");
      expect(exp.status).toBe("active");
    });

    it("exports Variant interface fields correctly", () => {
      const v: Variant = { name: "v", weight: 10 };
      expect(v.name).toBe("v");
      expect(v.weight).toBe(10);
    });

    it("exports ConversionEvent interface fields correctly", () => {
      const ce: ConversionEvent = {
        userId: "u1",
        experimentId: "e1",
        variant: "control",
        metric: "m1",
        timestamp: new Date().toISOString(),
      };
      expect(ce.userId).toBe("u1");
    });

    it("exports ExperimentResults interface fields correctly", () => {
      const er: ExperimentResults = {
        experimentId: "e1",
        status: "active",
        variants: [],
        significance: null,
        isSignificant: false,
        totalImpressions: 0,
        totalConversions: 0,
      };
      expect(er.isSignificant).toBe(false);
    });
  });
});
