/**
 * The set of budget periods must be the SAME set in all three places that
 * define it, or users get a 500.
 *
 * WHY THIS EXISTS — a real, live bug, proven against the database with a
 * control before this guard was written:
 *
 *   INSERT ... period = 'quarterly'  -> violates constraint budgets_period_check
 *   INSERT ... period = 'monthly'    -> INSERT 0 1   (identical otherwise)
 *
 * `quarterly` was accepted by BudgetPeriod, accepted by the route's
 * validPeriods, and had a real branch in calculatePeriodDates — so every
 * app-level check passed and the request sailed through to the database, which
 * rejected it. Creating a quarterly budget was a hard 500 for every user.
 *
 * Nothing caught it because every layer that could validate agreed WITH ITSELF.
 * The only disagreeing party was the CHECK constraint, and a constraint is not
 * consulted until runtime. A unit test that mocks the DB client cannot see this
 * class of bug at all — which is precisely why this test reads the migration
 * text rather than talking to a mock.
 *
 * This is the same failure shape as the phantom tables and phantom columns
 * elsewhere in Wave 7: code and schema disagreeing, with the code winning right
 * up until production.
 */

import { readFileSync, readdirSync } from "fs";
import { join } from "path";

const REPO_ROOT = process.cwd();
const MIGRATIONS_DIR = join(REPO_ROOT, "supabase", "migrations");
const TYPES_FILE = join(
  REPO_ROOT,
  "src/lib/financial/types/budget.types.ts",
);
const ROUTE_FILE = join(REPO_ROOT, "src/app/api/financial/budgets/route.ts");

/**
 * Periods allowed by the newest migration that defines budgets_period_check.
 * Newest wins: the constraint is dropped and recreated, so only the last
 * definition is in effect.
 */
function periodsAllowedByConstraint(): string[] {
  const defining = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .filter((f) =>
      readFileSync(join(MIGRATIONS_DIR, f), "utf8").includes(
        "budgets_period_check",
      ),
    )
    .sort();

  if (defining.length === 0) {
    throw new Error("No migration defines budgets_period_check");
  }

  const sql = readFileSync(
    join(MIGRATIONS_DIR, defining[defining.length - 1]),
    "utf8",
  );

  // Match the ADD CONSTRAINT ... CHECK (...ARRAY[...]) body specifically, not
  // any array that happens to appear in a comment.
  const add = sql.split(/ADD\s+CONSTRAINT\s+budgets_period_check/i)[1];
  if (!add) throw new Error("budgets_period_check is dropped but never added");

  const arrayBody = add.match(/ARRAY\s*\[([^\]]+)\]/);
  if (!arrayBody) throw new Error("Could not parse the CHECK's ARRAY[...]");

  return [...arrayBody[1].matchAll(/'([a-z_]+)'/g)].map((m) => m[1]).sort();
}

/** Members of the BudgetPeriod union type. */
function periodsInTypeUnion(): string[] {
  const src = readFileSync(TYPES_FILE, "utf8");
  const union = src.match(
    /export type BudgetPeriod\s*=([\s\S]*?);/,
  );
  if (!union) throw new Error("BudgetPeriod union not found");
  return [...union[1].matchAll(/"([a-z_]+)"/g)].map((m) => m[1]).sort();
}

/** Periods the POST route accepts at the API boundary. */
function periodsAcceptedByRoute(): string[] {
  const src = readFileSync(ROUTE_FILE, "utf8");
  const list = src.match(
    /const validPeriods:\s*BudgetPeriod\[\]\s*=\s*\[([\s\S]*?)\]/,
  );
  if (!list) throw new Error("validPeriods not found in the budgets route");
  return [...list[1].matchAll(/"([a-z_]+)"/g)].map((m) => m[1]).sort();
}

describe("budget period: app and database must allow the same set", () => {
  it("the DB CHECK constraint matches the BudgetPeriod type", () => {
    // The actual bug: these two disagreed on 'quarterly', so a value the type
    // system called valid was rejected by the database at runtime.
    expect(periodsAllowedByConstraint()).toEqual(periodsInTypeUnion());
  });

  it("the route's validPeriods matches the BudgetPeriod type", () => {
    expect(periodsAcceptedByRoute()).toEqual(periodsInTypeUnion());
  });

  it("allows quarterly — the period that was a guaranteed 500", () => {
    expect(periodsAllowedByConstraint()).toContain("quarterly");
    expect(periodsInTypeUnion()).toContain("quarterly");
    expect(periodsAcceptedByRoute()).toContain("quarterly");
  });
});
