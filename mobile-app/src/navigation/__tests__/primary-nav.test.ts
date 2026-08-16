/**
 * The More tab's directory data.
 *
 * This is the entry point for 122 of the app's 232 screens — the tab bar holds
 * ten destinations and everything else is reached through here — so a bad
 * entry is not one dead link, it is a whole feature area gone dark.
 *
 * The duplicate-LABEL check exists because a simulator run showed the
 * "Investing & Trading" group listing "Trading" twice and "Signals" twice.
 * The hrefs were distinct (/trading vs /investments/trading), so a
 * duplicate-href assertion passed while the user saw the same word twice with
 * nothing to tell the two apart. Twenty-six labels across six groups collided;
 * the nav was generated from the route tree, so every repeated leaf name
 * became a repeated label.
 */

import { readdirSync, statSync } from "fs";
import { join } from "path";
import { PRIMARY_NAV } from "../primary-nav";

const APP = join(process.cwd(), "app");

/** Every route expo-router will serve, derived from the filesystem. */
function collectRoutes(dir = APP, prefix = ""): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === "__tests__" || entry === "node_modules") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      const seg = /^\(.*\)$/.test(entry) ? "" : `/${entry}`;
      out.push(...collectRoutes(full, prefix + seg));
    } else if (/\.tsx?$/.test(entry) && !entry.startsWith("_")) {
      const base = entry.replace(/\.tsx?$/, "");
      out.push(base === "index" ? prefix || "/" : `${prefix}/${base}`);
    }
  }
  return out;
}

const ROUTES = new Set(collectRoutes());
const ITEMS = PRIMARY_NAV.flatMap((g) => g.items.map((i) => ({ ...i, group: g.label })));

describe("mobile primary navigation", () => {
  it("points every entry at a screen that exists", () => {
    const dead = ITEMS.filter((i) => !ROUTES.has(i.href)).map((i) => i.href);
    expect(dead).toEqual([]);
  });

  it("has no two items sharing a label within a group", () => {
    const collisions: string[] = [];
    for (const group of PRIMARY_NAV) {
      const seen = new Set<string>();
      for (const item of group.items) {
        if (seen.has(item.label)) collisions.push(`${group.label} > ${item.label}`);
        seen.add(item.label);
      }
    }
    expect(collisions).toEqual([]);
  });

  it("has no duplicate destinations", () => {
    const seen = new Set<string>();
    const dupes = ITEMS.filter((i) => (seen.has(i.href) ? true : (seen.add(i.href), false)));
    expect(dupes.map((d) => d.href)).toEqual([]);
  });

  it("lists no [dynamic] route", () => {
    // A directory row cannot supply an id, so a dynamic route here would push a
    // literal "/foo/[id]".
    expect(ITEMS.filter((i) => i.href.includes("[")).map((i) => i.href)).toEqual([]);
  });

  it("labels every item and gives every group an icon", () => {
    for (const group of PRIMARY_NAV) {
      expect(group.label.trim()).not.toBe("");
      expect(group.icon.trim()).not.toBe("");
      expect(group.items.length).toBeGreaterThan(0);
      for (const item of group.items) expect(item.label.trim()).not.toBe("");
    }
  });

  it("gates the Admin group behind a role and nothing else", () => {
    // Display-gating only — every admin API enforces its own permission
    // server-side via withRole. But no OTHER group may carry the flag, or a
    // whole feature area silently disappears for ordinary users.
    const gated = PRIMARY_NAV.filter((g) => g.requiresRole);
    expect(gated.map((g) => g.label)).toEqual(["Admin"]);
    expect(gated[0].requiresRole).toBe("admin");
  });

  it("covers the areas that were unreachable before the More tab existed", () => {
    const hrefs = new Set(ITEMS.map((i) => i.href));
    for (const href of ["/trading", "/tax", "/marketplace", "/rewards", "/chat"]) {
      expect(hrefs).toContain(href);
    }
  });
});
