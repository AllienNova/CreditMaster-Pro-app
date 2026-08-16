/**
 * @jest-environment node
 *
 * Primary navigation: the data, and the decision about where it renders.
 *
 * These cover the two ways this can fail silently.
 *
 * A nav entry pointing at a route that does not exist is a 404 delivered from
 * the one component every page renders — worse than the scattered dead links
 * that prompted audit:links, because it is on every screen.
 *
 * And isChromelessRoute decides whether a signed-OUT visitor sees signed-IN
 * navigation. Getting it wrong advertises a product surface they cannot reach
 * and offers links that bounce them back to login.
 */

import { readdirSync, statSync, readFileSync } from "fs";
import { join } from "path";
import { PRIMARY_NAV, NAV_HREFS } from "@/lib/navigation/primary-nav";
import { isChromelessRoute } from "../AppShell";

const APP = join(process.cwd(), "src", "app");

/** Every route Next will serve, derived from the filesystem. */
function collectRoutes(dir = APP, prefix = ""): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "__tests__") continue;
      const seg = /^\(.*\)$/.test(entry) ? "" : `/${entry}`;
      out.push(...collectRoutes(full, prefix + seg));
    } else if (entry === "page.tsx") {
      out.push(prefix || "/");
    }
  }
  return out;
}

const ROUTES = new Set(collectRoutes());

describe("primary navigation data", () => {
  it("points every entry at a page that exists", () => {
    const dead = NAV_HREFS.filter((h) => !ROUTES.has(h));
    expect(dead).toEqual([]);
  });

  it("has no duplicate destinations", () => {
    // The same page under two labels makes the active-item highlight
    // ambiguous and doubles the list for no navigational gain.
    const seen = new Set<string>();
    const dupes = NAV_HREFS.filter((h) => (seen.has(h) ? true : (seen.add(h), false)));
    expect(dupes).toEqual([]);
  });

  it("gives every group a label, an icon and at least one item", () => {
    for (const group of PRIMARY_NAV) {
      expect(group.label).toBeTruthy();
      expect(group.icon).toBeTruthy();
      expect(group.items.length).toBeGreaterThan(0);
    }
  });

  it("labels every item", () => {
    for (const group of PRIMARY_NAV) {
      for (const item of group.items) expect(item.label.trim()).not.toBe("");
    }
  });

  it("lists no [dynamic] route", () => {
    // A nav entry cannot supply an id, so a dynamic route here would render a
    // literal "/foo/[id]" link.
    expect(NAV_HREFS.filter((h) => h.includes("["))).toEqual([]);
  });

  it("covers the feature areas that were unreachable before it existed", () => {
    // The regression that prompted this: trading, investing, chat, tax and
    // marketplace were all built and all unreachable.
    for (const href of [
      "/chat",
      "/trading",
      "/trading/paper",
      "/investments",
      "/tax",
      "/marketplace",
    ]) {
      expect(NAV_HREFS).toContain(href);
    }
  });
});

describe("isChromelessRoute", () => {
  it("hides the app nav on the marketing home page", () => {
    expect(isChromelessRoute("/")).toBe(true);
  });

  it.each(["/auth/login", "/login", "/signup", "/reset-password", "/onboarding"])(
    "hides the app nav on %s",
    (path) => {
      // Showing signed-in navigation to a signed-out visitor offers links that
      // bounce straight back to login.
      expect(isChromelessRoute(path)).toBe(true);
    },
  );

  it.each(["/features", "/about", "/pricing", "/terms", "/privacy-policy"])(
    "hides the app nav on the marketing page %s",
    (path) => {
      expect(isChromelessRoute(path)).toBe(true);
    },
  );

  it.each(["/dashboard", "/trading", "/chat", "/tax", "/investments/holdings"])(
    "SHOWS the app nav on %s",
    (path) => {
      expect(isChromelessRoute(path)).toBe(false);
    },
  );

  it("matches on a path segment, not a substring", () => {
    // "/about" must not swallow "/about-something-else", and a route merely
    // containing "login" is not the login page.
    expect(isChromelessRoute("/aboutface")).toBe(false);
    expect(isChromelessRoute("/settings/login-history")).toBe(false);
  });

  it("shows the nav on a route nobody has classified", () => {
    // The denylist is deliberate: a NEW feature area gets navigation by
    // default. An allowlist would reproduce the exact bug this fixes — a page
    // invisible because nobody remembered to register it.
    expect(isChromelessRoute("/some-feature-shipped-tomorrow")).toBe(false);
  });
});

describe("responsive shell", () => {
  const shell = readFileSync(
    join(process.cwd(), "src", "components", "navigation", "AppShell.tsx"),
    "utf8",
  );

  it("hides the desktop sidebar below the lg breakpoint", () => {
    // Without this the 256px sidebar eats most of a phone screen and the
    // content it is meant to navigate to is squeezed out of view.
    expect(shell).toMatch(/hidden lg:block/);
  });

  it("shows the drawer trigger ONLY below lg", () => {
    // A burger button on desktop, where the sidebar is already visible, opens
    // a second copy of the same navigation.
    expect(shell).toMatch(/lg:hidden/);
    expect(shell).toMatch(/aria-label=\{drawerOpen \? "Close navigation"/);
  });

  it("closes the drawer when the route changes", () => {
    // Otherwise tapping a link navigates BEHIND a drawer that stays open over
    // the page the user just asked for.
    expect(shell).toMatch(/useEffect\(\(\) => \{\s*setDrawerOpen\(false\);\s*\}, \[pathname\]\)/);
  });

  it("closes the drawer on Escape", () => {
    expect(shell).toMatch(/e\.key === "Escape"/);
  });

  it("dims and closes on backdrop click", () => {
    expect(shell).toMatch(/onClick=\{\(\) => setDrawerOpen\(false\)\}/);
  });
});
