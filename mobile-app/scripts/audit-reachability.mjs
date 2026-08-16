#!/usr/bin/env node
/**
 * audit:reachability — every screen must be reachable by TAPPING.
 *
 * The mobile counterpart of the web gate. audit:links proves every link
 * resolves to a screen that exists; it cannot see a screen with NO link
 * pointing at it, because that screen is never in its input.
 *
 * When this was written, 131 of 232 screens were in exactly that state. The
 * tab bar holds nine destinations against 24 feature areas, so everything else
 * was reachable only where some screen happened to link it inline — the whole
 * of trading, tax, the marketplace and rewards could be opened only by typing
 * a deep link.
 *
 * ENTRY POINTS ARE THE TAB BAR, not a hardcoded list. A screen registered as a
 * <Tabs.Screen name="x"/> is reachable by definition — the user taps it — so
 * the tab layout is parsed rather than guessed. Getting that wrong reports the
 * More tab itself as unreachable, which is how this gate first scored it.
 *
 * Exit 0 clean, 1 when a screen cannot be reached.
 */

import { readdirSync, statSync, readFileSync, writeFileSync, existsSync } from "fs";
import { join, relative, dirname } from "path";

const ROOT = process.cwd();
const APP = join(ROOT, "app");
const BASELINE = join(ROOT, "scripts", "reachability-baseline.json");

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (!["node_modules", ".expo", "__tests__"].includes(entry)) walk(full, out);
    } else if (/\.tsx?$/.test(entry) && !/\.(test|spec)\.tsx?$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

/** expo-router path for a screen file; groups "(x)" never appear in the URL. */
function routeOf(file) {
  const rel = relative(APP, file).replace(/\.tsx?$/, "");
  const parts = rel.split(/[\\/]/).filter((s) => !/^\(.*\)$/.test(s));
  if (parts[parts.length - 1] === "index") parts.pop();
  return "/" + parts.join("/");
}

const screens = new Map();
for (const f of walk(APP)) {
  const base = f.split(/[\\/]/).pop();
  if (base.startsWith("_")) continue;
  const r = routeOf(f);
  if (r) screens.set(r, f);
}

const WILDCARD = " ";
const LINK =
  /(?:href\s*[=:]\s*\{?\s*|router\.(?:push|replace|navigate)\s*\(\s*|route:\s*)["'`](\/[^"'`\s]*)/g;

function linksIn(text) {
  const out = new Set();
  for (const m of text.matchAll(LINK)) {
    const path =
      "/" +
      m[1]
        .replace(/\$\{[^}]*\}/g, WILDCARD)
        .split("?")[0]
        .split("/")
        .filter((s) => s && !/^\(.*\)$/.test(s))
        .join("/");
    if (path.includes("${") || path.includes("`")) continue;
    out.add(path.replace(/\/$/, "") || "/");
  }
  return out;
}

function resolve(link) {
  if (screens.has(link)) return link;
  const lp = link.split("/");
  for (const r of screens.keys()) {
    const rp = r.split("/");
    if (rp.length !== lp.length) continue;
    const ok = rp.every((s, i) =>
      lp[i] === WILDCARD ? s.startsWith("[") : s.startsWith("[") || s === lp[i],
    );
    if (ok) return r;
  }
  return null;
}

/** Follow local imports so a link on a card inside a list inside a screen counts. */
const cache = new Map();
function resolveImport(from, spec) {
  const base = spec.startsWith("@/")
    ? join(ROOT, "src", spec.slice(2))
    : spec.startsWith(".")
      ? join(dirname(from), spec)
      : null;
  if (!base) return null;
  for (const ext of ["", ".tsx", ".ts", "/index.tsx", "/index.ts"]) {
    if (existsSync(base + ext) && statSync(base + ext).isFile()) return base + ext;
  }
  return null;
}
function componentLinks(file, seen = new Set()) {
  if (cache.has(file)) return cache.get(file);
  const out = new Set();
  const text = readFileSync(file, "utf8");
  for (const m of text.matchAll(/from\s+["']((?:@\/|\.).*?)["']/g)) {
    const dep = resolveImport(file, m[1]);
    if (!dep || seen.has(dep)) continue;
    seen.add(dep);
    for (const l of linksIn(readFileSync(dep, "utf8"))) out.add(l);
    for (const l of componentLinks(dep, seen)) out.add(l);
  }
  cache.set(file, out);
  return out;
}

// Entry points: the tab bar, plus the root screen.
const entries = new Set(["/"]);
const tabLayout = join(APP, "(tabs)", "_layout.tsx");
if (existsSync(tabLayout)) {
  for (const m of readFileSync(tabLayout, "utf8").matchAll(/name="([a-z0-9-]+)"/gi)) {
    const r = m[1] === "index" ? "/" : `/${m[1]}`;
    if (screens.has(r)) entries.add(r);
  }
}
// Anything a layout links is chrome, present on every screen beneath it.
for (const f of walk(APP)) {
  if (/_layout\.tsx$/.test(f)) for (const l of linksIn(readFileSync(f, "utf8"))) entries.add(l);
}

const seen = new Set();
const queue = [];
for (const e of entries) {
  const r = resolve(e);
  if (r && !seen.has(r)) {
    seen.add(r);
    queue.push(r);
  }
}
while (queue.length > 0) {
  const cur = queue.shift();
  const file = screens.get(cur);
  for (const l of new Set([...linksIn(readFileSync(file, "utf8")), ...componentLinks(file)])) {
    const r = resolve(l);
    if (r && !seen.has(r)) {
      seen.add(r);
      queue.push(r);
    }
  }
}

const unreachable = [...screens.keys()].filter((r) => !seen.has(r)).sort();

let baseline = [];
try {
  baseline = JSON.parse(readFileSync(BASELINE, "utf8")).unreachable ?? [];
} catch {
  baseline = [];
}

console.log(
  `audit:reachability — ${screens.size} screen(s), ${seen.size} reachable by tapping, ${unreachable.length} not`,
);

const regressions = unreachable.filter((r) => !baseline.includes(r));
const fixed = baseline.filter((r) => !unreachable.includes(r));

if (regressions.length > 0) {
  console.log(`\naudit:reachability FAILED — ${regressions.length} screen(s) newly unreachable:\n`);
  for (const r of regressions) console.log(`  ${r}`);
  console.log(
    `\nA screen nobody can tap is a feature nobody knows shipped. Add it to` +
      `\nsrc/navigation/primary-nav.ts, or link it from a screen already reachable.`,
  );
  process.exitCode = 1;
} else if (unreachable.length === 0) {
  console.log("audit:reachability PASSED — every screen is reachable by tapping.");
} else {
  console.log(
    `audit:reachability PASSED — no NEW unreachable screens.\n` +
      `${unreachable.length} remain in scripts/reachability-baseline.json as tracked debt.`,
  );
}

if (fixed.length > 0) {
  console.log(`\n${fixed.length} baselined screen(s) now reachable:\n` + fixed.map((r) => `  ${r}`).join("\n"));
}

/**
 * Rewrite the baseline, PRESERVING its prose.
 *
 * The first version serialized `{frozen, unreachable}` and nothing else, so
 * every rewrite silently deleted the `note` and the per-entry `why` — the
 * reasons are the only thing that distinguishes tracked debt from a screen
 * that went dark, and an unexplained list of paths is indistinguishable from
 * an alibi. Entries in `why` for now-reachable screens are dropped, since a
 * reason for a path no longer in the list is dead prose.
 */
function writeBaseline(next) {
  let prior = {};
  try {
    prior = JSON.parse(readFileSync(BASELINE, "utf8"));
  } catch {
    prior = {};
  }
  const why = Object.fromEntries(
    Object.entries(prior.why ?? {}).filter(([route]) => next.includes(route)),
  );
  const out = { ...prior, frozen: prior.frozen ?? "2026-08-16", unreachable: next };
  if (Object.keys(why).length > 0) out.why = why;
  else delete out.why;
  writeFileSync(BASELINE, JSON.stringify(out, null, 2) + "\n");
}

if (process.argv.includes("--write-baseline")) {
  // Shrink-only: a rewrite can never ADD an entry, so the commit that makes a
  // screen unreachable cannot also bless it.
  const kept = baseline.filter((r) => unreachable.includes(r));
  const next = process.argv.includes("--freeze") ? unreachable : kept;
  writeBaseline(next);
  console.log(`\nbaseline: ${baseline.length} -> ${next.length}`);
  process.exitCode = 0;
}
