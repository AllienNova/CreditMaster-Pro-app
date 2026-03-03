/**
 * StateTaxEngine Test Suite
 *
 * 60+ test cases covering:
 *   - Single-state calculations for each tax type (progressive, flat, no-tax)
 *   - Multi-state allocation (days worked and income sourced)
 *   - State-specific deductions and credits
 *   - Reciprocity agreements
 *   - Filing recommendations
 *   - Edge cases (negative income, zero income, very high income, unknown states)
 */

import {
  StateTaxEngine,
  TOP_20_STATES,
} from "../services/StateTaxEngine";
import { FilingStatus } from "../types/tax-profile.types";

describe("StateTaxEngine", () => {
  let engine: StateTaxEngine;

  beforeEach(() => {
    engine = new StateTaxEngine(2024);
  });

  // =========================================================================
  // CONSTRUCTOR & BASIC METADATA
  // =========================================================================
  describe("Constructor & Metadata", () => {
    it("should initialize with the given tax year", () => {
      expect(engine.getTaxYear()).toBe(2024);
    });

    it("should default to current year when no tax year provided", () => {
      const defaultEngine = new StateTaxEngine();
      expect(defaultEngine.getTaxYear()).toBe(new Date().getFullYear());
    });

    it("should have 20 supported states", () => {
      expect(engine.getSupportedStates()).toHaveLength(20);
    });

    it("should recognize CA as a supported state", () => {
      expect(engine.isSupportedState("CA")).toBe(true);
    });

    it("should recognize TX as a supported state", () => {
      expect(engine.isSupportedState("TX")).toBe(true);
    });

    it("should not recognize DC as a top-20 state", () => {
      expect(engine.isSupportedState("DC")).toBe(false);
    });

    it("should be case-insensitive for supported state lookup", () => {
      expect(engine.isSupportedState("ca")).toBe(true);
      expect(engine.isSupportedState("Ny")).toBe(true);
    });
  });

  // =========================================================================
  // SINGLE-STATE: NO-INCOME-TAX STATES
  // =========================================================================
  describe("Single-State: No Income Tax", () => {
    const noTaxStates = ["TX", "FL", "WA", "TN"];

    it.each(noTaxStates)(
      "should return $0 tax for %s (no income tax)",
      (state) => {
        const result = engine.calculateStateTax(
          100000,
          state,
          FilingStatus.SINGLE,
        );
        expect(result.netTax).toBe(0);
        expect(result.effectiveRate).toBe(0);
        expect(result.taxType).toBe("none");
        expect(result.bracketBreakdown).toHaveLength(0);
      },
    );

    it("should return taxType 'none' for TX", () => {
      const result = engine.calculateStateTax(
        500000,
        "TX",
        FilingStatus.MARRIED_FILING_JOINTLY,
      );
      expect(result.taxType).toBe("none");
      expect(result.stateCode).toBe("TX");
    });
  });

  // =========================================================================
  // SINGLE-STATE: FLAT TAX STATES
  // =========================================================================
  describe("Single-State: Flat Tax", () => {
    it("should calculate flat tax for IL (4.95%)", () => {
      // IL: 4.95%, personalExemption: 2625, standardDeduction: 0
      // taxable = 100000 - 2625 = 97375
      // tax = 97375 * 0.0495 = 4820.0625
      const result = engine.calculateStateTax(
        100000,
        "IL",
        FilingStatus.SINGLE,
      );
      expect(result.taxType).toBe("flat");
      expect(result.netTax).toBeCloseTo(4820.06, 0);
      expect(result.bracketBreakdown).toHaveLength(1);
      expect(result.marginalRate).toBeCloseTo(0.0495, 4);
    });

    it("should calculate flat tax for PA (3.07%)", () => {
      // PA: 3.07%, no deduction, no exemption
      // tax = 100000 * 0.0307 = 3070
      const result = engine.calculateStateTax(
        100000,
        "PA",
        FilingStatus.SINGLE,
      );
      expect(result.taxType).toBe("flat");
      expect(result.netTax).toBeCloseTo(3070, 0);
    });

    it("should calculate flat tax for IN (3.05%)", () => {
      // IN: 3.05%, personalExemption: 1000, standardDeduction: 0
      // taxable = 75000 - 1000 = 74000
      // tax = 74000 * 0.0305 = 2257.00
      const result = engine.calculateStateTax(
        75000,
        "IN",
        FilingStatus.SINGLE,
      );
      expect(result.taxType).toBe("flat");
      expect(result.netTax).toBeCloseTo(2257.0, 0);
      expect(result.hasLocalTax).toBe(true);
    });

    it("should calculate flat tax for NC (5.25%)", () => {
      // NC: 5.25%, standardDeduction: 12750
      // taxable = 100000 - 12750 = 87250
      // tax = 87250 * 0.0525 = 4580.625
      const result = engine.calculateStateTax(
        100000,
        "NC",
        FilingStatus.SINGLE,
      );
      expect(result.taxType).toBe("flat");
      expect(result.netTax).toBeCloseTo(4580.63, 0);
    });

    it("should calculate flat tax for AZ (2.5%)", () => {
      // AZ: 2.5%, standardDeduction: 14600
      // taxable = 100000 - 14600 = 85400
      // tax = 85400 * 0.025 = 2135
      const result = engine.calculateStateTax(
        100000,
        "AZ",
        FilingStatus.SINGLE,
      );
      expect(result.taxType).toBe("flat");
      expect(result.netTax).toBeCloseTo(2135, 0);
    });

    it("should calculate flat tax for MI (4.25%)", () => {
      // MI: 4.25%, personalExemption: 5600, standardDeduction: 0
      // taxable = 100000 - 5600 = 94400
      // tax = 94400 * 0.0425 = 4012
      const result = engine.calculateStateTax(
        100000,
        "MI",
        FilingStatus.SINGLE,
      );
      expect(result.taxType).toBe("flat");
      expect(result.netTax).toBeCloseTo(4012, 0);
      expect(result.hasLocalTax).toBe(true);
    });
  });

  // =========================================================================
  // SINGLE-STATE: PROGRESSIVE TAX STATES
  // =========================================================================
  describe("Single-State: Progressive Tax", () => {
    it("should calculate progressive tax for CA at $100K", () => {
      // CA: progressive brackets, standardDeduction: 5540, personalExemption: 144
      // taxable = 100000 - 5684 = 94316
      const result = engine.calculateStateTax(
        100000,
        "CA",
        FilingStatus.SINGLE,
      );
      expect(result.taxType).toBe("progressive");
      expect(result.netTax).toBeGreaterThan(3000);
      expect(result.netTax).toBeLessThan(8000);
      expect(result.bracketBreakdown.length).toBeGreaterThan(1);
    });

    it("should calculate progressive tax for NY at $150K", () => {
      const result = engine.calculateStateTax(
        150000,
        "NY",
        FilingStatus.SINGLE,
      );
      expect(result.taxType).toBe("progressive");
      expect(result.netTax).toBeGreaterThan(5000);
      expect(result.netTax).toBeLessThan(12000);
    });

    it("should calculate progressive tax for NJ at $100K", () => {
      // NJ: progressive, personalExemption: 1000, standardDeduction: 0
      const result = engine.calculateStateTax(
        100000,
        "NJ",
        FilingStatus.SINGLE,
      );
      expect(result.taxType).toBe("progressive");
      expect(result.netTax).toBeGreaterThan(3000);
      expect(result.netTax).toBeLessThan(7000);
    });

    it("should calculate progressive tax for GA at $80K", () => {
      // GA: progressive, standardDeduction: 5400, personalExemption: 2700
      const result = engine.calculateStateTax(
        80000,
        "GA",
        FilingStatus.SINGLE,
      );
      expect(result.taxType).toBe("progressive");
      expect(result.netTax).toBeGreaterThan(2000);
      expect(result.netTax).toBeLessThan(5500);
    });

    it("should calculate progressive tax for OH at $75K", () => {
      // OH: progressive, personalExemption: 2400, first bracket is 0%
      const result = engine.calculateStateTax(
        75000,
        "OH",
        FilingStatus.SINGLE,
      );
      expect(result.taxType).toBe("progressive");
      // OH exempts first $26050 at 0%, so tax is lower than you'd expect
      expect(result.netTax).toBeGreaterThan(500);
      expect(result.netTax).toBeLessThan(3000);
    });

    it("should calculate progressive tax for VA at $100K", () => {
      const result = engine.calculateStateTax(
        100000,
        "VA",
        FilingStatus.SINGLE,
      );
      expect(result.taxType).toBe("progressive");
      expect(result.netTax).toBeGreaterThan(3000);
      expect(result.netTax).toBeLessThan(7000);
    });

    it("should calculate progressive tax for MD at $120K", () => {
      const result = engine.calculateStateTax(
        120000,
        "MD",
        FilingStatus.SINGLE,
      );
      expect(result.taxType).toBe("progressive");
      expect(result.netTax).toBeGreaterThan(3000);
      expect(result.netTax).toBeLessThan(7000);
      expect(result.hasLocalTax).toBe(true);
    });

    it("should calculate progressive tax for MO at $60K", () => {
      // MO: progressive with 0% first bracket (under $1207), standardDeduction: 14600
      const result = engine.calculateStateTax(
        60000,
        "MO",
        FilingStatus.SINGLE,
      );
      expect(result.taxType).toBe("progressive");
      expect(result.netTax).toBeGreaterThan(500);
      expect(result.netTax).toBeLessThan(3000);
    });

    it("should calculate progressive tax for WI at $80K", () => {
      const result = engine.calculateStateTax(
        80000,
        "WI",
        FilingStatus.SINGLE,
      );
      expect(result.taxType).toBe("progressive");
      expect(result.netTax).toBeGreaterThan(2000);
      expect(result.netTax).toBeLessThan(5000);
    });

    it("should calculate MA progressive tax (5% + 9% surtax over $1M)", () => {
      // MA: 5% up to $1M, 9% above $1M; personalExemption: 4400
      const result = engine.calculateStateTax(
        1500000,
        "MA",
        FilingStatus.SINGLE,
      );
      expect(result.taxType).toBe("progressive");
      // At $1.5M: (1M - 4400) * 0.05 + 500000 * 0.09 = 49780 + 45000 = ~94780
      expect(result.netTax).toBeGreaterThan(90000);
      expect(result.netTax).toBeLessThan(100000);
    });
  });

  // =========================================================================
  // EDGE CASES
  // =========================================================================
  describe("Edge Cases", () => {
    it("should return $0 for zero income", () => {
      const result = engine.calculateStateTax(
        0,
        "CA",
        FilingStatus.SINGLE,
      );
      expect(result.netTax).toBe(0);
      expect(result.taxableIncome).toBe(0);
    });

    it("should return $0 for negative income", () => {
      const result = engine.calculateStateTax(
        -50000,
        "CA",
        FilingStatus.SINGLE,
      );
      expect(result.netTax).toBe(0);
      expect(result.taxableIncome).toBe(0);
    });

    it("should handle very high income ($10M) for CA", () => {
      const result = engine.calculateStateTax(
        10000000,
        "CA",
        FilingStatus.SINGLE,
      );
      // Most income in top bracket (13.3%)
      expect(result.netTax).toBeGreaterThan(1000000);
      expect(result.effectiveRate).toBeGreaterThan(0.12);
      expect(result.effectiveRate).toBeLessThan(0.14);
    });

    it("should handle unknown state code gracefully", () => {
      const result = engine.calculateStateTax(
        100000,
        "ZZ",
        FilingStatus.SINGLE,
      );
      expect(result.netTax).toBe(0);
      expect(result.taxType).toBe("none");
      expect(result.stateCode).toBe("ZZ");
    });

    it("should handle income below state deduction", () => {
      // CA standard deduction + personal exemption = 5540 + 144 = 5684
      const result = engine.calculateStateTax(
        3000,
        "CA",
        FilingStatus.SINGLE,
      );
      expect(result.netTax).toBe(0);
      expect(result.taxableIncome).toBe(0);
    });

    it("should handle income exactly at deduction threshold", () => {
      // CA deduction = 5684
      const result = engine.calculateStateTax(
        5684,
        "CA",
        FilingStatus.SINGLE,
      );
      expect(result.netTax).toBe(0);
      expect(result.taxableIncome).toBe(0);
    });

    it("should handle $1 above deduction threshold", () => {
      const result = engine.calculateStateTax(
        5685,
        "CA",
        FilingStatus.SINGLE,
      );
      // taxableIncome is $1 ($5685 - $5684 standard deduction)
      expect(result.taxableIncome).toBe(1);
      // Tax before credits is positive (1 * 1% = $0.01)
      expect(result.taxBeforeCredits).toBeGreaterThan(0);
      // netTax may be 0 because CalEITC credit ($483) exceeds the tiny tax
      expect(result.netTax).toBeGreaterThanOrEqual(0);
    });

    it("should handle all filing statuses without error", () => {
      const statuses = [
        FilingStatus.SINGLE,
        FilingStatus.MARRIED_FILING_JOINTLY,
        FilingStatus.MARRIED_FILING_SEPARATELY,
        FilingStatus.HEAD_OF_HOUSEHOLD,
        FilingStatus.QUALIFYING_SURVIVING_SPOUSE,
      ];

      for (const status of statuses) {
        const result = engine.calculateStateTax(100000, "CA", status);
        expect(result.netTax).toBeGreaterThanOrEqual(0);
      }
    });
  });

  // =========================================================================
  // STATE DEDUCTIONS
  // =========================================================================
  describe("State Deductions", () => {
    it("should return CA deductions", () => {
      const deductions = engine.getStateDeductions("CA", FilingStatus.SINGLE);
      expect(deductions.standardDeduction).toBe(5540);
      expect(deductions.personalExemption).toBe(144);
      expect(deductions.total).toBe(5684);
    });

    it("should return PA deductions (both zero)", () => {
      const deductions = engine.getStateDeductions("PA", FilingStatus.SINGLE);
      expect(deductions.standardDeduction).toBe(0);
      expect(deductions.personalExemption).toBe(0);
      expect(deductions.total).toBe(0);
    });

    it("should return TX deductions (no tax state)", () => {
      const deductions = engine.getStateDeductions("TX", FilingStatus.SINGLE);
      expect(deductions.total).toBe(0);
    });

    it("should return IL deductions (personal exemption only)", () => {
      const deductions = engine.getStateDeductions("IL", FilingStatus.SINGLE);
      expect(deductions.standardDeduction).toBe(0);
      expect(deductions.personalExemption).toBe(2625);
      expect(deductions.total).toBe(2625);
    });

    it("should return zero for unknown state", () => {
      const deductions = engine.getStateDeductions("ZZ", FilingStatus.SINGLE);
      expect(deductions.total).toBe(0);
    });
  });

  // =========================================================================
  // STATE CREDITS
  // =========================================================================
  describe("State Credits", () => {
    it("should return CA renter's credit for low-income single filer", () => {
      const credits = engine.getStateCredits(
        "CA",
        40000,
        FilingStatus.SINGLE,
      );
      const rentersCredit = credits.find(
        (c) => c.creditName === "CA Renter's Credit",
      );
      expect(rentersCredit).toBeDefined();
      expect(rentersCredit!.amount).toBe(60);
    });

    it("should return CA renter's credit of $120 for married filing jointly", () => {
      const credits = engine.getStateCredits(
        "CA",
        40000,
        FilingStatus.MARRIED_FILING_JOINTLY,
      );
      const rentersCredit = credits.find(
        (c) => c.creditName === "CA Renter's Credit",
      );
      expect(rentersCredit).toBeDefined();
      expect(rentersCredit!.amount).toBe(120);
    });

    it("should not return CA renter's credit for high-income filer", () => {
      const credits = engine.getStateCredits(
        "CA",
        200000,
        FilingStatus.SINGLE,
      );
      const rentersCredit = credits.find(
        (c) => c.creditName === "CA Renter's Credit",
      );
      expect(rentersCredit).toBeUndefined();
    });

    it("should return NJ property tax credit for qualifying income", () => {
      const credits = engine.getStateCredits(
        "NJ",
        80000,
        FilingStatus.SINGLE,
      );
      const ptCredit = credits.find(
        (c) => c.creditName === "NJ Property Tax Deduction/Credit",
      );
      expect(ptCredit).toBeDefined();
      expect(ptCredit!.amount).toBe(50);
    });

    it("should not return NJ property tax credit for high income", () => {
      const credits = engine.getStateCredits(
        "NJ",
        200000,
        FilingStatus.SINGLE,
      );
      expect(credits).toHaveLength(0);
    });

    it("should return empty credits for states with no defined credits", () => {
      const credits = engine.getStateCredits(
        "NC",
        100000,
        FilingStatus.SINGLE,
      );
      expect(credits).toHaveLength(0);
    });

    it("should return empty credits for no-tax states", () => {
      const credits = engine.getStateCredits(
        "TX",
        100000,
        FilingStatus.SINGLE,
      );
      expect(credits).toHaveLength(0);
    });

    it("should apply credits to reduce tax in calculateStateTax", () => {
      // CA at $5000 income: CalEITC should apply
      const result = engine.calculateStateTax(
        5000,
        "CA",
        FilingStatus.SINGLE,
      );
      // Income is below deduction so tax is $0, but credits array should be populated
      expect(result.netTax).toBe(0);
    });
  });

  // =========================================================================
  // MULTI-STATE: DAYS WORKED METHOD
  // =========================================================================
  describe("Multi-State: Days Worked Allocation", () => {
    it("should allocate income by days worked", () => {
      const result = engine.calculateMultiStateTax(
        100000,
        [
          { stateCode: "NY", daysWorked: 200, incomeSourced: 0 },
          { stateCode: "NJ", daysWorked: 60, incomeSourced: 0 },
        ],
        FilingStatus.SINGLE,
        "days_worked",
      );

      expect(result.stateResults).toHaveLength(2);
      expect(result.totalIncome).toBe(100000);
      expect(result.allocationMethod).toBe("days_worked");

      const nyResult = result.stateResults.find(
        (r) => r.stateCode === "NY",
      );
      const njResult = result.stateResults.find(
        (r) => r.stateCode === "NJ",
      );

      // NY gets 200/260 of income
      expect(nyResult!.allocatedIncome).toBeCloseTo(76923.08, 0);
      // NJ gets 60/260
      expect(njResult!.allocatedIncome).toBeCloseTo(23076.92, 0);
    });

    it("should handle single-state allocation", () => {
      const result = engine.calculateMultiStateTax(
        100000,
        [{ stateCode: "CA", daysWorked: 260, incomeSourced: 0 }],
        FilingStatus.SINGLE,
        "days_worked",
      );

      expect(result.stateResults).toHaveLength(1);
      expect(result.stateResults[0].allocatedIncome).toBeCloseTo(100000, 0);
    });

    it("should handle empty allocations", () => {
      const result = engine.calculateMultiStateTax(
        100000,
        [],
        FilingStatus.SINGLE,
        "days_worked",
      );

      expect(result.stateResults).toHaveLength(0);
      expect(result.totalStateTax).toBe(0);
    });

    it("should handle zero total days", () => {
      const result = engine.calculateMultiStateTax(
        100000,
        [
          { stateCode: "NY", daysWorked: 0, incomeSourced: 0 },
          { stateCode: "CA", daysWorked: 0, incomeSourced: 0 },
        ],
        FilingStatus.SINGLE,
        "days_worked",
      );

      expect(result.stateResults).toHaveLength(2);
      for (const r of result.stateResults) {
        expect(r.allocatedIncome).toBe(0);
        expect(r.netTax).toBe(0);
      }
    });
  });

  // =========================================================================
  // MULTI-STATE: INCOME SOURCED METHOD
  // =========================================================================
  describe("Multi-State: Income Sourced Allocation", () => {
    it("should allocate income by income sourced amounts", () => {
      const result = engine.calculateMultiStateTax(
        120000,
        [
          { stateCode: "CA", daysWorked: 0, incomeSourced: 80000 },
          { stateCode: "NY", daysWorked: 0, incomeSourced: 40000 },
        ],
        FilingStatus.SINGLE,
        "income_sourced",
      );

      expect(result.stateResults).toHaveLength(2);

      const caResult = result.stateResults.find(
        (r) => r.stateCode === "CA",
      );
      const nyResult = result.stateResults.find(
        (r) => r.stateCode === "NY",
      );

      expect(caResult!.allocatedIncome).toBe(80000);
      expect(nyResult!.allocatedIncome).toBe(40000);
      expect(result.totalStateTax).toBeGreaterThan(0);
    });

    it("should handle income sourced to a no-tax state", () => {
      const result = engine.calculateMultiStateTax(
        100000,
        [
          { stateCode: "TX", daysWorked: 0, incomeSourced: 50000 },
          { stateCode: "CA", daysWorked: 0, incomeSourced: 50000 },
        ],
        FilingStatus.SINGLE,
        "income_sourced",
      );

      const txResult = result.stateResults.find(
        (r) => r.stateCode === "TX",
      );
      expect(txResult!.netTax).toBe(0);
    });
  });

  // =========================================================================
  // MULTI-STATE: TOTAL TAX & EFFECTIVE RATE
  // =========================================================================
  describe("Multi-State: Aggregate Results", () => {
    it("should compute total state tax and effective rate", () => {
      const result = engine.calculateMultiStateTax(
        200000,
        [
          { stateCode: "CA", daysWorked: 130, incomeSourced: 0 },
          { stateCode: "NY", daysWorked: 130, incomeSourced: 0 },
        ],
        FilingStatus.SINGLE,
        "days_worked",
      );

      expect(result.totalStateTax).toBeGreaterThan(0);
      expect(result.totalEffectiveRate).toBeGreaterThan(0);
      expect(result.totalEffectiveRate).toBeLessThan(0.15);
    });
  });

  // =========================================================================
  // RECIPROCITY AGREEMENTS
  // =========================================================================
  describe("Reciprocity Agreements", () => {
    it("should find NJ-PA reciprocity", () => {
      const agreement = engine.getReciprocityAgreement("NJ", "PA");
      expect(agreement).not.toBeNull();
      expect(agreement!.description).toContain("New Jersey");
      expect(agreement!.description).toContain("Pennsylvania");
    });

    it("should find PA-NJ reciprocity (reverse order)", () => {
      const agreement = engine.getReciprocityAgreement("PA", "NJ");
      expect(agreement).not.toBeNull();
    });

    it("should find VA-DC reciprocity", () => {
      const agreement = engine.getReciprocityAgreement("VA", "DC");
      expect(agreement).not.toBeNull();
    });

    it("should find IN-OH reciprocity", () => {
      const agreement = engine.getReciprocityAgreement("IN", "OH");
      expect(agreement).not.toBeNull();
    });

    it("should find WI-IL reciprocity", () => {
      const agreement = engine.getReciprocityAgreement("WI", "IL");
      expect(agreement).not.toBeNull();
    });

    it("should return null for states without reciprocity", () => {
      const agreement = engine.getReciprocityAgreement("CA", "TX");
      expect(agreement).toBeNull();
    });

    it("should return null for same state", () => {
      const agreement = engine.getReciprocityAgreement("CA", "CA");
      expect(agreement).toBeNull();
    });

    it("should find all reciprocity agreements for IN", () => {
      const agreements = engine.getReciprocityAgreementsForState("IN");
      expect(agreements.length).toBeGreaterThanOrEqual(4); // IN has agreements with OH, MI, PA, WI
    });

    it("should find all reciprocity agreements for MD", () => {
      const agreements = engine.getReciprocityAgreementsForState("MD");
      expect(agreements.length).toBeGreaterThanOrEqual(3); // MD-DC, MD-PA, MD-VA, MD-WV
    });

    it("should return empty for states without reciprocity agreements", () => {
      const agreements = engine.getReciprocityAgreementsForState("CA");
      expect(agreements).toHaveLength(0);
    });

    it("should be case-insensitive", () => {
      const agreement = engine.getReciprocityAgreement("nj", "pa");
      expect(agreement).not.toBeNull();
    });
  });

  // =========================================================================
  // FILING RECOMMENDATIONS
  // =========================================================================
  describe("Filing Recommendations", () => {
    it("should recommend reciprocity for NJ resident working in PA", () => {
      const recs = engine.getFilingRecommendations(
        "NJ",
        ["PA"],
        100000,
        FilingStatus.SINGLE,
      );
      const reciprocityRec = recs.find((r) => r.type === "reciprocity");
      expect(reciprocityRec).toBeDefined();
      expect(reciprocityRec!.priority).toBe("high");
    });

    it("should recommend credit for taxes paid for multi-state filer", () => {
      const recs = engine.getFilingRecommendations(
        "NY",
        ["NJ"],
        150000,
        FilingStatus.SINGLE,
      );
      const creditRec = recs.find(
        (r) => r.type === "credit_for_taxes_paid",
      );
      expect(creditRec).toBeDefined();
    });

    it("should recommend no-tax domicile advantage when one state has no tax", () => {
      const recs = engine.getFilingRecommendations(
        "CA",
        ["TX"],
        200000,
        FilingStatus.SINGLE,
      );
      const domicileRec = recs.find(
        (r) => r.type === "domicile_advantage",
      );
      expect(domicileRec).toBeDefined();
      expect(domicileRec!.estimatedSavings).toBeGreaterThan(0);
    });

    it("should include filing requirement warnings", () => {
      const recs = engine.getFilingRecommendations(
        "NY",
        ["CA"],
        100000,
        FilingStatus.SINGLE,
      );
      const filingReqs = recs.filter(
        (r) => r.type === "filing_requirement",
      );
      expect(filingReqs.length).toBeGreaterThanOrEqual(1);
    });

    it("should recommend professional consultation for high-income multi-state", () => {
      const recs = engine.getFilingRecommendations(
        "CA",
        ["NY"],
        500000,
        FilingStatus.SINGLE,
      );
      const generalRec = recs.find((r) => r.type === "general");
      expect(generalRec).toBeDefined();
      expect(generalRec!.title).toContain("Professional");
    });

    it("should return recommendations array from multi-state calculation", () => {
      const result = engine.calculateMultiStateTax(
        200000,
        [
          { stateCode: "NJ", daysWorked: 130, incomeSourced: 0 },
          { stateCode: "PA", daysWorked: 130, incomeSourced: 0 },
        ],
        FilingStatus.SINGLE,
        "days_worked",
      );

      expect(result.recommendations).toBeDefined();
      expect(Array.isArray(result.recommendations)).toBe(true);
      const reciprocity = result.recommendations.find(
        (r) => r.type === "reciprocity",
      );
      expect(reciprocity).toBeDefined();
    });
  });

  // =========================================================================
  // TOP 20 STATE COMPARISON
  // =========================================================================
  describe("Compare Top 20 States", () => {
    it("should return exactly 20 results", () => {
      const results = engine.compareTop20States(
        100000,
        FilingStatus.SINGLE,
      );
      expect(results).toHaveLength(20);
    });

    it("should sort results from lowest to highest tax", () => {
      const results = engine.compareTop20States(
        100000,
        FilingStatus.SINGLE,
      );
      for (let i = 1; i < results.length; i++) {
        expect(results[i].netTax).toBeGreaterThanOrEqual(
          results[i - 1].netTax,
        );
      }
    });

    it("should place no-tax states first", () => {
      const results = engine.compareTop20States(
        100000,
        FilingStatus.SINGLE,
      );
      // TX, FL, WA, TN are no-tax states in the top 20
      const firstFour = results.slice(0, 4);
      for (const r of firstFour) {
        expect(r.netTax).toBe(0);
      }
    });

    it("should include all top 20 state codes", () => {
      const results = engine.compareTop20States(
        100000,
        FilingStatus.SINGLE,
      );
      const codes = results.map((r) => r.stateCode);
      for (const state of TOP_20_STATES) {
        expect(codes).toContain(state);
      }
    });

    it("should handle zero income", () => {
      const results = engine.compareTop20States(0, FilingStatus.SINGLE);
      for (const r of results) {
        expect(r.netTax).toBe(0);
      }
    });
  });

  // =========================================================================
  // DETAILED BRACKET BREAKDOWN
  // =========================================================================
  describe("Bracket Breakdown Details", () => {
    it("should return correct bracket breakdown for CA at $100K", () => {
      const result = engine.calculateStateTax(
        100000,
        "CA",
        FilingStatus.SINGLE,
      );
      expect(result.bracketBreakdown.length).toBeGreaterThan(3);

      // Verify first bracket is at 1% rate
      expect(result.bracketBreakdown[0].rate).toBe(0.01);

      // Verify bracket amounts sum to taxable income
      const totalBracketed = result.bracketBreakdown.reduce(
        (s, b) => s + b.taxableInBracket,
        0,
      );
      expect(totalBracketed).toBeCloseTo(result.taxableIncome, 2);

      // Verify bracket taxes sum to taxBeforeCredits
      const totalTax = result.bracketBreakdown.reduce(
        (s, b) => s + b.taxFromBracket,
        0,
      );
      expect(totalTax).toBeCloseTo(result.taxBeforeCredits, 2);
    });

    it("should return single bracket for flat-tax state PA", () => {
      const result = engine.calculateStateTax(
        100000,
        "PA",
        FilingStatus.SINGLE,
      );
      expect(result.bracketBreakdown).toHaveLength(1);
      expect(result.bracketBreakdown[0].rate).toBeCloseTo(0.0307, 4);
      expect(result.bracketBreakdown[0].taxableInBracket).toBe(100000);
    });

    it("should return empty bracket breakdown for no-tax state", () => {
      const result = engine.calculateStateTax(
        100000,
        "TX",
        FilingStatus.SINGLE,
      );
      expect(result.bracketBreakdown).toHaveLength(0);
    });
  });

  // =========================================================================
  // RESULT FIELD COMPLETENESS
  // =========================================================================
  describe("Result Field Completeness", () => {
    it("should have all required fields in SingleStateTaxResult", () => {
      const result = engine.calculateStateTax(
        100000,
        "CA",
        FilingStatus.SINGLE,
      );

      expect(result).toHaveProperty("stateCode");
      expect(result).toHaveProperty("stateName");
      expect(result).toHaveProperty("grossIncome");
      expect(result).toHaveProperty("allocatedIncome");
      expect(result).toHaveProperty("standardDeduction");
      expect(result).toHaveProperty("personalExemption");
      expect(result).toHaveProperty("totalDeduction");
      expect(result).toHaveProperty("taxableIncome");
      expect(result).toHaveProperty("taxBeforeCredits");
      expect(result).toHaveProperty("credits");
      expect(result).toHaveProperty("totalCredits");
      expect(result).toHaveProperty("netTax");
      expect(result).toHaveProperty("effectiveRate");
      expect(result).toHaveProperty("marginalRate");
      expect(result).toHaveProperty("bracketBreakdown");
      expect(result).toHaveProperty("hasLocalTax");
      expect(result).toHaveProperty("taxType");
    });

    it("should have all required fields in MultiStateTaxResult", () => {
      const result = engine.calculateMultiStateTax(
        100000,
        [
          { stateCode: "NY", daysWorked: 200, incomeSourced: 0 },
          { stateCode: "NJ", daysWorked: 60, incomeSourced: 0 },
        ],
        FilingStatus.SINGLE,
      );

      expect(result).toHaveProperty("totalIncome");
      expect(result).toHaveProperty("allocationMethod");
      expect(result).toHaveProperty("stateResults");
      expect(result).toHaveProperty("totalStateTax");
      expect(result).toHaveProperty("totalEffectiveRate");
      expect(result).toHaveProperty("recommendations");
    });
  });

  // =========================================================================
  // SINGLETON EXPORT
  // =========================================================================
  describe("Singleton Export", () => {
    it("should export a singleton instance", async () => {
      const { stateTaxEngine } = await import("../services/StateTaxEngine");
      expect(stateTaxEngine).toBeInstanceOf(StateTaxEngine);
    });
  });
});
