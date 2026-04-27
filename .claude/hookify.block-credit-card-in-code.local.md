---
name: block-credit-card-in-code
enabled: true
event: file
action: block
conditions:
  - field: new_text
    operator: regex_match
    pattern: \b(?:4\d{3}|5[1-5]\d{2}|3[47]\d{2}|6(?:011|5\d{2}))[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b|\bcvv\s*[:=]\s*["']\d{3}
---

**BLOCKED: Credit card number pattern detected in source code.**

You are writing what appears to be a credit card number or CVV directly in code.

**PCI-DSS compliance:**
- Card numbers and CVVs must NEVER appear in source code
- All payment processing goes through Stripe (tokenized)
- Use Stripe test card numbers only in test files: `4242424242424242`
- Never store, log, or transmit raw card data

**Fix:** Use Stripe tokens/IDs instead of raw card numbers. For tests, use Stripe's documented test cards.
