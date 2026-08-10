#!/usr/bin/env node
/**
 * Reachability audit — which modules can a real request actually reach?
 *
 * "Does anything import this file?" is the wrong question and gives a wrong
 * answer. Two ways it lies, both observed here:
 *
 *   1. A module imported ONLY by its own test looks imported. It is not
 *      reachable — nothing a user does will ever execute it. `points-rewards-
 *      service.ts` is imported by exactly one file, `__tests__/points-rewards-
 *      service.test.ts`, and a name-matching orphan check called it live.
 *   2. A module imported only by another unreachable module looks imported.
 *      Unreachability is transitive and a per-file check cannot see it.
 *
 * So this walks the graph FORWARD from the entry points Next.js actually
 * executes — route handlers, pages, layouts, middleware, instrumentation — and
 * marks what is transitively reachable through non-test imports. Everything
 * else is dead on arrival regardless of how many files mention it.
 *
 * Resolution is deliberately conservative: an unresolved import specifier is
 * counted as a MISS and printed, never silently dropped. An over-reporting
 * reachability audit is useless — it is the misses that matter.
 */

const { readFileSync, readdirSync, statSync, existsSync } = require("fs");
const { join, relative, dirname, resolve } = require("path");

const ROOT = join(__dirname, "..");
const SRC = join(ROOT, "src");
const EXT = [".ts", ".tsx", ".js", ".jsx"];
const SKIP = /node_modules|\.next|dist|coverage|ios\.bak|[/\\]Pods[/\\]/;

const isTest = (p) => /__tests__|__mocks__|\.test\.|\.spec\.|setupTests/.test(p);

// What Next.js runs without anyone importing it.
const ENTRY =
  /src[/\\](middleware|instrumentation)\.(ts|tsx|js)$|src[/\\]app[/\\].*[/\\]?(page|route|layout|template|default|loading|error|not-found|global-error|sitemap|robots|opengraph-image|icon|apple-icon)\.(ts|tsx|js|jsx)$/;

/** Build/deploy manifests that can name a .ts entry point Next.js knows nothing about. */
function walkConfigs(dir, out = [], depth = 0) {
  // Depth 8, not 4. The Fly.io Dockerfile lives at
  // src/lib/trading/autonomous/deploy/Dockerfile — depth 5 — so a limit of 4
  // found zero manifests and silently changed nothing, which reads exactly like
  // "there were none to find".
  if (depth > 8) return out;
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const e of entries) {
    const p = join(dir, e);
    if (SKIP.test(p)) continue;
    let st;
    try {
      st = statSync(p);
    } catch {
      continue;
    }
    if (st.isDirectory()) walkConfigs(p, out, depth + 1);
    else if (/^(Dockerfile|fly\.toml|package\.json|Procfile)/.test(e)) out.push(p);
  }
  return out;
}

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const e of entries) {
    const p = join(dir, e);
    if (SKIP.test(p)) continue;
    let st;
    try {
      st = statSync(p);
    } catch {
      continue;
    }
    if (st.isDirectory()) walk(p, out);
    else if (EXT.some((x) => p.endsWith(x))) out.push(p);
  }
  return out;
}

/** Resolve a specifier to an on-disk file, or null. */
function resolveSpec(spec, fromFile) {
  let base;
  if (spec.startsWith("@/")) base = join(SRC, spec.slice(2));
  else if (spec.startsWith(".")) base = resolve(dirname(fromFile), spec);
  else return null; // bare package — not our code

  const cands = [
    base,
    ...EXT.map((e) => base + e),
    ...EXT.map((e) => join(base, "index" + e)),
  ];
  for (const c of cands) {
    if (existsSync(c)) {
      try {
        if (statSync(c).isFile()) return c;
      } catch {
        /* fall through */
      }
    }
  }
  return null;
}

const SPEC_RE =
  /(?:\bfrom\s*|\bimport\s*\(\s*|\brequire\s*\(\s*)["']([^"']+)["']/g;

function main() {
  const all = walk(SRC).filter((f) => !SKIP.test(f));
  const product = all.filter((f) => !isTest(f));

  const edges = new Map(); // file -> [file]
  const unresolved = [];
  for (const f of product) {
    const text = readFileSync(f, "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/[^\n]*/g, "");
    const outs = [];
    for (const m of text.matchAll(SPEC_RE)) {
      const spec = m[1];
      if (!spec.startsWith(".") && !spec.startsWith("@/")) continue;
      const t = resolveSpec(spec, f);
      if (t) outs.push(t);
      else unresolved.push(`${relative(ROOT, f)} -> ${spec}`);
    }
    edges.set(f, outs);
  }

  // Next.js is not the only thing that starts a process here. Any .ts path named
  // by a Dockerfile, fly.toml, or a package.json script is ALSO an entry point,
  // and treating it as dead is a false positive with real consequences:
  // src/lib/trading/autonomous/standalone-server.ts has zero src/ importers by
  // design — it is bundled by `npx esbuild` at
  // src/lib/trading/autonomous/deploy/Dockerfile:22 and deployed to Fly.io as
  // its own service. A reachability audit that only knows about `src/app`
  // reports a live production entry point, and everything only it imports, as
  // unreachable.
  const extraEntries = new Set();
  for (const cfg of walkConfigs(ROOT)) {
    let text;
    try {
      text = readFileSync(cfg, "utf8");
    } catch {
      continue;
    }
    for (const m of text.matchAll(/([\w./-]*src\/[\w./-]+\.tsx?)/g)) {
      const abs = join(ROOT, m[1]);
      if (existsSync(abs)) extraEntries.add(abs);
    }
  }

  const entries = [
    ...product.filter((f) => ENTRY.test(f)),
    ...[...extraEntries].filter((f) => !isTest(f)),
  ];
  const seen = new Set();
  const stack = [...entries];
  while (stack.length) {
    const f = stack.pop();
    if (seen.has(f)) continue;
    seen.add(f);
    for (const t of edges.get(f) || []) if (!seen.has(t)) stack.push(t);
  }

  const dead = product.filter((f) => !seen.has(f)).sort();

  console.log(`product (non-test) modules : ${product.length}`);
  console.log(`entry points               : ${entries.length} (incl. ${extraEntries.size} from build manifests)`);
  console.log(`reachable from an entry    : ${seen.size}`);
  console.log(`UNREACHABLE                : ${dead.length}`);
  console.log(`unresolved specifiers      : ${unresolved.length}\n`);

  for (const f of dead) console.log(`  ${relative(ROOT, f)}`);

  if (unresolved.length) {
    console.log(`\nUNRESOLVED (counted as misses, not dropped):`);
    for (const u of unresolved.slice(0, 20)) console.log(`  ${u}`);
    if (unresolved.length > 20) {
      console.log(`  ... +${unresolved.length - 20} more`);
    }
  }
}

if (require.main === module) main();
module.exports = { main };
