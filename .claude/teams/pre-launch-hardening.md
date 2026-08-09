---
name: pre-launch-hardening
description: "Final ship-gate team — performance, PII compliance, audit closure before public launch."
lead: audit-remediator
agents: [perf-investigator, pii-compliance-auditor, audit-remediator, stripe-webhook-engineer, rls-policy-tester]
---

# Pre-Launch Hardening Team

## Mission
Take the codebase from "Wave 7 closed" to "ready for public users."

## Trigger
- `gap_analysis.md`: 0 CRITICAL + 0 HIGH open
- Wave 7 master plan all phases complete
- Founder approves launch readiness check

## Workflow
1. **perf-investigator** runs the full perf audit:
   - Bundle analysis → meets < 250KB initial JS
   - Lighthouse CI → ≥ 90 on perf, a11y, best-practices
   - RLS query plans → p95 < 100ms
   - Artillery load test → no degradation under expected traffic
2. **pii-compliance-auditor** runs the full PII audit:
   - Hookify guards verified active
   - Right-to-export + right-to-delete endpoints work end-to-end
   - PII logging = 0 instances
   - Cookie consent before tracking
   - All third-party DPAs documented
   - **GDPR Art. 33 / CCPA disclosure procedure ready** (now that live users will exist)
3. **stripe-webhook-engineer** verifies subscription lifecycle:
   - Test trigger every webhook event
   - Idempotency confirmed (replay attack → 200 no-op)
   - Failed payment retry flow works
4. **rls-policy-tester** runs the FULL negative test suite (every policy, every table)
5. **audit-remediator** writes the launch readiness report

## Exit criteria
- All 4 audits PASS
- Launch readiness report in `docs/ssot/launch-readiness.md`
- Sign-off committed

## Hard rules
- No launch with ANY open CRITICAL
- No launch without disclosure procedures activated
- No launch without monitoring + on-call rotation documented
