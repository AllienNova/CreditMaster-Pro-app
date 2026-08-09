# Phantom Table Triage — Commerce / Affiliate / Payouts / Marketplace / Growth / Gamification

Slice owner: `triage-commerce`. Date: 2026-07-31.
Base commit: `c40260b`, branch `remediation/wave-7-foundation`.

## Method

- Absence verified against the live DB (56 migrations applied) via
  `psql -h 127.0.0.1 -p 54322`, querying `pg_class`/`pg_namespace` per table.
  **All 44 tables in this slice are ABSENT.** No exceptions.
- No migration file anywhere in `supabase/migrations/` contains a
  `create table` for any of the 44. Grep over all 56 migrations returned zero
  hits — these are not shadowed twins, they were never authored.
- Call sites collected with `grep -rn '\.from("<table>")' src mobile-app/src mobile-app/app`,
  excluding `__tests__`. **199 call sites across 20 non-test files.**
- Reachability traced through barrels (`src/lib/commerce/index.ts`,
  `src/lib/commerce/affiliate/index.ts`, `src/lib/gamification/index.ts`,
  `src/lib/goals/services/index.ts`, `src/lib/trading/lifecycle/index.ts`), not
  just direct path imports. A first-pass path grep produced false "dead"
  readings; the barrel pass corrected them.

## Headline

Four tables are reachable from a live HTTP route. One of them sits on the
affiliate revenue path and causes **every affiliate conversion to be recorded
with a commission of $0**.

The other 40 are behind modules with no consumer outside their own barrel. They
are dead today — but `src/lib/commerce/payouts/payout-service.ts` is a complete,
Stripe-wired payout engine whose earnings input resolves to `0`. It is one
import statement away from paying nothing to everyone.

---

## Triage table

| table | classification | real equivalent | entry point / reachability | failure mode (quote) | money? | severity | recommended action |
|---|---|---|---|---|---|---|---|
| `affiliate_partners` | UNBUILT | none (`revenue_events.partner_id` is bare `text`, no FK, no partner row anywhere) | **LIVE** — `POST /api/affiliate/webhooks` → `commissionCalculator.calculateCommission` (`route.ts:122`) → `getPartner` (`commission-calculator.ts:403`) | swallow — `commission-calculator.ts:408` `if (error) return null;` then `:88` `if (!partner) return 0;` | **YES — commission computed as 0 and written to `revenue_events`** | **CRITICAL** | Add `affiliate_partners` migration + seed partners, OR make `calculateCommission` throw on a missing partner so the webhook 500s and the partner retries. Silence is the bug. |
| `commission_rules` | UNBUILT | none | **LIVE** — same webhook path → `getCommissionRule` (`commission-calculator.ts:376`) | swallow — `:385` `if (error) { if (error.code === "PGRST116") return null; ... return null; }` (the fallthrough `return null` eats `42P01` too) | **YES — rule lookup silently yields no override** | **CRITICAL** | Migration, or delete the rules layer and read rates from partner config. Do not leave a `return null` that cannot distinguish "no rule" from "no table". |
| `payments` | UNBUILT | partial: `credit_purchases.amount_paid_cents` + `subscriptions.amount` (note: cents vs dollars) | **LIVE** — `GET /api/admin/metrics` (`route.ts:49`) | swallow — `route.ts:65` `revenueResult.data?.reduce((sum, p) => sum + (p.amount \|\| 0), 0) \|\| 0` | **YES — admin revenue + revenue trend always $0** | **HIGH** | Point the query at `credit_purchases` (cents) and `subscriptions` (dollars), converting explicitly. There is no unified `payments` table and building one is a larger decision. |
| `analytics_events` | UNBUILT | none — reject `audit_logs` (security-audit table, different retention/RLS/volume) and `metrics_data` (numeric metrics, no `session_id`) | **LIVE** — `POST`/`GET /api/analytics/events` (`route.ts:54,93,108,120`) | swallow on write — `:56` `if (error) { ... return NextResponse.json({ success: true, warning: "Some events may not have been stored" }) }`; propagate on read — `:98` `if (countError) throw countError;` | no | **HIGH** | Migration. The POST returning `success: true` while storing nothing is the worst variant — clients believe analytics works. |
| `user_achievements` | **RENAME** → `user_badges` + `badge_progress` | `user_badges` (id, user_id, badge_id, earned_at, progress, is_pinned) + `badge_progress` (current_value, target_value, progress_percent) | **LIVE** — `GET`/`POST /api/gamification/achievements` → `getAchievementService()` (`route.ts:24,77`) | propagate on read — `achievement-service.ts:903` `if (uaError) throw new Error(...)` → route 500s; swallow on write — `:862` `if (error \|\| !data) return null;` → award returns `{ success: false, error: "Achievement not found" }` | no | **HIGH** | 1→2 table split, not a sed: the code's single row (status + progress + completed_at) maps to `user_badges` + `badge_progress`, and `badge_progress.progress_percent` is a **GENERATED** column while `achievement-service.ts:1238` writes it. Recommend deleting the duplicate achievement system and routing to the already-backed badge system (`/api/gamification/badges`). |
| `achievement_definitions` | **RENAME** → `badge_definitions` | `badge_definitions` — id, code, name, description, icon, category, **rarity**, xp_reward, **criteria**, sort_order, is_active, created_at | **LIVE** — same route, via `getAchievementByCode` / `getUserAchievements` (`achievement-service.ts:834,856,870,890,1445`) | propagate — `:847` `if (error) throw new Error(\`Failed to fetch achievements: ${error.message}\`)` | no | **HIGH** | Columns line up modulo two renames: code `tier` → column `rarity`, code `conditions` → column `criteria`. The file's own header comment (`achievement-service.ts:8`) reads "Badge tiers: Bronze, Silver, Gold, Platinum" — it is a second badge system. Delete it, keep `badge_definitions`. |
| `commission_tiers` | DEAD | none | none — `getCommissionTiers` is only called by `calculateTieredCommission`, which no reachable code calls (webhook calls `calculateCommission`) | swallow — `commission-calculator.ts:446` `return (data \|\| []).map(...)` → empty tier list | yes (if revived) | MEDIUM | Delete with the commerce affiliate module, or build if tiered commission is a real requirement. |
| `affiliate_conversions` | DEAD | partial: `revenue_events` (has `partner_id`, `commission_amount_cents`; **lacks** `status`, `value`, `click_id`) | none — `tracking-service` has no importer; `commission-calculator`'s conversion methods (`recalculateCommission`, `getCommissionReport`, `getPendingPayout`) are unreachable | mixed — propagate `commission-calculator.ts:210` `throw new Error(\`Failed to get commission report...\`)`; swallow `payout-service.ts:772` `return (data \|\| []).reduce(...)` → 0 | yes (if revived) | MEDIUM | `revenue_events` is the applied successor for *recording* (migration `20260517000005_revenue_events.sql`, FND-025). It cannot back the payout lifecycle (no `status`). Delete the commerce module or extend `revenue_events`. |
| `affiliate_clicks` | DEAD | none | none — `trackingService` referenced only by `src/lib/commerce/affiliate/index.ts:16` | propagate — `tracking-service.ts:98` `throw new Error(\`Failed to track click: ${error.message}\`)` | yes (attribution → commission) | MEDIUM | Delete, or build alongside `affiliate_partners` if attribution is in scope. |
| `affiliate_payouts` | DEAD | none | none — `getPayoutHistory` unreachable | propagate — `commission-calculator.ts:318` `throw new Error(\`Failed to get payout history...\`)` | yes | MEDIUM | Delete with the payout module. |
| `payouts` | DEAD | none | none — `payoutService` referenced only by `src/lib/commerce/payouts/index.ts:8`; nothing imports that barrel | swallow — `payout-service.ts:627` `if (error) return null;`; fire-and-forget `:861` `await supabase.from("payouts").update(updateData).eq("id", payoutId);` (error discarded) | **YES — real `stripe.transfers.create` at `:775`** | MEDIUM | Loaded gun. `getPendingEarnings` (`:766`) returns `0`, so any batch built from it pays nothing. Delete the module or build the schema before anything imports it. Do not wire it up as-is. |
| `payout_batches` | DEAD | none | none — same module | fire-and-forget insert — `payout-service.ts:452` `await supabase.from("payout_batches").insert({...})`, no error check | yes | MEDIUM | Delete with `payout-service.ts`. |
| `payout_schedules` | DEAD | none | none — same module | swallow — `payout-service.ts:569` / `:607` `return null;` | yes | MEDIUM | Delete with `payout-service.ts`. |
| `manual_payout_queue` | DEAD | none | none — same module | fire-and-forget insert — `payout-service.ts:422` `await supabase.from("manual_payout_queue").insert({...})`, no error check | **yes — this is the fallback when automated payout fails; failures vanish** | MEDIUM | Delete with `payout-service.ts`. If payouts are ever built, this queue must propagate. |
| `user_attributions` | DEAD | none | none — `affiliateService` referenced only by `src/lib/commerce/affiliate/index.ts:12` | propagate — `affiliate-service.ts:422` `throw new Error(\`Failed to create attribution: ${error.message}\`)` | yes (attribution → commission) | MEDIUM | Delete. Note the same file's `referral_codes` calls hit a **real** table — split before deleting. |
| `offers` | DEAD | no — `marketplace_products` is a different domain (no `destination_url`, `apr`, `headline`, `partner_id`) | none — `offerService` reaches only `src/lib/commerce/matching/credit-card-matcher.ts`, itself referenced only by `src/lib/commerce/matching/index.ts:10`; nothing imports that barrel. The **live** offers route `/api/affiliate/offers` uses the parallel `@/lib/affiliate/*` tree instead | propagate — `offer-service.ts:111` `throw new Error(\`Failed to create offer: ${error.message}\`)`; swallow — `:61` partner lookup falls back to `partner_name: partner?.name \|\| "Unknown Partner"` | yes (offers earn commission) | MEDIUM | Duplicate of the live `src/lib/affiliate/` tree. Delete `src/lib/commerce/offers/` + `src/lib/commerce/matching/credit-card-matcher.ts`. |
| `offer_clicks` | DEAD | none | none — same module | fire-and-forget insert — `offer-service.ts:821` `await supabase.from("offer_clicks").insert({...})` | yes | MEDIUM | Delete with the offers module. |
| `offer_impressions` | DEAD | none | none — same module | propagate — `offer-service.ts:778` `throw new Error(\`Failed to track impression: ${error.message}\`)` | yes | MEDIUM | Delete with the offers module. |
| `offer_disclosures` | DEAD | none | none — `disclosureService` referenced only by `src/lib/commerce/offers/index.ts:13` | propagate — `disclosure-service.ts:439` `throw new Error(\`Failed to link disclosure: ${error.message}\`)` | compliance | MEDIUM | Dead, so **no live offer is served undisclosed today** — the live path is `@/lib/affiliate/compliance-checker`. Delete, but confirm the live checker's disclosure coverage separately. |
| `disclosures` | DEAD | none | none — same module | propagate — `disclosure-service.ts:124` `throw new Error(\`Failed to create disclosure: ${error.message}\`)` | compliance | MEDIUM | Same as above. |
| `experts` | DEAD | none | none — `getExpertSessionsService` has **no importer at all**, not even a barrel | propagate — `expert-sessions-service.ts:349` `if (error) throw error;` | yes (paid sessions) | LOW | Delete `src/lib/services/expert-sessions-service.ts` (760 lines) or build the feature. Nothing references it. |
| `expert_sessions` | DEAD | none | none — same file | propagate — `expert-sessions-service.ts:427` `if (error) throw error;` | yes (paid sessions) | LOW | Delete with the file. |
| `expert_reviews` | DEAD | `marketplace_reviews` exists but is FK'd to `marketplace_products`, not experts | none — same file | propagate — `expert-sessions-service.ts:510` region, `if (error) throw error;` | no | LOW | Delete with the file. |
| `expert_applications` | DEAD | none | none — same file | propagate — `expert-sessions-service.ts:287` `if (error) throw error;` | no | LOW | Delete with the file. |
| `partnerships` | DEAD | none | none — `getAccountabilityPartnersService` referenced only by `src/lib/gamification/index.ts:51` | propagate — `accountability-partners-service.ts:274` `if (error) throw error;` | no | LOW | Delete or build. Note `:147` reads the **real** `profiles` table in the same file. |
| `partner_invitations` | DEAD | none | none — same module | propagate — `accountability-partners-service.ts:197` `if (!invitation) throw new Error("Invitation not found");` (masks the missing table as a missing row) | no | LOW | Delete or build. |
| `partner_nudges` | DEAD | none | none — same module | mixed, mostly unchecked writes — `accountability-partners-service.ts:377,400` | no | LOW | Delete or build. |
| `points_balances` | DEAD | **not** `user_credits` — that is the purchased AI-credit wallet (real money); conflating them would be dangerous | none — `getPointsRewardsService` referenced only by `src/lib/gamification/index.ts:118` | swallow — `points-rewards-service.ts:441` `if (error \|\| !data) return null;` | yes (redeemable) | LOW | Delete or build a distinct loyalty-points schema. Do **not** reuse `user_credits`. |
| `points_transactions` | DEAD | partial: `xp_transactions` (user_id, amount, reason, event_type, multiplier) — but XP is not redeemable and has no `expires_at`/`balance_after` | none — same module | propagate — `points-rewards-service.ts:960` `if (error) throw new Error(\`Failed to get transaction history...\`)` | yes | LOW | Delete or build. |
| `points_redemptions` | DEAD | none | none — same module | unchecked write — `points-rewards-service.ts:642` | **yes — redemption for value** | LOW | Delete or build. |
| `leaderboard_scores` | DEAD | no — `leaderboard_snapshots` stores period `rankings jsonb`, no per-user row | none — `getAnonymousLeaderboardService` referenced only by `src/lib/gamification/index.ts:41` | propagate — `anonymous-leaderboard-service.ts:346` `if (error) throw error;` | no | LOW | Delete or reconcile with `leaderboard_snapshots`. |
| `leaderboard_participation` | DEAD | none (`leaderboard_snapshots` has no opt-in concept) | none — same module | propagate — `anonymous-leaderboard-service.ts:280` `if (error) throw error;` | no | LOW | Delete or build. Opt-in state for an "anonymous leaderboard" is a privacy control — build it properly if the feature ships. |
| `commitment_contracts` | DEAD | none | none — `getCommitmentDeviceService` referenced only by `src/lib/gamification/index.ts:65` | propagate — `commitment-device-service.ts:234` `if (error) throw error;` | yes (stakes) | LOW | Delete or build. |
| `commitment_check_ins` | DEAD | none | none — same module | propagate — `commitment-device-service.ts:356` `if (error) throw error;` | no | LOW | Delete or build. |
| `commitment_donations` | DEAD | none | none — same module | fire-and-forget insert — `commitment-device-service.ts:414` `await this.supabase.from("commitment_donations").insert({...})` | **yes — forfeited stake donated to charity, never recorded** | LOW | Delete or build. If commitment devices ship, this write must propagate — an unrecorded charity donation is a money record loss. |
| `experiments` | DEAD | no — `feature_flags` is (key, enabled, description); no variants, status, or traffic split | none — `getVariant`/`trackConversion`/`isFeatureEnabled` in `src/lib/experiments/ab-testing.ts` have no importer (the only `isFeatureEnabled` hit elsewhere is an unrelated method on `white-label-service.ts:494`) | swallow — `experiments/ab-testing.ts:68` `if (error) { // ABTesting error ... return; }` → empty cache → `getVariant` returns `null` for everyone | no | LOW | Delete `src/lib/experiments/ab-testing.ts` or build. Silent `return` on load failure means every experiment is permanently off. |
| `experiment_assignments` | DEAD | none | none — same file | unchecked read `:96` + fire-and-forget insert `:113` | no | LOW | Delete or build. |
| `experiment_conversions` | DEAD | none | none — same file | fire-and-forget insert — `experiments/ab-testing.ts:172` | no | LOW | Delete or build. |
| `ab_test_conversions` | DEAD | none | none — `onboardingABTest` has no importer | swallow — `onboarding/ab-testing.ts:279` `} catch { // Persistence failure should not break the application }` | no | LOW | Delete `src/lib/onboarding/ab-testing.ts` or build. Second, separate A/B implementation — consolidate if either is revived. |
| `cohort_stats` | DEAD | none | none — `getSocialProofNudgesService` has **no importer at all**, not even a barrel | swallow — `social-proof-nudges-service.ts:330` destructures `{ data }` only, then `return data ? this.statsFromDb(data) : null;` | no | LOW | Delete `src/lib/ai/social-proof-nudges-service.ts` or build. Social-proof nudges ("X% of users like you…") computed from a missing cohort table would be fabricated claims — build it properly or not at all. |
| `nudge_impressions` | DEAD | `nudge_history` exists for exactly this purpose (user_id, nudge_id, nudge_type, sent_at, opened_at, action_taken, ab_variant) | none — same file | fire-and-forget insert — `social-proof-nudges-service.ts:411,425` | no | LOW | Delete. If revived, map to `nudge_history`: code `action` → `action_taken`, `created_at` → `sent_at`; `nudge_history` additionally requires NOT NULL `nudge_type`, `title`, `message`, `channel`. |
| `nudge_preferences` | DEAD | nearest is `notification_preferences` (global channels + quiet hours), but shapes differ — cannot prove they line up | none — same file | propagate — `social-proof-nudges-service.ts:398` `if (error) throw error;`; read path `:345` swallows via `{ data }` | no | LOW | Delete or build. |
| `recommendation_actions` | DEAD | none | none — `getGoalNotificationService` referenced only by `src/lib/goals/services/index.ts:60`; the one live consumer of that barrel (`/api/financial/goals/[id]/investment`) imports `goalInvestmentService` only | swallow — `GoalNotificationService.ts:585` / `:626` `} catch { return false; }` wrapping the insert | no | LOW | Delete the recommendation-action tracking or build. Note the same file also writes `goal_notifications`, `goal_milestones`, `user_notification_preferences` — **also absent**, outside this slice. |
| `lifecycle_audit` | DEAD | none | none — `promotionManager` referenced only by `src/lib/trading/lifecycle/index.ts:1`; nothing imports that barrel | fire-and-forget insert — `promotion-manager.ts:250` `await lifecycleAudit().insert({...})` | no | LOW | Delete or build. The sibling `strategy_lifecycle` (`:29`) **does** exist — so a live-looking module writes half its state to a real table and drops the audit trail. Flagged for the trading slice. |

---

## Counts

| classification | count | tables |
|---|---:|---|
| **RENAME** | 2 | `user_achievements`, `achievement_definitions` |
| **UNBUILT** | 4 | `affiliate_partners`, `commission_rules`, `payments`, `analytics_events` |
| **DEAD** | 38 | all others |
| **Total** | **44** | |

By severity: **2 CRITICAL**, **4 HIGH**, **17 MEDIUM**, **21 LOW**.
By money: 24 of 44 participate in computing, recording, or paying an amount.
Reachable from a live entry point: **6 tables across 4 routes**.

---

## Top 5 by real money / user impact

### 1. `affiliate_partners` — CRITICAL — every affiliate commission is recorded as $0

The one live, unambiguous revenue defect in this slice.

`POST /api/affiliate/webhooks` deliberately recomputes commission server-side
rather than trusting the inbound body (`route.ts:117-119`, a correct FND-era
hardening). It then calls:

```
const commissionAmount = await commissionCalculator.calculateCommission(
  partnerId, conversionTypeMap[eventType], amount,
);
```

`calculateCommission` opens with `const partner = await this.getPartner(partnerId)`.
`getPartner` queries the absent `affiliate_partners`, hits `42P01`, and returns
`null` at `commission-calculator.ts:408`. `calculateCommission` then returns `0`.
That `0` is passed to `revenueTracker.trackEvent({ commissionAmount, ... })`,
which persists it to the **real** `revenue_events` table as
`commission_amount_cents = 0`.

So the event row exists, the webhook returns `200 {"success": true}`, the
partner's system marks the postback delivered — and the commission is zero.
Every conversion, every partner, silently. There is no error, no log, no retry.

The route even carries a comment at `:121` reading "calculateCommission returns 0
for an unknown/missing partner rather than throwing" — someone observed the
behavior and attributed it to an unknown partner rather than a missing table.

Impact: all affiliate revenue is unrecorded. Because `revenue_events` is what
`/api/admin/affiliate/revenue` reports on, the loss is invisible downstream too.
Pre-launch, so no cash has been lost yet — but this ships broken by default.

### 2. `commission_rules` — CRITICAL — the override layer cannot fail loudly

Same live path. `getCommissionRule` (`commission-calculator.ts:376`) checks for
`PGRST116` ("no rows") and returns `null`, then falls through to a bare
`return null` for every other error — including `42P01`. A missing table is
indistinguishable from "this partner has no custom rule."

This compounds #1: even after `affiliate_partners` is built, rule-based rates
and bonus thresholds will silently never apply. The `return null` swallow has to
be narrowed to `PGRST116` regardless of which fix path is chosen.

### 3. `payments` — HIGH — admin revenue dashboard permanently reads $0

`GET /api/admin/metrics` fetches `payments.amount` and reduces it at
`route.ts:65`: `revenueResult.data?.reduce(...) || 0`. With the table absent,
`data` is `undefined` and `revenue` is `0`. The `trends.revenue` series
(`:100-105`) is built from the same empty array, so the chart is a flat zero
line rather than a gap.

`mrr` on the same response is computed from the **real** `subscriptions` table
and is correct — so the dashboard shows a plausible MRR beside a $0 revenue
figure. That asymmetry makes the bug read as "we have subscribers but no
revenue" rather than "this query is broken."

Real revenue lives in `credit_purchases.amount_paid_cents` (integer cents) and
`subscriptions.amount` (`numeric(12,2)` dollars). Any fix must convert
explicitly — this repo has already shipped one dollars-as-cents payout bug.

### 4. `user_achievements` + `achievement_definitions` — HIGH — a whole second, unbacked gamification system

`GET /api/gamification/achievements` calls `getUserAchievements`, which throws at
`achievement-service.ts:903` — the route catches and returns a 500. That failure
is at least loud.

The write path is not. `POST` with `action: "award"` calls `awardAchievement`,
which resolves the code via `getAchievementByCode` → `:862`
`if (error || !data) return null;` → the route returns
`400 {"error": "Achievement not found"}`. A missing table is reported to the
client as a missing achievement.

The real finding is architectural: a fully-backed badge system already exists
(`badge_definitions`, `user_badges`, `badge_progress`, plus
`/api/gamification/badges`). The achievement system is a 1,554-line duplicate of
it. `badge_definitions` matches `achievement_definitions` column-for-column
except `tier`→`rarity` and `conditions`→`criteria`; the file's own header
comment calls its tiers "Badge tiers."

Recommend deleting the achievement system rather than migrating it. If it is
kept, note `badge_progress.progress_percent` is a GENERATED column and
`achievement-service.ts:1238` writes to it — that insert would error.

### 5. `analytics_events` — HIGH — writes report success while storing nothing

`POST /api/analytics/events` inserts a batch, and on error returns
`200 {"success": true, warning: "Some events may not have been stored"}`
(`route.ts:56-62`). The comment above it — "Don't fail the request - analytics
should be non-blocking" — is a defensible policy for a transient DB blip. It is
not defensible for a table that has never existed: the endpoint has reported
success for 100% of events while storing 0% of them.

The GET aggregation path throws instead (`:98`, `:114`, `:125`), so the reporting
side 500s. Net effect: product analytics for the entire platform is absent, and
the write path actively conceals it.

`audit_logs` is a tempting rename target — it has `event_type`, `session_id`,
nullable `user_id`, and `metadata`. Reject it: it is the security audit trail,
with different retention, RLS, and volume expectations, and its `action` column
is NOT NULL with no default. Product analytics needs its own table.

---

## Cross-cutting notes for the lead

- **Duplicate module trees.** `src/lib/commerce/{affiliate,offers,matching}` is a
  dead parallel implementation of the live `src/lib/affiliate/*` tree. The live
  `/api/affiliate/offers` route imports `@/lib/affiliate/credit-card-matcher`;
  the dead one is `@/lib/commerce/matching/credit-card-matcher`. Same for
  disclosures. Deleting the `commerce` tree removes 14 of the 44 phantoms in one
  commit — but `src/lib/commerce/affiliate/commission-calculator.ts` must be
  retained or replaced, because the live webhook depends on it.
- **`affiliate-service.ts` is mixed.** It writes phantom `affiliate_partners` and
  `user_attributions` alongside the **real** `referral_codes`. Do not delete the
  file wholesale.
- **Barrel-only exports hide reachability.** Eleven modules here are exported
  from a barrel that nothing imports. A path-based grep reports them as
  imported; only tracing consumers of the barrel reveals they are dead. Any
  automated dead-code sweep in this repo needs to follow re-exports.
- **`payout-service.ts` is the biggest latent risk.** 980 lines, real
  `stripe.transfers.create` with a correct idempotency key, correct
  cents/dollars handling — sitting on four tables that do not exist, with
  `getPendingEarnings` returning `0`. It is well-built and completely
  unbacked. Whoever wires it up next will ship $0 payouts. Delete it or build
  the schema; do not leave it importable.
- **Out of slice, found incidentally:** `goal_notifications`, `goal_milestones`,
  `user_notification_preferences` (in `GoalNotificationService.ts`) are also
  absent from the live DB.
