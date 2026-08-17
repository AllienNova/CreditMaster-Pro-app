import { readdirSync, statSync } from "fs";
import { join } from "path";

import {
  HANDOFF_ALLOWED_SEGMENTS,
  HANDOFF_DENIED_SEGMENTS,
  isAllowedHandoffRoute,
} from "../handoff-routes";

/**
 * The deep-link route guard for fynvita://continue?route=…
 *
 * The predecessor of this function shipped with "/" in its prefix list, which
 * made `.some(p => route.startsWith(p))` true for every absolute path. It was
 * labelled "prevents navigation to arbitrary paths" and prevented nothing.
 * These are the cases that would have caught it.
 */
describe("isAllowedHandoffRoute", () => {
  describe("rejects what the broken allowlist used to admit", () => {
    // Each of these returned TRUE under the "/" prefix bug.
    it.each([
      ["/admin/secret-panel", "admin is deliberately denied"],
      ["/anything-at-all", "not a real route family"],
      ["//evil.com", "protocol-relative, not an in-app path"],
      ["/../../etc/passwd", "traversal"],
      ["/handoff", "a handoff link may not bounce through handoff"],
    ])("rejects %s — %s", (route) => {
      expect(isAllowedHandoffRoute(route)).toBe(false);
    });
  });

  describe("rejects anything that is not an absolute in-app path", () => {
    it.each([
      "https://evil.com",
      "fynvita://continue",
      "javascript:alert(1)",
      "settings",
      "",
    ])("rejects %s", (route) => {
      expect(isAllowedHandoffRoute(route)).toBe(false);
    });

    it("rejects a non-string without throwing", () => {
      // The param arrives from a URL, so it can be an array or undefined.
      expect(isAllowedHandoffRoute(undefined as unknown as string)).toBe(false);
      expect(isAllowedHandoffRoute(["/settings"] as unknown as string)).toBe(false);
    });
  });

  describe("matches whole segments, not raw prefixes", () => {
    // The classic prefix bug: "/settings" must not admit "/settingsEVIL".
    it.each([
      "/settingsEVIL",
      "/credit-cards-not-a-route",
      "/taxi",
      "/documentsX",
    ])("rejects %s", (route) => {
      expect(isAllowedHandoffRoute(route)).toBe(false);
    });

    it("still admits a genuine deeper path under an allowed family", () => {
      expect(isAllowedHandoffRoute("/settings/security")).toBe(true);
      expect(isAllowedHandoffRoute("/documents/abc-123")).toBe(true);
      expect(isAllowedHandoffRoute("/(tabs)/disputes")).toBe(true);
    });
  });

  describe("accepts the real destinations", () => {
    it("accepts / as the app entry point", () => {
      expect(isAllowedHandoffRoute("/")).toBe(true);
    });

    it("accepts every allowlisted family at its root", () => {
      for (const segment of HANDOFF_ALLOWED_SEGMENTS) {
        expect(isAllowedHandoffRoute(`/${segment}`)).toBe(true);
      }
    });

    it("ignores query and hash when matching the first segment", () => {
      expect(isAllowedHandoffRoute("/settings?tab=security")).toBe(true);
      expect(isAllowedHandoffRoute("/reports#latest")).toBe(true);
      // …and does not let a query smuggle in a denied family.
      expect(isAllowedHandoffRoute("/admin?next=/settings")).toBe(false);
    });
  });

  /**
   * The property that keeps this file honest.
   *
   * The old list named 13 prefixes while the app had 36 route families, and
   * nobody noticed because the "/" entry meant the list was never consulted in
   * effect. Deriving the truth from the filesystem means a new route directory
   * fails here until someone decides, explicitly, whether a QR code may open it.
   */
  describe("coverage against the real route tree", () => {
    const APP_DIR = join(__dirname, "..", "..", "..", "app");

    const topLevelRoutes = readdirSync(APP_DIR).filter((entry) => {
      if (entry.startsWith(".")) return false;
      const full = join(APP_DIR, entry);
      if (statSync(full).isDirectory()) return true;
      return /\.tsx?$/.test(entry);
    });

    const normalise = (entry: string) => entry.replace(/\.tsx?$/, "");

    it("finds the app directory (guards against a silently empty sweep)", () => {
      expect(topLevelRoutes.length).toBeGreaterThan(20);
    });

    it("classifies every top-level route as allowed or explicitly denied", () => {
      const allowed = new Set<string>(HANDOFF_ALLOWED_SEGMENTS);
      const unclassified = topLevelRoutes
        .map(normalise)
        .filter((name) => !allowed.has(name) && !(name in HANDOFF_DENIED_SEGMENTS));

      expect(unclassified).toEqual([]);
    });

    it("does not allowlist a family that no longer exists", () => {
      const real = new Set(topLevelRoutes.map(normalise));
      const stale = HANDOFF_ALLOWED_SEGMENTS.filter((s) => !real.has(s));

      expect(stale).toEqual([]);
    });
  });
});
