/**
 * Document Categorizer Service
 *
 * Automatically categorizes documents based on:
 * - File name patterns
 * - MIME type hints
 * - Text content keyword analysis
 * - Confidence scoring
 * - Auto-tag generation from content
 *
 * Categories: tax, financial, identity, insurance, legal, other
 */

// ── Types ────────────────────────────────────────────────────────────────────

/** Document categories for classification. */
export type DocumentCategory =
  | "tax"
  | "financial"
  | "identity"
  | "insurance"
  | "legal"
  | "other";

/** Result of a categorization operation. */
export interface CategorizationResult {
  /** Primary category assignment. */
  category: DocumentCategory;
  /** Confidence score for the primary category (0-1). */
  confidence: number;
  /** All category scores, sorted by confidence descending. */
  scores: CategoryScore[];
  /** Auto-generated tags based on content analysis. */
  tags: string[];
  /** Keywords that influenced the categorization. */
  matchedKeywords: string[];
  /** Method used for categorization. */
  method: "filename" | "content" | "combined" | "default";
}

/** Score for a single category. */
export interface CategoryScore {
  category: DocumentCategory;
  score: number;
}

/** Input for categorization. */
export interface CategorizationInput {
  /** Original file name. */
  fileName?: string;
  /** MIME type of the document. */
  mimeType?: string;
  /** Extracted text content (if available). */
  textContent?: string;
  /** Existing metadata that may inform categorization. */
  metadata?: Record<string, unknown>;
}

// ── Keyword Dictionaries ─────────────────────────────────────────────────────

/**
 * Keywords associated with each category.
 * Each keyword has a weight that contributes to the category score.
 */
const CATEGORY_KEYWORDS: Record<DocumentCategory, Array<{ keyword: string; weight: number }>> = {
  tax: [
    { keyword: "w-2", weight: 3 },
    { keyword: "w2", weight: 3 },
    { keyword: "1099", weight: 3 },
    { keyword: "1040", weight: 3 },
    { keyword: "tax return", weight: 3 },
    { keyword: "tax refund", weight: 2.5 },
    { keyword: "irs", weight: 2.5 },
    { keyword: "internal revenue", weight: 2.5 },
    { keyword: "taxable income", weight: 2 },
    { keyword: "tax deduction", weight: 2 },
    { keyword: "tax credit", weight: 2 },
    { keyword: "withholding", weight: 1.5 },
    { keyword: "employer identification", weight: 1.5 },
    { keyword: "ein", weight: 1 },
    { keyword: "filing status", weight: 2 },
    { keyword: "adjusted gross income", weight: 2.5 },
    { keyword: "agi", weight: 1.5 },
    { keyword: "schedule c", weight: 2 },
    { keyword: "schedule a", weight: 2 },
    { keyword: "schedule d", weight: 2 },
    { keyword: "form 8949", weight: 2 },
    { keyword: "capital gains", weight: 1.5 },
    { keyword: "estimated tax", weight: 2 },
    { keyword: "quarterly tax", weight: 2 },
    { keyword: "tax payment", weight: 1.5 },
    { keyword: "state tax", weight: 1.5 },
    { keyword: "federal tax", weight: 1.5 },
    { keyword: "property tax", weight: 1.5 },
    { keyword: "sales tax", weight: 1 },
  ],
  financial: [
    { keyword: "bank statement", weight: 3 },
    { keyword: "account statement", weight: 2.5 },
    { keyword: "balance", weight: 1 },
    { keyword: "transaction", weight: 1.5 },
    { keyword: "deposit", weight: 1 },
    { keyword: "withdrawal", weight: 1 },
    { keyword: "credit score", weight: 2.5 },
    { keyword: "credit report", weight: 3 },
    { keyword: "fico", weight: 2 },
    { keyword: "equifax", weight: 2 },
    { keyword: "experian", weight: 2 },
    { keyword: "transunion", weight: 2 },
    { keyword: "loan", weight: 1.5 },
    { keyword: "mortgage", weight: 2 },
    { keyword: "interest rate", weight: 1.5 },
    { keyword: "apr", weight: 1.5 },
    { keyword: "investment", weight: 1.5 },
    { keyword: "portfolio", weight: 1.5 },
    { keyword: "dividend", weight: 1.5 },
    { keyword: "brokerage", weight: 2 },
    { keyword: "401k", weight: 2 },
    { keyword: "ira", weight: 1.5 },
    { keyword: "retirement", weight: 1.5 },
    { keyword: "savings account", weight: 2 },
    { keyword: "checking account", weight: 2 },
    { keyword: "wire transfer", weight: 1.5 },
    { keyword: "routing number", weight: 2 },
    { keyword: "account number", weight: 1.5 },
    { keyword: "pay stub", weight: 2 },
    { keyword: "paycheck", weight: 2 },
    { keyword: "income verification", weight: 2 },
    { keyword: "profit and loss", weight: 2 },
    { keyword: "p&l", weight: 1.5 },
    { keyword: "budget", weight: 1 },
    { keyword: "expense report", weight: 2 },
  ],
  identity: [
    { keyword: "driver license", weight: 3 },
    { keyword: "drivers license", weight: 3 },
    { keyword: "driver's license", weight: 3 },
    { keyword: "passport", weight: 3 },
    { keyword: "social security", weight: 3 },
    { keyword: "ssn", weight: 2.5 },
    { keyword: "birth certificate", weight: 3 },
    { keyword: "state id", weight: 2.5 },
    { keyword: "identification card", weight: 2.5 },
    { keyword: "photo id", weight: 2 },
    { keyword: "date of birth", weight: 1.5 },
    { keyword: "dob", weight: 1 },
    { keyword: "place of birth", weight: 1.5 },
    { keyword: "citizenship", weight: 1.5 },
    { keyword: "nationality", weight: 1.5 },
    { keyword: "resident card", weight: 2 },
    { keyword: "green card", weight: 2.5 },
    { keyword: "visa", weight: 1.5 },
    { keyword: "immigration", weight: 1.5 },
    { keyword: "naturalization", weight: 2 },
    { keyword: "proof of identity", weight: 2.5 },
    { keyword: "utility bill", weight: 1.5 },
    { keyword: "proof of address", weight: 2 },
  ],
  insurance: [
    { keyword: "insurance policy", weight: 3 },
    { keyword: "insurance premium", weight: 2.5 },
    { keyword: "coverage", weight: 1.5 },
    { keyword: "deductible", weight: 2 },
    { keyword: "copay", weight: 2 },
    { keyword: "claim", weight: 1.5 },
    { keyword: "policyholder", weight: 2.5 },
    { keyword: "beneficiary", weight: 1.5 },
    { keyword: "underwriting", weight: 2 },
    { keyword: "health insurance", weight: 3 },
    { keyword: "auto insurance", weight: 3 },
    { keyword: "car insurance", weight: 3 },
    { keyword: "home insurance", weight: 3 },
    { keyword: "homeowners insurance", weight: 3 },
    { keyword: "renters insurance", weight: 3 },
    { keyword: "life insurance", weight: 3 },
    { keyword: "dental insurance", weight: 2.5 },
    { keyword: "vision insurance", weight: 2.5 },
    { keyword: "disability insurance", weight: 2.5 },
    { keyword: "umbrella policy", weight: 2 },
    { keyword: "explanation of benefits", weight: 2.5 },
    { keyword: "eob", weight: 2 },
    { keyword: "hmo", weight: 1.5 },
    { keyword: "ppo", weight: 1.5 },
    { keyword: "out of pocket", weight: 1 },
    { keyword: "liability", weight: 1 },
  ],
  legal: [
    { keyword: "contract", weight: 2 },
    { keyword: "agreement", weight: 1.5 },
    { keyword: "terms and conditions", weight: 2 },
    { keyword: "non-disclosure", weight: 2.5 },
    { keyword: "nda", weight: 2 },
    { keyword: "power of attorney", weight: 3 },
    { keyword: "affidavit", weight: 3 },
    { keyword: "notarized", weight: 2 },
    { keyword: "notary", weight: 2 },
    { keyword: "witness", weight: 1 },
    { keyword: "court order", weight: 3 },
    { keyword: "subpoena", weight: 3 },
    { keyword: "lawsuit", weight: 2.5 },
    { keyword: "plaintiff", weight: 2 },
    { keyword: "defendant", weight: 2 },
    { keyword: "attorney", weight: 1.5 },
    { keyword: "legal counsel", weight: 2 },
    { keyword: "deed", weight: 2 },
    { keyword: "title", weight: 1 },
    { keyword: "lien", weight: 2 },
    { keyword: "judgment", weight: 2 },
    { keyword: "settlement", weight: 1.5 },
    { keyword: "arbitration", weight: 2 },
    { keyword: "mediation", weight: 2 },
    { keyword: "will and testament", weight: 3 },
    { keyword: "trust", weight: 1.5 },
    { keyword: "estate", weight: 1.5 },
    { keyword: "probate", weight: 2.5 },
    { keyword: "dissolution", weight: 2 },
    { keyword: "divorce decree", weight: 3 },
    { keyword: "custody", weight: 2 },
    { keyword: "restraining order", weight: 2.5 },
    { keyword: "cease and desist", weight: 2.5 },
    { keyword: "dispute letter", weight: 2 },
  ],
  other: [],
};

/**
 * File name patterns that strongly indicate a category.
 * Matched against the lowercased file name.
 */
const FILENAME_PATTERNS: Array<{ pattern: RegExp; category: DocumentCategory; weight: number }> = [
  // Tax
  { pattern: /w[_-]?2/i, category: "tax", weight: 3 },
  { pattern: /1099/i, category: "tax", weight: 3 },
  { pattern: /1040/i, category: "tax", weight: 3 },
  { pattern: /tax[_\s-]?return/i, category: "tax", weight: 3 },
  { pattern: /tax[_\s-]?form/i, category: "tax", weight: 2.5 },
  { pattern: /schedule[_\s-]?[a-d]/i, category: "tax", weight: 2 },

  // Financial
  { pattern: /bank[_\s-]?statement/i, category: "financial", weight: 3 },
  { pattern: /credit[_\s-]?report/i, category: "financial", weight: 3 },
  { pattern: /pay[_\s-]?stub/i, category: "financial", weight: 2.5 },
  { pattern: /income[_\s-]?verification/i, category: "financial", weight: 2.5 },
  { pattern: /profit[_\s-]?(and|&)[_\s-]?loss/i, category: "financial", weight: 2.5 },
  { pattern: /expense[_\s-]?report/i, category: "financial", weight: 2 },
  { pattern: /invoice/i, category: "financial", weight: 2 },
  { pattern: /receipt/i, category: "financial", weight: 1.5 },

  // Identity
  { pattern: /driver[_\s'-]?s?[_\s-]?licen[sc]e/i, category: "identity", weight: 3 },
  { pattern: /passport/i, category: "identity", weight: 3 },
  { pattern: /birth[_\s-]?cert/i, category: "identity", weight: 3 },
  { pattern: /state[_\s-]?id/i, category: "identity", weight: 2.5 },
  { pattern: /photo[_\s-]?id/i, category: "identity", weight: 2 },
  { pattern: /ssn/i, category: "identity", weight: 2 },
  { pattern: /social[_\s-]?security/i, category: "identity", weight: 2.5 },

  // Insurance
  { pattern: /insurance[_\s-]?policy/i, category: "insurance", weight: 3 },
  { pattern: /insurance[_\s-]?card/i, category: "insurance", weight: 2.5 },
  { pattern: /eob/i, category: "insurance", weight: 2 },
  { pattern: /explanation[_\s-]?of[_\s-]?benefits/i, category: "insurance", weight: 2.5 },

  // Legal
  { pattern: /contract/i, category: "legal", weight: 2 },
  { pattern: /agreement/i, category: "legal", weight: 1.5 },
  { pattern: /power[_\s-]?of[_\s-]?attorney/i, category: "legal", weight: 3 },
  { pattern: /affidavit/i, category: "legal", weight: 3 },
  { pattern: /court[_\s-]?order/i, category: "legal", weight: 3 },
  { pattern: /deed/i, category: "legal", weight: 2 },
  { pattern: /dispute[_\s-]?letter/i, category: "legal", weight: 2 },
];

// ── Tag Dictionaries ─────────────────────────────────────────────────────────

/**
 * Keywords that generate specific tags when found in content.
 */
const TAG_KEYWORDS: Array<{ pattern: RegExp; tag: string }> = [
  // Tax-related tags
  { pattern: /w[_-]?2/i, tag: "w2" },
  { pattern: /1099/i, tag: "1099" },
  { pattern: /1040/i, tag: "1040" },
  { pattern: /tax[_\s-]?return/i, tag: "tax-return" },
  { pattern: /tax[_\s-]?refund/i, tag: "tax-refund" },
  { pattern: /\birs\b/i, tag: "irs" },

  // Financial tags
  { pattern: /bank[_\s-]?statement/i, tag: "bank-statement" },
  { pattern: /credit[_\s-]?(score|report)/i, tag: "credit" },
  { pattern: /mortgage/i, tag: "mortgage" },
  { pattern: /\bloan\b/i, tag: "loan" },
  { pattern: /investment/i, tag: "investment" },
  { pattern: /401k|ira\b/i, tag: "retirement" },
  { pattern: /pay[_\s-]?stub|paycheck/i, tag: "income" },
  { pattern: /invoice/i, tag: "invoice" },
  { pattern: /receipt/i, tag: "receipt" },

  // Identity tags
  { pattern: /passport/i, tag: "passport" },
  { pattern: /driver[_\s'-]?s?[_\s-]?licen[sc]e/i, tag: "drivers-license" },
  { pattern: /social[_\s-]?security/i, tag: "ssn" },
  { pattern: /birth[_\s-]?cert/i, tag: "birth-certificate" },

  // Insurance tags
  { pattern: /health[_\s-]?insurance/i, tag: "health-insurance" },
  { pattern: /auto[_\s-]?insurance|car[_\s-]?insurance/i, tag: "auto-insurance" },
  { pattern: /home[_\s-]?insurance|homeowner/i, tag: "home-insurance" },
  { pattern: /life[_\s-]?insurance/i, tag: "life-insurance" },

  // Legal tags
  { pattern: /contract/i, tag: "contract" },
  { pattern: /court/i, tag: "court" },
  { pattern: /dispute/i, tag: "dispute" },
  { pattern: /power[_\s-]?of[_\s-]?attorney/i, tag: "poa" },

  // Year detection
  { pattern: /\b(202[0-9])\b/, tag: "year-$1" },
  { pattern: /\b(201[0-9])\b/, tag: "year-$1" },
];

// ── Service Class ────────────────────────────────────────────────────────────

/**
 * Document Categorizer
 *
 * Analyzes documents to determine their category and generate tags.
 * Uses a multi-signal approach: file name, MIME type, and text content.
 */
class DocumentCategorizer {
  /**
   * Categorize a document based on available information.
   *
   * @param input - The categorization input with filename, mimeType, and/or textContent
   * @returns CategorizationResult with category, confidence, scores, and tags
   */
  categorize(input: CategorizationInput): CategorizationResult {
    const categoryScores: Record<DocumentCategory, number> = {
      tax: 0,
      financial: 0,
      identity: 0,
      insurance: 0,
      legal: 0,
      other: 0,
    };

    const matchedKeywords: string[] = [];
    let method: CategorizationResult["method"] = "default";

    // 1. Score based on file name
    const fileNameScore = this.scoreByFileName(input.fileName, categoryScores);
    if (fileNameScore > 0) {
      method = "filename";
    }

    // 2. Score based on text content
    const contentScore = this.scoreByContent(input.textContent, categoryScores, matchedKeywords);
    if (contentScore > 0) {
      method = fileNameScore > 0 ? "combined" : "content";
    }

    // 3. Generate tags
    const tags = this.generateTags(input);

    // 4. Determine winning category
    const scores = this.buildSortedScores(categoryScores);
    const topScore = scores[0];

    // Calculate confidence (0-1) based on score magnitude and margin
    const confidence = this.calculateConfidence(scores);

    return {
      category: topScore.score > 0 ? topScore.category : "other",
      confidence,
      scores,
      tags,
      matchedKeywords: [...new Set(matchedKeywords)],
      method: topScore.score > 0 ? method : "default",
    };
  }

  /**
   * Categorize multiple documents in batch.
   *
   * @param inputs - Array of categorization inputs
   * @returns Array of CategorizationResults in the same order
   */
  categorizeBatch(inputs: CategorizationInput[]): CategorizationResult[] {
    return inputs.map((input) => this.categorize(input));
  }

  /**
   * Get the category keywords dictionary (for testing/debugging).
   */
  getCategoryKeywords(): Record<DocumentCategory, Array<{ keyword: string; weight: number }>> {
    return CATEGORY_KEYWORDS;
  }

  /**
   * Get all supported categories.
   */
  getCategories(): DocumentCategory[] {
    return ["tax", "financial", "identity", "insurance", "legal", "other"];
  }

  /**
   * Generate tags from document content and metadata.
   * Exposed publicly for standalone tag generation.
   *
   * @param input - The categorization input
   * @returns Array of unique tags
   */
  generateTags(input: CategorizationInput): string[] {
    const tags: Set<string> = new Set();
    const combinedText = [input.fileName ?? "", input.textContent ?? ""].join(" ");

    for (const { pattern, tag } of TAG_KEYWORDS) {
      const match = combinedText.match(pattern);
      if (match) {
        // Handle dynamic tags (e.g., year-2025)
        if (tag.includes("$1") && match[1]) {
          tags.add(tag.replace("$1", match[1]));
        } else {
          tags.add(tag);
        }
      }
    }

    // Add format-based tags
    if (input.mimeType) {
      if (input.mimeType === "application/pdf") {
        tags.add("pdf");
      } else if (input.mimeType.startsWith("image/")) {
        tags.add("image");
      }
    }

    return Array.from(tags).sort();
  }

  // ── Private Methods ──────────────────────────────────────────────────────

  /**
   * Score categories based on file name pattern matching.
   */
  private scoreByFileName(
    fileName: string | undefined,
    scores: Record<DocumentCategory, number>,
  ): number {
    if (!fileName) return 0;

    let totalScore = 0;
    const lowerName = fileName.toLowerCase();

    for (const { pattern, category, weight } of FILENAME_PATTERNS) {
      if (pattern.test(lowerName)) {
        scores[category] += weight;
        totalScore += weight;
      }
    }

    return totalScore;
  }

  /**
   * Score categories based on text content keyword matching.
   */
  private scoreByContent(
    textContent: string | undefined,
    scores: Record<DocumentCategory, number>,
    matchedKeywords: string[],
  ): number {
    if (!textContent || textContent.trim().length === 0) return 0;

    let totalScore = 0;
    const lowerContent = textContent.toLowerCase();

    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS) as Array<
      [DocumentCategory, Array<{ keyword: string; weight: number }>]
    >) {
      for (const { keyword, weight } of keywords) {
        if (lowerContent.includes(keyword)) {
          scores[category] += weight;
          totalScore += weight;
          matchedKeywords.push(keyword);
        }
      }
    }

    return totalScore;
  }

  /**
   * Build sorted category scores from the raw score map.
   */
  private buildSortedScores(
    rawScores: Record<DocumentCategory, number>,
  ): CategoryScore[] {
    const total = Object.values(rawScores).reduce((sum, s) => sum + s, 0);

    return Object.entries(rawScores)
      .map(([category, score]) => ({
        category: category as DocumentCategory,
        score: total > 0 ? Math.round((score / total) * 100) / 100 : 0,
      }))
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Calculate confidence based on the score distribution.
   * Higher confidence when the top category has a clear lead.
   */
  private calculateConfidence(scores: CategoryScore[]): number {
    if (scores.length === 0 || scores[0].score === 0) {
      return 0;
    }

    const topScore = scores[0].score;
    const secondScore = scores.length > 1 ? scores[1].score : 0;

    // Confidence is based on:
    // 1. The absolute score of the top category
    // 2. The margin between top and second category
    const margin = secondScore > 0 ? (topScore - secondScore) / topScore : 1;
    const absoluteConfidence = Math.min(topScore * 1.5, 1);

    // Weighted average of margin and absolute confidence
    const confidence = absoluteConfidence * 0.6 + margin * 0.4;

    return Math.round(Math.min(confidence, 1) * 100) / 100;
  }
}

// Export singleton instance
export const documentCategorizer = new DocumentCategorizer();
export default documentCategorizer;
