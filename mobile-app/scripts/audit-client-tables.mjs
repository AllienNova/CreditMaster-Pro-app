#!/usr/bin/env node
/**
 * audit:client-tables — the mobile client must not query privileged tables.
 *
 * WHY A SCRIPT AND NOT A TEST. The mobile suite mocks the Supabase client
 * wholesale, so a `.from("profiles")` that the database refuses at runtime
 * passes every one of its 1,200 tests. This was not hypothetical: on the first
 * simulator run, five call sites in authStore plus one in app/profile/
 * settings.tsx were all returning
 *
 *   {"code":"42501","message":"permission denied for table profiles"}
 *
 * Onboarding state could be neither read nor recorded, a user's profile edits
 * were silently discarded, and an account-deletion request errored out. Nothing
 * in CI noticed, because nothing in CI talks to Postgres.
 *
 * THE RULE. This project grants the `authenticated` role NOTHING on the tables
 * below; server routes reach them with the service role behind withAuth. A
 * client-side query against one is therefore always a bug — either it fails
 * loudly today, or someone "fixes" it with a GRANT and hands every client
 * direct table access.
 *
 * Exit 0 clean, 1 on any occurrence.
 */

import { readdirSync, statSync, readFileSync, existsSync } from "fs";
import { join, relative } from "path";

const ROOT = process.cwd();

/**
 * Tables the client must never touch directly.
 *
 * Deliberately a small, justified list rather than "every table": the point is
 * to name the ones whose grants are known to exclude `authenticated`, so a
 * failure here is always real and never noise someone learns to ignore.
 */
const FORBIDDEN = ["profiles", "subscriptions", "credit_reports", "user_credits"];

/** `.from("x")` and `.from('x')`, and the rpc equivalent. */
const CALL = /\.\s*from\s*\(\s*["'`]([a-z_]+)["'`]\s*\)/g;

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    if (["node_modules", ".expo", "__tests__", "__mocks__"].includes(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(entry) && !/\.(test|spec)\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

const hits = [];
for (const file of [...walk(join(ROOT, "src")), ...walk(join(ROOT, "app"))]) {
  const text = readFileSync(file, "utf8");
  const lines = text.split("\n");
  for (const m of text.matchAll(CALL)) {
    if (!FORBIDDEN.includes(m[1])) continue;
    const line = text.slice(0, m.index).split("\n").length;
    hits.push({
      file: relative(ROOT, file),
      line,
      table: m[1],
      src: (lines[line - 1] ?? "").trim().slice(0, 80),
    });
  }
}

// Self-test: the matcher must catch the real shapes and not over-reach.
if (process.argv.includes("--self-test")) {
  const cases = [
    ['supabase.from("profiles")', true],
    ["supabase.from('profiles')", true],
    ['supabase\n  .from("profiles")', true],
    ['supabase.from( "profiles" )', true],
    ['supabase.from("budgets")', false],
    // A receiver is REQUIRED. A bare `from("x")` is not a Supabase query in
    // this codebase, and matching it would flag `Array.from(...)`.
    ['from("profiles")', false],
    ['"profiles"', false],
    ['api.get("/profile")', false],
  ];
  let bad = 0;
  for (const [src, want] of cases) {
    const got = [...src.matchAll(CALL)].some((m) => FORBIDDEN.includes(m[1]));
    if (got !== want) {
      bad++;
      console.log(`  self-test MISS: ${JSON.stringify(src)} expected ${want}, got ${got}`);
    }
  }
  console.log(
    bad === 0
      ? `audit:client-tables self-test PASSED — ${cases.length}/${cases.length} cases correct.`
      : `audit:client-tables self-test FAILED — ${bad} case(s) wrong.`,
  );
  if (bad > 0) process.exit(1);
}

console.log(
  `audit:client-tables — ${FORBIDDEN.length} privileged table(s), ${hits.length} client-side query(ies)`,
);

if (hits.length > 0) {
  console.log("\naudit:client-tables FAILED — the client cannot read these:\n");
  for (const h of hits) console.log(`  ${h.file}:${h.line}  ${h.table}\n      ${h.src}`);
  console.log(
    "\nThese return 42501 at runtime and pass every test, because the test" +
      "\nsuite mocks the Supabase client. Route them through a server endpoint" +
      "\n(withAuth + service role), as GET /api/profile and" +
      "\nPOST /api/onboarding/complete do. Do NOT fix this with a GRANT.",
  );
  process.exit(1);
}

console.log("audit:client-tables PASSED — no client-side query against a privileged table.");
