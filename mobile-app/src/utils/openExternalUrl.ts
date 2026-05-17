import { Linking } from "react-native";

const ALLOWED_SCHEMES = new Set(["https:", "mailto:", "tel:"]);

/**
 * Safely opens an external URL, enforcing a scheme allowlist (FND-070).
 *
 * Allowed schemes: https:, mailto:, tel:
 * Rejected schemes: javascript:, file:, data:, http:, and any other unlisted scheme.
 *
 * Never throws — a bad URL returns false so callers don't need try/catch.
 *
 * @returns true if the URL was opened; false if the scheme was rejected or the URL was unparseable.
 */
export async function openExternalUrl(url: string): Promise<boolean> {
  const trimmed = url.trim();

  let scheme: string;
  try {
    const colonIdx = trimmed.indexOf(":");
    if (colonIdx === -1) {
      console.warn("[openExternalUrl] Rejected URL with no scheme:", trimmed);
      return false;
    }
    scheme = trimmed.slice(0, colonIdx + 1).toLowerCase();
  } catch {
    console.warn("[openExternalUrl] Failed to parse URL:", url);
    return false;
  }

  if (!ALLOWED_SCHEMES.has(scheme)) {
    console.warn(
      `[openExternalUrl] Rejected URL with disallowed scheme "${scheme}":`,
      trimmed,
    );
    return false;
  }

  await Linking.openURL(trimmed);
  return true;
}
