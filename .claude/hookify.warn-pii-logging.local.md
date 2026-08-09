---
name: warn-pii-logging
enabled: true
event: file
conditions:
  - field: new_text
    operator: regex_match
    pattern: console\.log\s*\(.*\b(email|phone|address|ssn|credit.score|account.number|routing.number|password|token)\b
---

**WARNING: Potential PII in console.log statement.**

You may be logging Personally Identifiable Information. Under GDPR/CCPA:
- Email addresses, phone numbers, physical addresses, financial data, and credentials are PII
- PII must NEVER appear in application logs
- Use structured logging and redact sensitive fields before logging

**Fix:** Remove PII from the log statement or use a sanitized identifier (e.g., user ID, hashed email).
