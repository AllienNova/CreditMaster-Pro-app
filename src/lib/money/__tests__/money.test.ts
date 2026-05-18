/**
 * Tests for the Money/Cents branded type (TASK-MNY-06).
 */

import { cents, fromDollars, toDollars, toStripeAmount } from "../index";

describe("Money / Cents branded type", () => {
  // -------------------------------------------------------------------------
  // cents() constructor
  // -------------------------------------------------------------------------

  describe("cents()", () => {
    it("wraps an integer value as Cents", () => {
      expect(cents(0)).toBe(0);
      expect(cents(100)).toBe(100);
      expect(cents(10000)).toBe(10000);
    });

    it("accepts negative integers", () => {
      expect(cents(-50)).toBe(-50);
    });

    it("throws for non-integer input", () => {
      expect(() => cents(1.5)).toThrow(TypeError);
      expect(() => cents(0.1)).toThrow(TypeError);
    });
  });

  // -------------------------------------------------------------------------
  // fromDollars()
  // -------------------------------------------------------------------------

  describe("fromDollars()", () => {
    it("converts $100 to 10000 cents", () => {
      expect(fromDollars(100)).toBe(10000);
    });

    it("converts $12.34 to 1234 cents", () => {
      expect(fromDollars(12.34)).toBe(1234);
    });

    it("converts $0.07 to 7 cents", () => {
      expect(fromDollars(0.07)).toBe(7);
    });

    it("rounds half-up: $10.015 → 1002 cents", () => {
      // Falsifiable: 10.015 * 100 = 1001.4999... in IEEE-754; Math.round → 1002
      expect(fromDollars(10.015)).toBe(1002);
    });

    it("round-trip: fromDollars then toDollars returns original value", () => {
      const original = 42.99;
      expect(toDollars(fromDollars(original))).toBeCloseTo(original, 10);
    });

    it("converts $0 to 0 cents", () => {
      expect(fromDollars(0)).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // toDollars()
  // -------------------------------------------------------------------------

  describe("toDollars()", () => {
    it("converts 1234 cents to $12.34", () => {
      expect(toDollars(cents(1234))).toBe(12.34);
    });

    it("converts 0 cents to $0", () => {
      expect(toDollars(cents(0))).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // toStripeAmount()
  // -------------------------------------------------------------------------

  describe("toStripeAmount()", () => {
    it("returns the raw integer for Stripe", () => {
      expect(toStripeAmount(cents(5500))).toBe(5500);
      expect(toStripeAmount(fromDollars(12.34))).toBe(1234);
    });
  });
});
