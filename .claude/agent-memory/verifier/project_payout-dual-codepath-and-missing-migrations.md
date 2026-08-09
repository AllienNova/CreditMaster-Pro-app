---
name: payout-dual-codepath-and-missing-migrations
description: Fynvita has two independent, unwired payout implementations plus systemic missing DB migrations for payout/affiliate tables — found during FND-024/025/026/027 verification 2026-07-23
metadata:
  type: project
---

As of commit `bc668ea` on `remediation/wave-7-foundation` (worktree `.worktrees/wave-7-foundation`), the payments/money remediation (Wave 7 Phase 3, TASK-MNY-01/04/06) left two structural gaps not captured in `docs/ssot/gap_analysis.md`. Re-verify both are still true before relying on this — check `git log` on the two files below for newer commits.

**1. Two parallel payout implementations, never consolidated despite the fix commit's claim.**
`src/lib/commerce/payouts/payout-service.ts` (table `payouts`) and `src/lib/commerce/affiliate/commission-calculator.ts:347-428,449-500` (`initiatePayout`/`processScheduledPayouts`, table `affiliate_payouts`) are both full, independent payout-processing paths with separate idempotency-key namespaces (`transfer-${id}`/`payout-${id}` vs `commission-transfer-${id}`). Commit `2f48f00` is titled "...+ single payout codepath..." but did not actually merge them. Repo-wide grep (excl. tests/node_modules/.next) confirms **neither** is called from any API route, cron, or worker — `vercel.json` has zero payout cron entries — so both are dead/unwired today, which limits practical double-pay risk, but it is one wiring change from live and the commit's own claim is false on the code.

**2. `calculateFees()` in `payout-service.ts:777-803` was never touched by any TASK-MNY commit and has a live dollar/cents unit bug.** Flat-fee literals (50, 100, +25) are cent-scaled per their own comments ("$0.50 flat", "$1.00 for printing", "+$0.25") but get subtracted directly from a dollar-denominated `amount` (confirmed via `commission-calculator.ts:230` `fromDollars(conv.commission_earned)`). Executed proof: a $50 bank_transfer payout nets $0.00; $80 check payout nets **-$20.00**. No test exercises this at realistic (sub-$1,000) scale. See [[verify-units-end-to-end-not-just-at-boundary]].

**3. No migration exists anywhere in `supabase/migrations/*.sql` (52 files checked) for**: `payouts`, `payout_batches`, `payout_schedules`, `manual_payout_queue`, `affiliate_partners`, `affiliate_conversions`, `user_attributions`, `affiliate_payouts`, `pending_bank_transfers`, `commission_rules`. These tables only exist in the live Supabase DB. Precedent: the team already caught and backfilled this exact gap for `referral_codes` (`20260517000006_referral_codes.sql`, self-documenting comment). The same backfill was not done for the payout/affiliate tables — a fresh environment (new Supabase project, CI schema check, disaster recovery) would have working `revenue_events`/`referral_codes` but a fully broken payouts subsystem.

**Why this matters:** all three gaps sit directly under FND-024/025/026, which the project's SSOT currently expects to be fully closed once Wave 7 Phase 3 lands. Full write-up sent to team-lead 2026-07-23 (msg id b2a1645b).
