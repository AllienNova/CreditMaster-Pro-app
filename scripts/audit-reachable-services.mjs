#!/usr/bin/env node
/**
 * audit:reachable-services — find database-backed services that no route can
 * reach.
 *
 * WHY THIS EXISTS. Two fabrications fixed on 2026-08-18 turned out not to be
 * unwired screens but UNEXPOSED FEATURES. `crypto_wallets` (migration …082)
 * and `real_estate_tracking` (migration …081) both landed with a working
 * service — 33 and 27 database calls, no randomness — and no API route. The
 * screens that should have shown them had nothing to call, so they rendered a
 * $45,230 Coinbase wallet and a property portfolio to every visitor.
 *
 * Nothing in CI asserted that a service is reachable, so a feature could land
 * complete and stay dark. This is that check.
 *
 * WHY A GRAPH RATHER THAN A GREP. The first pass at this was "grep the
 * service's filename under src/app/api". It returned 44 candidates and could
 * not be trusted:
 *   - a route importing through a barrel (`from "@/lib/financial"`) never
 *     mentions the service filename, so working code looked orphaned;
 *   - a service reached only by ANOTHER service that is itself routed is not
 *     an orphan, and a filename grep cannot see that chain.
 * So this walks the import graph outward from the entry points. Barrels and
 * service-to-service chains fall out for free.
 *
 * WHAT IT CANNOT SEE, stated rather than hidden:
 *   - dynamic import() with a computed specifier;
 *   - a module reached only through a string-keyed registry;
 *   - anything imported by a script, cron job or worker outside src/app.
 * A service flagged here is a CANDIDATE for review, not proof of dead code.
 * Exposing one means adding a route; deleting one needs a named owner.
 *
 * IT ASKS ABOUT USE, NOT LOADING — and the distinction is load-bearing.
 * At runtime a barrel doing `export * from "./heavy"` really does load
 * ./heavy, so MODULE-level reachability is correct about loading. But the
 * question here is whether a FEATURE is exposed, and a service whose module is
 * loaded while none of its functions are ever imported is exactly the stranded
 * case worth finding. So a named import follows only the symbols it names,
 * resolved through barrel re-exports to the file that defines them.
 *
 * The first version of this audit was module-level and it cost a real
 * discovery: /goals/shared kept its fabricated "Dream Home Down Payment" for
 * hours after this gate existed, because routes import `@/lib/gamification`
 * for two OTHER services and the barrel re-exports shared-goals as well.
 * Switching to symbol-level took the count from 33 to 36 and surfaced
 * affiliate-service (38 db calls), pctt-trading-service and
 * trailing-stop-service — each hand-verified as having no symbol referenced
 * anywhere under src/app.
 *
 * `import * as ns`, default imports and side-effect imports still traverse the
 * whole module, because they genuinely can reach anything in it. That keeps
 * the error running one way: the audit would rather miss a stranded service
 * than accuse a working one, since a false "unreachable" fails CI for code
 * that is fine.
 *
 * Usage:
 *   node scripts/audit-reachable-services.mjs --self-test
 *   node scripts/audit-reachable-services.mjs [--baseline <file>] [--freeze-baseline]
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = process.cwd();
const SRC = path.join(ROOT, "src");
const API_ROOT = path.join(SRC, "app", "api");
const APP_ROOT = path.join(SRC, "app");

/** A service must touch the database this many times to be worth reporting. */
const MIN_DB_CALLS = 3;

const EXTENSIONS = [".ts", ".tsx", ".js", ".jsx"];

// ---------------------------------------------------------------------------
// File walking
// ---------------------------------------------------------------------------

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "__tests__") continue;
      walk(full, out);
    } else if (EXTENSIONS.includes(path.extname(entry.name))) {
      if (/\.(test|spec)\.[jt]sx?$/.test(entry.name)) continue;
      out.push(full);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Import extraction and resolution
// ---------------------------------------------------------------------------

/**
 * Every module specifier a file references.
 *
 * Covers static imports, `export ... from`, bare side-effect imports, and
 * dynamic import() with a literal specifier. A computed dynamic import cannot
 * be resolved statically and is one of this tool's stated blind spots.
 */
export function extractSpecifiers(source) {
  const specifiers = new Set();
  const patterns = [
    /\bimport\s+[^"';]*?\bfrom\s*["']([^"']+)["']/g,
    /\bexport\s+[^"';]*?\bfrom\s*["']([^"']+)["']/g,
    /\bimport\s*["']([^"']+)["']/g,
    /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
  ];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) specifiers.add(match[1]);
  }
  return [...specifiers];
}

/** Resolve a specifier to a file on disk, or null when it is external. */
export function resolveSpecifier(specifier, fromFile, { srcDir = SRC } = {}) {
  let base;
  if (specifier.startsWith("@/")) {
    base = path.join(srcDir, specifier.slice(2));
  } else if (specifier.startsWith(".")) {
    base = path.resolve(path.dirname(fromFile), specifier);
  } else {
    return null; // a package, not our code
  }

  const candidates = [
    base,
    ...EXTENSIONS.map((ext) => base + ext),
    ...EXTENSIONS.map((ext) => path.join(base, "index" + ext)),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }
  return null;
}

/**
 * Every file reachable from the given entry points by following imports.
 *
 * This is what makes barrels and service-to-service chains work: reaching
 * `src/lib/financial/index.ts` reaches everything it re-exports, and reaching
 * a routed service reaches whatever that service imports.
 */
export function reachableFrom(entryFiles, { srcDir = SRC, readFile } = {}) {
  const read = readFile ?? ((f) => fs.readFileSync(f, "utf8"));
  const seen = new Set();
  const queue = [...entryFiles];
  while (queue.length > 0) {
    const file = queue.pop();
    if (seen.has(file)) continue;
    seen.add(file);
    let source;
    try {
      source = read(file);
    } catch {
      continue;
    }
    for (const specifier of extractSpecifiers(source)) {
      const resolved = resolveSpecifier(specifier, file, { srcDir });
      if (resolved && !seen.has(resolved)) queue.push(resolved);
    }
  }
  return seen;
}

// ---------------------------------------------------------------------------
// Symbol-level resolution
// ---------------------------------------------------------------------------

/**
 * The imports a file makes, split by whether they name specific symbols.
 *
 * `import { a, b } from "m"` and `export { a } from "m"` name symbols, so the
 * importer uses only those. `import * as ns`, a default import and a bare
 * side-effect import can reach anything in the module, so they are treated as
 * whole-module and traversed conservatively.
 */
export function extractImports(source) {
  const named = new Map(); // specifier -> Set(symbol)
  const whole = new Set();

  const addNamed = (specifier, clause) => {
    const set = named.get(specifier) ?? new Set();
    for (const part of clause.split(",")) {
      // `foo as bar` — the DEFINING module knows it as `foo`.
      const symbol = part.trim().split(/\s+as\s+/)[0].replace(/^type\s+/, "").trim();
      if (symbol && symbol !== "*") set.add(symbol);
    }
    named.set(specifier, set);
  };

  for (const m of source.matchAll(
    /\b(?:import|export)\s+(?:type\s+)?\{([^}]*)\}\s*from\s*["']([^"']+)["']/g,
  )) {
    addNamed(m[2], m[1]);
  }
  // import * as ns / default import / export * / side-effect / dynamic
  for (const m of source.matchAll(
    /\bimport\s+(?:\*\s*as\s+\w+|\w+)\s*(?:,\s*\{[^}]*\}\s*)?from\s*["']([^"']+)["']/g,
  )) {
    whole.add(m[1]);
  }
  for (const m of source.matchAll(/\bexport\s*\*\s*from\s*["']([^"']+)["']/g)) {
    whole.add(m[1]);
  }
  for (const m of source.matchAll(/\bimport\s*["']([^"']+)["']/g)) {
    whole.add(m[1]);
  }
  for (const m of source.matchAll(/\bimport\s*\(\s*["']([^"']+)["']\s*\)/g)) {
    whole.add(m[1]);
  }
  return { named, whole };
}

/**
 * Where each of a module's exported symbols is actually defined.
 *
 * Follows `export { a } from "./x"` and `export * from "./x"` so that a symbol
 * pulled from a barrel resolves to the file that really implements it. Cycles
 * are guarded with a visiting set; a barrel importing itself would otherwise
 * spin.
 */
export function buildExportMap(file, { srcDir = SRC, read, cache, visiting } = {}) {
  const readFile = read ?? ((f) => fs.readFileSync(f, "utf8"));
  const memo = cache ?? new Map();
  const active = visiting ?? new Set();
  if (memo.has(file)) return memo.get(file);
  if (active.has(file)) return new Map(); // cycle
  active.add(file);

  const map = new Map();
  let source = "";
  try {
    source = readFile(file);
  } catch {
    memo.set(file, map);
    active.delete(file);
    return map;
  }

  // Locally defined exports.
  for (const m of source.matchAll(
    /\bexport\s+(?:async\s+)?(?:const|let|var|function|class|interface|type|enum)\s+(\w+)/g,
  )) {
    map.set(m[1], file);
  }
  // `export { a, b }` with no `from` — defined here.
  for (const m of source.matchAll(/\bexport\s*\{([^}]*)\}\s*(?!from)/g)) {
    for (const part of m[1].split(",")) {
      const symbol = part.trim().split(/\s+as\s+/).pop()?.trim();
      if (symbol) map.set(symbol, file);
    }
  }
  // `export { a } from "./x"` — a lives in ./x (or wherever ./x got it).
  for (const m of source.matchAll(
    /\bexport\s+(?:type\s+)?\{([^}]*)\}\s*from\s*["']([^"']+)["']/g,
  )) {
    const target = resolveSpecifier(m[2], file, { srcDir });
    if (!target) continue;
    const inner = buildExportMap(target, { srcDir, read: readFile, cache: memo, visiting: active });
    for (const part of m[1].split(",")) {
      const original = part.trim().split(/\s+as\s+/)[0].replace(/^type\s+/, "").trim();
      const exposed = part.trim().split(/\s+as\s+/).pop()?.trim() ?? original;
      if (original) map.set(exposed, inner.get(original) ?? target);
    }
  }
  // `export * from "./x"` — everything ./x exports, at ./x's own definitions.
  for (const m of source.matchAll(/\bexport\s*\*\s*from\s*["']([^"']+)["']/g)) {
    const target = resolveSpecifier(m[1], file, { srcDir });
    if (!target) continue;
    const inner = buildExportMap(target, { srcDir, read: readFile, cache: memo, visiting: active });
    for (const [symbol, definedIn] of inner) {
      if (!map.has(symbol)) map.set(symbol, definedIn);
    }
  }

  active.delete(file);
  memo.set(file, map);
  return map;
}

/**
 * Modules whose code is actually USED from the given entry points.
 *
 * This is deliberately a different question from `reachableFrom`. At runtime a
 * barrel doing `export * from "./heavy"` really does load ./heavy, so
 * module-level reachability is correct about LOADING. But the question this
 * audit asks is whether a feature is exposed, and a service whose module is
 * loaded but whose functions are never imported is exactly the stranded case
 * we are hunting. So: named imports follow only the symbols they name.
 *
 * `import * as ns`, default imports and side-effect imports still traverse the
 * whole module, because they genuinely can reach anything in it.
 */
export function usedFrom(entryFiles, { srcDir = SRC, readFile } = {}) {
  const read = readFile ?? ((f) => fs.readFileSync(f, "utf8"));
  const exportCache = new Map();
  const used = new Set();
  const queue = [...entryFiles];

  while (queue.length > 0) {
    const file = queue.pop();
    if (used.has(file)) continue;
    used.add(file);

    let source;
    try {
      source = read(file);
    } catch {
      continue;
    }

    const { named, whole } = extractImports(source);

    for (const [specifier, symbols] of named) {
      const target = resolveSpecifier(specifier, file, { srcDir });
      if (!target) continue;
      const exports = buildExportMap(target, {
        srcDir,
        read,
        cache: exportCache,
      });
      for (const symbol of symbols) {
        const definedIn = exports.get(symbol) ?? target;
        if (!used.has(definedIn)) queue.push(definedIn);
      }
    }

    for (const specifier of whole) {
      const target = resolveSpecifier(specifier, file, { srcDir });
      if (target && !used.has(target)) queue.push(target);
    }
  }
  return used;
}

/** How many times a module talks to the database. */
export function countDbCalls(source) {
  return (source.match(/supabase|\.from\(/g) ?? []).length;
}

// ---------------------------------------------------------------------------
// Self-test
// ---------------------------------------------------------------------------

function selfTest() {
  const cases = [];
  const check = (name, actual, expected) => {
    cases.push({
      name,
      ok: JSON.stringify(actual) === JSON.stringify(expected),
      actual,
      expected,
    });
  };

  check("static import", extractSpecifiers(`import { a } from "@/lib/x";`), [
    "@/lib/x",
  ]);
  check(
    "multi-line import",
    extractSpecifiers(`import {\n  a,\n  b,\n} from "@/lib/y";`),
    ["@/lib/y"],
  );
  check("type-only import", extractSpecifiers(`import type { A } from "@/lib/t";`), [
    "@/lib/t",
  ]);
  check("barrel re-export", extractSpecifiers(`export { a } from "./svc";`), [
    "./svc",
  ]);
  check("star re-export", extractSpecifiers(`export * from "./svc";`), ["./svc"]);
  check("side-effect import", extractSpecifiers(`import "./polyfill";`), [
    "./polyfill",
  ]);
  check(
    "dynamic import with a literal",
    extractSpecifiers(`const m = await import("@/lib/lazy");`),
    ["@/lib/lazy"],
  );
  check("external package", extractSpecifiers(`import x from "react";`), ["react"]);
  check("no imports", extractSpecifiers(`const a = 1;`), []);
  check(
    "db call counting",
    countDbCalls(`supabase.from("a"); supabase.from("b");`),
    4, // two `supabase` + two `.from(`
  );
  check("db call counting, none", countDbCalls(`const a = 1;`), 0);

  /*
   * Graph traversal, on an in-memory file system. This is the case that
   * matters, and the one a filename grep gets wrong twice: a route importing a
   * BARREL must reach the service the barrel re-exports, and a service
   * imported only by another reachable service must be reached too.
   */
  const files = {
    "/src/app/api/thing/route.ts": `import { getThing } from "@/lib/things";`,
    "/src/lib/things/index.ts": `export * from "./thing-service";`,
    "/src/lib/things/thing-service.ts": `import { helper } from "./helper-service";`,
    "/src/lib/things/helper-service.ts": `const x = 1;`,
    "/src/lib/things/orphan-service.ts": `const y = 2;`,
  };
  const fakeExists = (p) => Object.prototype.hasOwnProperty.call(files, p);
  const originalExists = fs.existsSync;
  const originalStat = fs.statSync;
  fs.existsSync = (p) => fakeExists(p) || originalExists(p);
  fs.statSync = (p) => (fakeExists(p) ? { isFile: () => true } : originalStat(p));
  try {
    const reached = reachableFrom(["/src/app/api/thing/route.ts"], {
      srcDir: "/src",
      readFile: (f) => files[f] ?? "",
    });
    check(
      "barrel re-export is reachable",
      reached.has("/src/lib/things/thing-service.ts"),
      true,
    );
    check(
      "service-to-service chain is reachable",
      reached.has("/src/lib/things/helper-service.ts"),
      true,
    );
    check(
      "genuine orphan is NOT reachable",
      reached.has("/src/lib/things/orphan-service.ts"),
      false,
    );
  } finally {
    fs.existsSync = originalExists;
    fs.statSync = originalStat;
  }

  /*
   * SYMBOL-LEVEL resolution. This is the case the module-level version got
   * wrong, and it cost a real discovery: /goals/shared kept its fabricated
   * data for hours after the gate existed, because routes import the
   * gamification barrel for TWO services and the barrel re-exports four.
   */
  const barrelFiles = {
    "/src/app/api/quests/route.ts": `import { getAchievementService } from "@/lib/gamification";`,
    "/src/lib/gamification/index.ts": `
      export { getAchievementService } from "./achievement-service";
      export { getSharedGoalsService } from "./shared-goals-service";
      export * from "./journey-service";
    `,
    "/src/lib/gamification/achievement-service.ts": `export function getAchievementService() {}`,
    "/src/lib/gamification/shared-goals-service.ts": `export function getSharedGoalsService() {}`,
    "/src/lib/gamification/journey-service.ts": `export function getJourneyService() {}`,
  };
  const hasBarrel = (p) =>
    Object.prototype.hasOwnProperty.call(barrelFiles, p);
  const realExists = fs.existsSync;
  const realStat = fs.statSync;
  fs.existsSync = (p) => hasBarrel(p) || realExists(p);
  fs.statSync = (p) => (hasBarrel(p) ? { isFile: () => true } : realStat(p));
  try {
    const opts = {
      srcDir: "/src",
      readFile: (f) => barrelFiles[f] ?? "",
    };
    const used = usedFrom(["/src/app/api/quests/route.ts"], opts);
    check(
      "named barrel import reaches the service it names",
      used.has("/src/lib/gamification/achievement-service.ts"),
      true,
    );
    check(
      "named barrel import does NOT reach a sibling it never names",
      used.has("/src/lib/gamification/shared-goals-service.ts"),
      false,
    );
    check(
      "nor one the barrel exports with a star",
      used.has("/src/lib/gamification/journey-service.ts"),
      false,
    );

    // The old behaviour, kept for comparison, must still say everything.
    const loaded = reachableFrom(["/src/app/api/quests/route.ts"], opts);
    check(
      "module-level still reports the sibling as loaded",
      loaded.has("/src/lib/gamification/shared-goals-service.ts"),
      true,
    );

    const exports = buildExportMap("/src/lib/gamification/index.ts", {
      srcDir: "/src",
      read: (f) => barrelFiles[f] ?? "",
    });
    check(
      "export-map resolves a re-exported symbol to its defining file",
      exports.get("getSharedGoalsService"),
      "/src/lib/gamification/shared-goals-service.ts",
    );
    check(
      "export-map follows `export *` to the defining file",
      exports.get("getJourneyService"),
      "/src/lib/gamification/journey-service.ts",
    );
  } finally {
    fs.existsSync = realExists;
    fs.statSync = realStat;
  }

  check(
    "named import extraction",
    [...extractImports(`import { a, b } from "m";`).named.get("m")],
    ["a", "b"],
  );
  check(
    "aliased import resolves to the ORIGINAL name",
    [...extractImports(`import { a as z } from "m";`).named.get("m")],
    ["a"],
  );
  check(
    "namespace import is whole-module",
    [...extractImports(`import * as ns from "m";`).whole],
    ["m"],
  );
  check(
    "default import is whole-module",
    [...extractImports(`import d from "m";`).whole],
    ["m"],
  );

  const failed = cases.filter((c) => !c.ok);
  for (const c of failed) {
    console.error(
      `  FAIL ${c.name}: expected ${JSON.stringify(c.expected)}, got ${JSON.stringify(c.actual)}`,
    );
  }
  if (failed.length > 0) {
    console.error(
      `audit:reachable-services self-test FAILED — ${failed.length}/${cases.length} cases wrong.`,
    );
    process.exit(1);
  }
  console.log(
    `audit:reachable-services self-test PASSED — ${cases.length}/${cases.length} cases correct.`,
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const args = process.argv.slice(2);
  if (args.includes("--self-test")) {
    selfTest();
    if (args.length === 1) return;
  }

  const baselineIdx = args.indexOf("--baseline");
  const baselinePath =
    baselineIdx !== -1 ? path.resolve(args[baselineIdx + 1]) : null;
  const freeze = args.includes("--freeze-baseline");

  // usedFrom, not reachableFrom: see the header. A service whose module is
  // merely loaded through a barrel is not an exposed feature.
  const reachableFromApi = usedFrom(walk(API_ROOT));
  const reachableFromApp = usedFrom(walk(APP_ROOT));

  /*
   * "contains service", not "ends in Service.ts". The narrower pattern missed
   * seven files whose name carries a suffix — notification-service-db.ts among
   * them, which is one of the most heavily used services in the codebase and
   * exactly the sort of file this audit must be able to see in order to be
   * trusted when it says something is unreachable.
   */
  const services = walk(path.join(SRC, "lib")).filter((f) =>
    /service/i.test(path.basename(f)),
  );

  const unreachable = [];
  for (const file of services) {
    const source = fs.readFileSync(file, "utf8");
    const dbCalls = countDbCalls(source);
    if (dbCalls < MIN_DB_CALLS) continue;
    if (reachableFromApi.has(file)) continue;
    unreachable.push({
      path: path.relative(ROOT, file).split(path.sep).join("/"),
      dbCalls,
      // Reachable from a page but not a route: the client imports it directly.
      // A different problem, not a dead feature.
      reachableFromPage: reachableFromApp.has(file),
    });
  }
  unreachable.sort((a, b) => b.dbCalls - a.dbCalls);

  console.log(
    `audit:reachable-services — ${services.length} database-backed service(s) examined, ` +
      `${unreachable.length} not reachable from any API route`,
  );

  if (freeze && baselinePath) {
    const existing = fs.existsSync(baselinePath)
      ? JSON.parse(fs.readFileSync(baselinePath, "utf8"))
      : { frozen: null, why: "", entries: {} };
    const entries = {};
    for (const item of unreachable) {
      entries[item.path] = existing.entries?.[item.path] ?? {
        dbCalls: item.dbCalls,
        reachableFromPage: item.reachableFromPage,
        verdict: "UNREVIEWED",
        why: "",
      };
    }
    fs.writeFileSync(
      baselinePath,
      JSON.stringify(
        {
          frozen: existing.frozen ?? new Date().toISOString().slice(0, 10),
          why:
            "Database-backed services under src/lib that no file under src/app/api can reach, " +
            "following the import graph through barrels and service-to-service chains. Each is " +
            "either a route to add (the feature works, expose it) or a deletion to propose " +
            "(the feature is dead). UNREVIEWED entries are debt nobody has looked at yet. " +
            "This list may only shrink.",
          entries,
        },
        null,
        2,
      ) + "\n",
    );
    console.log(
      `audit:reachable-services baseline frozen — ${Object.keys(entries).length} entries`,
    );
    return;
  }

  if (!baselinePath) {
    for (const item of unreachable) {
      const note = item.reachableFromPage ? "  (reached from a page)" : "";
      console.log(
        `  ${String(item.dbCalls).padStart(3)} db-calls  ${item.path}${note}`,
      );
    }
    return;
  }

  const baseline = fs.existsSync(baselinePath)
    ? JSON.parse(fs.readFileSync(baselinePath, "utf8"))
    : { entries: {} };
  const known = new Set(Object.keys(baseline.entries ?? {}));
  const found = new Set(unreachable.map((u) => u.path));

  const added = [...found].filter((p) => !known.has(p));
  const gone = [...known].filter((p) => !found.has(p));

  if (added.length > 0) {
    console.error(
      `\naudit:reachable-services FAILED — ${added.length} NEW unreachable service(s):\n`,
    );
    for (const p of added) console.error(`  ${p}`);
    console.error(
      "\nA database-backed service with no route is an unexposed feature. Add the\n" +
        "route, or record it in the baseline with a verdict and a reason.",
    );
    process.exit(1);
  }

  console.log("audit:reachable-services PASSED — no NEW unreachable services.");
  const counts = {};
  for (const entry of Object.values(baseline.entries ?? {})) {
    const verdict = entry.verdict ?? "UNREVIEWED";
    counts[verdict] = (counts[verdict] ?? 0) + 1;
  }
  for (const [verdict, n] of Object.entries(counts).sort()) {
    console.log(`  ${n} ${verdict}`);
  }
  if (gone.length > 0) {
    console.log(
      `\n${gone.length} baselined entr(ies) are now reachable — run \`--freeze-baseline\` to bank it:`,
    );
    for (const p of gone) console.log(`  ${p}`);
  }
}

/*
 * Only run when executed directly. This module exports extractSpecifiers,
 * resolveSpecifier and reachableFrom on purpose — they are useful for probing
 * a specific chain by hand ("is payout-service reachable, and through what?")
 * — and an unguarded main() meant importing it ran the whole audit as a side
 * effect, printing 34 lines before the caller's own output.
 */
const invokedDirectly =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (invokedDirectly) main();
