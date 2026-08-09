import sharp from "sharp";
import fs from "fs";
import path from "path";

const ROOT = process.cwd();

const SOURCES = {
  lightMark: path.resolve(ROOT, "assets/production/logo/fynvita-mark.png"),
  iosLight: path.resolve(ROOT, "assets/production/logo/fynvita-app-icon.png"),
  iosDark: path.resolve(ROOT, "assets/raw/app-icons-source/ios-dark.png"),
  iosTinted: path.resolve(ROOT, "assets/raw/app-icons-source/ios-tinted.png"),
  androidMono: path.resolve(ROOT, "assets/raw/app-icons-source/android-monochrome.png"),
};

const OUT = path.resolve(ROOT, "assets/production/app-icons");

const VITAL_GREEN = { r: 16, g: 185, b: 129 };

interface FileRecord {
  path: string;
  dimensions: string;
  bytes: number;
  usage: string;
}

const manifest: FileRecord[] = [];

function mkdirp(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

async function recordAsync(filePath: string, usage: string, dimensions?: string): Promise<void> {
  const stat = fs.statSync(filePath);
  let dims = dimensions ?? "unknown";
  if (!dimensions) {
    const meta = await sharp(filePath).metadata();
    dims = `${meta.width}x${meta.height}`;
  }
  manifest.push({
    path: filePath.replace(ROOT + "/", ""),
    dimensions: dims,
    bytes: stat.size,
    usage,
  });
}

async function resizePng(src: string, dest: string, size: number): Promise<void> {
  await sharp(src)
    .resize(size, size, { fit: "fill" })
    .png({ compressionLevel: 9 })
    .toFile(dest);
}

async function buildFavicons(): Promise<void> {
  console.log("  Building web favicons...");
  const webDir = path.join(OUT, "web");
  mkdirp(webDir);

  const sizes = [16, 32, 48];
  const pngPaths: string[] = [];

  for (const size of sizes) {
    const dest = path.join(webDir, `favicon-${size}.png`);
    await resizePng(SOURCES.lightMark, dest, size);
    pngPaths.push(dest);
  }

  // Build .ico from the 3 PNG files using png-to-ico
  const pngToIco = await import("png-to-ico");
  const icoFn = pngToIco.default ?? pngToIco;
  const icoBuffer = await (icoFn as (paths: string[]) => Promise<Buffer>)(pngPaths);
  const icoPath = path.join(webDir, "favicon.ico");
  fs.writeFileSync(icoPath, icoBuffer);

  await recordAsync(pngPaths[0], "web favicon 16px");
  await recordAsync(pngPaths[1], "web favicon 32px");
  await recordAsync(pngPaths[2], "web favicon 48px");
  await recordAsync(icoPath, "web favicon multi-res .ico (16/32/48)", "16/32/48");
}

async function buildWebIcons(): Promise<void> {
  console.log("  Building apple-touch-icon and PWA icons...");
  const webDir = path.join(OUT, "web");

  // apple-touch-icon 180x180 — white on green
  const atPath = path.join(webDir, "apple-touch-icon.png");
  await resizePng(SOURCES.iosLight, atPath, 180);
  await recordAsync(atPath, "apple-touch-icon for Safari/iOS homescreen");

  // PWA 192 and 512
  const pwa192 = path.join(webDir, "pwa-192.png");
  const pwa512 = path.join(webDir, "pwa-512.png");
  await resizePng(SOURCES.iosLight, pwa192, 192);
  await resizePng(SOURCES.iosLight, pwa512, 512);
  await recordAsync(pwa192, "PWA manifest icon 192x192");
  await recordAsync(pwa512, "PWA manifest icon 512x512");

  // PWA maskable — scale mark to 80%, pad with solid green
  for (const size of [192, 512]) {
    const markSize = Math.round(size * 0.8);
    const pad = Math.round((size - markSize) / 2);
    const destPath = path.join(webDir, `pwa-maskable-${size}.png`);

    const resizedMark = await sharp(SOURCES.iosLight)
      .resize(markSize, markSize, { fit: "fill" })
      .png()
      .toBuffer();

    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { ...VITAL_GREEN, alpha: 255 },
      },
    })
      .composite([{ input: resizedMark, left: pad, top: pad }])
      .png({ compressionLevel: 9 })
      .toFile(destPath);

    await recordAsync(destPath, `PWA maskable icon ${size}x${size} (safe-zone padded)`);
  }
}

async function buildIosIcons(): Promise<void> {
  console.log("  Building iOS icons...");
  const iosDir = path.join(OUT, "ios");
  mkdirp(iosDir);

  // Light variant — full size set
  const lightSizes = [20, 29, 40, 58, 60, 76, 80, 87, 120, 152, 167, 180, 1024];
  for (const size of lightSizes) {
    const dest = path.join(iosDir, `AppIcon-Light-${size}.png`);
    await resizePng(SOURCES.iosLight, dest, size);
    await recordAsync(dest, `iOS Light app icon ${size}x${size}`);
  }

  // Dark 1024 — copy raw source
  const darkDest = path.join(iosDir, "AppIcon-Dark-1024.png");
  await resizePng(SOURCES.iosDark, darkDest, 1024);
  await recordAsync(darkDest, "iOS Dark app icon 1024x1024 (iOS 18+ dark appearance)");

  // Tinted 1024 — copy raw source
  const tintedDest = path.join(iosDir, "AppIcon-Tinted-1024.png");
  await resizePng(SOURCES.iosTinted, tintedDest, 1024);
  await recordAsync(tintedDest, "iOS Tinted app icon 1024x1024 (iOS 18+ tinted appearance)");
}

async function buildAndroidIcons(): Promise<void> {
  console.log("  Building Android icons...");
  const androidDir = path.join(OUT, "android");
  const mipmapDir = path.join(androidDir, "mipmap");
  mkdirp(androidDir);
  mkdirp(mipmapDir);

  // Foreground: use androidMono white silhouette composited on transparent at 432x432
  // with 66% safe zone (mark at ~285px centered in 432px canvas, ~17% padding each side)
  const fgMarkSize = Math.round(432 * 0.66); // ~285
  const fgPad = Math.round((432 - fgMarkSize) / 2); // ~74

  const monoResized = await sharp(SOURCES.androidMono)
    .resize(fgMarkSize, fgMarkSize, { fit: "fill" })
    .png()
    .toBuffer();

  const fgPath = path.join(androidDir, "ic_launcher_foreground.png");
  await sharp({
    create: { width: 432, height: 432, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: monoResized, left: fgPad, top: fgPad }])
    .png({ compressionLevel: 9 })
    .toFile(fgPath);
  await recordAsync(fgPath, "Android adaptive icon foreground 432x432 (transparent background)");

  // Background: solid Vital Green 432x432
  const bgPath = path.join(androidDir, "ic_launcher_background.png");
  await sharp({
    create: { width: 432, height: 432, channels: 3, background: VITAL_GREEN },
  })
    .png({ compressionLevel: 9 })
    .toFile(bgPath);
  await recordAsync(bgPath, "Android adaptive icon background 432x432 (Vital Green #10B981)");

  // Monochrome 432x432
  const monoPath = path.join(androidDir, "ic_launcher_monochrome.png");
  await resizePng(SOURCES.androidMono, monoPath, 432);
  await recordAsync(monoPath, "Android themed icon monochrome 432x432 (Android 13+)");

  // Composite foreground on background for mipmap sizes
  const mipmapSizes: Array<{ density: string; size: number }> = [
    { density: "mdpi", size: 48 },
    { density: "hdpi", size: 72 },
    { density: "xhdpi", size: 96 },
    { density: "xxhdpi", size: 144 },
    { density: "xxxhdpi", size: 192 },
  ];

  for (const { density, size } of mipmapSizes) {
    // Resize background
    const bgResized = await sharp({
      create: { width: size, height: size, channels: 3, background: VITAL_GREEN },
    })
      .png()
      .toBuffer();

    // Resize foreground mark
    const markInner = Math.round(size * 0.66);
    const markPad = Math.round((size - markInner) / 2);
    const monoAtSize = await sharp(SOURCES.androidMono)
      .resize(markInner, markInner, { fit: "fill" })
      .png()
      .toBuffer();

    const destPath = path.join(mipmapDir, `${density}-${size}.png`);
    await sharp(bgResized)
      .composite([{ input: monoAtSize, left: markPad, top: markPad }])
      .png({ compressionLevel: 9 })
      .toFile(destPath);
    await recordAsync(destPath, `Android mipmap ${density} ic_launcher ${size}x${size}`);
  }
}

function writeManifestWebmanifest(): void {
  const manifestPath = path.join(OUT, "manifest.webmanifest");
  const content = {
    name: "Fynvita",
    short_name: "Fynvita",
    description: "Your Financial Vitality",
    icons: [
      { src: "/app-icons/web/pwa-192.png", sizes: "192x192", type: "image/png" },
      { src: "/app-icons/web/pwa-512.png", sizes: "512x512", type: "image/png" },
      { src: "/app-icons/web/pwa-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/app-icons/web/pwa-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    theme_color: "#10B981",
    background_color: "#FFFFFF",
    display: "standalone",
  };
  fs.writeFileSync(manifestPath, JSON.stringify(content, null, 2));
  console.log("  Written manifest.webmanifest");
}

function writeReadme(): void {
  const readmePath = path.join(OUT, "README.md");
  const content = `# Fynvita App Icons

Production app icon set for iOS, Android, PWA, and web. Generated by Wave 1.3 of the Fynvita asset system.

## Wiring Guide

| File | Install to |
|------|-----------|
| \`web/favicon.ico\` | \`public/favicon.ico\` |
| \`web/favicon-16.png\`, \`favicon-32.png\`, \`favicon-48.png\` | \`public/app-icons/web/\` |
| \`web/pwa-192.png\`, \`web/pwa-512.png\` | \`public/app-icons/web/\` + reference in manifest |
| \`web/pwa-maskable-192.png\`, \`web/pwa-maskable-512.png\` | \`public/app-icons/web/\` + reference in manifest (purpose: maskable) |
| \`web/apple-touch-icon.png\` | \`public/apple-touch-icon.png\` |
| \`ios/AppIcon-Light-*.png\` | \`mobile-app/ios/Fynvita/Images.xcassets/AppIcon.appiconset/\` |
| \`ios/AppIcon-Dark-1024.png\` | \`mobile-app/ios/Fynvita/Images.xcassets/AppIcon.appiconset/\` (dark appearance) |
| \`ios/AppIcon-Tinted-1024.png\` | \`mobile-app/ios/Fynvita/Images.xcassets/AppIcon.appiconset/\` (tinted appearance) |
| \`android/ic_launcher_foreground.png\` | \`mobile-app/android/app/src/main/res/mipmap-anydpi-v26/\` |
| \`android/ic_launcher_background.png\` | \`mobile-app/android/app/src/main/res/mipmap-anydpi-v26/\` |
| \`android/ic_launcher_monochrome.png\` | \`mobile-app/android/app/src/main/res/mipmap-anydpi-v33/\` |
| \`android/mipmap/mdpi-48.png\` | \`mobile-app/android/app/src/main/res/mipmap-mdpi/ic_launcher.png\` |
| \`android/mipmap/hdpi-72.png\` | \`mobile-app/android/app/src/main/res/mipmap-hdpi/ic_launcher.png\` |
| \`android/mipmap/xhdpi-96.png\` | \`mobile-app/android/app/src/main/res/mipmap-xhdpi/ic_launcher.png\` |
| \`android/mipmap/xxhdpi-144.png\` | \`mobile-app/android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png\` |
| \`android/mipmap/xxxhdpi-192.png\` | \`mobile-app/android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png\` |

## Regeneration

\`\`\`bash
npm run assets:gen -- --spec app-icons-source
npm run assets:derive-icons
\`\`\`

## Sizes Reference

See \`MANIFEST.json\` in this directory for the full file list with exact dimensions and byte sizes.
Summary: web (9 files: favicons 16/32/48, ico, apple-touch 180, pwa 192/512, maskable 192/512),
iOS (15 files: Light at 20/29/40/58/60/76/80/87/120/152/167/180/1024, Dark 1024, Tinted 1024),
Android (8 files: foreground/background/monochrome 432, mipmap mdpi-48/hdpi-72/xhdpi-96/xxhdpi-144/xxxhdpi-192).

## Android 13+ Monochrome (Themed Icons)

\`ic_launcher_monochrome.png\` is a single-channel white-on-black silhouette. Android 13+ uses this
with the user's chosen theme color via \`mipmap-anydpi-v33/ic_launcher.xml\`.

## iOS 18+ Dark and Tinted Appearance

\`AppIcon-Dark-1024.png\` — used when the user switches to dark mode on iOS 18+.
\`AppIcon-Tinted-1024.png\` — used when the user enables tinted icons (iOS 18+); the system replaces the
background with the wallpaper's extracted tint color. Reference both in your Xcode asset catalog.
`;
  fs.writeFileSync(readmePath, content);
  console.log("  Written README.md");
}

async function writeManifestJson(): Promise<void> {
  const manifestPath = path.join(OUT, "MANIFEST.json");
  const output = {
    generated_at: new Date().toISOString(),
    source_spec: "assets/specs/app-icons-source.toml",
    source_model: "gemini-3-pro-image-preview",
    files: manifest,
  };
  fs.writeFileSync(manifestPath, JSON.stringify(output, null, 2));
  console.log(`  Written MANIFEST.json (${manifest.length} files)`);
}

async function main(): Promise<void> {
  // Verify source files exist
  for (const [key, p] of Object.entries(SOURCES)) {
    if (!fs.existsSync(p)) {
      throw new Error(`Source file missing: ${key} → ${p}`);
    }
  }

  mkdirp(OUT);
  mkdirp(path.join(OUT, "web"));
  mkdirp(path.join(OUT, "ios"));
  mkdirp(path.join(OUT, "android"));
  mkdirp(path.join(OUT, "android/mipmap"));

  await buildFavicons();
  await buildWebIcons();
  await buildIosIcons();
  await buildAndroidIcons();

  writeManifestWebmanifest();
  writeReadme();
  await writeManifestJson();

  console.log(`\nDone. ${manifest.length} files written to ${OUT}`);
}

main().catch((err: unknown) => {
  process.stderr.write(`Fatal: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
