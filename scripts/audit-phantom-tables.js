#!/usr/bin/env node
/**
 * Phantom-table audit — which tables does the code query that the schema
 * does not define?
 *
 * A `.from("widgets")` against a table no migration creates does not throw at
 * build time, does not fail typecheck (the clients here are deliberately
 * untyped — see src/lib/supabase/client.ts), and does not fail a unit test,
 * because every test mocks the Supabase client. It fails at RUNTIME, as a
 * PostgREST 42P01, on the user's first request. That is the entire reason this
 * script exists: it is the only mechanical check that can see the gap.
 *
 * Ground truth for "the table exists" is the migration set replayed by
 * schema-from-migrations.js, NOT a live database. A live DB can drift ahead of
 * the migrations (someone ran DDL by hand) or behind (migrations not applied),
 * and either way the deployable artifact is the migration set. That derived
 * schema was validated column-for-column against a freshly reset local
 * Supabase: 200 derived tables vs 208 live, the 8-table difference being views,
 * with ZERO column differences.
 *
 * Known limits, stated rather than implied:
 *  - Only literal string arguments are resolved. `.from(tableName)` with a
 *    variable is reported separately as UNRESOLVED, not silently dropped.
 *  - Views are not in the derived schema, so a legitimate `.from("some_view")`
 *    shows as phantom. The VIEWS set below carries the ones confirmed to exist.
 */

const { readFileSync, readdirSync, statSync } = require("fs");
const { join, relative } = require("path");
const { buildSchema } = require("./schema-from-migrations.js");

const ROOT = join(__dirname, "..");
const SCAN_DIRS = ["src", "mobile-app"];
const CODE_EXT = /\.(ts|tsx)$/;
// ios.bak/Pods contains dangling symlinks (CocoaPods header shims pointing at
// pods that were never installed), so statSync throws ENOENT there. Skipped by
// path, and lstat is used below so a dangling link anywhere else is a no-op
// rather than a crash.
const SKIP_DIR =
  /node_modules|\.next|dist|build|coverage|\.expo|ios\.bak|[/\\]Pods[/\\]/;

// Views exist in Postgres but are not CREATE TABLE, so the derived schema has
// no row for them. Confirmed present in a reset local Supabase.
const VIEWS = new Set([]);

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const e of entries) {
    const p = join(dir, e);
    if (SKIP_DIR.test(p)) continue;
    let st;
    try {
      st = statSync(p);
    } catch {
      continue; // dangling symlink
    }
    if (st.isDirectory()) walk(p, out);
    else if (CODE_EXT.test(p)) out.push(p);
  }
  return out;
}

function main() {
  const schema = buildSchema();
  const known = new Set(schema.keys());
  for (const v of VIEWS) known.add(v);

  const files = SCAN_DIRS.flatMap((d) => walk(join(ROOT, d)));

  const refs = new Map(); // table -> Set<file:line>
  const unresolved = []; // .from(variable)

  // Matched against the WHOLE FILE, not line by line. The dominant call shape
  // here puts the receiver and `.from()` on different lines:
  //
  //     const { data } = await supabase
  //       .from("affiliate_clicks")
  //
  // A line-scoped regex that requires a receiver sees only `.from("...")` and
  // drops every one of those. That mistake was made and measured: it took the
  // distinct-table count from 233 to 95 and hid 44 phantoms. `\s*` across the
  // newline is what makes the receiver visible.
  //
  // The receiver must start lowercase. `Array.from`, `Buffer.from`,
  // `Uint8Array.from` are not queries, and every JS builtin exposing a static
  // `.from` is capitalised while every Supabase client identifier in this repo
  // is not (`supabase`, `supabaseAdmin`, `client`, `db`). Without that guard
  // the audit reported `Buffer.from("data")` as a phantom table named `data`.
  // Matching on the RECEIVER was tried and abandoned. Receivers here take at
  // least four shapes — a plain identifier, a member chain, a factory call
  // (`getServiceRoleClient().from(...)`), and a parenthesised cast
  // (`(supabaseAdmin as any).from(...)`) — and every pattern that covered three
  // of them silently dropped the fourth. Each omission was invisible: the audit
  // just reported a smaller, cleaner-looking number.
  //
  // So the rule is inverted. Match `.from("literal")` wherever it appears and
  // subtract the one thing it could otherwise be: a JS builtin's static `from`.
  // That set is closed and short, which makes the exclusion auditable in a way
  // "did my receiver regex cover every call shape?" never was.
  const BUILTIN =
    "Array|Buffer|Object|Set|Map|String|Uint8Array|Int8Array|Uint8ClampedArray|" +
    "Uint16Array|Int16Array|Uint32Array|Int32Array|Float32Array|Float64Array|" +
    "BigInt64Array|BigUint64Array";
  const LITERAL = new RegExp(
    `(?<!\\b(?:${BUILTIN}))\\.from\\(\\s*(["'\`])([a-zA-Z][a-zA-Z0-9_]*)\\1`,
    "g",
  );
  const VARIABLE = new RegExp(
    `(?<!\\b(?:${BUILTIN}))\\.from\\(\\s*([a-z_$][\\w$.]*)\\s*\\)`,
    "g",
  );

  // Comments are blanked rather than deleted so byte offsets — and therefore
  // reported line numbers — stay aligned with the original file.
  const blank = (s) => s.replace(/[^\n]/g, " ");

  for (const file of files) {
    const raw = readFileSync(file, "utf8");
    const text = raw
      .replace(/\/\*[\s\S]*?\*\//g, blank)
      .replace(/\/\/[^\n]*/g, blank);
    const lineAt = (idx) => text.slice(0, idx).split("\n").length;

    for (const m of text.matchAll(LITERAL)) {
      const t = m[2];
      if (!refs.has(t)) refs.set(t, new Set());
      refs.get(t).add(`${relative(ROOT, file)}:${lineAt(m.index)}`);
    }
    for (const m of text.matchAll(VARIABLE)) {
      unresolved.push(
        `${relative(ROOT, file)}:${lineAt(m.index)} -> .from(${m[1]})`,
      );
    }
  }

  const phantom = [...refs.keys()].filter((t) => !known.has(t)).sort();

  console.log(`Schema tables (from migrations): ${known.size}`);
  console.log(`Distinct tables referenced in code: ${refs.size}`);
  console.log(`PHANTOM (queried, never created): ${phantom.length}\n`);

  for (const t of phantom) {
    const sites = [...refs.get(t)];
    console.log(`  ${t}  (${sites.length} site${sites.length > 1 ? "s" : ""})`);
    for (const s of sites.slice(0, 4)) console.log(`      ${s}`);
    if (sites.length > 4) console.log(`      ... +${sites.length - 4} more`);
  }

  if (unresolved.length) {
    console.log(`\nUNRESOLVED .from(<variable>): ${unresolved.length}`);
    for (const u of unresolved.slice(0, 15)) console.log(`  ${u}`);
    if (unresolved.length > 15) {
      console.log(`  ... +${unresolved.length - 15} more`);
    }
  }

  // Exit non-zero when phantoms exist so this can be wired as a gate once the
  // backlog is closed. Until then it is informational — see remediation-plan.md.
  process.exit(phantom.length ? 1 : 0);
}

if (require.main === module) main();
