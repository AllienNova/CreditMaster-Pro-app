/**
 * Which routes a `fynvita://continue?route=…` deep link may navigate to.
 *
 * WHY THIS EXISTS AS ITS OWN MODULE. The check used to live inside
 * app/handoff.tsx, where nothing could test it — and it did not work:
 *
 *     const ALLOWED_PREFIXES = ["/", "/(tabs)", "/settings", …];
 *     return ALLOWED_PREFIXES.some((prefix) => route.startsWith(prefix));
 *
 * "/" is a prefix of every path that starts with "/", so `.some()` was true for
 * every input the first guard let through. The comment above it read "prevents
 * navigation to arbitrary paths"; it permitted /admin/secret-panel, //evil.com
 * and /../../etc/passwd alike. Verified by execution, not by reading.
 *
 * The list was never maintained BECAUSE it never did anything: it named 13
 * prefixes while the app has 36 top-level route families. Simply deleting the
 * "/" entry would have started rejecting real deep links to /billing, /tax,
 * /reports and ~20 others — a silent breakage traded for a silent hole.
 *
 * So the allowlist below is the real set, and `handoff-routes.test.ts` derives
 * the top-level route directories from the filesystem and asserts every one of
 * them is either allowed or explicitly denied. A new route cannot fall outside
 * this file without failing CI, which is what keeps it honest.
 */

/**
 * Deep-linkable route families. A QR code may drop a user here.
 *
 * Kept as whole first segments; matching is segment-aware (see below), so
 * "/settings" does not admit "/settingsEVIL".
 */
export const HANDOFF_ALLOWED_SEGMENTS = [
  "(tabs)",
  "activity",
  "analytics",
  "billing",
  "budgeting",
  "chat",
  "coach",
  "credit",
  "credit-builder",
  "credit-repair",
  "dashboard",
  "dispute",
  "document",
  "documents",
  "financial",
  "financial-intelligence",
  "help",
  "identity",
  "insights",
  "investments",
  "loans",
  "marketplace",
  "monitoring",
  "notifications",
  "onboarding",
  "profile",
  "recommendations",
  "reports",
  "rewards",
  "search",
  "settings",
  "student-loans",
  "tax",
  "trading",
] as const;

/**
 * Route families a deep link may NOT reach, and why. Listed rather than merely
 * omitted so the coverage test can tell "deliberately denied" from "someone
 * added a route and forgot this file".
 */
export const HANDOFF_DENIED_SEGMENTS: Record<string, string> = {
  admin: "Administrative surface. Role checks still apply at render, but there is no reason a scanned QR code should aim a user at it — that is attack surface for nothing.",
  "(auth)": "Sign-in, sign-up and recovery screens. A deep link that lands a user on a credential form is the shape of a phishing flow.",
  handoff: "The handoff screen itself. Allowing it would let one link bounce through another.",
  _layout: "Not a route.",
  index: "The entry router. Reached as '/', which is handled as an exact match.",
};

/**
 * True when a deep link may navigate to `route`.
 *
 * Rules, each of which the tests pin:
 *   - must be an absolute in-app path ("/…"), never a URL with a scheme
 *   - "//host" is rejected: protocol-relative, and not an in-app path
 *   - any ".." segment is rejected, whatever it would resolve to
 *   - "/" alone is allowed — it is the app entry point
 *   - otherwise the FIRST SEGMENT must be allowlisted, matched whole
 */
export function isAllowedHandoffRoute(route: string): boolean {
  if (typeof route !== "string" || !route.startsWith("/")) return false;
  if (route.startsWith("//")) return false;
  if (route === "/") return true;

  const path = route.split(/[?#]/, 1)[0];
  const segments = path.split("/").filter(Boolean);
  if (segments.length === 0) return false;
  if (segments.includes("..")) return false;

  return (HANDOFF_ALLOWED_SEGMENTS as readonly string[]).includes(segments[0]);
}
