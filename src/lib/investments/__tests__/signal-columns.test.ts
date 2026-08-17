/**
 * Every column the signals query names must exist on trading_signals.
 *
 * GET /api/investments/signals answered 500 "Failed to fetch signals" for every
 * caller. It took two rounds to fix, because there were two phantom columns and
 * Postgres only reports the first one it reaches:
 *
 *   round 1 — column trading_signals.status does not exist
 *   round 2 — column trading_signals.generated_at does not exist
 *
 * That is the whack-a-mole this test exists to end. Rather than assert on the
 * two names that happened to be wrong, it reads the columns the source actually
 * queries and checks each against the schema recorded below.
 *
 * WHY THE UNIT SUITE COULD NOT CATCH THIS. signal-generator.test.ts mocks the
 * Supabase client, so a query naming a column that does not exist resolves
 * happily. One of its assertions even REQUIRED the phantom `status` column, and
 * passed for years. Only a request against a real Postgres fails.
 */

import { readFileSync } from "fs";
import { join } from "path";

/**
 * public.trading_signals as of migration 20260731000170, captured from
 * information_schema against a live local database on 2026-08-16.
 *
 * Deliberately a literal rather than a live query: this test must run in CI
 * without a database, which is exactly the constraint that let the bug hide.
 * When a migration adds a column, add it here in the same commit.
 */
const TRADING_SIGNALS_COLUMNS = new Set([
  "id", "user_id", "symbol", "asset_type", "signal_type", "strength",
  "confidence", "analysis_type", "analysis_data", "target_price", "stop_loss",
  "time_horizon", "outcome", "outcome_price", "outcome_date", "expires_at",
  "created_at", "fundamental_metrics", "is_active", "outcome_return_percent",
  "reasoning", "risk_reward_ratio", "sentiment_score", "supporting_factors",
  "take_profit", "technical_indicators", "viewed", "entry_price", "executed_at",
]);

const SOURCE = readFileSync(
  join(process.cwd(), "src", "lib", "investments", "signal-generator.ts"),
  "utf8",
);

/** Column names passed to a PostgREST filter/order builder. */
function queriedColumns(src: string): string[] {
  const out = new Set<string>();
  const CALL = /\.\s*(?:eq|neq|in|gt|gte|lt|lte|like|ilike|order|not)\s*\(\s*["'`]([a-z_]+)["'`]/g;
  for (const m of src.matchAll(CALL)) out.add(m[1]);
  return [...out].sort();
}

describe("signal-generator column names", () => {
  it("names only columns that exist on trading_signals", () => {
    const phantom = queriedColumns(SOURCE).filter(
      (c) => !TRADING_SIGNALS_COLUMNS.has(c),
    );
    expect(phantom).toEqual([]);
  });

  it("queries a non-trivial number of columns, so a broken matcher fails loudly", () => {
    // Guards the test itself: if the regex stops matching, `phantom` above is
    // empty for the wrong reason and the check silently stops working.
    expect(queriedColumns(SOURCE).length).toBeGreaterThan(3);
  });

  it("no longer references the two columns that caused the 500s", () => {
    expect(SOURCE).not.toMatch(/\.\s*(?:eq|in|order|gte|lte)\s*\(\s*["'`]status["'`]/);
    expect(SOURCE).not.toMatch(/\.\s*(?:eq|in|order|gte|lte)\s*\(\s*["'`]generated_at["'`]/);
  });

  it("uses is_active and created_at, the real equivalents", () => {
    const cols = queriedColumns(SOURCE);
    expect(cols).toContain("is_active");
    expect(cols).toContain("created_at");
  });
});
