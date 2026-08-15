#!/usr/bin/env node
/**
 * audit:bundle — no fabricated seed data or dev auth path in a PRODUCTION bundle.
 *
 * WHY GREP A BUILT BUNDLE RATHER THAN THE SOURCE. Source-level checks tell you
 * what is guarded; only the artefact tells you what SHIPS. `creditStore`,
 * `disputeStore` and `investmentStore` early-return `src/data/dev-seed.ts`
 * under `if (__DEV__)`, so the branch is dead in a release build — but the seed
 * module is a static import, and Metro does not tree-shake it out. The strings
 * are in the binary either way.
 *
 * That is the FND-064 shape: the protection is a BUILD-TIME FLAG, and the
 * payload is already on the device. One release built with dev mode on and a
 * real user sees a fabricated 731 credit score, an "Emergency Fund" that is not
 * theirs, and a "Your Experian score increased" alert about nothing.
 *
 * WHAT IT CHECKS
 *   - seed DATA strings (the user-visible fabrications) — always fatal
 *   - seed SYMBOLS (seedCreditScores, seedPortfolio, seedUser) — fatal
 *   - a dev auth bypass reaching the bundle
 *
 * Usage:
 *   node scripts/audit-bundle.mjs                  # export, then check
 *   node scripts/audit-bundle.mjs --bundle <path>  # check an existing bundle
 */

import { execFileSync } from "child_process";
import { readdirSync, existsSync, readFileSync } from "fs";
import { join } from "path";

const arg = (n, d = null) => {
  const i = process.argv.indexOf(`--${n}`);
  return i === -1 ? d : process.argv[i + 1];
};

const OUT_DIR = arg("out", "/tmp/fynvita-audit-bundle");
let bundlePath = arg("bundle");

/**
 * User-visible fabrications from src/data/dev-seed.ts.
 *
 * Deliberately DATA, not just identifiers: a minifier can rename
 * `seedCreditScores` but it cannot rename the literal string a user would read
 * on their dashboard. These are the ones that matter.
 *
 * Each string is verified UNIQUE to dev-seed.ts — it appears in no product
 * file. An earlier revision listed "Emergency Fund", which is real product copy
 * in six screens (goal templates, create-goal, recommendations) and reported a
 * false positive after the fix had actually worked. A fingerprint has to be a
 * fingerprint.
 */
const SEED_DATA_STRINGS = [
  "Your Experian score increased",
  "Credit Score Up!",
  "Chase Sapphire Balance",
  "Auto Loan - Honda Civic",
  "Ally High-Yield Savings",
  "Capital One Balance",
];

/** Seed module identifiers — cheaper to catch, and usually present. */
const SEED_SYMBOLS = ["seedCreditScores", "seedPortfolio", "seedUser", "dev-seed"];

/** A dev-only auth path must never reach a shipped bundle (FND-064). */
const DEV_AUTH_MARKERS = ["__DEV__ auth", "devLogin", "skipAuth", "mockUser"];

function exportBundle() {
  console.log("audit:bundle — exporting a production iOS bundle (this takes a minute)…");
  execFileSync(
    "npx",
    ["expo", "export", "--platform", "ios", "--output-dir", OUT_DIR],
    { stdio: ["ignore", "pipe", "pipe"], timeout: 900000 },
  );
  const dir = join(OUT_DIR, "_expo/static/js/ios");
  if (!existsSync(dir)) throw new Error(`no bundle directory at ${dir}`);
  const file = readdirSync(dir).find((f) => /\.(hbc|js)$/.test(f));
  if (!file) throw new Error(`no bundle artefact in ${dir}`);
  return join(dir, file);
}

if (!bundlePath) {
  try {
    bundlePath = exportBundle();
  } catch (e) {
    console.error(`audit:bundle FAILED — could not produce a bundle: ${e.message}`);
    process.exit(1);
  }
}

if (!existsSync(bundlePath)) {
  console.error(`audit:bundle FAILED — bundle not found: ${bundlePath}`);
  process.exit(1);
}

// Hermes bytecode still carries its string table verbatim, so a byte-level
// search finds user-visible literals without needing to disassemble.
const buf = readFileSync(bundlePath);
const haystack = buf.toString("latin1");
const count = (needle) => haystack.split(needle).length - 1;

const sizeMb = (buf.length / 1024 / 1024).toFixed(1);
console.log(`audit:bundle — ${bundlePath} (${sizeMb} MB)`);

const dataHits = SEED_DATA_STRINGS.map((s) => [s, count(s)]).filter(([, n]) => n > 0);
const symbolHits = SEED_SYMBOLS.map((s) => [s, count(s)]).filter(([, n]) => n > 0);
const authHits = DEV_AUTH_MARKERS.map((s) => [s, count(s)]).filter(([, n]) => n > 0);

const fail = dataHits.length || symbolHits.length || authHits.length;

if (!fail) {
  console.log("audit:bundle PASSED — no seed data, seed symbols or dev auth path in the production bundle.");
  process.exit(0);
}

console.log("\naudit:bundle FAILED — a production bundle must not carry any of this:\n");
if (dataHits.length) {
  console.log("  user-visible seed DATA (would render as the user's own finances):");
  dataHits.forEach(([s, n]) => console.log(`    ${n.toString().padStart(3)}x  ${s}`));
}
if (symbolHits.length) {
  console.log("  seed module symbols:");
  symbolHits.forEach(([s, n]) => console.log(`    ${n.toString().padStart(3)}x  ${s}`));
}
if (authHits.length) {
  console.log("  dev auth markers:");
  authHits.forEach(([s, n]) => console.log(`    ${n.toString().padStart(3)}x  ${s}`));
}

console.log(
  `\nThe \`if (__DEV__)\` guards keep this code from RUNNING in a release build,` +
    `\nbut they do not keep it out of the binary — Metro does not tree-shake a` +
    `\nstatic import. The protection is therefore a build-time flag over a payload` +
    `\nthat is already on the device (FND-064).` +
    `\n\nFix: load dev-seed behind a runtime require inside the __DEV__ branch so the` +
    `\nmodule is never in the production graph, or strip it with a babel transform.`,
);
process.exit(1);
