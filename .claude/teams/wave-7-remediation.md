---
name: wave-7-remediation
description: "Closes audit findings from gap_analysis.md. Highest-priority team — ship is BLOCKED until 33 CRITICAL + 38 HIGH are closed."
lead: audit-remediator
agents: [audit-remediator, supabase-rls-architect, stripe-webhook-engineer, pii-compliance-auditor, rls-policy-tester, perf-investigator]
---

# Wave 7 Remediation Team

## Mission
Close findings in `docs/ssot/gap_analysis.md` one at a time until ship gate opens.

## Workflow
1. **audit-remediator** picks the next finding by (severity DESC, blocker DESC, impact DESC)
2. Reads the finding + linked code in full
3. Dispatches by finding type:
   - DB / RLS / atomicity → **supabase-rls-architect**
   - Payments / webhooks → **stripe-webhook-engineer**
   - PII / GDPR / CCPA → **pii-compliance-auditor**
   - Performance → **perf-investigator**
4. Specialist implements the fix using the first-fix template (atomic RPC + UNIQUE + REVOKE/GRANT for DB; signature-verify-first for webhooks)
5. **rls-policy-tester** writes the regression test (mandatory for security-class findings)
6. Verify: lint + types + tests + build all PASS
7. **audit-remediator** updates `gap_analysis.md` with commit hash + CLOSED status

## Exit criteria
- Finding marked CLOSED in `gap_analysis.md`
- Regression test in CI
- Atomic commit referencing finding-id
- `docs/ssot/SSOT.md` open-count decremented

## Hard rules
- ONE finding per commit
- NO "while I'm in there" fixes
- NO closing without regression test (for any security-class issue)
- 30-minute repro budget — if can't reproduce, document and move on

## Stop conditions
- 0 CRITICAL + 0 HIGH open → escalate to pre-launch hardening team
- Specialist blocked > 2 retries → escalate with full error context
