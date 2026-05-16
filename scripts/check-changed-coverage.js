#!/usr/bin/env node

/**
 * Changed-Code Coverage Gate
 *
 * Enforces >= 85% coverage on the lines actually added or modified on the
 * current branch — true diff coverage, not whole-file coverage. Editing one
 * line of a legacy file gates that one line, not the other 1,200.
 *
 * A changed line counts only if it carries executable code (a statement or a
 * branch). Comments, type annotations, blank lines, and imports contribute
 * nothing to the denominator. A file whose changed lines are all non-executable
 * passes automatically.
 *
 * Run with: npm run test:coverage:changed
 * Optional base ref override: BASE_REF=origin/develop npm run test:coverage:changed
 *
 * Uses execFileSync (no shell) — all arguments are passed as arrays.
 */

const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const THRESHOLD = 85;
const COVERAGE_PATH = path.join(process.cwd(), "coverage", "coverage-final.json");

function git(args) {
  return execFileSync("git", args, { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim();
}

function resolveBaseRef() {
  if (process.env.BASE_REF) return process.env.BASE_REF;
  for (const ref of ["origin/main", "main", "origin/master", "master"]) {
    try {
      git(["rev-parse", "--verify", "--quiet", ref]);
      return ref;
    } catch {
      /* try next */
    }
  }
  return null;
}

// jest collectCoverageFrom exclusions — keep in sync with jest.config.js
function isGatedSource(file) {
  if (!/^src\/.*\.(js|jsx|ts|tsx)$/.test(file)) return false;
  if (/\.d\.ts$/.test(file)) return false;
  if (/\/__tests__\/|\/__mocks__\/|\.test\.|\.spec\./.test(file)) return false;
  if (/\.stories\./.test(file)) return false;
  if (/^src\/types\//.test(file)) return false;
  if (file === "src/middleware.ts" || file === "src/setupTests.ts") return false;
  if (/\/(layout|loading|error|not-found)\.tsx$/.test(file)) return false;
  return true;
}

// Map of gated file -> Set of line numbers added/modified in the working tree.
function changedLinesByFile() {
  const base = resolveBaseRef();
  // `git diff <base>` compares base to the working tree (covers committed +
  // staged + unstaged). Untracked files are added separately as whole files.
  const diff = git(["diff", "--unified=0", "--diff-filter=ACMR", base || "HEAD"]);
  const result = new Map();

  let current = null;
  for (const line of diff.split("\n")) {
    const fileMatch = line.match(/^\+\+\+ b\/(.+)$/);
    if (fileMatch) {
      current = isGatedSource(fileMatch[1]) ? fileMatch[1] : null;
      continue;
    }
    if (!current) continue;
    const hunk = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/);
    if (hunk) {
      const start = Number(hunk[1]);
      const count = hunk[2] === undefined ? 1 : Number(hunk[2]);
      if (count === 0) continue; // pure deletion — no new lines
      const set = result.get(current) ?? new Set();
      for (let l = start; l < start + count; l++) set.add(l);
      result.set(current, set);
    }
  }

  for (const f of git(["ls-files", "--others", "--exclude-standard"]).split("\n")) {
    const file = f.trim();
    if (!file || !isGatedSource(file) || !fs.existsSync(file)) continue;
    const lineCount = fs.readFileSync(file, "utf8").split("\n").length;
    const set = new Set();
    for (let l = 1; l <= lineCount; l++) set.add(l);
    result.set(file, set);
  }

  return { base, files: result };
}

// Count covered/total executable points (statements + branches) on changed lines.
function diffCoverage(entry, changedLines) {
  let covered = 0;
  let total = 0;

  for (const [id, loc] of Object.entries(entry.statementMap)) {
    if (loc.start && changedLines.has(loc.start.line)) {
      total++;
      if (entry.s[id] > 0) covered++;
    }
  }
  for (const [id, branch] of Object.entries(entry.branchMap)) {
    const locations = branch.locations ?? [];
    locations.forEach((bl, k) => {
      if (bl.start && changedLines.has(bl.start.line)) {
        total++;
        if ((entry.b[id]?.[k] ?? 0) > 0) covered++;
      }
    });
  }
  return { covered, total };
}

function main() {
  const { base, files } = changedLinesByFile();

  if (files.size === 0) {
    console.log("Changed-code coverage gate: no gated source files changed — PASS.");
    return;
  }

  console.log(`Changed-code coverage gate (>= ${THRESHOLD}% of changed executable lines)`);
  console.log(`Base ref: ${base || "(none — working tree only)"}`);
  console.log(`Files under gate: ${files.size}`);

  const jestArgs = ["jest", "--coverage", "--coverageReporters=json", "--silent"];
  for (const f of files.keys()) jestArgs.push(`--collectCoverageFrom=${f}`);

  const mtimeBefore = fs.existsSync(COVERAGE_PATH) ? fs.statSync(COVERAGE_PATH).mtimeMs : 0;
  try {
    execFileSync("npx", jestArgs, { stdio: ["pipe", "ignore", "inherit"] });
  } catch {
    // jest exits non-zero when its global coverageThreshold (jest.config.js) is
    // not met for this restricted file set — expected. This gate enforces a
    // per-changed-line threshold instead, computed below from coverage data.
  }
  if (!fs.existsSync(COVERAGE_PATH) || fs.statSync(COVERAGE_PATH).mtimeMs <= mtimeBefore) {
    console.error("jest did not produce a fresh coverage-final.json — aborting.");
    process.exit(1);
  }

  const coverage = JSON.parse(fs.readFileSync(COVERAGE_PATH, "utf8"));
  const failures = [];

  for (const [file, changedLines] of files) {
    const entry = coverage[path.resolve(file)];
    if (!entry) {
      console.log(`  FAIL  no coverage data (no test exercises this file)  ${file}`);
      failures.push({ file, reason: "no coverage data" });
      continue;
    }
    const { covered, total } = diffCoverage(entry, changedLines);
    if (total === 0) {
      console.log(`  PASS  no executable code on changed lines  ${file}`);
      continue;
    }
    const pct = (covered / total) * 100;
    const ok = pct >= THRESHOLD;
    console.log(`  ${ok ? "PASS" : "FAIL"}  ${pct.toFixed(1)}% of ${total} changed point(s)  ${file}`);
    if (!ok) failures.push({ file, reason: `${pct.toFixed(1)}% (${covered}/${total})` });
  }

  if (failures.length > 0) {
    console.error(`\nChanged-code coverage gate FAILED — ${failures.length} file(s) below ${THRESHOLD}%:`);
    for (const f of failures) console.error(`  - ${f.file}: ${f.reason}`);
    console.error("\nAdd tests covering the changed lines above, then re-run.");
    process.exit(1);
  }

  console.log(`\nChanged-code coverage gate PASSED — all changed lines >= ${THRESHOLD}%.`);
}

main();
