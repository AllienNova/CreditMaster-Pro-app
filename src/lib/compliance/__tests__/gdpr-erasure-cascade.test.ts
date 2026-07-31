/**
 * CMP-3 — Expand delete_user_data_cascade to all user-linked tables (FND-058)
 *
 * Test approach: rigorous migration-content validation.
 *
 * WHY NOT a real DB integration test: Jest in this repo runs against a mocked
 * Supabase client (no live/local Postgres). All existing RPC tests (affiliate,
 * payout, consent) mock `.rpc()` — no integration harness exists that can run
 * PL/pgSQL.  See src/lib/commerce/affiliate/__tests__/affiliate-service.test.ts
 * for the established pattern.
 *
 * WHY a migration-content test: the artifact being tested IS the migration SQL.
 * We parse the `v_tables TEXT[]` array out of the SQL directly (not a loose
 * substring match) and assert it is an exact superset of every required table.
 * The test fails (red) before the expanded migration exists, passes (green) once
 * it does.
 *
 * Seed tables for the TDD red step — genuinely absent from the original 28:
 *   broker_connections, push_subscriptions, webauthn_credentials, sessions
 *
 * These four do NOT appear in 20260401000000_gdpr_erasure_rpc.sql so the first
 * run MUST fail until supabase/migrations/20260518000002_expand_erasure_cascade.sql
 * is created.
 *
 * FND-058 FOLLOW-UP (schema-drift resilience): 20260518000002 runs an UNGUARDED
 * delete loop, so a single table absent from the live schema aborts the entire
 * erasure. 20260519000000_erasure_cascade_resilient.sql CREATE OR REPLACEs the
 * function to guard each table with to_regclass(). The "schema-drift resilience"
 * describe block below pins that guard; the coverage/permission/anonymisation
 * assertions now validate the resilient rewrite (it is the latest definition).
 */

import * as fs from "fs";
import * as path from "path";
import {
  GDPRComplianceService,
  type DbClient,
} from "../gdpr-ccpa";

// Prevent supabaseAdmin import from crashing at module load
jest.mock("@/lib/supabase/server", () => ({
  supabaseAdmin: {
    from: jest.fn(),
    rpc: jest.fn(),
    auth: { admin: { deleteUser: jest.fn() } },
  },
}));

// ---------------------------------------------------------------------------
// Helpers — parse v_tables from migration SQL
// ---------------------------------------------------------------------------

const MIGRATIONS_DIR = path.resolve(
  __dirname,
  "../../../../supabase/migrations",
);

/**
 * Parse the `v_tables TEXT[] := ARRAY[...]` block from a PL/pgSQL migration.
 * Returns the array entries as exact unquoted table names (no surrounding quotes).
 *
 * Looks for the pattern:
 *   v_tables TEXT[] := ARRAY[
 *     'table_a',
 *     'table_b',
 *     ...
 *   ];
 *
 * This is a proper parser, not a substring match: it extracts the array block
 * boundaries and then pulls each single-quoted string literal out.
 */
function parseVTables(sql: string): Set<string> {
  const arrayBlockMatch = sql.match(
    /v_tables\s+TEXT\[\]\s*:=\s*ARRAY\[([\s\S]*?)\]\s*;/,
  );
  if (!arrayBlockMatch) {
    throw new Error(
      "Could not find `v_tables TEXT[] := ARRAY[...]` declaration in migration SQL",
    );
  }
  const arrayBlock = arrayBlockMatch[1];
  const tableNames = [...arrayBlock.matchAll(/'([^']+)'/g)].map((m) => m[1]);
  return new Set(tableNames);
}

/**
 * Returns the SQL content of the LATEST migration that redefines
 * `delete_user_data_cascade`. Migrations are sorted lexicographically
 * (timestamp prefixes make this chronological). Throws — red-step — if
 * only the original 28-table migration exists.
 */
function loadExpandedErasureMigration(): { filename: string; sql: string } {
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const defining = files.filter((f) => {
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, f), "utf-8");
    return /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+delete_user_data_cascade/i.test(
      sql,
    );
  });

  if (defining.length === 0) {
    throw new Error(
      "No migration defines delete_user_data_cascade — expected at least 20260401000000_gdpr_erasure_rpc.sql",
    );
  }

  const latest = defining[defining.length - 1];

  if (latest === "20260401000000_gdpr_erasure_rpc.sql") {
    throw new Error(
      "CMP-3 not yet implemented: the only migration defining delete_user_data_cascade " +
        "is the original 20260401000000_gdpr_erasure_rpc.sql (28 tables). " +
        "Create supabase/migrations/20260518000002_expand_erasure_cascade.sql with the delta tables.",
    );
  }

  const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, latest), "utf-8");
  return { filename: latest, sql };
}

/**
 * The schema-drift resilience migration (follow-up to FND-058). It CREATE OR
 * REPLACEs delete_user_data_cascade so the delete loop guards each table with
 * to_regclass() — a table absent from the live schema is skipped instead of
 * aborting the whole erasure. Loaded by EXACT name (not "latest") so the guard
 * assertions stay pinned to this file even if a later migration supersedes it.
 */
const RESILIENT_MIGRATION = "20260519000000_erasure_cascade_resilient.sql";

function loadResilientErasureMigration(): string {
  const p = path.join(MIGRATIONS_DIR, RESILIENT_MIGRATION);
  if (!fs.existsSync(p)) {
    throw new Error(
      `Resilient erasure migration missing: ${RESILIENT_MIGRATION}. ` +
        "It must CREATE OR REPLACE delete_user_data_cascade and wrap the delete " +
        "loop in `IF to_regclass('public.' || v_table) IS NOT NULL THEN ... END IF;` " +
        "so a missing table cannot abort GDPR erasure (schema-drift resilience).",
    );
  }
  return fs.readFileSync(p, "utf-8");
}

// ---------------------------------------------------------------------------
// Table sets
// ---------------------------------------------------------------------------

/**
 * Original 28 tables from 20260401000000_gdpr_erasure_rpc.sql v_tables array.
 * The expanded migration must include ALL of these (no regression).
 */
const ORIGINAL_28 = [
  "credit_cards",
  "goodwill_letters",
  "negotiations",
  "credit_reports",
  "disputes",
  "credit_scores",
  "subscriptions",
  "cancellation_requests",
  "notifications",
  "notification_preferences",
  "ai_interactions",
  "documents",
  "transactions",
  "transaction_rules",
  "budgets",
  "bills",
  "goals",
  "savings_accounts",
  "debt_accounts",
  "income_sources",
  "spending_categories",
  "onboarding_progress",
  "trading_accounts",
  "compliance_scores",
  "tax_documents",
  "credit_score_history",
  "bureau_connections",
  "consent_records",
];

/**
 * TDD RED-GATE seed — four tables genuinely absent from the original 28.
 * These drive the initial failing assertion before the expanded migration exists.
 */
const DELTA_SEED_TABLES = [
  "broker_connections",    // 20260117_add_trading_tables.sql — user_id UUID CASCADE
  "push_subscriptions",    // 20260204000000_web_push_subscriptions.sql — user_id UUID CASCADE
  "webauthn_credentials",  // 20260204000000_webauthn_tables.sql — user_id UUID CASCADE
  "sessions",              // 002_production_enhancements.sql — user_id UUID CASCADE
];

/**
 * Full delta — ALL user-linked tables discovered by migration audit that are
 * absent from the original 28 and have a direct `user_id UUID CASCADE` column.
 *
 * Indirect-FK children handled by Postgres CASCADE (no explicit DELETE needed):
 *   investment_holdings, investment_transactions → parent: investment_portfolios (in delta)
 *   financial_chat_messages → parent: financial_chat_sessions (in delta)
 *   chat_messages → parent: chat_sessions (in delta)
 */
const DELTA_FULL = [
  // 002_production_enhancements.sql
  "sessions",
  "uploads",
  "dispute_template_usage",
  "strategy_usage",
  // 20250107_credit_bureau_tables.sql
  "credit_accounts",
  "credit_inquiries",
  "public_records",
  // 20250203_user_settings.sql
  "user_settings",
  // 20250203000000_student_loan_schema.sql
  "student_loans",
  "student_loan_strategies",
  "federal_program_applications",
  "servicer_communications",
  "regulatory_complaints",
  "credit_report_monitoring",
  "document_analyses",
  "ml_predictions",
  "servicer_errors",
  "monitoring_events",
  "performance_analytics",
  // 20250204000000_credit_repair_schema.sql
  "credit_repair_scores",
  "credit_repair_actions",
  "credit_repair_progress",
  // 20250207000000_financial_intelligence_schema.sql (direct user_id tables)
  "financial_goals",
  "financial_health_scores",
  "financial_insights",
  "recurring_bills",
  "investment_portfolios",
  "trading_signals",
  "financial_chat_sessions",
  // 20251218000000_marketplace_schema.sql
  "marketplace_reviews",
  // 20260110_vitality_scores.sql
  "vitality_scores",
  "vitality_score_history",
  "quick_wins_completed",
  "milestones_achieved",
  // 20260115_create_financial_chat_tables.sql (chat_messages cascades via chat_sessions)
  "chat_sessions",
  // 20260117_add_trading_tables.sql
  "trailing_stops",
  "trading_rules",
  "trading_signals_v2",
  "broker_connections",
  "trade_history",
  "risk_rules",
  "backtest_results",
  // 20260120000000_gamification_ai_personalization.sql
  "user_progress",
  "user_badges",
  "badge_progress",
  "xp_transactions",
  "user_quest_progress",
  "user_challenge_participation",
  "user_financial_profiles",
  "spending_patterns",
  "nudge_history",
  "ai_coaching_sessions",
  "goal_tracking",
  "emotional_spending_alerts",
  // 20260121000000_tax_optimization_schema.sql
  "tax_profiles",
  "tax_recommendations",
  // 20260121000001_tax_documents_table.sql
  "tax_document_processing_log",
  // 20260204000000_web_push_subscriptions.sql
  "push_subscriptions",
  // 20260204000000_webauthn_tables.sql
  "webauthn_credentials",
  // 20260226_trading_modes_compliance.sql
  "trading_agent_logs",
  "mode_transitions",
  "circuit_breaker_events",
  // 20260420000001_user_risk_settings.sql
  "user_risk_settings",
  // 20260427000001_strategy_lifecycle.sql
  "strategy_lifecycle",
  // 20260427000002_credit_system.sql
  "user_credits",
  "credit_transactions",
  "credit_purchases",
  "addon_subscriptions",
  // 20260516000001_atomic_backup_code_redemption.sql
  "backup_codes",
  // 20260517000004_document_shares.sql
  "document_share_links",
  // 20260517000005_revenue_events.sql
  "revenue_events",
  // 20260517000006_referral_codes.sql
  "referral_codes",
  // 20260331000000_adverse_action_notices.sql
  "adverse_action_notices",
  // 20260518000001_breach_notifications.sql (CMP-2)
  "breach_notifications",
  // 20250208000000_bills_schema.sql (also cascade via bills, listed explicitly)
  "bill_payments",
  "bill_alerts",
  // 20260117_add_trading_tables.sql — user_id nullable; WHERE user_id=$1 safe
  "ml_models",
  // 20260226_trading_modes_compliance.sql — user_id nullable ON DELETE CASCADE
  "strategy_library",
];

/**
 * Tables that must NOT appear in the v_tables delete array.
 */
const EXCLUDED_TABLES: Array<{ table: string; reason: string }> = [
  {
    table: "audit_logs",
    reason:
      "Retained: immutable audit trail; user_id is SET NULL (anonymised, not deleted)",
  },
  {
    table: "tax_audit_log",
    reason: "Retained: tax compliance; user_id is ON DELETE SET NULL",
  },
  {
    table: "webauthn_challenges",
    reason:
      "Excluded: user_id column is TEXT not UUID — type mismatch with generic $1::UUID filter",
  },
  {
    table: "user_quotas",
    reason:
      "Excluded: user_id is TEXT PRIMARY KEY — type mismatch with generic $1::UUID filter",
  },
  {
    table: "billing_profiles",
    reason: "Excluded: dropped by migration 20260517000002_drop_billing_profiles.sql",
  },
];

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("CMP-3: delete_user_data_cascade migration coverage (FND-058)", () => {
  let vTables: Set<string>;
  let migrationSql: string;
  let migrationFilename: string;

  beforeAll(() => {
    // Throws (red step) until the expanded migration exists.
    const result = loadExpandedErasureMigration();
    migrationFilename = result.filename;
    migrationSql = result.sql;
    // Throws if v_tables array is structurally absent.
    vTables = parseVTables(migrationSql);
  });

  // -------------------------------------------------------------------------
  // TDD RED GATE — seed tables genuinely absent from original 28
  // -------------------------------------------------------------------------

  describe("seed tables (TDD red-gate) — absent from original 28", () => {
    test.each(DELTA_SEED_TABLES)(
      "v_tables contains seed table: %s",
      (table) => {
        expect(vTables.has(table)).toBe(true);
      },
    );
  });

  // -------------------------------------------------------------------------
  // Original 28 preserved (no regression)
  // -------------------------------------------------------------------------

  describe("original 28 tables preserved — no regression", () => {
    test.each(ORIGINAL_28)(
      "v_tables still contains original table: %s",
      (table) => {
        expect(vTables.has(table)).toBe(true);
      },
    );
  });

  // -------------------------------------------------------------------------
  // Full delta coverage — exact set membership via parsed array
  // -------------------------------------------------------------------------

  describe("full delta coverage — all newly discovered tables", () => {
    test.each(DELTA_FULL)(
      "v_tables contains delta table: %s",
      (table) => {
        expect(vTables.has(table)).toBe(true);
      },
    );
  });

  // -------------------------------------------------------------------------
  // Legal retention — excluded tables NOT in v_tables delete array
  // -------------------------------------------------------------------------

  describe("legal retention — excluded tables absent from v_tables", () => {
    test.each(EXCLUDED_TABLES)(
      "v_tables does NOT contain excluded table: $table ($reason)",
      ({ table }) => {
        expect(vTables.has(table)).toBe(false);
      },
    );
  });

  // -------------------------------------------------------------------------
  // Permission template (from d64e8d5)
  // -------------------------------------------------------------------------

  test("migration REVOKEs execution from PUBLIC", () => {
    expect(migrationSql).toMatch(/REVOKE\s+(?:ALL|EXECUTE)/i);
    expect(migrationSql).toMatch(/FROM\s+PUBLIC/i);
  });

  test("migration GRANTs EXECUTE to service_role only", () => {
    expect(migrationSql).toMatch(/GRANT\s+EXECUTE\s+ON\s+FUNCTION/i);
    expect(migrationSql).toMatch(/TO\s+service_role/i);
  });

  // -------------------------------------------------------------------------
  // Audit-log PII anonymisation — ip_address + user_agent must be nulled
  // -------------------------------------------------------------------------

  test("audit_logs UPDATE nulls ip_address (PII under GDPR Art. 4(1))", () => {
    // Must contain SET ... ip_address = NULL inside the UPDATE audit_logs block
    expect(migrationSql).toMatch(
      /UPDATE\s+audit_logs[\s\S]*?ip_address\s*=\s*NULL/i,
    );
  });

  test("audit_logs UPDATE nulls user_agent (PII)", () => {
    expect(migrationSql).toMatch(
      /UPDATE\s+audit_logs[\s\S]*?user_agent\s*=\s*NULL/i,
    );
  });

  test("audit_logs UPDATE uses ::text cast to handle TEXT user_id column", () => {
    // The authoritative audit_logs schema (20260217000000) defines user_id as TEXT.
    // Without ::text the WHERE clause would throw a UUID vs TEXT type error.
    expect(migrationSql).toMatch(
      /UPDATE\s+audit_logs[\s\S]*?WHERE\s+user_id\s*=\s*p_user_id::text/i,
    );
  });

  test("tax_audit_log UPDATE nulls ip_address (PII)", () => {
    expect(migrationSql).toMatch(
      /UPDATE\s+tax_audit_log[\s\S]*?ip_address\s*=\s*NULL/i,
    );
  });

  // -------------------------------------------------------------------------
  // Structural sanity
  // -------------------------------------------------------------------------

  test("expanded migration has more tables than the original 28", () => {
    expect(vTables.size).toBeGreaterThan(28);
  });

  test("latest migration defining the function is schema-drift resilient", () => {
    // 20260519000000_erasure_cascade_resilient.sql introduced the to_regclass()
    // guard; 20260731000001_expand_erasure_cascade_orders_positions.sql (adding
    // `orders`/`positions` for the trading-persistence migration) is now later
    // and CREATE OR REPLACEs the function again, carrying the guard forward.
    // Asserting on filename (the original form of this test) would need a
    // manual bump every time a legitimate future migration extends v_tables
    // further; asserting the actual invariant — whichever migration is latest
    // must still be resilient — protects against a real regression (someone
    // extending v_tables via a CREATE OR REPLACE that drops the guard) without
    // being tied to a specific filename. migrationFilename/migrationSql above
    // already resolve to "latest" via loadExpandedErasureMigration().
    expect(migrationFilename).not.toBe("20260401000000_gdpr_erasure_rpc.sql");
    expect(migrationFilename).not.toBe(
      "20260518000002_expand_erasure_cascade.sql",
    );
    expect(migrationSql).toMatch(
      /IF\s+to_regclass\('public\.'\s*\|\|\s*v_table\)\s+IS\s+NOT\s+NULL\s+THEN/i,
    );
  });

  test("migration uses CREATE OR REPLACE FUNCTION", () => {
    expect(migrationSql).toMatch(
      /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+delete_user_data_cascade/i,
    );
  });

  test("v_tables is a superset of all original + delta tables", () => {
    const allRequired = new Set([...ORIGINAL_28, ...DELTA_FULL]);
    const missing: string[] = [];
    for (const t of allRequired) {
      if (!vTables.has(t)) missing.push(t);
    }
    expect(missing).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Schema-drift resilience — guarded delete loop (FND-058 follow-up)
//
// 20260518000002 runs an UNGUARDED delete loop; if any listed table is absent
// from the live schema the first DELETE raises undefined_table (42P01) and the
// whole erasure aborts — GDPR Art. 17 silently broken for every user. The
// resilient rewrite guards each table with to_regclass() so a missing table is
// skipped, not fatal. (5 listed tables — transactions, goals, ai_interactions,
// savings_accounts, spending_categories — have no CREATE TABLE in any migration.)
// ---------------------------------------------------------------------------

describe("schema-drift resilience: to_regclass-guarded delete loop", () => {
  let resilientSql: string;

  beforeAll(() => {
    // Throws (red) until 20260519000000_erasure_cascade_resilient.sql exists.
    resilientSql = loadResilientErasureMigration();
  });

  test("resilient migration redefines the function via CREATE OR REPLACE", () => {
    expect(resilientSql).toMatch(
      /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+delete_user_data_cascade/i,
    );
  });

  test("delete loop guards each table with to_regclass('public.' || v_table)", () => {
    expect(resilientSql).toMatch(
      /IF\s+to_regclass\('public\.'\s*\|\|\s*v_table\)\s+IS\s+NOT\s+NULL\s+THEN/i,
    );
  });

  test("the EXECUTE ... DELETE sits INSIDE the to_regclass IF guard (THEN ... END IF)", () => {
    // Structural: the guard must WRAP the dynamic DELETE, not merely coexist.
    // Order enforced: IF to_regclass(...) THEN -> EXECUTE format('DELETE ...') -> END IF;
    expect(resilientSql).toMatch(
      /IF\s+to_regclass\([\s\S]*?\)\s+IS\s+NOT\s+NULL\s+THEN[\s\S]*?EXECUTE\s+format\('DELETE FROM %I WHERE user_id = \$1'[\s\S]*?END\s+IF;/i,
    );
  });

  test("resilient migration keeps the same v_tables coverage (no dropped tables)", () => {
    const resilientTables = parseVTables(resilientSql);
    const allRequired = new Set([...ORIGINAL_28, ...DELTA_FULL]);
    const missing = [...allRequired].filter((t) => !resilientTables.has(t));
    expect(missing).toEqual([]);
  });

  test("resilient migration re-asserts REVOKE from PUBLIC + GRANT to service_role", () => {
    expect(resilientSql).toMatch(/REVOKE\s+ALL\s+ON\s+FUNCTION[\s\S]*?FROM\s+PUBLIC/i);
    expect(resilientSql).toMatch(
      /GRANT\s+EXECUTE\s+ON\s+FUNCTION[\s\S]*?TO\s+service_role/i,
    );
  });

  test("profiles DELETE stays UNGUARDED (core record must hard-fail if ever absent)", () => {
    // profiles anchors the erasure and exists in every schema; deliberately NOT
    // wrapped in a to_regclass guard so a missing profiles table fails loudly.
    expect(resilientSql).toMatch(
      /DELETE\s+FROM\s+profiles\s+WHERE\s+id\s*=\s*p_user_id/i,
    );
    // And it is NOT immediately preceded by a to_regclass guard on profiles.
    expect(resilientSql).not.toMatch(/to_regclass\([^)]*profiles/i);
  });
});

// ---------------------------------------------------------------------------
// TypeScript service layer — deleteUserData calls the RPC correctly
// ---------------------------------------------------------------------------

describe("GDPRComplianceService.deleteUserData — RPC call contract", () => {
  function buildMockDb(rpcError?: string): DbClient {
    return {
      from: jest.fn().mockReturnValue({
        insert: jest.fn().mockResolvedValue({ error: null }),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      }),
      rpc: jest
        .fn()
        .mockResolvedValue({ error: rpcError ? { message: rpcError } : null }),
      auth: {
        admin: {
          deleteUser: jest.fn().mockResolvedValue({ error: null }),
        },
      },
    };
  }

  test("calls delete_user_data_cascade with p_user_id and p_reason", async () => {
    const db = buildMockDb();
    const svc = new GDPRComplianceService(db);

    await svc.deleteUserData("user-uuid-1", "test reason");

    expect(db.rpc).toHaveBeenCalledWith("delete_user_data_cascade", {
      p_user_id: "user-uuid-1",
      p_reason: "test reason",
    });
  });

  test("calls delete_user_data_cascade with p_reason null when reason is omitted", async () => {
    const db = buildMockDb();
    const svc = new GDPRComplianceService(db);

    await svc.deleteUserData("user-uuid-2");

    expect(db.rpc).toHaveBeenCalledWith("delete_user_data_cascade", {
      p_user_id: "user-uuid-2",
      p_reason: null,
    });
  });

  test("returns status=completed when RPC and auth both succeed", async () => {
    const db = buildMockDb();
    const svc = new GDPRComplianceService(db);

    const result = await svc.deleteUserData("user-uuid-3");

    expect(result.status).toBe("completed");
    expect(result.userId).toBe("user-uuid-3");
  });

  test("returns status=failed when RPC errors — does not call auth.admin.deleteUser", async () => {
    const db = buildMockDb("DB constraint violation");
    const svc = new GDPRComplianceService(db);

    const result = await svc.deleteUserData("user-uuid-4");

    expect(result.status).toBe("failed");
    expect(result.error).toContain("Cascade delete failed");
    expect(db.auth.admin.deleteUser).not.toHaveBeenCalled();
  });

  test("second user is untouched — RPC called exactly once with target user_id only", async () => {
    const db = buildMockDb();
    const svc = new GDPRComplianceService(db);

    await svc.deleteUserData("user-A");

    const rpcCalls = (db.rpc as jest.Mock).mock.calls;
    expect(rpcCalls).toHaveLength(1);
    const args = rpcCalls[0][1] as Record<string, unknown>;
    expect(args.p_user_id).toBe("user-A");
    expect(JSON.stringify(rpcCalls)).not.toContain("user-B");
  });
});
