import { timingSafeEqual } from "./timing-safe-equal";

/**
 * Authenticate a scheduled-job request against CRON_SECRET.
 *
 * FAILS CLOSED. If CRON_SECRET is missing or empty, every request is rejected.
 *
 * This is the whole point of the helper. Each cron route previously inlined
 * `timingSafeEqual(authHeader, \`Bearer ${process.env.CRON_SECRET}\`)`, which
 * compares against the literal string "Bearer undefined" when the variable is
 * unset — so one missing production env var authenticated anyone who sent that
 * header. One route inlined a variant that rejected nobody at all. Five copies
 * of a security check is five chances to get it wrong; there is now one.
 *
 * Rejecting when unconfigured is deliberate in EVERY environment, not just
 * production. These routes mutate data across all users, so "no secret
 * configured" must mean "no access", never "no checking". A developer running
 * a job locally sets CRON_SECRET, exactly as they would set any other
 * credential.
 */
export function verifyCronRequest(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const authHeader = request.headers.get("authorization");
  if (!authHeader) return false;

  return timingSafeEqual(authHeader, `Bearer ${secret}`);
}
