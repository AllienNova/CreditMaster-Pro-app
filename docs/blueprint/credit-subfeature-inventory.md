# Credit Vertical Sub-Feature Inventory

> **Purpose:** Before/after evidence for the Credit vertical (CRD-1 through CRD-4).
> This doc is created by TASK-CRD-1 and updated as CRD-2/3/4 land — each sub-feature row
> will flip from `DEGRADED`/`MOCK` to `WORKING` once its task closes.
>
> **Verification baseline:** HEAD `remediation/wave-7-foundation`, verified 2026-05-17.
> TypeScript: 0 errors (`npx tsc --noEmit`). Routes enumerated by direct file inspection.

---

## Section 1 — Dispute Architecture Map

This section is the primary input to CRD-3's canonical-store decision.

### The Four Dispute Modules

#### Module 1 — `src/lib/disputes/dispute-service.ts`

- **Persistence kind:** In-memory `Map`. Line 87: `private disputes: Map<string, Dispute> = new Map();`
- **DB table accessed:** None. All CRUD operates on the process-local Map.
- **Route files that import it:**
  - `src/app/api/disputes/route.ts` line 3: `import { disputeService } from "@/lib/disputes/dispute-service";`
  - `src/app/api/disputes/[id]/route.ts` line 10: `import { disputeService } from "@/lib/disputes/dispute-service";`
  - `src/app/api/disputes/[id]/send/route.ts` line 8: `import { disputeService } from "@/lib/disputes/dispute-service";`
  - `src/app/api/disputes/stats/route.ts` line 8: `import { disputeService } from "@/lib/disputes/dispute-service";`
- **Dispute record shape (key fields):**
  ```
  id, userId, bureau, itemType, itemDescription, reason, status, outcome,
  createdAt, sentAt, updatedAt, resolvedAt, estimatedResolutionDate,
  letterContent, evidence, notes, timeline, templateId, strategyId,
  strategyPhase, escalationLevel
  ```
  Notable: includes `reason` (free-text), rich timeline events, strategy/template linking,
  and `evidence[]`. No `inaccuracyType`, `strategy` enum, `creditorName`, `balance`.
- **Status: DEGRADED — non-persistent (in-memory Map).** De-mock target for CRD-3.

#### Module 2 — `src/lib/disputes/dispute-service-db.ts`

- **Persistence kind:** Real Supabase table. Line 21: `const disputes = () => getSupabase().from("disputes");`
- **DB table accessed:** `disputes` — the table defined in `supabase/migrations/001_initial_schema.sql`.
  Schema (from `src/lib/supabase/types.ts` lines 65–108):
  ```
  id, user_id, bureau, status, item_type, item_description,
  reason, letter_content, outcome, created_at, sent_at, resolved_at
  ```
- **Route files that import it:** None confirmed (`git grep -n "dispute-service-db" src/` returned no hits).
  This service is dead code — written but never wired.
- **Dispute record shape (key fields):**
  ```
  id, userId, bureau, itemType, itemDescription, reason, status, outcome,
  createdAt, sentAt, resolvedAt, letterContent
  ```
  Matches the `disputes` table in `types.ts`. Same concept as Module 1 (bureau-based FCRA dispute
  with `reason` and `letter_content`).
- **IDOR status:** `getDispute` (line 99) queries `.eq("id", disputeId)` only — no `user_id` filter.
  `sendDispute` (line 145) and `updateDisputeStatus`/`resolveDispute` (lines 172, 201) also key
  only on `disputeId`. Requires IDOR fix in CRD-3.

#### Module 3 — `src/lib/credit-repair/dispute-service.ts`

- **Persistence kind:** Partial DB. `getSupabase()` is called (line 10), and one method —
  `trackDisputeProgress` (line 322) — queries `.from("disputes").select("*").eq("id", disputeId)`.
  However, this service's primary role is AI-dispute-letter generation: `scanForInaccuracies`,
  `selectStrategy`, `generateDisputeLetter` — these are computation-only, no writes.
  It does NOT create or update dispute records itself.
- **DB table accessed:** `disputes` — reads only, single record by id (no `user_id` filter on
  `trackDisputeProgress`, a latent IDOR risk if the caller does not pre-validate ownership).
- **Route files that import it:**
  - `src/app/api/credit-repair/disputes/route.ts` line 20: `import { disputeService } from "@/lib/credit-repair";`
    (re-exported through `src/lib/credit-repair/index.ts`)
- **Dispute record shape:** Uses `DisputeItem` from `./types` — the credit-repair workflow type
  (includes `inaccuracyType`, `strategy`, `creditorName`, `accountNumber`, `balance`).
- **Role:** AI strategy selection + letter generation helper. The CRUD persistence for
  `api/credit-repair/disputes/**` is handled by Module 4.

#### Module 4 — `src/lib/credit-repair/db/disputes-db-service.ts`

- **Persistence kind:** Real Supabase table. `supabase.from("disputes")` used in 10 places
  (lines 116, 152, 181, 233, 267, 304, 346, 371, 401, 460). Full default export at line 521.
- **DB table accessed:** `disputes` — but the *credit-repair schema* version defined in
  `supabase/migrations/20250204000000_credit_repair_schema.sql` (lines 123–155). This schema is
  a superset of the initial schema with additional columns:
  ```
  id, user_id, item_type, item_description, creditor_name, account_number,
  balance, inaccuracy_type, strategy (10-value CHECK), letter_content,
  status (6-value CHECK including "escalated"), bureau, sent_at,
  response_received_at, outcome (4-value including "pending"), notes,
  created_at, updated_at
  ```
  Key additions vs the initial schema: `inaccuracy_type`, `strategy`, `creditor_name`,
  `account_number`, `balance`, `response_received_at`, `notes`, `updated_at`.
  **Note:** The initial migration creates `disputes` first; the credit-repair migration uses
  `CREATE TABLE IF NOT EXISTS disputes` — at runtime only ONE table exists. Both migrations
  target the same `disputes` table name, but the credit-repair migration schema includes the
  additional columns. The `types.ts` `disputes` Row type only reflects the minimal schema
  (no `inaccuracy_type`, `strategy`, etc.), suggesting the types.ts was not updated after the
  credit-repair migration ran.
- **Route files that import it:**
  - `src/app/api/credit-repair/disputes/route.ts` line 22: `import { db } from "@/lib/credit-repair/db";`
  - `src/app/api/credit-repair/disputes/[id]/route.ts` line 21: `import { db } from "@/lib/credit-repair/db";`
- **Dispute record shape (key fields from `db/types.ts` `Dispute` interface):**
  ```
  id, userId, itemType, itemDescription, creditorName, accountNumber, balance,
  inaccuracyType, strategy (DisputeStrategy enum), letterContent, status,
  bureau, sentAt, responseReceivedAt, outcome, notes, createdAt, updatedAt
  ```
- **IDOR status:** `getDispute(disputeId, userId)` (line 146) correctly includes `.eq("user_id", userId)`.
  `getDisputesByUser` (line 175), `getDisputesByStatus` (line 226), `getDisputesByBureau` (line 261)
  all scope by `user_id`. `updateDispute(disputeId, userId, ...)` (line 294) includes
  `.eq("user_id", userId)`. User-scoped throughout.

---

### Definitive Same-Feature vs. Distinct-Surfaces Determination

**Finding: `api/disputes/**` (Module 1) and `api/credit-repair/disputes/**` (Module 4) are DISTINCT SURFACES on the SAME physical database table (`disputes`), but with DIFFERENT schema expectations and DIFFERENT workflow concepts.**

**Evidence:**

1. **Same table name, different schema expectations.** Both Module 2 (the DB-backed sibling of
   Module 1) and Module 4 call `.from("disputes")`. However:
   - Module 2/1 expects columns: `reason`, `letter_content` (no strategy enum, no inaccuracy_type)
   - Module 4 expects columns: `inaccuracy_type`, `strategy`, `creditor_name`, `account_number`,
     `balance`, `response_received_at`, `notes`, `updated_at`
   - The `types.ts` only models the minimal schema (Module 2's view), meaning the credit-repair
     migration columns are present in the DB but absent from TypeScript types.

2. **Different conceptual model:**
   - `api/disputes/**` — a general bureau-dispute tool: user picks a bureau, describes an item,
     provides free-text `reason`, system generates `letter_content`. Tracks per-bureau status
     (draft → sent → under_review → resolved/rejected). Includes AI letter generation, templates,
     strategies (client-side enum, not DB column).
   - `api/credit-repair/disputes/**` — a credit-repair workflow tool: dispute is part of a broader
     repair campaign with `inaccuracy_type`, a structured `strategy` (10-value DB CHECK), creditor/
     account metadata, settlement negotiation linkage. Richer lifecycle including `response_received_at`
     and `outcome: "pending"` (Module 4) vs Module 1's `outcome: "removed"|"updated"|"verified"`.

3. **Different insertion data.** Module 4's `createDispute` writes `inaccuracy_type` (NOT NULL in
   migration) and `strategy` (NOT NULL with CHECK). Module 2's `createDispute` writes `reason`
   and `letter_content` (NOT NULL in the initial schema). These are incompatible inserts against
   the same table — the table can only satisfy one set of NOT NULL constraints at runtime,
   meaning the credit-repair migration effectively replaced or extended the initial schema.

**Architectural implication for CRD-3:** The `api/disputes/**` route tree should be de-mocked
onto Module 2 (`dispute-service-db.ts`) which targets the `disputes` table with the simpler
`reason`/`letter_content` model matching the minimal schema in `types.ts`. Module 4 should remain
as the canonical store for `api/credit-repair/disputes/**`. This avoids merging two distinct
dispute workflows and respects the existing `types.ts` schema contract. The two-surface decision
is recommended, not ambiguous.

**STOP-valve check:** The determination is mechanically clear from the evidence above. CRD-3
may proceed without human escalation, using Module 2 as the canonical store for `api/disputes/**`.

---

## Section 2 — Sub-Feature Route Inventory

### Route Enumeration (57 routes across credit domain)

#### `api/disputes/**` (8 routes)

| Path | Methods | Auth Guard | Service Wiring |
|------|---------|-----------|----------------|
| `api/disputes` | GET, POST, PATCH, DELETE | `withAuth` | `disputes/dispute-service.ts` (in-memory) |
| `api/disputes/[id]` | GET, PATCH, DELETE | `withAuth` | `disputes/dispute-service.ts` (in-memory) |
| `api/disputes/[id]/send` | PATCH | `withAuth` | `disputes/dispute-service.ts` (in-memory) |
| `api/disputes/stats` | GET | `withAuth` | `disputes/dispute-service.ts` (in-memory) |
| `api/disputes/generate` | GET, POST | `withAuth` | `ai-orchestrator` + `credits` (no Map) |
| `api/disputes/generate-student-loan` | GET, POST | `withPermission("disputes:create")` | `advanced-dispute-engine` |
| `api/disputes/reasons` | GET | `withAuth` | Static constants (no persistence) |
| `api/disputes/strategies` | GET | `withAuth` | Static constants (no persistence) |
| `api/disputes/templates` | GET, POST | `withAuth` | Static constants (no persistence) |

#### `api/credit-repair/**` (12 routes)

| Path | Methods | Auth Guard | Service Wiring |
|------|---------|-----------|----------------|
| `api/credit-repair/disputes` | GET, POST | `withAuth` | `credit-repair/db` (Module 4, real DB) |
| `api/credit-repair/disputes/[id]` | GET, PUT, DELETE | `withAuth` | `credit-repair/db` (Module 4, real DB) |
| `api/credit-repair/goodwill` | GET, POST | `withAuth` | `credit-repair/db` (real DB) |
| `api/credit-repair/goodwill/[id]` | GET, PUT, DELETE | `withAuth` | `credit-repair/db` (real DB) |
| `api/credit-repair/negotiate` | GET, POST | `withAuth` | `credit-repair/db` (real DB) |
| `api/credit-repair/negotiate/[id]` | GET, PUT, DELETE | `withAuth` | `credit-repair/db` (real DB) |
| `api/credit-repair/cards` | GET, POST | `withAuth` | `credit-repair/db` (real DB) |
| `api/credit-repair/cards/[id]` | GET, PUT, DELETE | `withAuth` | `credit-repair/db` (real DB) |
| `api/credit-repair/reports` | GET, POST | `withAuth` | `credit-repair/db` (real DB) |
| `api/credit-repair/reports/[id]` | GET, DELETE | `withAuth` | `credit-repair/db` (real DB) |
| `api/credit-repair/score` | GET, POST | `withAuth` | `credit-repair/db` (real DB) |
| `api/credit-repair/impact` | POST | `withAuth` | `credit-repair-service` (computation) |
| `api/credit-repair/quick-wins` | GET | `withAuth` | `credit-repair-service` (computation) |

#### `api/documents/**` (3 routes)

| Path | Methods | Auth Guard | Service Wiring |
|------|---------|-----------|----------------|
| `api/documents` | GET, POST, PATCH, DELETE | `withAuth` | `documents/document-service.ts` (in-memory) |
| `api/documents/upload` | POST | `withAuth` | `documents/document-service.ts` (in-memory) |
| `api/documents/share` | POST | `withAuth`/`withPermission` | `documents/document-service.ts` (in-memory) |

#### `api/credit/**` (2 routes)

| Path | Methods | Auth Guard | Service Wiring |
|------|---------|-----------|----------------|
| `api/credit/analyze` | GET, POST | `withAuth` | `ai-orchestrator` |
| `api/credit/factors` | GET | `withAuth` | Computation (score factor logic) |

#### `api/credit-builder/**` (5 routes)

| Path | Methods | Auth Guard | Service Wiring |
|------|---------|-----------|----------------|
| `api/credit-builder/loans` | GET, POST | `withAuth` | `credit-builder-service` (Supabase) |
| `api/credit-builder/score` | GET | `withAuth` | `credit-builder-service` (Supabase) |
| `api/credit-builder/progress` | GET | `withAuth` | `credit-builder-service` (Supabase) |
| `api/credit-builder/recommendations` | GET | `withAuth` | `credit-builder-service` (Supabase) |
| `api/credit-builder/secured-cards` | GET | `withAuth` | `credit-builder-service` (Supabase) |

#### `api/credit-bureau/**` (6 routes)

| Path | Methods | Auth Guard | Service Wiring |
|------|---------|-----------|----------------|
| `api/credit-bureau/analyze` | POST | `withPermission` | `credit-bureau-service` |
| `api/credit-bureau/connect` | GET, POST | `withPermission` | `credit-bureau-service` |
| `api/credit-bureau/dispute` | POST | `withPermission` | `credit-bureau-service` |
| `api/credit-bureau/report` | GET, POST | `withPermission` | `credit-bureau-service` |
| `api/credit-bureau/score-history` | GET | `withPermission` | `credit-bureau-service` |
| `api/credit-bureau/test-import` | GET, POST | `withAuth` | Mock credit bureau adapter |

#### `api/credit-monitoring/**` (5 routes)

| Path | Methods | Auth Guard | Service Wiring |
|------|---------|-----------|----------------|
| `api/credit-monitoring` | GET, POST | `withAuth` | `credit-monitoring-service` (Supabase) |
| `api/credit-monitoring/alerts` | GET | `withPermission` | `credit-monitoring-service` (Supabase) |
| `api/credit-monitoring/history` | GET | `withAuth` | `credit-monitoring-service` (Supabase) |
| `api/credit-monitoring/scores` | GET | `withAuth` | `credit-monitoring-service` (Supabase) |
| `api/credit-monitoring/settings` | GET, PUT | `withAuth` | `credit-monitoring-service` (Supabase) |

#### `api/credit-report/**` (1 route)

| Path | Methods | Auth Guard | Service Wiring |
|------|---------|-----------|----------------|
| `api/credit-report/analyze` | GET, POST | `withAuth` | `credit-report-parser` + AI |

#### `api/credits/**` (3 routes — credits ledger)

| Path | Methods | Auth Guard | Service Wiring |
|------|---------|-----------|----------------|
| `api/credits/balance` | GET | `withAuth` | `credit-service` + `supabaseAdmin.from("credit_transactions")` |
| `api/credits/history` | GET | `withAuth` | `credit-service` + `supabaseAdmin.from("credit_transactions")` |
| `api/credits/purchase` | POST | `withAuth` | `supabaseAdmin.from("profiles")` + Stripe |

#### `api/financial/credit*` and `api/financial/disputes/**` (4 routes)

| Path | Methods | Auth Guard | Service Wiring |
|------|---------|-----------|----------------|
| `api/financial/credit/ai-insights` | GET | `withPermission` | AI orchestrator |
| `api/financial/credit/simulator` | GET, POST | `withPermission` | AI orchestrator |
| `api/financial/credit-builder/ai-roadmap` | GET, POST | `withPermission` | AI orchestrator |
| `api/financial/credit-repair/ai-strategy` | GET, POST | `withPermission` | AI orchestrator |
| `api/financial/disputes/ai-strategy` | GET | `withPermission` | AI orchestrator |

#### `api/marketplace/tradelines/**` (2 routes)

| Path | Methods | Auth Guard | Service Wiring |
|------|---------|-----------|----------------|
| `api/marketplace/tradelines` | GET | None (unauthenticated) | `tradeline-service` → `supabase.from("tradelines")` |
| `api/marketplace/tradelines/[id]` | GET | None (unauthenticated) | `tradeline-service` → `supabase.from("tradelines")` |

#### `api/tax/documents/**` (2 routes)

| Path | Methods | Auth Guard | Service Wiring |
|------|---------|-----------|----------------|
| `api/tax/documents` | GET, DELETE | `withAuth` | `getSupabase()` directly |
| `api/tax/documents/upload` | POST | `withAuth` | `taxDocumentProcessor` + `createClient()` |

---

## Section 3 — Service Library Enumeration

### `src/lib/disputes/`

| File | Exports / Entry Points |
|------|----------------------|
| `dispute-service.ts` | `disputeService` singleton (`DisputeService` class), `Dispute`, `DisputeStats`, `DisputeStatus`, `Bureau` |
| `dispute-service-db.ts` | `DisputeServiceDB` class (no default export — must be instantiated), `Dispute`, `DisputeStats`, `DisputeStatus`, `Bureau` |
| `advanced-strategies.ts` | `ALL_ADVANCED_STRATEGIES`, `getStrategyById`, `recommendStrategy`, `generateStrategyPrompt`, `AdvancedStrategy`, `StrategyTracking` |

### `src/lib/documents/`

| File | Exports / Entry Points |
|------|----------------------|
| `document-service.ts` | `documentService` singleton (`DocumentService` class), `Document`, `DocumentType`, `ShareLink` |
| `document-service-db.ts` | `DocumentServiceDB` class, `getSupabase().from("documents")` |
| `document-categorizer.ts` | `documentCategorizer` — categorization logic |
| `ocr-bridge-service.ts` | OCR integration |
| `text-extraction-service.ts` | Text extraction from PDFs/images |

### `src/lib/credit/services/`

| File | Exports / Entry Points | Supabase Client | IDOR Status |
|------|----------------------|----------------|------------|
| `CreditBuilderLoanService.ts` | `creditBuilderLoanService` singleton | `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS) | `updateApplication` keyed on `.eq("id", applicationId)` only — IDOR (confirmed: line 586). `getApplicationsByUser` correctly scopes `.eq("user_id", userId)` (line 596). |
| `RentReportingService.ts` | `rentReportingService` singleton | `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS) | `updateAccount` keyed on `.eq("id", accountId)` only (line 394). `getPaymentHistory` keyed on `.eq("account_id", accountId)` (line 452) — no `user_id` filter. Both are IDORs. |
| `GoodwillLetterService.ts` | `goodwillLetterService` singleton | `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS) | Requires audit in CRD-2. |
| `SecuredCardRecommendationService.ts` | `securedCardRecommendationService` singleton | `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS) | Requires audit in CRD-2. |
| `CreditScoreSimulator.ts` | `creditScoreSimulator` singleton | Anon client | Requires audit in CRD-2. |
| `DisputeLetterGenerator.ts` | `disputeLetterGenerator` singleton | None (computation) | N/A. |

### `src/lib/credit-builder/`

| File | Exports / Entry Points |
|------|----------------------|
| `credit-builder-service.ts` | `creditBuilderService` singleton — tables: `credit_scores`, `credit_builder_actions`, `user_profiles`, `financial_accounts` |
| `goal-tracker-service.ts` | `goalTrackerService` — requires audit in CRD-2 |
| `score-simulator-service.ts` | `scoreSimulatorService` — requires audit in CRD-2 |

### `src/lib/credits/`

| File | Exports / Entry Points |
|------|----------------------|
| `credit-service.ts` | `creditService` singleton — `supabaseAdmin` → `user_credits`, `credit_transactions` tables |
| `credit-costs.ts` | `CREDIT_COSTS`, `CREDIT_PACKS` constants |
| `credit-reset.ts` | Monthly credit reset logic |
| `types.ts` | `CreditPackType`, `CreditTransaction`, etc. |
| `index.ts` | Re-exports `creditService`, `CREDIT_COSTS` |

### `src/lib/credit-repair/`

| File | Exports / Entry Points |
|------|----------------------|
| `dispute-service.ts` (Module 3) | `disputeService` singleton — AI letter generation + `trackDisputeProgress` |
| `credit-repair-service.ts` | `creditRepairService` singleton |
| `negotiation-service.ts` | `negotiationService` singleton |
| `ai-dispute-analyzer.ts` | `analyzeDispute` function |
| `db-legacy.ts` | Legacy DB shim |
| `types.ts` | `DisputeItem`, `DisputeStrategy`, `LetterGenerationResponse`, etc. |
| `index.ts` | Re-exports `disputeService`, `creditRepairService`, `negotiationService` |

### `src/lib/credit-repair/db/`

| File | Exports / Entry Points |
|------|----------------------|
| `disputes-db-service.ts` (Module 4) | `createDispute`, `getDispute`, `getDisputesByUser`, `getDisputesByStatus`, `getDisputesByBureau`, `updateDispute`, `deleteDispute`, `disputesDbService` default |
| `goodwill-db-service.ts` | `goodwillDbService` default — CRUD on goodwill letters |
| `credit-cards-db-service.ts` | `creditCardsDbService` default — CRUD on credit cards |
| `credit-reports-db-service.ts` | `creditReportsDbService` default — CRUD on credit reports |
| `negotiations-db-service.ts` | `negotiationsDbService` default — CRUD on negotiations |
| `credit-repair-db-service.ts` | `creditRepairDbService` default — score + actions + progress |
| `index.ts` | `db` unified object: `db.disputes`, `db.goodwill`, `db.creditCards`, `db.creditReports`, `db.negotiations`, `db.creditRepair` |
| `types.ts` | All domain types: `Dispute`, `GoodwillLetter`, `Negotiation`, `CreditCard`, `CreditReport`, `CreditRepairScore`, etc. |

---

## Section 4 — Pages and Components Enumeration

### Credit-Domain Pages (27 pages)

| Page | Route |
|------|-------|
| Credit overview | `src/app/credit/page.tsx` |
| Credit builder | `src/app/credit-builder/page.tsx` |
| Credit monitoring | `src/app/credit-monitoring/page.tsx` |
| Credit repair | `src/app/credit-repair/page.tsx` |
| Credit reports | `src/app/credit-reports/page.tsx` |
| Disputes | `src/app/disputes/page.tsx` |
| Disputes [id] detail | `src/app/disputes/[id]/page.tsx` |
| Disputes wizard | `src/app/disputes/wizard/page.tsx` |
| Disputes new | `src/app/disputes/new/page.tsx` |
| Disputes student loans | `src/app/disputes/student-loans/page.tsx` |
| Documents | `src/app/documents/page.tsx` |
| Documents [id] | `src/app/documents/[id]/page.tsx` |
| Credit repair — cards | `src/app/credit-repair/cards/page.tsx` |
| Credit repair — disputes | `src/app/credit-repair/disputes/page.tsx` |
| Credit repair — goodwill | `src/app/credit-repair/goodwill/page.tsx` |
| Credit repair — inquiries | `src/app/credit-repair/inquiries/page.tsx` |
| Credit repair — negotiate | `src/app/credit-repair/negotiate/page.tsx` |
| Credit repair — payments | `src/app/credit-repair/payments/page.tsx` |
| Credit repair — building | `src/app/credit-repair/building/page.tsx` |
| Credit builder — loan | `src/app/credit-builder/loan/page.tsx` |
| Credit builder — score simulator | `src/app/credit-builder/score-simulator/page.tsx` |
| Credit builder — secured card | `src/app/credit-builder/secured-card/page.tsx` |
| Credit builder — goals | `src/app/credit-builder/goals/page.tsx` |
| Credit builder — reports/upload | `src/app/credit-builder/reports/upload/page.tsx` |
| Tax documents | `src/app/tax/documents/page.tsx` |
| Analytics — disputes | `src/app/analytics/disputes/page.tsx` |
| Dashboard — disputes | `src/app/dashboard/disputes/page.tsx` |
| Dashboard — documents | `src/app/dashboard/documents/page.tsx` |
| Admin — disputes (out of scope) | `src/app/admin/disputes/page.tsx` |

### Credit-Domain Components (46 components)

**disputes/** (8): `AIDisputeStrategy`, `CreateDisputeForm`, `DisputeActions`, `DisputeDetail`,
`DisputeList`, `DisputeStats`, `DisputeStrategyCard`, `DisputeTimeline`

**documents/** (6): `DocumentCard`, `DocumentLibrary`, `DocumentShareModal`, `DocumentStats`,
`DocumentUpload`, `DocumentViewer`

**credits/** (4): `CreditBalance`, `CreditPurchaseModal`, `CreditUsageHistory`, `LowCreditBanner`

**credit-repair/** (9): `AICreditRepairStrategy`, `CreditBuilding`, `CreditRepairDashboard`,
`DisputeAccelerator`, `DisputeDashboard`, `GoodwillLetterGenerator`, `InquiryRemovalTool`,
`PayForDeleteNegotiator`, `PaymentTimingOptimizer`, `UtilizationOptimizer`

**credit-bureau/** (3): `CreditReportImport`, `CreditReportViewer`, `CreditScoreCard`

**credit-monitoring/** (6): `AICreditInsights`, `CreditAlertsList`, `CreditMonitoringDashboard`,
`CreditScoreCard`, `CreditScoreChart`, `MonitoringSettings`

**credit-builder/** (1): `AICreditRoadmap`

**credit/** (1): `ScoreGauge`

**aiml/** (2, credit-related): `CreditAnalyzer`, `DisputeGenerator`

**persona/** (1): `CreditScoreSimulator`

---

## Section 5 — Persistence-Aware Verify-Pass (Spot-Check ≥12 Routes)

### Sub-Feature Table

| Sub-Feature | Key Files | Status | Notes |
|-------------|-----------|--------|-------|
| Disputes — general (`api/disputes/`) | `disputes/dispute-service.ts` (in-memory Map) | **DEGRADED — non-persistent (in-memory Map)** | De-mock target CRD-3. 4 routes (GET/POST/PATCH/DELETE list + CRUD + send + stats) backed by process-local Map. Disputes vanish on cold start. FCRA records lost. |
| Disputes — credit repair (`api/credit-repair/disputes/`) | `credit-repair/db/disputes-db-service.ts` + Module 3 | **WORKING** | Real `disputes` table. User-scoped queries. `withAuth` on all routes. |
| Documents (`api/documents/`) | `documents/document-service.ts` (in-memory Map) | **DEGRADED — non-persistent (in-memory Map)** | De-mock target CRD-4. Both `documents` Map and `shareLinks` Map lose state on cold start. |
| Credits ledger (`api/credits/`) | `credits/credit-service.ts` → `supabaseAdmin` | **WORKING** | Real `user_credits` + `credit_transactions` tables. `withAuth` on all routes. User-scoped. |
| Credit Builder (`api/credit-builder/`) | `credit-builder/credit-builder-service.ts` | **WORKING** | Real Supabase tables: `credit_scores`, `credit_builder_actions`, `user_profiles`. `withAuth` on all routes. IDOR sweep needed (CRD-2): `CreditBuilderLoanService.updateApplication` is unscoped. |
| Credit Monitoring (`api/credit-monitoring/`) | `credit-monitoring/credit-monitoring-service.ts` | **WORKING** | Real tables: `credit_scores`, `credit_monitoring_settings`, `credit_alerts`. `withAuth`/`withPermission`. |
| Credit Repair — goodwill (`api/credit-repair/goodwill/`) | `credit-repair/db/goodwill-db-service.ts` | **WORKING** | Real DB table. `withAuth`. Audit in CRD-2 for IDOR. |
| Credit Repair — negotiations (`api/credit-repair/negotiate/`) | `credit-repair/db/negotiations-db-service.ts` | **WORKING** | Real DB table. `withAuth`. Audit in CRD-2. |
| Credit Repair — cards (`api/credit-repair/cards/`) | `credit-repair/db/credit-cards-db-service.ts` | **WORKING** | Real DB table. `withAuth`. Audit in CRD-2. |
| Credit Repair — reports (`api/credit-repair/reports/`) | `credit-repair/db/credit-reports-db-service.ts` | **WORKING** | Real DB table. `withAuth`. Audit in CRD-2. |
| Credit Repair — score (`api/credit-repair/score/`) | `credit-repair/db/credit-repair-db-service.ts` | **WORKING** | Real DB table. `withAuth`. |
| Credit bureau (`api/credit-bureau/`) | `credit-bureau/credit-bureau-service.ts` | **WORKING** | `withPermission` guards. Reads from bureau clients (external). Note: `test-import` uses mock adapter. |
| Credit/factors + analyze (`api/credit/`) | `ai-orchestrator` | **WORKING** | AI computation + `withAuth`. No persistent state. |
| Credit report analyze (`api/credit-report/analyze`) | `credit-report-parser` | **WORKING** | Stateless analysis. `withAuth`. |
| Marketplace tradelines (`api/marketplace/tradelines/`) | `tradeline-service` → `supabase.from("tradelines")` | **DEGRADED — no auth guard** | Real DB table, but both `GET /tradelines` and `GET /tradelines/[id]` use bare `export async function GET()` — no `withAuth`/`withPermission` wrapper. Out of this vertical's de-mock scope per plan, but the missing auth is notable. |
| Tax documents (`api/tax/documents/`) | `getSupabase()` directly + `taxDocumentProcessor` | **WORKING** | Real Supabase calls. `withAuth`. Out of credit vertical scope. |
| AI dispute strategy + credit insights (financial/) | `ai-orchestrator` | **WORKING** | `withPermission` guards. AI computation, no persistent credit state. |

### Spot-Check Route Count: 17 routes verified (exceeds requirement of ≥12)

---

## Section 6 — Scope Boundary: `admin/disputes`

`src/app/admin/disputes/page.tsx` and `src/app/api/admin/disputes/route.ts` are **out of scope** for this vertical.

- **FND-051/054** (admin/disputes unauth'd + mass-assignment) — assigned to Track N / TASK-ADM-02.
- AUTH-03 already closed FND-051's "zero auth" aspect: `admin/disputes` is now `withRole("admin")`-wrapped.
- Remaining mass-assignment finding is Track N work. Do not touch `admin/disputes` in CRD-1 through CRD-4.

---

## Section 7 — Additional DEGRADED/MOCK Findings Beyond Disputes & Documents

### Finding: `marketplace/tradelines` — Missing Auth Guard

**Severity:** Moderate (data exposure, not IDOR because tradelines are not user-owned records — they are marketplace listings). Out of this vertical's scope per the plan. However, both tradeline routes use bare `export async function GET()` with no `withAuth` wrapper, exposing marketplace data without authentication. This should be tracked under the IDOR sweep (TASK-IDR) or admin domain remediation, not CRD-1–4.

**Recommendation:** Log as a separate finding for the IDOR sweep phase. Do not block CRD-2/3/4 on it.

### Finding: `dispute-service-db.ts` (Module 2) — IDOR on resource-keyed methods

`getDispute(disputeId)`, `sendDispute(disputeId)`, `updateDisputeStatus(disputeId)`, and
`resolveDispute(disputeId)` query/update by `disputeId` only — no `user_id` filter. As the
de-mock target for CRD-3, these must be patched to include `.eq("user_id", userId)` before
Module 2 is wired to `api/disputes/**`. CRD-3 owns this fix.

### Finding: `credit-repair/dispute-service.ts` (Module 3) — Latent IDOR

`trackDisputeProgress(disputeId)` queries `.from("disputes").select("*").eq("id", disputeId)` with
no `user_id` filter. This method is called from `api/credit-repair/disputes/route.ts` which already
validates the user via `withAuth`, but passes `disputeId` from request body without confirming
ownership before calling. Low severity (ownership is not verified at the service layer). CRD-3
should note this but it is not a direct IDOR if the route caller validates ownership through Module 4
first.

---

_Created by TASK-CRD-1, 2026-05-17. To be updated as CRD-2/3/4 close and sub-features flip to WORKING._
