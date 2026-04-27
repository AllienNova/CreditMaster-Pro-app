---
name: Fynvita security review context
description: Security posture, known vulnerabilities, and recurring patterns in the Fynvita repo
type: project
---

Security review performed 2026-04-16 against 42-file diff (+520/-265 lines).

Key findings logged for future reviews:

1. BackupCodesManagement.tsx line 111: backup codes interpolated directly into a print popup using
   the unsafe DOM write API. Pre-existing issue not in this diff but confirmed present. Limited blast
   radius (same origin, server-generated codes) but still unsafe DOM practice.

2. supabase/migrations/20260331000000_adverse_action_notices.sql lines 33 and 57: two INSERT RLS
   policies use WITH CHECK (true) on adverse_action_notices and consent_records. Service-role bypasses
   RLS so the server-side intent works, but the policy also allows any authenticated user to INSERT
   directly from the client. Fix: scope to TO service_role.

3. fcra-adverse-action.ts line 103: notice IDs use Math.random() (non-CSPRNG). Low collision risk
   in practice but worth tracking.

4. Dependency audit results (npm audit, 2026-04-16):
   - CRITICAL: axios >=1.0.0 <1.15.0 (SSRF+header-injection chain, CVSS 10.0) - transitive via plaid and wait-on
   - CRITICAL: handlebars >=4.0.0 <=4.7.8 (JS injection, CVSS 9.8) - transitive via ts-jest (devDep)
   - HIGH: next <15.5.15 (Server Components DoS), undici, lodash, picomatch, fast-xml-parser, flatted, @xmldom/xmldom
   - Total: 2 critical | 7 high | 4 moderate | 4 low

5. Positive security changes in this diff:
   - webhook/route.ts: removed the || "" bypass that silently accepted spoofed events on missing env var
   - headers.ts: removed unsafe-eval and unsafe-inline from script-src, added strict-dynamic

6. CSP nonce/hash enforcement not yet wired - strict-dynamic is present but without a nonce source the
   policy degrades in some browsers. Track for future review.
