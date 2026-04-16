# Fynvita Asset System Regeneration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate and ship a complete, cohesive brand-asset system for Fynvita — primary brand marks, app icons, illustrations, and marketing assets — using Google's Nano Banana (Gemini 2.5 Flash Image) as the generation engine, with the existing brand guidelines (`docs/brand/GUIDELINES.md`) as ground truth, and integrate into the mobile app, web app, and marketing pages already in this repo.

**Architecture:** Single Node CLI (`scripts/assets/generate.ts`) drives the whole pipeline. Per-asset TOML specs in `assets/specs/` describe prompt + model + output format. CLI calls `@google/genai`, writes raster PNG to `assets/raw/` (git-ignored), optionally vectorizes via VTracer for logos/icons, optimizes via Sharp + SVGO, and writes final files to `assets/production/` (git-tracked) or platform-specific destinations (`public/`, `mobile-app/assets/`, `src/app/(marketing)/**/opengraph-image.tsx`). A thin `<Illustration>` React component resolves imports from a typed registry. User approves each of the three waves via review gates before we advance.

**Tech Stack:**
- Generation: `@google/genai` (Gemini 2.5 Flash Image, Imagen 4 Ultra for logo fidelity)
- Vectorization: VTracer (raster → SVG)
- Post-process: `sharp` (resize / format variants), `svgo` (SVG optimization)
- TypeScript Node scripts under `scripts/assets/`
- Existing stack: Next.js 15.5.15 App Router, Expo SDK 52, Tailwind, React 19

**Source of truth:** `docs/brand/GUIDELINES.md` (v1.0, Jan 7 2026) — 439-line doc defining name, tagline, colour palette, typography, logo rules, voice.

---

## Review Gates

Three user approvals, one per wave. Do NOT proceed past a gate without explicit user sign-off.

1. **Gate A** (after Task 0.3 `style reference`): user approves the master style-ref image.
2. **Gate B** (after Task 1.1 `logo concepts`): user picks 1–2 logo concepts from the sheet before any vectorization or integration runs.
3. **Gate C** (after Wave 1 integrated): user visually verifies brand + icons in browser/simulator before Wave 2 begins.
4. **Gate D** (after Wave 2 integrated): user verifies illustration system before Wave 3.

---

## File Structure

**Created (new):**
- `scripts/assets/generate.ts` — main CLI entry
- `scripts/assets/lib/gemini.ts` — thin `@google/genai` wrapper
- `scripts/assets/lib/spec.ts` — TOML spec loader + validator
- `scripts/assets/lib/post.ts` — Sharp / SVGO post-processors
- `scripts/assets/lib/vectorize.ts` — VTracer shell wrapper
- `scripts/assets/__tests__/spec.test.ts` — unit tests for spec parser
- `assets/specs/<wave>/<asset>.toml` — one spec file per asset
- `assets/raw/**` — AI raw PNG outputs (git-ignored)
- `assets/production/**` — final optimized assets (git-tracked; SVG where possible, PNG fallback)
- `assets/README.md` — pipeline usage docs
- `src/components/brand/BrandMark.tsx` — logo + wordmark React component
- `src/components/brand/Illustration.tsx` — illustration loader + registry
- `src/components/brand/registry.ts` — typed asset lookup
- `mobile-app/assets/brand/*` — mobile brand mark + illustrations
- `public/icons/**` — PWA icon set (referenced in existing `manifest.json`)
- `public/screenshots/**` — PWA screenshots
- `public/logos/**` — subscription-service logos (user-supplied from official brand kits, NOT AI-generated)
- `docs/brand/ASSET-USAGE.md` — usage guide referencing the asset system

**Modified:**
- `package.json` — add dev deps + npm scripts
- `.env.local` — add `GEMINI_API_KEY` (user provides)
- `.gitignore` — exclude `assets/raw/`
- `src/app/layout.tsx` — metadata / icons config
- `src/app/manifest.ts` — convert existing `public/manifest.json` to dynamic manifest
- `src/app/opengraph-image.tsx` — default OG image
- `src/app/(marketing)/**/opengraph-image.tsx` — per-page OG images (to be created per route that needs one)
- `src/components/ui/EmptyState.tsx` — accept optional `illustration` prop
- `src/app/not-found.tsx` — use 404 illustration
- `src/components/auth/*` — swap placeholder brand usage to `<BrandMark>`
- `mobile-app/app.json` — icon + splash config
- `mobile-app/assets/{icon,adaptive-icon,splash,favicon,notification-icon}.png` — overwrite existing placeholders
- `public/manifest.json` — delete in favour of `src/app/manifest.ts`, OR update icon paths to match new set
- `docs/brand/GUIDELINES.md` — append "Asset System" section linking to `ASSET-USAGE.md`

**Responsibilities (key files):**
- `scripts/assets/generate.ts` — one CLI, multiple subcommands (`gen`, `vectorize`, `optimize`, `deploy`). Small (~150 lines). No business logic in here — orchestration only.
- `scripts/assets/lib/gemini.ts` — single API surface: `generateImage(prompt, opts)`. Tested with a mockable wrapper.
- `scripts/assets/lib/spec.ts` — parse TOML, validate with Zod. Self-contained.
- `scripts/assets/lib/post.ts` + `vectorize.ts` — pure post-processing. No network I/O.
- `src/components/brand/registry.ts` — typed map of asset name → imported file. One source of truth for illustration imports.
- `src/components/brand/Illustration.tsx` — <50 lines, no business logic, purely a resolver + renderer.

---

## Phase 0 — Foundation

Bootstrapping. Must complete before any wave starts. User provides API key as part of 0.1.

### Task 0.1: Install dependencies and configure API key

**Files:**
- Modify: `package.json` (add devDependencies + scripts)
- Modify: `.env.local` (add `GEMINI_API_KEY`)
- Modify: `.env.local.example` (document placeholder)
- Modify: `.gitignore` (add `assets/raw/`, ensure `.env.local` already excluded)

- [ ] **Step 1: Install VTracer binary**

Run (macOS): `brew install vtracer` OR `cargo install vtracer`
Expected: `vtracer --version` prints a version string.

- [ ] **Step 2: Add npm dev dependencies**

Run: `npm install --save-dev @google/genai sharp svgo smol-toml zod tsx`
Expected: `node_modules/@google/genai/package.json` exists.

- [ ] **Step 3: Add npm scripts to `package.json`**

```json
"scripts": {
  "assets:gen": "tsx scripts/assets/generate.ts gen",
  "assets:vectorize": "tsx scripts/assets/generate.ts vectorize",
  "assets:optimize": "tsx scripts/assets/generate.ts optimize",
  "assets:deploy": "tsx scripts/assets/generate.ts deploy",
  "assets:wave": "tsx scripts/assets/generate.ts wave"
}
```

- [ ] **Step 4: Wire `GEMINI_API_KEY`**

User pastes the key into `.env.local` on the line `GEMINI_API_KEY=...`. Add a single-line placeholder to `.env.local.example`: `GEMINI_API_KEY=ai_...`.

- [ ] **Step 5: Add `.gitignore` rule**

Append to `.gitignore`:
```
# Generated asset raw outputs (regenerable; don't bloat the repo)
assets/raw/
```

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json .gitignore .env.local.example
git commit -m "chore(assets): add generation pipeline dependencies"
```

---

### Task 0.2: Directory scaffolding

**Files:**
- Create: `assets/README.md`
- Create: `assets/specs/.keep`
- Create: `assets/raw/.keep`
- Create: `assets/production/.keep`

- [ ] **Step 1: Create the three directories with .keep files so git tracks them**

```bash
mkdir -p assets/{specs,raw,production}
touch assets/specs/.keep assets/raw/.keep assets/production/.keep
```

- [ ] **Step 2: Write `assets/README.md`**

Content: one-page description of pipeline — spec file format, how to regenerate, how production assets flow to `public/`, `src/components/brand/`, and `mobile-app/assets/`. Keep under 60 lines.

- [ ] **Step 3: Commit**

```bash
git add assets/
git commit -m "chore(assets): scaffold asset pipeline directories"
```

---

### Task 0.3: Generate the master style reference image

This is the one asset that everything else references. Gate A is right after this step.

**Files:**
- Create: `assets/specs/00-style-reference.toml`
- Output: `assets/raw/00-style-reference/001.png`
- Output: `assets/production/00-style-reference.png`

- [ ] **Step 1: Write the style reference spec**

`assets/specs/00-style-reference.toml`:

```toml
name = "style-reference"
model = "gemini-2.5-flash-image"
aspect = "1:1"
count = 4
prompt = """
A single square image that defines a visual style system for a fintech wellness brand.
Include on one composition:
- Five colour swatches in a row: #10B981 (Vital Green), #3B82F6 (Trust Blue), #1E40AF (Deep Navy), #059669 (Emerald), #F59E0B (Energy Gold). Labelled with hex codes in clean sans-serif.
- A small wordmark placeholder in white on Vital Green ("Fynvita").
- One small abstract illustration in flat-vector style showing a sprouting leaf emerging from a coin — no photorealism, no 3D, 2px stroke, rounded corners, soft drop shadow allowed.
- One icon example (a stylised heart monitor pulse line) in the same style.
- Background: off-white #F9FAFB.
- Composition should feel airy, calm, professional — apple-tier minimalism, not flashy.
Do not include watermarks, fake UI chrome, or stock-photo elements.
"""
```

- [ ] **Step 2: Implement a tiny CLI stub that can run this single spec**

Write the minimum of `scripts/assets/generate.ts` + `lib/gemini.ts` needed to process ONE spec file. Full CLI comes later in Task 0.4.

- [ ] **Step 3: Run generation**

```bash
npm run assets:gen -- assets/specs/00-style-reference.toml
```

Expected: 4 PNGs in `assets/raw/00-style-reference/`.

- [ ] **Step 4: GATE A — USER REVIEW**

Stop. Agent messages user with an inline preview of the 4 candidate images (use `mcp__visual-feedback__visual_diff` or send paths for the user to open). User selects 1 as the canonical style reference.

- [ ] **Step 5: Copy approved candidate to production**

```bash
cp assets/raw/00-style-reference/00X.png assets/production/00-style-reference.png
```

- [ ] **Step 6: Commit**

```bash
git add assets/specs/00-style-reference.toml assets/production/00-style-reference.png
git commit -m "feat(assets): add approved brand style reference"
```

---

### Task 0.4: Complete the generation CLI

Now that we know the style works end-to-end, flesh out the pipeline.

**Files:**
- Create/Modify: `scripts/assets/generate.ts`
- Create: `scripts/assets/lib/gemini.ts`
- Create: `scripts/assets/lib/spec.ts`
- Create: `scripts/assets/lib/post.ts`
- Create: `scripts/assets/lib/vectorize.ts`
- Create: `scripts/assets/__tests__/spec.test.ts`

- [ ] **Step 1: Write the failing test for spec parsing**

`scripts/assets/__tests__/spec.test.ts`:

```ts
import { describe, it, expect } from "@jest/globals";
import { loadSpec } from "../lib/spec";

describe("loadSpec", () => {
  it("parses a valid TOML spec", async () => {
    const spec = await loadSpec("assets/specs/00-style-reference.toml");
    expect(spec.name).toBe("style-reference");
    expect(spec.model).toBe("gemini-2.5-flash-image");
    expect(spec.count).toBe(4);
    expect(spec.prompt).toContain("Vital Green");
  });

  it("rejects a spec missing required fields", async () => {
    await expect(loadSpec("assets/specs/does-not-exist.toml")).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run it to confirm failure**

```bash
npm test -- scripts/assets/__tests__/spec.test.ts
```

Expected: FAIL (loadSpec not found).

- [ ] **Step 3: Implement `lib/spec.ts`**

Zod schema validating `name` (string), `model` (enum of allowed models), `aspect` (string pattern), `count` (int 1–10), `prompt` (string min 20 chars), optional `referenceImages` (array of paths), optional `output` block (format, sizes, destinations).

Parser uses `smol-toml` then validates with Zod. Returns a strongly-typed `Spec` object.

- [ ] **Step 4: Run the test again**

```bash
npm test -- scripts/assets/__tests__/spec.test.ts
```

Expected: PASS (both cases).

- [ ] **Step 5: Implement `lib/gemini.ts`**

Exports `async function generateImage(spec: Spec): Promise<Buffer[]>`. Uses `@google/genai`, supports the `gemini-2.5-flash-image`, `gemini-3.1-flash-image-preview`, and `imagen-4-ultra` model IDs. Passes reference image bytes if the spec declares them. Returns an array of PNG buffers (one per `count`).

Includes retry-with-backoff on 429 and a 60s per-call timeout. No negative-prompt field — embed negatives in prose (Gemini limitation).

- [ ] **Step 6: Implement `lib/post.ts`**

Exports:
- `async resizeVariants(buf: Buffer, sizes: number[]): Promise<Record<number, Buffer>>` — uses Sharp
- `async toPngLosslessOptimized(buf: Buffer): Promise<Buffer>` — lossless PNG via Sharp
- `async optimizeSvg(svg: string): Promise<string>` — SVGO with defaults tuned for logos (preserve viewBox, remove metadata)

- [ ] **Step 7: Implement `lib/vectorize.ts`**

Shells out to `vtracer` binary with pre-chosen flags for brand marks (`--mode polygon --filter_speckle 4 --color_precision 8 --corner_threshold 60`). Returns SVG string. Throws a helpful error if `vtracer` isn't installed.

- [ ] **Step 8: Wire up `generate.ts` subcommands**

```
generate gen <spec.toml>         -> reads spec, generates, writes to assets/raw/<name>/
generate vectorize <png> <svg>   -> VTracer + SVGO
generate optimize <dir>           -> walks a dir, PNG optimize / SVG optimize in place
generate deploy <spec.toml>       -> copies approved assets to their production destinations
generate wave <N>                  -> batch-runs every spec with matching wave number
```

- [ ] **Step 9: Add a second unit test for destination routing**

`scripts/assets/__tests__/deploy.test.ts` — verify that a spec with `output.destinations = ["public/icons/icon-192.png", "mobile-app/assets/icon.png"]` copies to both places without overwriting unless `--force` is set.

- [ ] **Step 10: Run all new tests**

```bash
npm test -- scripts/assets/__tests__/
```

Expected: PASS (all tests in the new dir).

- [ ] **Step 11: Commit**

```bash
git add scripts/assets/ package.json package-lock.json
git commit -m "feat(assets): implement asset generation CLI"
```

---

## Wave 1 — Brand mark + App icons + Splash

Ship-critical. Nothing goes to production until every sub-task in this wave passes its visual-verify step. **Gate B** after Task 1.1. **Gate C** at end of wave.

### Task 1.1: Generate logo concept sheet (Gate B)

**Files:**
- Create: `assets/specs/wave1/01-logo-wordmark.toml`
- Create: `assets/specs/wave1/02-logo-mark.toml`
- Create: `assets/specs/wave1/03-logo-lockup.toml`

- [ ] **Step 1: Write wordmark spec**

Generate 10 wordmark concepts. Prompt describes: "Fynvita" as clean modern sans-serif wordmark, 3 weights (regular, medium, bold), colour is Trust Blue on white, 2 on Vital Green, 2 monochrome black, 1 white on navy. Reference the style-reference image. Model: `gemini-2.5-flash-image`. Aspect `3:1`.

- [ ] **Step 2: Write icon-mark spec**

Generate 10 icon-mark concepts. Prompt describes: abstract symbol suggesting growth + wellness + vitality. Candidate motifs to explore: sprouting leaf, heart pulse line, upward growth chart, layered circles suggesting rings of wellness, abstract "F" monogram with green/blue gradient. All in brand palette, flat vector, 2px stroke, white background. 1024×1024. Model: `imagen-4-ultra` (better for graphical fidelity). Reference the style-reference image.

- [ ] **Step 3: Write lockup spec**

Generate 4 lockup variants — wordmark + icon-mark combined. Horizontal and stacked, light-bg and dark-bg.

- [ ] **Step 4: Run all three specs**

```bash
npm run assets:gen -- assets/specs/wave1/01-logo-wordmark.toml
npm run assets:gen -- assets/specs/wave1/02-logo-mark.toml
npm run assets:gen -- assets/specs/wave1/03-logo-lockup.toml
```

- [ ] **Step 5: GATE B — USER REVIEW**

Agent shows user a contact-sheet of all 24 candidates grouped by spec. User picks:
- 1 wordmark
- 1 icon-mark (or declares we should iterate — rerun Step 2 with a refined prompt)
- 1 lockup

If user requests iteration, loop Step 2/3/4 on just the rejected category with adjusted prompt. Max 3 iterations before escalating to human designer.

- [ ] **Step 6: Commit the approved candidates**

Copy chosen PNGs to `assets/production/brand/logo-wordmark-src.png`, `logo-mark-src.png`, `logo-lockup-src.png` and commit.

```bash
git add assets/specs/wave1/ assets/production/brand/
git commit -m "feat(brand): add approved logo candidates"
```

---

### Task 1.2: Vectorize the approved logos

**Files:**
- Create: `assets/production/brand/logo-wordmark.svg`
- Create: `assets/production/brand/logo-mark.svg`
- Create: `assets/production/brand/logo-lockup.svg`
- Create: `assets/production/brand/logo-mark-mono.svg` (monochrome variant for Android themed icon + iOS tinted)

- [ ] **Step 1: Vectorize each approved PNG**

```bash
npm run assets:vectorize -- assets/production/brand/logo-mark-src.png assets/production/brand/logo-mark.svg
npm run assets:vectorize -- assets/production/brand/logo-wordmark-src.png assets/production/brand/logo-wordmark.svg
npm run assets:vectorize -- assets/production/brand/logo-lockup-src.png assets/production/brand/logo-lockup.svg
```

- [ ] **Step 2: Manual SVG cleanup pass**

Open each SVG. Remove stray fragment paths, collapse overlapping shapes, ensure `viewBox` is tight, paths use brand hex values exactly (`#10B981`, `#3B82F6`). Save.

- [ ] **Step 3: Derive monochrome variant**

From `logo-mark.svg`, produce `logo-mark-mono.svg` with every path filled `currentColor`. Used for iOS Tinted and Android themed icons.

- [ ] **Step 4: Run SVGO optimization on all four**

```bash
npm run assets:optimize -- assets/production/brand/
```

- [ ] **Step 5: Visual sanity check**

Open each SVG in browser. Confirm it renders identically at 16px, 48px, 512px. Check that monochrome variant is a single-fill silhouette.

- [ ] **Step 6: Commit**

```bash
git add assets/production/brand/
git commit -m "feat(brand): vectorize approved logos + monochrome variant"
```

---

### Task 1.3: Web favicon + PWA icon suite

**Files:**
- Create: `src/app/icon.svg` (Next.js App Router file convention — scalable favicon)
- Create: `src/app/apple-icon.png` (180×180)
- Create: `src/app/manifest.ts` (replaces `public/manifest.json`)
- Create: `public/icons/icon-192.png`
- Create: `public/icons/icon-512.png`
- Create: `public/icons/icon-maskable-512.png`
- Create: `public/favicon.ico` (multi-res: 16, 32, 48)
- Delete: `public/manifest.json` (replaced by dynamic manifest)

- [ ] **Step 1: Build the icon renderer**

Use Sharp to render `logo-mark.svg` at 180, 192, 512 px on a brand-green background (`#10B981`) for the non-maskable variants, and on white for maskable (art must stay within the central 80% safe zone).

- [ ] **Step 2: Generate each file**

Script: `npm run assets:gen -- assets/specs/wave1/04-web-icons.toml`. The spec here is a "derive" spec, not a Gemini call — the CLI routes `source = "assets/production/brand/logo-mark.svg"` to the Sharp pipeline instead of Gemini.

- [ ] **Step 3: Build the multi-res favicon.ico**

Use a small helper script (`scripts/assets/lib/ico.ts`) that packs 16/32/48 PNGs into a single `.ico`. Any open-source ICO builder npm package is fine (e.g. `png-to-ico`).

- [ ] **Step 4: Write `src/app/manifest.ts`**

```ts
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Fynvita",
    short_name: "Fynvita",
    description: "Your Financial Vitality",
    start_url: "/",
    display: "standalone",
    background_color: "#FFFFFF",
    theme_color: "#10B981",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
```

- [ ] **Step 5: Delete old manifest**

```bash
rm public/manifest.json
```

Grep for any `<link rel="manifest" href="/manifest.json">` and remove it (Next's manifest.ts convention auto-wires).

- [ ] **Step 6: Update `src/app/layout.tsx`**

Ensure the `metadata` export references icons correctly (Next reads `icon.svg` and `apple-icon.png` from `src/app/` automatically — no action needed beyond placing them there).

- [ ] **Step 7: Visual verify**

```bash
NODE_ENV=production npm run build
NODE_ENV=production PORT=3100 npm run start &
curl -s http://localhost:3100/favicon.ico -o /tmp/fynvita-favicon.ico
file /tmp/fynvita-favicon.ico
curl -s http://localhost:3100/manifest.webmanifest | jq .
```

Expected: favicon is `MS Windows icon` with 16/32/48 entries. Manifest shows three icon entries.

Also open `http://localhost:3100/` in headless browser via `mcp__visual-feedback__screenshot_web` and capture the tab favicon.

- [ ] **Step 8: Commit**

```bash
git add src/app/icon.svg src/app/apple-icon.png src/app/manifest.ts public/favicon.ico public/icons/
git rm public/manifest.json
git commit -m "feat(web): add new brand favicon + PWA icon suite"
```

---

### Task 1.4: iOS app icon set (Any / Dark / Tinted)

**Files:**
- Modify: `mobile-app/assets/icon.png` (1024×1024, Any appearance)
- Create: `mobile-app/assets/icon-dark.png` (1024×1024)
- Create: `mobile-app/assets/icon-tinted.png` (1024×1024 grayscale on transparent)
- Modify: `mobile-app/app.json` (iOS section icons)

- [ ] **Step 1: Generate Any variant**

Render `logo-mark.svg` centered on brand gradient background via Sharp. 1024×1024 PNG, sRGB, no alpha.

- [ ] **Step 2: Generate Dark variant**

Render `logo-mark.svg` on transparent background with subtle white stroke or highlight — iOS fills the container with a dark material.

- [ ] **Step 3: Generate Tinted variant**

Render `logo-mark-mono.svg` in grayscale on transparent. Silhouette only.

- [ ] **Step 4: Update `mobile-app/app.json` iOS section**

```json
"ios": {
  "icon": {
    "light": "./assets/icon.png",
    "dark": "./assets/icon-dark.png",
    "tinted": "./assets/icon-tinted.png"
  }
}
```

- [ ] **Step 5: Expo prebuild to verify**

```bash
cd mobile-app && npx expo prebuild --platform ios --clean
ls ios/**/AppIcon.appiconset/
```

Expected: `AppIcon.appiconset` contains the three variants sized per Apple HIG.

- [ ] **Step 6: Visual verify on simulator**

```bash
cd mobile-app && npx expo run:ios --simulator "iPhone 17 Pro"
```

Screenshot Home Screen (`mcp__mobile__screen_capture`). Confirm icon renders cleanly at Home Screen size and in Settings.

- [ ] **Step 7: Commit**

```bash
git add mobile-app/assets/icon*.png mobile-app/app.json
git commit -m "feat(mobile): add iOS app icon set with dark + tinted variants"
```

---

### Task 1.5: Android adaptive icon

**Files:**
- Modify: `mobile-app/assets/adaptive-icon.png` (1024×1024 foreground layer)
- Create: `mobile-app/assets/adaptive-icon-background.png` (1024×1024 solid brand green)
- Create: `mobile-app/assets/adaptive-icon-monochrome.png` (1024×1024 monochrome for Android 13+ themed icons)
- Create: `mobile-app/assets/play-store-icon.png` (512×512, no alpha)
- Modify: `mobile-app/app.json` (Android section)

- [ ] **Step 1: Generate foreground layer**

Render `logo-mark.svg` centered inside the 66dp safe zone (≈ 66% of canvas). Transparent background, white/brand fill.

- [ ] **Step 2: Generate background layer**

Solid `#10B981` (Vital Green) 1024×1024. No art.

- [ ] **Step 3: Generate monochrome**

Render `logo-mark-mono.svg` centered inside safe zone, white on transparent (Android tints it).

- [ ] **Step 4: Generate Play Store listing icon**

512×512, no alpha, art on brand-green background with slight gradient. Required by Play Console.

- [ ] **Step 5: Update `mobile-app/app.json` Android section**

```json
"android": {
  "adaptiveIcon": {
    "foregroundImage": "./assets/adaptive-icon.png",
    "backgroundImage": "./assets/adaptive-icon-background.png",
    "monochromeImage": "./assets/adaptive-icon-monochrome.png",
    "backgroundColor": "#10B981"
  }
}
```

- [ ] **Step 6: Expo prebuild verify**

```bash
cd mobile-app && npx expo prebuild --platform android --clean
ls android/app/src/main/res/mipmap-*
```

- [ ] **Step 7: Visual verify on emulator**

Launch Android emulator `Expo_Pixel_8`, run app, screenshot launcher. Also verify themed icon by switching to a dynamic wallpaper and screenshot again.

- [ ] **Step 8: Commit**

```bash
git add mobile-app/assets/adaptive-icon*.png mobile-app/assets/play-store-icon.png mobile-app/app.json
git commit -m "feat(mobile): add Android adaptive icon with monochrome themed variant"
```

---

### Task 1.6: Expo splash screens (light + dark)

**Files:**
- Modify: `mobile-app/assets/splash.png` (centered logo, light)
- Create: `mobile-app/assets/splash-dark.png` (centered logo, dark)
- Modify: `mobile-app/app.json` (splash plugin config)

- [ ] **Step 1: Render splash.png**

Render `logo-lockup.svg` centered on white, 2048×2048, with logo occupying ~200dp / 400px central region.

- [ ] **Step 2: Render splash-dark.png**

Same render on dark background (`#111827`), with dark-safe logo variant.

- [ ] **Step 3: Update app.json splash plugin**

```json
["expo-splash-screen", {
  "image": "./assets/splash.png",
  "imageWidth": 200,
  "backgroundColor": "#FFFFFF",
  "dark": {
    "image": "./assets/splash-dark.png",
    "backgroundColor": "#111827"
  },
  "ios":     { "resizeMode": "contain" },
  "android": { "resizeMode": "contain" }
}]
```

- [ ] **Step 4: Test release splash**

Expo Go renders app icon over splash. Build a release preview:

```bash
cd mobile-app && eas build --platform ios --profile preview --local
```

Install + launch on simulator. Screenshot the splash.

- [ ] **Step 5: Commit**

```bash
git add mobile-app/assets/splash*.png mobile-app/app.json
git commit -m "feat(mobile): add light + dark splash screens"
```

---

### Task 1.7: `<BrandMark>` React component

**Files:**
- Create: `src/components/brand/BrandMark.tsx`
- Create: `src/components/brand/__tests__/BrandMark.test.tsx`
- Modify: `src/components/auth/*` — replace any ad-hoc logo placeholder usage

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react";
import { BrandMark } from "../BrandMark";

describe("BrandMark", () => {
  it("renders the wordmark variant by default", () => {
    render(<BrandMark aria-label="Fynvita" />);
    expect(screen.getByLabelText("Fynvita")).toBeInTheDocument();
  });
  it("renders the icon-only variant when variant='mark'", () => {
    const { container } = render(<BrandMark variant="mark" aria-label="Fynvita" />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });
  it("renders monochrome when mono prop is set", () => {
    render(<BrandMark variant="mark" mono aria-label="Fynvita" />);
    // asserts currentColor styling; implementation detail tolerant
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm test -- src/components/brand/__tests__/BrandMark.test.tsx
```

- [ ] **Step 3: Implement `BrandMark.tsx`**

Imports SVGs as React components via `?react` Next/svgr config (add `@svgr/webpack` if not already present). Variants: `wordmark` (default), `mark`, `lockup`. Props: `variant`, `mono`, `className`, `aria-label` (required — accessibility).

- [ ] **Step 4: Run tests, commit**

```bash
npm test -- src/components/brand/
git add src/components/brand/
git commit -m "feat(brand): add <BrandMark> component"
```

- [ ] **Step 5: Sweep the codebase for placeholder logos**

Grep for hardcoded "Fynvita" text that's acting as a logo (usually `<h1 className="... font-bold">Fynvita</h1>`). Replace with `<BrandMark variant="wordmark" aria-label="Fynvita" />`. Limit to top-nav + auth screens + emails — don't chase every instance.

- [ ] **Step 6: Run full test + lint + types**

```bash
npm test && npm run lint && npx tsc --noEmit
```

- [ ] **Step 7: Commit**

```bash
git add src/
git commit -m "refactor(brand): replace placeholder logos with <BrandMark>"
```

---

### Task 1.8: Gate C — Wave 1 integrated visual verification

**Files:** (no new files; verification only)

- [ ] **Step 1: Production build**

```bash
NODE_ENV=production npm run build && NODE_ENV=production PORT=3100 npm run start &
```

- [ ] **Step 2: Headless screenshot of key web surfaces**

Use `mcp__visual-feedback__screenshot_web`:
- `/` (homepage)
- `/login`
- `/dashboard`
- Check browser tab favicon

- [ ] **Step 3: Mobile screenshots**

iOS simulator + Android emulator, launcher + splash + first app screen.

- [ ] **Step 4: GATE C — USER REVIEW**

Send screenshots to user. User approves Wave 1 integrated or requests specific revisions. Do NOT begin Wave 2 without approval.

- [ ] **Step 5: Stop servers**

```bash
# kill background tasks
```

---

## Wave 2 — Illustration system

Gated on user approval of Wave 1. Then:

### Task 2.1: Illustration style reference (refresh)

Using the approved logo + style-reference, generate one illustration "style bible" image — a contact-sheet of 6 tiny illustrations in the target style. Same colour discipline, same stroke weight. User approves.

### Task 2.2: Empty-state illustrations (15 scenarios)

**Scenarios** (drawn from existing empty-state usage in the codebase):
1. No transactions yet
2. No budgets set up
3. No goals created
4. No credit reports imported
5. No disputes filed
6. No investments yet
7. No watchlist items
8. No notifications
9. No documents uploaded
10. No subscriptions tracked
11. No bill negotiations in progress
12. No savings accounts connected
13. No debt accounts imported
14. No credit score history yet
15. Search returned nothing

Each scenario: generate 3 candidates, user picks 1, save to `assets/production/illustrations/empty-<slug>.svg` (vectorize) or `.png` (fallback for complex scenes). Include @1x / @2x / @3x for raster PNG variants.

### Task 2.3: Onboarding illustrations (4 slides)

Credit health → Financial wellness → Investment intelligence → Vitality together. One illustration per slide.

### Task 2.4: Success / celebration states

Three illustrations: goal achieved, payment confirmed, credit score improved.

### Task 2.5: 404 / error illustrations

One 404, one generic error. Replace the placeholder in `src/app/not-found.tsx` (added earlier in the verify fix) with an illustration-based design.

### Task 2.6: `<Illustration>` component + registry

**Files:**
- Create: `src/components/brand/Illustration.tsx`
- Create: `src/components/brand/registry.ts`
- Create: `src/components/brand/__tests__/Illustration.test.tsx`

- [ ] Typed registry mapping illustration names (e.g. `"empty-transactions"`, `"onboarding-1"`, `"404"`) to imported SVG React components
- [ ] `<Illustration name="empty-transactions" className="w-64 h-64" />` resolves lookup
- [ ] Render fallback if name is invalid (dev-time error, prod-time empty div)
- [ ] Tests verify all registry keys resolve

### Task 2.7: Refactor `<EmptyState>` to accept `illustration` prop

**Files:**
- Modify: `src/components/ui/EmptyState.tsx`
- Update callers across the codebase

Current `EmptyState` has icon + title + action. Add `illustration?: string` prop; when present, render `<Illustration name={illustration} />` above the icon (or replace the icon).

### Task 2.8: Refactor not-found.tsx + error.tsx

Replace the minimal placeholder 404 in `src/app/not-found.tsx` with `<Illustration name="404" />`. Create `src/app/error.tsx` using a generic error illustration.

### Task 2.9: Gate D — Wave 2 integrated visual verification

Same protocol as Gate C — screenshot every major empty-state surface + onboarding flow + 404 page. User approves.

---

## Wave 3 — Marketing + social

Gated on Wave 2 approval. Then:

### Task 3.1: Landing hero banner

**Files:**
- Create: `assets/specs/wave3/01-hero-landing.toml`
- Create: `src/app/(marketing)/hero.tsx` (or update existing landing hero)

Generate one hero illustration + one dark-mode variant. Format: SVG if possible, otherwise WebP + PNG fallback at 1920×800 (desktop) and 750×600 (mobile).

### Task 3.2: OG image system (Next.js dynamic OG)

**Files:**
- Create: `src/app/opengraph-image.tsx` (default OG — 1200×630, generated via next/og ImageResponse with brand mark + tagline)
- Create: `src/app/about/opengraph-image.tsx`
- Create: `src/app/pricing/opengraph-image.tsx`
- Create: `src/app/(marketing)/features/opengraph-image.tsx` (if route exists)

`next/og` lets us generate OG images dynamically in the Edge runtime from React. Each page's OG image declares the content. One shared layout component in `src/components/brand/OgLayout.tsx`.

### Task 3.3: App Store screenshots (iOS)

**Files:**
- Create: `assets/store/ios/6.9-iphone/01-hero.png` (1290×2796) through 08
- Create: `assets/store/ios/13-ipad/01-hero.png` (2064×2752) through 08

Each screenshot: app screen capture on a device frame + marketing copy overlay. Use Expo's screenshot tool + a composed layer.

### Task 3.4: Play Store feature graphic + screenshots

**Files:**
- Create: `assets/store/android/feature-graphic.png` (1024×500)
- Create: `assets/store/android/screenshots/*.png` (3 mandatory; 16:9 or 9:16)

### Task 3.5: Final integration + metadata sweep

- [ ] Ensure every public route has appropriate `metadata.openGraph` pointing at the OG images
- [ ] Ensure `metadata.twitter` uses the same assets
- [ ] Add `metadataBase` in root layout if not already set (it already is per earlier read)

### Task 3.6: Gate E — Final review

Run `/verify` pipeline again — everything still passes. Produce a showcase PDF/HTML summary linking every asset to its production location. Commit.

---

## Post-plan

- [ ] Create `docs/brand/ASSET-USAGE.md` describing the component API (`<BrandMark>`, `<Illustration>`) with examples.
- [ ] Append a "Generation Pipeline" section to `docs/brand/GUIDELINES.md` with a pointer to `assets/README.md`.
- [ ] Update `CLAUDE.md` to reference the new asset system.
- [ ] Optionally: open a PR titled `feat(brand): complete asset system regeneration` with the wave-by-wave commits grouped for review.

---

## Cost + Time Estimates

| Wave | API calls | Asset cost ($0.039/call, 2× for iterations) | Wall-clock (mostly async) |
|---|---|---|---|
| Phase 0 | ~5 | ~$0.40 | 1 hr setup |
| Wave 1 | ~60 | ~$5 | 2 hr (plus review) |
| Wave 2 | ~150 | ~$12 | 3 hr (plus review) |
| Wave 3 | ~40 | ~$3 | 2 hr (plus review) |
| **Total** | **~255** | **~$20–30** | **~8 hr + gates** |

Imagen 4 Ultra calls for final logo fidelity may push the Wave 1 cost to ~$10. Negligible either way.

---

## Risks + Mitigations

| Risk | Mitigation |
|---|---|
| Nano Banana text-in-image renders the "Fynvita" wordmark incorrectly | Use `imagen-4-ultra` for wordmark specs; accept that final wordmark may need manual SVG lettering if AI can't nail it |
| No transparent-background support → logos arrive with a background | Post-process: background removal via Sharp + thresholding for solid backgrounds, or regenerate with `on a pure #FF00FF background` + chroma key |
| Vectorization produces noisy SVGs | VTracer tuned params (already specified); manual cleanup pass in Task 1.2 Step 2; escalate to `potrace` for monochrome |
| SynthID watermark conflicts with trademark use | Confirm with Google TOS; users retain output rights. Brand mark should go through trademark review regardless of generation source |
| Style drift across 150+ illustrations | Lock prompt prefix; pass style reference image to every call; batch per scenario family |
| Asset repo bloat | `assets/raw/` is gitignored; production SVGs are small; large PNGs (screenshots) go to S3 with URL references |
| User changes brand direction mid-stream | Review gates catch this early; worst case is re-running one wave, not all of them |

---

## Skills Referenced

- `@visual-testing-suite` for each Gate's visual verification
- `@frontend-design:frontend-design` for the `<BrandMark>` + `<Illustration>` components
- `@verify` at the end of each wave integration
- `@ja-react-native-expert` for Expo icon + splash config
- `@ja-nextjs-developer` for manifest.ts + OG image implementation
