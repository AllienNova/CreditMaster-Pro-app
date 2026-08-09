---
name: tax-profiles-schema-drift
description: tax_profiles live table is missing ~20 columns that mapDatabaseToProfile expects, beyond the tax_accounts fix
metadata:
  type: project
---

Beyond the `tax_accounts` phantom-table bug (fixed 2026-07-31, commit 59c82bb, see [[scoped-stash-shared-worktree]]), the live `tax_profiles` table (migration `supabase/migrations/20260121000000_tax_optimization_schema.sql`) is missing roughly 20 more columns that `mapDatabaseToProfile` in both `src/app/api/financial/tax/retirement/route.ts` and `src/app/api/tax/analyze/route.ts` still reads: `dividend_income`, `interest_income`, `rental_income`, `retirement_income`, `other_income`, `federal_withheld`, `state_withheld`, `estimated_payments`, `is_employed`, `business_type`, `home_office_sqft`, `total_home_sqft`, `mortgage_interest`, `property_taxes`, `state_taxes_paid`, `charitable_donations`, `medical_expenses`, `student_loan_interest`, `educator_expenses`, `health_insurance_type`, `ytd_roth_ira_contribution`, `ytd_charitable_giving`, `age`, `target_retirement_age`, `expected_annual_return_rate`, `risk_tolerance`, `last_analyzed_at`. There's also a name/type mismatch: code reads `dependents_data` (expects a JSON array) but the live column is `dependents_count` (an integer).

Every one of these silently defaults via the same `Number(x) || 0` / `(x as T) || default` pattern that made the `tax_accounts` bug invisible — same defect class, much larger surface. Not yet in `docs/ssot/gap_analysis.md` (confirmed via grep, zero hits for `tax_accounts`/`tax_profiles` as of 2026-07-31).

**Why:** Found while inspecting the live schema (`\d+ tax_profiles`) to fix the narrowly-scoped `tax_accounts` issue. Explicitly out of scope for that task (team-lead's brief was "fix two routes querying tax_accounts," not a full tax-profile schema audit) — flagged to team-lead in the completion report rather than actioned.

**How to apply:** Do not assume any `TaxProfile` field sourced from the DB via these two routes reflects real user data beyond `filing_status`, `state_of_residence`, `gross_income`, `w2_income`, `self_employment_income`, `investment_income`, `capital_gains_short_term`, `capital_gains_long_term`, `is_self_employed`, `has_hdhp`, `ytd_401k_contribution`, `ytd_ira_contribution`, `ytd_hsa_contribution`, `optimization_goal` — those are the only columns that genuinely exist. If asked to work on tax deduction/income features, check this list first; fixing the rest needs a product decision (extend the migration vs. accept permanent defaults), not a route-level patch.
