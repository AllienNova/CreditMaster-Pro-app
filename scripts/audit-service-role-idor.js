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
 * off a request path. This script cannot tell the two apart, so it makes the
 * human say which — `pk` fails the run until the call site carries a
 * `// idor-audit: pk-owner-checked — <reason>` marker. `fk` is still reported
 * rather than blocking, since a webhook that knows only an item_id has no
 * user_id to filter on.
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

const { createHash } = require("crypto");
const { readFileSync, readdirSync, statSync, writeFileSync } = require("fs");
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

/**
 * Does this file talk to Postgres with RLS bypassed?
 *
 * This used to be `raw.includes("getServiceRoleClient")` — the shared helper's
 * name. That made the gate a FALSE GREEN over any file that reaches the
 * service role another way, and 22 of the 34 modules restored in 8e5481d do
 * exactly that: a raw `createClient(url, SUPABASE_SERVICE_ROLE_KEY)` or the
 * typed `supabaseAdmin` from @/lib/supabase/server. The audit reported
 * "0 findings" while never opening any of them.
 *
 * Detecting the CAPABILITY rather than one spelling of it is the point: any
 * client constructed with the service-role key bypasses RLS, so the
 * `.eq("user_id", ...)` filters in that file are load-bearing regardless of
 * which import produced the client.
 */
function usesServiceRole(text) {
  return (
    text.includes("getServiceRoleClient") ||
    text.includes("SUPABASE_SERVICE_ROLE_KEY") ||
    /\bsupabaseAdmin\b/.test(text)
  );
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

/**
 * A single-row `.eq("id", x)` lookup whose id was already owner-checked:
 *
 *   // idor-audit: pk-owner-checked — budgetId came from shared_budget_members
 *   //   filtered to this caller
 *
 * PK-scoped queries USED to be reported-but-not-blocking, on the reasoning
 * that returning one row is not mass disclosure. That reasoning was wrong, and
 * provably so: GoalPlanner.simulateGoal took a goalId straight off the request
 * path and looked it up by id alone. It was a real IDOR — any authenticated
 * user could read any other user's goal — and this audit passed it clean.
 * The bug was caught by reading the code, which is exactly what the audit
 * exists to stop relying on.
 *
 * So a bare `.eq("id", ...)` now blocks like any other unscoped query. It is
 * cleared either by adding the user_id filter or by stating, at the call site,
 * where the id was owner-resolved.
 */
const PK_CHECKED_MARKER = /\/\/\s*idor-audit:\s*pk-owner-checked\s*[—-]\s*\S/;

/** Line-start offsets of every cross-user marker in the file. */
function markedLines(text) {
  const lines = text.split("\n");
  const crossUser = new Set();
  const pkChecked = new Set();
  lines.forEach((l, i) => {
    if (CROSS_USER_MARKER.test(l)) crossUser.add(i + 1);
    if (PK_CHECKED_MARKER.test(l)) pkChecked.add(i + 1);
  });
  return { crossUser, pkChecked };
}

/** True when a marker sits on, or within 3 lines above, the query. */
function isMarked(set, line) {
  for (let i = line; i >= line - 4; i--) if (set.has(i)) return true;
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
      if (isMarked(marked.crossUser, aliasLine)) continue;
      const fk = chain.match(FK_FILTER);
      const pk = PK_FILTER.test(chain);
      findings.push({
        file: rel,
        line: text.slice(0, at).split("\n").length,
        table,
        op: operationOf(chain),
        kind: fk ? "fk" : pk ? "pk" : "none",
        sig: sigOf(chain),
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
    if (isMarked(marked.crossUser, text.slice(0, at).split("\n").length)) continue;

    const fk = chain.match(FK_FILTER);
    const pk = PK_FILTER.test(chain);
    findings.push({
      file: rel,
      line: text.slice(0, at).split("\n").length,
      table,
      op: operationOf(chain),
      kind: fk ? "fk" : pk ? "pk" : "none",
      sig: sigOf(chain),
      via: fk ? fk[2] : pk ? "id" : null,
      cleared: isMarked(marked.pkChecked, text.slice(0, at).split("\n").length),
    });
  }
}

/**
 * Known-unfixed findings, frozen 2026-08-09. A RATCHET, not an exemption.
 *
 * Widening usesServiceRole() from one helper name to the service-role
 * CAPABILITY took the audit's coverage from 63 files to 185 — it had never
 * looked at two thirds of the service-role code, including 22 of the modules
 * restored in 8e5481d. The findings that appeared are pre-existing debt, not a
 * regression, and are tracked in docs/specs/remediation-plan.md.
 *
 * The gate therefore fails on any finding NOT in this list. The list may only
 * shrink; scripts/idor-baseline.json is regenerated only by removing entries.
 * If it ever needs to grow, that is a new unscoped query and it should be
 * fixed instead.
 */
function loadBaseline() {
  const p = join(ROOT, "scripts", "idor-baseline.json");
  try {
    return JSON.parse(readFileSync(p, "utf8")).counts || {};
  } catch {
    return {};
  }
}

// The baseline key MUST identify the query by its CONTENT, not merely count
// findings per file/table/op/kind. A count-keyed baseline is launderable and
// this was proven with a reproduction: in a file baselined at
// `analytics_events|select|none = 3`, scoping one existing query while adding a
// brand-new fully-unscoped `.select("*")` leaves the count at 3, so the gate
// exits 0 and a read of every user's rows never surfaces. Neither `n > allowed`
// nor a shortfall check catches that — the totals are identical.
//
// `sig` is a hash of the whitespace-normalised query chain, so a NEW query is a
// NEW key regardless of what else in the file was fixed, and a FIXED query's key
// simply disappears (caught by the staleness check).
//
// Trade-off, accepted deliberately: reformatting or editing a baselined query
// changes its signature and blocks until the baseline is regenerated. That is
// the safe direction to fail — it forces a human to re-look at a query that is
// still unscoped, rather than silently re-blessing it.
const sigOf = (chain) =>
  createHash("sha1")
    .update(chain.replace(/\s+/g, " ").trim())
    .digest("hex")
    .slice(0, 12);

const key = (f) => `${f.file}|${f.table}|${f.op}|${f.kind}|${f.sig}`;

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
    if (!usesServiceRole(raw)) continue;
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
  const pkOpen = pkScoped.filter((f) => !f.cleared);
  const pkCleared = pkScoped.filter((f) => f.cleared);
  if (pkOpen.length)
    console.log("\nPK-SCOPED, NOT CLEARED (fix or justify — these fail the run):");
  for (const f of pkOpen) {
    console.log(`  ${f.op.padEnd(6)} ${f.table.padEnd(28)} via id  ${f.file}:${f.line}`);
  }
  if (pkCleared.length)
    console.log(`\nPK-SCOPED, cleared by an explicit marker: ${pkCleared.length}`);

  // An insert legitimately supplies user_id in its payload rather than as a
  // filter, so inserts are reported but do not fail the run. Reads, updates and
  // deletes that could touch another user's rows do.
  // An insert legitimately supplies user_id in its payload rather than as a
  // filter, so inserts are reported but do not fail the run.
  //
  // PK-scoped reads DO fail unless individually cleared. They were once
  // treated as safe-because-single-row; GoalPlanner.simulateGoal disproved
  // that, and this audit passed it clean at the time.
  const baseline = loadBaseline();
  const candidate = [
    ...unscoped.filter((f) => f.op !== "insert"),
    ...pkScoped.filter((f) => !f.cleared),
  ];

  if (process.argv.includes("--write-baseline")) {
    const counts = {};
    for (const f of candidate) counts[key(f)] = (counts[key(f)] || 0) + 1;
    writeFileSync(
      join(ROOT, "scripts", "idor-baseline.json"),
      JSON.stringify(
        {
          frozen: new Date().toISOString().slice(0, 10),
          why:
            "Pre-existing unscoped/PK-scoped service-role queries, held as tracked debt " +
            "so the gate can block NEW ones from line one. Keys are content-addressed " +
            "(file|table|op|kind|sha1-of-normalised-chain): a new query is a new key, " +
            "and a fixed query's key disappears. This list may only shrink.",
          counts,
        },
        null,
        2,
      ) + "\n",
    );
    console.log(
      `wrote scripts/idor-baseline.json — ${Object.keys(counts).length} keys, ${candidate.length} findings`,
    );
    return;
  }


  // COUNT-based, not key-membership. A key is file|table|op|kind, which is
  // stable across line drift but collapses several findings in one file into
  // one key — so plain membership let a NEW unscoped query hide behind an
  // already-baselined one in the same file. Verified: deleting a user_id
  // filter from bill-calendar-service.ts passed a membership check. Comparing
  // COUNTS catches the increment.
  const seen = new Map();
  for (const f of candidate) seen.set(key(f), (seen.get(key(f)) || 0) + 1);

  // A count-only comparison is STILL launderable, and this was proven with a
  // reproduction rather than reasoned about: in a file baselined at
  // `analytics_events|select|none = 3`, adding `.eq("user_id", …)` to one query
  // AND introducing a brand-new fully-unscoped `.select("*")` leaves the count
  // at 3. `n > allowed` is false, exit 0, and a query returning every user's
  // rows never surfaces. Fixing one finding silently buys a slot for the next.
  //
  // So a SHORTFALL is now a failure too. If a key comes in under its baseline,
  // the debt was paid down and the baseline is stale — regenerate it, which
  // re-freezes the real remaining set and closes the slot. Noisy by design:
  // the alternative is a gate that quietly rewards leaving debt in place.
  const blocking = [];
  const stale = [];
  for (const [k, n] of seen) {
    const allowed = baseline[k] || 0;
    if (n > allowed) {
      const f = candidate.find((c) => key(c) === k);
      for (let i = 0; i < n - allowed; i++) blocking.push(f);
    } else if (n < allowed) {
      stale.push(`${k}: baseline ${allowed}, now ${n}`);
    }
  }
  for (const k of Object.keys(baseline)) {
    if (!seen.has(k)) stale.push(`${k}: baseline ${baseline[k]}, now 0`);
  }
  const grandfathered = candidate.length - blocking.length;
  if (grandfathered > 0) {
    console.log(
      `\n${grandfathered} pre-existing finding(s) held in scripts/idor-baseline.json (frozen 2026-08-09).` +
        `\nThey do NOT pass review — they are tracked debt. The list may only shrink.`,
    );
  }
  if (blocking.length > 0) {
    console.log(
      `\n${blocking.length} queries are neither owner-scoped nor cleared.` +
        `\nAdd .eq("user_id", ...), or justify at the call site with` +
        `\n  // idor-audit: pk-owner-checked — <where the id was owner-resolved>` +
        `\n  // idor-audit: cross-user — <why this must span users>`,
    );
  }
  if (stale.length > 0) {
    console.log(
      `\n${stale.length} baseline key(s) are now BELOW their frozen count:` +
        `\n  ${stale.slice(0, 10).join("\n  ")}` +
        (stale.length > 10 ? `\n  ... +${stale.length - 10} more` : "") +
        `\n\nDebt was paid down — regenerate the baseline:` +
        `\n  node scripts/audit-service-role-idor.js --write-baseline` +
        `\nUntil then every freed slot silently accepts a NEW unscoped query` +
        `\nwith the same file|table|op|kind key. That is not hypothetical: it` +
        `\nwas reproduced on src/app/api/analytics/events/route.ts.`,
    );
  }
  process.exitCode = blocking.length > 0 || stale.length > 0 ? 1 : 0;
}

main();
