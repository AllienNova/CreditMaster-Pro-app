/**
 * Wave 1.2 – Logo Vectorization Pipeline
 *
 * Source: assets/raw/logo-concepts/v03-horizontal-lockup.png
 * Output: assets/production/logo/
 *
 * Produces 12 files:
 *   horizontal.svg, horizontal@2x.png, horizontal@3x.png
 *   vertical.svg,   vertical@2x.png,   vertical@3x.png
 *   mark.svg,       mark@2x.png,        mark@3x.png
 *   wordmark.svg,   wordmark@2x.png,    wordmark@3x.png
 *   favicon.ico, MANIFEST.json, README.md
 *   horizontal-reversed.svg, mark-reversed.svg, wordmark-reversed.svg
 *   mark-mono.svg, horizontal-mono.svg
 */

import path from "path";
import fs from "fs";
import { execFileSync } from "child_process";
import sharp from "sharp";
import { optimize } from "svgo";
// @ts-ignore – png-to-ico has no bundled types
import pngToIco from "png-to-ico";

// ─── Constants ───────────────────────────────────────────────────────────────

const ROOT = path.resolve(process.cwd());
const SRC = path.join(ROOT, "assets/raw/logo-concepts/v03-horizontal-lockup.png");
const OUT = path.join(ROOT, "assets/production/logo");
const TMP = path.join(ROOT, ".tmp-vectorize");

const VITAL_GREEN = "#10B981";
const DEEP_NAVY = "#1E40AF";
const WHITE = "#FFFFFF";
const BLACK = "#000000";

// Pixel bounds measured from the trimmed 2621×1349 source.
// Mark region: heart+pulse+arrow symbol on left side.
const MARK_REGION = { left: 0, top: 348, width: 920, height: 604 } as const;

const VTRACER = path.join(process.env["HOME"] ?? "/", ".cargo/bin/vtracer");

// ─── Helpers ─────────────────────────────────────────────────────────────────

function ensureDirs(): void {
  for (const d of [OUT, TMP]) {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  }
}

function log(msg: string): void {
  process.stdout.write(`  ${msg}\n`);
}

/** Trim card border + extract mark crop → returns PNG buffer */
async function extractMarkPng(): Promise<Buffer> {
  const trimmed = await sharp(SRC).trim({ threshold: 10 }).toBuffer();
  return sharp(trimmed).extract(MARK_REGION).png().toBuffer();
}

/** Run VTracer on a PNG buffer, returns raw SVG string */
function runVTracer(pngBuf: Buffer): string {
  const inFile = path.join(TMP, "mark-input.png");
  const outFile = path.join(TMP, "mark-raw.svg");
  fs.writeFileSync(inFile, pngBuf);

  execFileSync(VTRACER, [
    "--input", inFile,
    "--output", outFile,
    "--colormode", "bw",
    "--mode", "spline",
    "--filter_speckle", "8",
    "--corner_threshold", "60",
  ], { stdio: "pipe" });

  return fs.readFileSync(outFile, "utf8");
}

/** Parse VTracer SVG paths and rebuild a clean mark SVG with brand color */
function buildMarkSvg(rawSvg: string, fill: string, size: number): string {
  // Extract all <path d="…"> elements
  const pathRe = /<path[^>]*\bd="([^"]+)"[^>]*\/>/gi;
  const paths: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = pathRe.exec(rawSvg)) !== null) {
    paths.push(`  <path d="${m[1]}" fill="${fill}"/>`);
  }
  if (paths.length === 0) throw new Error("VTracer produced no paths — check source crop");
  if (paths.length > 50) throw new Error(`VTracer path count ${paths.length} exceeds quality threshold`);

  // VTracer viewBox comes from width/height attrs on <svg>
  const wMatch = /width="(\d+)"/.exec(rawSvg);
  const hMatch = /height="(\d+)"/.exec(rawSvg);
  const vw = wMatch ? wMatch[1] : String(MARK_REGION.width);
  const vh = hMatch ? hMatch[1] : String(MARK_REGION.height);

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" id="fynvita-mark" viewBox="0 0 ${vw} ${vh}" width="${size}" height="${Math.round(size * Number(vh) / Number(vw))}">`,
    ...paths,
    `</svg>`,
  ].join("\n");
}

/** Option A wordmark: clean <text> SVG using Inter Bold */
function buildWordmarkSvg(fill: string, height: number): string {
  const fontSize = height * 0.72;
  const w = Math.round(fontSize * 4.2); // approximate Inter Bold advance for "Fynvita"
  const baseline = Math.round(height * 0.78);
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" id="fynvita-wordmark" viewBox="0 0 ${w} ${height}" width="${w}" height="${height}">`,
    `  <style>@import url('https://fonts.googleapis.com/css2?family=Inter:wght@700&amp;display=swap');</style>`,
    `  <text x="0" y="${baseline}" font-family="Inter, system-ui, sans-serif" font-weight="700" font-size="${Math.round(fontSize)}" fill="${fill}" letter-spacing="-0.5">Fynvita</text>`,
    `</svg>`,
  ].join("\n");
}

/** Horizontal lockup: mark left + wordmark right, 960×240 canvas */
function buildHorizontalSvg(markSvg: string, wordmarkSvg: string, markFill: string, textFill: string): string {
  const W = 960, H = 240;
  const markSize = H * 0.80;
  const markTop = (H - markSize) / 2;
  const gap = 32;
  const markRight = markSize + gap;
  const fontSize = H * 0.46;
  const baseline = H * 0.67;
  void markSvg; void wordmarkSvg; // composed inline below

  // Re-extract paths from markSvg for inline embedding
  const pathRe = /<path[^>]*\bd="([^"]+)"[^>]*\/?>/gi;
  const vwMatch = /viewBox="0 0 (\S+) (\S+)"/.exec(markSvg);
  const mvw = vwMatch ? vwMatch[1] : "920";
  const mvh = vwMatch ? vwMatch[2] : "604";
  const paths: string[] = [];
  let mp: RegExpExecArray | null;
  while ((mp = pathRe.exec(markSvg)) !== null) {
    paths.push(`    <path d="${mp[1]}" fill="${markFill}"/>`);
  }

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" id="fynvita-horizontal" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">`,
    `  <g transform="translate(${Math.round((H - markSize) / 2)}, ${Math.round(markTop)})">`,
    `    <svg viewBox="0 0 ${mvw} ${mvh}" width="${Math.round(markSize)}" height="${Math.round(markSize)}">`,
    ...paths,
    `    </svg>`,
    `  </g>`,
    `  <text x="${Math.round(markRight + markTop)}" y="${Math.round(baseline)}" font-family="Inter, system-ui, sans-serif" font-weight="700" font-size="${Math.round(fontSize)}" fill="${textFill}" letter-spacing="-1">Fynvita</text>`,
    `</svg>`,
  ].join("\n");
}

/** Vertical lockup: mark top + wordmark below, 400×480 canvas */
function buildVerticalSvg(markSvg: string, markFill: string, textFill: string): string {
  const W = 400, H = 480;
  const markSize = 240;
  const markLeft = (W - markSize) / 2;
  const fontSize = 68;
  const textY = markSize + 72;

  const pathRe = /<path[^>]*\bd="([^"]+)"[^>]*\/?>/gi;
  const vwMatch = /viewBox="0 0 (\S+) (\S+)"/.exec(markSvg);
  const mvw = vwMatch ? vwMatch[1] : "920";
  const mvh = vwMatch ? vwMatch[2] : "604";
  const paths: string[] = [];
  let mp: RegExpExecArray | null;
  while ((mp = pathRe.exec(markSvg)) !== null) {
    paths.push(`    <path d="${mp[1]}" fill="${markFill}"/>`);
  }

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" id="fynvita-vertical" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">`,
    `  <g transform="translate(${Math.round(markLeft)}, 0)">`,
    `    <svg viewBox="0 0 ${mvw} ${mvh}" width="${markSize}" height="${markSize}">`,
    ...paths,
    `    </svg>`,
    `  </g>`,
    `  <text x="${W / 2}" y="${textY}" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-weight="700" font-size="${fontSize}" fill="${textFill}" letter-spacing="-1">Fynvita</text>`,
    `</svg>`,
  ].join("\n");
}

/** Optimize SVG with SVGO, preserving ids for downstream component references */
function optimizeSvg(svg: string): string {
  const result = optimize(svg, {
    plugins: [
      {
        name: "preset-default",
        params: { overrides: { cleanupIds: false } },
      },
      // Keep viewBox — required for responsive scaling
      { name: "removeViewBox", active: false },
    ],
  });
  return result.data;
}

/** Rasterize SVG to PNG at target width */
async function svgToPng(svgContent: string, targetWidth: number, outPath: string): Promise<void> {
  await sharp(Buffer.from(svgContent, "utf8"))
    .resize(targetWidth)
    .png()
    .toFile(outPath);
}

/** Build favicon.ico with 16/32/48/64 px layers */
async function buildFavicon(markSvg: string): Promise<void> {
  const sizes = [16, 32, 48, 64];
  const tmpPaths: string[] = [];
  for (const sz of sizes) {
    const tmpPath = path.join(TMP, `favicon-${sz}.png`);
    // Render into exact sz×sz square with transparent padding so png-to-ico gets square input
    await sharp(Buffer.from(markSvg, "utf8"))
      .resize(sz, sz, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(tmpPath);
    tmpPaths.push(tmpPath);
  }
  // pngToIco default export accepts file-path array, returns Buffer
  const ico: Buffer = await (pngToIco as unknown as (paths: string[]) => Promise<Buffer>)(tmpPaths);
  fs.writeFileSync(path.join(OUT, "favicon.ico"), ico);
}

function buildManifest(files: string[]): void {
  const manifest = {
    generated_at: new Date().toISOString(),
    source: "assets/raw/logo-concepts/v03-horizontal-lockup.png",
    wave: "1.2",
    files: files.map((f) => path.relative(ROOT, f)),
  };
  fs.writeFileSync(path.join(OUT, "MANIFEST.json"), JSON.stringify(manifest, null, 2) + "\n");
}

function writeReadme(): void {
  const content = [
    "# Fynvita Production Logo System",
    "",
    "Generated by Wave 1.2 vectorization pipeline.",
    "",
    "## Files",
    "",
    "| File | Use |",
    "|------|-----|",
    "| `horizontal.svg` | Full lockup (mark + wordmark), primary use |",
    "| `vertical.svg` | Stacked lockup for square contexts |",
    "| `mark.svg` | Icon only — app icons, favicons, small spaces |",
    "| `wordmark.svg` | Text only — headers, minimal contexts |",
    "| `*-reversed.svg` | White-on-dark variants |",
    "| `*-mono.svg` | Single-color variants |",
    "| `favicon.ico` | 16/32/48/64 px multi-layer favicon |",
    "| `*@2x.png` | 2× raster for screens (retina) |",
    "| `*@3x.png` | 3× raster for high-DPI |",
    "",
    "## Brand Colors",
    "",
    `- Mark fill: Vital Green \`${VITAL_GREEN}\``,
    `- Wordmark: Deep Navy \`${DEEP_NAVY}\``,
    "",
    "## Minimum Sizes",
    "",
    "- Full logo: 120 px wide",
    "- Icon only: 32×32 px",
    "- Wordmark: 80 px wide",
    "",
  ].join("\n");
  fs.writeFileSync(path.join(OUT, "README.md"), content);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  process.stdout.write("Wave 1.2 — Logo Vectorization Pipeline\n\n");

  ensureDirs();
  const produced: string[] = [];

  // 1. Extract mark crop
  log("Extracting mark crop from source…");
  const markPng = await extractMarkPng();
  log(`  Mark crop: ${markPng.length} bytes`);

  // 2. Vectorize mark
  log("Running VTracer…");
  const rawSvg = runVTracer(markPng);
  const pathCount = (rawSvg.match(/<path/g) ?? []).length;
  log(`  VTracer produced ${pathCount} path(s)`);

  // 3. Build canonical SVGs
  log("Building SVGs…");

  const markSvgGreen = optimizeSvg(buildMarkSvg(rawSvg, VITAL_GREEN, 240));
  const markSvgWhite = optimizeSvg(buildMarkSvg(rawSvg, WHITE, 240));
  const markSvgBlack = optimizeSvg(buildMarkSvg(rawSvg, BLACK, 240));

  const horizontalSvg = optimizeSvg(buildHorizontalSvg(markSvgGreen, "", VITAL_GREEN, DEEP_NAVY));
  const horizontalRevSvg = optimizeSvg(buildHorizontalSvg(markSvgWhite, "", WHITE, WHITE));
  const horizontalMonoSvg = optimizeSvg(buildHorizontalSvg(markSvgBlack, "", BLACK, BLACK));

  const verticalSvg = optimizeSvg(buildVerticalSvg(markSvgGreen, VITAL_GREEN, DEEP_NAVY));
  const verticalRevSvg = optimizeSvg(buildVerticalSvg(markSvgWhite, WHITE, WHITE));

  const wordmarkSvg = optimizeSvg(buildWordmarkSvg(DEEP_NAVY, 96));
  const wordmarkRevSvg = optimizeSvg(buildWordmarkSvg(WHITE, 96));

  const markRevSvg = markSvgWhite;
  const markMonoSvg = markSvgBlack;

  // 4. Write SVGs
  const svgFiles: Array<[string, string]> = [
    ["horizontal.svg", horizontalSvg],
    ["horizontal-reversed.svg", horizontalRevSvg],
    ["horizontal-mono.svg", horizontalMonoSvg],
    ["vertical.svg", verticalSvg],
    ["vertical-reversed.svg", verticalRevSvg],
    ["mark.svg", markSvgGreen],
    ["mark-reversed.svg", markRevSvg],
    ["mark-mono.svg", markMonoSvg],
    ["wordmark.svg", wordmarkSvg],
    ["wordmark-reversed.svg", wordmarkRevSvg],
  ];

  for (const [name, content] of svgFiles) {
    const outPath = path.join(OUT, name);
    fs.writeFileSync(outPath, content);
    produced.push(outPath);
    log(`  wrote ${name} (${content.length} bytes)`);
  }

  // 5. Rasterize PNGs (@2x, @3x)
  log("Rasterizing PNGs…");

  const rasterTargets: Array<[string, string, number, number]> = [
    // [svgContent, baseName, 2x-width, 3x-width]
    [horizontalSvg, "horizontal", 480, 720],
    [verticalSvg, "vertical", 200, 300],
    [markSvgGreen, "mark", 96, 144],
    [wordmarkSvg, "wordmark", 160, 240],
  ];

  for (const [svg, base, w2x, w3x] of rasterTargets) {
    const p2x = path.join(OUT, `${base}@2x.png`);
    const p3x = path.join(OUT, `${base}@3x.png`);
    await svgToPng(svg, w2x, p2x);
    await svgToPng(svg, w3x, p3x);
    produced.push(p2x, p3x);
    log(`  wrote ${base}@2x.png, ${base}@3x.png`);
  }

  // 6. Favicon
  log("Building favicon.ico…");
  await buildFavicon(markSvgGreen);
  produced.push(path.join(OUT, "favicon.ico"));
  log("  wrote favicon.ico (4 sizes: 16/32/48/64)");

  // 7. Manifest + README
  buildManifest(produced);
  writeReadme();
  produced.push(path.join(OUT, "MANIFEST.json"), path.join(OUT, "README.md"));

  // 8. Cleanup tmp
  fs.rmSync(TMP, { recursive: true, force: true });

  process.stdout.write(`\nDone. ${produced.length} files written to assets/production/logo/\n`);
}

main().catch((err) => {
  process.stderr.write(`Fatal: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
