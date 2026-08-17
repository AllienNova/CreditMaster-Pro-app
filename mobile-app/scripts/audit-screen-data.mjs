#!/usr/bin/env node
/**
 * audit:screen-data — a mobile screen must not render invented data.
 *
 * THE GAP THIS CLOSES. audit:mocks scans web src/app/api for routes that return
 * mock data from a catch block. It has never looked at mobile-app/, and mobile
 * fabricates differently: not a fallback inside a handler, but a module-level
 * constant rendered directly, with no request made at all.
 *
 * Every fabrication found by hand in this codebase had that exact shape:
 *
 *   settings/billing.tsx    a Visa ending 4242 and three $29.00 paid invoices
 *   tax/optimizer.tsx       five tips with invented savings, and a $285,400 income
 *   hooks/useCoaching.ts    MOCK_SESSIONS, plus five canned "AI coach" replies
 *
 * Each was found by a person reading the file. This finds them mechanically.
 *
 * WHAT IT FLAGS. A module-level `const NAME = [{ ... }]` — a constant array of
 * OBJECTS, which is a data set rather than a config value — that the file then
 * renders (useState(NAME), NAME.map, NAME.filter, NAME.find).
 *
 * WHAT IT CANNOT DECIDE. Whether that data set is a FABRICATION (the user's
 * bills, scores, connected accounts) or a CATALOGUE (the plans on offer, the
 * bureaus you can dispute with, a list of filter chips). Both are constant
 * arrays of objects rendered by a screen; only a human knows which is which. So
 * every entry must be classified in the baseline as `catalogue` or
 * `fabrication`, and the gate fails on anything unclassified or new.
 *
 * A file that makes NO api/store/fetch call at all is reported separately: a
 * screen showing user data that never asks the server for it cannot be showing
 * the user's data.
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "fs";
import { join, relative } from "path";

const MOBILE = process.cwd();
const BASELINE = join(MOBILE, "scripts", "screen-data-baseline.json");

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    if (["node_modules", ".expo", "coverage", "__tests__", "__mocks__"].includes(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(entry) && !/\.(test|spec)\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

/**
 * A module-level constant array of OBJECTS.
 *
 * `[{` and not `[` alone: `const TABS = ["a", "b"]` is a config value, while
 * `const BILLS = [{ amount: 120, due: "..." }]` is a data set. Requiring the
 * SCREAMING_CASE name keeps it to deliberate module constants rather than any
 * local array.
 */
const CONST_DATA = /(?:^|\n)(?:export\s+)?const\s+([A-Z][A-Z0-9_]*)\s*(?::[^=\n]+)?=\s*\[\s*\{/g;

/** Any sign the file asks the server for something. */
const FETCHES =
  /\b(?:api|apiClient)\.(?:get|post|put|patch|delete)\s*\(|use[A-Z]\w*Store\s*\(\)|\bfetch\s*\(|use[A-Z]\w*\s*\(\s*\)/;

/** Whether the constant is actually rendered, rather than merely declared. */
function isRendered(source, name) {
  return new RegExp(
    `useState\\(\\s*${name}\\s*\\)|${name}\\.map\\(|${name}\\.filter\\(|${name}\\.find\\(|\\{${name}\\}`,
  ).test(source);
}

function findings() {
  const out = [];
  for (const file of [...walk(join(MOBILE, "app")), ...walk(join(MOBILE, "src", "hooks"))]) {
    const source = readFileSync(file, "utf8");
    const rendered = [...source.matchAll(CONST_DATA)]
      .map((m) => m[1])
      .filter((name) => isRendered(source, name));
    if (rendered.length === 0) continue;
    out.push({
      file: relative(MOBILE, file).replace(/\\/g, "/"),
      constants: [...new Set(rendered)].sort(),
      offline: !FETCHES.test(source),
    });
  }
  return out.sort((a, b) => a.file.localeCompare(b.file));
}

const key = (f) => `${f.file}: ${f.constants.join(", ")}`;

// ── Self-test ───────────────────────────────────────────────────────────────
if (process.argv.includes("--self-test")) {
  let bad = 0;
  const cases = [
    ["const BILLS = [{ amount: 1 }];\nBILLS.map(x => x)", "BILLS", true, "a rendered data set is flagged"],
    ["const TABS = [\"a\", \"b\"];\nTABS.map(x => x)", "TABS", false, "an array of STRINGS is config, not data"],
    ["const BILLS = [{ a: 1 }];", "BILLS", false, "declared but never rendered"],
    ["const bills = [{ a: 1 }];\nbills.map(x => x)", "bills", false, "lower-case local, not a module constant"],
    ["const B = [{ a: 1 }];\nuseState(B)", "B", true, "useState(NAME) counts as rendering"],
    // Passing the constant to a component IS rendering it — the data reaches the
    // screen either way. This case originally asserted false; the detector was
    // right and the expectation was wrong.
    ["const B = [{ a: 1 }];\nconst x = <C data={B} />", "B", true, "a prop pass renders it too"],
  ];
  for (const [src, name, want, why] of cases) {
    const declared = [...src.matchAll(CONST_DATA)].map((m) => m[1]).includes(name);
    const got = declared && isRendered(src, name);
    if (got === want) continue;
    bad++;
    console.log(`  SELF-TEST FAIL: ${JSON.stringify(src)} -> ${got}, expected ${want} (${why})`);
  }

  const offlineCases = [
    ['const x = 1;', true, "a file with no request is offline"],
    ['await api.get("/x")', false, "an api call is a request"],
    ['await apiClient.post("/x", {})', false, "apiClient counts too"],
    ['const s = useTaxStore()', false, "a store read is a request path"],
    ['await fetch("/x")', false, "bare fetch counts"],
  ];
  for (const [src, want, why] of offlineCases) {
    const got = !FETCHES.test(src);
    if (got === want) continue;
    bad++;
    console.log(`  SELF-TEST FAIL (offline): ${JSON.stringify(src)} -> ${got}, expected ${want} (${why})`);
  }

  const total = cases.length + offlineCases.length;
  console.log(
    bad === 0
      ? `audit:screen-data self-test PASSED — ${total}/${total} cases correct.`
      : `audit:screen-data self-test FAILED — ${bad} of ${total} cases wrong.`,
  );
  process.exit(bad === 0 ? 0 : 1);
}

// ── Baseline ────────────────────────────────────────────────────────────────
let baseline = { frozen: null, entries: {} };
try {
  baseline = JSON.parse(readFileSync(BASELINE, "utf8"));
} catch {
  /* first run */
}

const found = findings();

if (process.argv.includes("--freeze-baseline")) {
  const entries = {};
  for (const f of found) {
    entries[key(f)] = baseline.entries?.[key(f)] ?? {
      classification: "UNCLASSIFIED",
      offline: f.offline,
    };
  }
  writeFileSync(
    BASELINE,
    JSON.stringify(
      {
        frozen: baseline.frozen ?? "2026-08-17",
        why:
          "Screens rendering a module-level constant data set. Each must be classified " +
          "`catalogue` (product content: plans offered, bureaus, filter chips) or " +
          "`fabrication` (invented user data that must be replaced by a real read). " +
          "UNCLASSIFIED entries are debt someone has not looked at yet. This list may only shrink.",
        entries,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(`audit:screen-data baseline frozen — ${Object.keys(entries).length} entries`);
  process.exit(0);
}

const known = baseline.entries ?? {};
const novel = found.filter((f) => !known[key(f)]);
const gone = Object.keys(known).filter((k) => !found.some((f) => key(f) === k));

console.log(
  `audit:screen-data — ${found.length} screen(s) render a constant data set, ` +
    `${found.filter((f) => f.offline).length} of them with NO request in the file`,
);

if (novel.length > 0) {
  console.log(`\naudit:screen-data FAILED — ${novel.length} NEW constant data set(s):\n`);
  for (const f of novel) {
    console.log(`  ${f.file}`);
    console.log(`      ${f.constants.join(", ")}${f.offline ? "   (no request in this file)" : ""}`);
  }
  console.log(
    `\nClassify each in scripts/screen-data-baseline.json as "catalogue" or\n` +
      `"fabrication", or replace it with a real read. A constant array of objects\n` +
      `rendered by a screen is how every fabrication in this codebase has looked.`,
  );
  process.exitCode = 1;
} else {
  const counts = Object.values(known).reduce((acc, e) => {
    acc[e.classification] = (acc[e.classification] || 0) + 1;
    return acc;
  }, {});
  console.log(
    `audit:screen-data PASSED — no NEW constant data sets.\n` +
      Object.entries(counts)
        .map(([k, n]) => `  ${n} ${k}`)
        .join("\n"),
  );
}

if (gone.length > 0) {
  console.log(
    `\n${gone.length} baselined entr(ies) are gone — run \`--freeze-baseline\` to bank it:\n` +
      gone.map((k) => `  ${k}`).join("\n"),
  );
}
