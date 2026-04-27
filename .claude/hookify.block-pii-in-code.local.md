---
name: block-pii-in-code
enabled: true
event: file
action: block
conditions:
  - field: new_text
    operator: regex_match
    pattern: \b\d{3}-\d{2}-\d{4}\b|\b\d{9}\b.*(?:ssn|social)|(?:ssn|social.security)\s*[:=]\s*["']\d
---

**BLOCKED: SSN pattern detected in source code.**

You are writing what appears to be a Social Security Number directly in code.

**Fynvita compliance (FCRA/GDPR/CCPA):**
- SSNs must NEVER appear in source code, comments, or test fixtures
- Use `src/lib/compliance/gdpr-ccpa.ts` encryption layer for PII storage
- Test data must use synthetic identifiers (e.g., `000-00-0000`)
- All PII access must be audit-logged

**Fix:** Remove the SSN and use an encrypted field reference or synthetic test data.
