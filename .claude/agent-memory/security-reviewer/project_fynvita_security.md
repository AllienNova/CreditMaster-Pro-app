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

7. CMP-7 review (2026-05-18, commit e1f7946) — FND-062 / FND-063:
   - FND-062 CLOSED: structural fix confirmed. INTENT_DETECTION_SYSTEM_PROMPT and
     RESPONSE_GENERATION_SYSTEM_PROMPT are static constants (no .replace(), no interpolation).
     Both detectIntent() and generateResponse() in financial-chat-engine.ts route user-derived
     content to role:"user" messages only. The old .replace() chains are gone from live paths.
     Deprecated exports confirmed zero callers outside financial-chat-prompts.ts.
   - FND-063 PARTIALLY CLOSED: sanitizeUserInput() wraps anonymizePII({method:"mask"}) from
     pii-protection.ts plus 18 injection regex patterns. Called on all user-derived values in
     both financial-chat-engine.ts and chat-engine.ts before ModelRouter.complete().
     entity-extractor.ts, intent-recognizer.ts, and financial-coach.ts remain unsanitized
     (explicit plan scope gap — follow-up required). entity-extractor.ts is particularly
     notable: raw userMessage passed to AIML at line 270 without sanitization.
   - MEDIUM finding: entity-extractor.ts line 257 interpolates user-controlled IntentType enum
     value directly into the system prompt string, creating a minor injection vector.
   - LOW: RESPONSE_GENERATION_SYSTEM_PROMPT ends with "Generate the response now:" — static
     phrasing, no risk but worth documenting pattern in future reviews.
   - Verdict for CMP-7 in-scope surface: APPROVED with follow-up tracked.

8. Adversarial re-verification of Wave 7 investments/notifications/admin findings (2026-07-23,
   branch remediation/wave-7-foundation, worktree .worktrees/wave-7-foundation) — FND-030,
   FND-031, FND-032, FND-041..044, FND-049..053 all CLOSED_REAL, evidenced by 12 test suites /
   138 tests run fresh (all PASS). Notable patterns worth reusing on future audits of this repo:
   - portfolio-service.ts / portfolio-analytics.ts: correct IDOR pattern is double-scoping every
     Supabase query with BOTH the resource id AND user_id from the session (`withAuth` → `user.id`),
     never trusting a client-supplied portfolioId alone. 5 analytics routes all derive userId this
     way; verified by reading each route, not just the service layer.
   - Division-by-zero / fabricated-benchmark fixes in this codebase consistently use an honest
     "return null + dataAvailable:false" pattern rather than either crashing or faking a number.
     Look for this signature when checking similar FND classes elsewhere in the repo.
   - **Recurring gap**: a fix scoped to the FND's literal file:line citation can leave the
     identical defect in sibling files not named in the finding. Found here: FND-053 named
     analytics/route.ts, stats/route.ts, audit/route.ts, logs/route.ts (all 4 genuinely cleaned of
     Math.random/mock-fallback) — but admin/subscriptions/route.ts and admin/disputes/route.ts
     GET/DELETE/PATCH still return fabricated data / a fake "Mock cancellation successful" /
     "Mock update successful" response when Supabase env vars are unset. This is now gated behind
     withRole("admin") (no longer an auth bypass) and is explicitly unit-tested as intended
     behavior — so it is a known, accepted design choice, not an overlooked regression — but it
     still reintroduces the "lying success response" anti-pattern on state-changing admin actions
     (subscription cancellation, dispute update) during a misconfiguration. When a finding says
     "route X does bad thing Y," grep sibling routes in the same directory for the same Y pattern
     before declaring the class closed.
   - Also flagged (adjacent, not part of the original 6 findings): admin/audit/route.ts POST
     inserts `user_id`/`ip_address` verbatim from the request body into the audit_logs table with
     no server-derived-actor override, even after gating behind admin auth — a legitimate (or
     hijacked) admin session can still write a forged actor/IP into the forensic record. Worth a
     dedicated FND if this repo does another audit pass.
   - roles.ts `isAtLeast(actual, required)` = `RANK[actual] >= RANK[required]` confirmed correct
     (not inverted) — RANK: user=0, premium=1, admin=2, super_admin=3.
