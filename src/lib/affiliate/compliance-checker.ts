/**
 * FTC/CFPB Compliance Checker
 *
 * Implements FTC endorsement guidelines (16 CFR 255) and CFPB advertising rules
 * for affiliate marketing content. Validates disclosures, advertising copy, and
 * product representations against federal regulations.
 */

import { randomUUID } from "crypto";

// =============================================================================
// Types
// =============================================================================

export interface ComplianceRule {
  ruleId: string;
  regulation: "FTC" | "CFPB" | "TILA" | "CAN_SPAM";
  category:
    | "disclosure"
    | "advertising"
    | "endorsement"
    | "pricing"
    | "data_collection";
  description: string;
  severity: "critical" | "high" | "medium" | "low";
  check: (context: ComplianceContext) => ComplianceViolation | null;
}

export interface ComplianceContext {
  product: {
    category: string;
    hasApr?: boolean;
    hasAnnualFee?: boolean;
    hasRewards?: boolean;
    hasSignupBonus?: boolean;
    isSponsored?: boolean;
    affiliateCompensated?: boolean;
  };
  content: {
    text: string;
    hasDisclosure?: boolean;
    disclosurePosition?:
      | "before_content"
      | "inline"
      | "after_content"
      | "footnote";
    hasRateDisclosure?: boolean;
    hasCompensationDisclosure?: boolean;
    hasMaterialConnectionDisclosure?: boolean;
    hasTestimonial?: boolean;
    testimonialSubstantiated?: boolean;
  };
  placement: {
    pageType:
      | "listing"
      | "comparison"
      | "review"
      | "recommendation"
      | "article"
      | "email";
    isAboveTheFold?: boolean;
    prominenceLevel?: "prominent" | "standard" | "minimal";
  };
}

export interface ComplianceViolation {
  ruleId: string;
  regulation: string;
  severity: "critical" | "high" | "medium" | "low";
  message: string;
  recommendation: string;
  cfrReference?: string;
}

export interface ComplianceReport {
  passed: boolean;
  violations: ComplianceViolation[];
  warnings: ComplianceViolation[];
  checkedRules: number;
  timestamp: Date;
  context: ComplianceContext;
}

// =============================================================================
// Trigger Term Patterns
// =============================================================================

/**
 * TILA trigger terms that require full Regulation Z disclosures when used
 * in credit advertising. See 12 CFR 226.24(d)(1).
 */
const TILA_TRIGGER_TERMS: RegExp[] = [
  /\b\d+(\.\d+)?%\s*(apr|annual percentage rate|interest rate)\b/i,
  /\b\$\d+[\d,]*\s*(per month|monthly payment|a month)\b/i,
  /\b(no|zero|\$0)\s*(down payment|money down)\b/i,
  /\b\d+\s*(monthly\s+)?payments?\s+of\s+\$\d+/i,
  /\bfinance charge\b/i,
  /\bmonthly payment of\b/i,
  /\b\d+(\.\d+)?%\s*fixed\b/i,
  /\b\d+(\.\d+)?%\s*variable\b/i,
];

/**
 * Credit product categories that require TILA/Reg Z disclosures.
 */
const CREDIT_PRODUCT_CATEGORIES = new Set([
  "credit_card",
  "personal_loan",
  "auto_loan",
  "mortgage",
  "student_loan",
  "home_equity",
  "line_of_credit",
]);

/**
 * Misleading claim patterns in advertising copy.
 */
const MISLEADING_CLAIM_PATTERNS: Array<{ pattern: RegExp; term: string }> = [
  { pattern: /\bguaranteed\s+approval\b/i, term: "guaranteed approval" },
  { pattern: /\bno\s+credit\s+check\b/i, term: "no credit check" },
  { pattern: /\binstant\s+approval\b/i, term: "instant approval" },
  { pattern: /\bfree\s+money\b/i, term: "free money" },
  { pattern: /\brisk[\s-]free\b/i, term: "risk-free" },
  { pattern: /\b100%\s+guaranteed\b/i, term: "100% guaranteed" },
  { pattern: /\bno\s+strings\s+attached\b/i, term: "no strings attached" },
];

// =============================================================================
// Built-in FTC/CFPB Rules
// =============================================================================

function createBuiltInRules(): ComplianceRule[] {
  return [
    // =========================================================================
    // FTC Endorsement Guidelines (16 CFR 255)
    // =========================================================================
    {
      ruleId: "FTC-001",
      regulation: "FTC",
      category: "disclosure",
      description:
        "Material connection disclosure required for affiliate content",
      severity: "critical",
      check: (ctx: ComplianceContext): ComplianceViolation | null => {
        if (
          ctx.product.affiliateCompensated &&
          !ctx.content.hasMaterialConnectionDisclosure
        ) {
          return {
            ruleId: "FTC-001",
            regulation: "FTC",
            severity: "critical",
            message:
              "Affiliate content must disclose the material connection between the endorser and the product provider.",
            recommendation:
              'Add a clear disclosure such as "We may earn a commission when you apply through our links" before any product recommendations.',
            cfrReference: "16 CFR \u00A7 255.5",
          };
        }
        return null;
      },
    },
    {
      ruleId: "FTC-002",
      regulation: "FTC",
      category: "disclosure",
      description: 'Disclosure must be "clear and conspicuous"',
      severity: "high",
      check: (ctx: ComplianceContext): ComplianceViolation | null => {
        if (
          ctx.product.affiliateCompensated &&
          ctx.content.hasMaterialConnectionDisclosure
        ) {
          if (ctx.placement.prominenceLevel === "minimal") {
            return {
              ruleId: "FTC-002",
              regulation: "FTC",
              severity: "high",
              message:
                "Disclosure must be clear and conspicuous, not hidden or minimally displayed.",
              recommendation:
                'Ensure the disclosure is prominent, using readable font size, contrasting colors, and placement that consumers are likely to notice. The FTC requires disclosures to be "unavoidable."',
              cfrReference: "16 CFR \u00A7 255.5",
            };
          }
        }
        return null;
      },
    },
    {
      ruleId: "FTC-003",
      regulation: "FTC",
      category: "disclosure",
      description:
        "Disclosure must appear BEFORE the endorsement or recommendation",
      severity: "high",
      check: (ctx: ComplianceContext): ComplianceViolation | null => {
        if (ctx.product.affiliateCompensated && ctx.content.hasDisclosure) {
          if (
            ctx.content.disclosurePosition === "footnote" ||
            ctx.content.disclosurePosition === "after_content"
          ) {
            return {
              ruleId: "FTC-003",
              regulation: "FTC",
              severity: "high",
              message:
                "Disclosure must appear before the endorsement, not as a footnote or after content.",
              recommendation:
                'Move the disclosure to the top of the content, before any product recommendations. The FTC\'s ".com Disclosures" guidance requires placement near the endorsing statements.',
              cfrReference: "16 CFR \u00A7 255.5",
            };
          }
        }
        return null;
      },
    },
    {
      ruleId: "FTC-004",
      regulation: "FTC",
      category: "endorsement",
      description: "Testimonials must be substantiated with typical results",
      severity: "high",
      check: (ctx: ComplianceContext): ComplianceViolation | null => {
        if (
          ctx.content.hasTestimonial &&
          !ctx.content.testimonialSubstantiated
        ) {
          return {
            ruleId: "FTC-004",
            regulation: "FTC",
            severity: "high",
            message:
              "Testimonials and endorsements must reflect typical consumer experiences or include a clear disclaimer about typical results.",
            recommendation:
              'Add a "Results may vary. Typical results: [describe typical outcome]" disclaimer near any testimonials. The FTC eliminated the "results not typical" safe harbor in 2009.',
            cfrReference: "16 CFR \u00A7 255.2",
          };
        }
        return null;
      },
    },
    {
      ruleId: "FTC-005",
      regulation: "FTC",
      category: "disclosure",
      description:
        "Sponsored content must disclose compensation relationship",
      severity: "critical",
      check: (ctx: ComplianceContext): ComplianceViolation | null => {
        if (
          ctx.product.isSponsored &&
          !ctx.content.hasCompensationDisclosure
        ) {
          return {
            ruleId: "FTC-005",
            regulation: "FTC",
            severity: "critical",
            message:
              "Sponsored content must clearly disclose the compensation relationship with the advertiser.",
            recommendation:
              'Add a prominent "Sponsored" or "Advertisement" label and disclose the compensation relationship clearly.',
            cfrReference: "16 CFR \u00A7 255.5",
          };
        }
        return null;
      },
    },

    // =========================================================================
    // CFPB Advertising Rules / Regulation Z (TILA)
    // =========================================================================
    {
      ruleId: "CFPB-001",
      regulation: "CFPB",
      category: "pricing",
      description:
        "APR disclosure required for credit products (Regulation Z/TILA)",
      severity: "critical",
      check: (ctx: ComplianceContext): ComplianceViolation | null => {
        if (
          CREDIT_PRODUCT_CATEGORIES.has(ctx.product.category) &&
          ctx.product.hasApr &&
          !ctx.content.hasRateDisclosure
        ) {
          return {
            ruleId: "CFPB-001",
            regulation: "CFPB",
            severity: "critical",
            message:
              "Credit products advertising an APR must include a full rate disclosure per Regulation Z.",
            recommendation:
              'Include the APR range, whether fixed or variable, and any conditions that may affect the rate. Example: "APR: 14.99%-24.99% variable, based on creditworthiness."',
            cfrReference: "12 CFR \u00A7 1026.24",
          };
        }
        return null;
      },
    },
    {
      ruleId: "CFPB-002",
      regulation: "CFPB",
      category: "pricing",
      description: "Annual fee must be disclosed for credit products",
      severity: "high",
      check: (ctx: ComplianceContext): ComplianceViolation | null => {
        if (
          CREDIT_PRODUCT_CATEGORIES.has(ctx.product.category) &&
          ctx.product.hasAnnualFee &&
          !ctx.content.text.toLowerCase().includes("annual fee")
        ) {
          return {
            ruleId: "CFPB-002",
            regulation: "CFPB",
            severity: "high",
            message:
              "Products with annual fees must disclose the annual fee in advertising materials.",
            recommendation:
              "Include the annual fee amount prominently in the product description, near the APR disclosure.",
            cfrReference: "12 CFR \u00A7 1026.24(d)(2)",
          };
        }
        return null;
      },
    },
    {
      ruleId: "CFPB-003",
      regulation: "CFPB",
      category: "advertising",
      description:
        'Comparison advertising must be fair and not use misleading "pre-approved" language',
      severity: "medium",
      check: (ctx: ComplianceContext): ComplianceViolation | null => {
        if (ctx.placement.pageType === "comparison") {
          const text = ctx.content.text.toLowerCase();
          if (
            text.includes("pre-approved") &&
            !text.includes("pre-qualified")
          ) {
            return {
              ruleId: "CFPB-003",
              regulation: "CFPB",
              severity: "medium",
              message:
                '"Pre-approved" implies a firm offer of credit. Use "pre-qualified" for soft-inquiry based offers that are not binding.',
              recommendation:
                'Replace "pre-approved" with "pre-qualified" unless the offer constitutes a firm offer of credit under FCRA. Pre-qualified indicates a preliminary assessment; pre-approved implies a binding commitment.',
              cfrReference: "15 USC \u00A7 1681a(l)",
            };
          }
        }
        return null;
      },
    },

    // =========================================================================
    // TILA Trigger Terms
    // =========================================================================
    {
      ruleId: "TILA-001",
      regulation: "TILA",
      category: "pricing",
      description:
        "Trigger terms in advertising require full Regulation Z disclosures",
      severity: "critical",
      check: (ctx: ComplianceContext): ComplianceViolation | null => {
        if (!CREDIT_PRODUCT_CATEGORIES.has(ctx.product.category)) {
          return null;
        }

        const text = ctx.content.text;
        for (const pattern of TILA_TRIGGER_TERMS) {
          if (pattern.test(text) && !ctx.content.hasRateDisclosure) {
            return {
              ruleId: "TILA-001",
              regulation: "TILA",
              severity: "critical",
              message:
                "Advertising copy contains trigger terms that require full Regulation Z disclosures (APR, payment schedule, total cost).",
              recommendation:
                "When using specific rates, payment amounts, or financing terms in advertising, you must also disclose: (1) the APR, (2) the repayment terms, and (3) the total of payments. These must be equally prominent.",
              cfrReference: "12 CFR \u00A7 1026.24(d)(1)",
            };
          }
        }
        return null;
      },
    },

    // =========================================================================
    // General Advertising Compliance
    // =========================================================================
    {
      ruleId: "ADV-001",
      regulation: "FTC",
      category: "advertising",
      description: "No misleading or unsubstantiable claims",
      severity: "high",
      check: (ctx: ComplianceContext): ComplianceViolation | null => {
        const text = ctx.content.text;
        for (const { pattern, term } of MISLEADING_CLAIM_PATTERNS) {
          if (pattern.test(text)) {
            return {
              ruleId: "ADV-001",
              regulation: "FTC",
              severity: "high",
              message: `Advertising copy contains potentially misleading claim: "${term}". Such claims may be considered deceptive under the FTC Act.`,
              recommendation: `Remove or qualify the "${term}" claim. The FTC Act (Section 5) prohibits unfair or deceptive acts. Claims must be truthful, substantiated, and not misleading.`,
              cfrReference: "15 USC \u00A7 45(a)",
            };
          }
        }
        return null;
      },
    },
    {
      ruleId: "ADV-002",
      regulation: "FTC",
      category: "advertising",
      description:
        "Email marketing must include unsubscribe mechanism (CAN-SPAM reference)",
      severity: "medium",
      check: (ctx: ComplianceContext): ComplianceViolation | null => {
        if (ctx.placement.pageType === "email") {
          const text = ctx.content.text.toLowerCase();
          if (
            !text.includes("unsubscribe") &&
            !text.includes("opt out") &&
            !text.includes("opt-out")
          ) {
            return {
              ruleId: "ADV-002",
              regulation: "FTC",
              severity: "medium",
              message:
                "Commercial email must include a clear mechanism for recipients to opt out of future messages.",
              recommendation:
                'Add an "Unsubscribe" link or "Opt out" mechanism to the email. CAN-SPAM requires a clear, conspicuous way to opt out.',
              cfrReference: "16 CFR \u00A7 316.5",
            };
          }
        }
        return null;
      },
    },
  ];
}

// =============================================================================
// Credit Product Disclosure Requirements
// =============================================================================

const CREDIT_PRODUCT_DISCLOSURES: Record<string, string[]> = {
  credit_card: [
    "APR range (variable or fixed) and conditions that may affect the rate",
    "Annual fee amount",
    "Balance transfer fee, if applicable",
    "Foreign transaction fee, if applicable",
    "Penalty APR and conditions that trigger it",
    "Grace period information",
  ],
  personal_loan: [
    "APR range (fixed or variable)",
    "Loan amount range",
    "Repayment term options",
    "Origination fee, if applicable",
    "Prepayment penalty, if applicable",
    "Late payment fee",
  ],
  auto_loan: [
    "APR range",
    "Loan term options",
    "Down payment requirements",
    "New vs used vehicle rate differences",
    "Total cost of financing example",
  ],
  mortgage: [
    "APR and interest rate",
    "Points and fees",
    "Closing costs estimate",
    "Monthly payment example including taxes and insurance",
    "ARM adjustment terms, if applicable",
    "PMI requirements",
  ],
  student_loan: [
    "APR range",
    "Fixed vs variable rate options",
    "Repayment term options",
    "Deferment and forbearance options",
    "Cosigner release eligibility",
    "Federal vs private loan differences",
  ],
  insurance: [
    "Coverage types and limits",
    "Premium range or factors affecting premium",
    "Deductible information",
    "Exclusions and limitations summary",
    "Cancellation policy",
  ],
  savings: [
    "APY (Annual Percentage Yield) and conditions",
    "Minimum balance requirements",
    "Fee schedule",
    "FDIC insurance status",
    "Withdrawal restrictions, if applicable",
  ],
  checking: [
    "Monthly maintenance fee and waiver conditions",
    "Minimum balance requirements",
    "ATM fee policy",
    "Overdraft fee and policy",
    "FDIC insurance status",
  ],
  investment: [
    "Investment involves risk of loss",
    "Past performance does not guarantee future results",
    "Fee schedule (management fees, expense ratios)",
    "Account minimums",
    "Securities not FDIC insured",
  ],
};

// =============================================================================
// ComplianceChecker Class
// =============================================================================

export class ComplianceChecker {
  private rules: ComplianceRule[];

  constructor() {
    this.rules = createBuiltInRules();
  }

  /**
   * Run all compliance rules against the given context.
   * Returns a ComplianceReport with violations (critical/high) and warnings (medium/low).
   */
  check(context: ComplianceContext): ComplianceReport {
    const violations: ComplianceViolation[] = [];
    const warnings: ComplianceViolation[] = [];

    for (const rule of this.rules) {
      const result = rule.check(context);
      if (result !== null) {
        if (
          result.severity === "critical" ||
          result.severity === "high"
        ) {
          violations.push(result);
        } else {
          warnings.push(result);
        }
      }
    }

    return {
      passed: violations.length === 0,
      violations,
      warnings,
      checkedRules: this.rules.length,
      timestamp: new Date(),
      context,
    };
  }

  /**
   * Add a custom compliance rule.
   */
  addRule(rule: ComplianceRule): void {
    this.rules.push(rule);
  }

  /**
   * Get all rules currently loaded.
   */
  getRules(): ReadonlyArray<ComplianceRule> {
    return this.rules;
  }

  /**
   * Returns list of required disclosure texts based on product type.
   */
  getRequiredDisclosures(
    product: ComplianceContext["product"],
  ): string[] {
    const disclosures: string[] = [];

    // Material connection disclosure for affiliate content
    if (product.affiliateCompensated) {
      disclosures.push(
        "Material connection disclosure: Must disclose affiliate compensation relationship",
      );
    }

    // Sponsored content disclosure
    if (product.isSponsored) {
      disclosures.push(
        "Sponsored content disclosure: Must clearly label as sponsored/advertisement",
      );
    }

    // Product-specific disclosures
    const productDisclosures =
      CREDIT_PRODUCT_DISCLOSURES[product.category];
    if (productDisclosures) {
      disclosures.push(...productDisclosures);
    }

    // APR disclosure for credit products
    if (
      CREDIT_PRODUCT_CATEGORIES.has(product.category) &&
      product.hasApr
    ) {
      disclosures.push(
        "Regulation Z APR disclosure: Must include full APR terms",
      );
    }

    return disclosures;
  }

  /**
   * Generate compliant disclosure text for a product.
   */
  generateDisclosureText(
    product: ComplianceContext["product"],
  ): string {
    const parts: string[] = [];

    // Affiliate compensation disclosure
    if (product.affiliateCompensated) {
      parts.push(
        "Advertiser Disclosure: Fynvita may receive compensation when you click on links or apply for products on this page. " +
          "This compensation may influence which products appear and in what order, but does not affect our editorial opinions.",
      );
    }

    // Sponsored content label
    if (product.isSponsored) {
      parts.push(
        "Sponsored Content: This content is sponsored by a third-party advertiser. Fynvita receives compensation for featuring this content.",
      );
    }

    // Credit product rate disclosure
    if (CREDIT_PRODUCT_CATEGORIES.has(product.category)) {
      parts.push(
        "Rate Disclosure: Interest rates, APRs, and terms shown are for informational purposes and may vary based on your creditworthiness and other factors. " +
          "Please review all terms and conditions before applying.",
      );
    }

    // Rewards/bonus disclaimers
    if (product.hasRewards || product.hasSignupBonus) {
      parts.push(
        "Rewards and sign-up bonuses are subject to the issuer's terms and conditions. " +
          "Please review the full terms for eligibility requirements and bonus criteria.",
      );
    }

    // Investment disclaimer
    if (product.category === "investment") {
      parts.push(
        "Investment products involve risk and may lose value. " +
          "Past performance does not guarantee future results. Securities are not FDIC insured.",
      );
    }

    if (parts.length === 0) {
      return "Please review all terms and conditions before applying for any financial product.";
    }

    return parts.join(" ");
  }

  /**
   * Check advertising copy for compliance issues.
   * Scans text for trigger terms, misleading claims, and missing disclosures.
   */
  validateAdvertisingCopy(
    text: string,
    product: ComplianceContext["product"],
  ): ComplianceViolation[] {
    const violations: ComplianceViolation[] = [];

    // Check for misleading claims
    for (const { pattern, term } of MISLEADING_CLAIM_PATTERNS) {
      if (pattern.test(text)) {
        violations.push({
          ruleId: "ADV-001",
          regulation: "FTC",
          severity: "high",
          message: `Advertising copy contains potentially misleading claim: "${term}".`,
          recommendation: `Remove or qualify the "${term}" claim to comply with FTC Act Section 5.`,
          cfrReference: "15 USC \u00A7 45(a)",
        });
      }
    }

    // Check for trigger terms without full disclosure
    if (CREDIT_PRODUCT_CATEGORIES.has(product.category)) {
      for (const pattern of TILA_TRIGGER_TERMS) {
        if (pattern.test(text)) {
          const hasFullDisclosure =
            text.toLowerCase().includes("apr") &&
            (text.toLowerCase().includes("terms") ||
              text.toLowerCase().includes("repayment"));

          if (!hasFullDisclosure) {
            violations.push({
              ruleId: "TILA-001",
              regulation: "TILA",
              severity: "critical",
              message:
                "Trigger term detected without required full Regulation Z disclosures.",
              recommendation:
                "When using specific rates or payment amounts, also disclose: APR, repayment terms, and total cost of financing.",
              cfrReference: "12 CFR \u00A7 1026.24(d)(1)",
            });
            // Only report once for trigger terms
            break;
          }
        }
      }
    }

    return violations;
  }
}

// =============================================================================
// Audit / Revenue Dashboard Service
// =============================================================================

export interface AuditEntry {
  entryId: string;
  timestamp: Date;
  action:
    | "content_published"
    | "disclosure_added"
    | "compliance_check"
    | "violation_resolved"
    | "product_listed"
    | "product_removed";
  actor: string;
  details: Record<string, unknown>;
  complianceReport?: ComplianceReport;
}

export interface DashboardMetrics {
  totalProducts: number;
  activeProducts: number;
  complianceRate: number;
  openViolations: number;
  resolvedViolations: number;
  lastAuditDate: Date;
  riskLevel: "low" | "medium" | "high";
}

export class RevenueDashboardService {
  private auditLog: AuditEntry[] = [];

  /**
   * Add an entry to the audit log.
   */
  addAuditEntry(
    entry: Omit<AuditEntry, "entryId" | "timestamp">,
  ): AuditEntry {
    const fullEntry: AuditEntry = {
      entryId: randomUUID(),
      timestamp: new Date(),
      ...entry,
    };
    this.auditLog.push(fullEntry);
    return fullEntry;
  }

  /**
   * Retrieve audit log entries, optionally filtered.
   */
  getAuditLog(filters?: {
    after?: Date;
    before?: Date;
    action?: AuditEntry["action"];
    actor?: string;
    limit?: number;
  }): AuditEntry[] {
    let entries = [...this.auditLog];

    if (filters?.after) {
      const after = filters.after.getTime();
      entries = entries.filter((e) => e.timestamp.getTime() >= after);
    }
    if (filters?.before) {
      const before = filters.before.getTime();
      entries = entries.filter((e) => e.timestamp.getTime() <= before);
    }
    if (filters?.action) {
      entries = entries.filter((e) => e.action === filters.action);
    }
    if (filters?.actor) {
      entries = entries.filter((e) => e.actor === filters.actor);
    }

    // Sort by timestamp descending (newest first)
    entries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (filters?.limit && filters.limit > 0) {
      entries = entries.slice(0, filters.limit);
    }

    return entries;
  }

  /**
   * Compute dashboard metrics from the audit log.
   */
  getMetrics(): DashboardMetrics {
    const productListedEntries = this.auditLog.filter(
      (e) => e.action === "product_listed",
    );
    const productRemovedEntries = this.auditLog.filter(
      (e) => e.action === "product_removed",
    );
    const complianceCheckEntries = this.auditLog.filter(
      (e) => e.action === "compliance_check",
    );
    const violationResolvedEntries = this.auditLog.filter(
      (e) => e.action === "violation_resolved",
    );

    const totalProducts = productListedEntries.length;
    const activeProducts = Math.max(
      0,
      totalProducts - productRemovedEntries.length,
    );

    // Calculate compliance rate from compliance_check entries
    let passedChecks = 0;
    let openViolations = 0;

    for (const entry of complianceCheckEntries) {
      if (entry.complianceReport?.passed) {
        passedChecks++;
      } else if (entry.complianceReport) {
        openViolations += entry.complianceReport.violations.length;
      }
    }

    const resolvedViolations = violationResolvedEntries.length;
    openViolations = Math.max(0, openViolations - resolvedViolations);

    const totalChecks = complianceCheckEntries.length;
    const complianceRate =
      totalChecks > 0
        ? Math.round((passedChecks / totalChecks) * 100) / 100
        : 1;

    // Determine last audit date
    const allTimestamps = this.auditLog.map((e) => e.timestamp.getTime());
    const lastAuditDate =
      allTimestamps.length > 0
        ? new Date(Math.max(...allTimestamps))
        : new Date();

    // Risk level based on open violations
    let riskLevel: "low" | "medium" | "high";
    if (openViolations === 0) {
      riskLevel = "low";
    } else if (openViolations <= 3) {
      riskLevel = "medium";
    } else {
      riskLevel = "high";
    }

    return {
      totalProducts,
      activeProducts,
      complianceRate,
      openViolations,
      resolvedViolations,
      lastAuditDate,
      riskLevel,
    };
  }

  /**
   * Get compliance check results aggregated by day over a time period.
   */
  getComplianceTimeline(
    days: number = 30,
  ): Array<{
    date: string;
    checksRun: number;
    violations: number;
    passed: number;
  }> {
    const now = new Date();
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const complianceEntries = this.auditLog.filter(
      (e) =>
        e.action === "compliance_check" &&
        e.timestamp.getTime() >= cutoff.getTime(),
    );

    // Group by date
    const byDate = new Map<
      string,
      { checksRun: number; violations: number; passed: number }
    >();

    for (const entry of complianceEntries) {
      const dateKey = entry.timestamp.toISOString().split("T")[0];
      const existing = byDate.get(dateKey) ?? {
        checksRun: 0,
        violations: 0,
        passed: 0,
      };

      existing.checksRun++;
      if (entry.complianceReport?.passed) {
        existing.passed++;
      } else if (entry.complianceReport) {
        existing.violations += entry.complianceReport.violations.length;
      }

      byDate.set(dateKey, existing);
    }

    // Convert to sorted array
    return Array.from(byDate.entries())
      .map(([date, stats]) => ({ date, ...stats }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Get a count of violations grouped by regulation.
   */
  getViolationsByRegulation(): Map<string, number> {
    const counts = new Map<string, number>();

    for (const entry of this.auditLog) {
      if (
        entry.action === "compliance_check" &&
        entry.complianceReport
      ) {
        for (const violation of entry.complianceReport.violations) {
          const current = counts.get(violation.regulation) ?? 0;
          counts.set(violation.regulation, current + 1);
        }
      }
    }

    return counts;
  }

  /**
   * Export a full audit report for a given time period.
   */
  exportAuditReport(period: { start: Date; end: Date }): {
    period: { start: Date; end: Date };
    metrics: DashboardMetrics;
    entries: AuditEntry[];
    violationSummary: Map<string, number>;
  } {
    const entries = this.getAuditLog({
      after: period.start,
      before: period.end,
    });

    return {
      period,
      metrics: this.getMetrics(),
      entries,
      violationSummary: this.getViolationsByRegulation(),
    };
  }

  /**
   * Clear all audit log entries.
   */
  clear(): void {
    this.auditLog = [];
  }
}

// =============================================================================
// Singleton Exports
// =============================================================================

export const complianceChecker = new ComplianceChecker();
export const revenueDashboardService = new RevenueDashboardService();
