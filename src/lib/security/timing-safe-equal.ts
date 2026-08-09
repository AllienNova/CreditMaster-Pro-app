/**
 * Timing-safe string comparison
 *
 * Addresses FND-011: secret comparisons (CSRF tokens, webhook signatures,
 * cron bearer secrets) using `===`/`!==` leak length and content through
 * early-exit timing, enabling byte-by-byte recovery of the secret.
 *
 * `crypto.timingSafeEqual` throws when the two buffers differ in length, so
 * this helper length-guards first and always performs a constant-time
 * comparison over equal-length inputs.
 */

import crypto from "crypto";

/**
 * Constant-time equality check for two secret strings.
 *
 * Returns `false` (never throws) for unequal-length inputs. For equal-length
 * inputs the comparison runs in time independent of where the first
 * differing byte occurs.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");

  if (bufA.length !== bufB.length) {
    // Still touch timingSafeEqual against a same-length buffer so the
    // unequal-length path does not return measurably faster than a
    // genuine mismatch.
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }

  return crypto.timingSafeEqual(bufA, bufB);
}
