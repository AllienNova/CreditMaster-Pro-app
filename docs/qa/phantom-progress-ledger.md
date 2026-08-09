# Phantom-Table Remediation — Progress Ledger

> Live-measured 2026-07-31 against the running local DB. Every number below is
> reproducible with the commands in § Method. **Where an earlier figure was
> wrong, the correction is stated, not quietly replaced.**

## Where things stand

| Metric | Session start | Now | Δ |
|---|---:|---:|---:|
| Phantom tables (referenced, never migrated) | 147 | **62** | −85 |
| Phantom call sites | 486 | **165** | −321 |
| Total `.from()` call sites in `src/` | — | 833 | — |
| Tables that exist in the live DB | 101 | **157** | +56 |
| Migrations applying from scratch | **0 (chain unbuildable)** | 60+, exit 0 | — |
| Jest suite | 1 permanent failure | 16,268 pass / 0 fail | — |
| Net lines (last 4 commits) | — | 941 added / 8,648 deleted | −7,707 |

## Correction to previously published counts

Earlier reports in this session said **147 → 128 phantom tables**. That
denominator was **overstated**: the scanner counted `.from("x")` occurrences
inside **commented-out code**. Excluding comment lines, the true figure at that
moment was **124**, not 128.

Four "phantoms" were comment-only and never executable:
`credit_disputes`, `tax_document_access_log`, `health_check`, `data`.

The corrected scan (used for every number on this page) filters lines matching
`^\s*(//|\*|/\*)`. Two of the four — `credit_disputes` and
`tax_document_access_log` — are worth noting separately: they are *commented-out
features*, which is its own species of dead code, not merely dead references.

**Caveat that still stands:** this remains a lower bound. The scanner only sees
string-literal table names in `.from()`. It cannot see a table name held in a
variable, and it says nothing about the **phantom-column** axis — the
`select("*")` + `row.some_field` pattern, where the table exists but the column
does not. That axis needs real static analysis and has not been measured.

## What the halving actually bought

Not just deletion. The four commits since the green baseline:

| Commit | Effect |
|---|---|
| `4f552bd` | Built the **revenue ledger**. `/api/admin/metrics` was reporting `$0` revenue unconditionally because `payments` existed nowhere — and nothing in the codebase had ever recorded a payment at all. |
| `66ba9fe` | Documented the **orphaned payout stack** (~1,400 unreachable lines, 7 phantom tables) as an owner decision rather than deleting or wiring it. |
| `df3e1f0` | Deleted **24 dead gamification/growth modules**; built `user_attributions`. |
| `5d3e784` | Fixed **GDPR Art. 15 export**, which was throwing on every request because `ai_interactions` never existed. Repointed to the three real AI tables. |

## The 62 that remain

Owned by in-flight agents (savings, assets/trading, credit, alerts clusters) or
pending an owner decision:

- **Blocked on owner (7)** — `payouts`, `payout_batches`, `payout_schedules`,
  `manual_payout_queue`, `affiliate_conversions`, `affiliate_payouts`,
  `commission_tiers`. See `orphaned-payout-stack.md`; these move real money and
  are gated on FND-026.
- **Trading / assets (14)** — `holdings`, `portfolios`, `investment_history`,
  `investment_alerts`, `rebalance_*`, `risk_profiles`, `risk_vetoes`,
  `recon_breaks`, `strategy_metrics`, `autonomous_*_logs`, `trading_journal`,
  `pctt_positions`, `manual_accounts`, `alternative_asset*`,
  `dividend_payments`, `stock_dividends`, `drip_settings`.
  `pctt_positions` is **deliberately unresolved**: its only constructors live in
  `src/lib/trading/autonomous/`, which deploys as a separate Fly.io app, so
  reachability cannot be settled from this repo. Guessing here would be worse
  than leaving it.
- **Bills / alerts / spending (10)** — `bill_negotiations`,
  `bill_negotiation_outcomes`, `bill_reminders`, `budget_alerts`,
  `spending_alerts`, `spending_limits`, `merchant_categories`, `debt_history`,
  `financial_alerts`, `email_logs`.
- **Net worth / property / crypto (10)** — `net_worth_history`, `properties`,
  `property_valuations`, `mortgages`, `crypto_holdings`, `crypto_wallets`,
  `crypto_price_alerts`, `savings_history`, `health_score_history`.
- **Shared goals (5)** — `shared_goals`, `shared_goal_members`,
  `shared_goal_contributions`, `shared_goal_invitations`, `shared_goal_updates`.
- **Gig income (3)** — `gig_income`, `gig_platforms`, `gig_deductions`.
- **Unassigned misc (8)** — `analytics_events`, `financial_journeys`,
  `ocr_bridge_results`, `plaid_transactions`, `user_devices`, `user_preferences`,
  `users`, `lifecycle_audit`.
  `users` is suspicious: `auth.users` exists but `public.users` does not, and
  `nudge-engine.ts` queries the bare name.

## Operational finding: stashing a file another agent is editing

> **CORRECTION.** An earlier version of this section — and a warning I broadcast
> to four agents — asserted that an agent had run a **bare** `git stash` that
> "reverted every agent's uncommitted files." **That attribution was wrong, and
> the correction matters because the mitigation it implies is different.**
>
> The command was in fact pathspec-scoped, to exactly the three files it
> disrupted. The decisive evidence: a bare `git stash` stashes the **index** as
> well, so that agent's 15 *staged* deletions would have been swept away too.
> They were not — all 15 landed intact in `df3e1f0`. My "bare stash" reading came
> from `git stash show --stat` listing 18 files, which reports the stash commit's
> full tree-relative diff rather than only the pathspec'd entries. I mistook a
> reporting quirk for the command's scope, and broadcast it before checking.

**What actually happened, which is still a real hazard.** `git stash push --
<path>` reverts the named paths to HEAD **on disk** for as long as the stash is
active. Scoping correctly prevented collateral damage to unrelated files. But
the three paths chosen were files *another agent was actively editing at that
moment*, so that agent's uncommitted work vanished from disk mid-task and had to
be redone.

**So the rule is not "path-scope your stash" — that was already being done.** The
rule is about **ownership and recency**:

- Before stashing any file, check `git log -1 --format=%cr -- <path>` and
  `git status`. If a file is being touched right now by someone else, do not
  stash it at all.
- Prefer attribution that never touches the file: reason from `git diff` /
  `git status` output directly. In this case that alone would have sufficed.
- Better still, write the failing test **before** touching source — true TDD
  order needs no stash whatsoever.
- **Commit early and often.** Uncommitted work in a shared worktree is exposed
  to any teammate's legitimate, correctly-scoped git operation.

**Resolution.** The originating agent verified both sides lost nothing — all 17
of its files are in `df3e1f0`, and the disrupted `stripe-service.ts` is at
`4f552bd`, which postdates the stash copy — then dropped it. `git stash list`
now holds only an unrelated pre-existing `WIP on main` entry. Nothing was
discarded on inference.

## Method

```bash
# live tables
psql -At -c "select tablename from pg_tables where schemaname='public'" | sort > live.txt

# referenced tables, excluding tests AND commented-out code
grep -rnE '\.from\(\s*["'"'"'`][a-z0-9_]+["'"'"'`]' src/ --include='*.ts' --include='*.tsx' \
  | grep -vE '__tests__|\.test\.' \
  | grep -vE '^[^:]+:[0-9]+:\s*(//|\*|/\*)' > hits.txt

sed -E 's/.*\.from\(\s*["'"'"'`]([a-z0-9_]+)["'"'"'`].*/\1/' hits.txt | sort -u > refs.txt
comm -23 refs.txt live.txt          # the phantoms
```
