# Track C — Compliance & AI Hygiene Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development — ONE task per subagent, hard stop, two-stage review between tasks. Never batch. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Close the compliance and AI-hygiene findings — GDPR consent that vanishes on every cold start, a breach-notification path that is a silent no-op, an erasure RPC that leaves PII in ~34 tables, an AI layer where the 3-layer `ModelRouter` architecture is documentation rather than enforcement, and user PII forwarded to a third-party AI API in cleartext.

**Architecture:** Cross-cutting fix track over `src/lib/compliance/**`, `src/lib/ai/**`, the AIML layer, and the GDPR erasure RPC. Three CRITICAL + five HIGH findings (FND-056..063). Recurring patterns: (a) **durable persistence** — compliance state lives in Postgres, never a process-local `Map`; (b) **enforce, don't document** — the `ModelRouter` boundary is made un-bypassable via a lint rule, not a convention; (c) **the server is the trust boundary** — strip PII and neutralise injection before any payload crosses to a third-party AI API, even for an authenticated user.

**Tech Stack:** Next.js 15 App Router, TypeScript 5.7 strict, Supabase (Postgres + RLS), Resend (email), Jest + ts-jest.

---

## Pre-state (verified against HEAD `0ba3704` — `remediation/wave-7-foundation`)

- Branch: `remediation/wave-7-foundation` (Foundation + 6 verticals + Track M merged & pushed). Full web suite green (15,911 passing / 0 failures).
- Track M established the patterns this track reuses: a new Supabase migration + service write-through for durable state; a custom ESLint rule (warning) to enforce a boundary (`eslint-rules/no-raw-number-on-money-fields.js`, wired in `.eslintrc.json`); the `d64e8d5` template for an RPC migration.
- `withAuth` (AUTH-03) wraps API routes; `consent_records` table exists.

### Findings (from `gap_analysis.md` — re-verify each against HEAD before fixing; line numbers may have drifted)

| Finding | Sev | Site (verified) | Plan task |
|---|---|---|---|
| FND-057 | CRITICAL | `src/lib/compliance/gdpr-ccpa.ts:546-607` — `ConsentManagementService` stores consent in a process-local `Map` (`:547 private consents: Map<...>`) → lost on every serverless cold start | CMP-1 |
| FND-056 | CRITICAL | `src/lib/compliance/gdpr-ccpa.ts:432-439` — `sendBreachNotification` is a no-op → GDPR Art. 33 72-hour breach notification never fires | CMP-2 |
| FND-058 | CRITICAL | `supabase/migrations/20260401000000_gdpr_erasure_rpc.sql` — `delete_user_data_cascade` deletes only ~2 tables; ~34 user-linked tables missing (`broker_connections`, `trade_history`, `push_subscriptions`, `sessions`, `webauthn_credentials`, …) → erasure leaves PII behind | CMP-3 |
| FND-059 | HIGH | `src/app/api/ai/chat/route.ts:~64` — accepts an arbitrary client-supplied `model` string, no cap → cost burn via expensive frontier models | CMP-4 |
| FND-060 | HIGH | `src/app/api/voice/synthesize/route.ts:~11,~38` — no auth + no model whitelist on the TTS endpoint | CMP-4 |
| FND-061 | HIGH | 14 callers across financial/investment/credit/trading — bypass `ModelRouter` (`src/lib/model-router.ts`) and call `AIMLService` (`src/lib/aiml-service.ts`) directly → the 3-layer architecture is unenforced | CMP-4 |
| FND-062 | HIGH | `src/lib/ai/financial-chat-engine.ts:~205-208` — prompt injection: user `message` interpolated into the system prompt via `.replace()` | CMP-5 |
| FND-063 | HIGH | `src/lib/ai/chat-engine.ts:~144-146` (multiple) — `pii-protection.ts` exists but is never called before AI requests → SSN/cards/DOBs forwarded to AIML in cleartext | CMP-5 |

### CRITICAL codebase facts the executor must know (verified at HEAD)

1. **`consent_records` table ALREADY EXISTS** — created in `supabase/migrations/20260331000000_adverse_action_notices.sql:39`. CMP-1 routes `ConsentManagementService` to that existing table — it does NOT create a new one. Verify the table's columns against the `ConsentRecord` type before writing the service.
2. **There are already TWO consent code paths.** `GDPRComplianceService` (`gdpr-ccpa.ts:~289`) and `CCPAComplianceService` (`~:506`) already `upsert` into `consent_records`. Only `ConsentManagementService` (`:546`) uses the in-memory `Map`. CMP-1 makes the third path consistent with the first two — reuse their `consent_records` access pattern; do not invent a new schema.
3. **`breach_notifications` table does NOT exist** — no migration creates it. CMP-2 must create it.
4. **`pii-protection.ts` already exists** (FND-063 names it) — CMP-5 wires the EXISTING module into the AI request path; it does not write a redaction engine from scratch. The plan's `src/lib/aiml/sanitizer.ts` is a thin wrapper that composes `pii-protection.ts` + injection-neutralisation + the `ModelRouter` call — confirm what `pii-protection.ts` already does at CMP-5 Step 1 and reuse it.
5. **`src/lib/aiml/` and `src/lib/compliance/` directory listings are unreliable in this sandbox** — `ls` is permission-blocked on some dirs; use `grep`/`find`/`Read` to confirm file existence, not `ls`.

## Scope

**In scope:** FND-056..063 + a lint rule enforcing the `ModelRouter` boundary. **Out of scope:** a full GDPR/CCPA audit beyond these findings; the AIML *model-selection* logic inside `ModelRouter` (only its enforcement as the single entry point); anything in Track N (Notifications & Admin).

---

## File Structure

| File / area | Responsibility | Task |
|---|---|---|
| `src/lib/compliance/gdpr-ccpa.ts` | `ConsentManagementService` → `consent_records` write-through; `sendBreachNotification` → Resend + DB | CMP-1, CMP-2 |
| `supabase/migrations/<ts>_breach_notifications.sql` | CREATE — `breach_notifications` table | CMP-2 |
| `src/app/api/admin/compliance/breach/route.ts` (new) | admin-only endpoint to trigger a breach notification | CMP-2 |
| `supabase/migrations/<ts>_expand_erasure_cascade.sql` | expand `delete_user_data_cascade` to every user-linked table | CMP-3 |
| 14 caller files (financial/investment/credit/trading) | migrate direct `AIMLService` use → `ModelRouter` | CMP-4 |
| `src/app/api/ai/chat/route.ts` | remove client-supplied `model` | CMP-4 |
| `src/app/api/voice/synthesize/route.ts` | add `withAuth` + model whitelist | CMP-4 |
| `eslint-rules/no-direct-aiml-service.js` (new) + `.eslintrc.json` | lint rule: `AIMLService` importable only by `ModelRouter` | CMP-4 |
| `src/lib/aiml/sanitizer.ts` (new) | composes `pii-protection.ts` + injection guard, wraps `ModelRouter` | CMP-5 |
| `src/lib/ai/financial-chat-engine.ts`, `src/lib/ai/chat-engine.ts` | route user input through the sanitizer; kill the `.replace()` interpolation | CMP-5 |
| co-located `__tests__/` | regression tests per task | all |

---

### Task CMP-1: Persist consent to the database (FND-057, CRITICAL)

**Files:** Modify `src/lib/compliance/gdpr-ccpa.ts` (`ConsentManagementService`, `:546-607`); test.

`ConsentManagementService` holds consent in a process-local `Map` — every serverless cold start wipes every user's consent record, a direct GDPR Art. 7 (demonstrable consent) failure.

- [ ] **Step 1: Survey.** Read `ConsentManagementService` (`:546-607`) fully — every method (`recordConsent`, `getConsent`, `withdrawConsent`, …). Read how `GDPRComplianceService` (`~:289`) and `CCPAComplianceService` (`~:506`) already `upsert` into `consent_records`. Read the `consent_records` schema in `20260331000000_adverse_action_notices.sql:39`. Confirm the `ConsentRecord` type maps to the table columns; if a genuine column gap exists, add a small migration — otherwise reuse the table as-is.
- [ ] **Step 2: Write the failing test** — `consentService.recordConsent(...)` persists to `consent_records`; a FRESH `ConsentManagementService` instance reads the consent back (proves cold-start survival, which the `Map` fails); `withdrawConsent` updates the row.
- [ ] **Step 3: Run — expect FAIL.**
- [ ] **Step 4: Fix** — `ConsentManagementService` reads/writes `consent_records` via the Supabase client; delete the `consents` `Map` field. Match the access pattern the other two services already use.
- [ ] **Step 5: Run — expect PASS.** Full suite (`npm run test`) 0 failures; `npm run type-check` 0 errors.
- [ ] **Step 6: Commit** — `fix: TASK-CMP-01 persist consent records to the database (FND-057)`.

---

### Task CMP-2: Wire breach notification to Resend + DB (FND-056, CRITICAL)

**Files:** Create `supabase/migrations/<ts>_breach_notifications.sql`; modify `src/lib/compliance/gdpr-ccpa.ts` (`sendBreachNotification`, `:432-439`); create `src/app/api/admin/compliance/breach/route.ts`; tests.

`sendBreachNotification` is an empty no-op — a declared GDPR Art. 33 breach-notification capability that does nothing.

- [ ] **Step 1: Survey.** Read `sendBreachNotification` (`:432-439`) and its caller `reportDataBreach` (`~:315-324`, loops over `affectedUsers`). Read how email is sent elsewhere — find the existing Resend integration (`src/lib/email/**`; `RESEND_API_KEY` is the env var). Read `DataBreachNotification` / `breachId` types (`~:107`).
- [ ] **Step 2: Create the migration** — `breach_notifications` table: `id` uuid pk, `breach_id` text, `user_id` uuid, `notified_at` timestamptz, `channel` text, `status` text (`sent`/`failed`), `error` text null, `created_at`. Index on `(breach_id)`. RLS service-role-only. Next free `supabase/migrations/` timestamp.
- [ ] **Step 3: Write the failing tests** — `sendBreachNotification` sends an email via the Resend client (mocked) AND writes a `breach_notifications` row; on Resend failure it writes a `status: failed` row and surfaces the error (does NOT silently swallow). The admin endpoint requires admin auth (a non-admin gets 403) and triggers the notification.
- [ ] **Step 4: Run — expect FAIL.**
- [ ] **Step 5: Fix** — implement `sendBreachNotification`: render the breach email, send via Resend, record the outcome in `breach_notifications`. Create `POST /api/admin/compliance/breach` wrapped in `withAuth` with an admin-role check (reuse the project's RBAC pattern), validating input at the boundary, calling `reportDataBreach`.
- [ ] **Step 6: Run — expect PASS.** Full suite 0 failures; `npm run type-check` 0 errors.
- [ ] **Step 7: Commit** — `fix: TASK-CMP-02 wire breach notification to Resend + breach_notifications table (FND-056)`.

---

### Task CMP-3: Expand the erasure cascade RPC (FND-058, CRITICAL)

**Files:** Create `supabase/migrations/<ts>_expand_erasure_cascade.sql`; test.

`delete_user_data_cascade` deletes only ~2 tables — a GDPR Art. 17 erasure that leaves PII in ~34 user-linked tables (`broker_connections`, `trade_history`, `push_subscriptions`, `sessions`, `webauthn_credentials`, and more).

- [ ] **Step 1: Audit the real table set.** Read the current `delete_user_data_cascade` in `20260401000000_gdpr_erasure_rpc.sql`. Then enumerate EVERY table with a `user_id` (or equivalent user-FK) column — query `information_schema.columns` for `column_name IN ('user_id', ...)`, OR exhaustively grep `supabase/migrations/*.sql` for `create table` + a user-FK column. Produce the full list. Do NOT guess — the list must be derived, and ordered so child rows delete before parents (respect FK constraints).
- [ ] **Step 2: Write the failing test** — seed a user with rows in a representative spread of the missing tables (e.g. `broker_connections`, `push_subscriptions`, `sessions`), call `delete_user_data_cascade`, assert ZERO rows remain for that user in every table. Include a guard test: the function deletes ONLY the target `user_id`'s rows, never another user's.
- [ ] **Step 3: Run — expect FAIL.**
- [ ] **Step 4: Fix** — a new migration redefines `delete_user_data_cascade` to delete from every enumerated table, FK-safe order, all keyed on the target `user_id`. Keep the `d64e8d5` permission template (`REVOKE … FROM PUBLIC; GRANT … TO service_role`). If a table genuinely should be RETAINED for legal/audit reasons (e.g. an immutable audit log), do NOT delete it — list it explicitly in a migration comment with the reason. Erasure completeness is the goal, but a legally-required retention is a documented exception, not an omission.
- [ ] **Step 5: Run — expect PASS.** Full suite 0 failures; `npm run type-check` 0 errors.
- [ ] **Step 6: Commit** — `fix: TASK-CMP-03 expand delete_user_data_cascade to all user-linked tables (FND-058)`.

---

### Task CMP-4: Enforce the ModelRouter boundary (FND-059/060/061, HIGH)

**Files:** Modify 14 caller files; `src/app/api/ai/chat/route.ts`; `src/app/api/voice/synthesize/route.ts`; create `eslint-rules/no-direct-aiml-service.js` + wire in `.eslintrc.json`; tests.

The 3-layer AI architecture (`AIMLService` → `ModelRouter` → `AIOrchestrator`) is documentation: 14 callers skip `ModelRouter` and call `AIMLService` directly, the chat route lets the client pick any `model`, and the voice TTS endpoint is unauthenticated.

- [ ] **Step 1: Map the 14 callers.** Grep for direct `AIMLService` imports/usage across `src/` outside `model-router.ts`. List all of them. For each, determine the `ModelRouter` method that replaces the direct call. Read `ModelRouter`'s public API (`src/lib/model-router.ts`) so the migration is mechanical.
- [ ] **Step 2: Write the failing tests** — (a) a lint test / a unit assertion that a direct `AIMLService` import outside `model-router.ts` is flagged; (b) `ai/chat` route: a request with a client-supplied `model` does NOT reach the AI layer with that model — the server selects via `ModelRouter`; (c) `voice/synthesize`: an unauthenticated request gets 401, and a request for a non-whitelisted model is rejected.
- [ ] **Step 3: Run — expect FAIL.**
- [ ] **Step 4: Fix** —
  - Migrate all 14 callers to go through `ModelRouter`. Each call site change must preserve its existing behaviour (same task/quality intent) — `ModelRouter` selects the model; the caller no longer names one.
  - `ai/chat/route.ts`: remove the client `model` field from the accepted input; the server routes via `ModelRouter`.
  - `voice/synthesize/route.ts`: wrap in `withAuth`; add a server-side whitelist of permitted TTS models, reject anything else.
  - Add `eslint-rules/no-direct-aiml-service.js` — flags any import of `AIMLService` / `aiml-service` from a file other than `model-router.ts`. Wire it into `.eslintrc.json` exactly as `no-direct-aiml-service`'s siblings are wired. Severity: **error** for `AIMLService` imports IF that does not break the build (the 14 callers are being fixed in this same task, so after the migration there should be zero violations — an `error` is then safe and is the right strength for an architectural boundary). If a residual legitimate violation remains, make it `warn` and explain.
- [ ] **Step 5: Run — expect PASS.** Full suite 0 failures; `npm run type-check` 0 errors; `npm run lint` — the new rule reports ZERO violations (all 14 migrated) and no new blocking errors.
- [ ] **Step 6: Commit** — `fix: TASK-CMP-04 enforce ModelRouter boundary + voice TTS auth/whitelist (FND-059/060/061)`.

---

### Task CMP-5: PII sanitisation + prompt-injection guard before AI calls (FND-062/063, HIGH)

**Files:** Create `src/lib/aiml/sanitizer.ts`; modify `src/lib/ai/financial-chat-engine.ts` (`~:205-208`), `src/lib/ai/chat-engine.ts` (`~:144-146`); tests.

User PII (SSN, account numbers, DOB) is forwarded to the third-party AIML API in cleartext — `pii-protection.ts` exists but is never called — and user `message` text is interpolated into the system prompt via `.replace()`, a prompt-injection hole.

- [ ] **Step 1: Survey.** Read the EXISTING `pii-protection.ts` (FND-063 names it — `find`/`grep` to locate it) — what it detects and redacts. Read `financial-chat-engine.ts:~205-208` (the `.replace()` interpolation) and `chat-engine.ts:~144-146`. The sanitizer COMPOSES `pii-protection.ts`; it does not reimplement redaction.
- [ ] **Step 2: Write the failing tests** — (a) a payload containing an SSN / a 16-digit card / a DOB is redacted before it reaches the AI call (assert the outbound payload contains no raw PII); (b) a user `message` containing an injection attempt (`"ignore previous instructions…"`, system-prompt delimiters) is neutralised — it cannot escape the user-content boundary into the system prompt; (c) the `.replace()`-based interpolation no longer places raw user text into the system-prompt string.
- [ ] **Step 3: Run — expect FAIL.**
- [ ] **Step 4: Fix** —
  - Create `src/lib/aiml/sanitizer.ts`: a function that takes the user-controlled fields, runs `pii-protection.ts` redaction, neutralises injection (user content goes in a clearly-delimited user message, never concatenated into the system prompt), and returns the cleaned payload. It wraps the `ModelRouter` call so sanitisation is unavoidable.
  - `financial-chat-engine.ts`: remove the `.replace()` system-prompt interpolation — user `message` becomes a separate user-role message, not part of the system prompt.
  - `chat-engine.ts`: route user input through the sanitizer before the AI request.
- [ ] **Step 5: Run — expect PASS.** Full suite 0 failures; `npm run type-check` 0 errors.
- [ ] **Step 6: Commit** — `fix: TASK-CMP-05 PII sanitisation + prompt-injection guard before AI calls (FND-062/063)`.

> CMP-5 is SEC-sign-off-gated per `MASTER-IMPLEMENTATION-PLAN.md` — flag it for security review at the M1 gate.

---

## Track gate (Track C "done" criteria)

- FND-056..063 closed and evidenced.
- Consent survives a cold start (a fresh service instance reads back persisted consent — proven by test).
- `sendBreachNotification` sends a real email and records the outcome; the admin trigger endpoint is admin-gated.
- `delete_user_data_cascade` deletes every user-linked table (derived list, FK-safe order); any retained table is documented with a legal reason; the only-target-user guard test passes.
- No code path imports `AIMLService` outside `ModelRouter` (lint rule reports zero violations); the chat route ignores client-supplied `model`; voice TTS requires auth + a model whitelist.
- No raw PII crosses to the AIML API; user input cannot escape into the system prompt.
- Full suite 0 failures; `npm run type-check` + project-wide `tsc` 0 errors; `npm run lint` no new blocking errors.
- `BASE_REF=<track base> npm run test:coverage:changed` — ≥85% on every changed file's changed lines; the new RPC/migration paths covered.

---

## Notes for the executor

- Compliance state is durable Postgres state — a process-local `Map` for consent/breach data is a finding, not an implementation detail.
- `consent_records` exists; `breach_notifications` does not — CMP-1 reuses, CMP-2 creates.
- Reuse, don't reinvent: `pii-protection.ts` already exists (CMP-5); two services already write `consent_records` (CMP-1); the Resend integration already exists (CMP-2). Survey first.
- The `ModelRouter` boundary is enforced by a lint rule, not a comment — the same mechanism Track M used for the money-field rule.
- The server sanitises before any third-party AI call — a valid session proves the user, not that their text is safe to forward or to splice into a system prompt.
- Verify table/column names against `supabase/migrations/` before relying on them; `ls` is unreliable in this sandbox — use `grep`/`find`/`Read`.
- Sequencing: CMP-1 → CMP-2 → CMP-3 → CMP-4 → CMP-5. CMP-3 after CMP-1; CMP-5 after CMP-4.
- Reviewers are advisory; challenge a review CRITICAL that would force a regression.
