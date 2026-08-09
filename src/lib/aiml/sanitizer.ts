/**
 * AI Input Sanitizer — CMP-7 (FND-062/063)
 *
 * Composes pii-protection.ts redaction + prompt-injection neutralisation.
 * Every user-derived value must pass through this module before it appears
 * in any payload sent to the AIML API.
 *
 * Design constraints:
 * - NEVER log the raw or sanitised text (warn-pii-logging hookify guard).
 * - NEVER import aiml-service directly (no-direct-aiml-service lint rule).
 * - User content MUST go in a clearly delimited user-role message,
 *   never concatenated into a system-prompt string.
 */

import { anonymizePII } from "@/lib/compliance/pii-protection";

// ============================================================================
// INJECTION PATTERNS
// ============================================================================

/**
 * Phrases and delimiters attackers use to override system prompts.
 * Each entry is a case-insensitive pattern to strip or neutralise.
 */
const INJECTION_PATTERNS: RegExp[] = [
  // Verbal overrides
  /ignore\s+(all\s+)?(previous|prior|earlier|above)\s+instructions?/gi,
  /disregard\s+(all\s+)?(previous|prior|earlier|above)\s+instructions?/gi,
  /forget\s+(all\s+)?(previous|prior|earlier|above)\s+instructions?/gi,
  /override\s+system\s+prompt/gi,
  /you\s+are\s+now\s+(DAN|jailbroken|unrestricted|freed)/gi,
  /act\s+as\s+(if\s+you\s+have\s+no\s+restrictions|DAN|an?\s+unrestricted)/gi,
  /pretend\s+(you\s+are|to\s+be)\s+(an?\s+)?(unrestricted|evil|unfiltered)/gi,
  /reveal\s+(your\s+)?(system\s+prompt|instructions|rules|training)/gi,
  /print\s+(your\s+)?(system\s+prompt|initial\s+prompt)/gi,
  /repeat\s+(your\s+)?(system\s+prompt|initial\s+prompt|instructions)/gi,

  // Role/delimiter tokens — ChatML, system-block, XML-like markers
  /<\|im_start\|>[\s\S]*?(<\|im_end\|>|$)/gi,
  /<\|im_end\|>/gi,
  /```\s*system[\s\S]*?```/gi,
  /\[SYSTEM\]/gi,
  /\[INST\]/gi,
  /\[\/INST\]/gi,
  /<system>[\s\S]*?<\/system>/gi,
  /<<SYS>>[\s\S]*?<\/SYS>>/gi,
];

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Sanitise a single user-supplied message string.
 *
 * Steps:
 * 1. Redact PII (SSN, card numbers, DOB, email, phone, IP) via anonymizePII.
 * 2. Neutralise known prompt-injection patterns.
 *
 * Returns a clean string safe for inclusion as the content of a
 * `{ role: "user", content: ... }` message. It MUST NOT be spliced
 * into a system-prompt template string.
 */
export function sanitizeUserInput(text: string): string {
  // Step 1: PII redaction
  const piiRedacted = anonymizePII(text, { method: "mask" });

  // Step 2: Injection neutralisation
  let sanitized = piiRedacted;
  for (const pattern of INJECTION_PATTERNS) {
    sanitized = sanitized.replace(pattern, "[FILTERED]");
  }

  return sanitized;
}

/**
 * Sanitise a JSON-serialised context value (e.g. JSON.stringify(context)
 * or JSON.stringify(intent)) before it is sent to the AI API.
 *
 * This is the same pipeline as sanitizeUserInput — PII redaction then
 * injection neutralisation — applied to the serialised JSON string.
 * The caller is responsible for ensuring the result is placed only in a
 * user-role or assistant-role message, never in a system-prompt string.
 */
export function sanitizeContextValue(jsonString: string): string {
  return sanitizeUserInput(jsonString);
}
