#!/usr/bin/env npx tsx
/**
 * OpenAPI Spec Generator Script
 *
 * Scans all Next.js API route files and generates a complete OpenAPI 3.0
 * specification using the pure generator in src/lib/api/openapi-generator.ts.
 *
 * Usage:
 *   npx tsx scripts/generate-openapi.ts              # writes to src/lib/api/generated-openapi-spec.ts
 *   npx tsx scripts/generate-openapi.ts --json        # writes JSON to stdout
 *   npx tsx scripts/generate-openapi.ts --out path    # custom output path
 */

import * as fs from "fs";
import * as path from "path";
import {
  buildRouteMetadata,
  generateOpenAPISpec,
  type RouteMetadata,
} from "../src/lib/api/openapi-generator";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const PROJECT_ROOT = path.resolve(__dirname, "..");
const API_DIR = path.join(PROJECT_ROOT, "src", "app", "api");
const DEFAULT_OUTPUT = path.join(
  PROJECT_ROOT,
  "src",
  "lib",
  "api",
  "generated-openapi-spec.ts",
);

// ---------------------------------------------------------------------------
// Filesystem scanner
// ---------------------------------------------------------------------------

function findRouteFiles(dir: string): string[] {
  const results: string[] = [];

  function walk(current: string) {
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        // Skip __tests__ and node_modules
        if (entry.name === "__tests__" || entry.name === "node_modules") continue;
        walk(fullPath);
      } else if (entry.name === "route.ts") {
        results.push(fullPath);
      }
    }
  }

  walk(dir);
  return results.sort();
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const args = process.argv.slice(2);
  const jsonMode = args.includes("--json");
  const outIdx = args.indexOf("--out");
  const outputPath = outIdx !== -1 ? args[outIdx + 1] : DEFAULT_OUTPUT;

  // 1. Find all route.ts files
  const routeFiles = findRouteFiles(API_DIR);
  console.error(`Found ${routeFiles.length} API route files`);

  // 2. Build metadata from each route file
  const routes: RouteMetadata[] = [];
  let skipped = 0;

  for (const filePath of routeFiles) {
    const source = fs.readFileSync(filePath, "utf-8");
    const relativePath = path.relative(PROJECT_ROOT, filePath);
    const meta = buildRouteMetadata(relativePath, source);

    if (meta.methods.length === 0) {
      skipped++;
      continue;
    }

    routes.push(meta);
  }

  console.error(`Parsed ${routes.length} routes (${skipped} skipped — no HTTP methods)`);

  // 3. Generate OpenAPI spec
  const spec = generateOpenAPISpec(routes);
  const pathCount = Object.keys(spec.paths).length;
  let operationCount = 0;
  for (const pathItem of Object.values(spec.paths)) {
    operationCount += Object.keys(pathItem).length;
  }

  console.error(
    `Generated spec: ${pathCount} paths, ${operationCount} operations, ${spec.tags.length} tags`,
  );

  // 4. Output
  if (jsonMode) {
    process.stdout.write(JSON.stringify(spec, null, 2) + "\n");
  } else {
    const tsContent = [
      "/**",
      " * Auto-generated OpenAPI 3.0 Specification",
      " *",
      ` * Generated: ${new Date().toISOString().split("T")[0]}`,
      ` * Routes: ${routes.length}`,
      ` * Operations: ${operationCount}`,
      ` * Tags: ${spec.tags.length}`,
      " *",
      " * DO NOT EDIT — regenerate with: npx tsx scripts/generate-openapi.ts",
      " */",
      "",
      "import type { OpenAPISpec } from \"./openapi-generator\";",
      "",
      `export const generatedOpenAPISpec: OpenAPISpec = ${JSON.stringify(spec, null, 2)} as unknown as OpenAPISpec;`,
      "",
    ].join("\n");

    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, tsContent, "utf-8");
    console.error(`Written to ${path.relative(PROJECT_ROOT, outputPath)}`);
  }
}

main();
