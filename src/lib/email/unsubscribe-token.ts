/**
 * Email Unsubscribe Token Utility
 *
 * Generates and verifies unsubscribe tokens for CAN-SPAM compliance
 */

import crypto from "crypto";
import { timingSafeEqual } from "@/lib/security/timing-safe-equal";

const DEV_UNSUBSCRIBE_SECRET = "default-unsubscribe-secret-change-in-production";

/**
 * Resolve the unsubscribe-token signing secret.
 *
 * A missing `EMAIL_UNSUBSCRIBE_SECRET` previously fell back silently to a
 * hard-coded public default, making every HMAC unsubscribe token predictable
 * — anyone could forge a token and unsubscribe any user. In production a
 * missing secret is now a hard failure; in non-production a warning is
 * emitted and the dev default is used so local work and tests are unblocked.
 *
 * Resolved lazily (not at module load) so importing this module never throws.
 */
function getUnsubscribeSecret(): string {
  const secret = process.env.EMAIL_UNSUBSCRIBE_SECRET;
  if (secret) return secret;

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "EMAIL_UNSUBSCRIBE_SECRET environment variable is required in production",
    );
  }

  console.warn(
    "EMAIL_UNSUBSCRIBE_SECRET is not set — using an insecure development " +
      "default. Set EMAIL_UNSUBSCRIBE_SECRET before deploying to production.",
  );
  return DEV_UNSUBSCRIBE_SECRET;
}

/**
 * Generate unsubscribe token for a user
 */
export function generateUnsubscribeToken(userId: string): string {
  return crypto
    .createHmac("sha256", getUnsubscribeSecret())
    .update(userId)
    .digest("hex");
}

/**
 * Verify unsubscribe token
 */
export function verifyUnsubscribeToken(token: string, userId: string): boolean {
  const expectedToken = generateUnsubscribeToken(userId);
  return timingSafeEqual(token, expectedToken);
}

/**
 * Generate full unsubscribe URL
 */
export function generateUnsubscribeUrl(
  userId: string,
  type: "marketing" | "disputes" | "scores" | "payments" | "all" = "all",
): string {
  const token = generateUnsubscribeToken(userId);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://fynvita.com";
  return `${baseUrl}/api/email/unsubscribe?token=${token}&user=${userId}&type=${type}`;
}
