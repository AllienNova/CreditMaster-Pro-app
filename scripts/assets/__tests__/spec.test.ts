import { parseSpec } from "../lib/spec";

const VALID_MINIMAL = `
name = "logo-concepts"
wave = 1
model = "gemini-3-pro-image-preview"
resolution = "2K"
out_dir = "assets/raw/logo-concepts"
count = 2
shared_prompt = "A test prompt for Fynvita logo generation."
`;

const VALID_WITH_VARIANTS = `
name = "logo-concepts"
wave = 1
model = "gemini-2.5-flash-image"
resolution = "1024x1024"
out_dir = "assets/raw/logo-concepts"
count = 2

[[variants]]
id = "v01"
prompt = "First variant prompt."

[[variants]]
id = "v02"
prompt = "Second variant prompt."
`;

describe("parseSpec — valid specs", () => {
  it("accepts a minimal valid spec", () => {
    const spec = parseSpec(VALID_MINIMAL, "test.toml");
    expect(spec.name).toBe("logo-concepts");
    expect(spec.wave).toBe(1);
    expect(spec.model).toBe("gemini-3-pro-image-preview");
    expect(spec.resolution).toBe("2K");
    expect(spec.count).toBe(2);
  });

  it("accepts spec with variants array", () => {
    const spec = parseSpec(VALID_WITH_VARIANTS, "test.toml");
    expect(spec.variants).toHaveLength(2);
    expect(spec.variants?.[0].id).toBe("v01");
  });

  it("accepts optional fields: preamble, negative", () => {
    const toml = VALID_MINIMAL + `preamble = true\nnegative = ["gradients", "shadows"]\n`;
    const spec = parseSpec(toml, "test.toml");
    expect(spec.preamble).toBe(true);
    expect(spec.negative).toEqual(["gradients", "shadows"]);
  });
});

describe("parseSpec — invalid specs", () => {
  it("fails when name is missing", () => {
    const toml = VALID_MINIMAL.replace('name = "logo-concepts"\n', "");
    expect(() => parseSpec(toml, "test.toml")).toThrow(/name/);
  });

  it("fails when wave is missing", () => {
    const toml = VALID_MINIMAL.replace("wave = 1\n", "");
    expect(() => parseSpec(toml, "test.toml")).toThrow(/wave/);
  });

  it("fails on invalid model id", () => {
    const toml = VALID_MINIMAL.replace(
      'model = "gemini-3-pro-image-preview"',
      'model = "fake-model"'
    );
    expect(() => parseSpec(toml, "test.toml")).toThrow(/model/);
  });

  it("fails on invalid resolution for model (4K on flash-image)", () => {
    const toml = VALID_WITH_VARIANTS.replace(
      'resolution = "1024x1024"',
      'resolution = "4K"'
    );
    expect(() => parseSpec(toml, "test.toml")).toThrow(/resolution/);
  });

  it("fails when neither variants nor shared_prompt is provided", () => {
    const toml = `
name = "logo-concepts"
wave = 1
model = "gemini-3-pro-image-preview"
resolution = "2K"
out_dir = "assets/raw/logo-concepts"
count = 2
`;
    expect(() => parseSpec(toml, "test.toml")).toThrow(/shared_prompt/);
  });

  it("fails with clear path when variant id is empty", () => {
    const toml = `
name = "logo-concepts"
wave = 1
model = "gemini-2.5-flash-image"
resolution = "1024x1024"
out_dir = "assets/raw/logo-concepts"
count = 1

[[variants]]
id = ""
prompt = "some prompt"
`;
    expect(() => parseSpec(toml, "test.toml")).toThrow();
  });

  it("fails when count is zero", () => {
    const toml = VALID_MINIMAL.replace("count = 2", "count = 0");
    expect(() => parseSpec(toml, "test.toml")).toThrow(/count/);
  });
});
