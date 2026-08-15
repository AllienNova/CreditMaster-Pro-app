#!/usr/bin/env node
/**
 * Mobile dogfood sweep — every expo-router route, on a real simulator.
 *
 * WHY DEEP LINKS AND NOT TAPPING. The app has 231 routes across 37 route
 * groups; reaching them by tapping is not reproducible and silently skips
 * anything not linked from a tab. expo-router registers every file under app/
 * as a deep-linkable path, so `exp://<host>/--/<route>` navigates straight to
 * it. That is the only way to assert coverage rather than hope for it.
 *
 * WHAT IT CATCHES, per route:
 *   - the ErrorBoundary screen ("Something went wrong") — a render crash
 *   - expo-router's "Unmatched Route" — a route that does not resolve
 *   - a screen that renders almost nothing (element/text count floor)
 *   - the accessibility tree, so the check is on what the USER sees, not on
 *     whether a file exists
 *
 * WHAT IT CANNOT CATCH. Expo Go runs a DEV build, and creditStore /
 * disputeStore / investmentStore early-return seed data under `__DEV__`
 * without calling the API (10 fetch methods — see G-031). So a green run here
 * proves the screen NAVIGATES and RENDERS; it says nothing about whether the
 * data shown is real. Do not report this sweep as "the data layer works".
 *
 * Usage:
 *   node scripts/dogfood-mobile.mjs --udid <sim-udid> --host 192.168.12.100 \
 *     --routes /tmp/mobile-routes.txt --out /tmp/mobile-report.json
 */

import { execFileSync } from "child_process";
import { readFileSync, writeFileSync } from "fs";

const arg = (name, fallback = null) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
};

const UDID = arg("udid");
const HOST = arg("host", "127.0.0.1");
const ROUTES_FILE = arg("routes", "/tmp/mobile-routes.txt");
const OUT = arg("out", "/tmp/mobile-report.json");
const SETTLE_MS = parseInt(arg("settle", "3500"), 10);

/** Text that means the screen failed rather than rendered. */
const CRASH_MARKERS = [
  "Something went wrong",
  "Unmatched Route",
  "Page could not be found",
  "Render Error",
  "Console Error",
];

function sh(cmd, args) {
  try {
    return execFileSync(cmd, args, { encoding: "utf8", timeout: 60000, stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    return "";
  }
}

/** Accessibility tree → the strings a user can actually read. */
function readScreen() {
  const raw = sh("idb", ["ui", "describe-all", "--udid", UDID]);
  if (!raw.trim()) return { elements: 0, texts: [], chars: 0 };
  let tree;
  try {
    tree = JSON.parse(raw);
  } catch {
    return { elements: 0, texts: [], chars: 0 };
  }
  const texts = tree
    .map((el) => el.AXLabel || el.AXValue || "")
    .filter((t) => typeof t === "string" && t.trim());
  return {
    elements: tree.length,
    texts,
    chars: texts.join(" ").trim().length,
  };
}

const sleep = (ms) =>
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

/**
 * Relaunch the app to clear a stuck ErrorBoundary.
 *
 * WITHOUT THIS THE SWEEP LIES. React's ErrorBoundary replaces the whole tree,
 * and expo-router deep links do not re-mount it — so once ONE route crashes,
 * every subsequent route reads back that same error screen. The first run of
 * this script reported "210 of 223 routes crash"; in reality 13 passed, ONE
 * (/admin/users) genuinely crashed, and the other 209 were never measured.
 * Every failure carried an identical 71-element count, which is what gave it
 * away — 210 independent crashes do not render identically.
 */
function relaunch() {
  sh("xcrun", ["simctl", "terminate", UDID, "host.exp.Exponent"]);
  sleep(2500);
  sh("xcrun", ["simctl", "openurl", UDID, `exp://${HOST}:8081`]);
  sleep(12000);
}

const routes = readFileSync(ROUTES_FILE, "utf8")
  .split("\n")
  .map((r) => r.trim())
  .filter(Boolean);

console.log(`sweeping ${routes.length} mobile routes on ${UDID}`);

const results = [];
for (const route of routes) {
  const path = route === "/" ? "" : route.replace(/^\//, "");
  sh("xcrun", ["simctl", "openurl", UDID, `exp://${HOST}:8081/--/${path}`]);
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, SETTLE_MS);

  let screen = readScreen();
  // One retry: the first navigation to a route can race Metro's on-demand
  // transform, which looks identical to a blank screen.
  if (screen.chars < 25) {
    sleep(4000);
    screen = readScreen();
  }

  // CONFIRM near-empty on a freshly launched app, exactly as crashes are
  // confirmed. A route measured moments after a relaunch reads back the Expo Go
  // splash — 4 elements — which is indistinguishable from a blank screen. That
  // artefact reported /rewards, /rewards/quests and /marketplace as broken
  // immediately after they had been verified working; a full relaunch plus a
  // longer settle showed /rewards rendering 28 elements.
  if (screen.chars < 25) {
    relaunch();
    sh("xcrun", ["simctl", "openurl", UDID, `exp://${HOST}:8081/--/${path}`]);
    sleep(SETTLE_MS + 6000);
    screen = readScreen();
  }

  let joined = screen.texts.join(" ");
  let crash = CRASH_MARKERS.find((m) => joined.includes(m)) ?? null;

  // CONFIRM a crash on a freshly launched app before recording it. A stuck
  // ErrorBoundary from the PREVIOUS route looks identical to this route
  // crashing, and that mistake turned 1 real crash into 210 reported ones.
  if (crash) {
    relaunch();
    sh("xcrun", ["simctl", "openurl", UDID, `exp://${HOST}:8081/--/${path}`]);
    sleep(SETTLE_MS + 2500);
    screen = readScreen();
    joined = screen.texts.join(" ");
    crash = CRASH_MARKERS.find((m) => joined.includes(m)) ?? null;
    // Leave the app clean for the next route either way.
    if (crash) relaunch();
  }

  const problems = [];
  if (crash) problems.push(`crash: ${crash}`);
  // Judge on TEXT, not element count.
  //
  // An element-count floor misreads screens whose content is aggregated into a
  // few accessibility labels: /coach/goals renders "Financial Goals / Emergency
  // Fund Savings ACTIVE 0% CURRENT $0 TARGET $5,000 MONTHLY $0" — real, correct,
  // seeded data — in FOUR nodes, and was reported broken three runs running.
  // Same mistake the web sweep made with a 60-character floor over a valid
  // 53-character empty state. 25 chars matches the web harness.
  if (screen.chars < 25) {
    problems.push(`near-empty (${screen.chars} chars, ${screen.elements} elements)`);
  }

  results.push({
    route,
    elements: screen.elements,
    chars: screen.chars,
    head: screen.texts.slice(0, 6).join(" | ").slice(0, 120),
    problems,
    ok: problems.length === 0,
  });

  const mark = problems.length ? "FAIL" : "ok  ";
  console.log(`  ${mark} ${route}  (${screen.elements} el)${problems.length ? "  <- " + problems.join(", ") : ""}`);
}

const failing = results.filter((r) => r.problems.length);
writeFileSync(OUT, JSON.stringify({ udid: UDID, tested: results.length, results }, null, 2));

console.log(`\n${results.length} routes — ${failing.length} FAIL, ${results.length - failing.length} ok`);
console.log(`report -> ${OUT}`);
