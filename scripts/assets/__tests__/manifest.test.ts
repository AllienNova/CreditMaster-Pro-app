import os from "os";
import fs from "fs";
import path from "path";
import {
  createManifest,
  readManifest,
  writeManifest,
  shouldSkip,
  upsertResult,
  type Manifest,
} from "../lib/manifest";

function tempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "manifest-test-"));
}

describe("manifest write/read round-trip", () => {
  it("writes and reads back correctly", () => {
    const dir = tempDir();
    const manifest = createManifest("logo-concepts", "gemini-3-pro-image-preview");
    writeManifest(dir, manifest);

    const loaded = readManifest(dir);
    expect(loaded).not.toBeNull();
    expect(loaded?.spec).toBe("logo-concepts");
    expect(loaded?.model).toBe("gemini-3-pro-image-preview");
    expect(loaded?.results).toHaveLength(0);
  });

  it("returns null when no manifest exists", () => {
    const dir = tempDir();
    expect(readManifest(dir)).toBeNull();
  });

  it("returns null for malformed JSON", () => {
    const dir = tempDir();
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "MANIFEST.json"), "not valid json");
    expect(readManifest(dir)).toBeNull();
  });
});

describe("manifest upsertResult", () => {
  it("adds a new result", () => {
    const manifest = createManifest("test", "gemini-2.5-flash-image");
    upsertResult(manifest, {
      id: "v01",
      path: "v01.png",
      bytes: 1000,
      status: "ok",
      ms: 5000,
    });
    expect(manifest.results).toHaveLength(1);
    expect(manifest.results[0].id).toBe("v01");
  });

  it("updates an existing result in-place", () => {
    const manifest = createManifest("test", "gemini-2.5-flash-image");
    upsertResult(manifest, { id: "v01", path: "v01.png", bytes: 0, status: "failed", ms: 0, error: "timeout" });
    upsertResult(manifest, { id: "v01", path: "v01.png", bytes: 2000, status: "ok", ms: 8000 });
    expect(manifest.results).toHaveLength(1);
    expect(manifest.results[0].status).toBe("ok");
    expect(manifest.results[0].bytes).toBe(2000);
  });
});

describe("shouldSkip (resume logic)", () => {
  it("returns false when no manifest", () => {
    expect(shouldSkip(null, "v01", false)).toBe(false);
  });

  it("skips variant with status ok", () => {
    const manifest: Manifest = {
      spec: "test",
      started_at: new Date().toISOString(),
      model: "gemini-2.5-flash-image",
      total_cost_usd: 0,
      results: [{ id: "v01", path: "v01.png", bytes: 1000, status: "ok", ms: 100 }],
    };
    expect(shouldSkip(manifest, "v01", false)).toBe(true);
  });

  it("does not skip failed result", () => {
    const manifest: Manifest = {
      spec: "test",
      started_at: new Date().toISOString(),
      model: "gemini-2.5-flash-image",
      total_cost_usd: 0,
      results: [{ id: "v01", path: "v01.png", bytes: 0, status: "failed", ms: 0, error: "err" }],
    };
    expect(shouldSkip(manifest, "v01", false)).toBe(false);
  });

  it("does not skip missing variant", () => {
    const manifest: Manifest = {
      spec: "test",
      started_at: new Date().toISOString(),
      model: "gemini-2.5-flash-image",
      total_cost_usd: 0,
      results: [],
    };
    expect(shouldSkip(manifest, "v01", false)).toBe(false);
  });

  it("bypasses resume when force=true even for ok result", () => {
    const manifest: Manifest = {
      spec: "test",
      started_at: new Date().toISOString(),
      model: "gemini-2.5-flash-image",
      total_cost_usd: 0,
      results: [{ id: "v01", path: "v01.png", bytes: 1000, status: "ok", ms: 100 }],
    };
    expect(shouldSkip(manifest, "v01", true)).toBe(false);
  });
});
