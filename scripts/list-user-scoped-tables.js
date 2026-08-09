#!/usr/bin/env node
/**
 * List every public table that carries a `user_id` column, derived from the
 * migrations rather than from a live database.
 *
 * WHY NOT psql. audit-service-role-idor.js needs this list to know which
 * tables are user-scoped. Reading it from a running Postgres makes the IDOR
 * gate depend on Docker being up, which means it cannot run in CI — a gate
 * that only runs when someone remembers to start a container is not a gate.
 * The migrations are this repo's schema source of truth, so derive it there.
 *
 * This delegates to schema-from-migrations.js rather than parsing the SQL a
 * second time. The first version did its own accumulate-only parse and so
 * never honoured `DROP TABLE`: `billing_profiles`, dropped in
 * 20260517000002, stayed in the list forever. A duplicated parser drifts from
 * the one that gets fixed; one parser cannot.
 *
 * HONEST LIMITS are schema-from-migrations.js's — see its header. A table it
 * cannot see is a table the IDOR audit silently skips, so cross-check against
 * a real database when one is available:
 *   psql -At -c "select distinct table_name from information_schema.columns
 *                where table_schema='public' and column_name='user_id'"
 *
 * Usage:
 *   node scripts/list-user-scoped-tables.js            # print to stdout
 *   node scripts/list-user-scoped-tables.js /tmp/uid.txt
 */

const { readFileSync, readdirSync, writeFileSync } = require("fs");
const { join } = require("path");
const { buildSchema } = require("./schema-from-migrations");

const MIGRATIONS = join(process.cwd(), "supabase", "migrations");

/**
 * Views that expose user_id.
 *
 * The IDOR audit cares about anything a service-role query can read, and a
 * view leaks exactly like the table under it: `select * from
 * latest_credit_scores` with no owner filter returns every user's scores.
 * Reconciling the derived list against a live database on 2026-08-01 showed
 * exactly 8 names present live and absent here — account_summary,
 * latest_credit_scores, portfolio_summary and five siblings — every one a
 * VIEW. Nothing queries them today, so the gap was latent rather than live,
 * but a view added to a query later would have been skipped in silence.
 *
 * Only the NAME matters here, not the column list: schema-from-migrations.js
 * deliberately does not model views, because deriving a view's columns means
 * resolving its SELECT, and a half-resolved column list would make the
 * phantom-column audit report false positives on every view.
 */
function userScopedViews() {
  const views = new Set();
  const re =
    /create\s+(?:or\s+replace\s+)?view\s+(?:if\s+not\s+exists\s+)?(?:public\.)?"?([a-zA-Z0-9_]+)"?\s+as\s+([\s\S]*?);/gi;

  for (const f of readdirSync(MIGRATIONS).filter((f) => f.endsWith(".sql"))) {
    const sql = readFileSync(join(MIGRATIONS, f), "utf8");
    for (const m of sql.matchAll(re)) {
      if (/\buser_id\b/i.test(m[2])) views.add(m[1].toLowerCase());
      else views.delete(m[1].toLowerCase()); // redefined without user_id
    }
  }
  return views;
}

function main() {
  const schema = buildSchema();
  const tables = [
    ...new Set([
      ...[...schema.entries()]
        .filter(([, cols]) => cols.has("user_id"))
        .map(([table]) => table),
      ...userScopedViews(),
    ]),
  ].sort();

  const out = tables.join("\n") + "\n";
  const dest = process.argv[2];
  if (dest) {
    writeFileSync(dest, out);
    console.error(`${tables.length} user-scoped tables -> ${dest}`);
  } else {
    process.stdout.write(out);
  }
}

main();
