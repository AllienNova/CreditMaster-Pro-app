/**
 * @jest-environment node
 */

import {
  validateOutput,
  validateDisputeOutput,
  validateAnalysisOutput,
  validateChatOutput,
  hasHarmfulContent,
  hasHallucinationIndicators,
  isProfessional,
  getConfidenceScore,
  sanitizeOutput,
  moderateContent,
} from "../output-validation";

// ═══════════════════════════════════════════════════════════════════════════════
//  validateOutput — basic
// ═══════════════════════════════════════════════════════════════════════════════
describe("Output Validation — validateOutput", () => {
  it("should accept clean professional text", () => {
    const result = validateOutput(
      "Based on your credit report, your score is 720. Here are some recommendations to improve it.",
    );
    expect(result.isValid).toBe(true);
    expect(result.risk).toBe("low");
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it("should reject empty output", () => {
    const result = validateOutput("");
    expect(result.isValid).toBe(false);
    expect(result.confidence).toBe(0);
    expect(result.issues).toContain("Output is empty");
  });

  it("should reject whitespace-only output", () => {
    const result = validateOutput("   ");
    expect(result.isValid).toBe(false);
  });

  it("should detect harmful content and set critical risk", () => {
    const result = validateOutput(
      "You should attack the person who caused this debt.",
    );
    expect(result.risk).toBe("critical");
    expect(result.issues.some((i) => i.includes("harmful"))).toBe(true);
  });

  it("should detect PII leakage and warn", () => {
    const result = validateOutput(
      "Your SSN 123-45-6789 has been verified.",
    );
    expect(result.warnings.some((w) => w.includes("PII"))).toBe(true);
  });

  it("should redact PII when redactPII option is true", () => {
    const result = validateOutput(
      "Your SSN 123-45-6789 is confirmed.",
      { redactPII: true },
    );
    expect(result.sanitized).toContain("XXX-XX-XXXX");
    expect(result.sanitized).not.toContain("123-45-6789");
  });

  it("should not redact PII when redactPII option is false", () => {
    const result = validateOutput(
      "Your SSN 123-45-6789 is confirmed.",
      { redactPII: false },
    );
    expect(result.sanitized).toContain("123-45-6789");
  });

  it("should detect hallucination indicators and reduce confidence", () => {
    const result = validateOutput(
      "I'm not sure about this, but I don't have access to your real credit report. Please verify these numbers.",
    );
    expect(result.warnings.some((w) => w.includes("uncertainty"))).toBe(true);
    expect(result.confidence).toBeLessThan(1.0);
  });

  it("should detect unprofessional language", () => {
    const result = validateOutput("That's a damn stupid question lol");
    expect(result.warnings.some((w) => w.includes("unprofessional"))).toBe(
      true,
    );
  });

  it("should detect biased language when excessive", () => {
    const result = validateOutput(
      "You should always do this. Everyone must follow this. You need to do it. Obviously this is the only way. Certainly you should never do anything else.",
    );
    expect(result.warnings.some((w) => w.includes("bias"))).toBe(true);
  });

  it("should keep confidence between 0 and 1", () => {
    // Trigger multiple confidence reductions
    const result = validateOutput(
      "I'm not sure, but you should kill this debt. SSN 123-45-6789. This is damn stupid lol.",
    );
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  validateOutput — strict mode
// ═══════════════════════════════════════════════════════════════════════════════
describe("Output Validation — strict mode", () => {
  it("should reject output with critical issues in strict mode", () => {
    const result = validateOutput(
      "You should hack into the credit bureau system.",
      { strictMode: true },
    );
    expect(result.isValid).toBe(false);
  });

  it("should accept clean output in strict mode", () => {
    const result = validateOutput(
      "Your credit utilization ratio is 30%. To improve, pay down balances.",
      { strictMode: true },
    );
    expect(result.isValid).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  validateOutput — options
// ═══════════════════════════════════════════════════════════════════════════════
describe("Output Validation — options", () => {
  it("should skip harmful content check when disabled", () => {
    const result = validateOutput(
      "This mentions a weapon in a historical context.",
      { checkHarmfulContent: false },
    );
    expect(result.issues.filter((i) => i.includes("harmful"))).toHaveLength(0);
  });

  it("should skip PII check when disabled", () => {
    const result = validateOutput("SSN 123-45-6789", { checkPII: false });
    expect(result.warnings.filter((w) => w.includes("PII"))).toHaveLength(0);
  });

  it("should skip factual accuracy check when disabled", () => {
    const result = validateOutput("I'm not sure about this.", {
      checkFactualAccuracy: false,
    });
    expect(
      result.warnings.filter((w) => w.includes("uncertainty")),
    ).toHaveLength(0);
  });

  it("should skip bias check when disabled", () => {
    const result = validateOutput(
      "You should always obviously certainly must never do this.",
      { checkBias: false },
    );
    expect(result.warnings.filter((w) => w.includes("bias"))).toHaveLength(0);
  });

  it("should skip professionalism check when disabled", () => {
    const result = validateOutput("That's damn cool lol", {
      checkProfessionalism: false,
    });
    expect(
      result.warnings.filter((w) => w.includes("unprofessional")),
    ).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  Domain-specific validators
// ═══════════════════════════════════════════════════════════════════════════════
describe("Output Validation — domain-specific validators", () => {
  it("validateDisputeOutput should use strict mode", () => {
    const result = validateDisputeOutput(
      "You should attack the credit bureau for this fraud.",
    );
    expect(result.isValid).toBe(false);
  });

  it("validateDisputeOutput should not redact PII", () => {
    const result = validateDisputeOutput(
      "Account holder SSN: 123-45-6789 disputes the following items.",
    );
    expect(result.sanitized).toContain("123-45-6789");
  });

  it("validateAnalysisOutput should not use strict mode", () => {
    const result = validateAnalysisOutput(
      "Your credit analysis is complete. Score improved from 650 to 720.",
    );
    expect(result.isValid).toBe(true);
  });

  it("validateChatOutput should skip bias and professionalism checks", () => {
    const result = validateChatOutput(
      "That's cool! You should always pay on time lol.",
    );
    // Chat is more lenient
    expect(result.isValid).toBe(true);
  });

  it("validateChatOutput should redact PII", () => {
    const result = validateChatOutput("My SSN is 123-45-6789");
    expect(result.sanitized).toContain("XXX-XX-XXXX");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  hasHarmfulContent
// ═══════════════════════════════════════════════════════════════════════════════
describe("Output Validation — hasHarmfulContent", () => {
  it("should detect violence-related words", () => {
    expect(hasHarmfulContent("You should attack them")).toBe(true);
  });

  it("should detect hate speech keywords", () => {
    expect(hasHarmfulContent("That's a racist remark")).toBe(true);
  });

  it("should detect self-harm references", () => {
    expect(hasHarmfulContent("thoughts of suicide")).toBe(true);
  });

  it("should return false for safe content", () => {
    expect(
      hasHarmfulContent(
        "Your credit score improvement plan looks great. Keep up the good work.",
      ),
    ).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  hasHallucinationIndicators
// ═══════════════════════════════════════════════════════════════════════════════
describe("Output Validation — hasHallucinationIndicators", () => {
  it("should detect 'I do not have access' pattern", () => {
    expect(
      hasHallucinationIndicators("I don't have access to your real data"),
    ).toBe(true);
  });

  it("should detect 'I cannot verify' pattern", () => {
    expect(hasHallucinationIndicators("I cannot verify this information")).toBe(
      true,
    );
  });

  it("should detect 'Please verify' pattern", () => {
    expect(
      hasHallucinationIndicators("Please verify these numbers with your bank"),
    ).toBe(true);
  });

  it("should return false for confident statements", () => {
    expect(
      hasHallucinationIndicators(
        "Your credit score is 720 based on the latest Experian report.",
      ),
    ).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  isProfessional
// ═══════════════════════════════════════════════════════════════════════════════
describe("Output Validation — isProfessional", () => {
  it("should return true for professional text", () => {
    expect(
      isProfessional(
        "We recommend reviewing your credit report quarterly for accuracy.",
      ),
    ).toBe(true);
  });

  it("should return false for text with profanity", () => {
    expect(isProfessional("That's damn annoying")).toBe(false);
  });

  it("should return false for text with internet slang", () => {
    expect(isProfessional("lol that's so rofl")).toBe(false);
  });

  it("should return false for excessive punctuation", () => {
    expect(isProfessional("Great news!!!")).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  getConfidenceScore
// ═══════════════════════════════════════════════════════════════════════════════
describe("Output Validation — getConfidenceScore", () => {
  it("should return 1.0 for clean output", () => {
    expect(
      getConfidenceScore(
        "Your financial health is improving based on the latest data.",
      ),
    ).toBe(1.0);
  });

  it("should reduce confidence for harmful content", () => {
    expect(getConfidenceScore("This is a scam operation")).toBeLessThan(1.0);
  });

  it("should reduce confidence for hallucination indicators", () => {
    expect(
      getConfidenceScore("I'm not sure about this. I may be wrong."),
    ).toBeLessThan(1.0);
  });

  it("should never go below 0", () => {
    const score = getConfidenceScore(
      "I'm not sure lol. This hack is a damn scam with SSN 123-45-6789.",
    );
    expect(score).toBeGreaterThanOrEqual(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  sanitizeOutput
// ═══════════════════════════════════════════════════════════════════════════════
describe("Output Validation — sanitizeOutput", () => {
  it("should remove harmful content", () => {
    const result = sanitizeOutput("You should attack the system to steal data.");
    expect(result).toContain("[CONTENT REMOVED]");
  });

  it("should redact PII by default", () => {
    const result = sanitizeOutput("SSN: 123-45-6789");
    expect(result).toContain("XXX-XX-XXXX");
  });

  it("should not redact PII when flag is false", () => {
    const result = sanitizeOutput("SSN: 123-45-6789", false);
    expect(result).toContain("123-45-6789");
  });

  it("should replace unprofessional language", () => {
    const result = sanitizeOutput("That's a damn good deal lol");
    expect(result).toContain("***");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  moderateContent
// ═══════════════════════════════════════════════════════════════════════════════
describe("Output Validation — moderateContent", () => {
  it("should flag harmful content", async () => {
    const result = await moderateContent("This is a fraud scheme");
    expect(result.flagged).toBe(true);
    expect(result.categories).toContain("harmful");
  });

  it("should detect PII", async () => {
    const result = await moderateContent("SSN: 123-45-6789");
    expect(result.categories).toContain("pii");
    expect(result.scores["pii"]).toBeGreaterThan(0);
  });

  it("should detect unprofessional content", async () => {
    const result = await moderateContent("This is damn stupid lol");
    expect(result.categories).toContain("unprofessional");
  });

  it("should return safe defaults for clean content", async () => {
    const result = await moderateContent(
      "Your financial plan is on track. Great progress this quarter.",
    );
    expect(result.flagged).toBe(false);
    expect(result.categories).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  Regex idempotency — verifies the /g flag stateful bug is fixed
// ═══════════════════════════════════════════════════════════════════════════════
describe("Output Validation — regex idempotency", () => {
  it("hasHarmfulContent should return the same result on repeated calls", () => {
    const input = "You should attack the system";
    expect(hasHarmfulContent(input)).toBe(true);
    expect(hasHarmfulContent(input)).toBe(true);
    expect(hasHarmfulContent(input)).toBe(true);
  });

  it("hasHallucinationIndicators should return the same result on repeated calls", () => {
    const input = "I don't have access to your real data";
    expect(hasHallucinationIndicators(input)).toBe(true);
    expect(hasHallucinationIndicators(input)).toBe(true);
    expect(hasHallucinationIndicators(input)).toBe(true);
  });

  it("isProfessional should return the same result on repeated calls", () => {
    const input = "That's a damn stupid question lol";
    expect(isProfessional(input)).toBe(false);
    expect(isProfessional(input)).toBe(false);
    expect(isProfessional(input)).toBe(false);
  });

  it("getConfidenceScore should return the same score on repeated calls", () => {
    const input = "This is a scam operation";
    const score1 = getConfidenceScore(input);
    const score2 = getConfidenceScore(input);
    const score3 = getConfidenceScore(input);
    expect(score1).toBe(score2);
    expect(score2).toBe(score3);
  });

  it("validateOutput should return consistent results on repeated calls", () => {
    const input =
      "You should attack the person. I'm not sure about this. SSN 123-45-6789.";
    const r1 = validateOutput(input);
    const r2 = validateOutput(input);
    const r3 = validateOutput(input);
    expect(r1.risk).toBe(r2.risk);
    expect(r2.risk).toBe(r3.risk);
    expect(r1.confidence).toBe(r2.confidence);
    expect(r2.confidence).toBe(r3.confidence);
    expect(r1.issues.length).toBe(r2.issues.length);
    expect(r1.warnings.length).toBe(r2.warnings.length);
  });

  it("sanitizeOutput should produce the same result on repeated calls", () => {
    const input = "You should attack the system. That's damn cool lol.";
    const s1 = sanitizeOutput(input);
    const s2 = sanitizeOutput(input);
    const s3 = sanitizeOutput(input);
    expect(s1).toBe(s2);
    expect(s2).toBe(s3);
  });

  it("moderateContent should produce consistent results on repeated calls", async () => {
    const input = "This is a fraud scheme. SSN: 123-45-6789. That's damn stupid lol.";
    const r1 = await moderateContent(input);
    const r2 = await moderateContent(input);
    const r3 = await moderateContent(input);
    expect(r1.flagged).toBe(r2.flagged);
    expect(r2.flagged).toBe(r3.flagged);
    expect(r1.categories).toEqual(r2.categories);
    expect(r2.categories).toEqual(r3.categories);
  });
});
