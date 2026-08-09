/**
 * @jest-environment node
 */

import { timingSafeEqual } from "../timing-safe-equal";

describe("timingSafeEqual (FND-011)", () => {
  it("returns true for identical strings", () => {
    expect(timingSafeEqual("super-secret-token", "super-secret-token")).toBe(
      true,
    );
  });

  it("returns false for equal-length but different strings", () => {
    expect(timingSafeEqual("abcdef", "abcxyz")).toBe(false);
  });

  it("returns false for unequal-length strings without throwing", () => {
    expect(() => timingSafeEqual("short", "much-longer-value")).not.toThrow();
    expect(timingSafeEqual("short", "much-longer-value")).toBe(false);
  });

  it("returns true for two empty strings", () => {
    expect(timingSafeEqual("", "")).toBe(true);
  });

  it("returns false when one string is empty", () => {
    expect(timingSafeEqual("", "x")).toBe(false);
  });

  it("handles unicode content", () => {
    expect(timingSafeEqual("tøken-✓", "tøken-✓")).toBe(true);
    expect(timingSafeEqual("tøken-✓", "tøken-✗")).toBe(false);
  });
});
