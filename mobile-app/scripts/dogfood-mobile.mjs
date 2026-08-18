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

/**
 * EXPO GO's OWN error screen, which is not a result about the app at all.
 *
 * `exp://host:8081/--/<route>` is sometimes handled as a deep link and
 * sometimes as a request to load a DIFFERENT project, in which case Expo Go
 * fetches a manifest at `http://host:8081/<route>`, gets a 404, and renders a
 * cloud-with-slash, "HTTP 404" and a Try Again button. Three or four elements
 * of real text — so it passes the near-empty floor and scores as `ok`.
 *
 * `/analytics` was recorded that way in two consecutive sweeps while a fresh
 * launch renders it in 12 elements.
 *
 * THE TEXT ALONE IS NOT ENOUGH, and a grep said otherwise. `src/services/api/
 * client.ts:335` builds its error message as `HTTP ${response.status}`, so an
 * app screen whose request 404s renders "HTTP 404" of its own accord — and the
 * grep that cleared this marker looked for the literal string, which is never
 * written anywhere because it is CONSTRUCTED. `/reports` was reported NOT
 * MEASURED while rendering 34 elements.
 *
 * THE ELEMENT COUNT IS NOT A DISCRIMINATOR EITHER, and that was the second
 * wrong answer. `/credit-builder/age` renders exactly `HTTP 500` + `Try Again`
 * in FOUR nodes — its own error state, from a real 500 — which is
 * indistinguishable from Expo Go's `HTTP 404` + `Try Again` in four nodes.
 * `/documents` is five. The app and the client draw the same screen.
 *
 * So this no longer claims to know which. A reading of this shape is reported
 * as AMBIGUOUS: it is surfaced as a problem, so it can never be a silent pass,
 * but it is not asserted to be the harness's fault or the app's. Deciding
 * needs the thing this script cannot currently do — assert ARRIVAL by looking
 * for a marker only the expected screen renders.
 */
const CLIENT_ERROR = /^HTTP \d{3}$/;
const CLIENT_ERROR_MAX_ELEMENTS = 6;
const isHttpErrorScreen = (screen) =>
  screen.elements <= CLIENT_ERROR_MAX_ELEMENTS &&
  screen.texts.some((t) => CLIENT_ERROR.test(t.trim()));

function sh(cmd, args) {
  try {
    return execFileSync(cmd, args, { encoding: "utf8", timeout: 60000, stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    return "";
  }
}

/**
 * A native alert's dismiss button, if one is on screen.
 *
 * `Alert.alert` renders a UIAlertController — a SEPARATE window. `idb ui
 * describe-all` describes only the frontmost one, so while an alert is up the
 * app behind it is completely invisible to this script. See MASKING below.
 */
const DISMISS_LABELS = ["OK", "Ok", "Dismiss", "Cancel", "Close"];
function alertButton(tree) {
  return (
    tree.find(
      (el) => el.type === "Button" && DISMISS_LABELS.includes(el.AXLabel),
    ) ?? null
  );
}

/** Accessibility tree → the strings a user can actually read. */
function readScreen() {
  const raw = sh("idb", ["ui", "describe-all", "--udid", UDID]);
  if (!raw.trim()) return { elements: 0, texts: [], chars: 0, tree: [] };
  let tree;
  try {
    tree = JSON.parse(raw);
  } catch {
    return { elements: 0, texts: [], chars: 0, tree: [] };
  }
  const texts = tree
    .map((el) => el.AXLabel || el.AXValue || "")
    .filter((t) => typeof t === "string" && t.trim());
  return {
    elements: tree.length,
    texts,
    chars: texts.join(" ").trim().length,
    tree,
  };
}

/**
 * Tap a native alert away and report what it said.
 *
 * An alert is a finding for the route that raised it — a screen that greets
 * the user with "Failed to load X" has failed at something — but it must not
 * be left up, because it masks every route measured after it.
 */
function dismissAlert(screen) {
  const btn = alertButton(screen.tree);
  if (!btn) return null;
  const said = screen.texts
    .filter((t) => t !== "Expo Go" && !DISMISS_LABELS.includes(t))
    .join(" ")
    .trim();
  sh("idb", [
    "ui",
    "tap",
    "--udid",
    UDID,
    String(Math.round(btn.frame.x + btn.frame.width / 2)),
    String(Math.round(btn.frame.y + btn.frame.height / 2)),
  ]);
  sleep(1200);
  return said || "(alert with no text)";
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
/**
 * EVERY signature seen so far, not just the previous route's.
 *
 * Comparing only against the previous route catches a run of consecutive
 * repeats and nothing else. The 232-route sweep of 2026-08-18 scored 226 ok,
 * and 26 of those routes had read back the HOME screen — `/financial/income`,
 * `/analytics` and `/tax` among them, all three of which render 7, 12 and 67
 * elements when navigated to on their own. They were interleaved with routes
 * that DID navigate, so no two consecutive readings ever matched and the guard
 * stayed silent through all 26.
 *
 * A repeat is not automatically wrong — two routes can legitimately render the
 * same empty state — so a repeat is CONFIRMED the same way a crash is: relaunch,
 * re-navigate, and keep whatever the fresh reading says.
 */
const seenSignatures = new Map();
for (const route of routes) {
  const path = route === "/" ? "" : route.replace(/^\//, "");
  sh("xcrun", ["simctl", "openurl", UDID, `exp://${HOST}:8081/--/${path}`]);
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, SETTLE_MS);

  let screen = readScreen();

  // DISMISS a native alert before judging anything.
  //
  // WITHOUT THIS THE SWEEP LIES A SECOND WAY. An `Alert.alert` is its own
  // window, and `idb ui describe-all` describes only the frontmost one — so a
  // single stuck alert makes every LATER route read back that alert's four
  // elements instead of the screen. The 2026-08-18 run of the 57 changed
  // routes reported 0 FAIL / 57 ok; in fact `/financial-intelligence/
  // spending-insights` raised "Failed to load spending insights" and the ~28
  // routes after it were never measured at all. Same failure mode as the
  // ErrorBoundary bug this script already guards, through a different window.
  let alerted = dismissAlert(screen);
  if (alerted) screen = readScreen();

  // RE-ISSUE the deep link once, and trust the reading that follows it.
  //
  // A navigation can simply not take effect — most often when the previous
  // screen's fetch rejects just as the link fires and it swaps in an error
  // state. The reading is then stable, non-empty and belongs to the previous
  // route, so neither the near-empty guard nor the identical-signature guard
  // sees it. That is how `/analytics` was recorded as "HTTP 404 | Try Again"
  // twice running when a fresh launch renders it fine in 12 elements.
  //
  // `openurl` to a route already showing is a no-op, so this costs one settle
  // and cannot corrupt a correct reading.
  // The second reading always wins: it follows an explicit navigation to THIS
  // route, so it is the one with provenance. Taking whichever reading is
  // longer would be wrong in the opposite direction — it would keep a rich
  // previous screen over a correctly sparse one, and /dispute/use-strategy
  // genuinely renders four elements. A transient blank is handled by the
  // near-empty guards below, which already exist for exactly that.
  sh("xcrun", ["simctl", "openurl", UDID, `exp://${HOST}:8081/--/${path}`]);
  sleep(SETTLE_MS);
  const second = readScreen();
  const secondAlert = dismissAlert(second);
  if (secondAlert) alerted = alerted ?? secondAlert;
  screen = secondAlert ? readScreen() : second;

  // Expo Go failed to load the bundle. Not a result about this route.
  let clientError = false;
  if (isHttpErrorScreen(screen)) {
    relaunch();
    sh("xcrun", ["simctl", "openurl", UDID, `exp://${HOST}:8081/--/${path}`]);
    sleep(SETTLE_MS + 4000);
    const retried = readScreen();
    const retriedAlert = dismissAlert(retried);
    if (retriedAlert) alerted = alerted ?? retriedAlert;
    screen = retriedAlert ? readScreen() : retried;
    clientError = isHttpErrorScreen(screen);
  }

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

  // CONFIRM a reading that any EARLIER route has already produced.
  //
  // This is the general form of the two guards above, and it is what catches
  // the next masking window nobody has thought of yet. Two different routes
  // rendering the same text to the character is either masking or two screens
  // in the same state; a relaunch plus a fresh navigation tells them apart.
  // If the text CHANGES after the relaunch, the first reading was masked and
  // is discarded. If it does not, the screens really are identical and the
  // reading stands.
  let masked = false;
  const signature = screen.texts.join(" ");
  if (seenSignatures.has(signature) && seenSignatures.get(signature) !== route) {
    relaunch();
    sh("xcrun", ["simctl", "openurl", UDID, `exp://${HOST}:8081/--/${path}`]);
    sleep(SETTLE_MS + 2500);
    const fresh = readScreen();
    const freshAlert = dismissAlert(fresh);
    screen = freshAlert ? readScreen() : fresh;
    masked = screen.texts.join(" ") !== signature;
    joined = screen.texts.join(" ");
    crash = CRASH_MARKERS.find((m) => joined.includes(m)) ?? null;
  }
  // First route to produce a signature owns it. A later route reading the same
  // thing is the suspicious one, and is confirmed above.
  const finalSignature = screen.texts.join(" ");
  if (!seenSignatures.has(finalSignature)) seenSignatures.set(finalSignature, route);

  const problems = [];
  if (crash) problems.push(`crash: ${crash}`);
  if (alerted) problems.push(`alert: ${alerted}`);
  // Surfaced as a problem so it is never silently counted as a pass, but it is
  // a statement about Expo Go, not about the screen. NOT MEASURED, not FAILED.
  if (clientError)
    problems.push(
      "http-error-screen: AMBIGUOUS — Expo Go failing to load the bundle and " +
        "the app's own HTTP error state render identically",
    );
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
    alert: alerted,
    // True when this route's FIRST reading was another route's screen. Kept in
    // the report because it is evidence about the harness, not the app.
    maskedFirstRead: masked,
    problems,
    ok: problems.length === 0,
  });

  const mark = problems.length ? "FAIL" : "ok  ";
  console.log(`  ${mark} ${route}  (${screen.elements} el)${problems.length ? "  <- " + problems.join(", ") : ""}`);
}

const failing = results.filter((r) => r.problems.length);
const maskedCount = results.filter((r) => r.maskedFirstRead).length;
writeFileSync(OUT, JSON.stringify({ udid: UDID, tested: results.length, results }, null, 2));

console.log(`\n${results.length} routes — ${failing.length} FAIL, ${results.length - failing.length} ok`);
if (maskedCount) {
  console.log(
    `${maskedCount} route(s) had their first reading MASKED by the previous ` +
      `screen and were re-measured after a relaunch.`,
  );
}
console.log(
  `\nThis sweep proves each route NAVIGATES and RENDERS. It does not prove the\n` +
    `data shown is real: Expo Go runs a DEV build, and several stores seed data\n` +
    `under __DEV__ without calling the API (G-031).`,
);
console.log(`report -> ${OUT}`);
