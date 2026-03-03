/**
 * Input Validation Service
 *
 * Provides comprehensive input validation and sanitization to protect against:
 * - Prompt injection attacks
 * - XSS (Cross-Site Scripting)
 * - SQL injection
 * - Command injection
 * - Excessive input lengths
 * - Malicious patterns
 */

export interface ValidationResult {
  isValid: boolean;
  sanitized: string;
  errors: string[];
  warnings: string[];
  risk: "low" | "medium" | "high" | "critical";
}

export interface ValidationOptions {
  maxLength?: number;
  allowHTML?: boolean;
  allowSpecialChars?: boolean;
  checkPromptInjection?: boolean;
  checkPII?: boolean;
  strictMode?: boolean;
}

/**
 * Default validation options
 */
const DEFAULT_OPTIONS: ValidationOptions = {
  maxLength: 10000,
  allowHTML: false,
  allowSpecialChars: true,
  checkPromptInjection: true,
  checkPII: true,
  strictMode: false,
};

/**
 * Prompt injection patterns to detect
 */
const PROMPT_INJECTION_PATTERNS = [
  /ignore\s+(previous|above|all)\s+instructions?/i,
  /disregard\s+(previous|above|all)\s+(instructions?|prompts?)/i,
  /forget\s+(everything|all|previous)/i,
  /you\s+are\s+now/i,
  /new\s+instructions?:/i,
  /system\s*:\s*/i,
  /\[SYSTEM\]/i,
  /\<\|im_start\|\>/i,
  /\<\|im_end\|\>/i,
  /\{\{.*system.*\}\}/i,
  /act\s+as\s+(if|though)/i,
  /pretend\s+(you|to\s+be)/i,
  /roleplay/i,
  /sudo\s+mode/i,
  /developer\s+mode/i,
  /jailbreak/i,
  /DAN\s+mode/i,
];

/**
 * PII patterns to detect
 */
const PII_PATTERNS = {
  ssn: /\b\d{3}-?\d{2}-?\d{4}\b/,
  creditCard: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/,
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/,
  phone: /\b(\+?1[-.]?)?\(?\d{3}\)?[-.]?\d{3}[-.]?\d{4}\b/,
  ipAddress: /\b(?:\d{1,3}\.){3}\d{1,3}\b/,
};

/**
 * Malicious patterns to detect
 */
const MALICIOUS_PATTERNS = [
  /<script[^>]*>.*?<\/script>/i,
  /javascript:/i,
  /on\w+\s*=/i, // Event handlers
  /eval\s*\(/i,
  /exec\s*\(/i,
  /system\s*\(/i,
  /\$\{.*\}/, // Template injection
  /\{\{.*\}\}/, // Template injection
  /\.\.\//, // Path traversal
  /\/etc\/passwd/i,
  /\/bin\/(bash|sh)/i,
  /cmd\.exe/i,
  /powershell/i,
];

/**
 * Validate and sanitize user input
 */
export function validateInput(
  input: string,
  options: ValidationOptions = {},
): ValidationResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const errors: string[] = [];
  const warnings: string[] = [];
  let sanitized = input;
  let risk: "low" | "medium" | "high" | "critical" = "low";

  // Check if input is empty
  if (!input || input.trim().length === 0) {
    errors.push("Input cannot be empty");
    return {
      isValid: false,
      sanitized: "",
      errors,
      warnings,
      risk: "low",
    };
  }

  // Check input length
  if (input.length > (opts.maxLength || 10000)) {
    errors.push(`Input exceeds maximum length of ${opts.maxLength} characters`);
    risk = "medium";
  }

  // Check for prompt injection attempts
  if (opts.checkPromptInjection) {
    for (const pattern of PROMPT_INJECTION_PATTERNS) {
      if (pattern.test(input)) {
        errors.push("Potential prompt injection detected");
        risk = "critical";
        break;
      }
    }
  }

  // Check for PII
  if (opts.checkPII) {
    for (const [type, pattern] of Object.entries(PII_PATTERNS)) {
      if (pattern.test(input)) {
        warnings.push(`Potential PII detected: ${type}`);
        if (risk === "low") risk = "medium";
      }
    }
  }

  // Check for malicious patterns
  for (const pattern of MALICIOUS_PATTERNS) {
    if (pattern.test(input)) {
      errors.push("Potentially malicious content detected");
      risk = "critical";
      break;
    }
  }

  // Sanitize HTML if not allowed
  if (!opts.allowHTML) {
    sanitized = sanitizeHTML(sanitized);
  }

  // Sanitize special characters if not allowed
  if (!opts.allowSpecialChars) {
    sanitized = sanitizeSpecialChars(sanitized);
  }

  // Trim whitespace
  sanitized = sanitized.trim();

  // Normalize whitespace
  sanitized = sanitized.replace(/\s+/g, " ");

  // In strict mode, reject any input with errors
  const isValid = opts.strictMode
    ? errors.length === 0
    : errors.length === 0 || risk !== "critical";

  return {
    isValid,
    sanitized,
    errors,
    warnings,
    risk,
  };
}

/**
 * Sanitize HTML tags and entities
 */
function sanitizeHTML(input: string): string {
  return input
    .replace(/<[^>]*>/g, "") // Remove HTML tags
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/");
}

/**
 * Sanitize special characters
 */
function sanitizeSpecialChars(input: string): string {
  return input.replace(/[^\w\s.,!?-]/g, "");
}

/**
 * Validate credit report input
 */
export function validateCreditReportInput(input: string): ValidationResult {
  return validateInput(input, {
    maxLength: 50000, // Credit reports can be long
    allowHTML: false,
    allowSpecialChars: true,
    checkPromptInjection: true,
    checkPII: false, // Credit reports contain PII by nature
    strictMode: false,
  });
}

/**
 * Validate dispute letter input
 */
export function validateDisputeInput(input: string): ValidationResult {
  return validateInput(input, {
    maxLength: 5000,
    allowHTML: false,
    allowSpecialChars: true,
    checkPromptInjection: true,
    checkPII: true,
    strictMode: true,
  });
}

/**
 * Validate chat message input
 */
export function validateChatInput(input: string): ValidationResult {
  return validateInput(input, {
    maxLength: 2000,
    allowHTML: false,
    allowSpecialChars: true,
    checkPromptInjection: true,
    checkPII: true,
    strictMode: true,
  });
}

/**
 * Validate loan strategy input
 */
export function validateLoanInput(input: string): ValidationResult {
  return validateInput(input, {
    maxLength: 10000,
    allowHTML: false,
    allowSpecialChars: true,
    checkPromptInjection: true,
    checkPII: false, // Loan data contains personal info
    strictMode: false,
  });
}

/**
 * Check if input contains prompt injection
 */
export function hasPromptInjection(input: string): boolean {
  return PROMPT_INJECTION_PATTERNS.some((pattern) => pattern.test(input));
}

/**
 * Check if input contains PII
 */
export function hasPII(input: string): boolean {
  return Object.values(PII_PATTERNS).some((pattern) => pattern.test(input));
}

/**
 * Check if input contains malicious content
 */
export function hasMaliciousContent(input: string): boolean {
  return MALICIOUS_PATTERNS.some((pattern) => pattern.test(input));
}

/**
 * Redact PII from input
 */
export function redactPII(input: string): string {
  let redacted = input;

  // Use new RegExp with /g flag for replaceAll behavior (source patterns omit /g to avoid stateful .test())
  // Redact SSN
  redacted = redacted.replace(
    new RegExp(PII_PATTERNS.ssn.source, "g"),
    "XXX-XX-XXXX",
  );

  // Redact credit card
  redacted = redacted.replace(
    new RegExp(PII_PATTERNS.creditCard.source, "g"),
    "XXXX-XXXX-XXXX-XXXX",
  );

  // Redact email
  redacted = redacted.replace(
    new RegExp(PII_PATTERNS.email.source, "g"),
    "[EMAIL REDACTED]",
  );

  // Redact phone
  redacted = redacted.replace(
    new RegExp(PII_PATTERNS.phone.source, "g"),
    "[PHONE REDACTED]",
  );

  // Redact IP address
  redacted = redacted.replace(
    new RegExp(PII_PATTERNS.ipAddress.source, "g"),
    "[IP REDACTED]",
  );

  return redacted;
}

/**
 * Get risk level for input
 */
export function getRiskLevel(
  input: string,
): "low" | "medium" | "high" | "critical" {
  if (hasPromptInjection(input) || hasMaliciousContent(input)) {
    return "critical";
  }

  if (hasPII(input)) {
    return "medium";
  }

  if (input.length > 10000) {
    return "medium";
  }

  return "low";
}
