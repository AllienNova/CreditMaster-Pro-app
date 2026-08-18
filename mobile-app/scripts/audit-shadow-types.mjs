#!/usr/bin/env node
/**
 * audit:shadow-types — a screen must not redefine a shared API type.
 *
 * WHY. Two fabrications survived this whole sweep by the same mechanism, and
 * neither could be caught by a typecheck:
 *
 *   financial/income        declared a local `IncomeSource` with `type` and
 *                           `taxWithheld` REQUIRED. The server sends neither.
 *                           An invented withholding therefore typechecked, and
 *                           an entire "Annual Tax Estimate" card was built on
 *                           it.
 *   financial/transactions  declared a local `Transaction` using `name` and
 *                           `account` where the server sends `merchantName`
 *                           and `accountId`. Nothing could compare the screen
 *                           to the route.
 *
 * A local interface that describes the FIXTURE rather than the WIRE makes a
 * fabrication permanent: the fixture satisfies it, the real payload does not,
 * and tsc is content either way because it never sees the route.
 *
 * WHAT IS FLAGGED. Only DIVERGENT shadows. Redeclaring a shared name with the
 * same fields is redundant but harmless; redeclaring it with different fields
 * is the defect. So the gate reports the specific field names that differ,
 * which is also what tells you which side is wrong.
 *
 * Shrink-only, like the other gates here: the existing set is recorded and may
 * only shrink, and anything NEW fails immediately.
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from "fs";
import { join, relative } from "path";

const MOBILE = process.cwd();
const SHARED_TYPES = join(MOBILE, "src", "services", "api", "types.ts");
const BASELINE = join(MOBILE, "scripts", "shadow-types-baseline.json");

/** `export interface Name { ...body... }` — brace-counted, not regex-bounded. */
function parseInterfaces(source) {
  const out = new Map();
  for (const m of source.matchAll(/export interface (\w+)\s*\{/g)) {
    const open = m.index + m[0].length - 1;
    let depth = 0;
    let i = open;
    for (; i < source.length; i++) {
      if (source[i] === "{") depth++;
      else if (source[i] === "}") {
        depth--;
        if (depth === 0) break;
      }
    }
    out.set(m[1], fieldNames(source.slice(open + 1, i)));
  }
  return out;
}

/** Local (non-exported) interfaces in a screen. */
function parseLocalInterfaces(source) {
  const out = new Map();
  for (const m of source.matchAll(/^interface (\w+)\s*\{/gm)) {
    const open = m.index + m[0].length - 1;
    let depth = 0;
    let i = open;
    for (; i < source.length; i++) {
      if (source[i] === "{") depth++;
      else if (source[i] === "}") {
        depth--;
        if (depth === 0) break;
      }
    }
    out.set(m[1], fieldNames(source.slice(open + 1, i)));
  }
  return out;
}

/**
 * Field names only — types are deliberately ignored.
 *
 * A screen narrowing `string` to a union is a judgement call. A screen reading
 * `name` where the server sends `merchantName` renders blank. Only the second
 * is what this gate is for, and comparing names keeps it from drowning in the
 * first.
 *
 * Nested objects are stripped first so their inner keys are not counted as
 * fields of the parent.
 */
function fieldNames(body) {
  let flat = body;
  // Remove nested braces innermost-first until none remain.
  let prev;
  do {
    prev = flat;
    flat = flat.replace(/\{[^{}]*\}/g, "");
  } while (flat !== prev);

  return new Set(
    [...flat.matchAll(/(?:^|\n)\s*(\w+)\s*\??\s*:/g)].map((m) => m[1]),
  );
}

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    if ([".expo", "node_modules"].includes(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx$/.test(entry) && !/\.(test|spec)\.tsx$/.test(entry))
      out.push(full);
  }
  return out;
}

const rel = (f) => relative(MOBILE, f).replace(/\\/g, "/");

/** The divergence between a shared type and a screen's redeclaration of it. */
function divergence(shared, local) {
  const missing = [...shared].filter((f) => !local.has(f));
  const extra = [...local].filter((f) => !shared.has(f));
  return { missing, extra };
}

// ── Self-test ───────────────────────────────────────────────────────────────
if (process.argv.includes("--self-test")) {
  let bad = 0;
  const check = (got, want, why) => {
    if (JSON.stringify(got) === JSON.stringify(want)) return;
    bad++;
    console.log(`  SELF-TEST FAIL: ${why}\n    got ${JSON.stringify(got)}`);
  };

  check(
    [...fieldNames("id: string;\n  name: string;\n  amount?: number;")],
    ["id", "name", "amount"],
    "optional and required fields both count",
  );
  check(
    [...fieldNames("id: string;\n  meta: { a: string; b: number };\n  n: number;")],
    ["id", "meta", "n"],
    "a nested object's inner keys are NOT fields of the parent",
  );
  check(
    [...fieldNames("a: { b: { c: string } };\n  d: string;")],
    ["a", "d"],
    "nesting strips innermost-first, however deep",
  );

  const shared = parseInterfaces(
    "export interface Transaction {\n  id: string;\n  merchantName: string;\n  accountId: string;\n}",
  );
  check([...shared.keys()], ["Transaction"], "shared interfaces are found");

  const local = parseLocalInterfaces(
    "interface Transaction {\n  id: string;\n  name: string;\n  account: string;\n}\nexport interface Other { x: string; }",
  );
  check(
    [...local.keys()],
    ["Transaction"],
    "only NON-exported interfaces count as a local shadow",
  );

  const d = divergence(shared.get("Transaction"), local.get("Transaction"));
  check(
    d,
    { missing: ["merchantName", "accountId"], extra: ["name", "account"] },
    "the real financial/transactions divergence is reported both ways",
  );

  const same = divergence(
    new Set(["id", "name"]),
    new Set(["id", "name"]),
  );
  check(
    same,
    { missing: [], extra: [] },
    "an IDENTICAL redeclaration is redundant, not a defect — no divergence",
  );

  console.log(
    bad === 0
      ? "audit:shadow-types self-test PASSED — 7/7 cases correct."
      : `audit:shadow-types self-test FAILED — ${bad} wrong.`,
  );
  process.exit(bad === 0 ? 0 : 1);
}

// ── Scan ────────────────────────────────────────────────────────────────────
const shared = parseInterfaces(readFileSync(SHARED_TYPES, "utf8"));
const offenders = [];

for (const file of walk(join(MOBILE, "app"))) {
  const source = readFileSync(file, "utf8");
  for (const [name, fields] of parseLocalInterfaces(source)) {
    if (!shared.has(name)) continue;
    const { missing, extra } = divergence(shared.get(name), fields);
    if (missing.length === 0 && extra.length === 0) continue;
    offenders.push({ file: rel(file), name, missing, extra });
  }
}

const key = (o) => `${o.file}: ${o.name}`;

let baselined = new Set();
try {
  baselined = new Set(JSON.parse(readFileSync(BASELINE, "utf8")).entries || []);
} catch {
  /* first run */
}

if (process.argv.includes("--freeze-baseline")) {
  writeFileSync(
    BASELINE,
    JSON.stringify(
      {
        frozen: "2026-08-18",
        why:
          "Screens that redeclare a shared API type with DIFFERENT fields. " +
          "This is how two fabrications survived a typecheck: a local type " +
          "that describes the fixture rather than the wire is satisfied by " +
          "the fixture and never compared to the route. Shrink-only; " +
          "anything new fails.",
        entries: offenders.map(key).sort(),
      },
      null,
      2,
    ) + "\n",
  );
  console.log(`audit:shadow-types baseline frozen — ${offenders.length} entr(ies)`);
  process.exit(0);
}

const novel = offenders.filter((o) => !baselined.has(key(o)));
const fixed = [...baselined].filter((b) => !offenders.some((o) => key(o) === b));

console.log(
  `audit:shadow-types — ${shared.size} shared API type(s), ` +
    `${offenders.length} divergent shadow(s)`,
);

if (novel.length === 0) {
  console.log(
    "audit:shadow-types PASSED — no NEW screen redefines a shared API type." +
      (offenders.length
        ? `\n${offenders.length} remain baselined. Each is a screen whose local` +
          `\ntype cannot be checked against the route it renders.`
        : ""),
  );
  if (fixed.length) {
    console.log(
      `\n${fixed.length} baselined entr(ies) are gone — run \`--freeze-baseline\`:\n` +
        fixed.map((f) => `  ${f}`).join("\n"),
    );
  }
  process.exit(0);
}

console.log(
  `\naudit:shadow-types FAILED — ${novel.length} NEW divergent shadow(s):\n`,
);
for (const o of novel) {
  console.log(`  ${o.file}: ${o.name}`);
  if (o.missing.length) console.log(`      server has, screen lacks: ${o.missing.join(", ")}`);
  if (o.extra.length) console.log(`      screen has, server lacks:  ${o.extra.join(", ")}`);
}
console.log(
  `\nImport the shared type instead, or map the server's shape explicitly.` +
    `\nA local type that the fixture satisfies and the payload does not is how` +
    `\nfinancial/income kept an invented tax bill through a green typecheck.`,
);
process.exit(1);
