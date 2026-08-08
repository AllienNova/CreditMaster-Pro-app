/**
 * Structural integrity of delete_user_data_cascade's v_tables array.
 *
 * WHY THIS EXISTS — a real bug caught during the 20260731000050 consolidation.
 *
 * A missing comma between two entries in a Postgres ARRAY[...] literal is NOT a
 * syntax error. Adjacent string literals separated by whitespace are
 * CONCATENATED per the SQL standard, so:
 *
 *     'financial_accounts'    -- comment
 *     'credit_builder_actions',
 *
 * silently becomes the single element 'financial_accountscredit_builder_actions'.
 * An intervening `--` comment does not prevent it.
 *
 * The consequences are exactly the failure mode this whole remediation exists to
 * kill: `psql` exits 0, the migration "applies cleanly", the file *reads*
 * correctly, and even `SELECT prosrc` shows both names on their own lines —
 * because the source is just text and the literal is only parsed at runtime.
 * Meanwhile BOTH tables silently drop out of GDPR Art. 17 erasure, since
 * to_regclass() returns NULL for the glued name and the DELETE is skipped.
 *
 * That is undetectable by reading. It was caught only by evaluating the array
 * and counting elements, and this test encodes that check so it cannot recur.
 */

import { readFileSync, readdirSync } from "fs";
import { join } from "path";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { buildSchema } = require("../../../../scripts/schema-from-migrations");

const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");

/** Longest real table name in this schema is well under this. */
const MAX_PLAUSIBLE_TABLE_NAME_LENGTH = 32;

/**
 * Tables deliberately excluded from the cascade. Each is a record the business
 * is required to keep; see 20260731000050's header for the full reasoning.
 * Asserted here so a future "helpful" addition has to argue with a test.
 */
const DELIBERATE_EXCLUSIONS = [
  "payments", // revenue ledger; user_id is ON DELETE SET NULL by design
  "audit_logs", // security/compliance trail
  "tax_audit_log", // statutory tax retention
  "analytics_events", // ON DELETE SET NULL; anonymised aggregate history is retained
  // ON DELETE SET NULL: a conversion records a commission OWED TO A PARTNER.
  // That obligation survives the converting user's erasure, so the row is
  // pseudonymised (user_id nulled by the FK) rather than deleted — same
  // reasoning as payments.
  "affiliate_conversions",
] as const;

const ROUND_5_ADDITIONS = ["investment_history"] as const;

const ROUND_4_ADDITIONS = [
  "shared_goal_members",
  "financial_journeys",
  "gig_platforms",
  "gig_income",
  "gig_deductions",
  "net_worth_history",
  "savings_history",
  "properties",
  "crypto_wallets",
  "crypto_price_alerts",
] as const;

const ROUND_3_ADDITIONS = [
  "credit_builder_applications",
  "rent_reporting_accounts",
  "rent_payments",
  "bill_negotiations",
  "bill_negotiation_outcomes",
  "budget_alerts",
  "financial_alerts",
  "investment_alerts",
  "debt_history",
  "email_logs",
  "trading_journal",
] as const;

/** Registered by the 20260731000050 round-2 consolidation. */
const ROUND_2_ADDITIONS = [
  "credit_builder_actions",
  "credit_monitoring_settings",
  "user_attributions",
  "financial_chat_messages",
  "investment_holdings",
  "investment_transactions",
  "monthly_summaries",
  "paper_accounts",
  "paper_orders",
  "savings_contributions",
  "savings_rules",
  "savings_transfers",
  "user_quotas",
  "webauthn_challenges",
] as const;

/** The most recent migration that redefines the cascade function. */
function latestCascadeMigration(): string {
  const candidates = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .filter((f) =>
      readFileSync(join(MIGRATIONS_DIR, f), "utf8").includes(
        "v_tables TEXT[] := ARRAY[",
      ),
    )
    .sort();

  if (candidates.length === 0) {
    throw new Error("No migration defines v_tables — cascade is unprotected");
  }
  return join(MIGRATIONS_DIR, candidates[candidates.length - 1]);
}

/** Raw lines of the ARRAY[...] block, comments and blanks stripped. */
function arrayEntryLines(sql: string): string[] {
  const start = sql.indexOf("v_tables TEXT[] := ARRAY[");
  if (start === -1) throw new Error("v_tables array not found");
  const end = sql.indexOf("\n  ];", start);
  if (end === -1) throw new Error("v_tables array is unterminated");

  return sql
    .slice(start, end)
    .split("\n")
    .slice(1) // drop the "ARRAY[" opener
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("--"));
}

describe("delete_user_data_cascade v_tables integrity", () => {
  const sql = readFileSync(latestCascadeMigration(), "utf8");
  const entryLines = arrayEntryLines(sql);

  it("every entry except the last is comma-terminated", () => {
    // The actual guard. A missing comma concatenates two table names into one
    // bogus identifier and silently removes BOTH from erasure, with no syntax
    // error and no failed migration.
    const missingComma = entryLines
      .slice(0, -1)
      .filter((line) => !stripTrailingComment(line).endsWith(","));

    expect(missingComma).toEqual([]);
  });

  it("no entry looks like two table names glued together", () => {
    const names = entryLines
      .map((l) => l.match(/^'([a-z0-9_]+)'/)?.[1])
      .filter((n): n is string => Boolean(n));

    const suspicious = names.filter(
      (n) => n.length > MAX_PLAUSIBLE_TABLE_NAME_LENGTH,
    );
    expect(suspicious).toEqual([]);
  });

  it("contains no duplicate entries", () => {
    const names = entryLines
      .map((l) => l.match(/^'([a-z0-9_]+)'/)?.[1])
      .filter((n): n is string => Boolean(n));

    const seen = new Set<string>();
    const duplicates = names.filter((n) => {
      if (seen.has(n)) return true;
      seen.add(n);
      return false;
    });
    expect(duplicates).toEqual([]);
  });

  it.each([...ROUND_2_ADDITIONS, ...ROUND_3_ADDITIONS, ...ROUND_4_ADDITIONS, ...ROUND_5_ADDITIONS])(
    "registers %s for erasure",
    (table) => {
      expect(sql).toMatch(new RegExp(`^\\s*'${table}'`, "m"));
    },
  );

  it.each(DELIBERATE_EXCLUSIONS)(
    "does NOT register %s — retention is deliberate, see the migration header",
    (table) => {
      const registered = entryLines.some((l) =>
        l.startsWith(`'${table}'`),
      );
      expect(registered).toBe(false);
    },
  );

  /**
   * COVERAGE, not just structure.
   *
   * The assertions above prove that what IS registered is well-formed and that
   * what IS excluded stays excluded. Neither notices the case that actually
   * loses a GDPR request: a migration adds a new table carrying `user_id`, and
   * nobody adds it to the cascade. Nothing fails, the erasure "completes", and
   * that user's rows survive.
   *
   * So this derives the set of user-scoped tables from the migrations
   * themselves and demands every one be either registered or deliberately
   * excluded with a reason. A new table forces a decision instead of
   * defaulting to "not erased".
   */
  it("every user-scoped table is either registered or deliberately excluded", () => {
    const schema = buildSchema();
    const userScoped = [...schema.entries()]
      .filter(([, cols]) => cols.has("user_id"))
      .map(([table]) => table);

    // `profiles` is deleted explicitly at the end of the function, not via the
    // loop, because every other table's FK depends on it.
    const handledElsewhere = new Set<string>([
      "profiles",
      ...DELIBERATE_EXCLUSIONS,
    ]);

    const registered = new Set(
      entryLines
        .map((l) => l.match(/^'([a-z0-9_]+)'/)?.[1])
        .filter((t): t is string => Boolean(t)),
    );

    const unaccounted = userScoped
      .filter((t) => !registered.has(t) && !handledElsewhere.has(t))
      .sort();

    expect(unaccounted).toEqual([]);
  });
});

/** Drop a trailing `-- comment` so the comma check sees the real line ending. */
function stripTrailingComment(line: string): string {
  const idx = line.indexOf("--");
  return (idx === -1 ? line : line.slice(0, idx)).trim();
}
