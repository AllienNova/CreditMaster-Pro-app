# Track C — Compliance & AI Hygiene Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development — ONE task per subagent, hard stop, two-stage review between tasks. Never batch. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Close the compliance and AI-hygiene findings — GDPR consent with no durable persistence, a breach-notification path that is a silent no-op, an erasure RPC missing many user-linked tables, an AI layer where the 3-layer `ModelRouter` architecture is unenforced, and user PII forwarded to a third-party AI API in cleartext.

**Architecture:** Cross-cutting fix track over `src/lib/compliance/**`, `src/lib/ai/**`, the AIML layer, and the GDPR erasure RPC. Three CRITICAL + five HIGH findings (FND-056..063). Recurring patterns: (a) **durable persistence** — compliance state lives in Postgres, never a process-local `Map`; (b) **enforce, don't document** — `ModelRouter` is given a real execution method and made the *only* legitimate `AIMLService` caller, enforced by a lint rule; (c) **the server is the trust boundary** — strip PII and neutralise injection before any payload crosses to a third-party AI API.

**Tech Stack:** Next.js 15 App Router, TypeScript 5.7 strict, Supabase (Postgres + RLS), Resend (email), Jest + ts-jest.

---

## Pre-state (verified against HEAD `0ba3704` — `remediation/wave-7-foundation`)

- Branch: `remediation/wave-7-foundation` (Foundation + 6 verticals + Track M merged & pushed). Full web suite green (15,911 passing / 0 failures).
- Track M established the patterns this track reuses: a Supabase migration + service write-through for durable state; a custom ESLint rule wired in `.eslintrc.json`; the `d64e8d5` template for RPC migrations.
- `withAuth` (AUTH-03) already wraps API routes.

### Findings — **re-verified against HEAD; the `gap_analysis.md` text is stale on several, corrected here**

| Finding | Sev | Verified state at HEAD | Plan task |
|---|---|---|---|
| FND-057 | CRITICAL | `gdpr-ccpa.ts:546-607` — `ConsentManagementService` stores consent in a process-local `Map` (`:547`). **It is also DEAD CODE — `consentService` has zero callers in `src/`.** The loss is latent, not active. The fix still matters (the service is a deliberately-built consent API; it must be correct before it is ever wired). | CMP-1 |
| FND-056 | CRITICAL | `gdpr-ccpa.ts:432-439` — `sendBreachNotification` is a no-op. Confirmed open. | CMP-2 |
| FND-058 | CRITICAL | **`gap_analysis.md` is stale** — it says "~2 tables / ~34 missing". HEAD: `20260401000000_gdpr_erasure_rpc.sql` `delete_user_data_cascade` already covers **~28 tables** (`v_tables` array, `:25-54`). Real gap: user-linked tables still absent (`broker_connections`, `trade_history`, `push_subscriptions`, `sessions`, `webauthn_credentials`, `user_credits`, `credit_transactions`, `tax_documents`/`tax_profiles`, gamification tables, `student_loans`, …). The gap is **28 → 60+**, not 2 → 34. | CMP-3 |
| FND-059 | HIGH | `ai/chat/route.ts` — already `withAuth` (`:13`); still accepts a client-supplied `model` (`~:64`), no cap. | CMP-6 |
| FND-060 | HIGH | **`gap_analysis.md` is stale** — `voice/synthesize/route.ts` is **already `withAuth`** (`:12`) and voices are whitelisted (`:43`). Only the **model** is unbounded (`body.model \|\| "tts-1-hd"`, `~:39`). The "no auth" half is already fixed. | CMP-6 |
| FND-061 | HIGH | **23 files** import `AIMLService` (verified by grep). Of those: `ai-orchestrator.ts` (the intended composition layer — legitimate), 2 API routes, and **~20 engine files** that call `AIMLService` directly, bypassing model selection. | CMP-4, CMP-5 |
| FND-062 | HIGH | `ai/financial-chat-engine.ts` — prompt injection via `.replace()` at **TWO sites**: `:205` (`{{MESSAGE}}`) and `:242` (`{{INTENT}}`); both call the AI with a single `[{role:"user",content:prompt}]` message (`:213`, `:248`). | CMP-7 |
| FND-063 | HIGH | `pii-protection.ts` exists and is a **real, complete redactor** (`detectPII`, `anonymizePII({method:"mask"})` cover SSN/card/email/phone/DOB/IP) — but is never called. ~20 engines forward user content to `aimlService.chat()` with no redaction. **NB: the `chat-engine.ts:144-146` `.replace()` injection cited in `gap_analysis.md` does NOT exist — `chat-engine.ts` pushes the user message as a separate `role:"user"` message (`:359`). `chat-engine.ts`'s only defect is the missing PII redaction.** | CMP-7 |

### CRITICAL codebase facts the executor must know (verified at HEAD — these correct the earlier plan draft)

1. **`ModelRouter` (`src/lib/model-router.ts`) is a pure model-ID lookup table** — its API (`getModel`, `selectModel`, `getRecommendation`, …) returns strings; it never imports `aiml-service`, never calls `.chat()`. It currently CANNOT be an execution boundary. CMP-4 gives it a real execution method. `getModelRouter()`/`resetModelRouter()` are its factory functions.
2. **`AIMLService` (`src/lib/aiml-service.ts`)** is the raw API client (`.chat(messages, options)`).
3. **`AIOrchestrator` (`src/lib/ai-orchestrator.ts`)** already composes both (`:141 private aiml`, `:142 private router`; accessors `getAIMLService()`, `getModelRouter()`). It is a *workflow* layer, NOT the per-call boundary the ~20 engines need.
4. **`consent_records` table EXISTS** (`20260331000000_adverse_action_notices.sql:39-48`) but carries **`UNIQUE(user_id, consent_type)`** — it stores **current state only, one row per (user, type)**. `ConsentManagementService` is an **append-only consent history** (`recordConsent` appends, `hasConsent`/`exportConsentHistory` read history). An `upsert` into the UNIQUE-constrained table **destroys history** — a GDPR Art. 7 ("demonstrable consent over time") regression. CMP-1 must resolve this with a schema migration, NOT "reuse as-is".
5. **`GDPRComplianceService` (`~:289`) and `CCPAComplianceService` (`~:506`)** already `upsert` into `consent_records` — but only ever write `granted:false` (objection/opt-out). They are NOT a template for `ConsentManagementService`'s history reads/writes.
6. **`breach_notifications` table does NOT exist** — CMP-2 creates it.
7. **`pii-protection.ts` is a real redactor** — CMP-7 composes it, does not reimplement redaction.
8. **`ls` is permission-blocked on some dirs in this sandbox** — use `grep`/`find`/`Read` to confirm file existence.

## Scope

**In scope:** FND-056..063 + a lint rule enforcing the `ModelRouter` boundary. **Out of scope:** wiring the (currently dead) `ConsentManagementService` into a route (that is a feature task, not a remediation finding — CMP-1 only makes it *correct*); a full GDPR/CCPA audit beyond these findings; the model-*selection* heuristics inside `ModelRouter`; Track N.

---

## File Structure

| File / area | Responsibility | Task |
|---|---|---|
| `supabase/migrations/<ts>_consent_history.sql` | drop `consent_records` UNIQUE constraint → append-only history model | CMP-1 |
| `src/lib/compliance/gdpr-ccpa.ts` | `ConsentManagementService` → `consent_records` write-through; `GDPR/CCPAComplianceService` `upsert`→`insert`; `sendBreachNotification` → Resend + DB | CMP-1, CMP-2 |
| `supabase/migrations/<ts>_breach_notifications.sql` | CREATE — `breach_notifications` table | CMP-2 |
| `src/app/api/admin/compliance/breach/route.ts` (new) | admin-only breach-notification trigger | CMP-2 |
| `supabase/migrations/<ts>_expand_erasure_cascade.sql` | expand `delete_user_data_cascade` from ~28 → all user-linked tables | CMP-3 |
| `src/lib/model-router.ts` | NEW execution method (`complete`/`chat`) — `ModelRouter` becomes the sole `AIMLService` caller | CMP-4 |
| ~20 engine files (financial/investment/credit/trading/ai) | migrate direct `AIMLService` use → `ModelRouter` execution method | CMP-5 |
| `eslint-rules/no-direct-aiml-service.js` (new) + `.eslintrc.json` | lint rule: `aiml-service` importable only by `model-router.ts` (+ `ai-orchestrator.ts` if it remains a composer) | CMP-5 |
| `src/app/api/ai/chat/route.ts` | remove client-supplied `model` | CMP-6 |
| `src/app/api/voice/synthesize/route.ts` | add a TTS model whitelist (auth already present) | CMP-6 |
| `src/lib/aiml/sanitizer.ts` (new) | composes `pii-protection.ts` + injection guard | CMP-7 |
| `src/lib/ai/financial-chat-engine.ts`, `src/lib/ai/chat-engine.ts` | route input through the sanitizer; kill the two `.replace()` interpolations | CMP-7 |
| co-located `__tests__/` | regression tests per task | all |

---

### Task CMP-1: Durable, history-preserving consent persistence (FND-057, CRITICAL)

**Files:** Create `supabase/migrations/<ts>_consent_history.sql`; modify `src/lib/compliance/gdpr-ccpa.ts`; test.

`ConsentManagementService` holds an append-only consent history in a process-local `Map`. The existing `consent_records` table has `UNIQUE(user_id, consent_type)` — current-state only. Persisting history there via `upsert` would destroy the audit trail (GDPR Art. 7 demonstrable consent).

- [ ] **Step 1: Survey + decide the schema.** Read `ConsentManagementService` (`:546-607`) — every method (`recordConsent`, `hasConsent`, `getUserConsents`, `withdrawConsent`, `exportConsentHistory`, …) and the `ConsentRecord` type (`:88-95`: `consentType`, `granted`, `timestamp`, `ipAddress`, `userAgent`). Read the `consent_records` table (`20260331000000_adverse_action_notices.sql:39-48`) and its `UNIQUE(user_id, consent_type)`. Read how `GDPRComplianceService`/`CCPAComplianceService` `upsert` it. **Decision (fixed by GDPR — not optional): consent must be append-only history.** The migration DROPs `UNIQUE(user_id, consent_type)` so `consent_records` becomes a full history (one row per consent event); "current consent" = the latest row per `(user_id, consent_type)` by `timestamp`. Note the dead-code status of `consentService` (zero callers) — CMP-1 makes it correct; it does not wire it to a route.
- [ ] **Step 2: Write the migration** — drop the `UNIQUE(user_id, consent_type)` constraint; add an index on `(user_id, consent_type, timestamp DESC)` to keep "latest consent" reads fast. RLS unchanged.
- [ ] **Step 3: Write the failing tests** — `recordConsent` twice for the same `(user, type)` with different `granted` values → BOTH rows persist (history preserved); `hasConsent` returns the latest; a FRESH `ConsentManagementService` instance reads the history back (cold-start survival); `exportConsentHistory` returns all rows.
- [ ] **Step 4: Run — expect FAIL.**
- [ ] **Step 5: Fix** — `ConsentManagementService` reads/writes `consent_records` via the Supabase client (append on write, latest-by-timestamp on current-state read); delete the `consents` `Map`. Change `GDPRComplianceService`/`CCPAComplianceService` from `upsert` to `insert` (their `upsert` relied on the now-dropped UNIQUE constraint — `insert` is correct for an append-only table; verify their callers still get correct "current consent" behaviour).
- [ ] **Step 6: Run — expect PASS.** Full suite (`npm run test`) 0 failures; `npm run type-check` 0 errors.
- [ ] **Step 7: Commit** — `fix: TASK-CMP-01 history-preserving consent persistence (FND-057)`.

---

### Task CMP-2: Wire breach notification to Resend + DB (FND-056, CRITICAL)

**Files:** Create `supabase/migrations/<ts>_breach_notifications.sql`; modify `src/lib/compliance/gdpr-ccpa.ts` (`sendBreachNotification`, `:432-439`); create `src/app/api/admin/compliance/breach/route.ts`; tests.

`sendBreachNotification` is an empty no-op — a declared GDPR Art. 33 capability that does nothing.

> CMP-2 edits `gdpr-ccpa.ts` immediately after CMP-1. Re-read the file at Step 1 — CMP-1 shifted line numbers; do not trust `:432-439` blindly.

- [ ] **Step 1: Survey.** Read `sendBreachNotification` and its caller `reportDataBreach` (`~:315-324`, loops `affectedUsers`). Find the existing Resend integration (`grep`/`find` `src/lib/email/**`; env var `RESEND_API_KEY`). Read the `DataBreachNotification` type (`~:107`).
- [ ] **Step 2: Create the migration** — `breach_notifications`: `id` uuid pk, `breach_id` text, `user_id` uuid, `notified_at` timestamptz, `channel` text, `status` text (`sent`/`failed`), `error` text null, `created_at`. Index on `(breach_id)`. RLS service-role-only. Next free timestamp.
- [ ] **Step 3: Write the failing tests** — `sendBreachNotification` sends an email via Resend (mocked) AND writes a `breach_notifications` row; on Resend failure it writes `status:failed` + surfaces the error (no silent swallow); the admin endpoint 403s a non-admin and triggers the notification for an admin.
- [ ] **Step 4: Run — expect FAIL.**
- [ ] **Step 5: Fix** — implement `sendBreachNotification` (render the breach email, send via Resend, record outcome in `breach_notifications`). Create `POST /api/admin/compliance/breach` wrapped in `withAuth` + an admin-role check (reuse the project RBAC pattern), input-validated at the boundary, calling `reportDataBreach`.
- [ ] **Step 6: Run — expect PASS.** Full suite 0 failures; `npm run type-check` 0 errors.
- [ ] **Step 7: Commit** — `fix: TASK-CMP-02 wire breach notification to Resend + breach_notifications table (FND-056)`.

---

### Task CMP-3: Expand the erasure cascade RPC (FND-058, CRITICAL)

**Files:** Create `supabase/migrations/<ts>_expand_erasure_cascade.sql`; test.

`delete_user_data_cascade` currently deletes ~28 tables — but many user-linked tables are absent, so a GDPR Art. 17 erasure leaves PII behind.

- [ ] **Step 1: Audit — diff against the EXISTING 28-table list.** Read the current `v_tables` array in `20260401000000_gdpr_erasure_rpc.sql:25-54` and record exactly which ~28 tables are already covered. Then enumerate EVERY table with a `user_id` (or equivalent user-FK) column: prefer querying `information_schema.columns` against the live DB; the migration-grep fallback is **incomplete** (Track M proved tables exist live with no migration — e.g. affiliate tables) so it must be treated as a lower bound. Produce the **delta** — tables with a user FK NOT already in `v_tables`. Order so children delete before parents.
- [ ] **Step 2: Write the failing test** — seed a user with rows in tables **genuinely absent from the current 28** (e.g. `broker_connections`, `push_subscriptions`, `webauthn_credentials`, `sessions`) — do NOT seed already-covered tables like `notifications`/`consent_records` (that would pass spuriously). Call `delete_user_data_cascade`; assert ZERO rows remain for that user. Add an only-target-user guard test (a second user's rows untouched).
- [ ] **Step 3: Run — expect FAIL** (Step 3 MUST genuinely fail — if it passes, the seed tables were already covered; fix the seed set).
- [ ] **Step 4: Fix** — a new migration redefines `delete_user_data_cascade` to delete from every covered + delta table, FK-safe order, keyed on the target `user_id`. The RPC deletes via `EXECUTE format('DELETE FROM %I WHERE user_id = $1')` — a **literal `user_id` column**. For any delta table whose user-FK column is NOT literally named `user_id`, either special-case it with its real column name or exclude it with a noted reason — do not add it to the generic array (the RPC would throw at runtime). Keep the `d64e8d5` permission template. If a table is legally RETAINED (e.g. an immutable audit log), do NOT delete it — list it with the reason in a migration comment.
- [ ] **Step 5: Run — expect PASS.** Full suite 0 failures; `npm run type-check` 0 errors.
- [ ] **Step 6: Commit** — `fix: TASK-CMP-03 expand delete_user_data_cascade to all user-linked tables (FND-058)`.

---

### Task CMP-4: Give `ModelRouter` a real execution method (FND-061 foundation)

**Files:** Modify `src/lib/model-router.ts`; test.

`ModelRouter` is a pure lookup table — it cannot be an enforcement boundary because it has no method that runs an AI call. This task adds one. **Stated interpretation** (per the SSOT 3-layer architecture "AIMLService → ModelRouter → AIOrchestrator"): `ModelRouter` becomes the single legitimate owner of `AIMLService` — it selects the model AND executes the call. The ~20 engines (CMP-5) then call `ModelRouter`, never `AIMLService`.

- [ ] **Step 1: Survey.** Read `ModelRouter`'s full API and `AIMLService.chat`'s signature (`messages`, `options`). Read 2-3 representative engine call sites (e.g. `financial/recommendation-engine.ts`, `ai/chat-engine.ts`) to see the exact shape engines pass to `aimlService.chat(...)` — the new method must serve those shapes.
- [ ] **Step 2: Write the failing test** — `ModelRouter` exposes an execution method (`complete(taskType, messages, options)` or equivalent) that selects a model via the existing routing logic and calls `AIMLService.chat` with it; mock `AIMLService`, assert the router picks the model and forwards the messages.
- [ ] **Step 3: Run — expect FAIL.**
- [ ] **Step 4: Fix** — add the execution method to `ModelRouter`. It owns an `AIMLService` instance (constructor-injected, defaulting to `new AIMLService()` — match the `ai-orchestrator.ts` constructor pattern). The method: select model → call `aiml.chat` → return the result. Keep `ModelRouter`'s existing lookup API intact.
- [ ] **Step 5: Run — expect PASS.** Full suite 0 failures; `npm run type-check` 0 errors.
- [ ] **Step 6: Commit** — `feat: TASK-CMP-04a ModelRouter execution method — AIMLService boundary (FND-061)`.

---

### Task CMP-5: Migrate the ~20 engine callers + lint-enforce the boundary (FND-061)

**Files:** ~20 engine files (financial/investment/credit/trading/ai); create `eslint-rules/no-direct-aiml-service.js`; modify `.eslintrc.json`; tests.

With `ModelRouter` now executable (CMP-4), migrate every engine off direct `AIMLService` use and lint-lock the boundary.

- [ ] **Step 1: Map every caller.** `grep -rlE "aiml-service|AIMLService" src/ --include "*.ts"` minus `__tests__`, minus `aiml-service.ts`, minus `model-router.ts`. Expect ~23 hits: `ai-orchestrator.ts` (decide — see Step 4), the 2 API routes (CMP-6 handles those — exclude here), and ~20 engines. Produce the exact engine list. Cross-check against the Pre-state list (DisputeLetterGenerator, recommendation-engine, bill-negotiator, ai-stock-analyst, signal-generator, financial-coach, intent-recognizer, smart-budget-engine, debt-strategy-optimizer, budget-optimizer, financial-chat-engine, entity-extractor, chat-engine, smart-insights-engine, goal-planner, transaction-categorizer, spending-analyzer, savings-optimizer, debt-strategy-engine, llm-trading-engine).
  - **NOT every engine is a uniform single `.chat()` call.** `signal-generator.ts` (`~:234-290`) deliberately fans out to THREE hardcoded distinct models (`anthropic/claude-4.5-sonnet`, `openai/gpt-4o-mini`, `deepseek/deepseek-r1`) and builds a vote-based consensus — a single-select `ModelRouter.complete(taskType,…)` would silently collapse it to a 1-vote "consensus" with no error. `ai-orchestrator.ts`'s `multiModelConsensus` (`~:489`, `~:544`) is the same pattern. For these multi-model paths: either add a multi-model method to `ModelRouter`, or exempt them from the lint rule with a documented reason — do NOT force them through the single-select method. Classify each engine at Step 1 as `single-call` (migrate) or `multi-model` (special-case).
- [ ] **Step 2: Write the failing test** — the lint rule flags a direct `aiml-service` import from a non-exempt file. (Also rely on the full suite: each migrated engine's existing tests must still pass.)
- [ ] **Step 3: Run — expect FAIL** (lint rule not yet present / violations exist).
- [ ] **Step 4: Fix** —
  - Add `eslint-rules/no-direct-aiml-service.js` (template: an existing `eslint-rules/*.js`) — flags any import of `aiml-service`/`AIMLService` from a file other than `model-router.ts`. **Decide `ai-orchestrator.ts`:** it composes both layers; if migrating it cleanly through `ModelRouter` is mechanical, do so and exempt only `model-router.ts`; if `AIOrchestrator` genuinely needs the raw service, exempt `ai-orchestrator.ts` too and note why. Wire the rule into `.eslintrc.json` as the sibling rules are wired.
  - Migrate every `single-call` engine: replace `new AIMLService()` + `.chat(model, …)` with the `ModelRouter` execution method from CMP-4. Each engine today passes a hardcoded model constant (`AI_MODEL`, `INTENT_MODEL`, `ENTITY_MODEL`, …); after migration `ModelRouter` selects the model from a `TaskType` — so **choose a deliberate `TaskType` per engine** that maps to a sane model for that engine's job (do not pick blindly). The messages and intent are preserved; only model selection moves. **If an existing engine test asserts a specific model string, that assertion must be reconciled** — the model legitimately changed, so update the assertion to the new expected value (or to assert via the router); per the Test Integrity Rule, document the change in the commit — never weaken or delete the test.
  - Set the rule severity to **error** ONLY once every violation is migrated or documented-exempt (zero un-exempt violations remain). Multi-model engines (`signal-generator`, and `ai-orchestrator` if not migrated) get an explicit documented exemption, not silent breakage.
- [ ] **Step 5: Run — expect PASS.** Full suite 0 failures; `npm run type-check` 0 errors; `npm run lint` — the new rule reports ZERO violations, no new blocking errors.
- [ ] **Step 6: Commit** — `fix: TASK-CMP-04b migrate ~20 engines to ModelRouter + lint-enforce the boundary (FND-061)`.

> This task touches ~20 files but the change is mechanical and uniform. If mid-task the migration is not uniform (an engine uses `AIMLService` in a way the `ModelRouter` method does not serve), STOP and report — do not force-fit.

---

### Task CMP-6: Lock down the AI API routes (FND-059, FND-060)

**Files:** Modify `src/app/api/ai/chat/route.ts`, `src/app/api/voice/synthesize/route.ts`; tests.

The chat route lets the client pick any `model` (cost burn); the voice TTS route accepts an unbounded `model`. (Both routes already have `withAuth` — auth is NOT a gap.)

- [ ] **Step 1: Verify.** Confirm `ai/chat/route.ts` is `withAuth`-wrapped and reads a client `model` (`~:64`). Confirm `voice/synthesize/route.ts` is `withAuth`-wrapped (`:12`), whitelists voices (`:43`) but not `model` (`body.model || "tts-1-hd"`, `~:39`).
- [ ] **Step 2: Write the failing tests** — `ai/chat`: a request supplying `model` does NOT cause that model to be used — the server selects via `ModelRouter`. `voice/synthesize`: a request for a non-whitelisted model is rejected (400); a whitelisted model passes.
- [ ] **Step 3: Run — expect FAIL.**
- [ ] **Step 4: Fix** — `ai/chat`: remove `model` from accepted input; route via `ModelRouter` (CMP-4 method). `voice/synthesize`: add a server-side whitelist of permitted TTS models, reject anything else (mirror the existing voice whitelist).
- [ ] **Step 5: Run — expect PASS.** Full suite 0 failures; `npm run type-check` 0 errors.
- [ ] **Step 6: Commit** — `fix: TASK-CMP-04c remove client model selection + voice TTS model whitelist (FND-059/060)`.

---

### Task CMP-7: PII sanitisation + prompt-injection guard before AI calls (FND-062/063, HIGH)

**Files:** Create `src/lib/aiml/sanitizer.ts`; modify `src/lib/ai/financial-chat-engine.ts` (`:205`, `:242`), `src/lib/ai/chat-engine.ts`; tests.

User PII reaches the AIML API in cleartext (`pii-protection.ts` exists, never called); `financial-chat-engine.ts` splices user-derived text into the system prompt via `.replace()` at TWO sites.

- [ ] **Step 1: Survey.** Read the EXISTING `pii-protection.ts` — its `detectPII` / `anonymizePII` API. Read `financial-chat-engine.ts` `~:205-255` — the `.replace()` interpolation has **THREE attacker-influenced placeholders, not one**: `{{MESSAGE}}` (raw user message) AND `{{CONTEXT}}` (`~:208` — `JSON.stringify(context)`; `ChatContext.sessionHistory` carries prior user-turn text) AND `{{INTENT}}` (`~:242` — the intent object is parsed from user text). All three are user-derived and must be neutralised. Read `chat-engine.ts` — it pushes the user message as a separate `role:"user"` message (no injection hole there); its only defect is missing PII redaction (note: `chat-engine.ts` also replays prior-turn user messages as history — those carry PII too).
- [ ] **Step 2: Write the failing tests** — (a) a payload with an SSN / 16-digit card / DOB → no raw PII in the outbound AI payload; (b) a user `message` with an injection attempt (`"ignore previous instructions…"`, system-prompt delimiters) cannot escape into the system prompt; (c) neither `.replace()` site in `financial-chat-engine.ts` places raw user-derived text into a system-prompt string.
- [ ] **Step 3: Run — expect FAIL.**
- [ ] **Step 4: Fix** —
  - Create `src/lib/aiml/sanitizer.ts`: composes `pii-protection.ts` redaction + injection neutralisation (user content goes in a delimited user-role message, never concatenated into a system prompt). Provide one function the engines call before the AI request.
  - `financial-chat-engine.ts`: restructure BOTH `.replace()`-template calls (`~:205` and `~:242`) so NO user-derived value (`{{MESSAGE}}`, `{{CONTEXT}}`, `{{INTENT}}`) is spliced into a system-prompt string. The templates interleave instructions, JSON schema, and few-shot examples — they do not split cleanly by a mechanical role-swap; **genuinely rewrite them** into a fixed system message + separate sanitised user/context messages. Every user-derived value passes through the sanitizer first.
  - `chat-engine.ts`: route the user input through the sanitizer before `aimlService.chat` (post-CMP-5 this is the `ModelRouter` call).
- [ ] **Step 5: Run — expect PASS.** Full suite 0 failures; `npm run type-check` 0 errors.
- [ ] **Step 6: Commit** — `fix: TASK-CMP-05 PII sanitisation + prompt-injection guard before AI calls (FND-062/063)`.

> Scope note: ~20 engines forward user content to the AI; CMP-7 sanitises the two highest-risk chat engines explicitly. The other engines should route through the sanitizer too — if that is not done in CMP-7, FND-063 closure is **partial**; record a follow-up task to sweep the remaining engines. CMP-7 is SEC-sign-off-gated per `MASTER-IMPLEMENTATION-PLAN.md` — flag it for the M1 security review.

---

## Track gate (Track C "done" criteria)

- FND-056..063 closed and evidenced.
- Consent persists as append-only history (a fresh service instance reads back multiple consent events; `consent_records` UNIQUE constraint dropped) — proven by test.
- `sendBreachNotification` sends a real email + records the outcome; the admin trigger endpoint is admin-gated.
- `delete_user_data_cascade` deletes every user-linked table (delta derived against the existing 28, FK-safe); retained tables documented; only-target-user guard passes.
- `ModelRouter` has an execution method; no file imports `AIMLService` except `model-router.ts` (+ documented exemptions) — lint rule reports zero violations; the chat route ignores client `model`; voice TTS enforces a model whitelist.
- No raw PII crosses to the AIML API; user input cannot escape into a system prompt.
- Full suite 0 failures; `npm run type-check` + project-wide `tsc` 0 errors; `npm run lint` no new blocking errors.
- `BASE_REF=<track base> npm run test:coverage:changed` — ≥85% on every changed file's changed lines.

---

## Notes for the executor

- Compliance state is durable Postgres state — a process-local `Map` is a finding.
- Consent is append-only history — never `upsert` into a UNIQUE-constrained current-state table.
- `consent_records` exists (CMP-1 modifies its constraint); `breach_notifications` does not (CMP-2 creates it).
- `ModelRouter` today is a lookup table — CMP-4 makes it executable; CMP-5 makes it the only `AIMLService` caller. The boundary is enforced by a lint rule, as Track M enforced the money-field rule.
- The server sanitises before any third-party AI call — a valid session proves the user, not that their text is safe to forward or splice into a system prompt.
- `gap_analysis.md` is stale on FND-058 (28 tables already covered, not 2), FND-060 (auth already present), and FND-063 (`chat-engine.ts` has no `.replace()` injection) — this plan's Findings table is the corrected reference. Still verify against HEAD at each task's Step 1.
- Sequencing: CMP-1 → CMP-2 → CMP-3 → CMP-4 → CMP-5 → CMP-6 → CMP-7. CMP-2 re-reads `gdpr-ccpa.ts` line numbers post-CMP-1. CMP-5 depends on CMP-4. CMP-6 uses CMP-4's method.
- Reviewers are advisory; challenge a review CRITICAL that would force a regression.
