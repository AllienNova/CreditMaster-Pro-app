/**
 * Reader for `marketplace_products.features`.
 *
 * The column is jsonb with NO fixed schema and a `'{}'` default (migration
 * 20251218000000:52). Seeded rows declare whatever suits the product:
 *
 *   credit repair -> {"disputes_per_month": 5, "bureaus": [...], "support": "email"}
 *   education     -> {"modules": 12, "hours": 24, "certificate": true}
 *
 * So no page can tabulate a fixed feature matrix over it. Two pages already
 * render this column (/marketplace/monitoring and /marketplace/education) and a
 * third will; they read it through here so they cannot drift into disagreeing
 * about what an absent key means.
 *
 * The rule this file encodes: absent is not false. A product that never
 * mentions identity protection has not declined it — we simply do not know, and
 * the caller renders "Not stated" rather than "No".
 *
 * Pure functions only, no imports. Client components import this file directly
 * rather than through `@/lib/marketplace`, whose barrel pulls in the Supabase
 * service.
 */

/** Suffix for a price, keyed by MarketplaceProduct.priceType. */
export const PRICE_CADENCE: Record<string, string> = {
  monthly: "/ month",
  yearly: "/ year",
  one_time: "one-time",
};

/** `disputes_per_month` -> `Disputes per month`. */
export function humanizeKey(key: string): string {
  const spaced = key.replace(/[_-]+/g, " ").trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/**
 * One feature entry as a line, or null when it says nothing.
 *
 * A `false` boolean returns null rather than "No": the product declined the
 * feature, and a line under a heading called "Included" would read as the
 * opposite of what the data says.
 */
export function describeFeature(key: string, value: unknown): string | null {
  if (typeof value === "boolean") return value ? humanizeKey(key) : null;
  if (typeof value === "number" || typeof value === "string") {
    const text = String(value).trim();
    return text ? `${humanizeKey(key)}: ${text}` : null;
  }
  if (Array.isArray(value)) {
    const items = value.filter(
      (item) => item !== null && item !== undefined && item !== "",
    );
    return items.length > 0 ? `${humanizeKey(key)}: ${items.join(", ")}` : null;
  }
  return null;
}

/** Narrows the raw column to an object. Arrays and scalars are not features. */
export function readFeatures(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === "object" && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : {};
}

/** Every feature the product actually declares, in declaration order. */
export function listFeatures(
  raw: unknown,
  options: { omit?: string[] } = {},
): string[] {
  const omit = new Set(options.omit ?? []);
  return Object.entries(readFeatures(raw))
    .filter(([key]) => !omit.has(key))
    .map(([key, value]) => describeFeature(key, value))
    .filter((line): line is string => line !== null);
}

/** `features.bureaus` holds bureau NAMES, not a count. Absent -> null. */
export function readBureaus(raw: unknown): string[] | null {
  const bureaus = readFeatures(raw).bureaus;
  if (!Array.isArray(bureaus)) return null;
  const names = bureaus.map(String).filter((name) => name.trim() !== "");
  return names.length > 0 ? names : null;
}
