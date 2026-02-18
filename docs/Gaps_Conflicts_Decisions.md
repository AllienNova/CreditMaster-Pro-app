# Gaps, Conflicts & Pending Decisions — Fynvita Platform

> **Tracks all discrepancies between documentation and code, implementation gaps, and unresolved architectural decisions.**
> Last Updated: 2026-02-16

---

## 1. Conflicts (Documentation vs. Code)

| ID     | Area               | Doc Claims                                    | Actual Code                                                                                             | Severity | Resolution                               |
| ------ | ------------------ | --------------------------------------------- | ------------------------------------------------------------------------------------------------------- | -------- | ---------------------------------------- |
| CON-01 | API Routes         | CLAUDE.md: "21 API routes"                    | 248 route.ts files under src/app/api/                                                                   | HIGH     | Update CLAUDE.md to reflect actual count |
| CON-02 | Pages              | CLAUDE.md: "6 pages"                          | 180 page.tsx files under src/app/                                                                       | HIGH     | Update CLAUDE.md to reflect actual count |
| CON-03 | Components         | CLAUDE.md: "10+ components"                   | 225 component files across 37 directories                                                               | HIGH     | Update CLAUDE.md to reflect actual count |
| CON-04 | Lines of Code      | CLAUDE.md: "15,000+"                          | 79,612 (verified via `wc -l` on all .ts/.tsx)                                                           | MEDIUM   | Update CLAUDE.md to reflect actual count |
| CON-05 | Files              | CLAUDE.md: "60+ files"                        | 1,296 source files (src/ only)                                                                          | HIGH     | Update CLAUDE.md                         |
| CON-06 | Test Count         | CLAUDE.md: "83 tests"                         | ~1,690+ test cases across 198 test files                                                                | HIGH     | Update CLAUDE.md                         |
| CON-07 | Test Coverage      | CLAUDE.md: "81.42%"                           | Unknown — likely higher with 198 test files                                                             | MEDIUM   | Run fresh coverage report                |
| CON-08 | Pricing Tiers      | CLAUDE.md: "3 tiers ($29, $79, $199)"         | 6 tiers (Free $0, Standard $29.99, Pro $99.99, Family Duo $159.99, Family $199.99, Family Plus $399.99) | HIGH     | Update CLAUDE.md pricing section         |
| CON-09 | Subscription Names | CLAUDE.md: "Basic/Premium/Enterprise"         | Free/Standard/Pro/Family Duo/Family/Family Plus                                                         | HIGH     | Update all docs referencing old names    |
| CON-10 | Build Time         | CLAUDE.md: "~11 seconds"                      | Not verified — likely different post-expansion                                                          | LOW      | Re-measure and update                    |
| CON-11 | Bundle Size        | CLAUDE.md: "102 kB"                           | Not verified — likely different with 179 components                                                     | LOW      | Re-measure and update                    |
| CON-12 | Completion         | CLAUDE.md: "100/110 (90.9%)"                  | Many features are aspirational per docs analysis                                                        | MEDIUM   | Audit actual feature completion          |
| CON-13 | Supabase Client    | CLAUDE.md references `src/lib/supabase.ts`    | File exists but is deprecated — should use `@/lib/supabase/client`                                      | MEDIUM   | Update references                        |
| CON-14 | Project Name       | CLAUDE.md title says "CPFI" in places         | Project renamed to "Fynvita"                                                                            | MEDIUM   | Standardize all references               |
| CON-15 | Repo URL           | CLAUDE.md: "CreditMaster-Pro-app"             | GitHub repo is AllienNova/CreditMaster-Pro-app but brand is Fynvita                                     | LOW      | Align repo name or update docs           |
| CON-16 | Doc Count          | No central doc inventory existed              | 95 markdown files in docs/ directory                                                                    | MEDIUM   | Now tracked in Plan_Index.md             |
| CON-17 | Aspirational Docs  | 25 docs describe features not yet implemented | Code may not support all described features                                                             | HIGH     | Tag aspirational docs clearly            |

---

## 2. Implementation Gaps

| ID     | Feature                   | Status       | Gap Description                                                                             | Priority | Effort |
| ------ | ------------------------- | ------------ | ------------------------------------------------------------------------------------------- | -------- | ------ |
| GAP-01 | Credit Bureau Integration | Aspirational | Experian, Equifax, TransUnion API integration described in docs but not implemented in code | HIGH     | XL     |
| GAP-02 | Mobile App                | Docs only    | SCREEN_INVENTORY.md describes 196 mobile screens; no React Native/Expo code exists          | HIGH     | XXL    |
| GAP-03 | Trading System            | Partial      | TRADING_SYSTEM_AUDIT.md describes trading features; partial implementation                  | MEDIUM   | L      |
| GAP-04 | Tax Optimization          | Docs only    | TAX_OPTIMIZATION_MODULE.md describes tax features; limited code                             | MEDIUM   | L      |
| GAP-05 | Global Connector          | Aspirational | GLOBAL_CONNECTOR_STRATEGY_PLAN.md describes international features                          | LOW      | XXL    |
| GAP-06 | Intelligent Banking       | Aspirational | Implementation plan exists but limited code                                                 | MEDIUM   | XL     |
| GAP-07 | ML Predictions            | Not started  | Score prediction, timeline estimation described in CLAUDE.md "Next Steps"                   | MEDIUM   | L      |
| GAP-08 | Admin Console             | Partial      | Admin pages exist (15+) but completeness unclear                                            | MEDIUM   | M      |
| GAP-09 | Score Simulator           | Not verified | Listed in CLAUDE.md "Long-Term" goals                                                       | LOW      | M      |
| GAP-10 | Gamification              | Partial      | 5+ gamification components found; completeness unknown                                      | LOW      | M      |
| GAP-11 | White-label               | Not started  | Listed in CLAUDE.md "Long-Term" business goals                                              | LOW      | XL     |
| GAP-12 | Mobile App (Native)       | Not started  | No Flutter/Swift/Kotlin code found                                                          | LOW      | XXL    |
| GAP-13 | Real-time Features        | Unknown      | WebSocket/SSE implementation status unclear                                                 | MEDIUM   | L      |
| GAP-14 | Marketplace               | Partial      | 10+ marketplace pages and 12+ API routes exist; completeness unknown                        | MEDIUM   | M      |
| GAP-15 | Document Upload UI        | Unknown      | API exists (document-service.ts); UI integration status unclear                             | MEDIUM   | S      |

---

## 3. Pending Architectural Decisions

| ID     | Decision                | Options                                                                        | Context                                                          | Impact                           | Status                                 |
| ------ | ----------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------- | -------------------------------- | -------------------------------------- |
| DEC-01 | Supabase client pattern | (A) Keep deprecated proxy singleton (B) Migrate all to `@/lib/supabase/client` | Both patterns exist in codebase; `supabase.ts` marked deprecated | HIGH — affects all DB/auth calls | **Decided: B** — Migration in progress |
| DEC-02 | State management        | (A) React Context only (B) Add Zustand/Jotai (C) TanStack Query                | 97.8% client components suggests heavy client state              | MEDIUM                           | Open                                   |
| DEC-03 | Caching strategy        | (A) No caching (B) Redis (C) Next.js ISR (D) In-memory                         | Rate limiting uses in-memory Map; no Redis found                 | MEDIUM                           | Open                                   |
| DEC-04 | Real-time architecture  | (A) Polling (B) WebSockets (C) SSE (D) Supabase Realtime                       | Notification service exists but delivery mechanism unclear       | MEDIUM                           | Open                                   |
| DEC-05 | Monorepo structure      | (A) Keep single Next.js app (B) Split to monorepo (web + mobile + shared)      | Mobile app is in roadmap; current code is single app             | HIGH if mobile planned           | Open                                   |
| DEC-06 | API versioning          | (A) No versioning (B) URL-based (/api/v1/) (C) Header-based                    | Current routes have no versioning                                | LOW (until public API)           | Open                                   |
| DEC-07 | Feature flag system     | (A) None (B) Environment variables (C) LaunchDarkly/Flagsmith                  | No feature flag infrastructure found                             | MEDIUM                           | Open                                   |
| DEC-08 | Error monitoring        | (A) Console logging only (B) Sentry (C) Datadog (D) Custom                     | logger.ts provides structured logging; no external error service | HIGH for production              | Open                                   |
| DEC-09 | CI/CD pipeline          | (A) GitHub Actions (B) Vercel CI (C) Both                                      | No .github/workflows found; deployment via Vercel auto-deploy    | MEDIUM                           | Open                                   |
| DEC-10 | Database migrations     | (A) Manual SQL (B) Prisma migrations (C) Supabase migrations                   | No migration files found; schema managed via Supabase dashboard  | HIGH                             | Open                                   |
| DEC-11 | Outdated docs cleanup   | (A) Archive all (B) Update individually (C) Delete stale                       | 11 outdated + 25 aspirational docs in docs/                      | MEDIUM                           | Open                                   |
| DEC-12 | Brand consolidation     | (A) Keep "CPFI" references (B) Full rename to "Fynvita"                        | Mixed branding in code and docs                                  | MEDIUM                           | **Decided: B** — In progress           |

---

## 4. Technical Debt Register

| ID    | Area                       | Description                                                                 | Risk                                  | Remediation                                   |
| ----- | -------------------------- | --------------------------------------------------------------------------- | ------------------------------------- | --------------------------------------------- |
| TD-01 | Deprecated Supabase client | `src/lib/supabase.ts` uses proxy-based lazy init pattern; marked deprecated | Import confusion, potential auth bugs | Migrate to `@/lib/supabase/client` everywhere |
| TD-02 | In-memory rate limiting    | `rate-limiting.ts` uses in-memory Map; resets on server restart             | Rate limits lost on deploy/restart    | Move to Redis or Supabase for persistence     |
| TD-03 | In-memory audit logs       | `audit-logging.ts` stores last 10K events in memory                         | Logs lost on restart; memory pressure | Persist to database or external service       |
| TD-04 | In-memory metrics          | `metrics.ts` stores all metrics in memory                                   | Data lost on restart                  | Persist to database or metrics service        |
| TD-05 | Mixed branding             | "CPFI", "CreditMaster", "Credit Pro" references alongside "Fynvita"         | User confusion, unprofessional        | Systematic rename to Fynvita                  |
| TD-06 | 95 doc files               | Many docs overlap, conflict, or are aspirational without clear status       | Developer confusion                   | Consolidate and tag with status               |
| TD-07 | No database migrations     | Schema managed via Supabase dashboard with no version control               | Unreproducible environments           | Add migration tooling                         |
| TD-08 | Large component files      | Some components 300-600+ lines                                              | Maintainability                       | Extract sub-components                        |
| TD-09 | Test coverage gaps         | 80% threshold may not cover all critical paths                              | Regressions in untested code          | Target 90% on critical services               |
| TD-10 | No CI/CD pipeline config   | No GitHub Actions or CI config in repo                                      | Manual deployment risk                | Add automated pipeline                        |

---

## 5. Security Findings

| ID     | Finding                     | Severity | Status   | Mitigation                                                       |
| ------ | --------------------------- | -------- | -------- | ---------------------------------------------------------------- |
| SEC-01 | Rate limiter in-memory      | MEDIUM   | Open     | Server restart clears limits; attacker can wait for deploy       |
| SEC-02 | PII detection regex-based   | LOW      | Accepted | Regex patterns may miss edge cases; acceptable for current scale |
| SEC-03 | No DAST scanning            | MEDIUM   | Open     | Add OWASP ZAP or similar to CI pipeline                          |
| SEC-04 | Audit logs in-memory        | MEDIUM   | Open     | Security events lost on restart                                  |
| SEC-05 | CSP allows external domains | LOW      | Accepted | Necessary for Stripe, Plaid, Supabase, AIML API                  |
| SEC-06 | No secret rotation          | LOW      | Open     | API keys and tokens have no rotation schedule                    |
| SEC-07 | MFA WebAuthn placeholder    | LOW      | Open     | TOTP works; WebAuthn not yet implemented                         |

---

## 6. Documentation Health

| Category                                  | Count  | Percentage | Action                   |
| ----------------------------------------- | ------ | ---------- | ------------------------ |
| Current & Accurate                        | 59     | 62%        | Maintain                 |
| Aspirational (describes unbuilt features) | 25     | 26%        | Tag clearly as "PLANNED" |
| Outdated (contradicts current code)       | 11     | 12%        | Archive to docs/archive/ |
| **Total**                                 | **95** | **100%**   |                          |

### Highest-Priority Doc Fixes

1. **CLAUDE.md** — Contains the most critical metric discrepancies (CON-01 through CON-12)
2. **README.md** — Should reflect current Fynvita brand and accurate metrics
3. **API_DOCUMENTATION.md** — Needs expansion from 21 to 248 routes
4. **Pricing docs** — Update from 3 tiers to 6 tiers everywhere

---

_Document generated from codebase analysis on 2026-02-16._
