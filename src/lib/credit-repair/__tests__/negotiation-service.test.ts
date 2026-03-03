/**
 * Tests for NegotiationService
 *
 * Pure logic service -- no external mocks needed.
 * Tests cover: goodwill letters, negotiation scripts, settlement calculation,
 * pay-for-delete agreements, validation letters, and edge cases.
 *
 * Note: NegotiationUserInfo is NOT exported from negotiation-service.ts,
 * so we inline the type shape here.
 */

import { negotiationService } from "../negotiation-service";

// ============================================================================
// HELPERS
// ============================================================================

const defaultUser = {
  name: "John Doe",
  address: "123 Main St",
  city: "Springfield",
  state: "IL",
  zip: "62701",
  email: "john@example.com",
};

const minimalUser = {
  name: "Jane Smith",
};

// ============================================================================
// TESTS
// ============================================================================

describe("NegotiationService", () => {
  // --------------------------------------------------------------------------
  // generateGoodwillLetter
  // --------------------------------------------------------------------------

  describe("generateGoodwillLetter", () => {
    it("should generate a goodwill letter with all required fields", async () => {
      const result = await negotiationService.generateGoodwillLetter(
        "acc-123",
        "Chase Bank",
        new Date("2024-06-15"),
        "I experienced a temporary financial hardship due to a medical emergency.",
        defaultUser,
      );

      expect(result).toBeDefined();
      expect(result.letter).toBeDefined();
      expect(typeof result.letter).toBe("string");
      expect(result.letter.length).toBeGreaterThan(0);
    });

    it("should include subject line", async () => {
      const result = await negotiationService.generateGoodwillLetter(
        "acc-123",
        "Chase Bank",
        new Date("2024-06-15"),
        "Hardship reason",
        defaultUser,
      );

      expect(result.subject).toBeDefined();
      expect(typeof result.subject).toBe("string");
      expect(result.subject!.length).toBeGreaterThan(0);
    });

    it("should include tips", async () => {
      const result = await negotiationService.generateGoodwillLetter(
        "acc-123",
        "Chase Bank",
        new Date("2024-06-15"),
        "Hardship reason",
        defaultUser,
      );

      expect(result.tips).toBeDefined();
      expect(Array.isArray(result.tips)).toBe(true);
      expect(result.tips.length).toBeGreaterThan(0);
    });

    it("should set followUpDate approximately 21 days from now", async () => {
      const result = await negotiationService.generateGoodwillLetter(
        "acc-123",
        "Chase Bank",
        new Date("2024-06-15"),
        "Hardship reason",
        defaultUser,
      );

      expect(result.followUpDate).toBeDefined();
      const now = new Date();
      const followUp = new Date(result.followUpDate!);
      const diffDays = Math.round(
        (followUp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );
      expect(diffDays).toBeGreaterThanOrEqual(19);
      expect(diffDays).toBeLessThanOrEqual(23);
    });

    it("should work with minimal user info", async () => {
      const result = await negotiationService.generateGoodwillLetter(
        "acc-123",
        "Chase Bank",
        new Date("2024-06-15"),
        "Hardship reason",
        minimalUser,
      );

      expect(result.letter).toBeDefined();
    });

    it("should include account ID in subject", async () => {
      const result = await negotiationService.generateGoodwillLetter(
        "acc-XYZ-999",
        "Chase Bank",
        new Date("2024-06-15"),
        "Hardship reason",
        defaultUser,
      );

      expect(result.subject).toContain("acc-XYZ-999");
    });
  });

  // --------------------------------------------------------------------------
  // generateNegotiationScript
  // --------------------------------------------------------------------------

  describe("generateNegotiationScript", () => {
    it("should generate phone, email, and letter scripts", async () => {
      const result = await negotiationService.generateNegotiationScript(
        "col-123",
        "ABC Collections",
        "Original Bank",
        5000,
        4500,
        defaultUser,
      );

      expect(result).toBeDefined();
      expect(result.phoneScript).toBeDefined();
      expect(result.emailScript).toBeDefined();
      expect(result.letterScript).toBeDefined();
    });

    it("should include settlement amount in scripts", async () => {
      const result = await negotiationService.generateNegotiationScript(
        "col-123",
        "ABC Collections",
        "Original Bank",
        5000,
        4500,
        defaultUser,
      );

      // 40% of 4500 = 1800, formatted as 1800.00
      const scripts =
        result.phoneScript + result.emailScript + result.letterScript;
      expect(scripts).toContain("1800.00");
    });

    it("should include collection agency name", async () => {
      const result = await negotiationService.generateNegotiationScript(
        "col-123",
        "UniqueAgency999",
        "Original Bank",
        5000,
        4500,
        defaultUser,
      );

      const scripts =
        result.phoneScript + result.emailScript + result.letterScript;
      expect(scripts).toContain("UniqueAgency999");
    });

    it("should include user info in scripts", async () => {
      const result = await negotiationService.generateNegotiationScript(
        "col-123",
        "ABC Collections",
        "Original Bank",
        5000,
        4500,
        defaultUser,
      );

      const scripts =
        result.phoneScript + result.emailScript + result.letterScript;
      expect(scripts).toContain("John Doe");
    });

    it("should work with minimal user info", async () => {
      const result = await negotiationService.generateNegotiationScript(
        "col-123",
        "ABC Collections",
        "Original Bank",
        5000,
        4500,
        minimalUser,
      );

      expect(result.phoneScript).toBeDefined();
      expect(result.phoneScript.length).toBeGreaterThan(0);
    });

    it("should include original creditor in scripts", async () => {
      const result = await negotiationService.generateNegotiationScript(
        "col-123",
        "ABC Collections",
        "SpecialOriginalBank",
        5000,
        4500,
        defaultUser,
      );

      const scripts =
        result.phoneScript + result.emailScript + result.letterScript;
      expect(scripts).toContain("SpecialOriginalBank");
    });
  });

  // --------------------------------------------------------------------------
  // calculateSettlement
  // --------------------------------------------------------------------------

  describe("calculateSettlement", () => {
    it("should calculate settlement at default 40%", () => {
      const result = negotiationService.calculateSettlement(10000);
      expect(result.settlementAmount).toBe(4000);
      expect(result.percentage).toBe(40);
      expect(result.savings).toBe(6000);
    });

    it("should calculate settlement at custom percentage", () => {
      const result = negotiationService.calculateSettlement(10000, 25);
      expect(result.settlementAmount).toBe(2500);
      expect(result.percentage).toBe(25);
      expect(result.savings).toBe(7500);
    });

    it("should handle zero balance", () => {
      const result = negotiationService.calculateSettlement(0);
      expect(result.settlementAmount).toBe(0);
      expect(result.savings).toBe(0);
    });

    it("should handle 100% percentage", () => {
      const result = negotiationService.calculateSettlement(5000, 100);
      expect(result.settlementAmount).toBe(5000);
      expect(result.savings).toBe(0);
    });

    it("should use Math.round for small balances", () => {
      // Math.round(1 * 0.5) = Math.round(0.5) = 1
      const result = negotiationService.calculateSettlement(1, 50);
      expect(result.settlementAmount).toBe(Math.round(1 * (50 / 100)));
      expect(result.savings).toBe(1 - Math.round(1 * (50 / 100)));
    });

    it("should handle large balances", () => {
      const result = negotiationService.calculateSettlement(1000000, 30);
      expect(result.settlementAmount).toBe(300000);
      expect(result.savings).toBe(700000);
    });
  });

  // --------------------------------------------------------------------------
  // generatePayForDeleteAgreement
  // --------------------------------------------------------------------------

  describe("generatePayForDeleteAgreement", () => {
    it("should generate a pay-for-delete agreement", async () => {
      const result = await negotiationService.generatePayForDeleteAgreement(
        "ABC Collections",
        "ACC-12345",
        2000,
        defaultUser,
      );

      expect(result).toBeDefined();
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(100);
    });

    it("should include collection agency name", async () => {
      const result = await negotiationService.generatePayForDeleteAgreement(
        "UniqueAgency456",
        "ACC-12345",
        2000,
        defaultUser,
      );

      expect(result).toContain("UniqueAgency456");
    });

    it("should include account number", async () => {
      const result = await negotiationService.generatePayForDeleteAgreement(
        "ABC Collections",
        "UNIQUE-ACC-789",
        2000,
        defaultUser,
      );

      expect(result).toContain("UNIQUE-ACC-789");
    });

    it("should include settlement amount formatted with toFixed(2)", async () => {
      const result = await negotiationService.generatePayForDeleteAgreement(
        "ABC Collections",
        "ACC-12345",
        2500,
        defaultUser,
      );

      expect(result).toContain("2500.00");
    });

    it("should include user name", async () => {
      const result = await negotiationService.generatePayForDeleteAgreement(
        "ABC Collections",
        "ACC-12345",
        2000,
        defaultUser,
      );

      expect(result).toContain("John Doe");
    });

    it("should work with minimal user info", async () => {
      const result = await negotiationService.generatePayForDeleteAgreement(
        "ABC Collections",
        "ACC-12345",
        2000,
        minimalUser,
      );

      expect(result).toBeDefined();
      expect(result).toContain("Jane Smith");
    });
  });

  // --------------------------------------------------------------------------
  // generateValidationLetter
  // --------------------------------------------------------------------------

  describe("generateValidationLetter", () => {
    it("should generate a validation letter", async () => {
      const result = await negotiationService.generateValidationLetter(
        "ABC Collections",
        "ACC-12345",
        defaultUser,
      );

      expect(result).toBeDefined();
      expect(result.letter).toBeDefined();
      expect(typeof result.letter).toBe("string");
      expect(result.letter.length).toBeGreaterThan(100);
    });

    it("should include FDCPA references", async () => {
      const result = await negotiationService.generateValidationLetter(
        "ABC Collections",
        "ACC-12345",
        defaultUser,
      );

      // FDCPA or Fair Debt Collection Practices Act
      const letter = result.letter.toLowerCase();
      expect(
        letter.includes("fdcpa") ||
          letter.includes("fair debt collection") ||
          letter.includes("validation"),
      ).toBe(true);
    });

    it("should include collection agency name", async () => {
      const result = await negotiationService.generateValidationLetter(
        "UniqueCollectorXYZ",
        "ACC-12345",
        defaultUser,
      );

      expect(result.letter).toContain("UniqueCollectorXYZ");
    });

    it("should include tips", async () => {
      const result = await negotiationService.generateValidationLetter(
        "ABC Collections",
        "ACC-12345",
        defaultUser,
      );

      expect(result.tips).toBeDefined();
      expect(Array.isArray(result.tips)).toBe(true);
      expect(result.tips.length).toBeGreaterThan(0);
    });

    it("should set followUpDate approximately 30 days from now", async () => {
      const result = await negotiationService.generateValidationLetter(
        "ABC Collections",
        "ACC-12345",
        defaultUser,
      );

      expect(result.followUpDate).toBeDefined();
      const now = new Date();
      const followUp = new Date(result.followUpDate!);
      const diffDays = Math.round(
        (followUp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );
      expect(diffDays).toBeGreaterThanOrEqual(28);
      expect(diffDays).toBeLessThanOrEqual(32);
    });

    it("should work with minimal user info", async () => {
      const result = await negotiationService.generateValidationLetter(
        "ABC Collections",
        "ACC-12345",
        minimalUser,
      );

      expect(result.letter).toBeDefined();
      expect(result.letter).toContain("Jane Smith");
    });
  });
});
