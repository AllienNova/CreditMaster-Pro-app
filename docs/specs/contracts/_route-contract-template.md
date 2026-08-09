# Route contract template + per-route matrix (F-007)

Every new route in this plan follows this contract. Full OpenAPI exists for two representatives (`alerts.yaml`, `financial-crypto.yaml`); the rest are specified by this template + the matrix below. A full OpenAPI file is authored per route at build time from this row.

## Mandatory contract fields (every route)

1. **Auth** — `withAuth` / `withPermission("<domain>:<action>")` / `withRole("admin")`. `user.id` from the guard, never body/query.
2. **Scope** — every query `.eq("user_id", user.id)` or ownership-join (IDOR-safe; service-role bypasses RLS).
3. **Error model** — `{ error, message }`; 401 unauth, 403 forbidden/IDOR, 400 validation (Zod), 503 infra (never a mock fallback), 404 not-found. No fabricated data on any path.
4. **Idempotency** — writes that call an external system or mutate money carry an idempotency key; safe reads none.
5. **Rate limit** — shared platform limiter (`src/lib/api/rate-limit-headers.ts`); public routes get anti-scraping limits.
6. **PII class** — declared per route (see matrix); PII fields masked in logs.
7. **Pagination** — cursor for unbounded lists; documented max page size.
8. **Observability** — structured log with the authed `user.id` + route; no PII in the log line.

## Per-route matrix

| Route | FR | Method | Auth | PII class | Idempotency | Notes |
|---|---|---|---|---|---|---|
| /api/journey | 101 | GET/POST | withAuth | low (progress) | POST create: client-dedupe | — |
| /api/financial/crypto | 102 | GET/POST | withAuth | med (holdings) | **POST `sync` needs idempotency key** (external sync double-apply — F-007) | contract: financial-crypto.yaml |
| /api/financial/real-estate | 103 | GET/POST | withAuth | **high (property, address, mortgage $)** | POST add: idempotency key | money + PII → full OpenAPI required |
| /api/goals/shared | 104 | GET/POST | withAuth (membership) | med | **contribution via atomic RPC (ADR-0002); idempotency key on contribute** | money → full OpenAPI required |
| /api/credit-repair/accounts | 203 | GET | withPermission credit:read | **high (tradelines, FCRA)** | n/a | — |
| /api/credit-repair/disputable-items | 204 | GET | withPermission credit:read | **high (FCRA)** | n/a | union read |
| /api/activity | 205 | GET | withAuth | med | n/a | from notifications |
| /api/profile (expand) | 207 | GET/PATCH | withAuth | **high (dob, address, phone)** | PATCH: last-write-wins | left join (F-009) |
| /api/documents (+analysis) | 208 | GET | withAuth | **high (documents, analysis)** | n/a | analysis_result additive |
| /api/support | 209 | POST | withAuth | med (message) | client-dedupe | new table |
| /api/financial/insights/weekly-summary | 301 | GET | withPermission financial:read | med | n/a | avoid placeholder scoring |
| /api/alerts | 302 | GET | withPermission financial:read | med | n/a | contract: alerts.yaml |
| /api/admin/health | 303 | GET | withRole admin | none | n/a | probes; missing-env→degraded |
| /api/financial/vitality-score | 304 | GET | withAuth (ownership) | med | n/a | per ADR-0003 |

**Full OpenAPI required at build (money/high-PII):** real-estate (103), shared-goals (104), profile (207), documents (208), plus the two already written (crypto, alerts). The remainder are specified by this template row.
