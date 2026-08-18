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

  const reachableFromApi = reachableFrom(walk(API_ROOT));
  const reachableFromApp = reachableFrom(walk(APP_ROOT));

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
