import fs from "fs";
import path from "path";
import { generateImage, type GenerateImageResult } from "./lib/gemini.js";

const MODEL = "gemini-2.5-flash-image";
const OUT_DIR = path.resolve(process.cwd(), "assets/raw/style-ref");

interface Direction {
  slug: string;
  name: string;
  palette: string;
  fontStyle: string;
  mood: string;
}

const DIRECTIONS: Direction[] = [
  {
    slug: "direction-01-classic-fintech",
    name: "Classic Fintech",
    palette: "#0A1628 deep navy, #10B981 emerald, #1E3A5F steel blue, #F8FAFC off-white",
    fontStyle: "geometric sans-serif, bold, dark navy",
    mood: "trustworthy bank feel, cool and authoritative, crisp corporate lighting",
  },
  {
    slug: "direction-02-modern-warm",
    name: "Modern Warm",
    palette: "#6B8F71 sage green, #FFF8F0 cream, #C9A84C warm gold, #4A4A4A charcoal",
    fontStyle: "editorial serif with humanist touches, warm gold",
    mood: "magazine editorial feel, approachable and calm, soft warm studio lighting",
  },
  {
    slug: "direction-03-energetic-growth",
    name: "Energetic Growth",
    palette: "#00BCD4 vibrant teal, #FF6B6B coral accent, #E8F5E9 pale mint, #1A1A2E dark bg",
    fontStyle: "rounded bold sans-serif, teal",
    mood: "optimistic upward motion, energetic and youthful, bright diffused lighting",
  },
  {
    slug: "direction-04-premium-minimal",
    name: "Premium Minimal",
    palette: "#2C2C2C charcoal, #D4AF37 champagne gold, #F5F5F5 platinum, #1A1A1A near-black",
    fontStyle: "thin elegant sans-serif, champagne gold",
    mood: "luxury private banking, restrained and confident, dramatic side lighting",
  },
  {
    slug: "direction-05-human-wellness",
    name: "Human Wellness",
    palette: "#A8C5A0 soft sage, #E8B4B8 dusty rose, #C4856A terracotta, #FDF6EC warm white",
    fontStyle: "friendly rounded sans-serif, sage",
    mood: "health-tech warmth, nurturing and human, dappled natural lighting",
  },
  {
    slug: "direction-06-bold-tech",
    name: "Bold Tech",
    palette: "#0D1B2A midnight blue, #CCFF00 electric lime, #1A3A5C steel, #080E17 near-black",
    fontStyle: "futuristic condensed sans-serif, electric lime",
    mood: "AI-forward fintech, bold and futuristic, neon-accent dark studio lighting",
  },
];

function buildPrompt(d: Direction): string {
  return (
    `Brand style exploration board for 'Fynvita', a financial wellness platform. ` +
    `Direction: ${d.name}. Palette: ${d.palette}. ` +
    `Include: color swatches in a row at the bottom, a card UI fragment showing a credit score of 780, ` +
    `a simple growth-chart illustration, the word 'Fynvita' in ${d.fontStyle}, ${d.mood}. ` +
    `Layout: 3x2 grid composition, flat design, no photography, no people. ` +
    `High-fidelity concept board, 1024x1024.`
  );
}

interface ManifestEntry extends GenerateImageResult {
  timestamp: string;
}

async function main(): Promise<void> {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const manifest: ManifestEntry[] = [];

  for (let i = 0; i < DIRECTIONS.length; i++) {
    const dir = DIRECTIONS[i];
    const outPath = path.join(OUT_DIR, `${dir.slug}.png`);
    const prompt = buildPrompt(dir);

    console.log(`[${i + 1}/6] Generating: ${dir.name} → ${dir.slug}.png`);
    const result = await generateImage({ prompt, model: MODEL, outPath });
    const entry: ManifestEntry = { ...result, timestamp: new Date().toISOString() };
    manifest.push(entry);
    console.log(`       ✓ ${(result.bytes / 1024).toFixed(1)} KB`);

    if (i < DIRECTIONS.length - 1) {
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
