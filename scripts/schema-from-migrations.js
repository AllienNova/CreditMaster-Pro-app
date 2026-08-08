#!/usr/bin/env node
/**
 * Reconstruct the public schema from supabase/migrations, as
 * `table:col1,col2,...` lines — the format audit-phantom-columns.js already
 * consumes from psql.
 *
 * WHY. The phantom-column audit needed a live Postgres, so it only ran when
 * someone had Docker up. A check that runs on a good day is not a check: the
 * defects it finds (a write that silently no-ops with PGRST204, a read that
 * comes back undefined and hits a `|| "stock"` fallback) are exactly the ones
 * nobody notices without it. The migrations are this repo's schema source of
 * truth, so replay them instead.
 *
 * Applied IN FILENAME ORDER, because a column added in one migration and
 * renamed in a later one must end up with the later name. Handled:
 *
 *   CREATE TABLE [IF NOT EXISTS] t (...)
 *   ALTER TABLE t ADD COLUMN [IF NOT EXISTS] c
 *   ALTER TABLE t DROP COLUMN [IF EXISTS] c
 *   ALTER TABLE t RENAME COLUMN a TO b
 *   ALTER TABLE t RENAME TO t2
 *   DROP TABLE [IF EXISTS] t
 *
 * HONEST LIMITS. Regex over SQL, so it sees only the shapes above. Invisible
 * to it: a table created inside a function body or by dynamic SQL, `CREATE
 * TABLE ... (LIKE other)`, `SELECT INTO`, and anything that exists only in a
 * hosted database because it was applied by hand and never migrated. Columns
 * it misses read as phantom (false positive); tables it misses are skipped
 * entirely (false negative). Cross-check against a real database when one is
 * available:
 *
 *   psql -At -c "select table_name||':'||string_agg(column_name,',' order by column_name)
 *                from information_schema.columns where table_schema='public'
 *                group by table_name"
 *
 * Usage:
 *   node scripts/schema-from-migrations.js [out.txt]
 */

const { readFileSync, readdirSync, writeFileSync } = require("fs");
const { join } = require("path");

const MIGRATIONS = join(process.cwd(), "supabase", "migrations");

/** Column-list entries that declare a constraint, not a column. */
const CONSTRAINT_START =
  /^(primary|foreign|unique|check|constraint|exclude|like|deferrable|initially)\b/i;

/** Blank out comments while preserving offsets, so prose cannot fake a column. */
function stripComments(sql) {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/--[^\n]*/g, (m) => " ".repeat(m.length));
}

/** Body of the parenthesised block whose opening paren is at `open`. */
function parenBody(sql, open) {
  let depth = 0;
  for (let i = open; i < sql.length; i++) {
    if (sql[i] === "(") depth++;
    else if (sql[i] === ")") {
      depth--;
      if (depth === 0) return sql.slice(open + 1, i);
    }
  }
  return null;
}

/** Split a column list on top-level commas — `NUMERIC(15,2)` must not split. */
function splitTopLevel(body) {
  const parts = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (c === "(") depth++;
    else if (c === ")") depth--;
    else if (c === "," && depth === 0) {
      parts.push(body.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(body.slice(start));
  return parts;
}

function columnsFromBody(body) {
  const cols = [];
  for (const raw of splitTopLevel(body)) {
    const entry = raw.trim();
    if (!entry || CONSTRAINT_START.test(entry)) continue;
    const m = entry.match(/^"?([a-zA-Z_][a-zA-Z0-9_]*)"?\s/);
    if (m) cols.push(m[1].toLowerCase());
  }
  return cols;
}

function applyMigration(sql, schema) {
  const s = stripComments(sql);

  const createRe =
    /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?"?([a-zA-Z0-9_]+)"?\s*\(/gi;
  for (const m of s.matchAll(createRe)) {
    const table = m[1].toLowerCase();
    const body = parenBody(s, m.index + m[0].length - 1);
    if (body === null) continue;
    const cols = new Set(columnsFromBody(body));
    // `IF NOT EXISTS` against an existing table is a no-op in Postgres; keep
    // whatever the earlier migration established rather than replacing it.
    if (schema.has(table) && /if\s+not\s+exists/i.test(m[0])) continue;
    schema.set(table, cols);
  }

  const alterRe =
    /alter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?(?:public\.)?"?([a-zA-Z0-9_]+)"?\s+([\s\S]*?);/gi;
  for (const m of s.matchAll(alterRe)) {
    const table = m[1].toLowerCase();
    const action = m[2];

    for (const a of action.matchAll(
      /add\s+column\s+(?:if\s+not\s+exists\s+)?"?([a-zA-Z0-9_]+)"?/gi,
    )) {
      if (!schema.has(table)) schema.set(table, new Set());
      schema.get(table).add(a[1].toLowerCase());
    }
    for (const d of action.matchAll(
      /drop\s+column\s+(?:if\s+exists\s+)?"?([a-zA-Z0-9_]+)"?/gi,
    )) {
      schema.get(table)?.delete(d[1].toLowerCase());
    }
    for (const r of action.matchAll(
      /rename\s+column\s+"?([a-zA-Z0-9_]+)"?\s+to\s+"?([a-zA-Z0-9_]+)"?/gi,
    )) {
      const cols = schema.get(table);
      if (!cols) continue;
      cols.delete(r[1].toLowerCase());
      cols.add(r[2].toLowerCase());
    }
    const renameTable = action.match(
      /^\s*rename\s+to\s+"?([a-zA-Z0-9_]+)"?/i,
    );
    if (renameTable && schema.has(table)) {
      schema.set(renameTable[1].toLowerCase(), schema.get(table));
      schema.delete(table);
    }
  }

  for (const m of s.matchAll(
    /drop\s+table\s+(?:if\s+exists\s+)?(?:public\.)?"?([a-zA-Z0-9_]+)"?/gi,
  )) {
    schema.delete(m[1].toLowerCase());
  }
}

function main() {
  const schema = new Map();
  const files = readdirSync(MIGRATIONS)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const f of files) {
    applyMigration(readFileSync(join(MIGRATIONS, f), "utf8"), schema);
  }

  const lines = [...schema.entries()]
    .filter(([, cols]) => cols.size > 0)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([t, cols]) => `${t}:${[...cols].sort().join(",")}`);

  const out = lines.join("\n") + "\n";
  const dest = process.argv[2];
  if (dest) {
    writeFileSync(dest, out);
    console.error(
      `${lines.length} tables from ${files.length} migrations -> ${dest}`,
    );
  } else {
    process.stdout.write(out);
  }
}

main();
