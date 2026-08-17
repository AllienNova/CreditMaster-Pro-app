#!/usr/bin/env node
/**
 * audit:mocks — an API route must not fabricate the data it returns.
 *
 * WHY. FND-049..053: admin analytics returned `Math.random()` figures and
 * several routes fell back to hardcoded mock data when their DB query failed.
 * Both render as real numbers in the product. A user reading a fabricated
 * credit rank, or an operator reading a fabricated revenue chart, has no way to
 * tell — which is worse than an error, because an error is visible.
 *
 * WHAT FAILS THE GATE, inside src/app/api/**:
 *
 *   1. `Math.random()` in a response path. Randomness has no place in an API
 *      that reports a user's finances. (Nonces/ids are exempt via the marker.)
 *   2. A catch block that RETURNS data instead of an error — the silent
 *      fallback. `catch { return NextResponse.json({ data: MOCK }) }` turns an
 *      outage into a plausible lie.
 *
 * JUSTIFYING A REAL EXCEPTION, at the call site:
 *
 *   // mock-audit: not-user-data — <why this randomness is not reported data>
 *
 * There is no marker for the catch-fallback case on purpose. If a route cannot
 * serve real data it must say so; that is the whole finding.
 */

import { readFileSync, readdirSync, statSync } from "fs";
import { join, relative } from "path";

const ROOT = process.cwd();
const API = join(ROOT, "src", "app", "api");

const RANDOM = /Math\.random\s*\(/;
const MARKER = /\/\/\s*mock-audit:\s*not-user-data\s*[—-]\s*\S/;

/**
 * A catch block that answers with a payload pretending nothing went wrong.
 *
 * Returning data from a catch is NOT automatically wrong — an honest degraded
 * response (empty results, plus a flag saying so) is the right pattern and is
 * what /billing does after its permanent-spinner fix. What is wrong is a catch
 * that returns values indistinguishable from a successful read.
 *
 * So the block is accepted when it carries an explicit signal that the caller
 * can branch on: `error`, `degraded`, `success: false`, or `warning`. Anything
 * else is a silent fallback.
 */
const CATCH_RETURNS_DATA =
  /catch\s*(?:\([^)]*\))?\s*\{[^}]{0,600}?NextResponse\.json\s*\(\s*\{(?![^}]*(error|degraded|warning|success:\s*false))/s;

/**
 * Blank out comments so a line DESCRIBING the defect is not reported as one.
 * trading/signals/route.ts documents the Math.random() price walk it replaced;
 * the first run flagged that comment as a live fabrication.
 */
function stripComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/^[ \t]*\/\/.*$/gm, (m) => " ".repeat(m.length));
}

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry !== "__tests__") walk(full, out);
    } else if (/^route\.ts$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

/** Text from `open` to its matching close brace/paren, inclusive of neither. */
function balanced(text, open, o = "{", c = "}") {
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === o) depth++;
    else if (text[i] === c) {
      depth--;
      if (depth === 0) return text.slice(open + 1, i);
    }
  }
  return null;
}

/** Every `catch (...) { ... }` body in the file, with its offset. */
function catchBlocks(text) {
  const out = [];
  for (const m of text.matchAll(/\bcatch\s*(?:\([^)]*\))?\s*\{/g)) {
    const open = m.index + m[0].length - 1;
    const body = balanced(text, open);
    if (body !== null) out.push({ body, index: m.index });
  }
  return out;
}

/**
 * A payload signals failure when it says so where the CALLER can see it.
 *
 * `error: null` does not count. The old check was a lookahead for the mere
 * substring "error" in the returned object, which an adversarial review
 * defeated by adding `error: null` next to the fabricated data — a field whose
 * value states there was no error, accepted as proof that an error was
 * reported. An HTTP status of 400+ counts too: a route that returns 503 with a
 * body is not pretending the call succeeded.
 */
function signalsFailure(args) {
  if (/\bsuccess\s*:\s*false/.test(args)) return true;
  if (/\b(degraded|stale|partial|pending)\s*:\s*true/.test(args)) return true;
  if (/\bstatus\s*:\s*(4\d\d|5\d\d)/.test(args)) return true;
  // `error:` / `warning:` with a value that is not a denial of error.
  return /\b(error|warning)\s*:\s*(?!null\b|undefined\b|false\b)\S/.test(args);
}

/**
 * The first `return NextResponse.json(...)` in a catch whose payload carries no
 * failure signal, or null when the block is clean.
 *
 * The amnesties this replaced were the whole hole. A block was exempt if it
 * contained `throw` ANYWHERE, or mentioned `error.message` / `error.code` /
 * `error instanceof` anywhere — so this passed:
 *
 *     } catch (error) {
 *       console.error("db down", error.message);      // <- amnesty
 *       return NextResponse.json({ data: MOCK_SCORES });
 *     }
 *
 * Logging the error and then lying to the user is precisely the FND-049..053
 * shape this gate exists to block; the amnesty conditions described a
 * fabricated-fallback route rather than excluding one. What matters is not what
 * the block mentions, it is what the RETURNED PAYLOAD tells the caller. A
 * return that signals failure is fine no matter what else the block does; a
 * return that does not is a defect no matter how carefully the error was
 * inspected first.
 */
function unsignalledReturn(block) {
  for (const m of block.body.matchAll(/NextResponse\.json\s*\(/g)) {
    const args = balanced(block.body, m.index + m[0].length - 1, "(", ")");
    if (args === null) continue;
    if (!/\{/.test(args)) continue;
    if (signalsFailure(args)) continue;
    if (inventsNothing(args)) continue;
    return args.replace(/\s+/g, " ").trim().slice(0, 60);
  }
  return null;
}

/**
 * True when the payload carries no invented content.
 *
 * This gate is about FABRICATION, and an empty payload fabricates nothing.
 * /financial/budgets/adjust catches "no active budget found", returns
 * `{ success: true, data: [], hasBudget: false, message: ... }` and rethrows
 * everything else — an honest empty state for every user who has not created a
 * budget yet, which is every new user. Flagging it would push a correct route
 * toward either a 500 or an amnesty comment, and amnesties are exactly what
 * this rewrite removed.
 *
 * `data: MOCK_SCORES` is not empty and stays flagged. The distinction is the
 * VALUE, not the presence of the key.
 */
function inventsNothing(args) {
  const found = args.match(/\bdata\s*:\s*(\[\s*\]|\{\s*\}|null|undefined)\s*[,}]/);
  return found !== null;
}

// `--self-test` pins the three bypasses an adversarial review PROVED against
// the previous detector, plus the false positives that must stay clean. Each
// bypass returned fabricated data to a real user while the gate said PASSED.
if (process.argv.includes("--self-test")) {
  const flags = (src) => catchBlocks(src).some((b) => unsignalledReturn(b) !== null);
  const CASES = [
    [`} catch (e) { return NextResponse.json({ data: MOCK_SCORES }); }`, true,
      "ONE-LINE catch — the old extractor never matched it at all"],
    [`} catch (error) {\n  console.error("db down", error.message);\n  return NextResponse.json({ data: MOCK_SCORES });\n}`, true,
      "mentioning error.message used to grant blanket amnesty"],
    [`} catch (e) {\n  return NextResponse.json({ data: MOCK_SCORES, error: null });\n}`, true,
      "`error: null` used to suppress the check by substring match"],
    [`} catch (e) {\n  if (x) throw e;\n  return NextResponse.json({ data: MOCK_SCORES });\n}`, true,
      "a throw elsewhere in the block used to excuse an unsignalled return"],
    [`} catch (e) {\n  return NextResponse.json({ error: "failed" }, { status: 500 });\n}`, false,
      "an honest error response stays clean"],
    [`} catch (e) {\n  return NextResponse.json({ success: false, message: "nope" });\n}`, false,
      "success:false stays clean"],
    [`} catch (e) {\n  return NextResponse.json({ success: true, data: [], hasBudget: false });\n}`, false,
      "an empty payload fabricates nothing — the budgets/adjust empty state"],
    [`} catch (e) {\n  throw e;\n}`, false, "a bare rethrow returns nothing at all"],
  ];
  let bad = 0;
  for (const [src, shouldFlag, why] of CASES) {
    if (flags(src) === shouldFlag) continue;
    bad++;
    console.log(`  SELF-TEST FAIL: expected ${shouldFlag ? "FLAG" : "PASS"} — ${why}`);
  }
  console.log(
    bad === 0
      ? `audit:mocks self-test PASSED — ${CASES.length}/${CASES.length} detector cases correct.`
      : `audit:mocks self-test FAILED — ${bad} of ${CASES.length} cases wrong.`,
  );
  process.exit(bad === 0 ? 0 : 1);
}

/**
 * THIRD DETECTOR — a service the route CALLS may fabricate while the route
 * itself is clean.
 *
 * The first two detectors only ever opened route.ts. A route whose whole body is
 * `return NextResponse.json(await svc.get(user.id))` has no Math.random() and no
 * catch-fallback, so it passed — no matter what svc.get did.
 *
 * That is not hypothetical. src/lib/federal-integration-service.ts is a mock
 * feeding SIX routes (/api/student-loans, /api/federal/check-eligibility,
 * /track-application, /submit-application, /api/federal-programs). Its
 * retrieveNSLDSData always returns `loans: []`, and checkFreshStartEligibility
 * returns `eligible: true` UNCONDITIONALLY — a fabricated eligibility
 * determination about a real federal student-loan programme, shown to every
 * user who asks. audit:mocks reported PASSED the whole time.
 *
 * Reachability is transitive; a gate that stops at the route boundary measures
 * the wrong thing.
 *
 * WHAT IT LOOKS FOR. Not "is this code fake" — that is undecidable by regex.
 * It looks for the code SAYING SO: a `// Mock implementation` / `// In a real
 * app` / `// In production this would` comment whose next executable line
 * returns a LITERAL. The codebase already admits where it is fake in 114 places;
 * nothing was reading those admissions.
 *
 * Requiring a literal return is what keeps it precise. A comment describing a
 * mock that was REMOVED sits above real code (a call, a query, an await), and
 * trading/signals/route.ts documents exactly such a removal — it must stay
 * clean.
 */
const STUB_ADMISSION =
  /^\s*\/\/\s*(mock implementation|in a real app|in production,? this would|placeholder|stub implementation|for now,? (?:return|we)|simulated?\b)/i;

/** `return` of a literal value, not of a call or an await. */
const RETURNS_LITERAL = /^\s*return\s*(\{|\[|true\b|false\b|null\b|["'`]|-?\d)/;

const IMPORT = /from\s+["']([^"']+)["']/g;
const CANDIDATE_EXT = [".ts", ".tsx", "/index.ts", "/index.tsx"];

/** Resolve an import specifier to a real file under src/, or null. */
function resolveImport(spec, fromFile) {
  let base;
  if (spec.startsWith("@/")) base = join(ROOT, "src", spec.slice(2));
  else if (spec.startsWith(".")) base = join(fromFile, "..", spec);
  else return null; // node_modules — not ours to audit
  for (const ext of ["", ...CANDIDATE_EXT]) {
    const p = base + ext;
    try {
      if (statSync(p).isFile()) return p;
    } catch {}
  }
  return null;
}

/**
 * Every first-party module reachable from the route files, with the route that
 * reached it first. Depth-capped: the fabrication that matters to a response is
 * near the route, and an uncapped walk pulls in most of src/.
 */
function reachableModules(routeFiles, maxDepth = 3) {
  const seen = new Map();
  let frontier = routeFiles.map((f) => ({ file: f, origin: relative(ROOT, f) }));
  for (let depth = 0; depth < maxDepth; depth++) {
    const next = [];
    for (const { file, origin } of frontier) {
      let text;
      try {
        text = readFileSync(file, "utf8");
      } catch {
        continue;
      }
      for (const m of text.matchAll(IMPORT)) {
        const target = resolveImport(m[1], file);
        if (!target || seen.has(target)) continue;
        if (/__tests__|\.test\.|\.spec\./.test(target)) continue;
        if (/[/\\]app[/\\]api[/\\]/.test(target)) continue; // routes: detectors 1-2
        seen.set(target, origin);
        next.push({ file: target, origin });
      }
    }
    frontier = next;
    if (!frontier.length) break;
  }
  return seen;
}

/**
 * Math.random() in a module an API route calls.
 *
 * Detector 1 blocks this inside route.ts and always has. It turns out the same
 * defect was sitting one directory over, untouched: 186 sites across 34
 * route-reachable modules. crypto-analyst.ts:319 is the clearest — its own
 * comment reads "For now, return realistic mock data", and it returns
 * activeAddresses24h: Math.floor(Math.random() * 100000) + 10000 as on-chain
 * analytics. A user reading that has no way to know it is a die roll.
 *
 * Counted PER FILE rather than per line, and the baseline stores the count, so
 * the number may only fall. Per-file-presence alone would let a new fabrication
 * slip into an already-listed file for free.
 */
function randomSites(file) {
  const lines = readFileSync(file, "utf8").split("\n");
  let n = 0;
  lines.forEach((line, i) => {
    if (/^\s*(\/\/|\*)/.test(line)) return; // a comment describing one
    if (!RANDOM.test(line)) return;
    const window = lines.slice(Math.max(0, i - 3), i + 1).join("\n");
    if (MARKER.test(window)) return;
    n++;
  });
  return n;
}

function stubAdmissions(file) {
  const lines = readFileSync(file, "utf8").split("\n");
  const hits = [];
  for (let i = 0; i < lines.length; i++) {
    if (!STUB_ADMISSION.test(lines[i])) continue;
    // Next executable line — skip blanks and further comment lines.
    let j = i + 1;
    while (j < lines.length && /^\s*(\/\/|$)/.test(lines[j])) j++;
    if (j < lines.length && RETURNS_LITERAL.test(lines[j])) {
      hits.push({ line: i + 1, admission: lines[i].trim().slice(0, 64) });
    }
  }
  return hits;
}

const randomOffenders = [];
const fallbackOffenders = [];
const stubOffenders = [];

for (const file of walk(API)) {
  const rel = relative(ROOT, file);
  const raw = readFileSync(file, "utf8");
  const text = stripComments(raw);
  const lines = text.split("\n");

  lines.forEach((line, i) => {
    if (!RANDOM.test(line)) return;
    const window = raw.split("\n").slice(Math.max(0, i - 3), i + 1).join("\n");
    if (MARKER.test(window)) return;
    randomOffenders.push(`${rel}:${i + 1}  ${raw.split("\n")[i].trim().slice(0, 72)}`);
  });

  // Every catch block, brace-counted.
  //
  // The previous extractor was /catch...\{[\s\S]{0,600}?\n\s{2,4}\}/, which
  // requires a newline and 2-4 spaces before the closing brace. An adversarial
  // review proved by execution that a ONE-LINE catch therefore never matched at
  // all — not "was analysed and passed", but never entered the analysis:
  //
  //     } catch (e) { return NextResponse.json({ data: MOCK_SCORES }); }
  //
  // It also truncated at 600 characters and mis-handled nesting. A brace
  // counter has none of those failure modes.
  for (const block of catchBlocks(text)) {
    const bad = unsignalledReturn(block);
    if (!bad) continue;
    const line = text.slice(0, block.index).split("\n").length;
    fallbackOffenders.push(
      `${rel}:${line}  catch returns a payload with no failure signal: ${bad}`,
    );
  }
}

// Detector 3: self-admitted stubs in the modules those routes call.
const ROUTE_FILES = walk(API);
const REACHED = reachableModules(ROUTE_FILES);
const randomInModules = new Map(); // relPath -> { count, origin }
for (const [file, origin] of REACHED) {
  for (const hit of stubAdmissions(file)) {
    stubOffenders.push({
      key: `${relative(ROOT, file)}:${hit.line}`,
      origin,
      admission: hit.admission,
    });
  }
  const n = randomSites(file);
  if (n > 0) randomInModules.set(relative(ROOT, file), { count: n, origin });
}

/**
 * Shrink-only baseline, same contract as audit:web-api.
 *
 * 114 self-admissions exist across 65 files today. Failing the build on all of
 * them at once would get the gate switched off within a day, and quietly
 * dropping them would be the false green this detector exists to end. So the
 * existing set is recorded with a reason each and may only ever get smaller;
 * anything NEW fails immediately.
 */
const STUB_BASELINE = join(ROOT, "scripts", "mocks-baseline.json");
let baselineKeys = new Set();
let baselineWhy = {};
try {
  const b = JSON.parse(readFileSync(STUB_BASELINE, "utf8"));
  baselineKeys = new Set(b.stubs || []);
  baselineWhy = b.why || {};
} catch {}

const newStubs = stubOffenders.filter((s) => !baselineKeys.has(s.key));
const stillPresent = new Set(stubOffenders.map((s) => s.key));
const fixedStubs = [...baselineKeys].filter((k) => !stillPresent.has(k));

// Randomness in reachable modules: the baseline stores a COUNT per file, so a
// new site inside an already-listed file still fails. Presence-only would hand
// out a free pass to every future fabrication in ai-stock-analyst.ts.
let randomBaseline = {};
try {
  randomBaseline = JSON.parse(readFileSync(STUB_BASELINE, "utf8")).randomInModules || {};
} catch {}
const randomRegressions = [];
for (const [file, { count, origin }] of randomInModules) {
  const allowed = randomBaseline[file];
  if (allowed === undefined) {
    randomRegressions.push(`${file} — ${count} site(s), NEW file (reached from ${origin})`);
  } else if (count > allowed) {
    randomRegressions.push(`${file} — ${count} site(s), baseline allows ${allowed}`);
  }
}
const randomImproved = Object.entries(randomBaseline).filter(
  ([f, n]) => (randomInModules.get(f)?.count ?? 0) < n,
);

const total =
  randomOffenders.length +
  fallbackOffenders.length +
  newStubs.length +
  randomRegressions.length;
console.log(
  `audit:mocks — scanned ${ROUTE_FILES.length} API route(s) and ${REACHED.size} module(s) they reach`,
);
console.log(
  `  self-admitted stubs reachable from a route: ${stubOffenders.length} (${baselineKeys.size} baselined, ${newStubs.length} new)`,
);
if (fixedStubs.length) {
  console.log(
    `  ${fixedStubs.length} baselined stub(s) no longer present — prune them from scripts/mocks-baseline.json:`,
  );
  fixedStubs.forEach((k) => console.log(`    ${k}`));
}
const randomTotal = [...randomInModules.values()].reduce((a, b) => a + b.count, 0);
console.log(
  `  Math.random() in route-reachable modules: ${randomTotal} site(s) across ${randomInModules.size} file(s)`,
);
if (randomImproved.length) {
  console.log(`  ${randomImproved.length} file(s) improved — lower the counts in scripts/mocks-baseline.json:`);
  randomImproved.forEach(([f, n]) =>
    console.log(`    ${f}: ${randomInModules.get(f)?.count ?? 0} now, baseline says ${n}`),
  );
}
if (randomRegressions.length) {
  console.log(`\naudit:mocks FAILED — randomness grew in ${randomRegressions.length} reachable module(s):\n`);
  randomRegressions.forEach((r) => console.log(`    ${r}`));
  console.log(
    `\nMath.random() in a module an API route calls reaches the user exactly as it` +
      `\nwould from the route itself. Detector 1 has blocked this in route.ts all` +
      `\nalong; the same defect one directory over is the same defect.`,
  );
}

if (newStubs.length) {
  console.log(`\naudit:mocks FAILED — ${newStubs.length} NEW self-admitted stub(s) on a route path:\n`);
  for (const s of newStubs) {
    console.log(`    ${s.key}`);
    console.log(`      ${s.admission}`);
    console.log(`      reached from ${s.origin}`);
  }
  console.log(
    `\nThis code says it is a mock and an API route calls it, so a user reads its` +
      `\noutput as real. Implement it, or make the route return an honest error.`,
  );
}

if (total === 0) {
  console.log(
    "audit:mocks PASSED — no NEW fabricated data in an API response path." +
      (stubOffenders.length
        ? `\n${stubOffenders.length} self-admitted stub(s) remain baselined in scripts/mocks-baseline.json.` +
          `\nThat is tracked debt, NOT a pass: each one is a route serving invented data today.`
        : ""),
  );
  process.exit(0);
}

const inRoute = randomOffenders.length + fallbackOffenders.length;
if (inRoute) console.log(`\naudit:mocks FAILED — ${inRoute} fabrication site(s) in a route:\n`);

if (randomOffenders.length) {
  console.log("  Math.random() in a route (reported to the user as real):");
  randomOffenders.forEach((o) => console.log(`    ${o}`));
}
if (fallbackOffenders.length) {
  console.log("\n  catch block returning data instead of an error (silent fallback):");
  fallbackOffenders.forEach((o) => console.log(`    ${o}`));
}

if (inRoute) {
  console.log(
    `\nA fabricated number is indistinguishable from a real one to the person` +
      `\nreading it. Query the data, or return an error — never invent it.` +
      `\n\nIf randomness genuinely is not reported data (a nonce, a sample id):` +
      `\n  // mock-audit: not-user-data — <why>`,
  );
}
process.exit(1);
