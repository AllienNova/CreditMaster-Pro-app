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

const randomOffenders = [];
const fallbackOffenders = [];

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

  // A catch that INSPECTS the error and rethrows what it does not recognise is
  // correct handling, not a silent fallback: financial/budgets/adjust returns
  // an explicit `hasBudget: false` empty state for "no active budget found" and
  // `throw error` for anything else. Flagging that was a false positive — the
  // defect is a BLANKET swallow, so require the block to have neither a rethrow
  // nor an error inspection before reporting it.
  const catchBlocks = text.match(/catch\s*(?:\([^)]*\))?\s*\{[\s\S]{0,600}?\n\s{2,4}\}/g) || [];
  const blanket = catchBlocks.some(
    (b) =>
      /NextResponse\.json\s*\(\s*\{(?![^}]*(error|degraded|warning|success:\s*false))/.test(b) &&
      !/\bthrow\b/.test(b) &&
      !/error\s*(instanceof|\.message|\.code)/.test(b),
  );
  if (blanket) {
    const idx = text.search(CATCH_RETURNS_DATA);
    const line = text.slice(0, idx).split("\n").length;
    fallbackOffenders.push(`${rel}:${line}  catch swallows and returns a payload`);
  }
}

const total = randomOffenders.length + fallbackOffenders.length;
console.log(`audit:mocks — scanned ${walk(API).length} API route(s)`);

if (total === 0) {
  console.log("audit:mocks PASSED — no fabricated data in an API response path.");
  process.exit(0);
}

console.log(`\naudit:mocks FAILED — ${total} fabrication site(s):\n`);

if (randomOffenders.length) {
  console.log("  Math.random() in a route (reported to the user as real):");
  randomOffenders.forEach((o) => console.log(`    ${o}`));
}
if (fallbackOffenders.length) {
  console.log("\n  catch block returning data instead of an error (silent fallback):");
  fallbackOffenders.forEach((o) => console.log(`    ${o}`));
}

console.log(
  `\nA fabricated number is indistinguishable from a real one to the person` +
    `\nreading it. Query the data, or return an error — never invent it.` +
    `\n\nIf randomness genuinely is not reported data (a nonce, a sample id):` +
    `\n  // mock-audit: not-user-data — <why>`,
);
process.exit(1);
