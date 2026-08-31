/**
 * Which routes a signed-OUT visitor may reach.
 *
 * Lives here rather than inline in app/_layout.tsx so the decision can be
 * tested directly. It is the app's only client-side auth boundary for deep
 * links, and an inline predicate inside a layout effect has no observable
 * output to assert on short of driving a navigator.
 *
 * Client-side only, and defence in depth rather than the defence: every API the
 * protected screens call enforces its own authorisation server-side. What this
 * stops is a deep link rendering a signed-in screen's chrome to someone with no
 * session.
 */

/** Root segments a signed-out visitor may reach in full. */
const PUBLIC_ROOTS = new Set([
  "(auth)", // login, register, forgot-password
  "handoff", // fynvita://continue deep-link target, which re-guards itself
]);

/**
 * `/onboarding` is public but `/onboarding/*` is NOT.
 *
 * The bare route is the marketing carousel and is genuinely pre-auth. Its
 * children — profile, goals, connect, complete — are the setup WIZARD, which
 * reads and writes the signed-in user's profile row. Exempting the whole root
 * segment (as this did) let a signed-out visitor deep-link into that wizard;
 * the writes no-opped for want of a user, so nothing leaked, but it walked them
 * through a form that could not save anything.
 */
const PUBLIC_ROOT_INDEX_ONLY = new Set(["onboarding"]);

export function isPublicRoute(segments: readonly string[]): boolean {
  const root = segments[0];

  // The index entry (app/index.tsx) is a bare Redirect that decides for itself
  // where the visitor belongs, so guarding it would pre-empt that decision.
  if (root === undefined) return true;

  if (PUBLIC_ROOTS.has(root)) return true;
  if (PUBLIC_ROOT_INDEX_ONLY.has(root)) return segments[1] === undefined;

  // Default DENY: a new feature area is protected until someone says otherwise.
  // An allowlist that failed open would silently expose every route added after
  // this file was last read.
  return false;
}
