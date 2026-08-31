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
    } else if (/\.tsx?$/.test(entry) && !/\.(test|spec)\.tsx?$/.test(entry)) {
      // .ts as well as .tsx. Adding src/lib to the walk changed almost nothing
      // until this filter widened, because the helpers there are plain .ts —
      // the directory was being "covered" by a walker that could not open a
      // single one of its files.
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

// href="/x", href={"/x"}, href: "/x", actionUrl: "/x",
// router.push/replace("/x"), redirect("/x").
//
// Two channels were added after a browser sweep found seven dead destinations
// this gate had passed as clean.
//
// `href:` — the OBJECT-PROPERTY form. A nav declared as data,
// `{ href: "/contact", label: "Contact" }`, is exactly how Footer.tsx lists its
// links, and requiring `=` meant every one of them was invisible. /contact and
// /faq had no page.tsx at all. (audit:reachability already matched `[=:]`; this
// gate never got the same treatment.)
//
// `actionUrl:` — a navigation target under a different name. The vitality score
// service and the proactive-alert engine attach one to every recommendation, so
// "Improve your savings" pointed at /dashboard/savings, which does not exist.
// Five such CTAs were dead. A destination is a destination whatever the key is
// called; the browser found these as _rsc= prefetch 404s, which is the only
// reason anyone noticed.
//
// Three channels were missing, found by an independent review of this gate.
// The old pattern required a quote IMMEDIATELY after `href=`, so the JSX brace
// form href={"/x"} never matched. Server-side redirect("/x") — which sends a
// real user to a real 404 just as surely as a link does — was invisible
// entirely. Template literals carrying an interpolation are still skipped:
// the path is not statically known.
const LINK =
  /(?:href\s*[=:]\s*\{?\s*|actionUrl\s*:\s*|router\.(?:push|replace)\s*\(\s*|\bredirect\s*\(\s*)["'`](\/[^"'`\s${}]*)["'`]/g;

// `--self-test` proves the matcher sees every channel it claims to. The href
// channel was missing from the mobile gate for its entire life while its
// comment said otherwise, and nothing caught that because the gate's only
// evidence was "it went green". These cases fail if a channel is dropped.
if (process.argv.includes("--self-test")) {
  const CASES = [
    ['<Link href="/a">', "/a", "plain href"],
    ['<Link href={"/b"}>', "/b", "JSX brace href"],
    ['{ href: "/c", label: "C" }', "/c", "object-property href"],
    ["{ href: '/c2' }", "/c2", "object-property href, single quotes"],
    ['actionUrl: "/d"', "/d", "actionUrl navigation target"],
    ["actionUrl:'/d2'", "/d2", "actionUrl, no space"],
    ['router.push("/c")', "/c", "router.push"],
    ['router.replace("/d")', "/d", "router.replace"],
    ['redirect("/e")', "/e", "server-side redirect"],
  ];
  let bad = 0;
  for (const [src, want, why] of CASES) {
    const got = [...src.matchAll(new RegExp(LINK.source, "g"))].map((m) => m[1]);
    if (got.includes(want)) continue;
    bad++;
    console.log(`  SELF-TEST FAIL: ${why} — ${JSON.stringify(src)} did not yield ${want}`);
  }
  console.log(
    bad === 0
      ? `audit:links self-test PASSED — ${CASES.length}/${CASES.length} link channels matched.`
      : `audit:links self-test FAILED — ${bad} of ${CASES.length} channels missed.`,
  );
  process.exit(bad === 0 ? 0 : 1);
}

const dead = new Map();
let linksSeen = 0;

// src/lib is walked too: link-bearing helpers live there, and a gate that skips
// a directory is a gate that certifies it.
for (const file of walkSources(join(ROOT, "src", "app")).concat(
  walkSources(join(ROOT, "src", "components")),
  walkSources(join(ROOT, "src", "lib")),
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
