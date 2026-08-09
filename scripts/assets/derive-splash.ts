import sharp from "sharp";
import fs from "fs";
import path from "path";

const ROOT = process.cwd();

const SOURCES = {
  appIcon: path.resolve(ROOT, "assets/production/logo/fynvita-app-icon.png"),
  mark: path.resolve(ROOT, "assets/production/logo/fynvita-mark.png"),
  androidMono: path.resolve(ROOT, "assets/raw/app-icons-source/android-monochrome.png"),
};

const SPLASH_OUT = path.resolve(ROOT, "assets/production/splash");
const MOBILE_ASSETS = path.resolve(ROOT, "mobile-app/assets");

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

async function record(filePath: string, usage: string, dimensions?: string): Promise<void> {
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

async function resizePng(src: string, dest: string, w: number, h: number): Promise<void> {
  await sharp(src)
    .resize(w, h, { fit: "fill" })
    .png({ compressionLevel: 9 })
    .toFile(dest);
}

async function buildSplashPortrait(): Promise<void> {
  // 1284x2778 — iPhone 14 Pro Max native. Mark at 40% width, centered at 45% from top.
  const W = 1284;
  const H = 2778;
  const markSize = Math.round(W * 0.4);
  const markLeft = Math.round((W - markSize) / 2);
  const markTop = Math.round(H * 0.45) - Math.round(markSize / 2);

  const markBuf = await sharp(SOURCES.appIcon)
    .resize(markSize, markSize, { fit: "fill" })
    .png()
    .toBuffer();

  const destPath = path.join(SPLASH_OUT, "splash-1284x2778.png");
  await sharp({
    create: { width: W, height: H, channels: 3, background: VITAL_GREEN },
  })
    .composite([{ input: markBuf, left: markLeft, top: markTop }])
    .png({ compressionLevel: 9 })
    .toFile(destPath);

  await record(destPath, "Expo splash screen portrait 1284x2778 (iPhone 14 Pro Max)");
}

async function buildSplashSquare(): Promise<void> {
  // 1024x1024 — Expo contain-mode fallback. Mark at 60% of canvas.
  const SIZE = 1024;
  const markSize = Math.round(SIZE * 0.6);
  const pad = Math.round((SIZE - markSize) / 2);

  const markBuf = await sharp(SOURCES.appIcon)
    .resize(markSize, markSize, { fit: "fill" })
    .png()
    .toBuffer();

  const destPath = path.join(SPLASH_OUT, "splash-1024x1024.png");
  await sharp({
    create: { width: SIZE, height: SIZE, channels: 3, background: VITAL_GREEN },
  })
    .composite([{ input: markBuf, left: pad, top: pad }])
    .png({ compressionLevel: 9 })
    .toFile(destPath);

  await record(destPath, "Expo splash screen square 1024x1024 (contain-mode fallback)");
}

async function updateMobileAssets(): Promise<void> {
  console.log("  Updating mobile-app/assets/ ...");

  // splash.png — use the portrait splash
  const mobileSplash = path.join(MOBILE_ASSETS, "splash.png");
  fs.copyFileSync(path.join(SPLASH_OUT, "splash-1284x2778.png"), mobileSplash);
  await record(mobileSplash, "mobile-app splash.png (Expo splash screen)");

  // icon.png — 1024x1024 app icon
  const mobileIcon = path.join(MOBILE_ASSETS, "icon.png");
  await resizePng(SOURCES.appIcon, mobileIcon, 1024, 1024);
  await record(mobileIcon, "mobile-app icon.png (Expo app icon 1024x1024)");

  // adaptive-icon.png — 1024x1024 for Android adaptive foreground
  const mobileAdaptive = path.join(MOBILE_ASSETS, "adaptive-icon.png");
  await resizePng(SOURCES.appIcon, mobileAdaptive, 1024, 1024);
  await record(mobileAdaptive, "mobile-app adaptive-icon.png (Android adaptive icon foreground)");

  // favicon.png — 48x48 mark for web
  const mobileFavicon = path.join(MOBILE_ASSETS, "favicon.png");
  await resizePng(SOURCES.mark, mobileFavicon, 48, 48);
  await record(mobileFavicon, "mobile-app favicon.png (web favicon 48x48)");

  // notification-icon.png — 96x96 white silhouette on transparent
  const mobileNotif = path.join(MOBILE_ASSETS, "notification-icon.png");
  await sharp(SOURCES.androidMono)
    .resize(96, 96, { fit: "fill" })
    .png({ compressionLevel: 9 })
    .toFile(mobileNotif);
  await record(mobileNotif, "mobile-app notification-icon.png (96x96 mono silhouette)");
}

async function writeManifestJson(): Promise<void> {
  const manifestPath = path.join(SPLASH_OUT, "MANIFEST.json");
  const output = {
    generated_at: new Date().toISOString(),
    source_spec: "assets/specs/splash-source.toml",
    files: manifest,
  };
  fs.writeFileSync(manifestPath, JSON.stringify(output, null, 2));
  console.log(`  Written MANIFEST.json (${manifest.length} files)`);
}

async function main(): Promise<void> {
  for (const [key, p] of Object.entries(SOURCES)) {
    if (!fs.existsSync(p)) {
      throw new Error(`Source file missing: ${key} → ${p}`);
    }
  }

  mkdirp(SPLASH_OUT);

  console.log("  Building production splash screens...");
  await buildSplashPortrait();
  await buildSplashSquare();

  await updateMobileAssets();
  await writeManifestJson();

  console.log(`\nDone. ${manifest.length} files written.`);
}

main().catch((err: unknown) => {
  process.stderr.write(`Fatal: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
