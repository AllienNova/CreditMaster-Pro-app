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
import {
  readFileSync,
  writeFileSync,
  readdirSync,
  statSync,
  existsSync,
} from "fs";
import { join, relative, dirname } from "path";

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
/**
 * How long to wait after a relaunch before the router will accept a deep link.
 *
 * TWELVE SECONDS WAS NOT ENOUGH, and it cost a whole sweep. A link fired
 * before expo-router is ready is DROPPED SILENTLY — the app stays on its
 * initial route and the reading is the Home screen, which looks like a
 * perfectly healthy 67-element render.
 *
 * Measured directly on /credit-builder/age from a clean launch:
 *   12s wait -> 67 elements, the Home screen
 *   18s wait ->  4 elements, the screen's own "HTTP 500" state
 * Same route, same build, same command; only the wait differed.
 *
 * That is 18 of the 37 Home readings in the 2026-08-18 arrival sweep — this
 * script being impatient, not the app being broken. The other 18 are the
 * SF-30 path collisions, which persist at ANY wait: /credit/factors renders
 * the Credit TAB after 17 seconds just as it does after 12.
 */
const RELAUNCH_SETTLE_MS = 20000;

function relaunch() {
  sh("xcrun", ["simctl", "terminate", UDID, "host.exp.Exponent"]);
  sleep(2500);
  sh("xcrun", ["simctl", "openurl", UDID, `exp://${HOST}:8081`]);
  sleep(RELAUNCH_SETTLE_MS);
}

/**
 * ARRIVAL ASSERTION — route -> the title only that screen renders.
 *
 * WHY. Everything before this decides "we are on the right screen" by
 * INFERENCE: the reading is not a crash, not near-empty, not identical to
 * another route's. That inference has been wrong three times —
 *
 *   the alert window          a modal covered the app and 31 routes read it
 *   Expo Go's error screen    identical to the app's own `HTTP 500` state
 *   a shadowed path           /financial/income renders the Finances TAB and
 *                             keeps doing so after a relaunch (SF-30)
 *
 * — and each time the reading looked perfectly healthy. A negative check
 * ("nothing looks wrong") cannot tell you WHICH screen you are on. Only a
 * positive one can.
 *
 * So: read each screen's own title out of its source, and after navigating,
 * require that title to be on screen. 164 of 238 screens expose one through
 * <ScreenHeader title="..."> or a styles.title/headerTitle Text. The other 74
 * are reported as arrival-unchecked rather than silently trusted — an honest
 * "I could not confirm this is the right screen" instead of a pass.
 */
function screenTitles() {
  const titles = new Map();
  const walkApp = (dir, out = []) => {
    if (!existsSync(dir)) return out;
    for (const entry of readdirSync(dir)) {
      if ([".expo", "node_modules"].includes(entry)) continue;
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walkApp(full, out);
      else if (/\.tsx$/.test(entry) && !/^(_layout|\+not-found)\.tsx$/.test(entry))
        out.push(full);
    }
    return out;
  };
  const APP = join(process.cwd(), "app");
  const PATTERNS = [
    /<ScreenHeader\b[^>]*?title="([^"]+)"/s,
    /<Text style=\{styles\.title\}>\s*([^<{][^<]*?)\s*<\/Text>/s,
    /<Text style=\{styles\.headerTitle\}>\s*([^<{][^<]*?)\s*<\/Text>/s,
  ];
  for (const file of walkApp(APP)) {
    const rel = relative(APP, file).replace(/\\/g, "/").replace(/\.tsx$/, "");
    // expo-router: (group) segments are not part of the URL, and /index is the
    // directory itself. Mirrors how the route list is generated.
    let route = "/" + rel.replace(/\([^)]+\)\//g, "");
    route = route.replace(/\/index$/, "") || "/";
    const src = readFileSync(file, "utf8");
    let found = null;
    for (const re of PATTERNS) {
      const m = src.match(re);
      if (m) {
        found = m[1].trim();
        break;
      }
    }

    // FALL BACK TO THE LAYOUT'S TITLE. 67 screens draw no header of their own
    // and rely on the NATIVE stack header, whose title is declared in the
    // nearest _layout.tsx as `<Stack.Screen name="x" options={{ title: "Y" }}>`
    // — and that title is rendered, so idb can read it. Reading only the
    // screen file left 74 routes with nothing to assert against; this recovers
    // 40 of them without touching a single screen.
    if (!found) {
      const name = rel.split("/").pop();
      let dir = dirname(file);
      while (dir.startsWith(APP)) {
        const layout = join(dir, "_layout.tsx");
        if (existsSync(layout)) {
          const m = readFileSync(layout, "utf8").match(
            new RegExp(
              `name="${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[^/]*?title:\\s*"([^"]+)"`,
              "s",
            ),
          );
          if (m) {
            found = m[1].trim();
            break;
          }
        }
        dir = dirname(dir);
      }
    }

    if (found) titles.set(route, found);
  }
  return titles;
}

const TITLES = screenTitles();

/**
 * FALLBACK MARKERS — for the 34 routes that declare no title at all.
 *
 * screenTitles() leaves those reported as arrival-UNCHECKED, which is honest
 * but is still 34 screens nobody can say anything about. A title is not
 * actually what the check needs: it needs a string that ONLY this screen
 * renders. A section heading does that job just as well — /search renders
 * "Recent Searches", /trading/strategies/[id] renders "Indicators Used", and
 * no other screen in the app contains either.
 *
 * So: pull every literal <Text> out of every screen, keep the ones that occur
 * in exactly ONE screen file, and let any of them stand as proof of arrival.
 * Uniqueness across the corpus is the whole point — it is what makes a string
 * diagnostic, and it is computed, so it cannot drift out of date the way a
 * hand-written list would.
 *
 * STRICTLY ADDITIVE. A route that has a title keeps the title check, which is
 * stronger: one declared string, matched whole. Markers only ever turn an
 * UNCHECKED into a true or false — they never soften an existing assertion.
 *
 * ANY marker suffices, not all: most of these literals sit inside a branch
 * (an empty state, an error state), so requiring all of them would fail every
 * screen that rendered successfully.
 */
const MARKER_MIN_LEN = 8;
const MARKERS_PER_ROUTE = 8;

function screenMarkers(titles) {
  const perFile = new Map(); // route -> Set(literal)
  const freq = new Map(); // literal -> how many screens contain it
  const walkApp = (dir, out = []) => {
    if (!existsSync(dir)) return out;
    for (const entry of readdirSync(dir)) {
      if ([".expo", "node_modules"].includes(entry)) continue;
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walkApp(full, out);
      else if (/\.tsx$/.test(entry) && !/^(_layout|\+not-found)\.tsx$/.test(entry))
        out.push(full);
    }
    return out;
  };
  const APP = join(process.cwd(), "app");

  for (const file of walkApp(APP)) {
    const rel = relative(APP, file).replace(/\\/g, "/").replace(/\.tsx$/, "");
    let route = "/" + rel.replace(/\([^)]+\)\//g, "");
    route = route.replace(/\/index$/, "") || "/";
    const src = readFileSync(file, "utf8");
    const lits = new Set();
    // A literal Text node: no interpolation, so what the source says is what
    // the screen renders.
    for (const m of src.matchAll(/<Text\b[^>]*>\s*([^<{][^<]*?)\s*<\/Text>/gs)) {
      const t = m[1].replace(/\s+/g, " ").trim();
      if (t.length >= MARKER_MIN_LEN && !/[{}]/.test(t)) lits.add(t);
    }
    perFile.set(route, lits);
    for (const t of lits) freq.set(t, (freq.get(t) ?? 0) + 1);
  }

  const markers = new Map();
  for (const [route, lits] of perFile) {
    if (titles.has(route)) continue; // the title is the stronger assertion
    const unique = [...lits].filter((t) => freq.get(t) === 1);
    if (unique.length) markers.set(route, unique.slice(0, MARKERS_PER_ROUTE));
  }
  return markers;
}

const MARKERS = screenMarkers(TITLES);

/**
 * Paths whose file only forwards somewhere else. They are not screens, so
 * "did this screen render its own title" has no answer for them — the screen
 * the user ends up on is a different route, already measured under its own
 * name. Counted in their own bucket rather than as unchecked failures.
 */
function redirectStubs() {
  const stubs = new Set();
  const APP = join(process.cwd(), "app");
  const walkApp = (dir, out = []) => {
    if (!existsSync(dir)) return out;
    for (const entry of readdirSync(dir)) {
      if ([".expo", "node_modules"].includes(entry)) continue;
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walkApp(full, out);
      else if (/\.tsx$/.test(entry) && !/^(_layout|\+not-found)\.tsx$/.test(entry))
        out.push(full);
    }
    return out;
  };
  for (const file of walkApp(APP)) {
    const src = readFileSync(file, "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");
    if (!/<Redirect\b/.test(src)) continue;
    const rel = relative(APP, file).replace(/\\/g, "/").replace(/\.tsx$/, "");
    let route = "/" + rel.replace(/\([^)]+\)\//g, "");
    route = route.replace(/\/index$/, "") || "/";
    stubs.add(route);
  }
  return stubs;
}

const REDIRECT_STUBS = redirectStubs();

/**
 * THE ROUTE LIST COMES FROM THE APP, not from a file someone made once.
 *
 * It used to default to /tmp/mobile-routes.txt, which listed 222 of the app's
 * 232 routes. The nine it omitted were /more and every one of the eight
 * dynamic routes — /dispute/[id], /document/[id], /documents/[id],
 * /reports/[id], /student-loans/[id], /trading/strategies/[id],
 * /investments/analyze/[symbol], /monitoring/alerts/[id] — so every detail
 * screen in the app was unmeasured while the summary still said "223 routes".
 * A hand-made list cannot notice a route that was added after it was written;
 * walking app/ cannot miss one.
 *
 * --routes still overrides, for re-running a subset.
 */
function collectRoutes() {
  const APP = join(process.cwd(), "app");
  const found = new Set();
  const walk = (dir) => {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir)) {
      if ([".expo", "node_modules"].includes(entry)) continue;
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        walk(full);
        continue;
      }
      if (!/\.tsx$/.test(entry) || /^(_layout|\+not-found)\.tsx$/.test(entry))
        continue;
      const rel = relative(APP, full).replace(/\\/g, "/").replace(/\.tsx$/, "");
      let route = "/" + rel.replace(/\([^)]+\)\//g, "");
      route = route.replace(/\/index$/, "") || "/";
      found.add(route);
    }
  };
  walk(APP);
  return [...found].sort();
}

const isDynamic = (r) => /\[[^\]]+\]/.test(r);

/**
 * Swap [id]/[symbol] for a real row's id. A literal "[id]" URL only ever
 * proves the not-found path, which is why the eight dynamic screens being
 * absent from the old list was invisible rather than loud.
 *
 * A dynamic route with no seed is reported UNSEEDED rather than dropped, so
 * the coverage gap stays on screen. /monitoring/alerts/[id] is currently in
 * that state — credit_alerts holds no row for this user, and borrowing
 * another user's id would produce a not-found that reads exactly like a
 * broken screen.
 */
function expandDynamic(all, seeds) {
  const expanded = [];
  const unseeded = [];
  for (const route of all) {
    if (!isDynamic(route)) {
      expanded.push({ route, pattern: route });
      continue;
    }
    const seed = seeds[route];
    if (seed === undefined) {
      unseeded.push(route);
      continue;
    }
    expanded.push({ route: route.replace(/\[[^\]]+\]/, seed), pattern: route });
  }
  return { expanded, unseeded };
}

const SEEDS_FILE = arg("seeds", join(process.cwd(), "scripts", "dogfood-seeds.json"));
const SEEDS = existsSync(SEEDS_FILE)
  ? JSON.parse(readFileSync(SEEDS_FILE, "utf8"))
  : {};

const allRoutes = existsSync(ROUTES_FILE) && arg("routes") !== null
  ? readFileSync(ROUTES_FILE, "utf8").split("\n").map((r) => r.trim()).filter(Boolean)
  : collectRoutes();

const { expanded, unseeded: unseededRoutes } = expandDynamic(allRoutes, SEEDS);
const routes = expanded.map((e) => e.route);
const PATTERN_OF = new Map(expanded.map((e) => [e.route, e.pattern]));

console.log(
  `routes: ${allRoutes.length} in app/, ${routes.length} testable, ` +
    `${allRoutes.filter(isDynamic).length - unseededRoutes.length} dynamic seeded, ` +
    `${unseededRoutes.length} dynamic UNSEEDED`,
);
if (unseededRoutes.length) {
  console.log(`  UNSEEDED (never measured): ${unseededRoutes.join(", ")}`);
}

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

  // POSITIVE arrival check. See screenTitles() for why inference is not enough.
  // Dynamic routes were expanded to a concrete id, but TITLES / MARKERS /
  // REDIRECT_STUBS are keyed by the source pattern ("/dispute/[id]"), so look
  // up by pattern and fall back to the route itself for static ones.
  const pattern = PATTERN_OF.get(route) ?? route;
  const expectedTitle = TITLES.get(pattern) ?? null;
  // WHOLE NODE, not a substring. `includes` reported /financial/income as
  // arrived because the Finances TAB it actually renders (SF-30) lists a row
  // labelled "Income" — a one-word title matched the wrong screen, which is
  // exactly the false confidence this check exists to remove.
  const markers = expectedTitle === null ? (MARKERS.get(pattern) ?? null) : null;
  const onScreen = (want) => screen.texts.some((t) => t.trim() === want);

  let arrived;
  let arrivalBy;
  if (REDIRECT_STUBS.has(pattern)) {
    // Forwards somewhere else; the destination is measured under its own name.
    arrived = null;
    arrivalBy = "redirect-stub";
  } else if (expectedTitle !== null) {
    arrived = onScreen(expectedTitle);
    arrivalBy = "title";
  } else if (markers) {
    // ASYMMETRIC ON PURPOSE. A declared title is authoritative, so its absence
    // is evidence of the wrong screen. A derived marker is not: most of these
    // literals sit inside a branch, so "not present" is as easily "that branch
    // did not render" as "wrong screen".
    //
    // Measured, not assumed. Treating absence as failure marked 4 routes wrong
    // and 3 of them had plainly arrived — /search was reading "Search |
    // Cancel | Search stocks, transactions, help..." while being failed for
    // not saying "Recent Searches", which only renders once you have some.
    //
    // So presence CONFIRMS and absence returns to UNCHECKED. This costs a real
    // catch (/handoff was reading the Home screen), but a check that cannot
    // tell a wrong screen from an unrendered branch must not claim it can —
    // that false confidence is the whole reason the title check exists.
    arrived = markers.some(onScreen) ? true : null;
    arrivalBy = arrived ? "marker" : "marker-absent";
  } else {
    arrived = null;
    arrivalBy = "no-marker";
  }

  const problems = [];
  if (expectedTitle !== null && arrived === false) {
    problems.push(
      `wrong screen: "${expectedTitle}" is not on screen, so this reading is ` +
        `not evidence about ${route}`,
    );
  }
  if (crash) problems.push(`crash: ${crash}`);
  if (alerted) problems.push(`alert: ${alerted}`);
  // Surfaced as a problem so it is never silently counted as a pass, but it is
  // a statement about Expo Go, not about the screen. NOT MEASURED, not FAILED.
  // THE ARRIVAL CHECK RESOLVES THE AMBIGUITY. Expo Go's bundle-load failure
  // cannot render the app's own screen title — it never loaded the app. So a
  // reading that carries the expected title is the APP's error state, however
  // small and however much it looks like the client's. Only report the
  // ambiguity when arrival could not be confirmed.
  if (clientError && arrived !== true)
    problems.push(
      "http-error-screen: AMBIGUOUS — Expo Go failing to load the bundle and " +
        "the app's own HTTP error state render identically, and this screen's " +
        "title is not present to tell them apart",
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
    pattern,
    elements: screen.elements,
    chars: screen.chars,
    head: screen.texts.slice(0, 6).join(" | ").slice(0, 120),
    alert: alerted,
    expectedTitle,
    // null when the screen exposes no title to check against — reported as
    // unchecked rather than counted as confirmed.
    arrived,
    arrivalBy,
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

const confirmed = results.filter((r) => r.arrived === true && !r.problems.length);
const unchecked = results.filter((r) => r.arrived === null && !r.problems.length);
const byTitle = confirmed.filter((r) => r.arrivalBy === "title");
const byMarker = confirmed.filter((r) => r.arrivalBy === "marker");
const stubs = unchecked.filter((r) => r.arrivalBy === "redirect-stub");
const noMarker = unchecked.filter((r) => r.arrivalBy === "no-marker");
const markerAbsent = unchecked.filter((r) => r.arrivalBy === "marker-absent");

console.log(`\n${results.length} routes — ${failing.length} FAIL, ${results.length - failing.length} ok`);
console.log(
  `  ${confirmed.length} ARRIVAL CONFIRMED — ${byTitle.length} by the screen's own title, ` +
    `${byMarker.length} by a string only that screen renders\n` +
    `  ${unchecked.length} arrival UNCHECKED — ${stubs.length} are redirect stubs (the ` +
    `destination is measured under its own name),\n` +
    `     ${noMarker.length} expose nothing unique to look for, ` +
    `${markerAbsent.length} did not render any of their own strings (which a ` +
    `branch not taken explains as well as a wrong screen), so "ok" means only ` +
    `that something rendered without an error marker`,
);
if (noMarker.length) {
  console.log(
    `\nnothing unique to assert against: ${noMarker.map((r) => r.route).join(", ")}`,
  );
}
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
