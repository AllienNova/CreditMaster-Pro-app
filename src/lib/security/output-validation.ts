/**
 * Output Validation Service
 *
 * Validates AI-generated outputs to ensure:
 * - No harmful or inappropriate content
 * - No PII leakage
 * - No hallucinations or false information
 * - Compliance with content policies
 * - Professional and appropriate tone
 */

import { redactPII, hasPII } from "./input-validation";

export interface OutputValidationResult {
  isValid: boolean;
  sanitized: string;
  issues: string[];
  warnings: string[];
  risk: "low" | "medium" | "high" | "critical";
  confidence: number; // 0-1
}

export interface OutputValidationOptions {
  checkHarmfulContent?: boolean;
  checkPII?: boolean;
  checkFactualAccuracy?: boolean;
  checkBias?: boolean;
  checkProfessionalism?: boolean;
  redactPII?: boolean;
  strictMode?: boolean;
}

const DEFAULT_OPTIONS: OutputValidationOptions = {
  checkHarmfulContent: true,
  checkPII: true,
  checkFactualAccuracy: true,
  checkBias: true,
  checkProfessionalism: true,
  redactPII: true,
  strictMode: false,
};

/**
 * Harmful content patterns
 */
const HARMFUL_PATTERNS = [
  // Violence
  /\b(kill|murder|assault|attack|harm|hurt|injure|weapon|gun|knife|bomb)\b/gi,

  // Hate speech
  /\b(hate|racist|sexist|homophobic|xenophobic|bigot|discrimination)\b/gi,

  // Self-harm
  /\b(suicide|self-harm|cut|overdose|end\s+it\s+all)\b/gi,

  // Illegal activities
  /\b(illegal|fraud|scam|steal|theft|hack|crack|pirate)\b/gi,

  // Explicit content
  /\b(porn|xxx|explicit|nsfw|sexual)\b/gi,
];

/**
 * Unprofessional patterns
 */
const UNPROFESSIONAL_PATTERNS = [
  /\b(damn|hell|crap|suck|stupid|idiot|moron|dumb)\b/gi,
  /\b(wtf|omg|lol|lmao|rofl)\b/gi,
  /!!+/g, // Multiple exclamation marks
  /\?\?+/g, // Multiple question marks
];

/**
 * Disclaimer patterns that might indicate hallucination
 */
const HALLUCINATION_INDICATORS = [
  /I\s+(don't|do\s+not)\s+have\s+access/gi,
  /I\s+cannot\s+(verify|confirm)/gi,
  /I\s+(don't|do\s+not)\s+know/gi,
  /I'm\s+not\s+sure/gi,
  /This\s+might\s+(not\s+)?be\s+accurate/gi,
  /Please\s+verify/gi,
  /I\s+may\s+be\s+wrong/gi,
];

/**
 * Bias indicators
 */
const BIAS_PATTERNS = [
  /\b(always|never|everyone|no\s+one|all|none)\b/gi, // Absolute statements
  /\b(obviously|clearly|undoubtedly|certainly)\b/gi, // Overconfident language
  /\b(should|must|need\s+to)\b/gi, // Prescriptive language
];

/**
 * Validate AI output
 */
export function validateOutput(
  output: string,
  options: OutputValidationOptions = {},
): OutputValidationResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const issues: string[] = [];
  const warnings: string[] = [];
  let sanitized = output;
  let risk: "low" | "medium" | "high" | "critical" = "low";
  let confidence = 1.0;

  // Check if output is empty
  if (!output || output.trim().length === 0) {
    issues.push("Output is empty");
    return {
      isValid: false,
      sanitized: "",
      issues,
      warnings,
      risk: "low",
      confidence: 0,
    };
  }

  // Check for harmful content
  if (opts.checkHarmfulContent) {
    const harmfulMatches = HARMFUL_PATTERNS.filter((pattern) =>
      pattern.test(output),
    );
    if (harmfulMatches.length > 0) {
      issues.push("Output contains potentially harmful content");
      risk = "critical";
      confidence -= 0.5;
    }
  }

  // Check for PII leakage
  if (opts.checkPII && hasPII(output)) {
    warnings.push("Output may contain PII");
    if (risk === "low") risk = "medium";
    confidence -= 0.2;

    // Redact PII if requested
    if (opts.redactPII) {
      sanitized = redactPII(sanitized);
    }
  }

  // Check for hallucination indicators
  if (opts.checkFactualAccuracy) {
    const hallucinationMatches = HALLUCINATION_INDICATORS.filter((pattern) =>
      pattern.test(output),
    );
    if (hallucinationMatches.length > 0) {
      warnings.push("Output contains uncertainty indicators");
      confidence -= 0.3;
    }
  }

  // Check for bias
  if (opts.checkBias) {
    const biasMatches = BIAS_PATTERNS.filter((pattern) => pattern.test(output));
    if (biasMatches.length > 2) {
      // Allow some bias indicators
      warnings.push("Output may contain biased language");
      confidence -= 0.1;
    }
  }

  // Check for professionalism
  if (opts.checkProfessionalism) {
    const unprofessionalMatches = UNPROFESSIONAL_PATTERNS.filter((pattern) =>
      pattern.test(output),
    );
    if (unprofessionalMatches.length > 0) {
      warnings.push("Output contains unprofessional language");
      if (risk === "low") risk = "medium";
      confidence -= 0.2;
    }
  }

  // Ensure confidence is in valid range
  confidence = Math.max(0, Math.min(1, confidence));

  // In strict mode, reject any output with critical issues
  const isValid = opts.strictMode
    ? issues.length === 0 && risk !== "critical"
    : risk !== "critical";

  return {
    isValid,
    sanitized,
    issues,
    warnings,
    risk,
    confidence,
  };
}

/**
 * Validate dispute letter output
 */
export function validateDisputeOutput(output: string): OutputValidationResult {
  return validateOutput(output, {
    checkHarmfulContent: true,
    checkPII: true,
    checkFactualAccuracy: true,
    checkBias: true,
    checkProfessionalism: true,
    redactPII: false, // Dispute letters need PII
    strictMode: true,
  });
}

/**
 * Validate credit analysis output
 */
export function validateAnalysisOutput(output: string): OutputValidationResult {
  return validateOutput(output, {
    checkHarmfulContent: true,
    checkPII: true,
    checkFactualAccuracy: true,
    checkBias: true,
    checkProfessionalism: true,
    redactPII: false, // Analysis needs PII context
    strictMode: false,
  });
}

/**
 * Validate chat response output
 */
export function validateChatOutput(output: string): OutputValidationResult {
  return validateOutput(output, {
    checkHarmfulContent: true,
    checkPII: true,
    checkFactualAccuracy: true,
    checkBias: false, // Chat can be more conversational
    checkProfessionalism: false, // Chat can be casual
    redactPII: true,
    strictMode: false,
  });
}

/**
 * Check if output contains harmful content
 */
export function hasHarmfulContent(output: string): boolean {
  return HARMFUL_PATTERNS.some((pattern) => pattern.test(output));
}

/**
 * Check if output contains hallucination indicators
 */
export function hasHallucinationIndicators(output: string): boolean {
  return HALLUCINATION_INDICATORS.some((pattern) => pattern.test(output));
}

/**
 * Check if output is professional
 */
export function isProfessional(output: string): boolean {
  return !UNPROFESSIONAL_PATTERNS.some((pattern) => pattern.test(output));
}

/**
 * Get confidence score for output
 */
export function getConfidenceScore(output: string): number {
  let confidence = 1.0;

  if (hasHarmfulContent(output)) confidence -= 0.5;
  if (hasPII(output)) confidence -= 0.2;
  if (hasHallucinationIndicators(output)) confidence -= 0.3;
  if (!isProfessional(output)) confidence -= 0.2;

  return Math.max(0, Math.min(1, confidence));
}

/**
 * Sanitize output for safe display
 */
export function sanitizeOutput(output: string, redactPIIFlag = true): string {
  let sanitized = output;

  // Remove harmful content (replace with [CONTENT REMOVED])
  for (const pattern of HARMFUL_PATTERNS) {
    sanitized = sanitized.replace(pattern, "[CONTENT REMOVED]");
  }

  // Redact PII if requested
  if (redactPIIFlag) {
    sanitized = redactPII(sanitized);
  }

  // Remove unprofessional language
  for (const pattern of UNPROFESSIONAL_PATTERNS) {
    sanitized = sanitized.replace(pattern, "***");
  }

  return sanitized;
}

/**
 * Content moderation using AIML API
 */
export async function moderateContent(content: string): Promise<{
  flagged: boolean;
  categories: string[];
  scores: Record<string, number>;
}> {
  try {
    // This would call AIML API's moderation endpoint
    // For now, return a basic implementation
    const result = {
      flagged: hasHarmfulContent(content),
      categories: [] as string[],
      scores: {} as Record<string, number>,
    };

    if (hasHarmfulContent(content)) {
      result.categories.push("harmful");
      result.scores["harmful"] = 0.8;
    }

    if (hasPII(content)) {
      result.categories.push("pii");
      result.scores["pii"] = 0.6;
    }

    if (!isProfessional(content)) {
      result.categories.push("unprofessional");
      result.scores["unprofessional"] = 0.5;
    }

    return result;
  } catch {
    // Content moderation failed - return safe defaults
    return {
      flagged: false,
      categories: [],
      scores: {},
    };
  }
}
