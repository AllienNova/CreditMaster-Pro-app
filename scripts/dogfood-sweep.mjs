#!/usr/bin/env node
/**
 * Systematic dogfood sweep — every page, signed in, in a real browser.
 *
 * WHY A BROWSER AND NOT curl. A page can return 200 and still be broken: an
 * unhandled exception in a client component renders Next's error boundary with
 * a 200 status, and a failed data call shows an empty state that looks like an
 * empty account. Both are invisible to an HTTP-status sweep. This drives a real
 * Chromium, signed in with a real session, and records what the user would
 * actually see.
 *
 * WHAT IT CATCHES, per route:
 *   - HTTP status and any redirect (a protected page bouncing to /auth/login)
 *   - Next.js error overlay / error-boundary text in the DOM
 *   - console errors, deduped
 *   - failed network requests the page itself issued (4xx/5xx on its own APIs)
 *   - whether the page rendered any content at all
 *
 * Usage:
 *   node scripts/dogfood-sweep.mjs --base http://localhost:3001 \
 *     --email <user> --password <pw> [--limit N] [--out report.json]
 */

import { chromium } from "playwright";
import { readdirSync, statSync, writeFileSync, readFileSync, existsSync } from "fs";
import { join } from "path";

const arg = (name, fallback = null) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
};

const BASE = arg("base", "http://localhost:3001");
const EMAIL = arg("email");
const PASSWORD = arg("password");
const LIMIT = parseInt(arg("limit", "0"), 10);
const OUT = arg("out", "dogfood-report.json");
const SEEDS = arg("seeds", "scripts/dogfood-seeds.json");

/** Every page route Next.js will serve, derived from the filesystem. */
function collectRoutes(dir = "src/app", prefix = "") {
  const routes = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      // Route groups `(name)` do not appear in the URL.
      const segment = /^\(.*\)$/.test(entry) ? "" : `/${entry}`;
      routes.push(...collectRoutes(full, prefix + segment));
    } else if (entry === "page.tsx" || entry === "page.js") {
      routes.push(prefix || "/");
    }
  }
  return routes;
}

const isDynamic = (r) => r.includes("[");

/**
 * Substitute real record ids into dynamic routes.
 *
 * Dynamic routes were previously skipped outright, which left seven pages
 * permanently unmeasured — and that is exactly where two stacked defects were
 * hiding on /disputes/[id]: the detail component fetched a LIST endpoint that
 * ignores its id param, and under that, the DB mapper omitted the `timeline`
 * array the UI maps over unguarded. A sweep that skips a route cannot find
 * either.
 *
 * A pattern with no seed is REPORTED as unseeded rather than silently dropped,
 * so the coverage gap stays visible instead of looking like a pass.
 */
function loadSeeds(path) {
  if (!existsSync(path)) return {};
  const raw = JSON.parse(readFileSync(path, "utf8"));
  return Object.fromEntries(
    Object.entries(raw).filter(([k]) => !k.startsWith("_")),
  );
}

function expandDynamic(routes, seeds) {
  const expanded = [];
  const unseeded = [];
  for (const route of routes) {
    const seed = seeds[route];
    if (seed === undefined) {
      unseeded.push(route);
      continue;
    }
    // Replace whichever bracket segment the route carries ([id], [symbol], …).
    expanded.push({
      route: route.replace(/\[[^\]]+\]/, encodeURIComponent(seed)),
      pattern: route,
    });
  }
  return { expanded, unseeded };
}

async function main() {
  const all = [...new Set(collectRoutes())].sort();
  const staticRoutes = all
    .filter((r) => !isDynamic(r))
    .map((route) => ({ route, pattern: route }));

  // Dynamic segments need a real id to be meaningful; a literal "[id]" URL only
  // ever proves the 404 path. Seeded ones are now exercised for real.
  const { expanded, unseeded } = expandDynamic(all.filter(isDynamic), loadSeeds(SEEDS));

  const testable = [...staticRoutes, ...expanded];
  const routes = LIMIT ? testable.slice(0, LIMIT) : testable;

  console.log(
    `routes: ${all.length} total, ${staticRoutes.length} static, ${expanded.length} dynamic seeded, ${unseeded.length} dynamic UNSEEDED, testing ${routes.length}`,
  );
  if (unseeded.length) {
    console.log(`  unseeded (NOT measured): ${unseeded.join(", ")}`);
  }

  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  if (EMAIL && PASSWORD) {
    // Waits for the form to be interactive rather than filling immediately.
    // In dev, Next compiles /auth/login on first visit, so a fill fired right
    // after domcontentloaded can hit an unhydrated page — the run then aborts
    // with "LOGIN FAILED" even though the credentials are perfectly valid.
    await page.goto(`${BASE}/auth/login`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector('input[type="password"]', {
      state: "visible",
      timeout: 60000,
    });
    await page.fill('input[type="email"], input[placeholder*="@"]', EMAIL);
    await page.fill('input[type="password"]', PASSWORD);
    await page.click('button:has-text("Sign In")');

    // Wait for the navigation away from the login page rather than a fixed
    // sleep, with one retry: hydration can drop the very first click.
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        await page.waitForURL((u) => !u.pathname.startsWith("/auth/login"), {
          timeout: 30000,
        });
        break;
      } catch {
        if (attempt === 0) {
          await page.click('button:has-text("Sign In")').catch(() => {});
        }
      }
    }
    const landed = page.url();
    if (landed.includes("/auth/login")) {
      console.error(`LOGIN FAILED — still at ${landed}. Aborting: an unauthenticated sweep would report every protected page as a false failure.`);
      await browser.close();
      process.exit(2);
    }
    console.log(`signed in, landed on ${landed}`);
  }

  const results = [];
  for (const { route, pattern } of routes) {
    const consoleErrors = [];
    const failedRequests = [];

    const onConsole = (m) => {
      if (m.type() === "error") consoleErrors.push(m.text().slice(0, 300));
    };
    const onResponse = (r) => {
      if (r.status() >= 400) {
        failedRequests.push(`${r.status()} ${r.url().replace(BASE, "").slice(0, 160)}`);
      }
    };
    page.on("console", onConsole);
    page.on("response", onResponse);

    let status = null;
    let error = null;
    let problemsFromEvaluate = null;
    try {
      const resp = await page.goto(`${BASE}${route}`, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
      status = resp?.status() ?? null;
      // Client components fetch after paint; without this the sweep reports a
      // clean page that is about to fail.
      await page.waitForTimeout(2500);

      // RETRY ON A NEAR-EMPTY BODY.
      //
      // In dev, Next compiles each route on FIRST visit, which routinely takes
      // longer than the wait above — so the sweep measured a blank page and
      // called it a failure. That produced seven false "near-empty body (0
      // chars)" results in the first full run, including /trading/journal
      // (really 430 chars) and /financial-intelligence (really 1,100).
      //
      // The second visit hits a compiled route, so a page that is genuinely
      // empty stays empty and a page that was merely slow now reports its real
      // content. Cheap, because it only fires for routes that looked broken.
      const firstPass = await page
        .evaluate(() => (document.body?.innerText ?? "").trim().length)
        .catch(() => 0);
      if (firstPass < 60) {
        await page.reload({ waitUntil: "domcontentloaded", timeout: 30000 });
        await page.waitForTimeout(4000);
      }
    } catch (e) {
      error = e.message.slice(0, 200);
    }

    const landedOn = page.url().replace(BASE, "");
    // /login redirecting to /auth/login is the app working, not a failure —
    // it is an alias route. Only flag a bounce from somewhere that is not
    // itself a login entry point.
    const LOGIN_ROUTES = new Set(["/auth/login", "/login"]);
    const bouncedToLogin =
      landedOn.startsWith("/auth/login") && !LOGIN_ROUTES.has(route);

    // Wrapped: a page that crashes or navigates mid-evaluate throws here, and
    // an unguarded throw ended the first full run at route 108 of 197 —
    // silently truncating coverage in a tool whose entire purpose is coverage.
    let body = { chars: 0, boundary: false, head: "" };
    try {
      body = await page.evaluate(() => {
        const text = document.body?.innerText ?? "";
      // NOT `document.querySelector("nextjs-portal")`. That element is the dev
      // TOOLS overlay and is present on every page in development, so testing
      // for it marked all 12 smoke routes as failures — including `/`, which
      // serves 10,338 characters of correct content. Caught by disbelieving a
      // 12-of-12 failure rather than reporting it.
      const boundary =
        /Application error|Unhandled Runtime Error|client-side exception|This page could not be found/i.test(
          text,
        );
        return { chars: text.trim().length, boundary, head: text.trim().slice(0, 100) };
      });
    } catch (e) {
      problemsFromEvaluate = `page evaluate failed: ${e.message.slice(0, 120)}`;
    }

    page.off("console", onConsole);
    page.off("response", onResponse);

    const problems = [];
    if (error) problems.push(`navigation: ${error}`);
    if (problemsFromEvaluate) problems.push(problemsFromEvaluate);
    if (status && status >= 400) problems.push(`http ${status}`);
    if (bouncedToLogin) problems.push(`redirected to login`);
    if (body.boundary) problems.push("error boundary rendered");
    // 25, not 60. A legitimate empty state is short: /dashboard/notifications
    // renders "Back / Notifications / All / Unread / No notifications yet" —
    // 53 characters of correct UI that a 60-char floor called a failure.
    if (body.chars < 25) problems.push(`near-empty body (${body.chars} chars)`);

    const uniqueConsole = [...new Set(consoleErrors)];
    const uniqueFailed = [...new Set(failedRequests)];

    results.push({
      route,
      // Differs from `route` only for seeded dynamic pages, so a failure can be
      // traced back to the source file that produced it.
      pattern,
      status,
      landedOn,
      bodyChars: body.chars,
      head: body.head,
      consoleErrors: uniqueConsole,
      failedRequests: uniqueFailed,
      problems,
      ok: problems.length === 0 && uniqueFailed.length === 0,
    });

    const mark = problems.length ? "FAIL" : uniqueFailed.length ? "WARN" : "ok  ";
    console.log(
      `  ${mark} ${route}${problems.length ? "  <- " + problems.join(", ") : ""}${
        !problems.length && uniqueFailed.length ? "  <- " + uniqueFailed.length + " failed request(s)" : ""
      }`,
    );
  }

  await browser.close();

  const failing = results.filter((r) => r.problems.length);
  const warning = results.filter((r) => !r.problems.length && r.failedRequests.length);

  writeFileSync(
    OUT,
    JSON.stringify(
      {
        base: BASE,
        total: all.length,
        tested: results.length,
        dynamicSeeded: expanded.map((e) => e.pattern),
        dynamicUnseeded: unseeded,
        results,
      },
      null,
      2,
    ),
  );

  console.log(`\n${results.length} tested — ${failing.length} FAIL, ${warning.length} WARN, ${results.length - failing.length - warning.length} ok`);
  console.log(
    unseeded.length
      ? `${unseeded.length} dynamic routes UNMEASURED (no seed in ${SEEDS}): ${unseeded.join(", ")}`
      : `all ${expanded.length} dynamic routes exercised with real ids`,
  );
  console.log(`report -> ${OUT}`);
}

main();
