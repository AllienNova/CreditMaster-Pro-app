#!/usr/bin/env node
/**
 * IDOR audit for service-role queries.
 *
 * WHY. `getServiceRoleClient()` BYPASSES row level security. On the tables these
 * services touch, RLS was the ONLY thing scoping a read to the current user, so
 * once a query runs through the service role the `.eq("user_id", ...)` filter is
 * load-bearing. Omitting it does not error — it silently returns EVERY user's
 * rows. FND-030 was exactly that: portfolio-service dropped the filter and any
 * authenticated user could read another user's holdings.
 *
 * 225 call sites is far too many to eyeball, and eyeballing is precisely where a
 * missed filter would slip through. This makes the check mechanical.
 *
 * WHAT IT FLAGS. Any service-role query chain touching a table that carries a
 * `user_id` column, without an owner-scoping predicate in the same chain.
 * Accepted as scoping:
 *     .eq("user_id", ...)   the normal case
 *     .in("user_id", ...)   batch reads
 *     .eq("id", userId)     for `profiles`, whose primary key IS the user id
 *
 * HONEST LIMITS. Regex over source text, same family as
 * audit-phantom-columns.js: a chain split unusually, a filter applied via a
 * helper, or a table name held in a variable are all invisible to it. A clean
 * run means "no easily-detectable unscoped query", never "no IDOR". Treat a
 * finding as a question to answer, not an automatic defect.
 *
 * Usage:
 *   psql -At -c "select table_name from information_schema.columns
 *                where table_schema='public' and column_name='user_id'" > /tmp/uid.txt
 *   node scripts/audit-service-role-idor.js /tmp/uid.txt
 */

const { readFileSync, readdirSync, statSync } = require("fs");
const { join, relative } = require("path");

const ROOT = process.cwd();
const SRC = join(ROOT, "src");
const WINDOW = 500; // chars of chain considered after .from()

const FROM_PATTERN = /\.from\(\s*["'`]([a-z0-9_]+)["'`]\s*\)/g;
const OWNER_FILTER = /\.(eq|in)\(\s*["'`]user_id["'`]/;
const PROFILE_PK_FILTER = /\.eq\(\s*["'`]id["'`]/;
/**
 * Scoping by a parent key rather than user_id directly — e.g.
 * `.eq("goal_id", ...)` or `.eq("item_id", ...)`. This is often CORRECT: a
 * Plaid webhook knows the item, not the user, and resolves one from the other.
 * But it is only safe if the parent id was itself owner-checked before it got
 * here, which this script cannot see. Reported separately so a legitimate
 * FK-scoped query is not lumped in with a genuinely unscoped one — the two
 * need different responses, and conflating them would train the reader to
 * ignore both.
 */
const FK_FILTER = /\.(eq|in)\(\s*["'`]([a-z0-9_]+_id)["'`]/;

function loadUserScopedTables(path) {
  return new Set(
    readFileSync(path, "utf8")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean),
  );
}

function walk(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "node_modules" || entry === "__tests__") continue;
      walk(full, acc);
    } else if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry)) {
      acc.push(full);
    }
  }
  return acc;
}

function operationOf(chain) {
  if (/\.(insert|upsert)\(/.test(chain)) return "insert";
  if (/\.update\(/.test(chain)) return "update";
  if (/\.delete\(/.test(chain)) return "delete";
  return "select";
}

/** Blank out line and block comments so a documented .from() is not scanned. */
function stripComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/^[ \t]*\/\/.*$/gm, (m) => " ".repeat(m.length));
}

function audit(text, rel, userScoped, findings) {
  for (const match of text.matchAll(FROM_PATTERN)) {
    const table = match[1];
    if (!userScoped.has(table)) continue; // no user_id column — nothing to scope

    const at = match.index;
    const rest = text.slice(at + 1);
    const nextFrom = rest.search(/\.from\(\s*["'`][a-z0-9_]+["'`]\s*\)/);
    const limit = nextFrom === -1 ? WINDOW : Math.min(WINDOW, nextFrom + 1);
    const chain = text.slice(at, at + limit);

    const scoped =
      OWNER_FILTER.test(chain) ||
      (table === "profiles" && PROFILE_PK_FILTER.test(chain));

    if (scoped) continue;

    const fk = chain.match(FK_FILTER);
    findings.push({
      file: rel,
      line: text.slice(0, at).split("\n").length,
      table,
      op: operationOf(chain),
      // "fk" = scoped by a parent key; needs a human to confirm the parent was
      // owner-checked. "none" = no scoping predicate at all.
      kind: fk ? "fk" : "none",
      via: fk ? fk[2] : null,
    });
  }
}

function main() {
  const tablesPath = process.argv[2];
  if (!tablesPath) {
    console.error(
      "usage: node scripts/audit-service-role-idor.js <user-scoped-tables-file>",
    );
    process.exit(2);
  }

  const userScoped = loadUserScopedTables(tablesPath);
  const findings = [];
  const converted = [];

  for (const file of walk(SRC)) {
    const raw = readFileSync(file, "utf8");
    if (!raw.includes("getServiceRoleClient")) continue; // not converted yet
    const rel = relative(ROOT, file);
    converted.push(rel);
    audit(stripComments(raw), rel, userScoped, findings);
  }

  console.log(`user-scoped tables           : ${userScoped.size}`);
  console.log(`files on service role        : ${converted.length}`);
  const unscoped = findings.filter((f) => f.kind === "none");
  const fkScoped = findings.filter((f) => f.kind === "fk");

  console.log(`NO owner filter at all       : ${unscoped.length}`);
  console.log(`scoped via a parent key      : ${fkScoped.length}\n`);

  if (unscoped.length) console.log("UNSCOPED (fix these):");
  for (const f of unscoped) {
    console.log(`  ${f.op.padEnd(6)} ${f.table.padEnd(30)} ${f.file}:${f.line}`);
  }
  if (fkScoped.length) console.log("\nFK-SCOPED (confirm the parent is owner-checked):");
  for (const f of fkScoped) {
    console.log(`  ${f.op.padEnd(6)} ${f.table.padEnd(28)} via ${String(f.via).padEnd(16)} ${f.file}:${f.line}`);
  }

  // An insert legitimately supplies user_id in its payload rather than as a
  // filter, so inserts are reported but do not fail the run. Reads, updates and
  // deletes that could touch another user's rows do.
  const blocking = unscoped.filter((f) => f.op !== "insert");
  if (blocking.length > 0) {
    console.log(`\n${blocking.length} non-insert queries lack an owner filter.`);
  }
  process.exitCode = blocking.length > 0 ? 1 : 0;
}

main();
