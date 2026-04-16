import { z } from "zod";
import fs from "fs";
import path from "path";
import { parse } from "smol-toml";
import { validateResolution } from "./models.js";
import type { ModelId } from "./models.js";

const MODEL_IDS = [
  "gemini-3-pro-image-preview",
  "gemini-2.5-flash-image",
  "imagen-4.0-ultra-generate-001",
] as const;

const VariantSchema = z.object({
  id: z.string().min(1, "variant id must not be empty"),
  prompt: z.string().min(1, "variant prompt must not be empty"),
});

export const SpecSchema = z.object({
  name: z.string().min(1, "name must not be empty"),
  wave: z.number().int().positive("wave must be a positive integer"),
  model: z.enum(MODEL_IDS, {
    error: `model must be one of: ${MODEL_IDS.join(", ")}`,
  }),
  resolution: z.string().min(1, "resolution must not be empty"),
  out_dir: z.string().min(1, "out_dir must not be empty"),
  count: z.number().int().positive("count must be a positive integer"),
  variants: z.array(VariantSchema).optional(),
  shared_prompt: z.string().optional(),
  preamble: z.boolean().optional(),
  negative: z.array(z.string()).optional(),
});

export type Spec = z.infer<typeof SpecSchema>;
export type SpecVariant = z.infer<typeof VariantSchema>;

export function parseSpec(tomlContent: string, filePath: string): Spec {
  let raw: unknown;
  try {
    raw = parse(tomlContent);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`TOML parse error in ${filePath}: ${msg}`);
  }

  const result = SpecSchema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Spec validation failed for ${filePath}:\n${issues}`);
  }

  const spec = result.data;
  try {
    validateResolution(spec.model as ModelId, spec.resolution);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Spec validation failed for ${filePath}:\n  resolution: ${msg}`);
  }

  if (!spec.variants?.length && !spec.shared_prompt) {
    throw new Error(
      `Spec validation failed for ${filePath}:\n  Must provide either variants[] or shared_prompt`
    );
  }

  return spec;
}

export function loadSpecFile(filePath: string): Spec {
  const content = fs.readFileSync(filePath, "utf-8");
  return parseSpec(content, filePath);
}

export function loadSpecsFromDir(specsDir: string): Spec[] {
  if (!fs.existsSync(specsDir)) return [];
  const files = fs
    .readdirSync(specsDir)
    .filter((f) => f.endsWith(".toml") && !f.startsWith("_"));
  return files.map((f) => loadSpecFile(path.join(specsDir, f)));
}

export function resolveVariants(spec: Spec): SpecVariant[] {
  if (spec.variants?.length) {
    if (!spec.preamble || !spec.shared_prompt) return spec.variants;
    return spec.variants.map((v) => ({
      id: v.id,
      prompt: `${spec.shared_prompt}\n${v.prompt}`,
    }));
  }
  const prompt = spec.shared_prompt ?? "";
  return Array.from({ length: spec.count }, (_, i) => ({
    id: `v${String(i + 1).padStart(2, "0")}`,
    prompt,
  }));
}
