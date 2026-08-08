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

const { writeFileSync } = require("fs");
const { buildSchema } = require("./schema-from-migrations");

function main() {
  const schema = buildSchema();
  const tables = [...schema.entries()]
    .filter(([, cols]) => cols.has("user_id"))
    .map(([table]) => table)
    .sort();

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
