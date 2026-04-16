import path from "path";
import { generateImage } from "./lib/gemini.js";
import { loadSpecsFromDir, resolveVariants, type Spec } from "./lib/spec.js";
import { pricePerImage } from "./lib/models.js";
import type { ModelId } from "./lib/models.js";
import {
  createManifest,
  readManifest,
  writeManifest,
  shouldSkip,
  upsertResult,
  type Manifest,
} from "./lib/manifest.js";
import { log } from "./lib/logger.js";

const SPECS_DIR = path.resolve(process.cwd(), "assets/specs");

interface CliArgs {
  wave?: number;
  spec?: string;
  dryRun: boolean;
  force: boolean;
  help: boolean;
  subcommand: string;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { dryRun: false, force: false, help: false, subcommand: "gen" };
  const rest = argv.slice(2);
  // first positional may be subcommand from npm scripts (gen, deploy, etc.)
  if (rest[0] && !rest[0].startsWith("-")) {
    args.subcommand = rest.shift() ?? "gen";
  }
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i];
    if (arg === "--help" || arg === "-h") {
      args.help = true;
    } else if (arg === "--dry-run") {
      args.dryRun = true;
    } else if (arg === "--force") {
      args.force = true;
    } else if (arg === "--wave") {
      args.wave = parseInt(rest[++i] ?? "", 10);
    } else if (arg === "--spec") {
      args.spec = rest[++i];
    }
  }
  return args;
}

function printHelp(): void {
  process.stdout.write(
    [
      "Usage: npm run assets:gen -- [options]",
      "",
      "Options:",
      "  --wave <n>     Generate all specs tagged wave=n",
      "  --spec <name>  Generate a single spec by name",
      "  --dry-run      Show plan without making API calls",
      "  --force        Re-generate even if outputs exist",
      "  --help         Show this message",
      "",
      "Examples:",
      "  npm run assets:gen -- --wave 1",
      "  npm run assets:gen -- --spec logo-concepts",
      "  npm run assets:gen -- --wave 1 --dry-run",
      "",
    ].join("\n")
  );
}

function filterSpecs(specs: Spec[], args: CliArgs): Spec[] {
  if (args.spec) return specs.filter((s) => s.name === args.spec);
  if (args.wave !== undefined) return specs.filter((s) => s.wave === args.wave);
  return specs;
}

async function runSpec(spec: Spec, args: CliArgs): Promise<void> {
  const outDir = path.resolve(process.cwd(), spec.out_dir);
  const variants = resolveVariants(spec);
  const costPer = pricePerImage(spec.model as ModelId, spec.resolution);
  const estCost = (costPer * variants.length).toFixed(2);

  log.info(
    `Generating ${spec.name} (${variants.length} variants, model=${spec.model}, est. cost=$${estCost})`
  );

  if (args.dryRun) {
    log.info(`[dry-run] Would generate ${variants.length} images to ${outDir}`);
    return;
  }

  const existing = readManifest(outDir);
  const manifest: Manifest = existing ?? createManifest(spec.name, spec.model);
  let okCount = 0;
  let failCount = 0;
  let totalCost = 0;

  for (let i = 0; i < variants.length; i++) {
    const variant = variants[i];
    if (shouldSkip(existing, variant.id, args.force)) {
      log.info(`skip  ${variant.id} (already ok)`);
      okCount++;
      continue;
    }

    const outPath = path.join(outDir, `${variant.id}.png`);
    const start = Date.now();
    try {
      const result = await generateImage({
        prompt: variant.prompt,
        model: spec.model,
        outPath,
        resolution: spec.resolution,
      });
      const ms = Date.now() - start;
      const kb = (result.bytes / 1024).toFixed(0);
      const cost = costPer;
      totalCost += cost;
      log.ok(`${variant.id} (${kb}KB, ${(ms / 1000).toFixed(1)}s, $${cost.toFixed(3)})`);
      upsertResult(manifest, {
        id: variant.id,
        path: outPath,
        bytes: result.bytes,
        status: "ok",
        ms,
      });
      okCount++;
    } catch (err) {
      const ms = Date.now() - start;
      const msg = err instanceof Error ? err.message : String(err);
      log.fail(`${variant.id} — ${msg}`);
      upsertResult(manifest, {
        id: variant.id,
        path: outPath,
        bytes: 0,
        status: "failed",
        ms,
        error: msg,
      });
      failCount++;
    }

    manifest.total_cost_usd = totalCost;
    writeManifest(outDir, manifest);

    if (i < variants.length - 1) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  manifest.completed_at = new Date().toISOString();
  writeManifest(outDir, manifest);

  const failNote = failCount > 0 ? `, ${failCount} failed` : "";
  log.done(
    `${spec.name} — ${okCount}/${variants.length} ok, cost=$${totalCost.toFixed(2)}${failNote}`
  );
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv);

  if (args.help) {
    printHelp();
    return;
  }

  const allSpecs = loadSpecsFromDir(SPECS_DIR);
  const specs = filterSpecs(allSpecs, args);

  if (specs.length === 0) {
    const filter = args.spec
      ? `spec "${args.spec}"`
      : args.wave !== undefined
        ? `wave ${args.wave}`
        : "no filter";
    log.warn(`No specs found for ${filter} in ${SPECS_DIR}`);
    return;
  }

  for (const spec of specs) {
    await runSpec(spec, args);
  }

  log.info(`All done. Processed ${specs.length} spec(s).`);
}

main().catch((err) => {
  process.stderr.write(`Fatal: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
