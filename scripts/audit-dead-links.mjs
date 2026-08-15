#!/usr/bin/env node
/**
 * audit:links — every internal link must resolve to a route that exists.
 *
 * WHY THIS EXISTS, AND WHY THE DOGFOOD SWEEP MISSED IT. `dogfood-sweep.mjs`
 * enumerates routes FROM THE FILESYSTEM and visits each one. That proves every
 * page that exists renders — and it reported 204/204 ok. It cannot, even in
 * principle, find a LINK pointing at a route that does not exist, because the
 * link is not in its input.
 *
 * The user found six of them by clicking around. `/privacy`, `/support`,
 * `/dashboard/income`, `/financial/health`, `/demo` and
 * `/help/guides/credit-factors` were all live 404s for a signed-in user while
 * the sweep was green. Five of the six had a correct destination sitting right
 * there under a different path (`/privacy-policy`, `/help/contact`,
 * `/financial/income`, …) — they were not missing features, just wrong hrefs.
 *
 * This gate closes that hole: it reads the links the app actually offers and
 * resolves each against the real route table.
 *
 * Exit 0 clean, 1 with dead links.
 */

import { readdirSync, statSync, readFileSync } from "fs";
import { join, relative } from "path";

const ROOT = process.cwd();
const APP = join(ROOT, "src", "app");

/** Every page route Next will serve, derived from the filesystem. */
function collectRoutes(dir = APP, prefix = "") {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "__tests__") continue;
      const seg = /^\(.*\)$/.test(entry) ? "" : `/${entry}`;
      out.push(...collectRoutes(full, prefix + seg));
    } else if (entry === "page.tsx" || entry === "page.js") {
      out.push(prefix || "/");
    }
  }
  return out;
}

function walkSources(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (!["node_modules", ".next", "__tests__"].includes(entry)) walkSources(full, out);
    } else if (/\.tsx$/.test(entry) && !/\.test\.tsx$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

const routes = [...new Set(collectRoutes())];

/** A link matches a dynamic route when the segment counts and literals line up. */
function resolves(link) {
  if (routes.includes(link)) return true;
  const lp = link.split("/");
  return routes.some((r) => {
    const rp = r.split("/");
    return rp.length === lp.length && rp.every((s, i) => s.startsWith("[") || s === lp[i]);
  });
}

// href="/x", router.push("/x"), router.replace("/x"). Template literals with an
// interpolation are skipped — the path is not statically known.
const LINK = /(?:href\s*=\s*|router\.(?:push|replace)\s*\(\s*)["'`](\/[^"'`\s${}]*)["'`]/g;

const dead = new Map();
let linksSeen = 0;

for (const file of walkSources(join(ROOT, "src", "app")).concat(
  walkSources(join(ROOT, "src", "components")),
)) {
  const rel = relative(ROOT, file);
  const text = readFileSync(file, "utf8");

  for (const m of text.matchAll(LINK)) {
    const raw = m[1].split("?")[0].split("#")[0].replace(/\/$/, "") || "/";
    // API routes are handlers, not pages — a different gate's business.
    if (raw.startsWith("/api/")) continue;
    linksSeen++;
    if (resolves(raw)) continue;
    if (!dead.has(raw)) dead.set(raw, new Set());
    dead.get(raw).add(rel);
  }
}

console.log(`audit:links — ${linksSeen} internal link(s) against ${routes.length} page route(s)`);

if (dead.size === 0) {
  console.log("audit:links PASSED — every internal link resolves to a real route.");
  process.exit(0);
}

console.log(`\naudit:links FAILED — ${dead.size} link(s) point at routes that do not exist:\n`);
for (const [link, files] of dead) {
  console.log(`  ${link}`);
  for (const f of files) console.log(`      ${f}`);
}
console.log(
  `\nEach of these is a 404 for a real user. Check whether the destination` +
    `\nalready exists under another path before building a new page — five of the` +
    `\nsix found this way were simply the wrong href.`,
);
process.exit(1);
