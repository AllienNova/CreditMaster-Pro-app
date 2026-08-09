/**
 * Canonical Hash Calculator
 *
 * Computes a deterministic SHA-256 hash of the loaded policy bundle.
 * Every runtime decision must carry this hash for audit tracing.
 */

import { createHash } from "crypto";

/**
 * Compute SHA-256 hash of the canonical policy bundle.
 * Input is the concatenated raw YAML content of all loaded policy files,
 * sorted by filename for determinism.
 */
export function computeCanonicalHash(
  fileContents: Map<string, string>,
): string {
  const sorted = [...fileContents.entries()].sort(([a], [b]) =>
    a.localeCompare(b),
  );
  const combined = sorted.map(([name, content]) => `${name}:\n${content}`).join("\n---\n");
  return createHash("sha256").update(combined, "utf8").digest("hex");
}

/**
 * Compute a short hash (first 12 chars) for display purposes.
 */
export function computeShortHash(
  fileContents: Map<string, string>,
): string {
  return computeCanonicalHash(fileContents).slice(0, 12);
}
