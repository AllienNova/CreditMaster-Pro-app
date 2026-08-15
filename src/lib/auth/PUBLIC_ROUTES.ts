/**
 * PUBLIC_API_ROUTES — explicit allowlist of /api/* paths reachable without a session.
 *
 * Closes FND-001: the middleware now denies /api/* by default; only the paths
 * listed here pass through unauthenticated. Every other API route must carry a
 * valid session at the middleware layer (in addition to its own withAuth wrapper).
 *
 * Derived from docs/superpowers/auth-route-inventory.csv — every row whose
 * `proposed_guard` column equals PUBLIC (23 rows). Each entry below carries a
 * one-line justification for why it is genuinely reachable pre-auth.
 *
 * To add a route here it MUST first be classified PUBLIC in the CSV; the
 * scripts/verify-auth-coverage.ts audit cross-checks the two.
 */

export const PUBLIC_API_ROUTES: readonly string[] = [
  "/api/affiliate/webhooks", // signature-verified affiliate webhook — signature is the auth
  "/api/auth/webauthn/authenticate", // pre-auth WebAuthn challenge — genuinely public
  "/api/auth/webauthn/authenticate/verify", // pre-auth WebAuthn verify — genuinely public
  "/api/cron/check-dispute-status", // cron job — CRON_SECRET header is the auth
  "/api/cron/cleanup-expired-sessions", // cron job — CRON_SECRET header is the auth
  "/api/cron/dispute-followups", // cron job — CRON_SECRET header is the auth
  // Was MISSING while its four siblings were listed, so the middleware denied
  // it and the nightly snapshot job could never run — net worth, savings and
  // spending trend series would simply stop accumulating, with no error
  // anywhere a user or operator would see. Found by the audit:auth
  // PUBLIC-vs-allowlist cross-check, which this file's own header claimed
  // existed long before it did.
  "/api/cron/financial-snapshots", // cron job — CRON_SECRET header is the auth
  "/api/cron/send-reminders", // cron job — CRON_SECRET header is the auth
  "/api/csrf", // CSRF token issuer — must be reachable pre-auth
  "/api/email/unsubscribe", // unsubscribe via signed token in email link — token is the auth
  "/api/financial/openapi", // OpenAPI spec document — public cache
  "/api/financial/plaid/webhooks", // Plaid webhook — signature verification is the auth
  "/api/health", // health/liveness probe — genuinely public
  "/api/marketplace/products/categories", // public product categories — read-only browse
  "/api/marketplace/products/search", // public product search — read-only browse
  "/api/marketplace/providers", // public provider directory — read-only browse
  "/api/marketplace/providers/search", // public provider search — read-only browse
  "/api/marketplace/tradelines", // public tradeline listing — read-only browse
  "/api/monitoring/errors", // client error / Sentry DSN ingestion — must accept pre-auth errors
  "/api/notifications/push/vapid-key", // returns VAPID public key — needed pre-subscribe
  "/api/payment/webhook", // Stripe webhook — signature verification is the auth
] as const;

/**
 * Dynamic public API routes — paths with an `[id]`-style segment. These cannot
 * be matched by exact-or-prefix string comparison, so they are checked with a
 * regex that anchors the static head and accepts a single non-slash segment
 * where the dynamic param sits. All correspond to PUBLIC rows in the CSV.
 */
const PUBLIC_API_ROUTE_PATTERNS: readonly RegExp[] = [
  /^\/api\/marketplace\/products\/[^/]+$/, // public product catalog detail — read-only
  /^\/api\/marketplace\/providers\/[^/]+$/, // public provider directory detail — read-only
  /^\/api\/marketplace\/tradelines\/[^/]+$/, // public tradeline listing detail — read-only
];

/**
 * True when `pathname` is a public API route reachable without a session.
 *
 * Matches an allowlist entry exactly, as a path-prefix (`p === r` or
 * `p.startsWith(r + "/")`), or against a dynamic-segment pattern.
 *
 * The prefix match for `/api/marketplace/products/search` is deliberately
 * ordered before the `/api/marketplace/products/[id]` pattern so that the
 * literal `search`/`categories` sub-paths are never swallowed by the param
 * regex — both are explicit allowlist entries, so either route reaches `true`.
 */
export function isPublicApiRoute(pathname: string): boolean {
  for (const route of PUBLIC_API_ROUTES) {
    if (pathname === route || pathname.startsWith(`${route}/`)) {
      return true;
    }
  }
  return PUBLIC_API_ROUTE_PATTERNS.some((pattern) => pattern.test(pathname));
}
