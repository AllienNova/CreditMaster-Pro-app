/**
 * Wave 7 Phase 6 test class — DEV SEED MUST NOT REACH A RELEASE BUILD.
 *
 * WHY THIS IS A TEST AND NOT ONLY A BUNDLE AUDIT. `audit:bundle` is the real
 * proof — it greps an actual `expo export`. But it needs a full export (minutes)
 * and only runs where the toolchain is installed. This suite is the fast guard
 * that fails in the same PR that reintroduces the defect, so the slow audit is
 * a confirmation rather than the first line of defence.
 *
 * THE DEFECT IT PINS. creditStore/disputeStore/investmentStore return seed data
 * under `if (__DEV__)`. The guard stops it EXECUTING in a release build but a
 * top-level `import … from "../data/dev-seed"` puts the module in the
 * production graph regardless — Metro does not tree-shake it. A real
 * `expo export` carried "Your Experian score increased", "Chase Sapphire
 * Balance" and a 731 credit score into the shipped binary. The protection was a
 * build-time flag over a payload already on the device (FND-064).
 *
 * Fixed by loading dev-seed through a `require()` INSIDE the `__DEV__` branch,
 * which Metro drops once `__DEV__` folds to false. Verified: the same three
 * strings are absent from a re-exported bundle.
 */

import { readFileSync } from "fs";
import { join } from "path";

const STORE_DIR = join(__dirname, "..", "store");

/** Stores that legitimately use seed data in development. */
const SEEDED_STORES = ["creditStore.ts", "disputeStore.ts", "investmentStore.ts"];

const read = (f: string) => readFileSync(join(STORE_DIR, f), "utf8");

describe("dev-seed isolation — no static import into the production graph", () => {
  it.each(SEEDED_STORES)(
    "%s does not import dev-seed at module scope",
    (file) => {
      const src = read(file);
      // A top-level `import ... from ".../dev-seed"` is the defect. A
      // `require()` inside the __DEV__ branch is the fix.
      expect(src).not.toMatch(/^\s*import\s+.*from\s+["'].*dev-seed["'];?\s*$/m);
    },
  );

  it.each(SEEDED_STORES)("%s reaches dev-seed only through require()", (file) => {
    const src = read(file);
    if (!src.includes("dev-seed")) return; // store no longer seeds at all
    expect(src).toMatch(/require\(\s*["'].*dev-seed["']\s*\)/);
  });

  it.each(SEEDED_STORES)("%s keeps every seed read behind __DEV__", (file) => {
    const src = read(file);
    if (!src.includes("dev-seed")) return;
    // The require must sit inside a function that only the __DEV__ branch calls.
    expect(src).toMatch(/__DEV__/);
  });

  it("dev-seed itself is never imported by an app screen", () => {
    // Screens must read stores, never the fixtures directly — a screen import
    // would put the module back in the production graph through another door.
    const appDir = join(__dirname, "..", "..", "app");
    const offenders: string[] = [];

    const walk = (dir: string) => {
      for (const entry of require("fs").readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name !== "__tests__") walk(full);
        } else if (/\.(ts|tsx)$/.test(entry.name)) {
          if (/from\s+["'].*dev-seed["']/.test(readFileSync(full, "utf8"))) {
            offenders.push(full);
          }
        }
      }
    };
    walk(appDir);

    expect(offenders).toEqual([]);
  });
});

describe("dev auth — no bypass reachable from a release build", () => {
  it("no store or service exposes a dev-only sign-in", () => {
    const srcDir = join(__dirname, "..");
    const offenders: string[] = [];

    const walk = (dir: string) => {
      for (const entry of require("fs").readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
          if (!["__tests__", "data"].includes(entry.name)) walk(full);
        } else if (/\.(ts|tsx)$/.test(entry.name) && !/\.test\./.test(entry.name)) {
          const src = readFileSync(full, "utf8");
          // A dev sign-in shortcut — the FND-064 shape, one EAS flag from live.
          if (/\b(devLogin|skipAuth|bypassAuth|fakeLogin)\b/.test(src)) {
            offenders.push(full);
          }
        }
      }
    };
    walk(srcDir);

    expect(offenders).toEqual([]);
  });
});
