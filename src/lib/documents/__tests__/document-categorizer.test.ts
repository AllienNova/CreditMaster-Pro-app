/**
 * @jest-environment node
 */

import { documentCategorizer } from "../document-categorizer";
import type {
  CategorizationInput,
  CategorizationResult,
  DocumentCategory,
} from "../document-categorizer";

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Build a categorization input with defaults. */
function makeInput(overrides: Partial<CategorizationInput> = {}): CategorizationInput {
  return {
    fileName: overrides.fileName,
    mimeType: overrides.mimeType,
    textContent: overrides.textContent,
    metadata: overrides.metadata,
  };
}

/** Assert that a result has the expected primary category. */
function expectCategory(
  result: CategorizationResult,
  expected: DocumentCategory,
): void {
  expect(result.category).toBe(expected);
}

// ═══════════════════════════════════════════════════════════════════════════════
// File Name Categorization
// ═══════════════════════════════════════════════════════════════════════════════

describe("DocumentCategorizer - file name categorization", () => {
  it("categorizes W-2 forms as tax", () => {
    const result = documentCategorizer.categorize(
      makeInput({ fileName: "W-2_2025.pdf" }),
    );
    expectCategory(result, "tax");
    expect(result.confidence).toBeGreaterThan(0);
  });

  it("categorizes w2 (no dash) as tax", () => {
    const result = documentCategorizer.categorize(
      makeInput({ fileName: "w2_form.pdf" }),
    );
    expectCategory(result, "tax");
  });

  it("categorizes 1099 forms as tax", () => {
    const result = documentCategorizer.categorize(
      makeInput({ fileName: "1099-MISC-2025.pdf" }),
    );
    expectCategory(result, "tax");
  });

  it("categorizes 1040 forms as tax", () => {
    const result = documentCategorizer.categorize(
      makeInput({ fileName: "form-1040-2025.pdf" }),
    );
    expectCategory(result, "tax");
  });

  it("categorizes tax return files as tax", () => {
    const result = documentCategorizer.categorize(
      makeInput({ fileName: "tax_return_2025.pdf" }),
    );
    expectCategory(result, "tax");
  });

  it("categorizes bank statements as financial", () => {
    const result = documentCategorizer.categorize(
      makeInput({ fileName: "bank-statement-jan-2025.pdf" }),
    );
    expectCategory(result, "financial");
  });

  it("categorizes credit reports as financial", () => {
    const result = documentCategorizer.categorize(
      makeInput({ fileName: "credit_report_equifax.pdf" }),
    );
    expectCategory(result, "financial");
  });

  it("categorizes pay stubs as financial", () => {
    const result = documentCategorizer.categorize(
      makeInput({ fileName: "pay_stub_jan_2025.pdf" }),
    );
    expectCategory(result, "financial");
  });

  it("categorizes driver's license as identity", () => {
    const result = documentCategorizer.categorize(
      makeInput({ fileName: "drivers_license_scan.jpg" }),
    );
    expectCategory(result, "identity");
  });

  it("categorizes passport as identity", () => {
    const result = documentCategorizer.categorize(
      makeInput({ fileName: "passport_scan.pdf" }),
    );
    expectCategory(result, "identity");
  });

  it("categorizes birth certificate as identity", () => {
    const result = documentCategorizer.categorize(
      makeInput({ fileName: "birth_cert_copy.pdf" }),
    );
    expectCategory(result, "identity");
  });

  it("categorizes insurance policy as insurance", () => {
    const result = documentCategorizer.categorize(
      makeInput({ fileName: "insurance_policy_2025.pdf" }),
    );
    expectCategory(result, "insurance");
  });

  it("categorizes insurance card as insurance", () => {
    const result = documentCategorizer.categorize(
      makeInput({ fileName: "insurance_card_front.jpg" }),
    );
    expectCategory(result, "insurance");
  });

  it("categorizes contracts as legal", () => {
    const result = documentCategorizer.categorize(
      makeInput({ fileName: "employment_contract.pdf" }),
    );
    expectCategory(result, "legal");
  });

  it("categorizes court orders as legal", () => {
    const result = documentCategorizer.categorize(
      makeInput({ fileName: "court_order_2025.pdf" }),
    );
    expectCategory(result, "legal");
  });

  it("returns other for generic file names", () => {
    const result = documentCategorizer.categorize(
      makeInput({ fileName: "document_scan.pdf" }),
    );
    expectCategory(result, "other");
    expect(result.confidence).toBe(0);
    expect(result.method).toBe("default");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Content Categorization
// ═══════════════════════════════════════════════════════════════════════════════

describe("DocumentCategorizer - content categorization", () => {
  it("categorizes content with tax keywords as tax", () => {
    const result = documentCategorizer.categorize(
      makeInput({
        textContent:
          "Form W-2 Wage and Tax Statement. Employer Identification Number. Taxable income: $50,000. IRS filing status: Single.",
      }),
    );
    expectCategory(result, "tax");
    expect(result.matchedKeywords.length).toBeGreaterThan(0);
    expect(result.method).toBe("content");
  });

  it("categorizes content with financial keywords as financial", () => {
    const result = documentCategorizer.categorize(
      makeInput({
        textContent:
          "Bank Statement for January 2025. Account Statement. Transaction history. Opening balance: $5,000. Deposits and withdrawals.",
      }),
    );
    expectCategory(result, "financial");
    expect(result.matchedKeywords).toContain("bank statement");
  });

  it("categorizes content with credit report keywords as financial", () => {
    const result = documentCategorizer.categorize(
      makeInput({
        textContent:
          "Credit Report from Equifax. FICO Score: 750. Credit score analysis. Experian report included.",
      }),
    );
    expectCategory(result, "financial");
  });

  it("categorizes content with identity keywords as identity", () => {
    const result = documentCategorizer.categorize(
      makeInput({
        textContent:
          "United States Passport. Date of Birth: 01/15/1990. Place of Birth: New York. Citizenship: USA.",
      }),
    );
    expectCategory(result, "identity");
  });

  it("categorizes content with insurance keywords as insurance", () => {
    const result = documentCategorizer.categorize(
      makeInput({
        textContent:
          "Health Insurance Policy. Coverage details. Deductible: $500. Copay: $30. Policyholder: John Doe. Insurance premium: $250/month.",
      }),
    );
    expectCategory(result, "insurance");
    expect(result.matchedKeywords).toContain("health insurance");
  });

  it("categorizes content with legal keywords as legal", () => {
    const result = documentCategorizer.categorize(
      makeInput({
        textContent:
          "Power of Attorney. This affidavit is notarized. Court order dated January 15, 2025. The attorney shall represent the defendant.",
      }),
    );
    expectCategory(result, "legal");
  });

  it("returns other for content without category keywords", () => {
    const result = documentCategorizer.categorize(
      makeInput({
        textContent: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
      }),
    );
    expectCategory(result, "other");
  });

  it("handles empty text content gracefully", () => {
    const result = documentCategorizer.categorize(
      makeInput({ textContent: "" }),
    );
    expectCategory(result, "other");
    expect(result.confidence).toBe(0);
  });

  it("handles whitespace-only content", () => {
    const result = documentCategorizer.categorize(
      makeInput({ textContent: "   \n\t  " }),
    );
    expectCategory(result, "other");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Combined Categorization (filename + content)
// ═══════════════════════════════════════════════════════════════════════════════

describe("DocumentCategorizer - combined categorization", () => {
  it("uses combined method when both filename and content match", () => {
    const result = documentCategorizer.categorize(
      makeInput({
        fileName: "1099-MISC.pdf",
        textContent: "Form 1099 Miscellaneous Income. IRS tax return filing.",
      }),
    );
    expectCategory(result, "tax");
    expect(result.method).toBe("combined");
    expect(result.confidence).toBeGreaterThan(0);
  });

  it("content can override filename categorization when stronger", () => {
    // Generic filename but strong content signal
    const result = documentCategorizer.categorize(
      makeInput({
        fileName: "scan001.pdf",
        textContent:
          "Insurance Policy Number: 12345. Health insurance coverage. Deductible $1,000. Copay $25. Policyholder benefits. Insurance premium details.",
      }),
    );
    expectCategory(result, "insurance");
    expect(result.method).toBe("content");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Confidence Scoring
// ═══════════════════════════════════════════════════════════════════════════════

describe("DocumentCategorizer - confidence scoring", () => {
  it("returns zero confidence when no category matches", () => {
    const result = documentCategorizer.categorize(
      makeInput({ fileName: "random_file.pdf" }),
    );
    expect(result.confidence).toBe(0);
  });

  it("returns non-zero confidence for clear matches", () => {
    const result = documentCategorizer.categorize(
      makeInput({ fileName: "W-2_2025.pdf" }),
    );
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  it("returns higher confidence for multiple signals", () => {
    const singleSignal = documentCategorizer.categorize(
      makeInput({ fileName: "1099.pdf" }),
    );

    const multipleSignals = documentCategorizer.categorize(
      makeInput({
        fileName: "1099-MISC.pdf",
        textContent:
          "Form 1099 Miscellaneous Income. IRS filing. Tax return. Taxable income. Withholding amount.",
      }),
    );

    expect(multipleSignals.confidence).toBeGreaterThanOrEqual(
      singleSignal.confidence,
    );
  });

  it("scores are normalized between 0 and 1", () => {
    const result = documentCategorizer.categorize(
      makeInput({
        textContent:
          "W-2 tax return IRS taxable income withholding 1099 1040 schedule c adjusted gross income",
      }),
    );

    for (const score of result.scores) {
      expect(score.score).toBeGreaterThanOrEqual(0);
      expect(score.score).toBeLessThanOrEqual(1);
    }
  });

  it("all category scores sum to approximately 1 when there are matches", () => {
    const result = documentCategorizer.categorize(
      makeInput({
        textContent:
          "Bank statement transaction deposit credit report loan investment",
      }),
    );

    const total = result.scores.reduce((sum, s) => sum + s.score, 0);
    // Allow small floating-point tolerance
    expect(total).toBeCloseTo(1, 1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Tag Generation
// ═══════════════════════════════════════════════════════════════════════════════

describe("DocumentCategorizer - tag generation", () => {
  it("generates tax-related tags from content", () => {
    const result = documentCategorizer.categorize(
      makeInput({
        textContent: "Form W-2 from IRS. Tax return filing for 2025.",
      }),
    );

    expect(result.tags).toContain("w2");
    expect(result.tags).toContain("irs");
    expect(result.tags).toContain("tax-return");
  });

  it("generates year tags from content", () => {
    const result = documentCategorizer.categorize(
      makeInput({
        textContent: "Document from 2025 fiscal year.",
      }),
    );

    expect(result.tags).toContain("year-2025");
  });

  it("generates financial tags from content", () => {
    const result = documentCategorizer.categorize(
      makeInput({
        textContent:
          "Bank statement showing mortgage payment and investment portfolio.",
      }),
    );

    expect(result.tags).toContain("bank-statement");
    expect(result.tags).toContain("mortgage");
    expect(result.tags).toContain("investment");
  });

  it("generates identity tags from content", () => {
    const result = documentCategorizer.categorize(
      makeInput({
        textContent: "Passport number: A12345678. Social Security card.",
      }),
    );

    expect(result.tags).toContain("passport");
    expect(result.tags).toContain("ssn");
  });

  it("generates insurance tags from content", () => {
    const result = documentCategorizer.categorize(
      makeInput({
        textContent:
          "Health insurance plan. Auto insurance declaration page.",
      }),
    );

    expect(result.tags).toContain("health-insurance");
    expect(result.tags).toContain("auto-insurance");
  });

  it("generates legal tags from content", () => {
    const result = documentCategorizer.categorize(
      makeInput({
        textContent:
          "Signed contract. Dispute letter regarding credit report.",
      }),
    );

    expect(result.tags).toContain("contract");
    expect(result.tags).toContain("dispute");
  });

  it("adds pdf tag for PDF MIME type", () => {
    const result = documentCategorizer.categorize(
      makeInput({
        mimeType: "application/pdf",
        fileName: "document.pdf",
      }),
    );

    expect(result.tags).toContain("pdf");
  });

  it("adds image tag for image MIME types", () => {
    const result = documentCategorizer.categorize(
      makeInput({
        mimeType: "image/jpeg",
        fileName: "scan.jpg",
      }),
    );

    expect(result.tags).toContain("image");
  });

  it("generates tags from file name", () => {
    const result = documentCategorizer.categorize(
      makeInput({
        fileName: "1099-MISC-2025.pdf",
        mimeType: "application/pdf",
      }),
    );

    expect(result.tags).toContain("1099");
    expect(result.tags).toContain("year-2025");
    expect(result.tags).toContain("pdf");
  });

  it("returns empty tags for unrecognized content", () => {
    const result = documentCategorizer.categorize(
      makeInput({
        textContent: "Lorem ipsum dolor sit amet.",
      }),
    );

    // Should not have domain-specific tags
    expect(result.tags).not.toContain("w2");
    expect(result.tags).not.toContain("passport");
    expect(result.tags).not.toContain("contract");
  });

  it("tags are sorted alphabetically", () => {
    const result = documentCategorizer.categorize(
      makeInput({
        textContent: "W-2 IRS tax return 2025 bank statement",
        mimeType: "application/pdf",
      }),
    );

    const tags = result.tags;
    const sorted = [...tags].sort();
    expect(tags).toEqual(sorted);
  });

  it("tags are unique (no duplicates)", () => {
    const result = documentCategorizer.categorize(
      makeInput({
        fileName: "passport_scan.pdf",
        textContent: "This is a passport document. United States Passport.",
      }),
    );

    const uniqueTags = [...new Set(result.tags)];
    expect(result.tags).toEqual(uniqueTags);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Standalone Tag Generation
// ═══════════════════════════════════════════════════════════════════════════════

describe("DocumentCategorizer.generateTags (standalone)", () => {
  it("generates tags from input without full categorization", () => {
    const tags = documentCategorizer.generateTags(
      makeInput({
        textContent: "1099 form for 2025 tax year",
        mimeType: "application/pdf",
      }),
    );

    expect(tags).toContain("1099");
    expect(tags).toContain("year-2025");
    expect(tags).toContain("pdf");
  });

  it("handles input with no matching patterns", () => {
    const tags = documentCategorizer.generateTags(
      makeInput({ textContent: "nothing special here" }),
    );

    // Should be empty or only have format tags
    expect(tags.filter((t) => !t.startsWith("year-"))).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Batch Categorization
// ═══════════════════════════════════════════════════════════════════════════════

describe("DocumentCategorizer.categorizeBatch", () => {
  it("categorizes multiple documents at once", () => {
    const inputs: CategorizationInput[] = [
      makeInput({ fileName: "W-2_2025.pdf" }),
      makeInput({ fileName: "bank_statement.pdf" }),
      makeInput({ fileName: "passport_scan.jpg" }),
      makeInput({ fileName: "insurance_policy.pdf" }),
      makeInput({ fileName: "court_order.pdf" }),
    ];

    const results = documentCategorizer.categorizeBatch(inputs);

    expect(results).toHaveLength(5);
    expectCategory(results[0], "tax");
    expectCategory(results[1], "financial");
    expectCategory(results[2], "identity");
    expectCategory(results[3], "insurance");
    expectCategory(results[4], "legal");
  });

  it("returns empty array for empty input", () => {
    const results = documentCategorizer.categorizeBatch([]);
    expect(results).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Edge Cases and Utility Methods
// ═══════════════════════════════════════════════════════════════════════════════

describe("DocumentCategorizer - edge cases", () => {
  it("handles input with no fields set", () => {
    const result = documentCategorizer.categorize(makeInput());
    expectCategory(result, "other");
    expect(result.confidence).toBe(0);
    expect(result.matchedKeywords).toEqual([]);
  });

  it("handles undefined text content", () => {
    const result = documentCategorizer.categorize(
      makeInput({ fileName: "file.pdf", textContent: undefined }),
    );
    // Should still use filename-based categorization
    expect(result).toBeDefined();
  });

  it("is case-insensitive for keyword matching", () => {
    const result = documentCategorizer.categorize(
      makeInput({
        textContent: "BANK STATEMENT ACCOUNT TRANSACTION DEPOSIT",
      }),
    );
    expectCategory(result, "financial");
  });

  it("returns all six categories", () => {
    const categories = documentCategorizer.getCategories();
    expect(categories).toEqual([
      "tax",
      "financial",
      "identity",
      "insurance",
      "legal",
      "other",
    ]);
  });

  it("returns the category keywords dictionary", () => {
    const keywords = documentCategorizer.getCategoryKeywords();
    expect(keywords.tax.length).toBeGreaterThan(0);
    expect(keywords.financial.length).toBeGreaterThan(0);
    expect(keywords.identity.length).toBeGreaterThan(0);
    expect(keywords.insurance.length).toBeGreaterThan(0);
    expect(keywords.legal.length).toBeGreaterThan(0);
    expect(keywords.other).toEqual([]);
  });

  it("scores array contains all categories", () => {
    const result = documentCategorizer.categorize(
      makeInput({ textContent: "tax return" }),
    );

    const categories = result.scores.map((s) => s.category);
    expect(categories).toContain("tax");
    expect(categories).toContain("financial");
    expect(categories).toContain("identity");
    expect(categories).toContain("insurance");
    expect(categories).toContain("legal");
    expect(categories).toContain("other");
  });

  it("scores array is sorted by score descending", () => {
    const result = documentCategorizer.categorize(
      makeInput({
        textContent:
          "Tax return W-2 IRS taxable income withholding adjusted gross income",
      }),
    );

    for (let i = 0; i < result.scores.length - 1; i++) {
      expect(result.scores[i].score).toBeGreaterThanOrEqual(
        result.scores[i + 1].score,
      );
    }
  });

  it("matched keywords are deduplicated", () => {
    const result = documentCategorizer.categorize(
      makeInput({
        textContent:
          "tax return tax return tax return IRS IRS IRS withholding",
      }),
    );

    const uniqueKeywords = [...new Set(result.matchedKeywords)];
    expect(result.matchedKeywords).toEqual(uniqueKeywords);
  });
});
