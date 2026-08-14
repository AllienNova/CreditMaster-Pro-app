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
import { readdirSync, statSync, writeFileSync } from "fs";
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

async function main() {
  const all = [...new Set(collectRoutes())].sort();
  // Dynamic segments need a real id to be meaningful; a literal "[id]" URL only
  // ever proves the 404 path. Reported as skipped rather than silently dropped.
  const testable = all.filter((r) => !isDynamic(r));
  const skipped = all.filter(isDynamic);
  const routes = LIMIT ? testable.slice(0, LIMIT) : testable;

  console.log(
    `routes: ${all.length} total, ${testable.length} static, ${skipped.length} dynamic (skipped), testing ${routes.length}`,
  );

  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  if (EMAIL && PASSWORD) {
    await page.goto(`${BASE}/auth/login`, { waitUntil: "domcontentloaded" });
    await page.fill('input[type="email"], input[placeholder*="@"]', EMAIL);
    await page.fill('input[type="password"]', PASSWORD);
    await page.click('button:has-text("Sign In")');
    await page.waitForTimeout(4000);
    const landed = page.url();
    if (landed.includes("/auth/login")) {
      console.error(`LOGIN FAILED — still at ${landed}. Aborting: an unauthenticated sweep would report every protected page as a false failure.`);
      await browser.close();
      process.exit(2);
    }
    console.log(`signed in, landed on ${landed}`);
  }

  const results = [];
  for (const route of routes) {
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
    try {
      const resp = await page.goto(`${BASE}${route}`, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
      status = resp?.status() ?? null;
      // Client components fetch after paint; without this the sweep reports a
      // clean page that is about to fail.
      await page.waitForTimeout(2500);
    } catch (e) {
      error = e.message.slice(0, 200);
    }

    const landedOn = page.url().replace(BASE, "");
    const bouncedToLogin = landedOn.startsWith("/auth/login") && route !== "/auth/login";

    const body = await page.evaluate(() => {
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

    page.off("console", onConsole);
    page.off("response", onResponse);

    const problems = [];
    if (error) problems.push(`navigation: ${error}`);
    if (status && status >= 400) problems.push(`http ${status}`);
    if (bouncedToLogin) problems.push(`redirected to login`);
    if (body.boundary) problems.push("error boundary rendered");
    if (body.chars < 60) problems.push(`near-empty body (${body.chars} chars)`);

    const uniqueConsole = [...new Set(consoleErrors)];
    const uniqueFailed = [...new Set(failedRequests)];

    results.push({
      route,
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
    JSON.stringify({ base: BASE, total: all.length, tested: results.length, skippedDynamic: skipped, results }, null, 2),
  );

  console.log(`\n${results.length} tested — ${failing.length} FAIL, ${warning.length} WARN, ${results.length - failing.length - warning.length} ok`);
  console.log(`${skipped.length} dynamic routes skipped (need real ids): ${skipped.slice(0, 6).join(", ")}${skipped.length > 6 ? " …" : ""}`);
  console.log(`report -> ${OUT}`);
}

main();
