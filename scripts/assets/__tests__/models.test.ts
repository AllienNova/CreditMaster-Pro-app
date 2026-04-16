import { MODELS, pricePerImage, validateResolution } from "../lib/models";

describe("MODELS registry", () => {
  it("has all 3 expected models", () => {
    expect(MODELS["gemini-3-pro-image-preview"]).toBeDefined();
    expect(MODELS["gemini-2.5-flash-image"]).toBeDefined();
    expect(MODELS["imagen-4.0-ultra-generate-001"]).toBeDefined();
  });

  it("Pro model has 2K and 4K resolutions", () => {
    const resolutions = MODELS["gemini-3-pro-image-preview"].supports.resolutions;
    expect(resolutions).toContain("2K");
    expect(resolutions).toContain("4K");
  });

  it("Flash model has only 1024x1024 resolution", () => {
    const resolutions = MODELS["gemini-2.5-flash-image"].supports.resolutions;
    expect(resolutions).toEqual(["1024x1024"]);
  });
});

describe("pricePerImage", () => {
  it('returns 0.134 for Pro + 2K', () => {
    expect(pricePerImage("gemini-3-pro-image-preview", "2K")).toBe(0.134);
  });

  it('returns 0.24 for Pro + 4K', () => {
    expect(pricePerImage("gemini-3-pro-image-preview", "4K")).toBe(0.24);
  });

  it('returns 0.039 for Flash + 1024x1024', () => {
    expect(pricePerImage("gemini-2.5-flash-image", "1024x1024")).toBe(0.039);
  });

  it("throws for unknown resolution", () => {
    expect(() => pricePerImage("gemini-2.5-flash-image", "4K")).toThrow();
  });
});

describe("validateResolution", () => {
  it("accepts valid resolution for Pro", () => {
    expect(() => validateResolution("gemini-3-pro-image-preview", "2K")).not.toThrow();
    expect(() => validateResolution("gemini-3-pro-image-preview", "4K")).not.toThrow();
  });

  it("throws for 4K on Flash model", () => {
    expect(() => validateResolution("gemini-2.5-flash-image", "4K")).toThrow(/does not support/);
  });

  it("throws for 2K on Flash model", () => {
    expect(() => validateResolution("gemini-2.5-flash-image", "2K")).toThrow(/does not support/);
  });

  it("accepts 1024x1024 for Flash model", () => {
    expect(() => validateResolution("gemini-2.5-flash-image", "1024x1024")).not.toThrow();
  });
});
