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
 * Findings are split into three kinds because they need three different
 * responses, and lumping them together would train the reader to skim past all
 * of them:
 *   none — no scoping predicate at all. A read here returns EVERY user's rows.
 *   fk   — scoped by a parent key (`.eq("goal_id", ...)`).
 *   pk   — scoped by `.eq("id", ...)`, so it can only ever return ONE row.
 * `fk` and `pk` are frequently correct: the id was resolved from an
 * owner-scoped query upstream. They are frequently NOT: the id came straight
 * off a request path. This script cannot tell the two apart, so it reports them
 * for a human to confirm rather than guessing.
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

const FROM_PATTERN = /\.from\(\s*["'`]([a-z0-9_]+)["'`]\s*\)/g;
const OWNER_FILTER = /\.(eq|in)\(\s*["'`]user_id["'`]/;
const PK_FILTER = /\.(eq|in)\(\s*["'`]id["'`]/;
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

/**
 * Deliberately cross-user queries, opted out AT THE CALL SITE:
 *
 *   // idor-audit: cross-user — admin revenue report, gated by withRole("admin")
 *
 * Some queries are correctly unscoped — aggregate admin reporting, maintenance
 * sweeps over every user's soft-deleted rows. Those must not be forced to
 * carry a user_id filter, but they also must not be waved through silently.
 *
 * The marker is per-site and must state a reason, so the decision is visible
 * in review right next to the query rather than buried in a config threshold.
 * A blanket file/table exclusion list would hide the NEXT unscoped query added
 * to the same file; this cannot.
 */
const CROSS_USER_MARKER = /\/\/\s*idor-audit:\s*cross-user\s*[—-]\s*\S/;

/** Line-start offsets of every cross-user marker in the file. */
function markedLines(text) {
  const lines = text.split("\n");
  const marked = new Set();
  lines.forEach((l, i) => {
    if (CROSS_USER_MARKER.test(l)) marked.add(i + 1);
  });
  return marked;
}

/** True when a marker sits on, or within 3 lines above, the query. */
function isMarked(marked, line) {
  for (let i = line; i >= line - 3; i--) if (marked.has(i)) return true;
  return false;
}

/** Blank out line and block comments so a documented .from() is not scanned. */
function stripComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/^[ \t]*\/\/.*$/gm, (m) => " ".repeat(m.length));
}

/**
 * Extent of the query chain that starts at `.from(` — up to the `;` that ends
 * the statement, tracking bracket depth and quotes so a `;` inside an object
 * literal, arrow function, or string does not cut the chain short.
 *
 * This replaced a fixed 500-character window, which silently truncated any
 * chain with a large `.update({...})` payload: bill-negotiation-service.ts:376
 * carries its `.eq("user_id", userId)` 14 lines below the `.from(`, so the
 * window ended before it and the query was reported as unscoped when it was
 * not. A magic number cannot express "the rest of this statement"; bracket
 * balance can.
 */
function chainExtent(text, at) {
  let depth = 0;
  let quote = null;
  for (let i = at; i < text.length; i++) {
    const c = text[i];
    if (quote) {
      if (c === "\\") i++;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") quote = c;
    else if (c === "(" || c === "[" || c === "{") depth++;
    else if (c === ")" || c === "]" || c === "}") depth--;
    else if (c === ";" && depth <= 0) return i;
  }
  return text.length;
}

/**
 * Table-handle aliases: `const disputes = () => getServiceRoleClient().from("disputes")`.
 *
 * Several services declare one of these per table and then filter at the call
 * site — `disputes().select().eq("user_id", u)`. Auditing only `.from(` would
 * report the DECLARATION as an unfiltered query (it has no filters, by design)
 * while never seeing the real call sites at all, since those contain no
 * `.from(`. That is not merely a false positive: it is a false negative
 * covering every query in the file. Resolving the alias turns `disputes()`
 * into an anchor equivalent to `.from("disputes")`.
 */
function aliasPattern(text) {
  const aliases = new Map();
  const re =
    /(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*\(\s*\)\s*=>\s*[\w.()]*\.from\(\s*["'`]([a-z0-9_]+)["'`]\s*\)/g;
  for (const m of text.matchAll(re)) aliases.set(m[1], m[2]);
  return aliases;
}

function audit(text, rel, userScoped, findings, marked) {
  const aliases = aliasPattern(text);

  for (const [name, table] of aliases) {
    if (!userScoped.has(table)) continue;
    // `name(` but not the declaration itself (which is `name =`).
    const callRe = new RegExp(`\\b${name}\\(\\s*\\)`, "g");
    for (const call of text.matchAll(callRe)) {
      const at = call.index;
      if (/=\s*$/.test(text.slice(Math.max(0, at - 40), at))) continue; // declaration
      const chain = text.slice(at, chainExtent(text, at));
      if (OWNER_FILTER.test(chain)) continue;
      const aliasLine = text.slice(0, at).split("\n").length;
      if (isMarked(marked, aliasLine)) continue;
      const fk = chain.match(FK_FILTER);
      const pk = PK_FILTER.test(chain);
      findings.push({
        file: rel,
        line: text.slice(0, at).split("\n").length,
        table,
        op: operationOf(chain),
        kind: fk ? "fk" : pk ? "pk" : "none",
        via: fk ? fk[2] : pk ? "id" : null,
      });
    }
  }

  for (const match of text.matchAll(FROM_PATTERN)) {
    const table = match[1];
    // The alias declaration itself carries no filters by design; its call
    // sites were just audited above.
    if ([...aliases.values()].includes(table) && /=>\s*[\w.()]*\.from\($/.test(text.slice(Math.max(0, match.index - 60), match.index + 6))) continue;
    if (!userScoped.has(table)) continue; // no user_id column — nothing to scope

    const at = match.index;
    const chain = text.slice(at, chainExtent(text, at));

    // `profiles` is keyed BY the user id, so `.eq("id", userId)` is true owner
    // scoping there, not merely a single-row lookup.
    if (OWNER_FILTER.test(chain)) continue;
    if (table === "profiles" && PK_FILTER.test(chain)) continue;
    if (isMarked(marked, text.slice(0, at).split("\n").length)) continue;

    const fk = chain.match(FK_FILTER);
    const pk = PK_FILTER.test(chain);
    findings.push({
      file: rel,
      line: text.slice(0, at).split("\n").length,
      table,
      op: operationOf(chain),
      kind: fk ? "fk" : pk ? "pk" : "none",
      via: fk ? fk[2] : pk ? "id" : null,
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
    audit(stripComments(raw), rel, userScoped, findings, markedLines(raw));
  }

  console.log(`user-scoped tables           : ${userScoped.size}`);
  console.log(`files on service role        : ${converted.length}`);
  const unscoped = findings.filter((f) => f.kind === "none");
  const fkScoped = findings.filter((f) => f.kind === "fk");
  const pkScoped = findings.filter((f) => f.kind === "pk");

  console.log(`NO owner filter at all       : ${unscoped.length}`);
  console.log(`scoped via a parent key      : ${fkScoped.length}`);
  console.log(`scoped to a single row by id : ${pkScoped.length}\n`);

  if (unscoped.length) console.log("UNSCOPED (fix these):");
  for (const f of unscoped) {
    console.log(`  ${f.op.padEnd(6)} ${f.table.padEnd(30)} ${f.file}:${f.line}`);
  }
  if (fkScoped.length) console.log("\nFK-SCOPED (confirm the parent is owner-checked):");
  for (const f of fkScoped) {
    console.log(`  ${f.op.padEnd(6)} ${f.table.padEnd(28)} via ${String(f.via).padEnd(16)} ${f.file}:${f.line}`);
  }
  if (pkScoped.length)
    console.log("\nPK-SCOPED (confirm the id was resolved from an owner-scoped query):");
  for (const f of pkScoped) {
    console.log(`  ${f.op.padEnd(6)} ${f.table.padEnd(28)} via id           ${f.file}:${f.line}`);
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
