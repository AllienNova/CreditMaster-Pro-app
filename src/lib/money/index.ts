/**
 * Money — branded integer-cents type (TASK-MNY-06).
 *
 * Prevents the unit-confusion class (dollars passed where Stripe/API expects
 * integer cents) by making the unit explicit in the type system.
 *
 * Usage:
 *   const fee = fromDollars(12.34);  // Cents → 1234
 *   stripe.transfers.create({ amount: toStripeAmount(fee) });
 *   const display = toDollars(fee);  // → 12.34
 */

// ---------------------------------------------------------------------------
// Branded type
// ---------------------------------------------------------------------------

/** Integer cents. Never a float. Use fromDollars() to construct from dollars. */
export type Cents = number & { readonly __brand: "Cents" };

// ---------------------------------------------------------------------------
// Constructors
// ---------------------------------------------------------------------------

/**
 * Wrap an already-known integer cents value as Cents.
 * Throws if n is not a safe integer.
 */
export function cents(n: number): Cents {
  if (!Number.isInteger(n)) {
    throw new TypeError(`cents() requires an integer; received ${n}`);
  }
  return n as Cents;
}

/**
 * Convert a dollar-denominated float to integer Cents.
 * Uses Math.round to handle IEEE-754 imprecision at the boundary.
 * Throws if dollars is not finite — the brand promise (never a float,
 * never NaN/Infinity) holds for both constructors.
 *
 * fromDollars(12.34)  → 1234
 * fromDollars(0.07)   → 7
 * fromDollars(10.015) → 1002
 */
export function fromDollars(dollars: number): Cents {
  if (!Number.isFinite(dollars)) {
    throw new TypeError(`fromDollars() requires a finite number; received ${dollars}`);
  }
  return Math.round(dollars * 100) as Cents;
}

// ---------------------------------------------------------------------------
// Accessors
// ---------------------------------------------------------------------------

/** Convert Cents back to dollars (float). */
export function toDollars(c: Cents): number {
  return c / 100;
}

/**
 * Return the Cents value as-is for Stripe's integer `amount` field.
 * Named explicitly to document intent at Stripe call sites.
 */
export function toStripeAmount(c: Cents): number {
  return c;
}
