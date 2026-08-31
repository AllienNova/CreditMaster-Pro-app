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

import {
  readFileSync,
  readdirSync,
  statSync,
  mkdtempSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, sep } from "node:path";
import { isPublicApiRoute } from "../src/lib/auth/PUBLIC_ROUTES";

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

/** `src/app/api/foo/[id]/route.ts` -> `/api/foo/[id]`, the URL the middleware sees. */
function urlPathFor(relPath: string): string {
  return (
    "/" +
    relPath
      .split(sep)
      .join("/")
      .replace(/^src\/app\//, "")
      .replace(/\/route\.tsx?$/, "")
      // Next route GROUPS are organisational and absent from the URL.
      .split("/")
      .filter((s) => !/^\(.*\)$/.test(s))
      .join("/")
  );
}

/** Values this gate accepts in `proposed_guard`. Anything else is an error. */
const KNOWN_GUARDS = ["PUBLIC", "withAuth", "withRole", "withPermission"];

/** CSV cells that failed to normalise — reported as gate failures, not ignored. */
const csvErrors: string[] = [];

/**
 * Normalise a `proposed_guard` CSV cell to a guard kind.
 *
 * Returns null for an unrecognised value, and the caller records it as a
 * failure. The previous version fell through to "none" for anything it did not
 * recognise, which made a TYPO a silent downgrade: `withPermssion` normalised
 * to "none", the comparison at the bottom of this file evaluated
 * `undefined < undefined` → false, and the route passed with no guard required
 * at all. A one-character edit could unprotect any route in the inventory,
 * and this gate is the only CI enforcement of FND-001.
 */
function normalizeGuard(raw: string, path: string): GuardKind | null {
  const value = raw.trim();
  if (value === "PUBLIC") return "PUBLIC";
  // withAuthAllowingAal1 authenticates the caller exactly as withAuth does; it
  // waives only the AAL2 step-up, because a user who has lost their
  // authenticator is stuck at aal1 by definition. Same bar for this gate.
  if (value === "withAuth" || value === "withAuthAllowingAal1") return "withAuth";
  if (value.startsWith("withRole")) return "withRole";
  if (value.startsWith("withPermission")) return "withPermission";
  csvErrors.push(
    `${path}: unrecognised proposed_guard ${JSON.stringify(value)} — expected one of ${KNOWN_GUARDS.join(", ")}`,
  );
  return null;
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
    const kind = normalizeGuard(guard, path);
    if (kind === null) continue; // recorded in csvErrors; reported below
    expectations.set(path.split("/").join(sep), kind);
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

  // Segment PER VERB first, then look for the guard inside each segment.
  //
  // The previous pattern was a single lazy `[\s\S]*?` running from an export
  // declaration to the first `withPermission|withRole|withAuth|(` — with no
  // boundary at the NEXT export. An adversarial review proved both failure
  // directions by execution:
  //
  //   export const GET = listUsers;              // unguarded — FND-001
  //   export const POST = withPermission(...)    // GET's match ran into this
  //
  // The GET match consumed the POST declaration, `segment.includes(
  // "withPermission")` was true, and the unguarded GET was recorded as
  // withPermission-protected. Reversing the order hid it the other way: with no
  // `(` and no guard keyword of its own, the GET declaration never matched at
  // all and was simply invisible. Either arrangement exits 0 on an unguarded
  // admin route — in the only CI enforcement of FND-001.
  const VERB_DECL =
    /export\s+(?:const\s+(?:GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s*=|async\s+function\s+(?:GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS))/g;

  const decls = [...src.matchAll(VERB_DECL)];
  const guards: GuardKind[] = [];

  for (let i = 0; i < decls.length; i++) {
    const start = decls[i].index!;
    const end = i + 1 < decls.length ? decls[i + 1].index! : src.length;
    const segment = src.slice(start, end);

    // The guard must appear in the DECLARATION HEAD — the text up to whichever
    // comes first, the opening paren of the wrapper call or the semicolon that
    // ends a bare assignment. Bounding here is what stops `export const GET =
    // listUsers;` from inheriting a guard mentioned later in the file.
    const paren = segment.indexOf("(");
    const semi = segment.indexOf(";");
    const bound =
      paren === -1 ? semi : semi === -1 ? paren : Math.min(paren, semi);
    const head = bound === -1 ? segment : segment.slice(0, bound + 1);

    if (head.includes("withPermission")) guards.push("withPermission");
    else if (head.includes("withRole")) guards.push("withRole");
    else if (head.includes("withAuth")) guards.push("withAuth");
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

/**
 * `--self-test` pins the two CRITICAL bypasses an adversarial review proved
 * against this gate by execution. Both left an unguarded admin route exiting 0
 * in the only CI enforcement of FND-001, so both are asserted rather than
 * assumed fixed. Writes a temp fixture, scans it, removes it.
 */
function selfTest(): void {
  const dir = mkdtempSync(join(tmpdir(), "auth-gate-"));
  const cases: Array<[string, string, boolean, string]> = [
    [
      "unguarded-before-guarded.ts",
      `export const GET = listUsers;\nexport const POST = withPermission("users:create", async (req: Request) => {\n  return NextResponse.json({ ok: true });\n});\n`,
      true,
      "a paren-free unguarded GET must not inherit the NEXT export's guard",
    ],
    [
      "guarded-before-unguarded.ts",
      `export const POST = withPermission("users:create", async (req: Request) => {\n  return NextResponse.json({ ok: true });\n});\nexport const GET = listUsers;\n`,
      true,
      "a paren-free unguarded GET after a guarded verb must still be seen",
    ],
    [
      "properly-guarded.ts",
      `export const GET = withAuth(async (req: Request) => {\n  return NextResponse.json({ ok: true });\n});\n`,
      false,
      "a correctly wrapped verb must not be flagged",
    ],
    [
      "bare-function.ts",
      `export async function GET(req: Request) {\n  return NextResponse.json({ ok: true });\n}\n`,
      true,
      "a bare exported function is unwrapped",
    ],
  ];

  let bad = 0;
  for (const [name, src, wantUnwrapped, why] of cases) {
    const file = join(dir, name);
    writeFileSync(file, src);
    const { hasUnwrappedVerb } = detectGuards(file);
    if (hasUnwrappedVerb === wantUnwrapped) continue;
    bad++;
    console.error(`  SELF-TEST FAIL: expected hasUnwrappedVerb=${wantUnwrapped} — ${why}`);
  }
  rmSync(dir, { recursive: true, force: true });

  // The CSV must reject values it does not recognise rather than silently
  // treating them as "no guard required".
  const before = csvErrors.length;
  if (normalizeGuard("withPermssion", "typo/route.ts") !== null) {
    bad++;
    console.error("  SELF-TEST FAIL: a typo'd guard must not normalise to a valid kind");
  }
  if (csvErrors.length === before) {
    bad++;
    console.error("  SELF-TEST FAIL: an unrecognised guard must be recorded as an error");
  }
  csvErrors.length = before;

  console.log(
    bad === 0
      ? `audit:auth self-test PASSED - ${cases.length + 2}/${cases.length + 2} detector cases correct.`
      : `audit:auth self-test FAILED - ${bad} case(s) wrong.`,
  );
  process.exit(bad === 0 ? 0 : 1);
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
      // token auth, or genuinely open) — but the CSV does not get to decide
      // that unilaterally.
      //
      // PUBLIC_ROUTES.ts states "the scripts/verify-auth-coverage.ts audit
      // cross-checks the two". It did not. Until this check existed, a single
      // CSV row flipped to PUBLIC removed a route from enforcement entirely —
      // no code check of any kind — in the same commit that stripped its
      // withPermission wrapper. The middleware allowlist is the thing that
      // actually decides what is reachable pre-auth, so a PUBLIC claim must be
      // backed by an entry there.
      if (!isPublicApiRoute(urlPathFor(rel))) {
        offenders.push(
          `${rel}: CSV says PUBLIC but ${urlPathFor(rel)} is not in PUBLIC_ROUTES.ts — ` +
            `the middleware will deny it, and no guard is enforced in code`,
        );
      }
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

  // A CSV cell this gate cannot parse is a gate failure, not a shrug. Silently
  // treating it as "none" is what turned a typo into an unprotected route.
  offenders.push(...csvErrors);

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

if (process.argv.includes("--self-test")) selfTest();
else main();
