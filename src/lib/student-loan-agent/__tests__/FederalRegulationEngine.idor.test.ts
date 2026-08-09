/**
 * Honesty tests for FederalRegulationEngine
 *
 * checkCompliance and validateStrategy previously returned isCompliant/isValid = true
 * unconditionally for any recognized regulation key — an affirmative false claim
 * that federal-regulation validation passed.
 *
 * These tests assert the corrected behaviour: both methods must NOT return an
 * unconditional true for a recognized key.  Real validation is a deferred
 * feature; the correct return is isCompliant: false / isValid: false with a
 * "manual review required" message.
 */

import { FederalRegulationEngine } from "../FederalRegulationEngine";

describe("FederalRegulationEngine — honesty (no unconditional true)", () => {
  let engine: FederalRegulationEngine;

  beforeEach(() => {
    engine = new FederalRegulationEngine();
  });

  // -------------------------------------------------------------------------
  // checkCompliance
  // -------------------------------------------------------------------------
  describe("checkCompliance", () => {
    const knownRegulations = ["FCRA", "HEA", "CFPB", "fcra", "hea", "cfpb"];

    it.each(knownRegulations)(
      "returns isCompliant: false for known regulation %s (no automated validation)",
      (regulationType) => {
        const result = engine.checkCompliance(regulationType, {
          reportingAccuracy: true,
        });
        expect(result.isCompliant).toBe(false);
      },
    );

    it("returns isCompliant: false for unknown regulation", () => {
      const result = engine.checkCompliance("UNKNOWN_REG", {});
      expect(result.isCompliant).toBe(false);
    });

    it("includes a message explaining that manual review is required", () => {
      const result = engine.checkCompliance("FCRA", {});
      expect(result.message.toLowerCase()).toContain("manual review");
    });

    it("never returns isCompliant: true for any input", () => {
      const regulationsToTest = [
        "FCRA",
        "HEA",
        "CFPB",
        "fresh_start_program",
        "loan_rehabilitation",
        "UNKNOWN",
      ];

      for (const reg of regulationsToTest) {
        const result = engine.checkCompliance(reg, { arbitrary: "data" });
        expect(result.isCompliant).toBe(false);
      }
    });
  });

  // -------------------------------------------------------------------------
  // validateStrategy
  // -------------------------------------------------------------------------
  describe("validateStrategy", () => {
    it("returns isValid: false for a well-formed strategy with a known regulation", () => {
      const result = engine.validateStrategy({
        type: "dispute",
        regulation: "FCRA",
        actions: ["verify_debt", "request_validation"],
      });
      expect(result.isValid).toBe(false);
    });

    it("returns isValid: false for a well-formed HEA strategy", () => {
      const result = engine.validateStrategy({
        type: "repayment",
        regulation: "HEA",
        actions: ["apply_idr"],
      });
      expect(result.isValid).toBe(false);
    });

    it("includes a message explaining that manual review is required", () => {
      const result = engine.validateStrategy({
        type: "dispute",
        regulation: "FCRA",
        actions: ["verify_debt"],
      });
      expect(result.message.toLowerCase()).toContain("manual review");
    });

    it("still returns isValid: false for unknown regulation", () => {
      const result = engine.validateStrategy({
        type: "invalid",
        regulation: "UNKNOWN_REG",
        actions: ["some_action"],
      });
      expect(result.isValid).toBe(false);
    });

    it("still returns isValid: false for empty actions", () => {
      const result = engine.validateStrategy({
        type: "dispute",
        regulation: "FCRA",
        actions: [],
      });
      expect(result.isValid).toBe(false);
    });

    it("never returns isValid: true for any input", () => {
      const strategies = [
        { regulation: "FCRA", actions: ["a", "b"] },
        { regulation: "HEA", actions: ["c"] },
        { regulation: "CFPB", actions: ["d", "e", "f"] },
      ];

      for (const strategy of strategies) {
        const result = engine.validateStrategy(strategy);
        expect(result.isValid).toBe(false);
      }
    });
  });
});
