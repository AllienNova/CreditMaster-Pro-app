import fs from "fs";
import path from "path";
import { generateImage, type GenerateImageResult } from "./lib/gemini.js";

const MODEL = "gemini-2.5-flash-image";
const OUT_DIR = path.resolve(process.cwd(), "assets/raw/style-ref-v2");

const SHARED_PREAMBLE =
  "Brand style exploration for 'Fynvita', a holistic financial health platform. " +
  "Strict brand constraints (do not deviate): Primary colors Vital Green #10B981 and Trust Blue #3B82F6. " +
  "Secondary Deep Navy #1E40AF and Emerald #059669. Accent Energy Gold #F59E0B. " +
  "Neutrals Dark Gray #1F2937, Light Gray #F3F4F6, White. " +
  "Typography: Inter (Bold for headings). " +
  "Voice: caring, intelligent, empowering, holistic — health/wellness metaphor, NOT cold fintech. " +
  "Logo concept: heart symbol merged with a growth arrow. " +
  "Layout: clean 3x2 grid, flat design, no photography, no people, 1024x1024, concept board format. ";

interface Variant {
  slug: string;
  name: string;
  detail: string;
}

const VARIANTS: Variant[] = [
  {
    slug: "v2-01-mark-geometric",
    name: "Logo Mark — Geometric",
    detail:
      "Variant focus: LOGO MARK exploration — GEOMETRIC interpretation. Show 3 construction variants of a heart+upward-growth-arrow mark using precise geometric shapes (stacked triangles forming an arrow passing through a rounded heart silhouette). Vital Green mark + Deep Navy wordmark 'Fynvita' in Inter Bold. Include color swatches row at bottom. Clean, modernist, crisp edges.",
  },
  {
    slug: "v2-02-mark-organic",
    name: "Logo Mark — Organic",
    detail:
      "Variant focus: LOGO MARK exploration — ORGANIC interpretation. Show 3 construction variants of a heart+upward-growth-arrow mark using soft, rounded, flowing strokes (the arrow feels like a pulse or heartbeat line curving upward out of the heart). Vital Green mark + Deep Navy wordmark 'Fynvita' in Inter Bold. Include color swatches row at bottom. Friendly, wellness-forward, breathing.",
  },
  {
    slug: "v2-03-mark-monogram",
    name: "Logo Mark — Monogram",
    detail:
      "Variant focus: LOGO MARK exploration — MONOGRAM interpretation where the letter 'F' is integrated into the heart+arrow mark itself. Show 3 construction variants (the vertical stroke of the F becomes the arrow shaft; the horizontal strokes hug the heart curves). Vital Green mark + Deep Navy wordmark 'Fynvita' in Inter Bold. Include color swatches row at bottom. Distinctive, ownable, sophisticated.",
  },
  {
    slug: "v2-04-illo-flat-two-color",
    name: "Illustration — Flat Two-Color",
    detail:
      "Variant focus: ILLUSTRATION SYSTEM — flat two-color style using Vital Green and Deep Navy only (plus white negative space). Show 4 sample illustrations: (a) a person meditating with a dollar-sign halo (calm financial health), (b) a growing plant emerging from a coin stack (investment vitality), (c) a balanced scale holding a heart and a chart (holistic balance), (d) an umbrella made of leaves shielding a house (financial shelter). Editorial-magazine aesthetic, clean geometry.",
  },
  {
    slug: "v2-05-illo-duotone-line",
    name: "Illustration — Duotone Line-Art",
    detail:
      "Variant focus: ILLUSTRATION SYSTEM — duotone line-art on Light Gray #F3F4F6 background. Thin, confident Trust Blue strokes with Vital Green accent fills. Show 4 sample illustrations: (a) abstract upward credit-score arc, (b) linked hands forming a safety net, (c) a pulse-line that morphs into a rising chart, (d) a compass rose with wellness icons at each cardinal. Airy, intelligent, technical-but-warm.",
  },
  {
    slug: "v2-06-illo-soft-organic",
    name: "Illustration — Soft Organic",
    detail:
      "Variant focus: ILLUSTRATION SYSTEM — soft-organic style with rounded blob shapes, Emerald and Energy Gold as supporting accents, gentle shadows. Show 4 sample illustrations: (a) a rounded piggy bank with a leaf growing out of it, (b) abstract blob characters celebrating a goal milestone, (c) a cozy nest made of coins protecting an egg, (d) a softly rendered mountain landscape with a rising sun shaped like a coin. Wellness-app feel, approachable, warm.",
  },
];

function buildPrompt(v: Variant): string {
  return SHARED_PREAMBLE + v.detail;
}

interface ManifestEntry extends GenerateImageResult {
  timestamp: string;
}

async function main(): Promise<void> {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const manifest: ManifestEntry[] = [];

  for (let i = 0; i < VARIANTS.length; i++) {
    const variant = VARIANTS[i];
    const outPath = path.join(OUT_DIR, `${variant.slug}.png`);
    const prompt = buildPrompt(variant);

    console.log(`[${i + 1}/6] Generating: ${variant.name} → ${variant.slug}.png`);
    const result = await generateImage({ prompt, model: MODEL, outPath });
    const entry: ManifestEntry = { ...result, timestamp: new Date().toISOString() };
    manifest.push(entry);
    console.log(`       ✓ ${(result.bytes / 1024).toFixed(1)} KB`);

    if (i < VARIANTS.length - 1) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  const manifestPath = path.join(OUT_DIR, "MANIFEST.json");
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`\nManifest written: ${manifestPath}`);
  console.log(`Done. 6 images in ${OUT_DIR}`);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
