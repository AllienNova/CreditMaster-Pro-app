import fs from "fs";
import path from "path";

export interface ManifestResult {
  id: string;
  path: string;
  bytes: number;
  status: "ok" | "failed" | "pending";
  ms: number;
  error?: string;
}

export interface Manifest {
  spec: string;
  started_at: string;
  completed_at?: string;
  model: string;
  total_cost_usd: number;
  results: ManifestResult[];
}

export function manifestPath(outDir: string): string {
  return path.join(outDir, "MANIFEST.json");
}

export function readManifest(outDir: string): Manifest | null {
  const mp = manifestPath(outDir);
  if (!fs.existsSync(mp)) return null;
  try {
    const raw = fs.readFileSync(mp, "utf-8");
    return JSON.parse(raw) as Manifest;
  } catch {
    return null;
  }
}

export function writeManifest(outDir: string, manifest: Manifest): void {
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(manifestPath(outDir), JSON.stringify(manifest, null, 2));
}

export function createManifest(specName: string, model: string): Manifest {
  return {
    spec: specName,
    started_at: new Date().toISOString(),
    model,
    total_cost_usd: 0,
    results: [],
  };
}

export function shouldSkip(
  manifest: Manifest | null,
  variantId: string,
  force: boolean
): boolean {
  if (force || !manifest) return false;
  const existing = manifest.results.find((r) => r.id === variantId);
  return existing?.status === "ok";
}

export function upsertResult(
  manifest: Manifest,
  result: ManifestResult
): void {
  const idx = manifest.results.findIndex((r) => r.id === result.id);
  if (idx === -1) {
    manifest.results.push(result);
  } else {
    manifest.results[idx] = result;
  }
}
