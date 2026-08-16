#!/usr/bin/env node
/**
 * audit:reachability — every page must be reachable by CLICKING.
 *
 * THE INVERSE OF audit:links, AND THE HOLE IT LEFT. audit:links proves every
 * link resolves to a page that exists. It cannot detect a page with NO link
 * pointing at it, because such a page is never in its input — exactly the
 * blind spot that let the original 404s through, turned around.
 *
 * The dogfood sweep could not find it either: it visits routes by walking the
 * filesystem, so it reached all 204 pages and reported them healthy. Neither
 * gate answers the only question a user asks — "can I get there?"
 *
 * When this was written the answer was mostly no. src/app/layout.tsx rendered
 * only <Providers>; <Header> was mounted on three marketing pages; BottomNav
 * and MobileNav existed and were rendered by nothing. 39 of 204 pages were
 * reachable by clicking. Trading, investing, chat, tax and the whole
 * marketplace could only be reached by typing a URL.
 *
 * REACHABILITY IS TRANSITIVE, which is why a simple "is it linked anywhere"
 * check is not enough: a page linked only FROM an unreachable page is itself
 * unreachable. This walks outward from the real entry points instead.
 *
 * Exit 0 clean, 1 when a page cannot be reached.
 */

import {
  readdirSync,
  statSync,
  readFileSync,
  writeFileSync,
  existsSync,
} from "fs";
import { join, relative } from "path";

const ROOT = process.cwd();
const APP = join(ROOT, "src", "app");
const BASELINE = join(ROOT, "scripts", "reachability-baseline.json");

/** Entry points a user can arrive at without clicking anything. */
const ENTRY_POINTS = ["/", "/dashboard"];

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (!["node_modules", ".next", "__tests__"].includes(entry)) walk(full, out);
    } else if (/\.tsx?$/.test(entry) && !/\.(test|spec)\.tsx?$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

/** Route path for a page.tsx, with Next route groups "(x)" removed. */
function routeOf(file) {
  const segs = relative(APP, file)
    .split(/[\\/]/)
    .slice(0, -1)
    .filter((s) => !/^\(.*\)$/.test(s));
  return "/" + segs.join("/");
}

const pages = new Map();
for (const f of walk(APP)) {
  if (/[\\/]page\.tsx$/.test(f)) pages.set(routeOf(f) || "/", f);
}

/**
 * `href="/x"`, `href={"/x"}`, `href: "/x"`, `router.push("/x")`, `redirect("/x")`.
 *
 * The `href:` OBJECT-PROPERTY form is the one that matters most here and was
 * missing first time round: a nav defined as data — `{ label, href: "/x" }` —
 * is exactly how primary-nav.ts declares all 65 destinations, and without it
 * this gate reported the sidebar as linking nothing at all.
 */
const LINK =
  /(?:href\s*[=:]\s*\{?\s*|router\.(?:push|replace)\s*\(\s*|\bredirect\s*\(\s*)["'`](\/[^"'`\s${}]*)/g;

function linksIn(text) {
  const out = new Set();
  for (const m of text.matchAll(LINK)) {
    out.add(m[1].split("?")[0].split("#")[0].replace(/\/$/, "") || "/");
  }
  return out;
}

/** Which page a link lands on, honouring [dynamic] segments. */
function resolve(link) {
  if (pages.has(link)) return link;
  const lp = link.split("/");
  for (const r of pages.keys()) {
    const rp = r.split("/");
    if (rp.length === lp.length && rp.every((s, i) => s.startsWith("[") || s === lp[i])) {
      return r;
    }
  }
  return null;
}

/**
 * Links present on EVERY page: the shell, layouts, and any component a layout
 * renders. These make their targets reachable from anywhere, which is the
 * whole point of mounting a sidebar.
 */
const ALWAYS_RENDERED = [
  join(ROOT, "src", "lib", "navigation"),
  join(ROOT, "src", "components", "navigation"),
];
const chromeLinks = new Set();
for (const dir of ALWAYS_RENDERED) {
  if (!existsSync(dir)) continue;
  for (const f of walk(dir)) for (const l of linksIn(readFileSync(f, "utf8"))) chromeLinks.add(l);
}
for (const f of walk(APP)) {
  if (/[\\/]layout\.tsx$/.test(f)) {
    for (const l of linksIn(readFileSync(f, "utf8"))) chromeLinks.add(l);
  }
}

// Breadth-first from the entry points plus everything the shell links to.
const seen = new Set();
const queue = [];
for (const start of [...ENTRY_POINTS, ...chromeLinks]) {
  const r = resolve(start);
  if (r && !seen.has(r)) {
    seen.add(r);
    queue.push(r);
  }
}
while (queue.length > 0) {
  const current = queue.shift();
  for (const link of linksIn(readFileSync(pages.get(current), "utf8"))) {
    const r = resolve(link);
    if (r && !seen.has(r)) {
      seen.add(r);
      queue.push(r);
    }
  }
}

const unreachable = [...pages.keys()].filter((r) => !seen.has(r)).sort();

let baseline = [];
try {
  baseline = JSON.parse(readFileSync(BASELINE, "utf8")).unreachable ?? [];
} catch {
  baseline = [];
}

console.log(
  `audit:reachability — ${pages.size} page(s), ${seen.size} reachable by clicking, ${unreachable.length} not`,
);

const regressions = unreachable.filter((r) => !baseline.includes(r));
const fixed = baseline.filter((r) => !unreachable.includes(r));

if (regressions.length > 0) {
  console.log(
    `\naudit:reachability FAILED — ${regressions.length} page(s) newly unreachable:\n`,
  );
  for (const r of regressions) console.log(`  ${r}`);
  console.log(
    `\nA page nobody can click is a feature nobody knows shipped. Add it to` +
      `\nsrc/lib/navigation/primary-nav.ts, or link it from a page that is` +
      `\nalready reachable.`,
  );
  process.exitCode = 1;
} else if (unreachable.length === 0) {
  console.log("audit:reachability PASSED — every page is reachable by clicking.");
} else {
  console.log(
    `audit:reachability PASSED — no NEW unreachable pages.\n` +
      `${unreachable.length} remain in scripts/reachability-baseline.json as tracked debt.\n` +
      `They are built but unreachable; the list may only shrink.`,
  );
}

if (fixed.length > 0) {
  console.log(
    `\n${fixed.length} baselined page(s) are now reachable. Run` +
      ` \`npm run audit:reachability -- --write-baseline\` to bank it:\n` +
      fixed.slice(0, 20).map((r) => `  ${r}`).join("\n"),
  );
}

if (process.argv.includes("--write-baseline")) {
  // Shrink-only: a rewrite can never ADD an entry, so the commit that makes a
  // page unreachable cannot also bless it.
  const kept = baseline.filter((r) => unreachable.includes(r));
  const next = process.argv.includes("--freeze") ? unreachable : kept;
  writeFileSync(
    BASELINE,
    JSON.stringify({ frozen: "2026-08-16", unreachable: next }, null, 2) + "\n",
  );
  console.log(`\nbaseline: ${baseline.length} -> ${next.length}`);
  process.exitCode = 0;
}
