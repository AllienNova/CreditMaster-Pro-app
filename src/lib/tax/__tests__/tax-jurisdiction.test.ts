/**
 * Tax Jurisdiction Types & Helpers Test Suite
 *
 * Covers: FEDERAL_TAX_BRACKETS_2024, LTCG_BRACKETS_2024, STATE_TAX_INFO,
 *         FICA_RATES_2024, getStateTaxInfo, hasStateTax, getStateTopRate
 */

import {
  FEDERAL_TAX_BRACKETS_2024,
  LTCG_BRACKETS_2024,
  STATE_TAX_INFO,
  FICA_RATES_2024,
  getStateTaxInfo,
  hasStateTax,
  getStateTopRate,
} from "../types/tax-jurisdiction.types";
import { FilingStatus } from "../types/tax-profile.types";

describe("Tax Jurisdiction Types & Helpers", () => {
  // =========================================================================
  // FEDERAL_TAX_BRACKETS_2024
  // =========================================================================
  describe("FEDERAL_TAX_BRACKETS_2024", () => {
    it("should have brackets for all filing statuses", () => {
      expect(FEDERAL_TAX_BRACKETS_2024).toHaveProperty(FilingStatus.SINGLE);
      expect(FEDERAL_TAX_BRACKETS_2024).toHaveProperty(
        FilingStatus.MARRIED_FILING_JOINTLY,
      );
      expect(FEDERAL_TAX_BRACKETS_2024).toHaveProperty(
        FilingStatus.MARRIED_FILING_SEPARATELY,
      );
      expect(FEDERAL_TAX_BRACKETS_2024).toHaveProperty(
        FilingStatus.HEAD_OF_HOUSEHOLD,
      );
    });

    it("should have 7 brackets for single filers", () => {
      expect(FEDERAL_TAX_BRACKETS_2024[FilingStatus.SINGLE]).toHaveLength(7);
    });

    it("should start at 10% rate for single", () => {
      const firstBracket = FEDERAL_TAX_BRACKETS_2024[FilingStatus.SINGLE][0];
      expect(firstBracket.rate).toBe(0.1);
    });

    it("should end at 37% rate for single", () => {
      const brackets = FEDERAL_TAX_BRACKETS_2024[FilingStatus.SINGLE];
      const lastBracket = brackets[brackets.length - 1];
      expect(lastBracket.rate).toBe(0.37);
    });

    it("should have ascending rates", () => {
      const brackets = FEDERAL_TAX_BRACKETS_2024[FilingStatus.SINGLE];
      for (let i = 1; i < brackets.length; i++) {
        expect(brackets[i].rate).toBeGreaterThan(brackets[i - 1].rate);
      }
    });

    it("should have contiguous brackets (no gaps)", () => {
      const brackets = FEDERAL_TAX_BRACKETS_2024[FilingStatus.SINGLE];
      for (let i = 1; i < brackets.length; i++) {
        expect(brackets[i].min).toBe(brackets[i - 1].max);
      }
    });

    it("should start at 0 for first bracket", () => {
      const brackets = FEDERAL_TAX_BRACKETS_2024[FilingStatus.SINGLE];
      expect(brackets[0].min).toBe(0);
    });

    it("should have correct single filer first bracket max of $11,600", () => {
      const brackets = FEDERAL_TAX_BRACKETS_2024[FilingStatus.SINGLE];
      expect(brackets[0].max).toBe(11600);
    });

    it("should have wider brackets for married filing jointly", () => {
      const single = FEDERAL_TAX_BRACKETS_2024[FilingStatus.SINGLE];
      const married =
        FEDERAL_TAX_BRACKETS_2024[FilingStatus.MARRIED_FILING_JOINTLY];
      // MFJ first bracket should be approximately double single
      expect(married[0].max).toBeGreaterThan(single[0].max);
    });

    it("should have 7 brackets for all filing statuses", () => {
      expect(
        FEDERAL_TAX_BRACKETS_2024[FilingStatus.MARRIED_FILING_JOINTLY],
      ).toHaveLength(7);
      expect(
        FEDERAL_TAX_BRACKETS_2024[FilingStatus.MARRIED_FILING_SEPARATELY],
      ).toHaveLength(7);
      expect(
        FEDERAL_TAX_BRACKETS_2024[FilingStatus.HEAD_OF_HOUSEHOLD],
      ).toHaveLength(7);
    });
  });

  // =========================================================================
  // LTCG_BRACKETS_2024
  // =========================================================================
  describe("LTCG_BRACKETS_2024", () => {
    it("should have brackets for all filing statuses", () => {
      expect(LTCG_BRACKETS_2024).toHaveProperty(FilingStatus.SINGLE);
      expect(LTCG_BRACKETS_2024).toHaveProperty(
        FilingStatus.MARRIED_FILING_JOINTLY,
      );
    });

    it("should have 3 tiers for single", () => {
      expect(LTCG_BRACKETS_2024[FilingStatus.SINGLE]).toHaveLength(3);
    });

    it("should start at 0% rate", () => {
      expect(LTCG_BRACKETS_2024[FilingStatus.SINGLE][0].rate).toBe(0);
    });

    it("should have 15% middle tier", () => {
      expect(LTCG_BRACKETS_2024[FilingStatus.SINGLE][1].rate).toBe(0.15);
    });

    it("should end at 20% rate", () => {
      const brackets = LTCG_BRACKETS_2024[FilingStatus.SINGLE];
      expect(brackets[brackets.length - 1].rate).toBe(0.2);
    });

    it("should have 0% threshold at $47,025 for single", () => {
      expect(LTCG_BRACKETS_2024[FilingStatus.SINGLE][0].max).toBe(47025);
    });

    it("should have 15% threshold at $518,900 for single", () => {
      expect(LTCG_BRACKETS_2024[FilingStatus.SINGLE][1].max).toBe(518900);
    });
  });

  // =========================================================================
  // STATE_TAX_INFO
  // =========================================================================
  describe("STATE_TAX_INFO", () => {
    it("should have entries for all 50 states + DC", () => {
      const stateCount = Object.keys(STATE_TAX_INFO).length;
      expect(stateCount).toBeGreaterThanOrEqual(50);
    });

    it("should mark no-income-tax states correctly", () => {
      const noTaxStates = ["AK", "FL", "NV", "SD", "TX", "WA", "WY"];
      for (const state of noTaxStates) {
        expect(STATE_TAX_INFO[state]).toBeDefined();
        expect(STATE_TAX_INFO[state].hasIncomeTax).toBe(false);
      }
    });

    it("should mark NH and TN as no income tax", () => {
      expect(STATE_TAX_INFO["NH"].hasIncomeTax).toBe(false);
      expect(STATE_TAX_INFO["TN"].hasIncomeTax).toBe(false);
    });

    it("should have income tax for CA", () => {
      expect(STATE_TAX_INFO["CA"].hasIncomeTax).toBe(true);
    });

    it("should have income tax for NY", () => {
      expect(STATE_TAX_INFO["NY"].hasIncomeTax).toBe(true);
    });

    it("should include top rate for tax states", () => {
      expect(getStateTopRate("CA")).toBeGreaterThan(0);
      expect(getStateTopRate("NY")).toBeGreaterThan(0);
    });

    it("should include state name", () => {
      expect(STATE_TAX_INFO["CA"].stateName).toBe("California");
      expect(STATE_TAX_INFO["TX"].stateName).toBe("Texas");
      expect(STATE_TAX_INFO["NY"].stateName).toBe("New York");
    });

    it("should include tax type (flat/progressive/none)", () => {
      // IL is flat, CA is progressive (not flat but has income tax), TX has no income tax
      expect(STATE_TAX_INFO["IL"].isFlat).toBe(true);
      expect(STATE_TAX_INFO["IL"].hasIncomeTax).toBe(true);
      expect(STATE_TAX_INFO["CA"].isFlat).toBe(false);
      expect(STATE_TAX_INFO["CA"].hasIncomeTax).toBe(true);
      expect(STATE_TAX_INFO["TX"].hasIncomeTax).toBe(false);
    });
  });

  // =========================================================================
  // FICA_RATES_2024
  // =========================================================================
  describe("FICA_RATES_2024", () => {
    it("should have Social Security employee rate of 6.2%", () => {
      expect(FICA_RATES_2024.socialSecurityEmployee).toBe(0.062);
    });

    it("should have Social Security wage base of $168,600", () => {
      expect(FICA_RATES_2024.socialSecurityWageBase).toBe(168600);
    });

    it("should have Medicare employee rate of 1.45%", () => {
      expect(FICA_RATES_2024.medicareEmployee).toBe(0.0145);
    });

    it("should have Additional Medicare threshold $200k for single", () => {
      expect(FICA_RATES_2024.additionalMedicareThresholdSingle).toBe(200000);
    });

    it("should have Additional Medicare threshold $250k for married", () => {
      expect(FICA_RATES_2024.additionalMedicareThresholdMarried).toBe(250000);
    });

    it("should have Additional Medicare rate of 0.9%", () => {
      expect(FICA_RATES_2024.additionalMedicareRate).toBe(0.009);
    });

    it("should have self-employment rate of 15.3%", () => {
      expect(FICA_RATES_2024.selfEmploymentRate).toBe(0.153);
    });

    it("should have self-employment deduction of 50%", () => {
      expect(FICA_RATES_2024.selfEmploymentDeduction).toBe(0.5);
    });
  });

  // =========================================================================
  // getStateTaxInfo
  // =========================================================================
  describe("getStateTaxInfo", () => {
    it("should return state info for valid state code", () => {
      const info = getStateTaxInfo("CA");
      expect(info).not.toBeNull();
      expect(info!.stateName).toBe("California");
      expect(info!.hasIncomeTax).toBe(true);
    });

    it("should return state info for no-tax state", () => {
      const info = getStateTaxInfo("TX");
      expect(info).not.toBeNull();
      expect(info!.stateName).toBe("Texas");
      expect(info!.hasIncomeTax).toBe(false);
    });

    it("should return null for invalid state code", () => {
      const info = getStateTaxInfo("ZZ");
      expect(info).toBeNull();
    });

    it("should return null for empty string", () => {
      const info = getStateTaxInfo("");
      expect(info).toBeNull();
    });

    it("should handle all no-tax states", () => {
      const noTaxCodes = ["AK", "FL", "NV", "NH", "SD", "TN", "TX", "WA", "WY"];
      for (const code of noTaxCodes) {
        const info = getStateTaxInfo(code);
        expect(info).not.toBeNull();
        expect(info!.hasIncomeTax).toBe(false);
      }
    });
  });

  // =========================================================================
  // hasStateTax
  // =========================================================================
  describe("hasStateTax", () => {
    it("should return true for CA", () => {
      expect(hasStateTax("CA")).toBe(true);
    });

    it("should return true for NY", () => {
      expect(hasStateTax("NY")).toBe(true);
    });

    it("should return false for TX", () => {
      expect(hasStateTax("TX")).toBe(false);
    });

    it("should return false for FL", () => {
      expect(hasStateTax("FL")).toBe(false);
    });

    it("should return false for all 9 no-tax states", () => {
      const noTaxStates = [
        "AK",
        "FL",
        "NV",
        "NH",
        "SD",
        "TN",
        "TX",
        "WA",
        "WY",
      ];
      for (const state of noTaxStates) {
        expect(hasStateTax(state)).toBe(false);
      }
    });

    it("should return false for invalid state code", () => {
      expect(hasStateTax("ZZ")).toBe(false);
    });

    it("should return true for flat-tax states", () => {
      expect(hasStateTax("IL")).toBe(true);
      expect(hasStateTax("PA")).toBe(true);
      expect(hasStateTax("IN")).toBe(true);
    });
  });

  // =========================================================================
  // getStateTopRate
  // =========================================================================
  describe("getStateTopRate", () => {
    it("should return CA top rate of 13.3%", () => {
      const rate = getStateTopRate("CA");
      expect(rate).toBeCloseTo(0.133, 2);
    });

    it("should return IL flat rate of 4.95%", () => {
      const rate = getStateTopRate("IL");
      expect(rate).toBeCloseTo(0.0495, 3);
    });

    it("should return 0 for no-tax states", () => {
      expect(getStateTopRate("TX")).toBe(0);
      expect(getStateTopRate("FL")).toBe(0);
      expect(getStateTopRate("WA")).toBe(0);
    });

    it("should return 0 for invalid state", () => {
      expect(getStateTopRate("ZZ")).toBe(0);
    });

    it("should return positive rate for progressive states", () => {
      expect(getStateTopRate("NY")).toBeGreaterThan(0);
      expect(getStateTopRate("NJ")).toBeGreaterThan(0);
      expect(getStateTopRate("OR")).toBeGreaterThan(0);
    });

    it("should return PA rate of 3.07%", () => {
      const rate = getStateTopRate("PA");
      expect(rate).toBeCloseTo(0.0307, 3);
    });
  });
});
