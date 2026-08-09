#!/usr/bin/env node
/**
 * Phantom-column audit: find `.select()` / `.insert()` / `.update()` calls that
 * name columns which do not exist on the table being queried.
 *
 * WHY. Wave 7 has been counting phantom TABLES (referenced, never migrated).
 * The column axis went unmeasured for most of the effort, and it has since
 * produced at least four confirmed live defects on tables that DO exist:
 *
 *   budgets              budgeted_amount / spent_amount / period_start /
 *                        period_end / name   (real: amount, spent, start_date,
 *                        end_date, and no name column at all)
 *   strategy_lifecycle   current_stage / entered_stage_at
 *                        (real: stage, dwell_start)
 *   bills                name / payee / due_day / is_active
 *                        (real: merchant_name, category, frequency, status,
 *                        is_auto_pay)
 *   investment_holdings  shares / costBasis / assetClass
 *                        (real: quantity, average_cost, asset_type)
 *
 * This class is nastier than a phantom table. A missing table at least fails
 * the same way every time; a missing column can silently no-op a write
 * (PGRST204), or read as `undefined` and then hit a `|| "stock"` fallback that
 * turns the defect into confidently wrong data with no error anywhere. Unit
 * tests do not catch it either: the fixtures mock the fictional column names,
 * so the suite passes against data the database could never return.
 *
 * HONEST LIMITS — this is a heuristic, and its output is a FLOOR, not a census:
 *   - regex over source text, not an AST walk. A chain split oddly across
 *     lines, or a table name held in a variable, is invisible to it.
 *   - only string-literal table names and object-literal keys. Spreads
 *     (`...payload`) and computed keys are skipped, not resolved.
 *   - `.select("*")` is unresolvable by definition; the defect there lives in
 *     whatever reads `row.field` afterwards, which this does not attempt.
 *   - embedded PostgREST selects (`table!inner(col)`) are stripped, not followed.
 * Treat a clean run as "no easily-detectable mismatches", never as proof.
 *
 * Usage:
 *   psql -At -c "select table_name||':'||string_agg(column_name,',' order by column_name)
 *                from information_schema.columns where table_schema='public'
 *                group by table_name" > /tmp/schema.txt
 *   node scripts/audit-phantom-columns.js /tmp/schema.txt
 *
 * Reading the schema from a file rather than shelling out keeps this script
 * free of any subprocess execution.
 */

const { readFileSync, readdirSync, statSync } = require("fs");
const { join, relative } = require("path");

const ROOT = process.cwd();
const SRC = join(ROOT, "src");

/** table -> Set(column), parsed from `table:col1,col2,...` lines. */
function loadSchema(path) {
  const schema = new Map();
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    schema.set(line.slice(0, idx).trim(), new Set(line.slice(idx + 1).split(",")));
  }
  return schema;
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
 * PostgREST aggregate/meta selectors, which are not columns and must not be
 * looked up as such. `.select("count")` is the idiomatic row-count query and
 * appeared four times as a "phantom column" on four different real tables —
 * noise that teaches the reader to skim the report, which is how a genuine
 * hit gets missed.
 */
const AGGREGATE_SELECTORS = new Set([
  "count",
  "sum",
  "avg",
  "min",
  "max",
]);

/** Columns named by a .select("...") argument, minus embeds and aliases. */
function columnsFromSelect(arg) {
  return arg
    .replace(/[a-z_]+!\w*\([^)]*\)/gi, "") // strip embedded resource selects
    .split(",")
    .map((c) => c.trim().split(":").pop().trim()) // alias:col -> col
    .filter(
      (c) =>
        c &&
        c !== "*" &&
        !AGGREGATE_SELECTORS.has(c) &&
        /^[a-z_][a-z0-9_]*$/.test(c),
    );
}

/** Top-level keys of an object literal, skipping spreads and computed keys. */
function keysFromObjectLiteral(body) {
  const keys = [];
  let depth = 0;
  let atTopLevelStart = true;
  let buf = "";

  for (const ch of body) {
    if (ch === "{" || ch === "[" || ch === "(") depth++;
    else if (ch === "}" || ch === "]" || ch === ")") depth--;

    if (depth === 0 && ch === ",") {
      atTopLevelStart = true;
      buf = "";
      continue;
    }
    if (depth === 0 && ch === ":" && atTopLevelStart) {
      const m = buf.trim().match(/^["']?([a-z_][a-z0-9_]*)["']?$/);
      if (m) keys.push(m[1]);
      atTopLevelStart = false;
      buf = "";
      continue;
    }
    buf += ch;
  }
  return keys;
}

/** Balanced-brace slice starting at the first `{` at or shortly after `from`. */
function objectLiteralAt(text, from) {
  const start = text.indexOf("{", from);
  if (start === -1 || start - from > 40) return null;
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}") {
      depth--;
      if (depth === 0) return text.slice(start + 1, i);
    }
  }
  return null;
}

const WINDOW = 400; // max chars after .from() in which a chained call counts

function auditFile(file, schema, findings) {
  const text = readFileSync(file, "utf8");
  const rel = relative(ROOT, file);

  const fromRe = /\.from\(\s*["'`]([a-z0-9_]+)["'`]\s*\)/g;
  let m;
  while ((m = fromRe.exec(text)) !== null) {
    const table = m[1];
    const cols = schema.get(table);
    if (!cols) continue; // phantom TABLE — a different audit covers that axis

    // Stop the window at the NEXT .from(), not just at a fixed character count.
    // Without this the scan attributes a later query's columns to this table:
    // it reported `action`/`details` against user_settings in
    // api/email/unsubscribe/route.ts when both belong to an audit_logs insert
    // ~10 lines further down. A false positive costs triage time and erodes
    // trust in the whole report, so the window is bounded by structure first
    // and length second.
    const nextFrom = text.slice(m.index + 1).search(/\.from\(\s*["'`][a-z0-9_]+["'`]\s*\)/);
    const limit =
      nextFrom === -1 ? WINDOW : Math.min(WINDOW, nextFrom + 1);
    const tail = text.slice(m.index, m.index + limit);
    const line = text.slice(0, m.index).split("\n").length;

    const sel = tail.match(/\.select\(\s*["'`]([^"'`]+)["'`]/);
    if (sel) {
      for (const c of columnsFromSelect(sel[1])) {
        if (!cols.has(c)) findings.push({ file: rel, line, table, column: c, op: "select" });
      }
    }

    for (const op of ["insert", "update", "upsert"]) {
      const call = tail.indexOf(`.${op}(`);
      if (call === -1) continue;
      const body = objectLiteralAt(tail, call + op.length + 2);
      if (!body) continue;
      for (const k of keysFromObjectLiteral(body)) {
        if (!cols.has(k)) findings.push({ file: rel, line, table, column: k, op });
      }
    }
  }
}

function main() {
  const schemaPath = process.argv[2];
  if (!schemaPath) {
    console.error("usage: node scripts/audit-phantom-columns.js <schema-dump>");
    process.exit(2);
  }

  const schema = loadSchema(schemaPath);
  if (schema.size === 0) {
    console.error(`No tables parsed from ${schemaPath}`);
    process.exit(2);
  }

  const findings = [];
  for (const f of walk(SRC)) auditFile(f, schema, findings);

  const byTable = new Map();
  for (const f of findings) {
    if (!byTable.has(f.table)) byTable.set(f.table, []);
    byTable.get(f.table).push(f);
  }

  console.log(`schema tables loaded : ${schema.size}`);
  console.log(`phantom-column hits  : ${findings.length}`);
  console.log(`tables affected      : ${byTable.size}\n`);

  for (const [table, hits] of [...byTable.entries()].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`${table}  (${hits.length})`);
    const seen = new Set();
    for (const h of hits) {
      const key = `${h.column}|${h.op}|${h.file}:${h.line}`;
      if (seen.has(key)) continue;
      seen.add(key);
      console.log(`    ${h.op.padEnd(6)} ${h.column.padEnd(28)} ${h.file}:${h.line}`);
    }
  }

  process.exitCode = findings.length > 0 ? 1 : 0;
}

main();
