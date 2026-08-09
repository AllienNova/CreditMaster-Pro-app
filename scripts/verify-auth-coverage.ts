/**
 * verify-auth-coverage.ts — AUTH-04 audit gate (`npm run audit:auth`).
 *
 * Walks every `src/app/api/**` route file, determines the guard each route
 * actually applies (PUBLIC / withAuth / withRole / withPermission), and
 * cross-checks it against the `proposed_guard` column of
 * `docs/superpowers/auth-route-inventory.csv`.
 *
 * A route is an OFFENDER when:
 *  - the CSV classifies it stronger than the code applies (CSV says withRole or
 *    withPermission but the route only uses withAuth, or a non-PUBLIC route is
 *    unwrapped entirely), or
 *  - the route exists in code but is absent from the CSV inventory, or
 *  - the route is in the CSV but missing from the codebase.
 *
 * Exits non-zero and prints every offender when the audit fails; exit 0 clean.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const REPO_ROOT = join(__dirname, "..");
const API_DIR = join(REPO_ROOT, "src", "app", "api");
const CSV_PATH = join(
  REPO_ROOT,
  "docs",
  "superpowers",
  "auth-route-inventory.csv",
);

/** Guard strength ordering — higher index = stronger. */
const GUARD_RANK: Record<string, number> = {
  PUBLIC: 0,
  withAuth: 1,
  withRole: 2,
  withPermission: 2,
};

type GuardKind = "PUBLIC" | "withAuth" | "withRole" | "withPermission" | "none";

/** Parse one CSV line, honouring double-quoted fields with embedded commas. */
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      fields.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  fields.push(cur);
  return fields;
}

/** Normalise a `proposed_guard` CSV cell to a guard kind. */
function normalizeGuard(raw: string): GuardKind {
  const value = raw.trim();
  if (value === "PUBLIC") return "PUBLIC";
  if (value === "withAuth") return "withAuth";
  if (value.startsWith("withRole")) return "withRole";
  if (value.startsWith("withPermission")) return "withPermission";
  return "none";
}

/** Read every route's expected guard from the CSV, keyed by repo-relative path. */
function loadCsvExpectations(): Map<string, GuardKind> {
  const raw = readFileSync(CSV_PATH, "utf8");
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const expectations = new Map<string, GuardKind>();
  for (const line of lines.slice(1)) {
    const fields = parseCsvLine(line);
    const path = fields[0]?.trim();
    const guard = fields[4] ?? "";
    if (!path) continue;
    expectations.set(path.split("/").join(sep), normalizeGuard(guard));
  }
  return expectations;
}

/** Recursively collect every route file under `src/app/api`. */
function collectRouteFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...collectRouteFiles(full));
    } else if (entry === "route.ts") {
      out.push(full);
    }
  }
  return out;
}

/**
 * Determine the guard a route file applies, returning both the strongest and
 * weakest guard across its HTTP verbs.
 *
 * The CSV's single `proposed_guard` per file reflects the file's STRONGEST
 * required guard (the create/admin verb). A multi-verb file legitimately mixes
 * guards — e.g. GET=list=withAuth alongside POST=create=withPermission — so the
 * audit compares the CSV bar against the strongest applied guard. A file whose
 * weakest verb is unwrapped entirely is still flagged regardless.
 */
function detectGuards(filePath: string): {
  strongest: GuardKind;
  hasUnwrappedVerb: boolean;
} {
  const src = readFileSync(filePath, "utf8");
  const exportRe =
    /export\s+(?:const\s+(?:GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s*=|async\s+function\s+(?:GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS))[\s\S]*?(?:withPermission|withRole|withAuth|withOptionalAuth|\()/g;

  const guards: GuardKind[] = [];
  let match: RegExpExecArray | null;
  while ((match = exportRe.exec(src)) !== null) {
    const segment = match[0];
    if (segment.includes("withPermission")) guards.push("withPermission");
    else if (segment.includes("withRole")) guards.push("withRole");
    else if (segment.includes("withAuth")) guards.push("withAuth");
    else guards.push("none"); // bare handler — withOptionalAuth or unwrapped
  }
  if (guards.length === 0) {
    return { strongest: "none", hasUnwrappedVerb: true };
  }

  const strongest = guards.reduce<GuardKind>((best, g) => {
    const br = best === "none" ? -1 : GUARD_RANK[best];
    const gr = g === "none" ? -1 : GUARD_RANK[g];
    return gr > br ? g : best;
  }, guards[0]);

  return { strongest, hasUnwrappedVerb: guards.includes("none") };
}

function main(): void {
  const csv = loadCsvExpectations();
  const routeFiles = collectRouteFiles(API_DIR);
  const offenders: string[] = [];
  const seenInCode = new Set<string>();

  for (const file of routeFiles) {
    const rel = relative(REPO_ROOT, file);
    seenInCode.add(rel);
    const expected = csv.get(rel);

    if (!expected) {
      offenders.push(`${rel}: route is NOT in the auth-route-inventory CSV`);
      continue;
    }

    const { strongest, hasUnwrappedVerb } = detectGuards(file);

    if (expected === "PUBLIC") {
      // PUBLIC routes legitimately have no withAuth wrapper (signature/cron/
      // token auth, or genuinely open). Nothing to enforce in code here.
      continue;
    }

    // Any non-PUBLIC route with an entirely unwrapped HTTP verb is an offender.
    if (hasUnwrappedVerb) {
      offenders.push(
        `${rel}: CSV requires ${expected} but the route has an unwrapped HTTP verb`,
      );
      continue;
    }

    // The CSV proposed_guard is the file's strongest required guard; the
    // strongest applied guard must meet that bar.
    if (GUARD_RANK[strongest] < GUARD_RANK[expected]) {
      offenders.push(
        `${rel}: CSV requires ${expected} but the strongest guard applied is ${strongest}`,
      );
    }
  }

  for (const csvPath of csv.keys()) {
    if (!seenInCode.has(csvPath)) {
      offenders.push(`${csvPath}: in CSV but missing from the codebase`);
    }
  }

  const total = routeFiles.length;
  if (offenders.length > 0) {
    console.error(
      `audit:auth FAILED - ${offenders.length} offender(s) across ${total} API routes:\n`,
    );
    for (const offender of offenders) console.error(`  - ${offender}`);
    process.exit(1);
  }

  console.log(
    `audit:auth PASSED - ${total} API routes all match their CSV proposed_guard.`,
  );
}

main();
