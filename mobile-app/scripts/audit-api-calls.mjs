#!/usr/bin/env node
/**
 * audit:api — every API path the mobile app calls must resolve to a real route.
 *
 * WHY THIS EXISTS. The mobile dogfood sweep reported 223/223 routes rendering
 * while 63 of the app's 137 distinct API calls were hitting 404. Both facts were
 * true at once: every screen catches its fetch error and renders an empty state,
 * so a screen whose entire data layer is a 404 still "renders" and the sweep
 * still says green. Rendering is not working.
 *
 * The dominant defect was naming drift between two halves of the codebase that
 * nobody diffed against each other — the mobile client asks for
 * `/credit/monitoring/alerts`, the web app serves `/credit-monitoring/alerts`.
 * Slash versus hyphen. Nothing catches that: it type-checks, it lints, it has
 * passing tests, and it is a 404 for every real user.
 *
 * The second defect is structural. API_BASE_URL already ends in `/api`
 * (src/services/api/client.ts) and the request is built by straight
 * concatenation — `fetch(\`${API_BASE_URL}${endpoint}\`)`. So a call written as
 * `api.get("/api/student-loans")` requests `/api/api/student-loans`. That is
 * always a 404, and it is reported separately below because the fix is
 * mechanical and the destination provably exists.
 *
 * Exit 0 clean, 1 with unresolved calls.
 */

import { readdirSync, statSync, readFileSync, writeFileSync } from "fs";
import { join, relative, resolve } from "path";

const MOBILE = process.cwd();
const WEB = resolve(MOBILE, "..");
const API_DIR = join(WEB, "src", "app", "api");

/**
 * Every API route the web app serves, as a path relative to /api, AND the set
 * of HTTP verbs each one actually exports.
 *
 * The verbs are the point. This gate used to answer only "does a handler file
 * exist at this path", which is not the question a caller cares about:
 * `api.post("/student-loans", loan)` resolved happily against a route.ts that
 * exports GET and nothing else, and 405s at runtime. Measured across both apps,
 * fifteen calls were in that state while every gate was green.
 *
 * A route module's verbs are its exported handler names — Next.js dispatches on
 * exactly that, so reading the exports IS reading the contract.
 */
const routeVerbs = new Map();

function collectRoutes(dir = API_DIR, prefix = "") {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "__tests__") continue;
      // Next route GROUPS "(x)" are organisational and absent from the URL.
      const seg = /^\(.*\)$/.test(entry) ? "" : `/${entry}`;
      out.push(...collectRoutes(full, prefix + seg));
    } else if (entry === "route.ts" || entry === "route.js") {
      const path = prefix || "/";
      out.push(path);
      const verbs = new Set();
      for (const m of readFileSync(full, "utf8").matchAll(VERB_EXPORT)) {
        verbs.add(m[1]);
      }
      routeVerbs.set(path, verbs);
    }
  }
  return out;
}

/**
 * `export const GET`, `export async function POST`, `export function DELETE`.
 * All three forms appear in this codebase; missing one would under-report,
 * which for a gate is the failure direction that matters.
 */
const VERB_EXPORT =
  /export\s+(?:const|async\s+function|function)\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/g;

function walkSources(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (!["node_modules", ".expo", "__tests__"].includes(entry)) walkSources(full, out);
    } else if (/\.(ts|tsx)$/.test(entry) && !/\.(test|spec)\.tsx?$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

const routes = [...new Set(collectRoutes())];

/**
 * A call matches a route when segment counts align and each segment either is
 * literally equal, is a [dynamic] route segment, or is a call-side wildcard
 * (an interpolated `${…}`), which can only stand in for a [dynamic] segment.
 */
function resolvesTo(call) {
  return matchedRoute(call) !== null;
}

/**
 * WHICH route a call lands on, not merely whether one exists.
 *
 * Needed because the verb check has to ask a specific handler what it exports.
 * An exact path wins over a [dynamic] match, which mirrors Next.js's own
 * precedence — otherwise /api/tax/deductions/summary would be attributed to
 * deductions/[id] even if a literal summary route existed.
 */
function matchedRoute(call) {
  if (routes.includes(call)) return call;
  const cp = call.split("/");
  for (const r of routes) {
    const rp = r.split("/");
    if (rp.length !== cp.length) continue;
    const ok = rp.every((s, i) => {
      if (cp[i] === WILDCARD) return s.startsWith("[");
      return s.startsWith("[") || s === cp[i];
    });
    if (ok) return r;
  }
  return null;
}

// api.get("/x"), api.post<T>("/x", body), api.delete(`/x/${id}`).
//
// Interpolations are NOT skipped. An earlier version of this gate stopped at the
// first `${`, which silently exempted every parameterised call — including
// `/credit/monitoring/alerts/${alertId}`, a 404 whose whole path prefix was
// wrong. Since a gate that skips its hardest inputs is the thing it is meant to
// prevent, `${…}` is instead collapsed to a wildcard segment that matches any
// single [dynamic] route segment.
//
// The VERB is captured, not discarded. It was previously a non-capturing group
// — the method was matched and thrown away — so `api.post("/student-loans")`
// was checked as though the verb did not exist.
/**
 * `api.get("/x")` and `apiClient.get("/x")`.
 *
 * `apiClient` is a local ApiResponse-unwrapping wrapper (see
 * src/services/coachApi.ts). Matching only `api.` hid all 12 of that file's
 * calls, every one of which was double-prefixed and 404ing. A new wrapper name
 * would hide its calls the same way — `--report-skipped` exists so that shows
 * up as a number rather than as silence.
 */
const CALL =
  /\b(?:api|apiClient)\.(get|post|put|patch|delete)(?:<[^>]*>)?\(\s*([`"'])([^`"']*)\2/g;

const WILDCARD = " ";

/**
 * `/a/${x}/b` -> `/a/<wildcard>/b`.
 *
 * TWO BUGS THIS REPLACED, both of which made the gate UNDER-report — the
 * failure direction that matters, since it means calls pass that should not.
 *
 * 1. A TRAILING WILDCARD WAS STRIPPED. `/credit/scores/${bureau}` became
 *    `/credit/scores`, so a detail call was resolved against its own
 *    COLLECTION. Any `/x/${id}` passed whenever `/x` existed, even with no
 *    `[id]` route behind it — precisely the shape most likely to 404. The
 *    strip was meant to clean up a dangling `?${query}`; it ate path segments
 *    too.
 *
 * 2. NESTED BRACES BROKE THE MATCH. /\$\{[^}]*\}/ stops at the first `}`, so
 *    history${months ? `?months=${months}` : ""} produced literal garbage as a
 *    "path" — resolving to nothing, and reported under a name nobody can
 *    search for.
 *
 * The scan is brace-aware. An interpolation whose expression contains `?` is a
 * query-string builder and truncates the path there, which is what that idiom
 * always means here. Everything else becomes a wildcard segment, and a wildcard
 * fused to literal text inside one segment makes the WHOLE segment a wildcard,
 * since neither half is statically known.
 */
function staticise(raw) {
  let out = "";
  for (let i = 0; i < raw.length; i++) {
    if (raw[i] !== "$" || raw[i + 1] !== "{") {
      out += raw[i];
      continue;
    }
    let depth = 0;
    let j = i + 1;
    for (; j < raw.length; j++) {
      if (raw[j] === "{") depth++;
      else if (raw[j] === "}" && --depth === 0) break;
    }
    if (raw.slice(i + 2, j).includes("?")) return normalise(out);
    out += WILDCARD;
    i = j;
  }
  return normalise(out);
}

/** Split into segments, collapse mixed segments to a wildcard, trim trailing "/". */
function normalise(path) {
  const segments = path
    .split("?")[0]
    .split("/")
    .map((s) => (s.includes(WILDCARD) ? WILDCARD : s));
  // Drop a trailing EMPTY segment (a path ending in "/") but never a trailing
  // wildcard — that is a real segment the route is required to provide.
  while (segments.length > 1 && segments[segments.length - 1] === "") segments.pop();
  return segments.join("/") || "/";
}

/**
 * Module-level `const NAME = "literal"` declarations in one file.
 *
 * WHY. The scan used to drop any call whose path did not start with "/", which
 * silently excluded every path built from a variable prefix — 16 calls, and
 * all 12 in src/services/coachApi.ts were broken (its BASE_PATH began with
 * "/api", which the client's base URL already supplies, so each resolved to
 * /api/api/... and 404'd). A gate that quietly skips what it cannot parse
 * reports green over exactly the calls nobody has checked.
 *
 * Only literal string constants are resolved. A prefix computed at runtime is
 * still skipped — but it is skipped LOUDLY now, via --report-skipped.
 */
function stringConstants(source) {
  const consts = new Map();
  for (const m of source.matchAll(
    /(?:^|\n)\s*(?:export\s+)?const\s+([A-Za-z_$][\w$]*)\s*=\s*["'`]([^"'`\n]*)["'`]\s*;/g,
  )) {
    consts.set(m[1], m[2]);
  }
  return consts;
}

/**
 * Substitute a leading `${CONST}` with its literal value.
 *
 * Deliberately only the LEADING interpolation, and only from a literal const:
 * anything else stays a wildcard, which is the existing, conservative
 * behaviour.
 */
function resolveLeadingConst(raw, consts) {
  const m = raw.match(/^\$\{([A-Za-z_$][\w$]*)\}/);
  if (!m) return raw;
  const value = consts.get(m[1]);
  return value === undefined ? raw : value + raw.slice(m[0].length);
}

/**
 * Blank out whole-line comments before scanning for calls.
 *
 * A comment is not a call. Documenting a path that USED to be wrong — "was
 * api.get(\"/api/credit/check\")" — re-armed this gate against prose and kept
 * the entry alive in the baseline after the code was fixed. A tool that
 * punishes accurate comments teaches people to write vague ones.
 *
 * Deliberately line-based rather than a full tokeniser: only lines whose
 * trimmed form OPENS with //, /*, or * (a JSDoc continuation) are cleared. A
 * line starting that way cannot be inside a string literal, so no
 * "http://host" is ever damaged — the failure mode a naive strip-everything
 * regex has. A trailing comment on a line of real code is still scanned, which
 * over-detects rather than under-detects: the safe direction for a gate.
 */
function stripCommentLines(source) {
  return source
    .split("\n")
    .map((line) => {
      const trimmed = line.trimStart();
      return trimmed.startsWith("//") ||
        trimmed.startsWith("/*") ||
        trimmed.startsWith("*")
        ? ""
        : line;
    })
    .join("\n");
}

// `--self-test` proves the matcher still discriminates, using the real route
// table. A gate is only worth its green light if it can be shown to go red, and
// the alternative — dropping a throwaway probe file into src/ — is both easy to
// forget to remove and blocked by the repo's jail guard. Runs in CI alongside
// the audit itself.
if (process.argv.includes("--self-test")) {
  const has = (r) => routes.includes(r);
  const cases = [
    ["/nope/not/a/route", false, "an invented path must NOT resolve"],
    ["/api/student-loans", false, "a double-prefixed path must NOT resolve"],
    [staticise("/disputes/${id}"), has("/disputes/[id]"), "interpolation fills a [dynamic] segment"],
    [staticise("/nope/${id}/bad"), false, "interpolation does not excuse a wrong prefix"],
    [staticise("/student-loans?x=${q}"), has("/student-loans"), "a query string is stripped"],
    ["/student-loans", has("/student-loans"), "a literal route resolves"],
    // A detail call must NOT be satisfied by its own collection. Stripping the
    // trailing wildcard used to make /credit/scores/${bureau} resolve against
    // /credit/scores, so every /x/${id} passed whenever /x existed.
    [staticise("/student-loans/${id}"), has("/student-loans/[id]"),
      "a detail call is not satisfied by its collection"],
  ];

  // Declared before ANY loop that increments it: the counter is only touched
  // on a failing case, so a declaration below the first loop passes while every
  // case passes and throws a TDZ ReferenceError the moment one fails — a
  // self-test that cannot report a failure.
  let bad = 0;

  // staticise() output is asserted as an exact STRING, not via resolvesTo().
  //
  // The truncation case used to be `[staticise(...), has("/student-loans/
  // history"), ...]`, which read the live route table for its expectation. When
  // /api/student-loans/[id] was added that path started resolving — a
  // [dynamic] segment matches the literal "history" — and the case failed
  // while staticise() was working perfectly. Asserting the produced string is
  // both tighter and immune to the route table changing underneath it.
  //
  // (That /student-loans/history now resolves to [id] is real and worth
  // knowing: a future history endpoint would be shadowed by the detail route
  // unless it is declared before it.)
  const staticiseCases = [
    ["/student-loans/history${m ? `?months=${m}` : \"\"}", "/student-loans/history",
      "nested braces truncate at the query, rather than corrupting the path"],
    ["/disputes/${id}", `/disputes/${WILDCARD}`, "interpolation becomes a wildcard segment"],
    ["/student-loans?x=${q}", "/student-loans", "a query string is stripped"],
    ["/x/pre-${id}", `/x/${WILDCARD}`, "a wildcard fused to literal text takes the whole segment"],
  ];
  for (const [input, want, why] of staticiseCases) {
    const got = staticise(input);
    if (got === want) continue;
    bad++;
    console.log(`  SELF-TEST FAIL: staticise(${JSON.stringify(input)}) -> ${JSON.stringify(got)}, expected ${JSON.stringify(want)} (${why})`);
  }



  // The comment stripper gets its own cases: it decides what is even a call.
  const stripCases = [
    ['  * Was `api.get("/api/credit/check")`.', "", "a JSDoc continuation line is cleared"],
    ['  // api.get("/gone")', "", "a line comment is cleared"],
    ['  /* api.get("/gone") */', "", "a block-comment opener is cleared"],
    ['const u = "http://localhost:3000";', 'const u = "http://localhost:3000";',
      "a URL inside a string is NOT damaged"],
    ['  api.get("/student-loans");', '  api.get("/student-loans");',
      "a real call survives untouched"],
  ];
  for (const [input, want, why] of stripCases) {
    const got = stripCommentLines(input);
    if (got === want) continue;
    bad++;
    console.log(`  SELF-TEST FAIL: strip ${JSON.stringify(input)} -> ${JSON.stringify(got)}, expected ${JSON.stringify(want)} (${why})`);
  }

  let total = cases.length + stripCases.length + staticiseCases.length;
  for (const [path, want, why] of cases) {
    const got = resolvesTo(path);
    if (got === want) continue;
    bad++;
    console.log(`  SELF-TEST FAIL: ${JSON.stringify(path)} -> ${got}, expected ${want} (${why})`);
  }
  console.log(
    bad === 0
      ? `audit:api self-test PASSED — ${total}/${total} matcher cases correct.`
      : `audit:api self-test FAILED — ${bad} of ${total} cases wrong.`,
  );
  process.exit(bad === 0 ? 0 : 1);
}

const dead = new Map();
const doublePrefixed = new Map();
/** "POST /api/x" -> { target, exports, files } — path resolves, verb does not. */
const verbMismatch = new Map();
let callsSeen = 0;
/** Calls whose path prefix could not be resolved to a literal. */
const unresolved = [];

for (const file of walkSources(join(MOBILE, "app")).concat(walkSources(join(MOBILE, "src")))) {
  const rel = relative(MOBILE, file);
  const source = stripCommentLines(readFileSync(file, "utf8"));
  const consts = stringConstants(source);
  for (const m of source.matchAll(CALL)) {
    // Group 1 is now the VERB, so the path moved from m[2] to m[3]. Getting
    // this wrong would make every path unresolvable and the gate would scream —
    // the safe direction, but check it if this regex is ever edited again.
    const verb = m[1].toUpperCase();
    const path = staticise(resolveLeadingConst(m[3], consts));
    if (!path.startsWith("/")) {
      // Still unresolvable — a runtime-computed prefix. Counted so the gate
      // can say how much it could not see, instead of silently skipping.
      unresolved.push(`${rel}: ${verb} ${JSON.stringify(m[3])}`);
      continue;
    }
    callsSeen++;
    if (!resolvesTo(path)) {
      // Distinguish the mechanical double-prefix case: the caller wrote /api/x
      // but the base URL already supplies /api, and /x is a route that exists.
      const bucket =
        path.startsWith("/api/") && resolvesTo(path.slice(4)) ? doublePrefixed : dead;
      if (!bucket.has(path)) bucket.set(path, new Set());
      bucket.get(path).add(rel);
      continue;
    }

    // The path resolves. Does the handler it resolves to accept this verb?
    const target = matchedRoute(path);
    if (!target) continue;
    const verbs = routeVerbs.get(target) ?? new Set();
    if (verbs.has(verb)) continue;
    const key = `${verb} ${path}`;
    if (!verbMismatch.has(key)) {
      verbMismatch.set(key, {
        target,
        exports: [...verbs].sort().join(",") || "NONE",
        files: new Set(),
      });
    }
    verbMismatch.get(key).files.add(rel);
  }
}

console.log(
  `audit:api — ${callsSeen} API call(s) against ${routes.length} route(s) under src/app/api`,
);

// ── Shrink-only baseline ─────────────────────────────────────────────────────
//
// 82 calls are broken TODAY. Wiring this gate as a plain pass/fail would make
// CI permanently red, and the two dishonest ways out — continue-on-error, or
// not wiring it at all — both amount to shipping a known-broken data layer with
// a green tick next to it.
//
// So it ratchets, the same shape audit:idor already uses here: the current
// breakage is frozen in a baseline file as TRACKED DEBT, and the gate fails on
// anything NOT in that list. New breakage blocks a merge from the first commit;
// existing breakage is visible, counted, and can only ever shrink. The baseline
// does not mean these calls are acceptable — it means they are known, and the
// number is not allowed to grow.
const BASELINE_PATH = join(MOBILE, "scripts", "api-calls-baseline.json");
const broken = [...doublePrefixed.keys(), ...dead.keys()].sort();
/** Tracked separately: these paths DO exist — it is the method that is refused. */
const verbBroken = [...verbMismatch.keys()].sort();

let baseline = [];
let verbBaseline = [];
/**
 * The prose that explains WHY each entry is here, carried through every rewrite.
 *
 * --write-baseline used to rebuild this file from three fields, which silently
 * deleted the per-entry reasons somebody had written — the reasons are the only
 * part of a baseline that tells the next person whether an entry is blocked on a
 * schema decision or is simply unfinished. A tool that discards them is worse
 * than one that never had them, because the loss is invisible.
 */
let reasons = {};
try {
  const parsed = JSON.parse(readFileSync(BASELINE_PATH, "utf8"));
  baseline = parsed.broken ?? [];
  verbBaseline = parsed.verbMismatch ?? [];
  reasons = {
    ...(parsed.why ? { why: parsed.why } : {}),
    // brokenWhy is the same idea for `broken` entries: path -> the blocker
    // that keeps it there. It MUST be listed here, or --write-baseline drops
    // it on the next rewrite — the exact silent loss this block exists to
    // prevent.
    ...(parsed.brokenWhy ? { brokenWhy: parsed.brokenWhy } : {}),
    ...(parsed.verbMismatchWhy ? { verbMismatchWhy: parsed.verbMismatchWhy } : {}),
  };
} catch {
  baseline = [];
  verbBaseline = [];
}

// One-time freeze of the CURRENT breakage. Separate from --write-baseline,
// which is shrink-only by design and therefore cannot seed an empty file.
if (process.argv.includes("--freeze-baseline")) {
  writeFileSync(
    BASELINE_PATH,
    JSON.stringify(
      { frozen: "2026-08-15", broken, verbMismatch: verbBroken, ...reasons },
      null,
      2,
    ) + "\n",
  );
  console.log(
    `audit:api baseline frozen with ${broken.length} tracked call(s) and ${verbBroken.length} verb mismatch(es).`,
  );
  process.exit(0);
}

if (process.argv.includes("--write-baseline")) {
  const kept = baseline.filter((p) => broken.includes(p));
  const keptVerbs = verbBaseline.filter((p) => verbBroken.includes(p));
  // Shrink-only: a --write-baseline run can never ADD an entry. Otherwise the
  // same command that introduces a broken call could bless it.
  writeFileSync(
    BASELINE_PATH,
    JSON.stringify(
      { frozen: "2026-08-15", broken: kept, verbMismatch: keptVerbs, ...reasons },
      null,
      2,
    ) + "\n",
  );
  console.log(
    `audit:api baseline rewritten — ${baseline.length} -> ${kept.length} tracked call(s), ` +
      `${verbBaseline.length} -> ${keptVerbs.length} verb mismatch(es).` +
      (kept.length === baseline.length && keptVerbs.length === verbBaseline.length
        ? " (nothing fixed since last run)"
        : ""),
  );
  process.exit(0);
}

const regressions = broken.filter((p) => !baseline.includes(p));
const fixed = baseline.filter((p) => !broken.includes(p));
const verbRegressions = verbBroken.filter((p) => !verbBaseline.includes(p));
const verbFixed = verbBaseline.filter((p) => !verbBroken.includes(p));

if (verbBroken.length) {
  console.log(
    `  ${verbBroken.length} call(s) reach a real route that REFUSES their method ` +
      `(${verbBaseline.length} baselined, ${verbRegressions.length} new)`,
  );
}
if (verbRegressions.length) {
  console.log(
    `\naudit:api FAILED — ${verbRegressions.length} NEW call(s) whose route rejects their method:\n`,
  );
  for (const key of verbRegressions) {
    const info = verbMismatch.get(key);
    console.log(`  ${key}`);
    console.log(`      resolves to ${info.target}, which exports {${info.exports}}`);
    for (const f of info.files) console.log(`      ${f}`);
  }
  console.log(
    `\nThe path exists, so the other check passes and the browser sweep may never` +
      `\ntrigger it — but at runtime Next.js answers 405 and the calling screen` +
      `\nswallows it. Either the client is using the wrong verb (PUT where the route` +
      `\nexports PATCH), or the handler was never written.`,
  );
  process.exit(1);
}
if (verbFixed.length) {
  console.log(
    `\n${verbFixed.length} baselined verb mismatch(es) now resolve. Run` +
      ` \`npm run audit:api -- --write-baseline\` to bank it:\n` +
      verbFixed.map((p) => `  ${p}`).join("\n"),
  );
}

if (regressions.length === 0) {
  if (broken.length === 0) {
    console.log("audit:api PASSED — every API call resolves to a real route.");
  } else {
    console.log(
      `audit:api PASSED — no NEW broken calls.\n` +
        `${broken.length} call(s) remain in scripts/api-calls-baseline.json as tracked debt.\n` +
        `They do NOT pass review; each is a live 404 whose screen renders an empty\n` +
        `state instead of an error. The list may only shrink.`,
    );

    // Print the reasons that ARE recorded. A tracked path with a documented
    // blocker is a decision someone can act on; one without is just a number
    // that gets re-derived from scratch every time anyone looks.
    const why = reasons.brokenWhy ?? {};
    const documented = broken.filter((p) => why[p]);
    if (documented.length > 0) {
      console.log(
        `\n${documented.length} of them record WHY they are still broken:\n` +
          documented.map((p) => `  ${p}\n      ${why[p]}`).join("\n"),
      );
    }
  }
  if (fixed.length > 0) {
    console.log(
      `\n${fixed.length} baselined call(s) are no longer broken — either the route now exists or the call was changed or removed. Run` +
        ` \`npm run audit:api -- --write-baseline\` to bank the progress:\n` +
        fixed.map((p) => `  ${p}`).join("\n"),
    );
  }
  process.exit(0);
}

console.log(
  `\naudit:api FAILED — ${regressions.length} NEW broken API call(s) not in the baseline:\n`,
);
for (const path of regressions) {
  const files = doublePrefixed.get(path) ?? dead.get(path) ?? new Set();
  console.log(`  ${path}`);
  for (const f of files) console.log(`      ${f}`);
}
console.log(
  `\nEach is a 404 the calling screen will swallow into an empty state.` +
    `\nCheck whether the route exists under another name before building one —` +
    `\nthe common drift is '/' vs '-' (/credit/monitoring/alerts vs` +
    `\n/credit-monitoring/alerts), or a redundant /api prefix.`,
);
process.exit(1);

// ── Detail, printed only when something is broken ────────────────────────────
if (false) {

if (doublePrefixed.size > 0) {
  console.log(
    `\naudit:api FAILED — ${doublePrefixed.size} call(s) double-prefix /api.` +
      `\nAPI_BASE_URL already ends in /api, so these request /api/api/… and always 404.` +
      `\nThe destination exists; drop the redundant prefix:\n`,
  );
  for (const [path, files] of doublePrefixed) {
    console.log(`  ${path}  ->  ${path.slice(4)}`);
    for (const f of files) console.log(`      ${f}`);
  }
}

if (dead.size > 0) {
  console.log(
    `\naudit:api FAILED — ${dead.size} call(s) have no backing route:\n`,
  );
  for (const [path, files] of dead) {
    console.log(`  ${path}`);
    for (const f of files) console.log(`      ${f}`);
  }
  console.log(
    `\nBefore building a new route, check whether one already exists under a` +
      `\ndifferent name — the common drift is '/' vs '-' (the client asked for` +
      `\n/credit/monitoring/alerts; the server serves /credit-monitoring/alerts).`,
  );
}

process.exit(1);
}
