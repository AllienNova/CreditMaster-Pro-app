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
 * HONEST LIMITS. This parses SQL with regexes, so it sees only the shapes
 * below. Anything else — a table created by a function body, `CREATE TABLE
 * ... (LIKE other)`, a column added by dynamic SQL, or a table that lives only
 * in a hosted database and was never migrated — is invisible, and a table it
 * misses is a table the IDOR audit will silently skip. Recognised:
 *
 *   CREATE TABLE [IF NOT EXISTS] name ( ... user_id ... )
 *   ALTER TABLE name ADD COLUMN [IF NOT EXISTS] user_id
 *
 * Cross-check against the live schema when a database IS available:
 *   psql -At -c "select distinct table_name from information_schema.columns
 *                where table_schema='public' and column_name='user_id'"
 *
 * Usage:
 *   node scripts/list-user-scoped-tables.js            # print to stdout
 *   node scripts/list-user-scoped-tables.js /tmp/uid.txt
 */

const { readFileSync, readdirSync, writeFileSync } = require("fs");
const { join } = require("path");

const MIGRATIONS = join(process.cwd(), "supabase", "migrations");

/**
 * Blank out `--` line comments and block comments, preserving offsets.
 *
 * Load-bearing in BOTH directions. A comment sitting between the opening
 * paren and the column list pushed `user_id` off the start of its line and
 * hid savings_contributions entirely; a comment whose prose mentions
 * "user_id" would just as easily invent a column that does not exist.
 */
function stripComments(sql) {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/--[^\n]*/g, (m) => " ".repeat(m.length));
}

/** Body of the parenthesised block starting at `open`, by bracket balance. */
function parenBody(sql, open) {
  let depth = 0;
  for (let i = open; i < sql.length; i++) {
    if (sql[i] === "(") depth++;
    else if (sql[i] === ")") {
      depth--;
      if (depth === 0) return sql.slice(open, i);
    }
  }
  return null;
}

function collect(sql, tables) {
  const clean = stripComments(sql).toLowerCase();

  const createRe =
    /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?"?([a-z0-9_]+)"?\s*\(/g;
  for (const m of clean.matchAll(createRe)) {
    const open = m.index + m[0].length - 1; // the "(" the match ends on
    const body = parenBody(clean, open);
    if (body && /(^|[,(])\s*"?user_id"?[\s"]/m.test(body)) tables.add(m[1]);
  }

  const alterRe =
    /alter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?(?:public\.)?"?([a-z0-9_]+)"?\s+add\s+column\s+(?:if\s+not\s+exists\s+)?"?user_id"?/g;
  for (const m of clean.matchAll(alterRe)) tables.add(m[1]);
}

function main() {
  const tables = new Set();
  for (const f of readdirSync(MIGRATIONS).filter((f) => f.endsWith(".sql"))) {
    collect(readFileSync(join(MIGRATIONS, f), "utf8"), tables);
  }

  const out = [...tables].sort().join("\n") + "\n";
  const dest = process.argv[2];
  if (dest) {
    writeFileSync(dest, out);
    console.error(`${tables.size} user-scoped tables -> ${dest}`);
  } else {
    process.stdout.write(out);
  }
}

main();
