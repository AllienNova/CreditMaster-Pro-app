/**
 * Compliance Checker Tests
 *
 * Tests for FTC/CFPB compliance checking, disclosure generation,
 * advertising copy validation, and audit/dashboard services.
 */

import {
  ComplianceChecker,
  RevenueDashboardService,
  complianceChecker,
  revenueDashboardService,
} from "../compliance-checker";
import type {
  ComplianceContext,
  ComplianceRule,
  ComplianceReport,
  AuditEntry,
} from "../compliance-checker";

// =============================================================================
// Test Helpers
// =============================================================================

function createContext(
  overrides: {
    product?: Partial<ComplianceContext["product"]>;
    content?: Partial<ComplianceContext["content"]>;
    placement?: Partial<ComplianceContext["placement"]>;
  } = {},
): ComplianceContext {
  return {
    product: {
      category: "credit_card",
      hasApr: false,
      hasAnnualFee: false,
      hasRewards: false,
      hasSignupBonus: false,
      isSponsored: false,
      affiliateCompensated: false,
      ...overrides.product,
    },
    content: {
      text: "Check out this great credit card with low rates.",
      hasDisclosure: false,
      disclosurePosition: undefined,
      hasRateDisclosure: false,
      hasCompensationDisclosure: false,
      hasMaterialConnectionDisclosure: false,
      hasTestimonial: false,
      testimonialSubstantiated: false,
      ...overrides.content,
    },
    placement: {
      pageType: "listing",
      isAboveTheFold: true,
      prominenceLevel: "standard",
      ...overrides.placement,
    },
  };
}

// =============================================================================
// ComplianceChecker Tests
// =============================================================================

describe("ComplianceChecker", () => {
  // ===========================================================================
  // Basic check() Behavior
  // ===========================================================================

  describe("check", () => {
    it("should pass with no violations when context is fully compliant", () => {
      const ctx = createContext({
        product: { affiliateCompensated: false, isSponsored: false },
        content: {
          text: "A simple informational article about budgeting tips.",
          hasTestimonial: false,
        },
        placement: { pageType: "article" },
      });

      const report = complianceChecker.check(ctx);

      expect(report.passed).toBe(true);
      expect(report.violations).toHaveLength(0);
      expect(report.checkedRules).toBeGreaterThan(0);
      expect(report.timestamp).toBeInstanceOf(Date);
      expect(report.context).toBe(ctx);
    });

    it("should detect missing material connection disclosure for affiliate content", () => {
      const ctx = createContext({
        product: { affiliateCompensated: true },
        content: { hasMaterialConnectionDisclosure: false },
      });

      const report = complianceChecker.check(ctx);

      expect(report.passed).toBe(false);
      const violation = report.violations.find((v) => v.ruleId === "FTC-001");
      expect(violation).toBeDefined();
      expect(violation?.severity).toBe("critical");
      expect(violation?.cfrReference).toBe("16 CFR \u00A7 255.5");
    });

    it("should pass when affiliate content has material connection disclosure", () => {
      const ctx = createContext({
        product: { affiliateCompensated: true },
        content: {
          hasMaterialConnectionDisclosure: true,
          hasDisclosure: true,
          disclosurePosition: "before_content",
        },
        placement: { prominenceLevel: "prominent" },
      });

      const report = complianceChecker.check(ctx);

      const ftc001 = report.violations.find((v) => v.ruleId === "FTC-001");
      expect(ftc001).toBeUndefined();
    });

    it("should flag disclosure in wrong position (footnote) for affiliate content", () => {
      const ctx = createContext({
        product: { affiliateCompensated: true },
        content: {
          hasMaterialConnectionDisclosure: true,
          hasDisclosure: true,
          disclosurePosition: "footnote",
        },
      });

      const report = complianceChecker.check(ctx);

      const violation = report.violations.find((v) => v.ruleId === "FTC-003");
      expect(violation).toBeDefined();
      expect(violation?.severity).toBe("high");
      expect(violation?.message).toContain("footnote");
    });

    it("should flag disclosure in after_content position for affiliate content", () => {
      const ctx = createContext({
        product: { affiliateCompensated: true },
        content: {
          hasMaterialConnectionDisclosure: true,
          hasDisclosure: true,
          disclosurePosition: "after_content",
        },
      });

      const report = complianceChecker.check(ctx);

      const violation = report.violations.find((v) => v.ruleId === "FTC-003");
      expect(violation).toBeDefined();
      expect(violation?.recommendation).toContain("top of the content");
    });

    it("should detect missing APR disclosure for credit product", () => {
      const ctx = createContext({
        product: { category: "credit_card", hasApr: true },
        content: { hasRateDisclosure: false },
      });

      const report = complianceChecker.check(ctx);

      const violation = report.violations.find(
        (v) => v.ruleId === "CFPB-001",
      );
      expect(violation).toBeDefined();
      expect(violation?.severity).toBe("critical");
      expect(violation?.cfrReference).toBe("12 CFR \u00A7 1026.24");
    });

    it("should pass when credit product has rate disclosure", () => {
      const ctx = createContext({
        product: { category: "credit_card", hasApr: true },
        content: { hasRateDisclosure: true },
      });

      const report = complianceChecker.check(ctx);

      const cfpb001 = report.violations.find((v) => v.ruleId === "CFPB-001");
      expect(cfpb001).toBeUndefined();
    });

    it("should detect missing annual fee disclosure", () => {
      const ctx = createContext({
        product: { category: "personal_loan", hasAnnualFee: true },
        content: { text: "Great personal loan with competitive rates!" },
      });

      const report = complianceChecker.check(ctx);

      const violation = report.violations.find(
        (v) => v.ruleId === "CFPB-002",
      );
      expect(violation).toBeDefined();
      expect(violation?.severity).toBe("high");
    });

    it("should pass when annual fee is mentioned in text", () => {
      const ctx = createContext({
        product: { category: "credit_card", hasAnnualFee: true },
        content: {
          text: "Great card with $95 annual fee and 3x rewards on dining.",
        },
      });

      const report = complianceChecker.check(ctx);

      const cfpb002 = report.violations.find((v) => v.ruleId === "CFPB-002");
      expect(cfpb002).toBeUndefined();
    });

    it("should detect unsubstantiated testimonial", () => {
      const ctx = createContext({
        content: {
          hasTestimonial: true,
          testimonialSubstantiated: false,
        },
      });

      const report = complianceChecker.check(ctx);

      const violation = report.violations.find((v) => v.ruleId === "FTC-004");
      expect(violation).toBeDefined();
      expect(violation?.severity).toBe("high");
      expect(violation?.cfrReference).toBe("16 CFR \u00A7 255.2");
    });

    it("should pass when testimonial is substantiated", () => {
      const ctx = createContext({
        content: {
          hasTestimonial: true,
          testimonialSubstantiated: true,
        },
      });

      const report = complianceChecker.check(ctx);

      const ftc004 = report.violations.find((v) => v.ruleId === "FTC-004");
      expect(ftc004).toBeUndefined();
    });

    it("should detect sponsored content without compensation disclosure", () => {
      const ctx = createContext({
        product: { isSponsored: true },
        content: { hasCompensationDisclosure: false },
      });

      const report = complianceChecker.check(ctx);

      const violation = report.violations.find((v) => v.ruleId === "FTC-005");
      expect(violation).toBeDefined();
      expect(violation?.severity).toBe("critical");
    });

    it("should pass when sponsored content has compensation disclosure", () => {
      const ctx = createContext({
        product: { isSponsored: true },
        content: { hasCompensationDisclosure: true },
      });

      const report = complianceChecker.check(ctx);

      const ftc005 = report.violations.find((v) => v.ruleId === "FTC-005");
      expect(ftc005).toBeUndefined();
    });

    it("should flag minimal prominence for affiliate disclosures", () => {
      const ctx = createContext({
        product: { affiliateCompensated: true },
        content: { hasMaterialConnectionDisclosure: true },
        placement: { prominenceLevel: "minimal" },
      });

      const report = complianceChecker.check(ctx);

      const violation = report.violations.find((v) => v.ruleId === "FTC-002");
      expect(violation).toBeDefined();
      expect(violation?.severity).toBe("high");
    });

    it("should detect misleading claims in advertising copy", () => {
      const ctx = createContext({
        content: { text: "Guaranteed approval for everyone! Apply now." },
      });

      const report = complianceChecker.check(ctx);

      const violation = report.violations.find((v) => v.ruleId === "ADV-001");
      expect(violation).toBeDefined();
      expect(violation?.message).toContain("guaranteed approval");
    });

    it("should detect trigger terms without rate disclosure for credit products", () => {
      const ctx = createContext({
        product: { category: "credit_card" },
        content: {
          text: "Get this card at 14.99% APR with $0 down payment!",
          hasRateDisclosure: false,
        },
      });

      const report = complianceChecker.check(ctx);

      const violation = report.violations.find(
        (v) => v.ruleId === "TILA-001",
      );
      expect(violation).toBeDefined();
      expect(violation?.severity).toBe("critical");
      expect(violation?.cfrReference).toBe("12 CFR \u00A7 1026.24(d)(1)");
    });

    it("should not flag trigger terms for non-credit products", () => {
      const ctx = createContext({
        product: { category: "insurance" },
        content: {
          text: "Save $200 per month on your premium!",
          hasRateDisclosure: false,
        },
      });

      const report = complianceChecker.check(ctx);

      const tila001 = report.violations.find((v) => v.ruleId === "TILA-001");
      expect(tila001).toBeUndefined();
    });

    it("should flag pre-approved language on comparison pages", () => {
      const ctx = createContext({
        content: {
          text: "You are pre-approved for this credit card offer.",
        },
        placement: { pageType: "comparison" },
      });

      const report = complianceChecker.check(ctx);

      const warning = report.warnings.find((v) => v.ruleId === "CFPB-003");
      expect(warning).toBeDefined();
      expect(warning?.severity).toBe("medium");
    });

    it("should not flag pre-qualified language on comparison pages", () => {
      const ctx = createContext({
        content: {
          text: "You may be pre-qualified for this offer.",
        },
        placement: { pageType: "comparison" },
      });

      const report = complianceChecker.check(ctx);

      const cfpb003 = report.warnings.find((v) => v.ruleId === "CFPB-003");
      expect(cfpb003).toBeUndefined();
    });

    it("should flag email without unsubscribe mechanism", () => {
      const ctx = createContext({
        content: { text: "Check out these amazing financial products!" },
        placement: { pageType: "email" },
      });

      const report = complianceChecker.check(ctx);

      const warning = report.warnings.find((v) => v.ruleId === "ADV-002");
      expect(warning).toBeDefined();
      expect(warning?.severity).toBe("medium");
    });

    it("should pass email with unsubscribe link", () => {
      const ctx = createContext({
        content: {
          text: "Check out these products! To unsubscribe, click here.",
        },
        placement: { pageType: "email" },
      });

      const report = complianceChecker.check(ctx);

      const adv002 = report.warnings.find((v) => v.ruleId === "ADV-002");
      expect(adv002).toBeUndefined();
    });

    it("should detect multiple violations in a single check", () => {
      const ctx = createContext({
        product: {
          category: "credit_card",
          affiliateCompensated: true,
          isSponsored: true,
          hasApr: true,
          hasAnnualFee: true,
        },
        content: {
          text: "Guaranteed approval! Get this card at 14.99% APR!",
          hasMaterialConnectionDisclosure: false,
          hasCompensationDisclosure: false,
          hasRateDisclosure: false,
          hasTestimonial: true,
          testimonialSubstantiated: false,
        },
      });

      const report = complianceChecker.check(ctx);

      expect(report.passed).toBe(false);
      expect(report.violations.length).toBeGreaterThanOrEqual(4);
    });

    it("should separate violations (critical/high) from warnings (medium/low)", () => {
      const ctx = createContext({
        content: {
          text: "You are pre-approved! Click to unsubscribe.",
        },
        placement: { pageType: "comparison" },
      });

      const report = complianceChecker.check(ctx);

      // pre-approved on comparison page is medium => warning
      for (const w of report.warnings) {
        expect(["medium", "low"]).toContain(w.severity);
      }
      for (const v of report.violations) {
        expect(["critical", "high"]).toContain(v.severity);
      }
    });
  });

  // ===========================================================================
  // addRule
  // ===========================================================================

  describe("addRule", () => {
    it("should add and enforce a custom rule", () => {
      const checker = new ComplianceChecker();
      const customRule: ComplianceRule = {
        ruleId: "CUSTOM-001",
        regulation: "FTC",
        category: "advertising",
        description: "Custom test rule",
        severity: "critical",
        check: (ctx: ComplianceContext) => {
          if (ctx.content.text.includes("forbidden-word")) {
            return {
              ruleId: "CUSTOM-001",
              regulation: "FTC",
              severity: "critical",
              message: "Forbidden word detected",
              recommendation: "Remove the forbidden word.",
            };
          }
          return null;
        },
      };

      checker.addRule(customRule);

      const ctx = createContext({
        content: { text: "This text has forbidden-word in it." },
      });
      const report = checker.check(ctx);

      const violation = report.violations.find(
        (v) => v.ruleId === "CUSTOM-001",
      );
      expect(violation).toBeDefined();
      expect(violation?.message).toBe("Forbidden word detected");
    });

    it("should include custom rules in rule count", () => {
      const checker = new ComplianceChecker();
      const initialCount = checker.getRules().length;

      checker.addRule({
        ruleId: "CUSTOM-002",
        regulation: "CFPB",
        category: "disclosure",
        description: "Test",
        severity: "low",
        check: () => null,
      });

      expect(checker.getRules().length).toBe(initialCount + 1);
    });
  });

  // ===========================================================================
  // getRequiredDisclosures
  // ===========================================================================

  describe("getRequiredDisclosures", () => {
    it("should return disclosures for credit card products", () => {
      const disclosures = complianceChecker.getRequiredDisclosures({
        category: "credit_card",
        hasApr: true,
        affiliateCompensated: true,
      });

      expect(disclosures.length).toBeGreaterThan(0);
      expect(
        disclosures.some((d) => d.includes("APR")),
      ).toBe(true);
      expect(
        disclosures.some((d) => d.includes("Material connection")),
      ).toBe(true);
      expect(
        disclosures.some((d) => d.includes("Regulation Z")),
      ).toBe(true);
    });

    it("should return disclosures for personal loan products", () => {
      const disclosures = complianceChecker.getRequiredDisclosures({
        category: "personal_loan",
        hasApr: true,
      });

      expect(disclosures.length).toBeGreaterThan(0);
      expect(
        disclosures.some((d) => d.includes("APR")),
      ).toBe(true);
      expect(
        disclosures.some((d) =>
          d.toLowerCase().includes("origination fee"),
        ),
      ).toBe(true);
    });

    it("should return disclosures for insurance products", () => {
      const disclosures = complianceChecker.getRequiredDisclosures({
        category: "insurance",
      });

      expect(disclosures.length).toBeGreaterThan(0);
      expect(
        disclosures.some((d) => d.toLowerCase().includes("coverage")),
      ).toBe(true);
    });

    it("should include sponsored content disclosure", () => {
      const disclosures = complianceChecker.getRequiredDisclosures({
        category: "savings",
        isSponsored: true,
      });

      expect(
        disclosures.some((d) => d.includes("Sponsored")),
      ).toBe(true);
    });

    it("should return disclosures for investment products", () => {
      const disclosures = complianceChecker.getRequiredDisclosures({
        category: "investment",
      });

      expect(
        disclosures.some((d) => d.includes("risk of loss")),
      ).toBe(true);
      expect(
        disclosures.some((d) => d.includes("FDIC")),
      ).toBe(true);
    });

    it("should return empty array for unknown category without affiliate flags", () => {
      const disclosures = complianceChecker.getRequiredDisclosures({
        category: "unknown_product_type",
      });

      expect(disclosures).toHaveLength(0);
    });
  });

  // ===========================================================================
  // generateDisclosureText
  // ===========================================================================

  describe("generateDisclosureText", () => {
    it("should generate disclosure text for affiliate-compensated credit product", () => {
      const text = complianceChecker.generateDisclosureText({
        category: "credit_card",
        affiliateCompensated: true,
        hasRewards: true,
      });

      expect(text).toContain("Advertiser Disclosure");
      expect(text).toContain("compensation");
      expect(text).toContain("Rate Disclosure");
      expect(text).toContain("terms and conditions");
    });

    it("should include sponsored content label", () => {
      const text = complianceChecker.generateDisclosureText({
        category: "savings",
        isSponsored: true,
      });

      expect(text).toContain("Sponsored Content");
    });

    it("should include investment disclaimer for investment products", () => {
      const text = complianceChecker.generateDisclosureText({
        category: "investment",
      });

      expect(text).toContain("risk");
      expect(text).toContain("FDIC");
    });

    it("should include rewards disclaimer when applicable", () => {
      const text = complianceChecker.generateDisclosureText({
        category: "credit_card",
        hasRewards: true,
        hasSignupBonus: true,
      });

      expect(text).toContain("Rewards and sign-up bonuses");
    });

    it("should return generic text for product with no special features", () => {
      const text = complianceChecker.generateDisclosureText({
        category: "unknown_type",
      });

      expect(text).toContain("Please review all terms");
    });
  });

  // ===========================================================================
  // validateAdvertisingCopy
  // ===========================================================================

  describe("validateAdvertisingCopy", () => {
    it("should return no violations for clean advertising copy", () => {
      const violations = complianceChecker.validateAdvertisingCopy(
        "Compare top credit cards and find the best rates for your financial needs.",
        { category: "credit_card" },
      );

      expect(violations).toHaveLength(0);
    });

    it("should detect guaranteed approval claim", () => {
      const violations = complianceChecker.validateAdvertisingCopy(
        "Guaranteed approval for all applicants!",
        { category: "credit_card" },
      );

      expect(violations.length).toBeGreaterThan(0);
      expect(violations[0].message).toContain("guaranteed approval");
    });

    it("should detect no credit check claim", () => {
      const violations = complianceChecker.validateAdvertisingCopy(
        "Apply now with no credit check required.",
        { category: "personal_loan" },
      );

      expect(violations.length).toBeGreaterThan(0);
      expect(violations[0].message).toContain("no credit check");
    });

    it("should detect instant approval claim", () => {
      const violations = complianceChecker.validateAdvertisingCopy(
        "Get instant approval today!",
        { category: "credit_card" },
      );

      expect(violations.length).toBeGreaterThan(0);
      expect(violations[0].message).toContain("instant approval");
    });

    it("should detect risk-free claim", () => {
      const violations = complianceChecker.validateAdvertisingCopy(
        "Try our risk-free investment strategy.",
        { category: "investment" },
      );

      expect(violations.length).toBeGreaterThan(0);
      expect(violations[0].message).toContain("risk-free");
    });

    it("should detect trigger terms without full disclosure for credit products", () => {
      const violations = complianceChecker.validateAdvertisingCopy(
        "Get 14.99% APR on your new credit card today!",
        { category: "credit_card" },
      );

      const tilaViolation = violations.find((v) => v.ruleId === "TILA-001");
      expect(tilaViolation).toBeDefined();
      expect(tilaViolation?.severity).toBe("critical");
    });

    it("should not flag trigger terms when full disclosure is present", () => {
      const violations = complianceChecker.validateAdvertisingCopy(
        "Get 14.99% APR on your new credit card. APR ranges from 14.99% to 24.99% variable. Repayment terms of 12 to 60 months.",
        { category: "credit_card" },
      );

      const tilaViolation = violations.find((v) => v.ruleId === "TILA-001");
      expect(tilaViolation).toBeUndefined();
    });

    it("should not flag trigger terms for non-credit products", () => {
      const violations = complianceChecker.validateAdvertisingCopy(
        "Save $200 per month on insurance premiums!",
        { category: "insurance" },
      );

      const tilaViolation = violations.find((v) => v.ruleId === "TILA-001");
      expect(tilaViolation).toBeUndefined();
    });

    it("should detect multiple misleading claims in one text", () => {
      const violations = complianceChecker.validateAdvertisingCopy(
        "Guaranteed approval! No credit check! Free money for everyone!",
        { category: "credit_card" },
      );

      expect(violations.length).toBeGreaterThanOrEqual(3);
    });
  });

  // ===========================================================================
  // Singleton Export
  // ===========================================================================

  describe("singleton export", () => {
    it("should export a functional complianceChecker singleton", () => {
      expect(complianceChecker).toBeInstanceOf(ComplianceChecker);
      expect(complianceChecker.getRules().length).toBeGreaterThan(0);
    });
  });
});

// =============================================================================
// RevenueDashboardService Tests
// =============================================================================

describe("RevenueDashboardService", () => {
  let dashboard: RevenueDashboardService;

  beforeEach(() => {
    dashboard = new RevenueDashboardService();
  });

  // ===========================================================================
  // addAuditEntry
  // ===========================================================================

  describe("addAuditEntry", () => {
    it("should add an audit entry with generated ID and timestamp", () => {
      const entry = dashboard.addAuditEntry({
        action: "product_listed",
        actor: "user_001",
        details: { productId: "prod_001" },
      });

      expect(entry.entryId).toBeDefined();
      expect(entry.entryId.length).toBeGreaterThan(0);
      expect(entry.timestamp).toBeInstanceOf(Date);
      expect(entry.action).toBe("product_listed");
      expect(entry.actor).toBe("user_001");
      expect(entry.details).toEqual({ productId: "prod_001" });
    });

    it("should generate unique IDs for each entry", () => {
      const entry1 = dashboard.addAuditEntry({
        action: "product_listed",
        actor: "user_001",
        details: {},
      });
      const entry2 = dashboard.addAuditEntry({
        action: "product_listed",
        actor: "user_001",
        details: {},
      });

      expect(entry1.entryId).not.toBe(entry2.entryId);
    });

    it("should store compliance report when provided", () => {
      const report: ComplianceReport = {
        passed: true,
        violations: [],
        warnings: [],
        checkedRules: 10,
        timestamp: new Date(),
        context: createContext(),
      };

      const entry = dashboard.addAuditEntry({
        action: "compliance_check",
        actor: "system",
        details: {},
        complianceReport: report,
      });

      expect(entry.complianceReport).toBe(report);
    });
  });

  // ===========================================================================
  // getAuditLog
  // ===========================================================================

  describe("getAuditLog", () => {
    it("should return all entries when no filter is provided", () => {
      dashboard.addAuditEntry({
        action: "product_listed",
        actor: "user_001",
        details: {},
      });
      dashboard.addAuditEntry({
        action: "disclosure_added",
        actor: "user_002",
        details: {},
      });

      const log = dashboard.getAuditLog();
      expect(log).toHaveLength(2);
    });

    it("should return entries in reverse chronological order", () => {
      dashboard.addAuditEntry({
        action: "product_listed",
        actor: "user_001",
        details: { order: 1 },
      });
      dashboard.addAuditEntry({
        action: "disclosure_added",
        actor: "user_002",
        details: { order: 2 },
      });

      const log = dashboard.getAuditLog();
      expect(
        log[0].timestamp.getTime(),
      ).toBeGreaterThanOrEqual(log[1].timestamp.getTime());
    });

    it("should filter by action", () => {
      dashboard.addAuditEntry({
        action: "product_listed",
        actor: "user_001",
        details: {},
      });
      dashboard.addAuditEntry({
        action: "disclosure_added",
        actor: "user_002",
        details: {},
      });

      const log = dashboard.getAuditLog({ action: "product_listed" });
      expect(log).toHaveLength(1);
      expect(log[0].action).toBe("product_listed");
    });

    it("should filter by actor", () => {
      dashboard.addAuditEntry({
        action: "product_listed",
        actor: "user_001",
        details: {},
      });
      dashboard.addAuditEntry({
        action: "product_listed",
        actor: "user_002",
        details: {},
      });

      const log = dashboard.getAuditLog({ actor: "user_001" });
      expect(log).toHaveLength(1);
      expect(log[0].actor).toBe("user_001");
    });

    it("should filter by date range", () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      dashboard.addAuditEntry({
        action: "product_listed",
        actor: "user_001",
        details: {},
      });

      const logInRange = dashboard.getAuditLog({
        after: yesterday,
        before: tomorrow,
      });
      expect(logInRange).toHaveLength(1);

      const logOutOfRange = dashboard.getAuditLog({
        after: tomorrow,
      });
      expect(logOutOfRange).toHaveLength(0);
    });

    it("should respect limit parameter", () => {
      for (let i = 0; i < 10; i++) {
        dashboard.addAuditEntry({
          action: "product_listed",
          actor: "user_001",
          details: { index: i },
        });
      }

      const log = dashboard.getAuditLog({ limit: 3 });
      expect(log).toHaveLength(3);
    });

    it("should return empty array when no entries match", () => {
      dashboard.addAuditEntry({
        action: "product_listed",
        actor: "user_001",
        details: {},
      });

      const log = dashboard.getAuditLog({ action: "violation_resolved" });
      expect(log).toHaveLength(0);
    });
  });

  // ===========================================================================
  // getMetrics
  // ===========================================================================

  describe("getMetrics", () => {
    it("should return zeroes for empty audit log", () => {
      const metrics = dashboard.getMetrics();

      expect(metrics.totalProducts).toBe(0);
      expect(metrics.activeProducts).toBe(0);
      expect(metrics.complianceRate).toBe(1);
      expect(metrics.openViolations).toBe(0);
      expect(metrics.resolvedViolations).toBe(0);
      expect(metrics.riskLevel).toBe("low");
    });

    it("should count products correctly", () => {
      dashboard.addAuditEntry({
        action: "product_listed",
        actor: "system",
        details: { productId: "p1" },
      });
      dashboard.addAuditEntry({
        action: "product_listed",
        actor: "system",
        details: { productId: "p2" },
      });
      dashboard.addAuditEntry({
        action: "product_removed",
        actor: "system",
        details: { productId: "p1" },
      });

      const metrics = dashboard.getMetrics();
      expect(metrics.totalProducts).toBe(2);
      expect(metrics.activeProducts).toBe(1);
    });

    it("should calculate compliance rate from check entries", () => {
      // 2 passed, 1 failed = 66% rate
      dashboard.addAuditEntry({
        action: "compliance_check",
        actor: "system",
        details: {},
        complianceReport: {
          passed: true,
          violations: [],
          warnings: [],
          checkedRules: 10,
          timestamp: new Date(),
          context: createContext(),
        },
      });
      dashboard.addAuditEntry({
        action: "compliance_check",
        actor: "system",
        details: {},
        complianceReport: {
          passed: true,
          violations: [],
          warnings: [],
          checkedRules: 10,
          timestamp: new Date(),
          context: createContext(),
        },
      });
      dashboard.addAuditEntry({
        action: "compliance_check",
        actor: "system",
        details: {},
        complianceReport: {
          passed: false,
          violations: [
            {
              ruleId: "FTC-001",
              regulation: "FTC",
              severity: "critical",
              message: "Missing disclosure",
              recommendation: "Add disclosure",
            },
          ],
          warnings: [],
          checkedRules: 10,
          timestamp: new Date(),
          context: createContext(),
        },
      });

      const metrics = dashboard.getMetrics();
      expect(metrics.complianceRate).toBeCloseTo(0.67, 1);
    });

    it("should track open and resolved violations", () => {
      dashboard.addAuditEntry({
        action: "compliance_check",
        actor: "system",
        details: {},
        complianceReport: {
          passed: false,
          violations: [
            {
              ruleId: "FTC-001",
              regulation: "FTC",
              severity: "critical",
              message: "Missing",
              recommendation: "Fix",
            },
            {
              ruleId: "CFPB-001",
              regulation: "CFPB",
              severity: "critical",
              message: "Missing",
              recommendation: "Fix",
            },
          ],
          warnings: [],
          checkedRules: 10,
          timestamp: new Date(),
          context: createContext(),
        },
      });
      dashboard.addAuditEntry({
        action: "violation_resolved",
        actor: "user_001",
        details: { ruleId: "FTC-001" },
      });

      const metrics = dashboard.getMetrics();
      expect(metrics.resolvedViolations).toBe(1);
      expect(metrics.openViolations).toBe(1);
    });

    it("should set risk level based on open violations", () => {
      // No violations => low
      expect(dashboard.getMetrics().riskLevel).toBe("low");

      // Add 2 violations
      dashboard.addAuditEntry({
        action: "compliance_check",
        actor: "system",
        details: {},
        complianceReport: {
          passed: false,
          violations: [
            {
              ruleId: "FTC-001",
              regulation: "FTC",
              severity: "critical",
              message: "V1",
              recommendation: "Fix",
            },
            {
              ruleId: "FTC-002",
              regulation: "FTC",
              severity: "high",
              message: "V2",
              recommendation: "Fix",
            },
          ],
          warnings: [],
          checkedRules: 10,
          timestamp: new Date(),
          context: createContext(),
        },
      });
      expect(dashboard.getMetrics().riskLevel).toBe("medium");

      // Add 3 more
      dashboard.addAuditEntry({
        action: "compliance_check",
        actor: "system",
        details: {},
        complianceReport: {
          passed: false,
          violations: [
            {
              ruleId: "CFPB-001",
              regulation: "CFPB",
              severity: "critical",
              message: "V3",
              recommendation: "Fix",
            },
            {
              ruleId: "TILA-001",
              regulation: "TILA",
              severity: "critical",
              message: "V4",
              recommendation: "Fix",
            },
          ],
          warnings: [],
          checkedRules: 10,
          timestamp: new Date(),
          context: createContext(),
        },
      });
      expect(dashboard.getMetrics().riskLevel).toBe("high");
    });
  });

  // ===========================================================================
  // getComplianceTimeline
  // ===========================================================================

  describe("getComplianceTimeline", () => {
    it("should return empty array when no compliance checks exist", () => {
      const timeline = dashboard.getComplianceTimeline(30);
      expect(timeline).toHaveLength(0);
    });

    it("should aggregate compliance checks by date", () => {
      // Add two compliance checks for today
      dashboard.addAuditEntry({
        action: "compliance_check",
        actor: "system",
        details: {},
        complianceReport: {
          passed: true,
          violations: [],
          warnings: [],
          checkedRules: 10,
          timestamp: new Date(),
          context: createContext(),
        },
      });
      dashboard.addAuditEntry({
        action: "compliance_check",
        actor: "system",
        details: {},
        complianceReport: {
          passed: false,
          violations: [
            {
              ruleId: "FTC-001",
              regulation: "FTC",
              severity: "critical",
              message: "V",
              recommendation: "Fix",
            },
          ],
          warnings: [],
          checkedRules: 10,
          timestamp: new Date(),
          context: createContext(),
        },
      });

      const timeline = dashboard.getComplianceTimeline(30);
      expect(timeline).toHaveLength(1);
      expect(timeline[0].checksRun).toBe(2);
      expect(timeline[0].passed).toBe(1);
      expect(timeline[0].violations).toBe(1);
    });
  });

  // ===========================================================================
  // getViolationsByRegulation
  // ===========================================================================

  describe("getViolationsByRegulation", () => {
    it("should return empty map when no violations exist", () => {
      const counts = dashboard.getViolationsByRegulation();
      expect(counts.size).toBe(0);
    });

    it("should count violations grouped by regulation", () => {
      dashboard.addAuditEntry({
        action: "compliance_check",
        actor: "system",
        details: {},
        complianceReport: {
          passed: false,
          violations: [
            {
              ruleId: "FTC-001",
              regulation: "FTC",
              severity: "critical",
              message: "V1",
              recommendation: "Fix",
            },
            {
              ruleId: "CFPB-001",
              regulation: "CFPB",
              severity: "critical",
              message: "V2",
              recommendation: "Fix",
            },
            {
              ruleId: "FTC-005",
              regulation: "FTC",
              severity: "critical",
              message: "V3",
              recommendation: "Fix",
            },
          ],
          warnings: [],
          checkedRules: 10,
          timestamp: new Date(),
          context: createContext(),
        },
      });

      const counts = dashboard.getViolationsByRegulation();
      expect(counts.get("FTC")).toBe(2);
      expect(counts.get("CFPB")).toBe(1);
    });
  });

  // ===========================================================================
  // exportAuditReport
  // ===========================================================================

  describe("exportAuditReport", () => {
    it("should export a full report for the given period", () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      dashboard.addAuditEntry({
        action: "product_listed",
        actor: "system",
        details: { productId: "p1" },
      });
      dashboard.addAuditEntry({
        action: "compliance_check",
        actor: "system",
        details: {},
        complianceReport: {
          passed: true,
          violations: [],
          warnings: [],
          checkedRules: 10,
          timestamp: new Date(),
          context: createContext(),
        },
      });

      const report = dashboard.exportAuditReport({
        start: yesterday,
        end: tomorrow,
      });

      expect(report.period.start).toBe(yesterday);
      expect(report.period.end).toBe(tomorrow);
      expect(report.entries).toHaveLength(2);
      expect(report.metrics).toBeDefined();
      expect(report.violationSummary).toBeInstanceOf(Map);
    });

    it("should filter entries by period", () => {
      const now = new Date();
      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
      const oneDayAgo = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);

      dashboard.addAuditEntry({
        action: "product_listed",
        actor: "system",
        details: {},
      });

      // This entry is from now, so querying 2 days ago to 1 day ago should miss it
      const report = dashboard.exportAuditReport({
        start: twoDaysAgo,
        end: oneDayAgo,
      });

      expect(report.entries).toHaveLength(0);
    });
  });

  // ===========================================================================
  // clear
  // ===========================================================================

  describe("clear", () => {
    it("should remove all audit log entries", () => {
      dashboard.addAuditEntry({
        action: "product_listed",
        actor: "system",
        details: {},
      });
      dashboard.addAuditEntry({
        action: "disclosure_added",
        actor: "user_001",
        details: {},
      });

      expect(dashboard.getAuditLog()).toHaveLength(2);

      dashboard.clear();

      expect(dashboard.getAuditLog()).toHaveLength(0);
    });

    it("should reset metrics after clearing", () => {
      dashboard.addAuditEntry({
        action: "product_listed",
        actor: "system",
        details: {},
      });

      dashboard.clear();

      const metrics = dashboard.getMetrics();
      expect(metrics.totalProducts).toBe(0);
    });
  });

  // ===========================================================================
  // Singleton Export
  // ===========================================================================

  describe("singleton export", () => {
    it("should export a functional revenueDashboardService singleton", () => {
      expect(revenueDashboardService).toBeInstanceOf(
        RevenueDashboardService,
      );
    });
  });
});
