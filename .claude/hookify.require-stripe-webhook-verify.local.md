---
name: require-stripe-webhook-verify
enabled: true
event: file
conditions:
  - field: file_path
    operator: regex_match
    pattern: webhook
  - field: new_text
    operator: not_contains
    pattern: constructEvent
---

**WARNING: Stripe webhook handler without signature verification.**

This file appears to be a webhook handler but doesn't contain `constructEvent` (Stripe signature verification).

**PCI-DSS requirement:**
- ALL Stripe webhook endpoints MUST verify the `stripe-signature` header
- Use `stripe.webhooks.constructEvent(body, sig, secret)` before processing any event
- Without verification, attackers can forge webhook payloads

**Fix:** Add signature verification at the top of the webhook handler before any event processing.
