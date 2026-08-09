export type ModelId =
  | "gemini-3-pro-image-preview"
  | "gemini-2.5-flash-image"
  | "imagen-4.0-ultra-generate-001";

export interface ModelConfig {
  id: ModelId;
  label: string;
  supports: { resolutions: string[]; maxImagesPerCall: number };
  pricing: Record<string, number>;
  bestFor: string[];
}

export const MODELS: Record<ModelId, ModelConfig> = {
  "gemini-3-pro-image-preview": {
    id: "gemini-3-pro-image-preview",
    label: "Nano Banana Pro",
    supports: { resolutions: ["2K", "4K"], maxImagesPerCall: 1 },
    pricing: { "2K": 0.134, "4K": 0.24 },
    bestFor: ["logos", "wordmarks", "hero", "marketing", "text-heavy"],
  },
  "gemini-2.5-flash-image": {
    id: "gemini-2.5-flash-image",
    label: "Nano Banana",
    supports: { resolutions: ["1024x1024"], maxImagesPerCall: 1 },
    pricing: { "1024x1024": 0.039 },
    bestFor: ["illustrations", "empty-states", "bulk"],
  },
  "imagen-4.0-ultra-generate-001": {
    id: "imagen-4.0-ultra-generate-001",
    label: "Imagen 4 Ultra",
    supports: { resolutions: ["1024x1024", "2K", "4K"], maxImagesPerCall: 1 },
    pricing: { "1024x1024": 0.04, "2K": 0.16, "4K": 0.32 },
    bestFor: ["photorealism", "fallback"],
  },
};

export function pricePerImage(model: ModelId, res: string): number {
  const config = MODELS[model];
  const price = config.pricing[res];
  if (price === undefined) {
    throw new Error(
      `Model "${model}" has no pricing for resolution "${res}". ` +
        `Supported: ${Object.keys(config.pricing).join(", ")}`
    );
  }
  return price;
}

export function validateResolution(model: ModelId, res: string): void {
  const config = MODELS[model];
  if (!config.supports.resolutions.includes(res)) {
    throw new Error(
      `Model "${model}" does not support resolution "${res}". ` +
        `Supported: ${config.supports.resolutions.join(", ")}`
    );
  }
}
